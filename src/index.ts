// SPDX-License-Identifier: MIT

export { PepkioClient } from "./client.js";
export type {
  CalculateOptions,
  PepkioClientOptions,
  SolveAdjustmentOptions,
} from "./client.js";
export {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  isLocalUrl,
  resolveApiKey,
  resolveBaseUrl,
} from "./config.js";
export {
  concUnitSchema,
  osmoRecipeSolverInputSchema,
  parseRunInput,
  soluteInputSchema,
  tabSchema,
  tonicityClassSchema,
} from "./schemas.js";
export type {
  ConcUnit,
  OsmoRecipeSolverInput,
  SoluteInput,
  Tab,
  TonicityClass,
} from "./schemas.js";
export { PepkioAPIError } from "./types.js";
export type {
  AdjustmentResult,
  CalculatorResult,
  ExampleMeta,
  ManifestExample,
  OsmoRecipeSolverResult,
  ReferenceRange,
  RunOptions,
  RunResult,
  RunStatus,
  SoluteContribution,
  SoluteLibraryEntry,
  ToolManifest,
} from "./types.js";
