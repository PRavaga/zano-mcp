# zano-mcp

MCP server for the [Zano](https://zano.org) blockchain. Wraps Zano's daemon, wallet, and trade JSON-RPC APIs as MCP tools.

## Installation

```json
{
  "mcpServers": {
    "zano": {
      "command": "npx",
      "args": ["-y", "zano-mcp"],
      "env": {
        "ZANO_DAEMON_URL": "http://127.0.0.1:11211/json_rpc"
      }
    }
  }
}
```

**Public node (zero setup):**

```json
{
  "mcpServers": {
    "zano": {
      "command": "npx",
      "args": ["-y", "zano-mcp"],
      "env": {
        "ZANO_DAEMON_URL": "http://37.27.100.59:10500/json_rpc"
      }
    }
  }
}
```

**Full config (daemon + wallet + trade):**

```json
{
  "mcpServers": {
    "zano": {
      "command": "npx",
      "args": ["-y", "zano-mcp"],
      "env": {
        "ZANO_DAEMON_URL": "http://127.0.0.1:11211/json_rpc",
        "ZANO_WALLET_URL": "http://127.0.0.1:11212/json_rpc",
        "ZANO_TRADE_TOKEN": "your_trade_api_token"
      }
    }
  }
}
```

## Configuration

All environment variables are optional with sensible defaults.

| Variable | Default | Description |
|----------|---------|-------------|
| `ZANO_DAEMON_URL` | `http://127.0.0.1:11211/json_rpc` | Daemon RPC endpoint |
| `ZANO_WALLET_URL` | (none) | Wallet RPC endpoint. If unset, wallet tools are not registered |
| `ZANO_WALLET_AUTH` | (none) | JWT secret for wallet RPC auth |
| `ZANO_TRADE_URL` | `https://api.trade.zano.org` | Trade API base URL |
| `ZANO_TRADE_TOKEN` | (none) | Trade API auth token. If unset, only public trade tools |
| `ZANO_NETWORK` | `mainnet` | `mainnet` or `testnet` |
| `ZANO_LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

CLI args override env vars: `--daemon-url`, `--wallet-url`, `--network`, etc.

## Feature Gating

Tools are conditionally registered based on what's configured:

| Config present | Tools available |
|---------------|----------------|
| Always | Daemon tools (15) + Public trade tools (2) |
| `ZANO_WALLET_URL` | + Wallet (12) + Asset (7) + Swap (3) tools |
| `ZANO_TRADE_TOKEN` | + Authenticated trade tools (7) |

## Available Tools

### Daemon Tools (15)

| Tool | Description |
|------|-------------|
| `get_network_info` | Network status (height, difficulty, hashrate, connections) |
| `get_height` | Current blockchain height |
| `get_block_by_height` | Block header at a given height |
| `get_block_by_hash` | Block header by hash |
| `get_last_block` | Latest block header |
| `get_block_details` | Full block with transaction list |
| `get_transaction` | Transaction details by hash |
| `get_transactions` | Batch transaction lookup |
| `get_pool_info` | Mempool status |
| `get_asset_info` | Asset metadata by ID |
| `get_assets_list` | All registered assets |
| `resolve_alias` | Address for a Zano alias |
| `get_alias_by_address` | Alias for an address |
| `search_blockchain` | Search by hash/alias |
| `validate_signature` | Verify a signed message |

### Wallet Tools (12) - requires `ZANO_WALLET_URL`

| Tool | Description |
|------|-------------|
| `get_balance` | Wallet balance (all assets, human-readable) |
| `get_address` | Wallet public address |
| `get_wallet_status` | Sync status, watch-only flag |
| `transfer` | Send ZANO or assets (human-readable amounts) |
| `get_recent_transactions` | Recent transaction history |
| `search_transactions` | Search by various criteria |
| `sign_message` | Sign arbitrary data |
| `save_wallet` | Persist wallet state |
| `make_integrated_address` | Create with payment ID |
| `split_integrated_address` | Decode integrated address |
| `get_mining_history` | PoS staking rewards |
| `sweep_below` | Consolidate small outputs |

### Asset Tools (7) - requires `ZANO_WALLET_URL`

| Tool | Description |
|------|-------------|
| `deploy_asset` | Create a new asset |
| `emit_asset` | Mint additional supply |
| `burn_asset` | Burn tokens |
| `update_asset` | Update metadata |
| `transfer_asset_ownership` | Change asset owner |
| `whitelist_asset` | Add to wallet whitelist |
| `remove_asset_from_whitelist` | Remove from whitelist |

### Swap Tools (3) - requires `ZANO_WALLET_URL`

| Tool | Description |
|------|-------------|
| `create_swap_proposal` | Create an ionic swap proposal |
| `get_swap_info` | View proposal details |
| `accept_swap` | Accept and execute a swap |

### Trade Tools (2 public + 7 authenticated)

**Public (always available):**

| Tool | Description |
|------|-------------|
| `get_trading_pair` | Pair info by ID |
| `get_order_book` | Order book with depth/spread |

**Authenticated (requires `ZANO_TRADE_TOKEN`):**

| Tool | Description |
|------|-------------|
| `dex_authenticate` | Authenticate with Trade API |
| `create_order` | Create buy/sell order |
| `cancel_order` | Cancel an order |
| `get_my_orders` | Your active orders + tips |
| `apply_order` | Match with another order |
| `confirm_trade` | Confirm a trade |
| `get_active_trade` | Get trade by order IDs |

## Resources

| URI | Description |
|-----|-------------|
| `zano://network/info` | Current network configuration |
| `zano://assets/whitelist` | Official asset whitelist |

## Prompts

| Prompt | Description |
|--------|-------------|
| `check-network` | Generate a network status report |
| `analyze-order-book` | Analyze order book for a pair |
| `explain-transaction` | Explain a transaction in plain language |
| `swap-calculator` | Calculate swap parameters |

## Requirements

- Node.js >= 18
- A running Zano daemon (local or public node)
- Wallet RPC running if you want wallet/asset/swap tools
- Trade API token if you want authenticated DEX operations

## Development

```bash
git clone https://github.com/PRavaga/zano-mcp.git
cd zano-mcp
npm install
ZANO_DAEMON_URL=http://37.27.100.59:10500/json_rpc npm run dev
```

## License

MIT
