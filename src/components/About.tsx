import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import aboutData from '../data/about.json';
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

      {/* Skills Section */}
      {data.skills && data.skills.length > 0 && (
        <div className="mb-16">
          {/* Skills Header */}
          <div
            className="text-center mb-12 animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
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
            <p className="text-lg text-muted-foreground mt-3 mx-auto max-w-[560px]">
              Technologies and frameworks I work with
            </p>
          </div>

          {/* Skill Group Grid */}
          <div className={cn(
            "grid gap-8",
            "grid-cols-[repeat(auto-fit,minmax(300px,1fr))]",
            "max-md:grid-cols-1 max-md:gap-6",
          )}>
            {data.skills.map((skillGroup, index) => (
              <Card
                key={index}
                className={cn(
                  "bg-foreground/[0.03] border-border",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:border-foreground/[0.14]",
                  "animate-fade-in-up",
                  "max-xs:p-5",
                )}
                style={{ animationDelay: `${0.8 + index * 0.1}s` }}
              >
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className={cn(
                    "text-xl font-bold text-foreground",
                    "max-xs:text-lg",
                  )}>
                    {skillGroup.category}
                  </CardTitle>
                  <span className={cn(
                    "bg-foreground/[0.06] text-muted-foreground text-sm font-medium",
                    "py-0.5 px-3 rounded-full border border-border",
                    "min-w-6 text-center",
                  )}>
                    {skillGroup.items.length}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {skillGroup.items.map((skill, skillIndex) => (
                      <Badge
                        key={skillIndex}
                        variant="outline"
                        className={cn(
                          "bg-foreground/[0.05] text-muted-foreground",
                          "border-border rounded-md",
                          "py-1 px-3 text-sm font-medium",
                          "transition-all duration-200",
                          "hover:border-indigo-500 hover:text-foreground",
                          "animate-slide-in-bottom",
                        )}
                        style={{
                          animationDelay: `${skillIndex * 0.15}s`,
                        }}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div
        className={cn(
          "grid grid-cols-3 gap-6 text-center",
          "animate-fade-in-up",
          "max-md:grid-cols-1 max-md:gap-6",
        )}
        style={{ animationDelay: '1s' }}
      >
        {[
          { number: '3+', label: 'Years Experience' },
          { number: '10+', label: 'AI Projects' },
          { number: '5+', label: 'Technologies' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "bg-foreground/[0.03] border border-border rounded-lg p-8",
              "transition-all duration-200",
              "hover:-translate-y-0.5 hover:border-foreground/[0.14]",
              "max-xs:p-6",
            )}
          >
            <div
              className={cn(
                "text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none mb-2",
                "bg-linear-to-br from-indigo-400 to-indigo-300 bg-clip-text text-transparent",
              )}
              style={{ WebkitBackgroundClip: 'text' }}
            >
              {stat.number}
            </div>
            <div className="text-base text-muted-foreground font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
