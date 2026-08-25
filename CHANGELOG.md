# Changelog

## 0.2.0 — HF6 support

Compatibility release for Zano hard fork 6 (mainnet height 3,833,000).
Requires wallet >= 2.2.1.501 for payment-id transfers.

### Changed
- `transfer`: payment ids are now sent as HF6 intrinsic per-destination
  values (`destinations[].payment_id`) instead of the tx-wide field, which
  2.2.x wallets reject. Input stays the usual hex string; conversion matches
  the core's `convert_payment_id` exactly, and the value goes on the wire as
  a decimal string to preserve the full uint64 range.
- `transfer` refuses pid-bearing sends to pre-2.2.x wallets (capability
  probe) — an old wallet would silently drop the payment id and move funds
  without it.
- `transfer` and `make_integrated_address` validate payment ids: hex, whole
  bytes, max 8 bytes, non-zero (zero means "no payment id" on-chain).
- `get_pool_info` now reports actual pool contents (id, size, fee per tx,
  up to 20 shown) plus pending alias registrations; it previously parsed
  response fields that never existed.

### Fixed
- `get_network_info` printed `Difficulty: undefined` — reads
  `pow_difficulty` now.
- RPC responses are parsed losslessly: uint64 values above 2^53 (e.g.
  balances over ~9,007 ZANO in atomic units) were silently rounded by native
  JSON parsing and could display slightly wrong amounts.

### Added
- Test suite for payment-id conversion, lossless JSON decoding, and the
  transfer guard rails; `npm test` script and a CI test workflow.
