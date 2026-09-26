import type { CrtIntensity } from './types';

/** Human label for a CRT intensity tier. Shared by the header + help panel. */
export const getCrtLabel = (intensity: CrtIntensity): string => {
  switch (intensity) {
    case 0:
      return 'OFF';
    case 1:
      return 'SOBER';
    case 2:
      return 'SCREEN';
    case 3:
      return 'ARCADE';
  }
};
