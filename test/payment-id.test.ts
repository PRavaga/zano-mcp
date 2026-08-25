import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalPaymentIdHex,
  normalizeOptionalHex,
  paymentIdHexToUint64,
} from "../src/utils/payment-id.js";

describe("paymentIdHexToUint64", () => {
  // Vectors replicate currency::convert_payment_id (Zano 2.2.1.502):
  // left zero-pad to 8 bytes, little-endian read -> pid bytes in high positions.
  it('converts "41" to 0x4100000000000000', () => {
    assert.equal(paymentIdHexToUint64("41"), 4683743612465315840n);
  });

  it('converts "1dfe5a88ff9effb3" (8 bytes, no padding) little-endian', () => {
    assert.equal(paymentIdHexToUint64("1dfe5a88ff9effb3"), 0xb3ff9eff885afe1dn);
  });

  it('converts "ff" above INT64_MAX (sign-bit range)', () => {
    assert.equal(paymentIdHexToUint64("ff"), 0xff00000000000000n);
    assert.ok(paymentIdHexToUint64("ff") > 2n ** 63n - 1n);
  });

  it('converts "00000000000000ff" the same as "ff"', () => {
    assert.equal(
      paymentIdHexToUint64("00000000000000ff"),
      paymentIdHexToUint64("ff"),
    );
  });

  it('converts "ffffffffffffffff" to UINT64_MAX', () => {
    assert.equal(paymentIdHexToUint64("ffffffffffffffff"), 18446744073709551615n);
  });

  it("accepts uppercase hex", () => {
    assert.equal(paymentIdHexToUint64("FF"), 0xff00000000000000n);
  });

  it("rejects all-zero payment ids (protocol sentinel for 'no pid')", () => {
    for (const zero of ["00", "0000", "0000000000000000"]) {
      assert.throws(() => paymentIdHexToUint64(zero), /All-zero payment ID/);
    }
  });

  it("rejects odd-length hex", () => {
    assert.throws(() => paymentIdHexToUint64("123"), /even number of hex/);
  });

  it("rejects non-hex input", () => {
    assert.throws(() => paymentIdHexToUint64("zz"), /hex string expected/);
    assert.throws(() => paymentIdHexToUint64("12 34"), /hex string expected/);
  });

  it("rejects more than 8 bytes", () => {
    assert.throws(() => paymentIdHexToUint64("112233445566778899"), /too long/);
    assert.throws(
      () => paymentIdHexToUint64("00112233445566778899aabbccddeeff"),
      /too long/,
    );
  });
});

describe("canonicalPaymentIdHex", () => {
  it("renders the 8 little-endian bytes the recipient wallet reports", () => {
    assert.equal(canonicalPaymentIdHex(paymentIdHexToUint64("41")), "0000000000000041");
    assert.equal(
      canonicalPaymentIdHex(paymentIdHexToUint64("1dfe5a88ff9effb3")),
      "1dfe5a88ff9effb3",
    );
    assert.equal(
      canonicalPaymentIdHex(paymentIdHexToUint64("ffffffffffffffff")),
      "ffffffffffffffff",
    );
  });
});

describe("normalizeOptionalHex", () => {
  it("treats empty and whitespace-only strings as absent", () => {
    assert.equal(normalizeOptionalHex(""), undefined);
    assert.equal(normalizeOptionalHex("   "), undefined);
    assert.equal(normalizeOptionalHex(undefined), undefined);
  });

  it("passes non-empty values through trimmed", () => {
    assert.equal(normalizeOptionalHex(" 41 "), "41");
  });
});
