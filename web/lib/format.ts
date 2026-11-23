export function formatUsd(value: number, digits = 2) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(value: number, digits = 2) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

export function shortAddress(address: string, chars = 4) {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function formatAge(ms: number) {
  if (ms < 1000) return `${Math.max(0, Math.round(ms))} ms ago`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s ago`;
  return `${Math.floor(s / 60)} min ago`;
}
