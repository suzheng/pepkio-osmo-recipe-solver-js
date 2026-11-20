// SPDX-License-Identifier: MIT
import type {
  ConcUnit,
  OsmoRecipeSolverInput,
  SoluteInput,
  Tab,
  TonicityClass,
} from "./schemas.js";

export type {
  ConcUnit,
  OsmoRecipeSolverInput,
  SoluteInput,
  Tab,
  TonicityClass,
};

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export interface SoluteContribution {
  id: string;
  name: string;
  input_concentration: number;
  unit: ConcUnit;
  concentration_mM: number;
  phi: number;
  n: number;
  contribution_mOsm_L: number;
  is_custom: boolean;
  warnings: string[];
}

export type AdjustmentResult =
  | {
      mode: "add_solute";
      solute_name: string;
      delta_concentration_mM: number;
      new_concentration_mM: number;
      new_concentration_in_unit: number;
      unit: ConcUnit;
    }
  | {
      mode: "dilute";
      water_volume_mL_per_L: number;
      dilution_factor: number;
    };

export interface ReferenceRange {
  min: number;
  max: number;
  label: string;
}

export interface CalculatorResult {
  total_osmolarity_mOsm_L: number;
  tonicity: TonicityClass;
  tonicity_label: string;
  reference_range_mOsm_L: ReferenceRange;
  contributions: SoluteContribution[];
  breakdown_steps: string[];
  adjustment?: AdjustmentResult;
  adjustment_error?: string;
}

export interface SoluteLibraryEntry {
  id: string;
  name: string;
  mw_g_per_mol: number;
  phi: number;
  phi_reference_mM: number;
  n: number;
  source: string;
  aliases: string[];
}

export interface OsmoRecipeSolverResult {
  tab: string;
  calculator?: CalculatorResult;
  library?: {
    solutes: SoluteLibraryEntry[];
  };
  warnings?: Array<{ field?: string; message: string; level?: string }>;
  error?: string;
}

export interface RunResult<T = OsmoRecipeSolverResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { code?: string; message: string; details?: unknown } | null;
  duration_ms?: number;
  result_url?: string;
  permalink?: string;
}

export class PepkioAPIError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly runId?: string;
  readonly body?: unknown;

  constructor(
    message: string,
    opts: {
      status?: number;
      code?: string;
      runId?: string;
      body?: unknown;
    } = {},
  ) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.code = opts.code;
    this.runId = opts.runId;
    this.body = opts.body;
  }
}
