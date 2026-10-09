import mongoose from "mongoose";

const healthSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Ping = mongoose.model("Ping", healthSchema);
