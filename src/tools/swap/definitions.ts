import { z } from "zod";

const SwapAsset = z.object({
  asset_id: z.string().describe("Asset ID"),
  amount: z.string().describe("Amount in human-readable units"),
});

export const CreateSwapProposalShape = {
  to_finalizer: z
    .array(SwapAsset)
    .describe("Assets to send TO the finalizer (what you give)"),
  to_initiator: z
    .array(SwapAsset)
    .describe("Assets to receive FROM the finalizer (what you get)"),
  destination_address: z.string().describe("Finalizer's Zano address"),
  mixins: z.number().int().default(10).describe("Privacy parameter (default: 10)"),
  fee: z.string().optional().describe("Fee in ZANO human units (default: 0.01)"),
  expiration_time: z.number().int().default(0).describe("Expiration timestamp (0 = no expiry)"),
};

export const GetSwapInfoShape = {
  hex_raw_proposal: z.string().describe("Hex-encoded swap proposal"),
};

export const AcceptSwapShape = {
  hex_raw_proposal: z.string().describe("Hex-encoded swap proposal to accept"),
};

// Schemas and types
export const CreateSwapProposalSchema = z.object(CreateSwapProposalShape);
export const GetSwapInfoSchema = z.object(GetSwapInfoShape);
export const AcceptSwapSchema = z.object(AcceptSwapShape);

export type CreateSwapProposalInput = z.infer<typeof CreateSwapProposalSchema>;
export type GetSwapInfoInput = z.infer<typeof GetSwapInfoSchema>;
export type AcceptSwapInput = z.infer<typeof AcceptSwapSchema>;
