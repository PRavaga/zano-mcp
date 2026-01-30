import { logger } from "../logger.js";
import { REQUEST_TIMEOUT } from "../utils/constants.js";

export class TradeClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async post<T = unknown>(
    path: string,
    data: Record<string, unknown> = {},
    requireAuth = false,
  ): Promise<T> {
    if (requireAuth && !this.token) {
      throw new Error(
        "Trade API authentication required. Set ZANO_TRADE_TOKEN or call dex_authenticate first.",
      );
    }

    const payload = requireAuth ? { ...data, token: this.token } : data;

    logger.debug(`Trade API: POST ${path}`, data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        redirect: "error",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Trade API HTTP ${res.status}: ${res.statusText}`);
      }

      const json = (await res.json()) as {
        success: boolean;
        data?: T;
        error?: string;
      };

      if (!json.success) {
        throw new Error(
          `Trade API error: ${json.error || json.data || "Unknown error"}`,
        );
      }

      return json.data as T;
    } catch (e) {
      if (controller.signal.aborted) {
        throw new Error(
          `Trade API request timed out after ${REQUEST_TIMEOUT}ms`,
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
