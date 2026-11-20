// SPDX-License-Identifier: MIT
import {
  TOOL_ID,
  apiPath,
  resolveApiKey,
  resolveBaseUrl,
} from "./config.js";
import {
  parseRunInput,
  type OsmoRecipeSolverInput,
  type SoluteInput,
} from "./schemas.js";
import {
  PepkioAPIError,
  type ExampleMeta,
  type OsmoRecipeSolverResult,
  type RunOptions,
  type RunResult,
  type ToolManifest,
} from "./types.js";

export interface PepkioClientOptions {
  apiKey?: string;
  baseUrl?: string;
}

export interface CalculateOptions {
  targetOsmolarityMOsmL?: number;
  adjustSoluteId?: string;
  tonicityReferenceId?: string;
  presetId?: string;
}

export interface SolveAdjustmentOptions {
  solutes: SoluteInput[];
  targetOsmolarityMOsmL: number;
  adjustSoluteId?: string;
  tonicityReferenceId?: string;
}

export class PepkioClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private manifestCache: ToolManifest | undefined;

  constructor(opts: PepkioClientOptions = {}) {
    this.baseUrl = resolveBaseUrl(opts.baseUrl);
    this.apiKey = resolveApiKey(this.baseUrl, opts.apiKey);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getManifest(opts: { refresh?: boolean } = {}): Promise<ToolManifest> {
    if (this.manifestCache && !opts.refresh) {
      return this.manifestCache;
    }
    const manifest = await this.request<ToolManifest>(
      "GET",
      `/tools/${TOOL_ID}/manifest`,
      undefined,
      { requireAuth: false },
    );
    this.manifestCache = manifest;
    return manifest;
  }

  listExamples(manifest?: ToolManifest): ExampleMeta[] {
    const m = manifest ?? this.manifestCache;
    if (!m?.examples) {
      return [];
    }
    return m.examples.map((e) => ({
      name: e.name,
      description: e.description,
    }));
  }

  async getExamples(manifest?: ToolManifest): Promise<ExampleMeta[]> {
    const m = manifest ?? (await this.getManifest());
    return this.listExamples(m);
  }

  async getExampleInput(
    name: string,
    manifest?: ToolManifest,
  ): Promise<OsmoRecipeSolverInput> {
    const m = manifest ?? (await this.getManifest());
    const example = m.examples?.find((e) => e.name === name);
    if (!example) {
      const available = m.examples?.map((e) => e.name).join(", ") ?? "(none)";
      throw new Error(`Example "${name}" not found. Available: ${available}`);
    }
    return parseRunInput(example.input);
  }

  async run(
    input: OsmoRecipeSolverInput,
    options?: RunOptions,
  ): Promise<RunResult<OsmoRecipeSolverResult>> {
    const validated = parseRunInput(input);
    return this.request<RunResult<OsmoRecipeSolverResult>>(
      "POST",
      `/tools/${TOOL_ID}/run`,
      { input: validated, options: options ?? {} },
      { requireAuth: true },
    );
  }

  /**
   * Convenience helper to calculate multi-solute osmolarity.
   */
  async calculate(
    solutes: SoluteInput[],
    opts: CalculateOptions = {},
    options?: RunOptions,
  ): Promise<RunResult<OsmoRecipeSolverResult>> {
    const input: OsmoRecipeSolverInput = {
      tab: "calculator",
      solutes,
    };
    if (opts.presetId !== undefined) input.preset_id = opts.presetId;
    if (opts.targetOsmolarityMOsmL !== undefined) {
      input.target_osmolarity_mOsm_L = opts.targetOsmolarityMOsmL;
    }
    if (opts.adjustSoluteId !== undefined) {
      input.adjust_solute_id = opts.adjustSoluteId;
    }
    if (opts.tonicityReferenceId !== undefined) {
      input.tonicity_reference_id = opts.tonicityReferenceId;
    }
    return this.run(input, options);
  }

  /**
   * Convenience helper to solve solute addition or dilution to reach a target osmolarity.
   */
  async solveAdjustment(
    params: SolveAdjustmentOptions,
    options?: RunOptions,
  ): Promise<RunResult<OsmoRecipeSolverResult>> {
    const input: OsmoRecipeSolverInput = {
      tab: "calculator",
      solutes: params.solutes,
      target_osmolarity_mOsm_L: params.targetOsmolarityMOsmL,
    };
    if (params.adjustSoluteId !== undefined) {
      input.adjust_solute_id = params.adjustSoluteId;
    }
    if (params.tonicityReferenceId !== undefined) {
      input.tonicity_reference_id = params.tonicityReferenceId;
    }
    return this.run(input, options);
  }

  /**
   * Convenience helper to query the solute library (osmotic coefficients, n, MW).
   */
  async getLibrary(options?: RunOptions): Promise<RunResult<OsmoRecipeSolverResult>> {
    const input: OsmoRecipeSolverInput = {
      tab: "library",
      solutes: [],
    };
    return this.run(input, options);
  }

  async getRun(runId: string): Promise<RunResult<OsmoRecipeSolverResult>> {
    return this.request<RunResult<OsmoRecipeSolverResult>>(
      "GET",
      `/runs/${runId}`,
      undefined,
      { requireAuth: true },
    );
  }

  async waitForRun(
    runId: string,
    opts: { intervalMs?: number; timeoutMs?: number } = {},
  ): Promise<RunResult<OsmoRecipeSolverResult>> {
    const intervalMs = opts.intervalMs ?? 1000;
    const timeoutMs = opts.timeoutMs ?? 30_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getRun(runId);
      if (result.status === "completed" || result.status === "failed") {
        if (result.error) {
          const errMsg =
            typeof result.error === "string"
              ? result.error
              : typeof result.error === "object" &&
                  result.error !== null &&
                  "message" in result.error
                ? (result.error as { message: string }).message
                : JSON.stringify(result.error);
          throw new PepkioAPIError(errMsg, {
            status: 200,
            body: result,
            runId,
          });
        }
        return result;
      }
      await sleep(intervalMs);
    }

    throw new PepkioAPIError(`Timed out waiting for run ${runId}`, {
      status: 408,
      runId,
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    opts: { requireAuth?: boolean } = {},
  ): Promise<T> {
    const requireAuth = opts.requireAuth ?? false;
    if (requireAuth && !this.apiKey) {
      throw new PepkioAPIError(
        "API key required. Set PEPKIO_API_KEY (or LOCAL_PEPKIO_API_KEY for local dev).",
        { status: 401 },
      );
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const url = apiPath(this.baseUrl, path);
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let parsed: unknown;
    const text = await response.text();
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      let message = `HTTP ${response.status}: ${response.statusText}`;
      let code: string | undefined;
      if (typeof parsed === "object" && parsed !== null && "error" in parsed) {
        const errVal = (parsed as { error: unknown }).error;
        if (typeof errVal === "string") {
          message = errVal;
        } else if (typeof errVal === "object" && errVal !== null) {
          if (
            "message" in errVal &&
            typeof (errVal as { message: unknown }).message === "string"
          ) {
            message = (errVal as { message: string }).message;
          }
          if (
            "code" in errVal &&
            typeof (errVal as { code: unknown }).code === "string"
          ) {
            code = (errVal as { code: string }).code;
          }
        }
      }
      throw new PepkioAPIError(message, {
        status: response.status,
        body: parsed,
        code,
      });
    }

    const runResult = parsed as RunResult<OsmoRecipeSolverResult>;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      runResult.error
    ) {
      const errMsg =
        typeof runResult.error === "string"
          ? runResult.error
          : typeof runResult.error === "object" &&
              runResult.error !== null &&
              "message" in runResult.error
            ? (runResult.error as { message: string }).message
            : JSON.stringify(runResult.error);
      throw new PepkioAPIError(errMsg, {
        status: response.status,
        body: parsed,
        runId: runResult.run_id,
      });
    }

    return parsed as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
