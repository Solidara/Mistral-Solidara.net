import { Router } from "express";
import { Ping } from "../models/ping.js";

export const pingRouter = Router();

pingRouter.get("/health", async (_req, res, next) => {
  try {
    const last = await Ping.findOne().sort({ createdAt: -1 }).lean();
    res.json({ status: "ok", db: "up", lastPing: last });
  } catch (err) {
    next(err);
  }
});

pingRouter.post("/pings", async (req, res, next) => {
  try {
    const { name, message } = req.body ?? {};
    if (typeof name !== "string" || name.length === 0) {
      return res.status(400).json({ error: "name is required" });
    }
    const ping = await Ping.create({ name, message });
    res.status(201).json(ping);
  } catch (err) {
    next(err);
  }
});

pingRouter.get("/pings", async (_req, res, next) => {
  try {
    const pings = await Ping.find().sort({ createdAt: -1 }).limit(50).lean();
    res.json(pings);
  } catch (err) {
    next(err);
  }
});
