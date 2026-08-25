import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createHash, createHmac } from "node:crypto";
import { WalletClient } from "../src/clients/wallet.js";

const SECRET = "test-jwt-secret";

function startCaptureServer(): Promise<{
  server: Server;
  port: number;
  captured: Array<{ token: string; body: string }>;
}> {
  const captured: Array<{ token: string; body: string }> = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      captured.push({ token: String(req.headers["zano-access-token"] || ""), body });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ id: 0, jsonrpc: "2.0", result: { ok: true } }));
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, port, captured });
    });
  });
}

describe("wallet JWT access token", () => {
  let server: Server;

  after(() => server?.close());

  it("emits standard-base64 segments the wallet's jwt-cpp verifier accepts", async () => {
    const started = await startCaptureServer();
    server = started.server;
    const client = new WalletClient(`http://127.0.0.1:${started.port}/json_rpc`, SECRET);

    // enough calls that base64url-vs-base64 divergence ("+"/"/" in the
    // encoded payload or signature) would appear with near-certainty
    for (let i = 0; i < 30; i++) {
      await client.call("getbalance");
    }
    assert.equal(started.captured.length, 30);

    for (const { token, body } of started.captured) {
      const parts = token.split(".");
      assert.equal(parts.length, 3, "three JWT segments");
      for (const part of parts) {
        // standard base64 alphabet, padding stripped — never "-" or "_"
        assert.match(part, /^[A-Za-z0-9+/]+$/);
      }
      const [header, payload, signature] = parts;

      const expectedSig = createHmac("sha256", SECRET)
        .update(`${header}.${payload}`)
        .digest("base64")
        .replace(/=/g, "");
      assert.equal(signature, expectedSig, "signature over transmitted segments");

      const claims = JSON.parse(Buffer.from(payload, "base64").toString());
      assert.equal(
        claims.body_hash,
        createHash("sha256").update(body).digest("hex"),
        "body_hash covers the exact body sent",
      );
      assert.equal(typeof claims.salt, "string");
      assert.ok(claims.exp > Date.now() / 1000, "not yet expired");
    }

    // salts must never repeat (wallet-side replay protection)
    const salts = started.captured.map(
      ({ token }) => JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).salt,
    );
    assert.equal(new Set(salts).size, salts.length);
  });
});
