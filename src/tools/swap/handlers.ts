import { WalletClient } from "../../clients/wallet.js";
import {
  humanToAtomic,
  atomicToHuman,
  formatAssetAmount,
  getAssetInfo,
} from "../../utils/formatting.js";
import { ZANO_ASSET_ID, ZANO_DECIMALS, DEFAULT_FEE } from "../../utils/constants.js";
import type {
  CreateSwapProposalInput,
  GetSwapInfoInput,
  AcceptSwapInput,
} from "./definitions.js";

type ToolResult = { content: Array<{ type: "text"; text: string }> };
function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
function errorResult(error: unknown): ToolResult {
  const msg = error instanceof Error ? error.message : String(error);
  return textResult(`Error: ${msg}`);
}

export class SwapHandlers {
  private client: WalletClient;

  constructor(client: WalletClient) {
    this.client = client;
  }

  async createSwapProposal(input: CreateSwapProposalInput): Promise<ToolResult> {
    try {
      const toFinalizer = input.to_finalizer.map((a) => {
        const info = getAssetInfo(a.asset_id);
        const decimals = info?.decimals ?? ZANO_DECIMALS;
        return {
          asset_id: a.asset_id,
          amount: humanToAtomic(a.amount, decimals),
        };
      });

      const toInitiator = input.to_initiator.map((a) => {
        const info = getAssetInfo(a.asset_id);
        const decimals = info?.decimals ?? ZANO_DECIMALS;
        return {
          asset_id: a.asset_id,
          amount: humanToAtomic(a.amount, decimals),
        };
      });

      const fee = input.fee
        ? humanToAtomic(input.fee, ZANO_DECIMALS)
        : String(DEFAULT_FEE);

      const res = await this.client.call<{ hex_raw_proposal: string }>(
        "ionic_swap_generate_proposal",
        {
          proposal: {
            to_finalizer: toFinalizer,
            to_initiator: toInitiator,
            mixins: input.mixins,
            fee_paid_by_a: Number(fee),
            expiration_time: input.expiration_time,
          },
          destination_address: input.destination_address,
        },
      );

      const lines = [
        "Swap Proposal Created",
        "",
        "You send (to finalizer):",
      ];
      for (const a of input.to_finalizer) {
        lines.push(`  ${a.amount} ${getAssetInfo(a.asset_id)?.ticker || a.asset_id.slice(0, 12)}`);
      }
      lines.push("", "You receive (from finalizer):");
      for (const a of input.to_initiator) {
        lines.push(`  ${a.amount} ${getAssetInfo(a.asset_id)?.ticker || a.asset_id.slice(0, 12)}`);
      }
      lines.push("", `Hex proposal: ${res.hex_raw_proposal.slice(0, 40)}...`);
      lines.push(`Full hex length: ${res.hex_raw_proposal.length} chars`);

      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getSwapInfo(input: GetSwapInfoInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ proposal: Record<string, unknown> }>(
        "ionic_swap_get_proposal_info",
        { hex_raw_proposal: input.hex_raw_proposal },
      );

      const proposal = res.proposal;
      const lines = ["Swap Proposal Details"];

      const toFinalizer = (proposal.to_finalizer || []) as Array<{ asset_id: string; amount: string | number }>;
      const toInitiator = (proposal.to_initiator || []) as Array<{ asset_id: string; amount: string | number }>;

      lines.push("", "Initiator sends (to finalizer):");
      for (const a of toFinalizer) {
        lines.push(`  ${formatAssetAmount(a.amount, a.asset_id)}`);
      }

      lines.push("", "Finalizer sends (to initiator):");
      for (const a of toInitiator) {
        lines.push(`  ${formatAssetAmount(a.amount, a.asset_id)}`);
      }

      lines.push(
        "",
        `Fee: ${proposal.fee_paid_by_a ? atomicToHuman(BigInt(String(proposal.fee_paid_by_a)), ZANO_DECIMALS) + " ZANO" : "N/A"}`,
        `Mixins: ${proposal.mixins || "N/A"}`,
        `Expiration: ${proposal.expiration_time === 0 ? "None" : String(proposal.expiration_time)}`,
      );

      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async acceptSwap(input: AcceptSwapInput): Promise<ToolResult> {
    try {
      const res = await this.client.call<{ result_tx_id: string }>(
        "ionic_swap_accept_proposal",
        { hex_raw_proposal: input.hex_raw_proposal },
      );
      return textResult(
        `Swap accepted and executed!\nTransaction ID: ${res.result_tx_id}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }
}
