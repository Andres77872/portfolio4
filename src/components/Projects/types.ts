// Project type definitions

export type ProjectCategoryId =
    | 'retrieval-vision'
    | 'agents-llm'
    | 'platforms-tools'
    | 'games-interactive';

export interface Project {
    title: string;
    /** One-line summary shown on cards and under the modal title. */
    tagline?: string;
    category?: ProjectCategoryId;
    /** Rank among featured projects (1 = lead). Omit for non-featured. */
    featured?: number;
    /** Short outcome bullets shown on featured cards. */
    highlights?: string[];
    description: string;
    descriptionMD: string;
    url?: string;
    apiUrl?: string;
    repoUrl?: string;
    image?: string;
    tags?: string[];
    status?: 'production' | 'repo';
    license?: string;
    language?: string[];
    releaseDate?: string;
    auth?: {
        login: boolean;
        register: boolean;
    };
}

/** A project enriched with values derived once at load time. */
export interface CatalogProject extends Project {
    slug: string;
    year: number | null;
    /** Uppercased union of tags and languages, used for stack filtering. */
    technologies: string[];
}
