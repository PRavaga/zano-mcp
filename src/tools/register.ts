import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { DaemonClient } from "../clients/daemon.js";
import { WalletClient } from "../clients/wallet.js";
import { TradeClient } from "../clients/trade.js";
import { DaemonHandlers } from "./daemon/handlers.js";
import { WalletHandlers } from "./wallet/handlers.js";
import { AssetHandlers } from "./assets/handlers.js";
import { SwapHandlers } from "./swap/handlers.js";
import { TradeHandlers } from "./trade/handlers.js";
import * as daemonDefs from "./daemon/definitions.js";
import * as walletDefs from "./wallet/definitions.js";
import * as assetDefs from "./assets/definitions.js";
import * as swapDefs from "./swap/definitions.js";
import * as tradeDefs from "./trade/definitions.js";
import { logger } from "../logger.js";

export function registerAllTools(server: McpServer, config: Config): void {
  const daemonClient = new DaemonClient(config.daemonUrl);
  registerDaemonTools(server, daemonClient);

  if (config.walletUrl) {
    const walletClient = new WalletClient(config.walletUrl, config.walletAuth);
    registerWalletTools(server, new WalletHandlers(walletClient, daemonClient));
    registerAssetTools(server, new AssetHandlers(walletClient));
    registerSwapTools(server, new SwapHandlers(walletClient));
    logger.info("Wallet/Asset/Swap tools registered");
  } else {
    logger.info("No ZANO_WALLET_URL set - wallet/asset/swap tools disabled");
  }

  const tradeClient = new TradeClient(config.tradeUrl, config.tradeToken);
  registerTradeTools(server, new TradeHandlers(tradeClient), !!config.tradeToken);
  logger.info("Trade tools registered");
}

function registerDaemonTools(server: McpServer, client: DaemonClient): void {
  const h = new DaemonHandlers(client);

  server.tool(
    "get_network_info",
    "Get Zano network status including height, difficulty, hashrate, connections, version",
    daemonDefs.GetNetworkInfoShape,
    async () => h.getNetworkInfo(),
  );

  server.tool(
    "get_height",
    "Get current Zano blockchain height",
    daemonDefs.GetHeightShape,
    async () => h.getHeight(),
  );

  server.tool(
    "get_block_by_height",
    "Get block header at a specific height",
    daemonDefs.GetBlockByHeightShape,
    async (args) => h.getBlockByHeight(args),
  );

  server.tool(
    "get_block_by_hash",
    "Get block header by its hash",
    daemonDefs.GetBlockByHashShape,
    async (args) => h.getBlockByHash(args),
  );

  server.tool(
    "get_last_block",
    "Get the latest block header",
    daemonDefs.GetLastBlockShape,
    async () => h.getLastBlock(),
  );

  server.tool(
    "get_block_details",
    "Get full block details including transactions",
    daemonDefs.GetBlockDetailsShape,
    async (args) => h.getBlockDetails(args),
  );

  server.tool(
    "get_transaction",
    "Get transaction details by hash",
    daemonDefs.GetTransactionShape,
    async (args) => h.getTransaction(args),
  );

  server.tool(
    "get_transactions",
    "Batch lookup of multiple transactions by their hashes",
    daemonDefs.GetTransactionsShape,
    async (args) => h.getTransactions(args),
  );

  server.tool(
    "get_pool_info",
    "Get mempool (transaction pool) status and pending transactions",
    daemonDefs.GetPoolInfoShape,
    async () => h.getPoolInfo(),
  );

  server.tool(
    "get_asset_info",
    "Get metadata for a registered asset by its ID",
    daemonDefs.GetAssetInfoShape,
    async (args) => h.getAssetInfo(args),
  );

  server.tool(
    "get_assets_list",
    "List all registered assets on the Zano blockchain",
    daemonDefs.GetAssetsListShape,
    async (args) => h.getAssetsList(args),
  );

  server.tool(
    "resolve_alias",
    "Resolve a Zano alias to its address",
    daemonDefs.ResolveAliasShape,
    async (args) => h.resolveAlias(args),
  );

  server.tool(
    "get_alias_by_address",
    "Look up the alias for a Zano address",
    daemonDefs.GetAliasByAddressShape,
    async (args) => h.getAliasByAddress(args),
  );

  server.tool(
    "search_blockchain",
    "Search the blockchain by hash, alias, or address",
    daemonDefs.SearchBlockchainShape,
    async (args) => h.searchBlockchain(args),
  );

  server.tool(
    "validate_signature",
    "Verify a signed message against an address",
    daemonDefs.ValidateSignatureShape,
    async (args) => h.validateSignature(args),
  );

  logger.info("Daemon tools registered (15 tools)");
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function registerWalletTools(server: McpServer, h: WalletHandlers): void {
  server.tool("get_balance", "Get wallet balance for all assets", walletDefs.GetBalanceShape, async () => h.getBalance());
  server.tool("get_address", "Get wallet public address", walletDefs.GetAddressShape, async () => h.getAddress());
  server.tool("get_wallet_status", "Get wallet sync status and info", walletDefs.GetWalletStatusShape, async () => h.getWalletStatus());
  server.tool("transfer", "Send ZANO or assets to an address. Amounts in human-readable units.", walletDefs.TransferShape, async (args: any) => h.transfer(args));
  server.tool("get_recent_transactions", "Get recent wallet transactions", walletDefs.GetRecentTransactionsShape, async (args: any) => h.getRecentTransactions(args));
  server.tool("search_transactions", "Search wallet transactions by criteria", walletDefs.SearchTransactionsShape, async (args: any) => h.searchTransactions(args));
  server.tool("sign_message", "Sign arbitrary data with the wallet", walletDefs.SignMessageShape, async (args: any) => h.signMessage(args));
  server.tool("save_wallet", "Persist wallet state to disk", walletDefs.SaveWalletShape, async () => h.saveWallet());
  server.tool("make_integrated_address", "Create an integrated address with payment ID", walletDefs.MakeIntegratedAddressShape, async (args: any) => h.makeIntegratedAddress(args));
  server.tool("split_integrated_address", "Decode an integrated address", walletDefs.SplitIntegratedAddressShape, async (args: any) => h.splitIntegratedAddress(args));
  server.tool("get_mining_history", "Get PoS staking reward history", walletDefs.GetMiningHistoryShape, async (args: any) => h.getMiningHistory(args));
  server.tool("sweep_below", "Consolidate small outputs below a threshold", walletDefs.SweepBelowShape, async (args: any) => h.sweepBelow(args));
}

function registerAssetTools(server: McpServer, h: AssetHandlers): void {
  server.tool("deploy_asset", "Deploy a new asset on Zano", assetDefs.DeployAssetShape, async (args: any) => h.deployAsset(args));
  server.tool("emit_asset", "Mint additional supply of an asset", assetDefs.EmitAssetShape, async (args: any) => h.emitAsset(args));
  server.tool("burn_asset", "Burn tokens of an asset", assetDefs.BurnAssetShape, async (args: any) => h.burnAsset(args));
  server.tool("update_asset", "Update asset metadata", assetDefs.UpdateAssetShape, async (args: any) => h.updateAsset(args));
  server.tool("transfer_asset_ownership", "Transfer ownership of an asset", assetDefs.TransferAssetOwnershipShape, async (args: any) => h.transferAssetOwnership(args));
  server.tool("whitelist_asset", "Add an asset to the wallet whitelist", assetDefs.WhitelistAssetShape, async (args: any) => h.whitelistAsset(args));
  server.tool("remove_asset_from_whitelist", "Remove an asset from the wallet whitelist", assetDefs.RemoveAssetFromWhitelistShape, async (args: any) => h.removeAssetFromWhitelist(args));
}

function registerSwapTools(server: McpServer, h: SwapHandlers): void {
  server.tool("create_swap_proposal", "Create an ionic swap proposal. Amounts in human-readable units.", swapDefs.CreateSwapProposalShape, async (args: any) => h.createSwapProposal(args));
  server.tool("get_swap_info", "Get details of an ionic swap proposal", swapDefs.GetSwapInfoShape, async (args: any) => h.getSwapInfo(args));
  server.tool("accept_swap", "Accept and execute an ionic swap proposal", swapDefs.AcceptSwapShape, async (args: any) => h.acceptSwap(args));
}

function registerTradeTools(server: McpServer, h: TradeHandlers, hasAuth: boolean): void {
  server.tool("get_trading_pair", "Get trading pair info by ID", tradeDefs.GetTradingPairShape, async (args: any) => h.getTradingPair(args));
  server.tool("get_order_book", "Get order book for a trading pair", tradeDefs.GetOrderBookShape, async (args: any) => h.getOrderBook(args));

  if (hasAuth) {
    server.tool("create_order", "Create a buy/sell order on the DEX", tradeDefs.CreateOrderShape, async (args: any) => h.createOrder(args));
    server.tool("cancel_order", "Cancel an active order", tradeDefs.CancelOrderShape, async (args: any) => h.cancelOrder(args));
    server.tool("get_my_orders", "Get your active orders for a pair", tradeDefs.GetMyOrdersShape, async (args: any) => h.getMyOrders(args));
    server.tool("apply_order", "Apply to match with another order (initiator role)", tradeDefs.ApplyOrderShape, async (args: any) => h.applyOrder(args));
    server.tool("confirm_trade", "Confirm a finalized trade transaction", tradeDefs.ConfirmTradeShape, async (args: any) => h.confirmTrade(args));
    server.tool("get_active_trade", "Get active transaction by order IDs", tradeDefs.GetActiveTradeShape, async (args: any) => h.getActiveTrade(args));
    server.tool("dex_authenticate", "Authenticate with the Zano Trade API", tradeDefs.DexAuthenticateShape, async (args: any) => h.dexAuthenticate(args));
  }
}
