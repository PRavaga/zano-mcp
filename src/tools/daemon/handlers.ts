import { DaemonClient } from "../../clients/daemon.js";
import {
  formatZano,
  formatTimestamp,
  formatDifficulty,
  formatHashrate,
  formatAssetAmount,
} from "../../utils/formatting.js";
import type {
  GetBlockByHeightInput,
  GetBlockByHashInput,
  GetBlockDetailsInput,
  GetTransactionInput,
  GetTransactionsInput,
  GetAssetInfoInput,
  GetAssetsListInput,
  ResolveAliasInput,
  GetAliasByAddressInput,
  SearchBlockchainInput,
  ValidateSignatureInput,
} from "./definitions.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(error: unknown): ToolResult {
  const msg = error instanceof Error ? error.message : String(error);
  return textResult(`Error: ${msg}`);
}

export class DaemonHandlers {
  private client: DaemonClient;

  constructor(client: DaemonClient) {
    this.client = client;
  }

  async getNetworkInfo(): Promise<ToolResult> {
    try {
      const info = await this.client.call<Record<string, unknown>>("getinfo");
      const lines = [
        `Zano Network Status`,
        `  Height: ${info.height}`,
        `  Network height: ${info.max_net_seen_height || "N/A"}`,
        `  Difficulty: ${info.difficulty}`,
        `  PoS difficulty: ${info.pos_difficulty}`,
        `  Hashrate: ${info.current_network_hashrate_350 || info.current_network_hashrate_50 || "N/A"}`,
        `  Connections: ${info.outgoing_connections_count} out / ${info.incoming_connections_count} in`,
        `  TX pool: ${info.tx_pool_size} transactions`,
        `  Alt blocks: ${info.alt_blocks_count}`,
        `  Block reward: ${formatZano(info.block_reward as number)}`,
        `  Grey peerlist: ${info.grey_peerlist_size}`,
        `  White peerlist: ${info.white_peerlist_size}`,
        `  Alias count: ${info.alias_count}`,
        `  Daemon network: ${info.testnet ? "testnet" : "mainnet"}`,
        `  Synchronized: ${Number(info.height) >= Number(info.max_net_seen_height || 0) ? "Yes" : "No"}`,
      ];
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getHeight(): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ height: number }>("getheight");
      return textResult(`Current blockchain height: ${res.height}`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async getBlockByHeight(input: GetBlockByHeightInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ block_header: Record<string, unknown> }>(
        "getblockheaderbyheight",
        { height: input.height },
      );
      return textResult(this.formatBlockHeader(res.block_header));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getBlockByHash(input: GetBlockByHashInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ block_header: Record<string, unknown> }>(
        "getblockheaderbyhash",
        { hash: input.hash },
      );
      return textResult(this.formatBlockHeader(res.block_header));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getLastBlock(): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ block_header: Record<string, unknown> }>(
        "getlastblockheader",
      );
      return textResult(this.formatBlockHeader(res.block_header));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getBlockDetails(input: GetBlockDetailsInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "get_main_block_details",
        { id: input.id },
      );
      const block = res.block_details || res;
      const header = (block as Record<string, unknown>);
      const lines = [
        this.formatBlockHeader(header),
        `  Miner address: ${header.miner_text_info || "N/A"}`,
        `  Transactions: ${Array.isArray(header.transactions_details) ? (header.transactions_details as unknown[]).length : 0}`,
      ];
      if (Array.isArray(header.transactions_details)) {
        for (const tx of header.transactions_details as Array<Record<string, unknown>>) {
          lines.push(`    TX: ${tx.id} (fee: ${tx.fee ? formatZano(tx.fee as number) : "coinbase"})`);
        }
      }
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getTransaction(input: GetTransactionInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ tx_info: Record<string, unknown> }>(
        "get_tx_details",
        { tx_hash: input.tx_hash },
      );
      const tx = res.tx_info || res;
      return textResult(this.formatTransaction(tx));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getTransactions(input: GetTransactionsInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "gettransactions",
        { txs_hashes: input.tx_hashes },
      );
      const txs = (res.txs_as_json || res.txs || []) as Array<Record<string, unknown>>;
      if (txs.length === 0) {
        return textResult("No transactions found for the provided hashes.");
      }
      const lines = txs.map(
        (tx, i) => `[${i + 1}] ${typeof tx === "string" ? tx : JSON.stringify(tx, null, 2)}`,
      );
      return textResult(lines.join("\n\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getPoolInfo(): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>("get_pool_info");
      const lines = [
        `Transaction Pool`,
        `  Pool size: ${res.tx_count ?? "N/A"}`,
      ];
      if (Array.isArray(res.transactions)) {
        for (const tx of res.transactions as Array<Record<string, unknown>>) {
          lines.push(`  TX: ${tx.id} (size: ${tx.blob_size} bytes, fee: ${tx.fee ? formatZano(tx.fee as number) : "N/A"})`);
        }
      }
      if (res.tx_count === 0 || (!res.transactions && !res.tx_count)) {
        lines.push("  (empty pool)");
      }
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getAssetInfo(input: GetAssetInfoInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ asset_descriptor: Record<string, unknown> }>(
        "get_asset_info",
        { asset_id: input.asset_id },
      );
      const asset = res.asset_descriptor || res;
      const lines = [
        `Asset: ${asset.full_name || asset.ticker || "Unknown"}`,
        `  Ticker: ${asset.ticker || "N/A"}`,
        `  Asset ID: ${input.asset_id}`,
        `  Decimals: ${asset.decimal_point ?? 12}`,
        `  Total supply: ${asset.total_max_supply || asset.current_supply || "N/A"}`,
        `  Current supply: ${asset.current_supply || "N/A"}`,
        `  Owner: ${asset.owner || "N/A"}`,
        `  Meta info: ${asset.meta_info || "N/A"}`,
        `  Hidden supply: ${asset.hidden_supply ? "Yes" : "No"}`,
      ];
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getAssetsList(input: GetAssetsListInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ assets: Array<Record<string, unknown>> }>(
        "get_assets_list",
        { offset: input.offset, count: input.count },
      );
      const assets = res.assets || [];
      if (assets.length === 0) {
        return textResult("No assets found.");
      }
      const lines = [`Registered Assets (offset: ${input.offset}, count: ${assets.length}):`];
      for (const a of assets) {
        const desc = (a.asset_descriptor || a) as Record<string, unknown>;
        lines.push(
          `  ${desc.ticker || "?"} - ${desc.full_name || "Unknown"} (ID: ${(a.asset_id as string)?.slice(0, 16)}..., decimals: ${desc.decimal_point ?? 12})`,
        );
      }
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async resolveAlias(input: ResolveAliasInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ alias_details: Record<string, unknown> }>(
        "get_alias_details",
        { alias: input.alias },
      );
      const details = res.alias_details || res;
      const lines = [
        `Alias: @${input.alias}`,
        `  Address: ${details.address || "N/A"}`,
        `  Comment: ${details.comment || ""}`,
        `  Tracking key: ${details.tracking_key || "N/A"}`,
      ];
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getAliasByAddress(input: GetAliasByAddressInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ alias_info_list?: Array<Record<string, unknown>> }>(
        "get_alias_by_address",
        { address: input.address },
      );
      const list = res.alias_info_list;
      if (!list || list.length === 0) {
        return textResult(`No alias found for address ${input.address}`);
      }
      const alias = list[0];
      return textResult(
        `Address: ${input.address}\nAlias: @${alias.alias}\nComment: ${alias.comment || ""}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async searchBlockchain(input: SearchBlockchainInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "search_by_id",
        { id: input.id },
      );
      return textResult(
        `Search results for "${input.id}":\n${JSON.stringify(res, null, 2)}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async validateSignature(input: ValidateSignatureInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ valid: boolean }>(
        "validate_signature",
        {
          buff: input.buff,
          address: input.address,
          signature: input.signature,
        },
      );
      return textResult(
        `Signature validation: ${res.valid ? "VALID" : "INVALID"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  // --- Private helpers ---

  private formatBlockHeader(h: Record<string, unknown>): string {
    const lines = [
      `Block ${h.height}`,
      `  Hash: ${h.hash || h.id}`,
      `  Previous hash: ${h.prev_hash || "N/A"}`,
      `  Timestamp: ${formatTimestamp(Number(h.timestamp || 0))}`,
      `  Difficulty: ${formatDifficulty(Number(h.difficulty || 0))}`,
      `  Reward: ${h.reward ? formatZano(h.reward as number) : "N/A"}`,
      `  Type: ${h.is_pos ? "PoS" : "PoW"}`,
      `  Depth: ${h.depth ?? "N/A"}`,
      `  Orphan: ${h.orphan_status ? "Yes" : "No"}`,
      `  TX count: ${h.num_txes ?? h.tx_count ?? "N/A"}`,
    ];
    return lines.join("\n");
  }

  private formatTransaction(tx: Record<string, unknown>): string {
    const lines = [
      `Transaction ${tx.id || tx.tx_hash}`,
      `  Block: ${tx.keeper_block ?? "N/A"}`,
      `  Timestamp: ${formatTimestamp(Number(tx.timestamp || 0))}`,
      `  Fee: ${tx.fee ? formatZano(tx.fee as number) : "coinbase"}`,
      `  Size: ${tx.blob_size || tx.size || "N/A"} bytes`,
      `  Inputs: ${tx.ins_count ?? (Array.isArray(tx.ins) ? (tx.ins as unknown[]).length : "N/A")}`,
      `  Outputs: ${tx.outs_count ?? (Array.isArray(tx.outs) ? (tx.outs as unknown[]).length : "N/A")}`,
      `  Amount: ${tx.amount ? formatZano(tx.amount as number) : "N/A"}`,
      `  Confirmations: ${tx.confirmations ?? "N/A"}`,
    ];
    if (tx.extra) {
      const extra = tx.extra as Array<Record<string, unknown>>;
      if (Array.isArray(extra)) {
        for (const e of extra) {
          if (e.type === "asset_descriptor_operation") {
            lines.push(`  Asset operation: ${JSON.stringify(e.asset_descriptor_operation || e)}`);
          }
        }
      }
    }
    return lines.join("\n");
  }
}
