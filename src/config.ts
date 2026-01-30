import { z } from "zod";
import { DEFAULT_PORTS, TRADE_API_URL } from "./utils/constants.js";
import type { LogLevel } from "./logger.js";

/**
 * Validates that a wallet URL points to localhost only.
 * Rejects any non-local host to prevent remote wallet RPC connections.
 * Fails closed: invalid URL = server won't start.
 */
export function assertLocalWalletUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid ZANO_WALLET_URL: not a valid URL`);
  }

  const proto = url.protocol.toLowerCase();
  if (proto !== "http:" && proto !== "https:") {
    throw new Error(
      `Invalid ZANO_WALLET_URL: unsupported protocol ${url.protocol}`,
    );
  }

  // URL constructor may keep brackets for IPv6, strip them for comparison
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isLocal =
    host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!isLocal) {
    throw new Error(
      `Refusing non-local wallet RPC host "${url.hostname}". ` +
        `Wallet must be localhost-only (127.0.0.1, localhost, or [::1]).`,
    );
  }
}

export const configSchema = z.object({
  daemonUrl: z.string().url(),
  walletUrl: z.string().url().optional(),
  walletAuth: z.string().optional(),
  tradeUrl: z.string().url(),
  tradeToken: z.string().optional(),
  network: z.enum(["mainnet", "testnet"]),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  enableWriteTools: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(
  cliArgs: Record<string, string | undefined>,
): Config {
  const network = (cliArgs.network ||
    process.env.ZANO_NETWORK ||
    "mainnet") as "mainnet" | "testnet";
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
    enableWriteTools:
      cliArgs["enable-write-tools"] === "true" ||
      process.env.ZANO_ENABLE_WRITE_TOOLS === "true",
  };

  const config = configSchema.parse(raw);

  // Fail closed: wallet RPC must be localhost-only
  if (config.walletUrl) {
    assertLocalWalletUrl(config.walletUrl);
  }

  return config;
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
