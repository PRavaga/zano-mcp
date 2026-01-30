import { WalletClient } from "../../clients/wallet.js";
import { DaemonClient } from "../../clients/daemon.js";
import {
  atomicToHuman,
  humanToAtomic,
  formatAssetAmount,
  formatTimestamp,
  formatZano,
  getAssetInfo,
  registerAsset,
} from "../../utils/formatting.js";
import { ZANO_ASSET_ID, ZANO_DECIMALS, DEFAULT_FEE, DEFAULT_MIXIN } from "../../utils/constants.js";
import type {
  TransferInput,
  GetRecentTransactionsInput,
  SearchTransactionsInput,
  SignMessageInput,
  MakeIntegratedAddressInput,
  SplitIntegratedAddressInput,
  GetMiningHistoryInput,
  SweepBelowInput,
} from "./definitions.js";

type ToolResult = { content: Array<{ type: "text"; text: string }> };
function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
function errorResult(error: unknown): ToolResult {
  const msg = error instanceof Error ? error.message : String(error);
  return textResult(`Error: ${msg}`);
}

export class WalletHandlers {
  private client: WalletClient;
  private daemon: DaemonClient;

  constructor(client: WalletClient, daemon: DaemonClient) {
    this.client = client;
    this.daemon = daemon;
  }

  async getBalance(): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>("getbalance");
      const lines = ["Wallet Balance:"];

      const balance = BigInt(String(res.balance || 0));
      const unlocked = BigInt(String(res.unlocked_balance || 0));
      lines.push(`  ZANO: ${atomicToHuman(unlocked, ZANO_DECIMALS)} (locked: ${atomicToHuman(balance - unlocked, ZANO_DECIMALS)})`);

      const balances = res.balances as Array<Record<string, unknown>> | undefined;
      if (balances && balances.length > 0) {
        for (const b of balances) {
          const assetId = String(b.asset_id || "");
          if (assetId === ZANO_ASSET_ID) continue;
          const assetInfo = (b.asset_info as Record<string, unknown>) || {};
          const ticker = String(assetInfo.ticker || assetId.slice(0, 8));
          const decimals = Number(assetInfo.decimal_point ?? 12);
          registerAsset(assetId, ticker, decimals);

          const bal = BigInt(String(b.balance || 0));
          const ubal = BigInt(String(b.unlocked || 0));
          lines.push(`  ${ticker}: ${atomicToHuman(ubal, decimals)} (locked: ${atomicToHuman(bal - ubal, decimals)})`);
        }
      }

      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getAddress(): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>("getaddress");
      return textResult(`Wallet address: ${res.address}`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async getWalletStatus(): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>("get_wallet_info");
      const lines = [
        "Wallet Status:",
        `  Address: ${res.address || "N/A"}`,
        `  Current height: ${res.current_height || "N/A"}`,
        `  Daemon height: ${res.current_daemon_height || "N/A"}`,
        `  Watch only: ${res.is_whatch_only ? "Yes" : "No"}`,
        `  In audit: ${res.is_auditable ? "Yes" : "No"}`,
        `  Min confirmations: ${res.mincounted_transfer_count ?? "N/A"}`,
        `  Transfer count: ${res.transfer_entries_count ?? "N/A"}`,
      ];
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async transfer(input: TransferInput): Promise<ToolResult> {
    try {
      const assetId = input.asset_id || ZANO_ASSET_ID;
      const info = getAssetInfo(assetId);
      const decimals = info?.decimals ?? ZANO_DECIMALS;
      const atomicAmount = humanToAtomic(input.amount, decimals);
      const mixin = input.mixin ?? DEFAULT_MIXIN;
      const fee = input.fee ? humanToAtomic(input.fee, ZANO_DECIMALS) : String(DEFAULT_FEE);

      const dest: Record<string, unknown> = {
        address: input.address,
        amount: atomicAmount,
      };
      if (assetId !== ZANO_ASSET_ID) {
        dest.asset_id = assetId;
      }

      const params: Record<string, unknown> = {
        destinations: [dest],
        fee: Number(fee),
        mixin,
      };

      if (input.payment_id) params.payment_id = input.payment_id;
      if (input.comment) params.comment = input.comment;

      const res = await this.client.call<Record<string, unknown>>("transfer", params);
      const ticker = info?.ticker || "ZANO";
      return textResult(
        `Transfer sent: ${input.amount} ${ticker} to ${input.address}\nTX hash: ${res.tx_hash}\nTX size: ${res.tx_size || "N/A"} bytes`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async getRecentTransactions(input: GetRecentTransactionsInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "get_recent_txs_and_info",
        { offset: input.offset, count: input.count, update_provision_info: true },
      );
      const transfers = (res.transfers || []) as Array<Record<string, unknown>>;
      if (transfers.length === 0) {
        return textResult("No recent transactions found.");
      }
      const lines = [`Recent Transactions (${transfers.length}):`];
      for (const tx of transfers) {
        const dir = tx.is_income ? "IN" : "OUT";
        const amount = tx.amount ? formatZano(tx.amount as number) : "N/A";
        const ts = formatTimestamp(Number(tx.timestamp || 0));
        const hash = String(tx.tx_hash || "").slice(0, 16);
        const comment = tx.comment ? ` "${tx.comment}"` : "";
        lines.push(`  [${dir}] ${amount} | ${ts} | ${hash}...${comment}`);
      }
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async searchTransactions(input: SearchTransactionsInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "search_for_transactions",
        input,
      );
      return textResult(JSON.stringify(res, null, 2));
    } catch (e) {
      return errorResult(e);
    }
  }

  async signMessage(input: SignMessageInput): Promise<ToolResult> {
    try {
      // sign_message requires base64 encoded message
      const b64 = Buffer.from(input.message).toString("base64");
      const res = await this.client.call<{ sig: string }>("sign_message", { buff: b64 });
      return textResult(`Signature: ${res.sig}`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async saveWallet(): Promise<ToolResult> {
    try {
      await this.client.call("store");
      return textResult("Wallet state saved.");
    } catch (e) {
      return errorResult(e);
    }
  }

  async makeIntegratedAddress(input: MakeIntegratedAddressInput): Promise<ToolResult> {
    try {
      const params: Record<string, unknown> = {};
      if (input.payment_id) params.payment_id = input.payment_id;
      const res = await this.client.call<Record<string, unknown>>(
        "make_integrated_address",
        params,
      );
      return textResult(
        `Integrated address: ${res.integrated_address}\nPayment ID: ${res.payment_id}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async splitIntegratedAddress(input: SplitIntegratedAddressInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "split_integrated_address",
        { integrated_address: input.integrated_address },
      );
      return textResult(
        `Standard address: ${res.standard_address}\nPayment ID: ${res.payment_id}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async getMiningHistory(input: GetMiningHistoryInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "get_mining_history",
        { v: input.v },
      );
      const history = (res.mined_entries || []) as Array<Record<string, unknown>>;
      if (history.length === 0) {
        return textResult("No staking history found.");
      }
      const lines = [`Staking History (${history.length} entries):`];
      for (const entry of history) {
        const amount = entry.a ? formatZano(entry.a as number) : "N/A";
        const ts = formatTimestamp(Number(entry.t || 0));
        lines.push(`  ${ts} | ${amount} | Block ${entry.h || "N/A"}`);
      }
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async sweepBelow(input: SweepBelowInput): Promise<ToolResult> {
    try {
      const atomicAmount = humanToAtomic(input.amount, ZANO_DECIMALS);
      const mixin = input.mixin ?? DEFAULT_MIXIN;
      const fee = input.fee ? humanToAtomic(input.fee, ZANO_DECIMALS) : String(DEFAULT_FEE);

      const res = await this.client.call<Record<string, unknown>>(
        "sweep_below",
        {
          address: input.address,
          amount: Number(atomicAmount),
          mixin,
          fee: Number(fee),
        },
      );
      return textResult(
        `Sweep complete.\nTX hash: ${res.tx_hash}\nAmount swept: ${res.amount ? formatZano(res.amount as number) : "N/A"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }
}
