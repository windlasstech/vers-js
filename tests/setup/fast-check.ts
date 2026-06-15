import { configureGlobal } from "fast-check";

const DEFAULT_NUM_RUNS = 100;
const CI_NUM_RUNS = 100;
const FUZZ_INTERRUPT_MS = 10_000;
const CI_INTERRUPT_MS = 5000;

declare const process: {
  readonly env: {
    readonly CI?: string;
    readonly VERS_PBT_PATH?: string;
    readonly VERS_PBT_MODE?: string;
    readonly VERS_PBT_SEED?: string;
  };
};

const isCi = process.env.CI === "true";
const isFuzzMode = process.env.VERS_PBT_MODE === "fuzz";

function parseSeed(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const seed = Number(value);

  if (!Number.isInteger(seed)) {
    throw new Error("VERS_PBT_SEED must be an integer.");
  }

  return seed;
}

const seed = parseSeed(process.env.VERS_PBT_SEED);
const path = process.env.VERS_PBT_PATH;

const seedConfig = seed === undefined ? {} : { seed };
const pathConfig = path === undefined ? {} : { path };
const baseConfig = { ...seedConfig, ...pathConfig };

if (isFuzzMode) {
  configureGlobal({
    ...baseConfig,
    interruptAfterTimeLimit: FUZZ_INTERRUPT_MS,
    numRuns: Number.POSITIVE_INFINITY,
  });
} else if (isCi) {
  configureGlobal({
    ...baseConfig,
    interruptAfterTimeLimit: CI_INTERRUPT_MS,
    markInterruptAsFailure: true,
    numRuns: CI_NUM_RUNS,
  });
} else {
  configureGlobal({
    ...baseConfig,
    numRuns: DEFAULT_NUM_RUNS,
  });
}
