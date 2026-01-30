import { z } from "zod";
import { DEFAULT_PORTS, TRADE_API_URL } from "./utils/constants.js";
import type { LogLevel } from "./logger.js";

export const configSchema = z.object({
  daemonUrl: z.string().url(),
  walletUrl: z.string().url().optional(),
  walletAuth: z.string().optional(),
  tradeUrl: z.string().url(),
  tradeToken: z.string().optional(),
  network: z.enum(["mainnet", "testnet"]),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(cliArgs: Record<string, string | undefined>): Config {
  const network = (cliArgs.network || process.env.ZANO_NETWORK || "mainnet") as
    | "mainnet"
    | "testnet";
  const ports = DEFAULT_PORTS[network] || DEFAULT_PORTS.mainnet;
  const defaultDaemonUrl = `http://127.0.0.1:${ports.daemon}/json_rpc`;

  const raw = {
    daemonUrl:
      cliArgs["daemon-url"] ||
      process.env.ZANO_DAEMON_URL ||
      defaultDaemonUrl,
    walletUrl:
      cliArgs["wallet-url"] || process.env.ZANO_WALLET_URL || undefined,
    walletAuth:
      cliArgs["wallet-auth"] || process.env.ZANO_WALLET_AUTH || undefined,
    tradeUrl:
      cliArgs["trade-url"] || process.env.ZANO_TRADE_URL || TRADE_API_URL,
    tradeToken:
      cliArgs["trade-token"] || process.env.ZANO_TRADE_TOKEN || undefined,
    network,
    logLevel: (cliArgs["log-level"] ||
      process.env.ZANO_LOG_LEVEL ||
      "info") as LogLevel,
  };

  return configSchema.parse(raw);
}

export function parseCliArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--") && i + 1 < argv.length) {
      const key = arg.slice(2);
      args[key] = argv[++i];
    }
  }
  return args;
}
