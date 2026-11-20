// SPDX-License-Identifier: MIT
import { z } from "zod";

export const concUnitSchema = z.enum(["mM", "M", "g/L", "% w/v"]);
export type ConcUnit = z.infer<typeof concUnitSchema>;

export const soluteInputSchema = z
  .object({
    id: z.string(),
    solute_id: z.string(),
    custom_name: z.string().optional(),
    concentration: z.number(),
    unit: concUnitSchema,
    phi_override: z.number().positive().optional(),
    n_override: z.number().positive().optional(),
  })
  .passthrough();
export type SoluteInput = z.infer<typeof soluteInputSchema>;

export const tabSchema = z.enum(["calculator", "library", "reconciliation"]);
export type Tab = z.infer<typeof tabSchema>;

export const tonicityClassSchema = z.enum(["hypotonic", "isotonic", "hypertonic"]);
export type TonicityClass = z.infer<typeof tonicityClassSchema>;

export const osmoRecipeSolverInputSchema = z
  .object({
    tab: tabSchema.default("calculator"),
    preset_id: z.string().optional(),
    solutes: z.array(soluteInputSchema).default([]),
    target_osmolarity_mOsm_L: z.number().positive().optional(),
    adjust_solute_id: z.string().optional(),
    tonicity_reference_id: z.string().optional(),
  })
  .passthrough();
export type OsmoRecipeSolverInput = z.infer<typeof osmoRecipeSolverInputSchema>;

export function parseRunInput(input: unknown): OsmoRecipeSolverInput {
  return osmoRecipeSolverInputSchema.parse(input);
}
