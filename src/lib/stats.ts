export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function getFractionalRanks(arr: number[]): number[] {
  const n = arr.length;
  const pairs = arr.map((val, i) => ({ val, i }));
  pairs.sort((a, b) => a.val - b.val);

  const ranks = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && pairs[j].val === pairs[i].val) j++;
    const rank = (i + 1 + j) / 2; // average rank
    for (let k = i; k < j; k++) {
      ranks[pairs[k].i] = rank;
    }
    i = j;
  }
  return ranks;
}

export function spearman(x: number[], y: number[]): number {
  const rx = getFractionalRanks(x);
  const ry = getFractionalRanks(y);
  return pearson(rx, ry);
}

export function kendall(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  let numConcordant = 0;
  let numDiscordant = 0;
  let tiesX = 0;
  let tiesY = 0;
  let tiesBoth = 0;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];

      if (dx === 0 && dy === 0) {
        tiesBoth++;
      } else if (dx === 0) {
        tiesX++;
      } else if (dy === 0) {
        tiesY++;
      } else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
        numConcordant++;
      } else {
        numDiscordant++;
      }
    }
  }

  const n0 = (n * (n - 1)) / 2;
  const n1 = numConcordant + numDiscordant + tiesY; // pairs not tied in X
  const n2 = numConcordant + numDiscordant + tiesX; // pairs not tied in Y
  
  const num = numConcordant - numDiscordant;
  const den = Math.sqrt(n1 * n2);
  
  return den === 0 ? 0 : num / den;
}
