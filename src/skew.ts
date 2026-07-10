/** Deterministic PRNG (mulberry32): same seed → same [0, 1) sequence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One CSS transform per barcode: `rotate(Rdeg) skewX(Sdeg)`, R and S each drawn
 *  independently from [-maxDeg, +maxDeg] via a PRNG seeded by `seed`. Deterministic;
 *  length === count. Pure — safe to call at render time. */
export function buildSkewTransforms(count: number, maxDeg: number, seed: number): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const rot = ((rng() * 2 - 1) * maxDeg).toFixed(2);
    const shear = ((rng() * 2 - 1) * maxDeg).toFixed(2);
    out.push(`rotate(${rot}deg) skewX(${shear}deg)`);
  }
  return out;
}
