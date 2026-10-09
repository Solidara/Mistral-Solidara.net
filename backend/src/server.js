import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { pingRouter } from "./routes/ping.js";
import { postsRouter } from "./routes/posts.js";

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

app.use("/api", pingRouter);
app.use("/api", postsRouter);

app.get("/", (_req, res) => {
  res.json({ service: "solidara-backend", version: "0.1.0" });
});

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const port = Number(process.env.PORT ?? 3000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

mongoose.connection.on("connected", () => console.log("MongoDB connected"));
mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));

try {
  await mongoose.connect(mongoUri);
  app.listen(port, () => console.log(`Backend listening on port ${port}`));
} catch (err) {
  console.error("Failed to start:", err.message);
  process.exit(1);
}
