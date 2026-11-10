// The one place a share becomes text. METRICS.md (src/report.ts) and the dashboard (dashboard/data.js,
// written by src/dashboard.ts) both format shares with `pctOf`, from the USD pair the share is a ratio of.
//
// Why a pair and not a stored share: summary.json keeps each share to four places (0.2935), and rounding
// that to one place again goes wrong at the edges (0.29352 → 29.35 → "29.3%", where the exact 29.3517 is
// "29.4%"; Codex r1 item 8). The USD values are stored to six places, so their ratio is exact to the digit.
//
// A page opened from disk can't import this file, so the function's source is one string. The tool builds
// `pctOf` from it, and `dashboard/data.js` ends with the same string, which the browser runs as a classic
// script. Plain JavaScript only; no types inside the string.

export const PCT_OF_SOURCE = `function pctOf(part, whole) {
  return whole === 0 ? '0.0%' : ((part / whole) * 100).toFixed(1) + '%';
}`;

/** One decimal place, from the exact ratio of `part` to `whole`; '0.0%' when `whole` is 0. */
export const pctOf = new Function(`${PCT_OF_SOURCE}\nreturn pctOf;`)() as (part: number, whole: number) => string;
