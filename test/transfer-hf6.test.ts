import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WalletHandlers } from "../src/tools/wallet/handlers.js";
import type { WalletClient } from "../src/clients/wallet.js";
import type { DaemonClient } from "../src/clients/daemon.js";

type Call = { method: string; params: Record<string, unknown> };

function makeHandlers(opts: { walletSupportsUtxoStats: boolean }) {
  const calls: Call[] = [];
  const walletStub = {
    async call(method: string, params: Record<string, unknown> = {}) {
      calls.push({ method, params });
      if (method === "get_utxo_stats" && !opts.walletSupportsUtxoStats) {
        throw new Error("Wallet RPC error: Method not found (code: -32601)");
      }
      if (method === "transfer") {
        return { tx_hash: "deadbeef", tx_size: 1234 };
      }
      return {};
    },
  } as unknown as WalletClient;
  const daemonStub = { async call() { return {}; } } as unknown as DaemonClient;
  return { handlers: new WalletHandlers(walletStub, daemonStub), calls };
}

function resultText(res: { content: Array<{ type: "text"; text: string }> }): string {
  return res.content.map((c) => c.text).join("\n");
}

describe("transfer with HF6 payment ids", () => {
  it("sends the pid as a decimal string on destinations[0].payment_id", async () => {
    const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: true });
    const res = await handlers.transfer({ address: "ZxAddr", amount: "1", payment_id: "41" });
    const transfer = calls.find((c) => c.method === "transfer");
    assert.ok(transfer, "transfer RPC was sent");
    const dest = (transfer.params.destinations as Array<Record<string, unknown>>)[0];
    assert.equal(dest.payment_id, "4683743612465315840");
    assert.equal(typeof dest.payment_id, "string");
    assert.ok(!("payment_id" in transfer.params), "no tx-wide payment_id param");
    assert.match(resultText(res), /canonical 8-byte form: 0000000000000041/);
  });

  it("probes get_utxo_stats before the first pid-bearing transfer", async () => {
    const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: true });
    await handlers.transfer({ address: "ZxAddr", amount: "1", payment_id: "ff" });
    assert.deepEqual(
      calls.map((c) => c.method),
      ["get_utxo_stats", "transfer"],
    );
    // probe result is cached: second pid transfer skips it
    await handlers.transfer({ address: "ZxAddr", amount: "1", payment_id: "ff" });
    assert.deepEqual(
      calls.map((c) => c.method),
      ["get_utxo_stats", "transfer", "transfer"],
    );
  });

  it("fails closed on wallets without 2.2.x RPC (no transfer sent)", async () => {
    const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: false });
    const res = await handlers.transfer({ address: "ZxAddr", amount: "1", payment_id: "41" });
    assert.match(resultText(res), /does not support HF6 intrinsic payment ids/);
    assert.ok(!calls.some((c) => c.method === "transfer"), "no transfer RPC sent");
  });

  it("rejects invalid and all-zero pids before any RPC", async () => {
    for (const pid of ["0000000000000000", "00", "zz", "123", "112233445566778899"]) {
      const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: true });
      const res = await handlers.transfer({ address: "ZxAddr", amount: "1", payment_id: pid });
      assert.match(resultText(res), /^Error:/);
      assert.equal(calls.length, 0, `no RPC sent for pid "${pid}"`);
    }
  });

  it("skips probe and pid entirely when payment_id is absent or empty", async () => {
    for (const pid of [undefined, ""]) {
      const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: false });
      await handlers.transfer({ address: "ZxAddr", amount: "1", payment_id: pid });
      const transfer = calls.find((c) => c.method === "transfer");
      assert.ok(transfer, "transfer RPC was sent");
      const dest = (transfer.params.destinations as Array<Record<string, unknown>>)[0];
      assert.ok(!("payment_id" in dest), "no payment_id on destination");
      assert.ok(!calls.some((c) => c.method === "get_utxo_stats"), "no probe");
    }
  });
});

describe("make_integrated_address pid validation", () => {
  it("rejects all-zero and oversized pids before any RPC", async () => {
    for (const pid of ["0000000000000000", "112233445566778899"]) {
      const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: true });
      const res = await handlers.makeIntegratedAddress({ payment_id: pid });
      assert.match(resultText(res), /^Error:/);
      assert.equal(calls.length, 0);
    }
  });

  it("omits the param entirely for empty input (wallet generates random pid)", async () => {
    const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: true });
    await handlers.makeIntegratedAddress({ payment_id: "" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "make_integrated_address");
    assert.ok(!("payment_id" in calls[0].params));
  });

  it("passes a valid pid through as hex", async () => {
    const { handlers, calls } = makeHandlers({ walletSupportsUtxoStats: true });
    await handlers.makeIntegratedAddress({ payment_id: "1dfe5a88ff9effb3" });
    assert.equal(calls[0].params.payment_id, "1dfe5a88ff9effb3");
  });
});
