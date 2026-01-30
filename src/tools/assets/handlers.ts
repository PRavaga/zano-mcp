import { WalletClient } from "../../clients/wallet.js";
import { humanToAtomic, formatAssetAmount } from "../../utils/formatting.js";
import type {
  DeployAssetInput,
  EmitAssetInput,
  BurnAssetInput,
  UpdateAssetInput,
  TransferAssetOwnershipInput,
  WhitelistAssetInput,
  RemoveAssetFromWhitelistInput,
} from "./definitions.js";

type ToolResult = { content: Array<{ type: "text"; text: string }> };
function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
function errorResult(error: unknown): ToolResult {
  const msg = error instanceof Error ? error.message : String(error);
  return textResult(`Error: ${msg}`);
}

export class AssetHandlers {
  private client: WalletClient;

  constructor(client: WalletClient) {
    this.client = client;
  }

  async deployAsset(input: DeployAssetInput): Promise<ToolResult> {
    try {
      const decimals = input.decimal_point;
      const totalMaxSupply = humanToAtomic(input.total_max_supply, decimals);
      const currentSupply = humanToAtomic(input.current_supply, decimals);

      const res = await this.client.call<Record<string, unknown>>("deploy_asset", {
        asset_descriptor: {
          ticker: input.ticker,
          full_name: input.full_name,
          total_max_supply: Number(totalMaxSupply),
          current_supply: Number(currentSupply),
          decimal_point: decimals,
          meta_info: input.meta_info || "",
          hidden_supply: input.hidden_supply || false,
        },
      });
      return textResult(
        `Asset deployed!\nAsset ID: ${res.new_asset_id || res.asset_id}\nTX hash: ${res.tx_hash || "N/A"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async emitAsset(input: EmitAssetInput): Promise<ToolResult> {
    try {
      // Need to look up decimals from the asset - default to 12 if unknown
      const res = await this.client.call<Record<string, unknown>>("emit_asset", {
        asset_id: input.asset_id,
        amount: input.amount,
      });
      return textResult(
        `Asset emitted: ${input.amount} of ${input.asset_id.slice(0, 16)}...\nTX hash: ${res.tx_hash || "N/A"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async burnAsset(input: BurnAssetInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>("burn_asset", {
        asset_id: input.asset_id,
        amount: input.amount,
      });
      return textResult(
        `Asset burned: ${input.amount} of ${input.asset_id.slice(0, 16)}...\nTX hash: ${res.tx_hash || "N/A"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async updateAsset(input: UpdateAssetInput): Promise<ToolResult> {
    try {
      const descriptor: Record<string, unknown> = {};
      if (input.ticker) descriptor.ticker = input.ticker;
      if (input.full_name) descriptor.full_name = input.full_name;
      if (input.meta_info) descriptor.meta_info = input.meta_info;

      const res = await this.client.call<Record<string, unknown>>("update_asset", {
        asset_id: input.asset_id,
        asset_descriptor: descriptor,
      });
      return textResult(
        `Asset updated: ${input.asset_id.slice(0, 16)}...\nTX hash: ${res.tx_hash || "N/A"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async transferAssetOwnership(input: TransferAssetOwnershipInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<Record<string, unknown>>(
        "transfer_asset_ownership",
        {
          asset_id: input.asset_id,
          new_owner: input.new_owner,
        },
      );
      return textResult(
        `Ownership transferred for ${input.asset_id.slice(0, 16)}...\nNew owner: ${input.new_owner}\nTX hash: ${res.tx_hash || "N/A"}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async whitelistAsset(input: WhitelistAssetInput): Promise<ToolResult> {
    try {
      await this.client.call("assets_whitelist_add", {
        asset_id: input.asset_id,
      });
      return textResult(`Asset ${input.asset_id.slice(0, 16)}... added to whitelist.`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async removeAssetFromWhitelist(input: RemoveAssetFromWhitelistInput): Promise<ToolResult> {
    try {
      await this.client.call("assets_whitelist_remove", {
        asset_id: input.asset_id,
      });
      return textResult(`Asset ${input.asset_id.slice(0, 16)}... removed from whitelist.`);
    } catch (e) {
      return errorResult(e);
    }
  }
}
