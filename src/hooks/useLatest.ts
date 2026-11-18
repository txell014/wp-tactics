import { useRef } from "react";

/** Referència que sempre apunta al darrer valor (evita closures obsoletes en listeners). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
