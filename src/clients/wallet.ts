import { createHash, createHmac, randomBytes } from "node:crypto";
import { logger } from "../logger.js";
import { REQUEST_TIMEOUT } from "../utils/constants.js";

export class WalletClient {
  private url: string;
  private auth?: string;

  constructor(url: string, auth?: string) {
    this.url = url;
    this.auth = auth;
  }

  async call<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 0,
      method,
      params,
    });

    logger.debug(`Wallet RPC: ${method}`, params);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.auth) {
      headers["Zano-Access-Token"] = this.generateAccessToken(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers,
        body,
        redirect: "error",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Wallet RPC HTTP ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as {
        result?: T;
        error?: { code: number; message: string };
      };

      if (json.error) {
        throw new Error(
          `Wallet RPC error: ${json.error.message} (code: ${json.error.code})`,
        );
      }

      return json.result as T;
    } catch (e) {
      if (controller.signal.aborted) {
        throw new Error(
          `Wallet RPC request timed out after ${REQUEST_TIMEOUT}ms`,
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private generateAccessToken(httpBody: string): string {
    // Zano wallet RPC JWT auth (HS256). wallet_rpc_server (jwt-cpp) verifies a
    // request-bound JWT: body_hash = sha256(body), a random salt (replay
    // protection), and a short exp. Signed HMAC-SHA256 with the configured
    // secret (ZANO_WALLET_AUTH / --jwt-secret).
    const b64url = (obj: object): string =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

    const header = b64url({ alg: "HS256", typ: "JWT" });
    const payload = b64url({
      body_hash: createHash("sha256").update(httpBody).digest("hex"),
      user: "zano-mcp",
      salt: randomBytes(32).toString("hex"),
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    const signature = createHmac("sha256", this.auth ?? "")
      .update(`${header}.${payload}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return `${header}.${payload}.${signature}`;
  }
}
