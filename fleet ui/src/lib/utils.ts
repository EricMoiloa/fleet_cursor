import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function unpackArrayOrData<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'data' in (payload as any)) {
    const d = (payload as any).data;
    return Array.isArray(d) ? (d as T[]) : [];
  }
  return [];
}

// Use with Promise.allSettled
export function isFulfilled<T>(
  r: PromiseSettledResult<T>
): r is PromiseFulfilledResult<T> {
  return r.status === 'fulfilled';
}
