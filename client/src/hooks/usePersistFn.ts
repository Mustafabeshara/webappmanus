import { useRef } from "react";

type Noop = (...args: unknown[]) => unknown;

/**
 * usePersistFn instead of useCallback to reduce cognitive load
 */
export function usePersistFn<T extends Noop>(fn: T) {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  persistFn.current ??= function (this: unknown, ...args) {
    return fnRef.current.apply(this, args);
  } as T;

  return persistFn.current;
}
