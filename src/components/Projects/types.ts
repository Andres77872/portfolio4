// Project type definitions

export interface Project {
    title: string;
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
