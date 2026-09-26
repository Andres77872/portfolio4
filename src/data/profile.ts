import aboutData from './about.json';

export interface ContactLink {
    name: string;
    label: string;
    url: string;
}

export interface SkillGroup {
    category: string;
    items: string[];
}

export interface Profile {
    name: string;
    title: string;
    location: string;
    timezone: string;
    availability: string;
    description: string[];
    skills: SkillGroup[];
    contactLinks: ContactLink[];
}

/** Typed view of `about.json` — the single source for personal and contact details. */
export const profile: Profile = aboutData[0];

export const SITE_REPO_URL = 'https://github.com/Andres77872/portfolio4';

export const getContactLink = (name: string): ContactLink | undefined =>
    profile.contactLinks.find((link) => link.name === name);
