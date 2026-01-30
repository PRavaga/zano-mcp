import { z } from "zod";

// --- Zod raw shapes (passed to server.tool()) ---

export const GetNetworkInfoShape = {};

export const GetHeightShape = {};

export const GetBlockByHeightShape = {
  height: z.number().int().min(0).describe("Block height"),
};

export const GetBlockByHashShape = {
  hash: z.string().describe("Block hash"),
};

export const GetLastBlockShape = {};

export const GetBlockDetailsShape = {
  id: z.string().describe("Block hash"),
};

export const GetTransactionShape = {
  tx_hash: z.string().describe("Transaction hash"),
};

export const GetTransactionsShape = {
  tx_hashes: z.array(z.string()).describe("Array of transaction hashes"),
};

export const GetPoolInfoShape = {};

export const GetAssetInfoShape = {
  asset_id: z.string().describe("Asset ID (64-char hex)"),
};

export const GetAssetsListShape = {
  offset: z.number().int().min(0).default(0).describe("Offset for pagination"),
  count: z.number().int().min(1).max(100).default(50).describe("Number of assets to return"),
};

export const ResolveAliasShape = {
  alias: z.string().describe("Zano alias (without @)"),
};

export const GetAliasByAddressShape = {
  address: z.string().describe("Zano address"),
};

export const SearchBlockchainShape = {
  id: z.string().describe("Hash, alias, or address to search for"),
};

export const ValidateSignatureShape = {
  buff: z.string().describe("Message that was signed"),
  address: z.string().describe("Address of the signer"),
  signature: z.string().describe("Signature to validate"),
};

// --- Zod full schemas (for type inference) ---

export const GetBlockByHeightSchema = z.object(GetBlockByHeightShape);
export const GetBlockByHashSchema = z.object(GetBlockByHashShape);
export const GetBlockDetailsSchema = z.object(GetBlockDetailsShape);
export const GetTransactionSchema = z.object(GetTransactionShape);
export const GetTransactionsSchema = z.object(GetTransactionsShape);
export const GetAssetInfoSchema = z.object(GetAssetInfoShape);
export const GetAssetsListSchema = z.object(GetAssetsListShape);
export const ResolveAliasSchema = z.object(ResolveAliasShape);
export const GetAliasByAddressSchema = z.object(GetAliasByAddressShape);
export const SearchBlockchainSchema = z.object(SearchBlockchainShape);
export const ValidateSignatureSchema = z.object(ValidateSignatureShape);

// --- TypeScript types ---

export type GetBlockByHeightInput = z.infer<typeof GetBlockByHeightSchema>;
export type GetBlockByHashInput = z.infer<typeof GetBlockByHashSchema>;
export type GetBlockDetailsInput = z.infer<typeof GetBlockDetailsSchema>;
export type GetTransactionInput = z.infer<typeof GetTransactionSchema>;
export type GetTransactionsInput = z.infer<typeof GetTransactionsSchema>;
export type GetAssetInfoInput = z.infer<typeof GetAssetInfoSchema>;
export type GetAssetsListInput = z.infer<typeof GetAssetsListSchema>;
export type ResolveAliasInput = z.infer<typeof ResolveAliasSchema>;
export type GetAliasByAddressInput = z.infer<typeof GetAliasByAddressSchema>;
export type SearchBlockchainInput = z.infer<typeof SearchBlockchainSchema>;
export type ValidateSignatureInput = z.infer<typeof ValidateSignatureSchema>;
