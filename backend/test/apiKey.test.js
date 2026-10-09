import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { requireApiKey, extractApiKey } from "../src/middleware/apiKey.js";

function makeApp() {
  const app = express();
  app.use(express.json());
  app.post("/api/pings", requireApiKey, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

test("requests pass without API_KEY set (open mode)", async () => {
  delete process.env.API_KEY;
  const res = await makeApp().inject ? null : null;
  const server = makeApp().listen(0);
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/pings`, { method: "POST" });
    assert.equal(response.status, 200);
  } finally {
    server.close();
  }
});

test("requests without key are rejected when API_KEY is set", async () => {
  process.env.API_KEY = "secret-key";
  const server = makeApp().listen(0);
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/pings`, { method: "POST" });
    assert.equal(response.status, 401);
  } finally {
    server.close();
  }
});

test("valid key in Authorization header is accepted", async () => {
  process.env.API_KEY = "secret-key";
  const server = makeApp().listen(0);
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/pings`, {
      method: "POST",
      headers: { authorization: "Bearer secret-key" },
    });
    assert.equal(response.status, 200);
  } finally {
    server.close();
  }
});

test("valid key in X-API-Key header is accepted", async () => {
  process.env.API_KEY = "secret-key";
  const server = makeApp().listen(0);
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/pings`, {
      method: "POST",
      headers: { "x-api-key": "secret-key" },
    });
    assert.equal(response.status, 200);
  } finally {
    server.close();
    delete process.env.API_KEY;
  }
});

test("wrong key is rejected", async () => {
  process.env.API_KEY = "secret-key";
  const server = makeApp().listen(0);
  const port = server.address().port;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/pings`, {
      method: "POST",
      headers: { "x-api-key": "wrong" },
    });
    assert.equal(response.status, 401);
  } finally {
    server.close();
    delete process.env.API_KEY;
  }
});

test("extractApiKey reads Bearer, header and query", () => {
  assert.equal(extractApiKey({ get: (h) => (h === "authorization" ? "Bearer k" : undefined) }), "k");
  assert.equal(extractApiKey({ get: (h) => (h === "x-api-key" ? "k2" : undefined) }), "k2");
  assert.equal(extractApiKey({ get: () => undefined, query: { apiKey: "k3" } }), "k3");
  assert.equal(extractApiKey({ get: () => undefined, query: {} }), null);
});
