import artworkData from '@/data/projectArtwork.json';

interface ProjectImageEnvironment {
  VITE_PROJECT_IMAGES?: string;
  VITE_PROJECT_IMAGE_VARIANT?: string;
  BASE_URL?: string;
}

const artwork: Partial<Record<string, readonly string[]>> = artworkData;
const DEFAULT_GENERATED_VARIANT = 7;

/** Build-time artwork selection shared by every catalog consumer. */
export function resolveProjectImage(
  slug: string,
  legacyImage: string | undefined,
  env: ProjectImageEnvironment = import.meta.env,
): string | undefined {
  if (env.VITE_PROJECT_IMAGES !== 'generated') return legacyImage;

  const selection = env.VITE_PROJECT_IMAGE_VARIANT ?? String(DEFAULT_GENERATED_VARIANT);
  const variant = /^[1-9]\d*$/.test(selection) ? Number(selection) - 1 : DEFAULT_GENERATED_VARIANT - 1;
  const images = artwork[slug];
  const image = images?.[variant] ?? images?.[DEFAULT_GENERATED_VARIANT - 1] ?? images?.[0];
  // New catalog entries can ship before their artwork is commissioned.
  if (!image) return legacyImage;

  const base = (env.BASE_URL ?? '/').replace(/\/?$/, '/');
  return `${base}${image}`;
}
