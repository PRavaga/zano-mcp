import { logger } from "../logger.js";
import { REQUEST_TIMEOUT } from "../utils/constants.js";

export class DaemonClient {
  private url: string;

  constructor(url: string) {
    this.url = url;
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

    logger.debug(`Daemon RPC: ${method}`, params);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        redirect: "error",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Daemon RPC HTTP ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as {
        result?: T;
        error?: { code: number; message: string };
      };

      if (json.error) {
        throw new Error(
          `Daemon RPC error: ${json.error.message} (code: ${json.error.code})`,
        );
      }

      return json.result as T;
    } catch (e) {
      if (controller.signal.aborted) {
        throw new Error(
          `Daemon RPC request timed out after ${REQUEST_TIMEOUT}ms`,
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
