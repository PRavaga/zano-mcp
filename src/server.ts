import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config.js";
import { registerAllTools } from "./tools/register.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";
import { logger } from "./logger.js";

export function createServer(config: Config): McpServer {
  const server = new McpServer({
    name: "zano-mcp",
    version: "0.1.0",
  });

  registerAllTools(server, config);
  registerResources(server, config);
  registerPrompts(server, config);

  logger.info("Zano MCP server created", {
    daemon: config.daemonUrl,
    wallet: config.walletUrl ? "configured" : "disabled",
    trade: config.tradeToken ? "authenticated" : "public only",
    network: config.network,
  });

  return server;
}
