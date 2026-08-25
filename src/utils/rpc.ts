/**
 * Zano daemon RPCs report many failures ("not found", "invalid address")
 * inside a successful JSON-RPC envelope, as result.status != "OK" with an
 * optional result.status_error / result.error_code. Handlers that format
 * such responses must check the status first or they render empty fields
 * as a successful result.
 */
export function assertRpcStatusOk(
  res: Record<string, unknown> | null | undefined,
  method: string,
): void {
  const status = res?.status;
  if (typeof status === "string" && status !== "OK") {
    const detail = res?.status_error || res?.error_code;
    throw new Error(
      `${method} returned status ${status}${detail ? `: ${String(detail)}` : ""}`,
    );
  }
}
