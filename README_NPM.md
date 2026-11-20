# Pepkio Osmo Recipe Solver

Typed TypeScript and Node.js SDK with CLI for multi-solute solution osmolarity calculations, tonicity evaluation, and automated buffer recipe adjustment via the Pepkio Tools API.

# What It Does

In cell culture, electrophysiology, protein purification, and organoid systems, exact control over solution osmolarity and tonicity is essential for cell viability and reproducible experimental conditions. Small osmotic shifts can cause cell swelling, lysis, crenation, or altered ion channel kinetics.

This package provides a typed Node.js/ESM client and command-line interface to compute theoretical osmolarity, evaluate effective tonicity against physiological baselines, and calculate the exact solute mass or volume required to hit target osmotic specifications via the Pepkio Tools REST API.

Programmatic runs require an active network connection and a Pepkio API key. Calculations are processed via the Pepkio Tools REST API.

# Features

- **Multi-Solute Osmolarity Calculation**: Computes total theoretical osmolarity (mOsm/L) across salt, sugar, amino acid, and polymer mixtures.
- **Stoichiometric Dissociation**: Accounts for dissociation factors ($\nu$) for electrolytes, non-electrolytes, and multi-valent salts (e.g. NaCl, KCl, CaCl2, MgSO4, Na2HPO4).
- **Automated Recipe Adjustment**: Solves for required adjusting solute mass or concentration (e.g. NaCl, sucrose, glucose) to match a desired target osmolarity.
- **Tonicity Assessment**: Evaluates effective tonicity and classifies solutions (isotonic, hypotonic, hypertonic) against standard physiological baselines.
- **Ionic Strength Calculation**: Computes total ionic strength ($I$) to assist buffer formulation for biochemical assays and enzyme kinetics.
- **Unit Flexibility**: Supports millimolar (mM), molar (M), micromolar ($\mu$M), g/L, and mg/mL solute inputs.
- **Manifest and Example Inspection**: Inspect pre-configured examples using `getManifest`, `listExamples`, and `getExampleInput`.
- **Command-Line Interface (CLI)**: Inspect manifests and run calculations directly via `npx pepkio-osmo-recipe-solver`.
- **TypeScript & ESM Native**: Fully typed with runtime parameter validation powered by Zod.

# Installation

```bash
npm install pepkio-osmo-recipe-solver
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before calling `run()`, `calculate()`, or `solveAdjustment()`:

```bash
export PEPKIO_API_KEY="your-api-key"
```

Create an API key in your [Pepkio account settings](https://www.pepkio.com/account/api-keys).

Optional configuration variables:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (for remote API calls) |
| `LOCAL_PEPKIO_API_KEY` | Local development key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API base URL (default: `https://tools.pepkio.com`) |

# Quick Example

```typescript
import { PepkioClient } from "pepkio-osmo-recipe-solver";

const client = new PepkioClient({ apiKey: process.env.PEPKIO_API_KEY });

// Calculate osmolarity for a standard 1X PBS buffer
const response = await client.calculate([
  { soluteId: "nacl", concentration: 137, unit: "mM" },
  { soluteId: "kcl", concentration: 2.7, unit: "mM" },
  { soluteId: "na2hpo4", concentration: 10, unit: "mM" },
  { soluteId: "kh2po4", concentration: 1.8, unit: "mM" },
]);

if (response.result?.calculator) {
  const calc = response.result.calculator;
  console.log(`Total Osmolarity: ${calc.total_osmolarity_mOsm_L} mOsm/L`);
  console.log(`Tonicity: ${calc.tonicity_label}`);
  console.log(`Ionic Strength: ${calc.ionic_strength_M} M`);
}
```

# CLI

```bash
# Inspect available manifest examples
npx pepkio-osmo-recipe-solver manifest --examples

# Run a pre-configured manifest example
npx pepkio-osmo-recipe-solver run --example pbs_standard
```

# Typical Use Cases

- **Electrophysiology & Patch-Clamp Recording**: Formulate internal pipette and external bath (aCSF) solutions with tight osmolarity tolerances (e.g. 290–310 mOsm/kg) to maintain cell morphology during recording.
- **Mammalian & Organoid Cell Culture**: Formulate isotonic growth media and serum-free supplements to prevent osmotic shock and preserve membrane integrity.
- **Cryopreservation Formulations**: Formulate high-osmolarity vitrification and cryoprotectant media containing DMSO, trehalose, glycerol, or sugars.
- **Protein Purification Buffers**: Design chromatography wash and elution buffers while tracking ionic strength and osmotic contributions.

# Scientific Background

Solution osmolarity represents the concentration of osmotically active particles in aqueous solution: $\text{Osmolarity} = \sum_{i} C_i \times \nu_i$, where $C_i$ is solute molar concentration and $\nu_i$ is the stoichiometric dissociation factor. Effective tonicity reflects the concentration of non-penetrating solutes that govern net trans-membrane water flux, classifying buffers relative to mammalian physiological baselines (~290 mOsm/L).

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/osmo-recipe-solver

The web application provides interactive recipe reconciliation, custom solute additions, and exportable buffer preparation protocols.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-osmo-recipe-solver-js

Web Application: https://www.pepkio.com/tools/osmo-recipe-solver

Python client (PyPI): https://pypi.org/project/pepkio-osmo-recipe-solver/

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/e601df493459328c114b3a27c355dbf9316a2b714d8765ddc75fd8af4046d670)
