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

/** Which distortion axes are enabled and their per-axis max magnitudes. */
export interface DistortOpts {
  rotate: boolean;
  rotateMaxDeg: number;
  skew: boolean;
  skewMaxDeg: number;
}

/** One CSS transform per barcode. For every barcode the PRNG is advanced twice
 *  in fixed order — the rotation draw, then the shear draw — regardless of which
 *  axes are enabled, so a barcode's rotation is identical whether or not skew is
 *  on (and vice versa). The returned string includes only the enabled axes,
 *  rotation first: `rotate(Rdeg) skewX(Sdeg)`, `rotate(Rdeg)`, `skewX(Sdeg)`, or
 *  `''` when both axes are off. Each angle is drawn from [-maxDeg, +maxDeg] and
 *  fixed to 2 decimals. Deterministic; length === count. Pure — safe at render time. */
export function buildTransforms(count: number, opts: DistortOpts, seed: number): string[] {
  const rng = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    // Always draw both, in this order, to keep the two axes positionally independent.
    const rot = ((rng() * 2 - 1) * opts.rotateMaxDeg).toFixed(2);
    const shear = ((rng() * 2 - 1) * opts.skewMaxDeg).toFixed(2);
    const parts: string[] = [];
    if (opts.rotate) parts.push(`rotate(${rot}deg)`);
    if (opts.skew) parts.push(`skewX(${shear}deg)`);
    out.push(parts.join(' '));
  }
  return out;
}
