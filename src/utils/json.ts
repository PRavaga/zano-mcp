/**
 * Lossless JSON parsing for Zano RPC responses.
 *
 * Zano emits uint64 values as bare JSON integers (full range, up to
 * 18446744073709551615). Native JSON.parse rounds anything above
 * Number.MAX_SAFE_INTEGER (2^53 - 1), silently corrupting balances and
 * amounts. Before parsing, integer literals that would lose precision are
 * wrapped in quotes so they surface as decimal strings; downstream code
 * already converts amounts via BigInt(String(value)).
 */

const MAX_SAFE_DIGITS = "9007199254740991"; // Number.MAX_SAFE_INTEGER, 16 digits

function isUnsafeInteger(digits: string): boolean {
  if (digits.length < MAX_SAFE_DIGITS.length) return false;
  if (digits.length > MAX_SAFE_DIGITS.length) return true;
  return digits > MAX_SAFE_DIGITS; // equal length: lexicographic == numeric
}

/**
 * Quote integer literals above Number.MAX_SAFE_INTEGER in a JSON document.
 * String contents (including escapes) are never touched. Floats and
 * exponent-notation numbers are copied verbatim.
 */
export function quoteUnsafeIntegers(raw: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  while (i < raw.length) {
    const c = raw[i];
    if (inString) {
      out += c;
      if (c === "\\") {
        out += raw[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i++;
      continue;
    }
    if (c === "-" || (c >= "0" && c <= "9")) {
      let j = i;
      if (raw[j] === "-") j++;
      const digitsStart = j;
      while (j < raw.length && raw[j] >= "0" && raw[j] <= "9") j++;
      const digits = raw.slice(digitsStart, j);
      if (raw[j] === "." || raw[j] === "e" || raw[j] === "E") {
        // not a pure integer: copy the whole number token verbatim
        while (j < raw.length && /[0-9eE+.-]/.test(raw[j])) j++;
        out += raw.slice(i, j);
      } else if (isUnsafeInteger(digits)) {
        out += `"${raw.slice(i, j)}"`;
      } else {
        out += raw.slice(i, j);
      }
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function parseJsonLossless<T = unknown>(raw: string): T {
  return JSON.parse(quoteUnsafeIntegers(raw)) as T;
}
