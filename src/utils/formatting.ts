import { ZANO_ASSET_ID, ZANO_DECIMALS } from "./constants.js";

const knownAssets = new Map<string, { ticker: string; decimals: number }>();

export function registerAsset(
  assetId: string,
  ticker: string,
  decimals: number,
): void {
  knownAssets.set(assetId, { ticker, decimals });
}

// Pre-register ZANO
registerAsset(ZANO_ASSET_ID, "ZANO", ZANO_DECIMALS);

export function getAssetInfo(
  assetId: string,
): { ticker: string; decimals: number } | undefined {
  return knownAssets.get(assetId);
}

export function atomicToHuman(amount: bigint | number | string, decimals: number): string {
  const val = BigInt(amount);
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = val / divisor;
  const frac = val % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function humanToAtomic(amount: string, decimals: number): string {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  const frac = (parts[1] || "").padEnd(decimals, "0").slice(0, decimals);
  const val = BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(frac);
  return val.toString();
}

export function formatZano(atomicAmount: bigint | number | string): string {
  return `${atomicToHuman(atomicAmount, ZANO_DECIMALS)} ZANO`;
}

export function formatAssetAmount(
  atomicAmount: bigint | number | string,
  assetId: string,
): string {
  const info = knownAssets.get(assetId);
  if (info) {
    return `${atomicToHuman(atomicAmount, info.decimals)} ${info.ticker}`;
  }
  return `${atomicAmount} (asset: ${assetId.slice(0, 8)}...)`;
}

export function formatTimestamp(ts: number): string {
  if (ts === 0) return "N/A";
  return new Date(ts * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export function formatDifficulty(diff: number): string {
  if (diff >= 1e12) return `${(diff / 1e12).toFixed(2)} TH`;
  if (diff >= 1e9) return `${(diff / 1e9).toFixed(2)} GH`;
  if (diff >= 1e6) return `${(diff / 1e6).toFixed(2)} MH`;
  if (diff >= 1e3) return `${(diff / 1e3).toFixed(2)} KH`;
  return diff.toString();
}

export function formatHashrate(h: number): string {
  if (h >= 1e9) return `${(h / 1e9).toFixed(2)} GH/s`;
  if (h >= 1e6) return `${(h / 1e6).toFixed(2)} MH/s`;
  if (h >= 1e3) return `${(h / 1e3).toFixed(2)} KH/s`;
  return `${h.toFixed(2)} H/s`;
}

export function shortenHash(hash: string, len = 8): string {
  if (hash.length <= len * 2) return hash;
  return `${hash.slice(0, len)}...${hash.slice(-len)}`;
}
