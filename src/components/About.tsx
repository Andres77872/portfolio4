import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Project } from '@/components/Projects/types';
import aboutData from '../data/about.json';
import projectsData from '../data/projects.json';
import Section from './common/Section';

interface Skill {
  category: string;
  items: string[];
}

interface ContactLink {
  name: string;
  url: string;
}

interface AboutData {
  name: string;
  title: string;
  subtitle: string;
  description: string[];
  skills: Skill[];
  contactLinks: ContactLink[];
}

interface ExpertiseGroup {
  title: string;
  description: string;
  projectTitles: string[];
  technologies: string[];
}

const projects = projectsData as Project[];
const projectLabels = new Set(
  projects
    .flatMap((project) => [...(project.tags ?? []), ...(project.language ?? [])])
    .map((label) => label.toLowerCase()),
);

const getAvailableTechnologies = (technologies: string[]) =>
  technologies.filter((technology) => projectLabels.has(technology.toLowerCase()));

const expertiseGroups: ExpertiseGroup[] = [
  {
    title: 'AI retrieval & multimodal systems',
    description: 'Search, RAG, image understanding, and captioning work backed by shipped projects instead of abstract skill claims.',
    projectTitles: ['FindIT', 'ColWrite', 'Colpali-Arxiv Chat', 'SmolVLM-500M-Anime-Caption'],
    technologies: getAvailableTechnologies(['LLM', 'RAG', 'COLPALI', 'QDRANT', 'OPENCLIP', 'SIGLIP', 'FINE-TUNING']),
  },
  {
    title: 'Agent workflows & LLM infrastructure',
    description: 'Node-graph assistants, provider wrappers, and agent frameworks for composing LLM workflows across products and libraries.',
    projectTitles: ['Novus Talk', 'magic-agents', 'magic-llm', 'Magic Slider', 'Magic Worlds'],
    technologies: getAvailableTechnologies(['MAGIC-LLM', 'MAGIC-AGENTS', 'AGENTS', 'NODE GRAPH', 'OPENAI', 'ANTHROPIC', 'AWS BEDROCK']),
  },
  {
    title: 'Product frontend & interactive UX',
    description: 'React/Vite applications, graph visualizations, presentation tools, canvas-driven interfaces, and 3D game experiences tied directly to portfolio projects.',
    projectTitles: ['spyder.findit', 'Magic Slider', 'Portfolio', 'Magic Worlds', 'Yellow Rooms'],
    technologies: getAvailableTechnologies(['REACT', 'VITE', 'THREE.JS', 'REACT-FORCE-GRAPH-3D', 'REVEALJS', 'CANVAS', 'WEBGL2', 'GLSL', 'PROCEDURAL GENERATION']),
  },
  {
    title: 'APIs, auth & secure product backends',
    description: 'FastAPI services, encrypted sharing, authentication, and RBAC systems that support real deployed applications.',
    projectTitles: ['Magic Auth', 'JustAnotherFileStorage', 'FindIT', 'Novus Talk'],
    technologies: getAvailableTechnologies(['FASTAPI', 'MYSQL', 'JWT', 'RBAC', 'AUTHENTICATION', 'ENCRYPTION', 'HTTPX']),
  },
];

// Default data in case the JSON file is empty or missing
const defaultData: AboutData = {
  name: "Andres",
  title: "AI Developer",
  subtitle: "AI Developer with experience in Generative AI, focusing on Large Language Models (LLMs) and diffusion models, and in developing autonomous agent systems.",
  description: [
    "I'm Andres, an AI Developer specializing in Generative AI and large language model (LLM) systems. I design and build end-to-end AI solutions—from research prototypes to production-ready services—leveraging FastAPI backends, React frontends, and state-of-the-art machine learning frameworks.",
    "My work spans reverse search engines powered by neural embeddings (FindIT), node-graph agent orchestration tools (Novus Talk & magic-agents), encrypted file-sharing platforms (JustAnotherFileStorage), and unified LLM provider wrappers (magic-llm). I'm passionate about diffusion models, vector databases (Qdrant), and autonomous agent systems that bridge the gap between research and real-world applications."
  ],
  skills: [],
  contactLinks: []
};

export default function About() {
  const data = useMemo(() => {
    try {
      return aboutData && aboutData.length > 0
        ? aboutData[0] as AboutData
        : defaultData;
    } catch (error) {
      console.error("Error loading about data:", error);
      return defaultData;
    }
  }, []);

  return (
    <Section
      id="about"
      title="About Me"
    >
      {/* Content: Description + Highlights */}
      <div className={cn(
        "grid grid-cols-2 gap-16 items-start mb-16",
        "max-md:grid-cols-1 max-md:gap-10",
      )}>
        {/* Description Text */}
        <div className={cn(
          "flex flex-col gap-6",
          "max-md:order-1",
        )}>
          {data.description.map((paragraph, index) => (
            <div
              key={index}
              className="animate-fade-in-up"
              style={{ animationDelay: `${0.3 + index * 0.15}s` }}
            >
              <p className={cn(
                "text-lg leading-relaxed text-muted-foreground m-0 relative pl-4",
                "max-md:text-base",
                // Gradient accent line via pseudo-element
                "before:content-[''] before:absolute before:left-0 before:top-0",
                "before:w-0.5 before:h-full",
                "before:bg-linear-to-b before:from-indigo-400 before:to-indigo-600",
                "before:rounded-full before:opacity-60",
              )}>
                {paragraph}
              </p>
            </div>
          ))}
        </div>

        {/* Highlight Cards */}
        <div className={cn(
          "flex flex-col gap-6",
          "max-md:order-2",
        )}>
          {[
            { icon: '🚀', title: 'Innovation Focus', desc: 'Transforming cutting-edge AI research into real-world applications' },
            { icon: '🔬', title: 'Research & Development', desc: 'Bridging the gap between academic research and production systems' },
            { icon: '⚡', title: 'End-to-End Solutions', desc: 'From concept to deployment, creating comprehensive AI ecosystems' },
          ].map((card, index) => (
            <div
              key={card.title}
              className={cn(
                "bg-foreground/[0.03] border border-border rounded-lg p-6",
                "transition-all duration-200",
                "hover:-translate-y-0.5 hover:border-foreground/[0.15]",
                "animate-fade-in-up",
                "max-xs:p-5",
              )}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <div className="text-[1.75rem] mb-3 block">{card.icon}</div>
              <h3 className="text-lg font-bold text-foreground mb-1">{card.title}</h3>
              <p className="text-base text-muted-foreground m-0 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Project-backed Expertise Section */}
      <div>
        <div className="text-center mb-12">
          <h3
            className={cn(
              "bg-linear-to-r from-indigo-400 to-indigo-300",
              "bg-clip-text text-transparent",
              "text-[clamp(1.5rem,3vw,2rem)] font-bold",
            )}
            style={{ WebkitBackgroundClip: 'text' }}
          >
            Technical Expertise
          </h3>
          <p className="text-lg text-muted-foreground mt-3 mx-auto max-w-[680px]">
            Project-backed areas of work derived from the technologies and domains represented in the portfolio.
          </p>
        </div>

        <div className={cn(
          "grid gap-6",
          "grid-cols-[repeat(auto-fit,minmax(320px,1fr))]",
          "max-md:grid-cols-1",
        )}>
          {expertiseGroups.map((group) => (
            <Card
              key={group.title}
              className={cn(
                "bg-foreground/[0.03] border-border h-full",
                "max-xs:p-5",
              )}
            >
              <CardHeader className="space-y-3">
                <CardTitle className={cn(
                  "text-xl font-bold text-foreground leading-tight",
                  "max-xs:text-lg",
                )}>
                  {group.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed m-0">
                  {group.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                    Project evidence
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.projectTitles.map((projectTitle) => (
                      <Badge
                        key={projectTitle}
                        variant="outline"
                        className={cn(
                          "bg-indigo-500/10 text-foreground border-indigo-400/30",
                          "rounded-md py-1 px-3 text-sm font-medium",
                        )}
                      >
                        {projectTitle}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                    Technologies in use
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.technologies.map((technology) => (
                      <Badge
                        key={technology}
                        variant="outline"
                        className={cn(
                          "bg-foreground/[0.05] text-muted-foreground border-border",
                          "rounded-md py-1 px-3 text-sm font-medium",
                        )}
                      >
                        {technology}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
}
