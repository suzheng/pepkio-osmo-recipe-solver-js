// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  isLocalUrl,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError } from "../src/types.js";

const mockManifest = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "Osmo Recipe Solver",
  description: "Multi-solute osmolarity calculator with real osmotic coefficients",
  examples: [
    {
      name: "pbs_standard",
      description: "Standard 1X PBS buffer",
      input: {
        tab: "calculator",
        solutes: [
          { id: "r1", solute_id: "nacl", concentration: 137, unit: "mM" },
          { id: "r2", solute_id: "kcl", concentration: 2.7, unit: "mM" },
          { id: "r3", solute_id: "na2hpo4", concentration: 10, unit: "mM" },
          { id: "r4", solute_id: "kh2po4", concentration: 1.8, unit: "mM" },
        ],
      },
      output: {
        calculator: {
          total_osmolarity_mOsm_L: 291,
        },
      },
    },
    {
      name: "glucose_g_per_L",
      description: "Glucose in g/L unit",
      input: {
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "glucose", concentration: 5, unit: "g/L" }],
      },
      output: {
        calculator: {
          total_osmolarity_mOsm_L: 27.8,
        },
      },
    },
    {
      name: "dilute_to_target",
      description: "Dilution solver example",
      input: {
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "nacl", concentration: 150, unit: "mM" }],
        target_osmolarity_mOsm_L: 250,
      },
      output: {
        calculator: {
          adjustment: { mode: "dilute" },
        },
      },
    },
    {
      name: "solute_library",
      description: "Solute reference library query",
      input: {
        tab: "library",
      },
      output: {
        library: {
          solutes: [{ id: "nacl" }],
        },
      },
    },
  ],
};

const mockRunResponse = {
  run_id: "test-run-osmo-123",
  status: "completed",
  result: {
    tab: "calculator",
    calculator: {
      total_osmolarity_mOsm_L: 292.8,
      tonicity: "isotonic",
      tonicity_label: "Isotonic (270–310 mOsm/L)",
      reference_range_mOsm_L: { min: 270, max: 310, label: "Physiological" },
      contributions: [
        {
          id: "r1",
          name: "NaCl",
          input_concentration: 137,
          unit: "mM",
          concentration_mM: 137,
          phi: 0.9324,
          n: 2,
          contribution_mOsm_L: 255.5,
          is_custom: false,
          warnings: [],
        },
      ],
      breakdown_steps: ["NaCl: 137 mM → 255.5 mOsm/L", "Total = 292.8 mOsm/L"],
    },
  },
  error: null,
  duration_ms: 2,
  result_url: "https://tools.pepkio.com/api/tools/v1/runs/test-run-osmo-123",
  permalink: "https://tools.pepkio.com/r/test-run-osmo-123",
};

describe("config helpers", () => {
  it("resolves default baseUrl as production", () => {
    expect(DEFAULT_API_BASE_URL).toBe("https://tools.pepkio.com");
    expect(resolveBaseUrl()).toBe("https://tools.pepkio.com");
  });

  it("resolves baseUrl override stripping trailing slash", () => {
    expect(resolveBaseUrl("https://tools.localtest.me/")).toBe("https://tools.localtest.me");
  });

  it("identifies local URLs", () => {
    expect(isLocalUrl("https://tools.localtest.me")).toBe(true);
    expect(isLocalUrl("http://localhost:3004")).toBe(true);
    expect(isLocalUrl("http://127.0.0.1:3004")).toBe(true);
    expect(isLocalUrl("https://tools.pepkio.com")).toBe(false);
  });

  it("resolves apiKey precedence", () => {
    expect(resolveApiKey("https://tools.pepkio.com", "custom-key")).toBe("custom-key");
  });
});

describe("schemas", () => {
  it("parses valid calculator input", () => {
    const input = parseRunInput({
      tab: "calculator",
      solutes: [{ id: "r1", solute_id: "nacl", concentration: 137, unit: "mM" }],
    });
    expect(input.tab).toBe("calculator");
    expect(input.solutes.length).toBe(1);
    expect(input.solutes[0].solute_id).toBe("nacl");
  });

  it("rejects invalid unit", () => {
    expect(() =>
      parseRunInput({
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "nacl", concentration: 137, unit: "invalid_unit" }],
      }),
    ).toThrow();
  });
});

describe("PepkioClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("initializes with default options", () => {
    const client = new PepkioClient();
    expect(client.getBaseUrl()).toBe("https://tools.pepkio.com");
  });

  it("initializes with custom baseUrl and apiKey", () => {
    const client = new PepkioClient({
      baseUrl: "https://tools.localtest.me",
      apiKey: "pk_test_123",
    });
    expect(client.getBaseUrl()).toBe("https://tools.localtest.me");
  });

  it("fetches manifest without requiring auth", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockManifest)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "" });
    const manifest = await client.getManifest();

    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/tools/osmo-recipe-solver/manifest");
    expect(init?.headers?.Authorization).toBeUndefined();

    // Cache hit test
    const cached = await client.getManifest();
    expect(cached).toBe(manifest);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Refresh option test
    await client.getManifest({ refresh: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("lists examples from manifest", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockManifest)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient();
    const examples = await client.getExamples();
    expect(examples.length).toBe(4);
    expect(examples[0].name).toBe("pbs_standard");
    expect(examples[0].description).toBe("Standard 1X PBS buffer");
  });

  it("retrieves example input", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockManifest)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient();
    const input = await client.getExampleInput("pbs_standard");
    expect(input.tab).toBe("calculator");
    expect(input.solutes.length).toBe(4);
  });

  it("throws on unknown example input", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockManifest)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient();
    await expect(client.getExampleInput("non_existent")).rejects.toThrow(
      'Example "non_existent" not found',
    );
  });

  it("requires api key to run", async () => {
    const client = new PepkioClient({ apiKey: "" });
    await expect(
      client.run({
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "nacl", concentration: 137, unit: "mM" }],
      }),
    ).rejects.toThrow(PepkioAPIError);
  });

  it("executes run successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockRunResponse)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    const result = await client.run(
      {
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "nacl", concentration: 137, unit: "mM" }],
      },
      { label: "test-run" },
    );

    expect(result.run_id).toBe("test-run-osmo-123");
    expect(result.status).toBe("completed");
    expect(result.result?.calculator?.total_osmolarity_mOsm_L).toBe(292.8);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/tools/osmo-recipe-solver/run");
    expect(init?.headers?.Authorization).toBe("Bearer pk_test_123");
    const sentBody = JSON.parse(init?.body);
    expect(sentBody.options.label).toBe("test-run");
  });

  it("executes calculate helper", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockRunResponse)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    const result = await client.calculate(
      [{ id: "r1", solute_id: "nacl", concentration: 137, unit: "mM" }],
      { targetOsmolarityMOsmL: 300, adjustSoluteId: "r1" },
    );

    expect(result.status).toBe("completed");
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1]?.body);
    expect(sentBody.input.tab).toBe("calculator");
    expect(sentBody.input.target_osmolarity_mOsm_L).toBe(300);
    expect(sentBody.input.adjust_solute_id).toBe("r1");
  });

  it("executes solveAdjustment helper", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockRunResponse)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    await client.solveAdjustment({
      solutes: [{ id: "r1", solute_id: "nacl", concentration: 150, unit: "mM" }],
      targetOsmolarityMOsmL: 250,
    });

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1]?.body);
    expect(sentBody.input.tab).toBe("calculator");
    expect(sentBody.input.target_osmolarity_mOsm_L).toBe(250);
  });

  it("executes getLibrary helper", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            run_id: "test-lib-123",
            status: "completed",
            result: { tab: "library", library: { solutes: [{ id: "nacl" }] } },
          }),
        ),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    const res = await client.getLibrary();
    expect(res.result?.library?.solutes.length).toBe(1);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1]?.body);
    expect(sentBody.input.tab).toBe("library");
  });

  it("fetches previous run with getRun", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockRunResponse)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    const result = await client.getRun("test-run-osmo-123");
    expect(result.run_id).toBe("test-run-osmo-123");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/runs/test-run-osmo-123");
  });

  it("waitForRun polls until completed", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              run_id: "poll-1",
              status: "running",
            }),
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              run_id: "poll-1",
              status: "completed",
              result: mockRunResponse.result,
            }),
          ),
      });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    const result = await client.waitForRun("poll-1", { intervalMs: 10, timeoutMs: 1000 });
    expect(result.status).toBe("completed");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("handles HTTP error response properly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () =>
        Promise.resolve(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid concentration value",
            },
          }),
        ),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    await expect(
      client.run({
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "nacl", concentration: 10, unit: "mM" }],
      }),
    ).rejects.toThrow("Invalid concentration value");
  });

  it("handles response body error field properly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            run_id: "run-failed",
            status: "failed",
            error: "Calculation computation failed",
          }),
        ),
    });
    vi.stubGlobal("fetch", mockFetch);

    const client = new PepkioClient({ apiKey: "pk_test_123" });
    await expect(
      client.run({
        tab: "calculator",
        solutes: [{ id: "r1", solute_id: "nacl", concentration: 10, unit: "mM" }],
      }),
    ).rejects.toThrow("Calculation computation failed");
  });
});
