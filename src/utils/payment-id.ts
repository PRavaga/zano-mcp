/**
 * HF6 intrinsic payment id handling.
 *
 * Since Zano HF6, payment ids are per-destination uint64 values
 * (destinations[].payment_id) instead of a tx-wide field. The conversion
 * from the conventional hex form must replicate currency::convert_payment_id
 * (currency_format_utils.cpp): left zero-pad the decoded bytes to 8, then
 * read the buffer as a little-endian uint64 — so the pid bytes end up in the
 * most-significant positions ("41" -> 0x4100000000000000).
 */

export const HF6_PAYMENT_ID_MAX_BYTES = 8;

/** Empty or whitespace-only input means "no payment id". */
export function normalizeOptionalHex(input?: string): string | undefined {
  const v = input?.trim();
  return v ? v : undefined;
}

export function paymentIdHexToUint64(hex: string): bigint {
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`Invalid payment ID "${hex}": hex string expected`);
  }
  if (hex.length % 2 !== 0) {
    throw new Error(
      `Invalid payment ID "${hex}": even number of hex characters expected (whole bytes)`,
    );
  }
  if (hex.length > HF6_PAYMENT_ID_MAX_BYTES * 2) {
    throw new Error(
      `Payment ID "${hex}" is too long: maximum is ${HF6_PAYMENT_ID_MAX_BYTES} bytes (${HF6_PAYMENT_ID_MAX_BYTES * 2} hex characters) since HF6`,
    );
  }
  const bytes = Buffer.from(hex, "hex");
  const offset = HF6_PAYMENT_ID_MAX_BYTES - bytes.length;
  let value = 0n;
  for (let k = 0; k < bytes.length; k++) {
    value |= BigInt(bytes[k]) << BigInt(8 * (offset + k));
  }
  if (value === 0n) {
    throw new Error(
      `All-zero payment ID "${hex}" is not allowed: zero means "no payment id" on-chain and the wallet would silently send without one. Use a non-zero payment ID or omit it.`,
    );
  }
  return value;
}

/**
 * The 8-byte hex form the recipient's wallet reports for an intrinsic pid
 * (append_pod_to_strbuff: all 8 uint64 bytes in little-endian order).
 */
export function canonicalPaymentIdHex(value: bigint): string {
  const bytes = Buffer.alloc(HF6_PAYMENT_ID_MAX_BYTES);
  for (let k = 0; k < HF6_PAYMENT_ID_MAX_BYTES; k++) {
    bytes[k] = Number((value >> BigInt(8 * k)) & 0xffn);
  }
  return bytes.toString("hex");
}
