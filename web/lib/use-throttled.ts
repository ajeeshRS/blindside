"use client";

import { useEffect, useRef, useState } from "react";

/** Returns `value`, updated at most once every `ms` (trailing update included). */
export function useThrottled<T>(value: T, ms: number): T {
  const [shown, setShown] = useState(value);
  const last = useRef(0);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
    const wait = Math.max(0, last.current + ms - Date.now());
    const id = setTimeout(() => {
      last.current = Date.now();
      setShown(latest.current);
    }, wait);
    return () => clearTimeout(id);
  }, [value, ms]);

  return shown;
}
