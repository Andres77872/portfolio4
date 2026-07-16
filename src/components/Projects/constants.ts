/**
 * Language colors for metadata display
 * Source: GitHub language colors convention
 */
export const LANGUAGE_COLORS: Record<string, string> = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572A5',
  rust: '#dea584',
  go: '#00ADD8',
  java: '#b07219',
  kotlin: '#A97BFF',
  swift: '#F05138',
  ruby: '#701516',
  php: '#4F5D95',
  c: '#555555',
  'c++': '#f34b7d',
  'c#': '#178600',
  html: '#e34c26',
  css: '#563d7c',
  shell: '#89e051',
  dart: '#00B4AB',
  r: '#198CE7',
  scala: '#c22d40',
  mysql: '#00758F',
  sqlite: '#003B57',
  postgresql: '#336791',
  mongodb: '#47A248',
  graphql: '#E10098',
  react: '#61DAFB',
  vue: '#4FC08D',
  angular: '#DD0031',
  threejs: '#000000',
  'three.js': '#000000',
  glsl: '#5686a5',
};

/**
 * Get language color with fallback
 */
export const getLanguageColor = (lang: string): string =>
  LANGUAGE_COLORS[lang.toLowerCase()] ?? 'rgba(255, 255, 255, 0.35)';

/**
 * Project deployment status shown by StatusBadge
 */
export type ProjectStatus = 'production' | 'repo';