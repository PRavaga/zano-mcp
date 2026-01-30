import { z } from "zod";

export const DeployAssetShape = {
  ticker: z.string().describe("Asset ticker symbol (e.g. 'MYTOKEN')"),
  full_name: z.string().describe("Full asset name"),
  total_max_supply: z.string().describe("Maximum supply in human-readable units"),
  current_supply: z.string().describe("Initial supply to mint in human-readable units"),
  decimal_point: z.number().int().min(0).max(18).default(12).describe("Decimal places"),
  meta_info: z.string().optional().describe("JSON metadata string"),
  hidden_supply: z.boolean().optional().default(false).describe("Whether to hide supply info"),
};

export const EmitAssetShape = {
  asset_id: z.string().describe("Asset ID to mint"),
  amount: z.string().describe("Amount to mint in human-readable units"),
};

export const BurnAssetShape = {
  asset_id: z.string().describe("Asset ID to burn"),
  amount: z.string().describe("Amount to burn in human-readable units"),
};

export const UpdateAssetShape = {
  asset_id: z.string().describe("Asset ID to update"),
  ticker: z.string().optional().describe("New ticker"),
  full_name: z.string().optional().describe("New full name"),
  meta_info: z.string().optional().describe("New metadata"),
};

export const TransferAssetOwnershipShape = {
  asset_id: z.string().describe("Asset ID"),
  new_owner: z.string().describe("New owner's public key"),
};

export const WhitelistAssetShape = {
  asset_id: z.string().describe("Asset ID to add to whitelist"),
};

export const RemoveAssetFromWhitelistShape = {
  asset_id: z.string().describe("Asset ID to remove from whitelist"),
};

// Schemas and types
export const DeployAssetSchema = z.object(DeployAssetShape);
export const EmitAssetSchema = z.object(EmitAssetShape);
export const BurnAssetSchema = z.object(BurnAssetShape);
export const UpdateAssetSchema = z.object(UpdateAssetShape);
export const TransferAssetOwnershipSchema = z.object(TransferAssetOwnershipShape);
export const WhitelistAssetSchema = z.object(WhitelistAssetShape);
export const RemoveAssetFromWhitelistSchema = z.object(RemoveAssetFromWhitelistShape);

export type DeployAssetInput = z.infer<typeof DeployAssetSchema>;
export type EmitAssetInput = z.infer<typeof EmitAssetSchema>;
export type BurnAssetInput = z.infer<typeof BurnAssetSchema>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>;
export type TransferAssetOwnershipInput = z.infer<typeof TransferAssetOwnershipSchema>;
export type WhitelistAssetInput = z.infer<typeof WhitelistAssetSchema>;
export type RemoveAssetFromWhitelistInput = z.infer<typeof RemoveAssetFromWhitelistSchema>;
