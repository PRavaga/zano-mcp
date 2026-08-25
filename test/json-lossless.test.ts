import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseJsonLossless, quoteUnsafeIntegers } from "../src/utils/json.js";

describe("quoteUnsafeIntegers", () => {
  it("leaves safe integers untouched", () => {
    const raw = '{"a":123,"b":9007199254740991,"c":0}';
    assert.equal(quoteUnsafeIntegers(raw), raw);
  });

  it("quotes integers above Number.MAX_SAFE_INTEGER", () => {
    assert.equal(
      quoteUnsafeIntegers('{"a":9007199254740993}'),
      '{"a":"9007199254740993"}',
    );
    assert.equal(
      quoteUnsafeIntegers('{"a":18446744073709551615}'),
      '{"a":"18446744073709551615"}',
    );
  });

  it("handles the 16-digit boundary exactly", () => {
    assert.equal(
      quoteUnsafeIntegers('{"a":9007199254740991,"b":9007199254740992}'),
      '{"a":9007199254740991,"b":"9007199254740992"}',
    );
  });

  it("never touches digit runs inside strings", () => {
    const raw = '{"comment":"pid 18446744073709551615 here","x":1}';
    assert.equal(quoteUnsafeIntegers(raw), raw);
  });

  it("handles escaped quotes inside strings", () => {
    const raw = '{"s":"say \\"18446744073709551615\\" ok","n":18446744073709551615}';
    assert.equal(
      quoteUnsafeIntegers(raw),
      '{"s":"say \\"18446744073709551615\\" ok","n":"18446744073709551615"}',
    );
  });

  it("copies floats and exponent notation verbatim", () => {
    const raw = '{"f":12345678901234567.5,"e":1.2e20,"g":123456789012345678e2}';
    assert.equal(quoteUnsafeIntegers(raw), raw);
  });

  it("quotes unsafe negative integers", () => {
    assert.equal(
      quoteUnsafeIntegers('{"a":-9007199254740993}'),
      '{"a":"-9007199254740993"}',
    );
    assert.equal(
      quoteUnsafeIntegers('{"a":-9007199254740991}'),
      '{"a":-9007199254740991}',
    );
  });

  it("handles integers in arrays and nested objects", () => {
    assert.equal(
      quoteUnsafeIntegers('{"a":[18446744073709551615,{"b":18446744073709551615}]}'),
      '{"a":["18446744073709551615",{"b":"18446744073709551615"}]}',
    );
  });
});

describe("parseJsonLossless", () => {
  it("round-trips uint64 values as exact decimal strings", () => {
    const parsed = parseJsonLossless<{ balance: string; small: number }>(
      '{"balance":18446744073709551615,"small":42}',
    );
    assert.equal(parsed.balance, "18446744073709551615");
    assert.equal(BigInt(parsed.balance), 18446744073709551615n);
    assert.equal(parsed.small, 42);
  });

  it("keeps existing BigInt(String(x)) call sites working", () => {
    const parsed = parseJsonLossless<{ balance: unknown }>(
      '{"balance":9007199254740993}',
    );
    assert.equal(BigInt(String(parsed.balance)), 9007199254740993n);
  });
});
