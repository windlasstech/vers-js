import { configureGlobal } from "fast-check";

const DEFAULT_NUM_RUNS = 100;
const CI_NUM_RUNS = 100;
const FUZZ_INTERRUPT_MS = 10_000;
const CI_INTERRUPT_MS = 5000;

declare const process: {
  readonly env: {
    readonly CI?: string;
    readonly VERS_PBT_MODE?: string;
    readonly VERS_PBT_SEED?: string;
  };
};

const isCi = process.env.CI === "true";
const isFuzzMode = process.env.VERS_PBT_MODE === "fuzz";

const seed =
  process.env.VERS_PBT_SEED !== undefined ? Number(process.env.VERS_PBT_SEED) : undefined;

const baseConfig = seed === undefined ? {} : { seed };

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
    numRuns: CI_NUM_RUNS,
  });
} else {
  configureGlobal({
    ...baseConfig,
    numRuns: DEFAULT_NUM_RUNS,
  });
}
