// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { PepkioClient } from "../src/client.js";
import { TOOL_ID } from "../src/config.js";

const LOCAL_BASE_URL = "https://tools.localtest.me";
const PRODUCTION_BASE_URL = "https://tools.pepkio.com";

function envConfig(env: "local" | "production") {
  const baseUrl = process.env.PEPKIO_API_BASE_URL
    ? process.env.PEPKIO_API_BASE_URL.replace(/\/$/, "")
    : env === "local"
      ? LOCAL_BASE_URL
      : PRODUCTION_BASE_URL;

  const isLocal = baseUrl.includes("localtest.me") || baseUrl.includes("localhost");
  const apiKey = isLocal
    ? process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY
    : process.env.PEPKIO_API_KEY;

  return { baseUrl, apiKey, isLocal };
}

describe("integration: local", () => {
  const { baseUrl, apiKey } = envConfig("local");

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("Osmo Recipe Solver");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("pbs_standard");
      expect(names).toContain("glucose_g_per_L");
      expect(names).toContain("dilute_to_target");
      expect(names).toContain("solute_library");
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs pbs_standard",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("pbs_standard");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.tab).toBe("calculator");
      expect(result.result?.calculator?.total_osmolarity_mOsm_L).toBeGreaterThan(280);
      expect(result.result?.calculator?.total_osmolarity_mOsm_L).toBeLessThan(310);
      expect(result.result?.calculator?.tonicity).toBe("isotonic");
      expect(result.result?.calculator?.contributions.length).toBe(4);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs glucose_g_per_L",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("glucose_g_per_L");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.calculator?.contributions.length).toBe(1);
      expect(result.result?.calculator?.contributions[0].name).toBe("Glucose");
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs dilute_to_target",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("dilute_to_target");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result?.calculator?.adjustment).toBeDefined();
      expect(result.result?.calculator?.adjustment?.mode).toBe("dilute");
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs solute_library",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("solute_library");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result?.tab).toBe("library");
      expect(result.result?.library?.solutes.length).toBeGreaterThan(0);
      const nacl = result.result?.library?.solutes.find((s) => s.id === "nacl");
      expect(nacl).toBeDefined();
    },
    60_000,
  );
});

describe("integration: production", () => {
  const { baseUrl, apiKey } = envConfig("production");

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("Osmo Recipe Solver");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("pbs_standard");
      expect(names).toContain("glucose_g_per_L");
      expect(names).toContain("dilute_to_target");
      expect(names).toContain("solute_library");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs pbs_standard",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("pbs_standard");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.tab).toBe("calculator");
      expect(result.result?.calculator?.total_osmolarity_mOsm_L).toBeGreaterThan(280);
      expect(result.result?.calculator?.total_osmolarity_mOsm_L).toBeLessThan(310);
      expect(result.result?.calculator?.tonicity).toBe("isotonic");
      expect(result.result?.calculator?.contributions.length).toBe(4);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs glucose_g_per_L",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("glucose_g_per_L");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.calculator?.contributions.length).toBe(1);
      expect(result.result?.calculator?.contributions[0].name).toBe("Glucose");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs dilute_to_target",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("dilute_to_target");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result?.calculator?.adjustment).toBeDefined();
      expect(result.result?.calculator?.adjustment?.mode).toBe("dilute");
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs solute_library",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("solute_library");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result?.tab).toBe("library");
      expect(result.result?.library?.solutes.length).toBeGreaterThan(0);
      const nacl = result.result?.library?.solutes.find((s) => s.id === "nacl");
      expect(nacl).toBeDefined();
    },
    60_000,
  );
});
