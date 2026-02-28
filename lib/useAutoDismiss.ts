import { useEffect } from 'react';

export function useAutoDismiss(
  value: string,
  setValue: (next: string) => void,
  delayMs = 4000
) {
  useEffect(() => {
    if (!value) return;
    const timer = setTimeout(() => setValue(''), delayMs);
    return () => clearTimeout(timer);
  }, [value, setValue, delayMs]);
}
