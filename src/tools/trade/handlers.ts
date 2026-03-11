import { TradeClient } from "../../clients/trade.js";
import { WalletClient } from "../../clients/wallet.js";
import { DaemonClient } from "../../clients/daemon.js";
import type {
  GetTradingPairInput,
  GetOrderBookInput,
  DexAuthenticateInput,
  CreateOrderInput,
  CancelOrderInput,
  GetMyOrdersInput,
  ApplyOrderInput,
  ConfirmTradeInput,
  GetActiveTradeInput,
} from "./definitions.js";

type ToolResult = { content: Array<{ type: "text"; text: string }> };
function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}
function errorResult(error: unknown): ToolResult {
  const msg = error instanceof Error ? error.message : String(error);
  return textResult(`Error: ${msg}`);
}

export class TradeHandlers {
  private client: TradeClient;
  private walletClient?: WalletClient;
  private daemonClient?: DaemonClient;

  constructor(client: TradeClient, walletClient?: WalletClient, daemonClient?: DaemonClient) {
    this.client = client;
    this.walletClient = walletClient;
    this.daemonClient = daemonClient;
  }

  async getTradingPair(input: GetTradingPairInput): Promise<ToolResult> {
    try {
      const data = await this.client.post<Record<string, unknown>>(
        "/api/dex/get-pair",
        { id: input.id },
      );
      const pair = data;
      const first = (pair.first_currency as Record<string, unknown>) || {};
      const second = (pair.second_currency as Record<string, unknown>) || {};
      const lines = [
        `Trading Pair #${pair.id}`,
        `  ${first.code || first.name || "?"} / ${second.code || second.name || "?"}`,
        `  Rate: ${pair.rate}`,
        `  24h High: ${pair.high}`,
        `  24h Low: ${pair.low}`,
        `  Volume: ${pair.volume}`,
      ];
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async getOrderBook(input: GetOrderBookInput): Promise<ToolResult> {
    try {
      const orders = await this.client.post<Array<Record<string, unknown>>>(
        "/api/orders/get-page",
        { pairId: input.pairId },
      );

      if (!orders || orders.length === 0) {
        return textResult(`No orders found for pair ${input.pairId}.`);
      }

      const buys = orders.filter((o) => o.type === "buy").sort((a, b) => parseFloat(String(b.price)) - parseFloat(String(a.price)));
      const sells = orders.filter((o) => o.type === "sell").sort((a, b) => parseFloat(String(a.price)) - parseFloat(String(b.price)));

      const lines = [`Order Book for Pair ${input.pairId} (${orders.length} orders):`];

      if (sells.length > 0) {
        lines.push("", "  SELLS (asks):");
        for (const o of sells) {
          const user = (o.user as Record<string, unknown>) || {};
          const instant = o.isInstant ? " [INSTANT]" : "";
          lines.push(
            `    ${o.price} | ${o.left} remaining (of ${o.amount}) | ${user.alias || "anon"}${instant}`,
          );
        }
      }

      if (buys.length > 0) {
        lines.push("", "  BUYS (bids):");
        for (const o of buys) {
          const user = (o.user as Record<string, unknown>) || {};
          const instant = o.isInstant ? " [INSTANT]" : "";
          lines.push(
            `    ${o.price} | ${o.left} remaining (of ${o.amount}) | ${user.alias || "anon"}${instant}`,
          );
        }
      }

      if (buys.length > 0 && sells.length > 0) {
        const bestBid = parseFloat(String(buys[0].price));
        const bestAsk = parseFloat(String(sells[0].price));
        const spread = bestAsk - bestBid;
        const spreadPct = ((spread / bestAsk) * 100).toFixed(2);
        lines.push("", `  Spread: ${spread.toFixed(8)} (${spreadPct}%)`);
        lines.push(`  Best bid: ${bestBid} | Best ask: ${bestAsk}`);
      }

      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async dexAuthenticate(input: DexAuthenticateInput): Promise<ToolResult> {
    try {
      if (!this.walletClient) {
        throw new Error("Wallet RPC not configured. Set ZANO_WALLET_URL to enable auto-auth.");
      }

      // Step 1: Get address from wallet (or use provided)
      let address = input.address;
      if (!address) {
        const addrResult = await this.walletClient.call<{ address: string }>("getaddress");
        address = addrResult.address;
      }

      // Step 2: Get alias from daemon (or use provided)
      // Note: get_alias_by_address requires raw string param, not object
      let alias = input.alias;
      if (!alias && this.daemonClient) {
        try {
          const res = await fetch(this.daemonClient.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 0,
              method: "get_alias_by_address",
              params: address,
            }),
          });
          const json = await res.json() as any;
          alias = json?.result?.alias_info_list?.[0]?.alias || "";
        } catch {
          alias = "";
        }
      }

      // Step 3: Request auth message from Trade API
      const message = await this.client.post<string>(
        "/api/auth/request-auth",
        { address, alias: alias || "" },
      );

      // Step 4: Sign the message with wallet
      const signResult = await this.walletClient.call<{ sig: string; pkey: string }>(
        "sign_message",
        { buff: Buffer.from(message).toString("base64") },
      );

      // Step 5: Authenticate with Trade API
      const data = await this.client.post<Record<string, unknown>>(
        "/api/auth",
        {
          data: {
            address,
            alias: alias || "",
            message,
            signature: signResult.sig,
          },
          neverExpires: true,
        },
      );

      if (data && typeof data === "string") {
        this.client.setToken(data);
        return textResult(`Authenticated with Trade API as "${alias || address.slice(0, 12) + "..."}". Token stored.`);
      }
      return textResult(`Authentication response: ${JSON.stringify(data)}`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async createOrder(input: CreateOrderInput): Promise<ToolResult> {
    try {
      const data = await this.client.post<Record<string, unknown>>(
        "/api/orders/create",
        {
          orderData: {
            type: input.type,
            side: "limit",
            price: input.price,
            amount: input.amount,
            pairId: input.pairId,
          },
        },
        true,
      );
      return textResult(
        `Order created!\n  ID: ${data.id}\n  Type: ${data.type}\n  Price: ${data.price}\n  Amount: ${data.amount}\n  Status: ${data.status}`,
      );
    } catch (e) {
      return errorResult(e);
    }
  }

  async cancelOrder(input: CancelOrderInput): Promise<ToolResult> {
    try {
      await this.client.post(
        "/api/orders/cancel",
        { orderId: input.orderId },
        true,
      );
      return textResult(`Order ${input.orderId} cancelled.`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async getMyOrders(input: GetMyOrdersInput): Promise<ToolResult> {
    try {
      const data = await this.client.post<Record<string, unknown>>(
        "/api/orders/get-user-page",
        { pairId: input.pairId },
        true,
      );
      const orders = (data.orders || []) as Array<Record<string, unknown>>;
      const tips = (data.applyTips || []) as Array<Record<string, unknown>>;

      const lines = [`Your Orders for Pair ${input.pairId}:`];

      if (orders.length === 0) {
        lines.push("  No active orders.");
      } else {
        for (const o of orders) {
          const instant = o.isInstant ? " [INSTANT]" : "";
          lines.push(
            `  #${o.id} ${o.type} ${o.left}/${o.amount} @ ${o.price}${instant}`,
          );
        }
      }

      if (tips.length > 0) {
        lines.push("", `  Pending Tips (${tips.length}):`);
        for (const t of tips) {
          const user = (t.user as Record<string, unknown>) || {};
          const hasTx = t.transaction ? " [HAS TX]" : "";
          lines.push(
            `    Tip #${t.id} for order #${t.connected_order_id} | ${t.left} @ ${t.price} | ${user.alias || "anon"}${hasTx}`,
          );
        }
      }

      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }

  async applyOrder(input: ApplyOrderInput): Promise<ToolResult> {
    try {
      await this.client.post(
        "/api/orders/apply-order",
        {
          orderData: {
            id: input.id,
            connected_order_id: input.connected_order_id,
            hex_raw_proposal: input.hex_raw_proposal,
          },
        },
        true,
      );
      return textResult(`Applied to order. Tip ID: ${input.id}, connected to order: ${input.connected_order_id}`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async confirmTrade(input: ConfirmTradeInput): Promise<ToolResult> {
    try {
      await this.client.post(
        "/api/transactions/confirm",
        { transactionId: input.transactionId },
        true,
      );
      return textResult(`Trade ${input.transactionId} confirmed.`);
    } catch (e) {
      return errorResult(e);
    }
  }

  async getActiveTrade(input: GetActiveTradeInput): Promise<ToolResult> {
    try {
      const data = await this.client.post<Record<string, unknown>>(
        "/api/transactions/get-active-tx-by-orders-ids",
        {
          firstOrderId: input.firstOrderId,
          secondOrderId: input.secondOrderId,
        },
        true,
      );
      const lines = [
        `Active Trade:`,
        `  Buy order: ${data.buy_order_id}`,
        `  Sell order: ${data.sell_order_id}`,
        `  Amount: ${data.amount}`,
        `  Status: ${data.status}`,
        `  Creator: ${data.creator || "N/A"}`,
      ];
      if (data.hex_raw_proposal) {
        lines.push(`  Has proposal hex: Yes (${String(data.hex_raw_proposal).length} chars)`);
      }
      return textResult(lines.join("\n"));
    } catch (e) {
      return errorResult(e);
    }
  }
}
