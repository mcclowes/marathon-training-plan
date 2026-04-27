/**
 * Seeded PRNG (Mulberry32) + Math.random monkey-patch + fixed Date patch for
 * reproducible simulation runs.
 */

// ---------------------------------------------------------------------------
// Mulberry32 PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Math.random monkey-patch
// ---------------------------------------------------------------------------

let _originalRandom: (() => number) | null = null;

export function patchRandom(seed: number): void {
  if (_originalRandom === null) {
    _originalRandom = Math.random;
  }
  const rng = mulberry32(seed);
  Math.random = rng;
}

export function unpatchRandom(): void {
  if (_originalRandom !== null) {
    Math.random = _originalRandom;
    _originalRandom = null;
  }
}

// ---------------------------------------------------------------------------
// Fixed Date patch
// ---------------------------------------------------------------------------

export const REFERENCE_DATE = "2026-04-26";

let _originalDate: typeof Date | null = null;

export function installFixedDate(): void {
  if (_originalDate !== null) return; // already installed
  _originalDate = Date;

  const OriginalDate = Date;
  const fixedTimestamp = new OriginalDate(REFERENCE_DATE + "T00:00:00.000Z").getTime();

  // We need a constructor function that behaves like Date in all ways but
  // returns the fixed timestamp when called with no arguments.
  const PatchedDate = function PatchedDate(this: unknown, ...args: unknown[]): Date | string {
    if (!(this instanceof PatchedDate)) {
      // Called as a function (Date()), return string representation
      return new OriginalDate().toString();
    }
    if (args.length === 0) {
      return new OriginalDate(fixedTimestamp);
    }
    if (args.length === 1) {
      return new OriginalDate(args[0] as number | string);
    }
    return new OriginalDate(
      args[0] as number,
      args[1] as number,
      args[2] as number | undefined,
      args[3] as number | undefined,
      args[4] as number | undefined,
      args[5] as number | undefined,
      args[6] as number | undefined,
    );
  } as unknown as typeof Date;

  // Copy static methods
  PatchedDate.now = OriginalDate.now;
  PatchedDate.parse = OriginalDate.parse;
  PatchedDate.UTC = OriginalDate.UTC;
  Object.setPrototypeOf(PatchedDate, OriginalDate);
  Object.setPrototypeOf(PatchedDate.prototype, OriginalDate.prototype);

  // Override now() to return the fixed timestamp too
  PatchedDate.now = () => fixedTimestamp;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Date = PatchedDate;
}

export function uninstallFixedDate(): void {
  if (_originalDate !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Date = _originalDate;
    _originalDate = null;
  }
}
