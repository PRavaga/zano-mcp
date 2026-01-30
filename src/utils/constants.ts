export const ZANO_ASSET_ID =
  "d6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a";

export const DEFAULT_PORTS = {
  mainnet: { daemon: 11211, wallet: 11212 },
  testnet: { daemon: 12211, wallet: 12212 },
} as const;

export const PUBLIC_NODES = {
  mainnet: "http://37.27.100.59:10500/json_rpc",
  testnet: "http://37.27.100.59:10505/json_rpc",
} as const;

export const ASSET_WHITELIST_URLS = {
  mainnet: "https://api.zano.org/assets_whitelist.json",
  testnet: "https://api.zano.org/assets_whitelist_testnet.json",
} as const;

export const TRADE_API_URL = "https://api.trade.zano.org";

export const ZANO_DECIMALS = 12;
export const DEFAULT_MIXIN = 15;
export const AUDITABLE_MIXIN = 0;
export const DEFAULT_FEE = 10000000000; // 0.01 ZANO
export const REQUEST_TIMEOUT = 30_000; // 30 seconds
