import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertLocalWalletUrl, loadConfig, parseCliArgs } from "../src/config.js";

describe("assertLocalWalletUrl", () => {
  // Should accept
  it("accepts http://127.0.0.1:12111/json_rpc", () => {
    assert.doesNotThrow(() => assertLocalWalletUrl("http://127.0.0.1:12111/json_rpc"));
  });

  it("accepts http://localhost:12111/json_rpc", () => {
    assert.doesNotThrow(() => assertLocalWalletUrl("http://localhost:12111/json_rpc"));
  });

  it("accepts http://[::1]:12111/json_rpc", () => {
    assert.doesNotThrow(() => assertLocalWalletUrl("http://[::1]:12111/json_rpc"));
  });

  it("accepts https://127.0.0.1:12111/json_rpc", () => {
    assert.doesNotThrow(() => assertLocalWalletUrl("https://127.0.0.1:12111/json_rpc"));
  });

  it("accepts http://127.0.0.1:11212/json_rpc (default port)", () => {
    assert.doesNotThrow(() => assertLocalWalletUrl("http://127.0.0.1:11212/json_rpc"));
  });

  // Should reject
  it("rejects http://192.168.1.10:12111/json_rpc (LAN)", () => {
    assert.throws(
      () => assertLocalWalletUrl("http://192.168.1.10:12111/json_rpc"),
      { message: /Refusing non-local wallet RPC host/ },
    );
  });

  it("rejects http://wallet.internal:12111/json_rpc (hostname)", () => {
    assert.throws(
      () => assertLocalWalletUrl("http://wallet.internal:12111/json_rpc"),
      { message: /Refusing non-local wallet RPC host/ },
    );
  });

  it("rejects http://10.0.0.5:12111/json_rpc (private IP)", () => {
    assert.throws(
      () => assertLocalWalletUrl("http://10.0.0.5:12111/json_rpc"),
      { message: /Refusing non-local wallet RPC host/ },
    );
  });

  it("rejects http://example.com:12111/json_rpc (public)", () => {
    assert.throws(
      () => assertLocalWalletUrl("http://example.com:12111/json_rpc"),
      { message: /Refusing non-local wallet RPC host/ },
    );
  });

  it("rejects http://37.27.100.59:10500/json_rpc (public node)", () => {
    assert.throws(
      () => assertLocalWalletUrl("http://37.27.100.59:10500/json_rpc"),
      { message: /Refusing non-local wallet RPC host/ },
    );
  });

  it("rejects ftp://127.0.0.1:12111/json_rpc (bad protocol)", () => {
    assert.throws(
      () => assertLocalWalletUrl("ftp://127.0.0.1:12111/json_rpc"),
      { message: /unsupported protocol/ },
    );
  });

  it("rejects invalid URL", () => {
    assert.throws(
      () => assertLocalWalletUrl("not-a-url"),
      { message: /not a valid URL/ },
    );
  });
});

describe("loadConfig", () => {
  // Save and restore env vars
  const savedEnv: Record<string, string | undefined> = {};
  const envKeys = [
    "ZANO_DAEMON_URL", "ZANO_WALLET_URL", "ZANO_WALLET_AUTH",
    "ZANO_TRADE_URL", "ZANO_TRADE_TOKEN", "ZANO_NETWORK",
    "ZANO_LOG_LEVEL", "ZANO_ENABLE_WRITE_TOOLS",
  ];

  function clearEnv() {
    for (const k of envKeys) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  }

  function restoreEnv() {
    for (const k of envKeys) {
      if (savedEnv[k] !== undefined) {
        process.env[k] = savedEnv[k];
      } else {
        delete process.env[k];
      }
    }
  }

  it("enableWriteTools defaults to false", () => {
    clearEnv();
    try {
      const config = loadConfig({});
      assert.equal(config.enableWriteTools, false);
    } finally {
      restoreEnv();
    }
  });

  it("enableWriteTools=true via env var", () => {
    clearEnv();
    process.env.ZANO_ENABLE_WRITE_TOOLS = "true";
    try {
      const config = loadConfig({});
      assert.equal(config.enableWriteTools, true);
    } finally {
      restoreEnv();
    }
  });

  it("enableWriteTools=true via CLI arg", () => {
    clearEnv();
    try {
      const config = loadConfig({ "enable-write-tools": "true" });
      assert.equal(config.enableWriteTools, true);
    } finally {
      restoreEnv();
    }
  });

  it("enableWriteTools stays false for random string", () => {
    clearEnv();
    process.env.ZANO_ENABLE_WRITE_TOOLS = "yes";
    try {
      const config = loadConfig({});
      assert.equal(config.enableWriteTools, false);
    } finally {
      restoreEnv();
    }
  });

  it("rejects non-local wallet URL", () => {
    clearEnv();
    process.env.ZANO_WALLET_URL = "http://192.168.1.10:12111/json_rpc";
    try {
      assert.throws(
        () => loadConfig({}),
        { message: /Refusing non-local wallet RPC host/ },
      );
    } finally {
      restoreEnv();
    }
  });

  it("accepts local wallet URL", () => {
    clearEnv();
    process.env.ZANO_WALLET_URL = "http://127.0.0.1:11212/json_rpc";
    try {
      const config = loadConfig({});
      assert.equal(config.walletUrl, "http://127.0.0.1:11212/json_rpc");
    } finally {
      restoreEnv();
    }
  });

  it("works without wallet URL (read-only mode)", () => {
    clearEnv();
    try {
      const config = loadConfig({});
      assert.equal(config.walletUrl, undefined);
    } finally {
      restoreEnv();
    }
  });
});

describe("parseCliArgs", () => {
  it("parses --enable-write-tools true", () => {
    const args = parseCliArgs(["--enable-write-tools", "true"]);
    assert.equal(args["enable-write-tools"], "true");
  });

  it("parses multiple args", () => {
    const args = parseCliArgs([
      "--daemon-url", "http://127.0.0.1:11211/json_rpc",
      "--enable-write-tools", "true",
    ]);
    assert.equal(args["daemon-url"], "http://127.0.0.1:11211/json_rpc");
    assert.equal(args["enable-write-tools"], "true");
  });
});
