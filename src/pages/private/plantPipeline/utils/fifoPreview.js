/** Proportional split for tray/bottle allocation across size rows. */
export function splitProportional(total, weights) {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (!sumW || total < 1) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sumW);
  const out = raw.map((x) => Math.floor(x));
  let rem = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k++) out[order[k % order.length].i] += 1;
  return out;
}

export function buildSizeRowsFromTotals(splitNums, totalTrays, totalBottles) {
  const entries = ["R1", "R2", "R3"]
    .filter((s) => (splitNums[s] ?? 0) > 0)
    .map((s) => ({ size: s, plants: splitNums[s] }));
  if (!entries.length) return [];
  const weights = entries.map((e) => e.plants);
  const trays = splitProportional(totalTrays, weights);
  const bottles = splitProportional(totalBottles, weights);
  return entries.map((e, i) => ({
    size: e.size,
    plants: e.plants,
    numberOfTrays: trays[i],
    numberOfBottles: bottles[i],
  }));
}

export function parseSizeSplit(form) {
  return {
    R1: Math.max(0, Number(form.R1) || 0),
    R2: Math.max(0, Number(form.R2) || 0),
    R3: Math.max(0, Number(form.R3) || 0),
  };
}

export function totalPlantsFromSplit(split) {
  return (split.R1 ?? 0) + (split.R2 ?? 0) + (split.R3 ?? 0);
}
