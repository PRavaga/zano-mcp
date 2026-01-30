import { logger } from "../logger.js";

export class DaemonClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 0,
      method,
      params,
    });

    logger.debug(`Daemon RPC: ${method}`, params);

    const res = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      throw new Error(`Daemon RPC HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (json.error) {
      throw new Error(`Daemon RPC error: ${json.error.message} (code: ${json.error.code})`);
    }

    return json.result as T;
  }
}
