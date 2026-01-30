import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { logger } from "../logger.js";
import { z } from "zod";

export function registerPrompts(server: McpServer, config: Config): void {
  server.prompt(
    "check-network",
    "Check Zano network status - calls get_network_info and formats a report",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Use the get_network_info tool to check the current Zano network status. Report the block height, sync status, difficulty, hashrate, connection count, and pool size. Flag anything unusual (low connections, sync lag, empty pool).",
          },
        },
      ],
    }),
  );

  server.prompt(
    "analyze-order-book",
    "Analyze the DEX order book for a trading pair",
    { pair_id: z.string().describe("Trading pair ID (e.g. 643 for FUSD)") },
    async ({ pair_id }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the get_order_book tool with pairId ${pair_id} and the get_trading_pair tool with id ${pair_id}. Analyze the order book depth, bid/ask spread, instant vs non-instant orders, and top traders. Summarize liquidity and any arbitrage opportunities.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    "explain-transaction",
    "Explain a Zano transaction in human-readable terms",
    { tx_hash: z.string().describe("Transaction hash") },
    async ({ tx_hash }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Use the get_transaction tool with tx_hash "${tx_hash}". Explain the transaction in human-readable terms: what happened, how much was sent, the fee, confirmations, and any asset operations.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    "swap-calculator",
    "Calculate what an ionic swap would look like between two assets",
    {
      from_asset: z.string().describe("Source asset ticker or ID"),
      to_asset: z.string().describe("Destination asset ticker or ID"),
      amount: z.string().describe("Amount to swap (human-readable)"),
    },
    async ({ from_asset, to_asset, amount }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I want to swap ${amount} ${from_asset} for ${to_asset}. Look up both assets using get_asset_info if needed. Calculate the swap parameters and explain what the ionic swap proposal would contain, including atomic amounts, fees, and the expected outcome.`,
          },
        },
      ],
    }),
  );

  logger.info("Prompts registered (4 prompts)");
}
