import { z } from "zod";

export const GetTradingPairShape = {
  id: z.number().int().describe("Trading pair ID"),
};

export const GetOrderBookShape = {
  pairId: z.number().int().describe("Trading pair ID"),
};

export const DexAuthenticateShape = {
  address: z.string().describe("Zano wallet address"),
  alias: z.string().optional().describe("Zano alias (optional)"),
  message: z.string().describe("Message that was signed"),
  signature: z.string().describe("Signature from wallet sign_message"),
};

export const CreateOrderShape = {
  type: z.enum(["buy", "sell"]).describe("Order type"),
  price: z.string().describe("Price per unit"),
  amount: z.string().describe("Amount of asset"),
  pairId: z.number().int().describe("Trading pair ID"),
};

export const CancelOrderShape = {
  orderId: z.number().int().describe("Order ID to cancel"),
};

export const GetMyOrdersShape = {
  pairId: z.number().int().describe("Trading pair ID"),
};

export const ApplyOrderShape = {
  id: z.string().describe("Tip ID (from applyTips)"),
  connected_order_id: z.string().describe("Your order ID that the tip matches"),
  hex_raw_proposal: z.string().describe("Encrypted ionic swap proposal hex"),
};

export const ConfirmTradeShape = {
  transactionId: z.number().int().describe("Transaction ID to confirm"),
};

export const GetActiveTradeShape = {
  firstOrderId: z.number().int().describe("First order ID"),
  secondOrderId: z.number().int().describe("Second order ID"),
};

// Schemas and types
export const GetTradingPairSchema = z.object(GetTradingPairShape);
export const GetOrderBookSchema = z.object(GetOrderBookShape);
export const DexAuthenticateSchema = z.object(DexAuthenticateShape);
export const CreateOrderSchema = z.object(CreateOrderShape);
export const CancelOrderSchema = z.object(CancelOrderShape);
export const GetMyOrdersSchema = z.object(GetMyOrdersShape);
export const ApplyOrderSchema = z.object(ApplyOrderShape);
export const ConfirmTradeSchema = z.object(ConfirmTradeShape);
export const GetActiveTradeSchema = z.object(GetActiveTradeShape);

export type GetTradingPairInput = z.infer<typeof GetTradingPairSchema>;
export type GetOrderBookInput = z.infer<typeof GetOrderBookSchema>;
export type DexAuthenticateInput = z.infer<typeof DexAuthenticateSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type GetMyOrdersInput = z.infer<typeof GetMyOrdersSchema>;
export type ApplyOrderInput = z.infer<typeof ApplyOrderSchema>;
export type ConfirmTradeInput = z.infer<typeof ConfirmTradeSchema>;
export type GetActiveTradeInput = z.infer<typeof GetActiveTradeSchema>;
