import { logger } from "../logger.js";

export class WalletClient {
  private url: string;
  private auth?: string;

  constructor(url: string, auth?: string) {
    this.url = url;
    this.auth = auth;
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
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

    const res = await fetch(this.url, {
      method: "POST",
      headers,
      body,
    });

    if (!res.ok) {
      throw new Error(`Wallet RPC HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (json.error) {
      throw new Error(`Wallet RPC error: ${json.error.message} (code: ${json.error.code})`);
    }

    return json.result as T;
  }

  private generateAccessToken(httpBody: string): string {
    // JWT-based auth for wallet RPC
    // Uses SHA-256 hash of the body as part of the token payload
    // For now, return the auth secret directly as a simple bearer token
    // Full JWT implementation would require a JWT library
    return this.auth || "";
  }
}
