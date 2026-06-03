import { useEffect } from 'react';

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
