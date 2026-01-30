#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, parseCliArgs } from "./config.js";
import { setLogLevel } from "./logger.js";
import { logger } from "./logger.js";
import { createServer } from "./server.js";

const cliArgs = parseCliArgs(process.argv.slice(2));
const config = loadConfig(cliArgs);
setLogLevel(config.logLevel);

logger.info("Starting Zano MCP server...");

const server = createServer(config);
const transport = new StdioServerTransport();

await server.connect(transport);

logger.info("Zano MCP server running on stdio");
