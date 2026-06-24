import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { ASSET_WHITELIST_URLS, PUBLIC_NODES, DEFAULT_PORTS, REQUEST_TIMEOUT } from "../utils/constants.js";
import { logger } from "../logger.js";

export function registerResources(server: McpServer, config: Config): void {
  server.resource(
    "network-info",
    "zano://network/info",
    {
      description: "Current Zano network configuration",
      mimeType: "application/json",
    },
    async () => {
      const ports = DEFAULT_PORTS[config.network];
      const info = {
        network: config.network,
        daemonUrl: config.daemonUrl,
        walletConfigured: !!config.walletUrl,
        tradeAuthenticated: !!config.tradeToken,
        defaultPorts: ports,
        publicNode: PUBLIC_NODES[config.network],
      };
      return {
        contents: [
          {
            uri: "zano://network/info",
            mimeType: "application/json",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  );

  server.resource(
    "asset-whitelist",
    "zano://assets/whitelist",
    {
      description: "Official Zano asset whitelist",
      mimeType: "application/json",
    },
    async () => {
      try {
        const url = ASSET_WHITELIST_URLS[config.network];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        let data: string;
        try {
          const res = await fetch(url, {
            redirect: "error",
            signal: controller.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = await res.text();
          JSON.parse(data); // validate well-formed JSON before returning it as trusted
        } finally {
          clearTimeout(timeoutId);
        }
        return {
          contents: [
            {
              uri: "zano://assets/whitelist",
              mimeType: "application/json",
              text: data,
            },
          ],
        };
      } catch (e) {
        logger.error("Failed to fetch asset whitelist:", e);
        return {
          contents: [
            {
              uri: "zano://assets/whitelist",
              mimeType: "application/json",
              text: JSON.stringify({ error: "Failed to fetch whitelist" }),
            },
          ],
        };
      }
    },
  );

  logger.info("Resources registered (2 resources)");
}
