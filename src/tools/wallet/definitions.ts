import { z } from "zod";

export const GetBalanceShape = {};
export const GetAddressShape = {};
export const GetWalletStatusShape = {};

export const TransferShape = {
  address: z.string().describe("Destination address"),
  amount: z.string().describe("Amount in human-readable units (e.g. '1.5')"),
  asset_id: z
    .string()
    .optional()
    .describe("Asset ID to send. Omit for ZANO"),
  payment_id: z.string().optional().describe("Payment ID (optional)"),
  comment: z.string().optional().describe("Transaction comment (optional)"),
  fee: z
    .string()
    .optional()
    .describe("Fee in human-readable ZANO (default: 0.01)"),
  mixin: z
    .number()
    .int()
    .optional()
    .describe("Mixin count (default: 15 normal, 0 auditable)"),
};

export const GetRecentTransactionsShape = {
  offset: z.number().int().min(0).default(0).describe("Offset"),
  count: z.number().int().min(1).max(100).default(20).describe("Number of transactions"),
};

export const SearchTransactionsShape = {
  tx_id: z.string().optional().describe("Transaction hash to search for"),
  in: z.boolean().optional().describe("Include incoming transactions"),
  out: z.boolean().optional().describe("Include outgoing transactions"),
  pool: z.boolean().optional().describe("Include pool transactions"),
  filter_by_height: z.boolean().optional(),
  min_height: z.number().int().optional(),
  max_height: z.number().int().optional(),
};

export const SignMessageShape = {
  message: z.string().describe("Message to sign"),
};

export const SaveWalletShape = {};

export const MakeIntegratedAddressShape = {
  payment_id: z
    .string()
    .optional()
    .describe("Payment ID (auto-generated if omitted)"),
};

export const SplitIntegratedAddressShape = {
  integrated_address: z.string().describe("Integrated address to decode"),
};

export const GetMiningHistoryShape = {
  v: z.number().int().default(0).describe("Version (0)"),
};

export const SweepBelowShape = {
  address: z.string().describe("Address to sweep to"),
  amount: z
    .string()
    .describe("Threshold in human-readable ZANO - sweep outputs below this"),
  mixin: z.number().int().optional().describe("Mixin count (default: 15)"),
  fee: z
    .string()
    .optional()
    .describe("Fee in human-readable ZANO (default: 0.01)"),
};

// Schemas and types
export const TransferSchema = z.object(TransferShape);
export const GetRecentTransactionsSchema = z.object(GetRecentTransactionsShape);
export const SearchTransactionsSchema = z.object(SearchTransactionsShape);
export const SignMessageSchema = z.object(SignMessageShape);
export const MakeIntegratedAddressSchema = z.object(MakeIntegratedAddressShape);
export const SplitIntegratedAddressSchema = z.object(SplitIntegratedAddressShape);
export const GetMiningHistorySchema = z.object(GetMiningHistoryShape);
export const SweepBelowSchema = z.object(SweepBelowShape);

export type TransferInput = z.infer<typeof TransferSchema>;
export type GetRecentTransactionsInput = z.infer<typeof GetRecentTransactionsSchema>;
export type SearchTransactionsInput = z.infer<typeof SearchTransactionsSchema>;
export type SignMessageInput = z.infer<typeof SignMessageSchema>;
export type MakeIntegratedAddressInput = z.infer<typeof MakeIntegratedAddressSchema>;
export type SplitIntegratedAddressInput = z.infer<typeof SplitIntegratedAddressSchema>;
export type GetMiningHistoryInput = z.infer<typeof GetMiningHistorySchema>;
export type SweepBelowInput = z.infer<typeof SweepBelowSchema>;
