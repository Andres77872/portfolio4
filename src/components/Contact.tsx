import type { ComponentType } from 'react';
import { ArrowRight, Handshake, Mail, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GitHubIcon, LinkedInIcon } from '@/components/icons';
import Section from './common/Section';

interface ContactLink {
  name: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const contactLinks: ContactLink[] = [
  {
    name: "Email",
    label: "andres@arz.ai",
    href: "mailto:andres@arz.ai",
    icon: Mail,
    description: "Drop me a line anytime"
  },
  {
    name: "LinkedIn",
    label: "Connect on LinkedIn",
    href: "https://www.linkedin.com/in/arz-ai/",
    icon: LinkedInIcon,
    description: "Let's connect professionally"
  },
  {
    name: "GitHub",
    label: "Check out my code",
    href: "https://github.com/Andres77872",
    icon: GitHubIcon,
    description: "Explore my repositories"
  }
];

const features = [
  { icon: Zap, text: "Quick Response" },
  { icon: Target, text: "Focused Solutions" },
  { icon: Handshake, text: "Collaborative Approach" },
];

export default function Contact() {
  const description = "Ready to build something amazing together? I'm always open to discussing new opportunities, innovative projects, and collaborations in AI and machine learning.";

  return (
    <Section
      id="contact"
      title="Let's Connect"
      description={description}
    >
      <div className="flex flex-col items-center gap-10 max-w-[40rem] mx-auto">
        {/* CTA Text */}
        <div className="text-center">
          <h3 className="text-[1.75rem] font-semibold tracking-tight text-foreground mb-3 max-xs:text-xl">
            Get in Touch
          </h3>
          <p className="text-[0.9375rem] text-muted-foreground leading-relaxed mb-5 max-xs:text-sm">
            Whether you're looking to develop AI solutions, need consulting on machine learning projects,
            or just want to discuss the latest in AI research, I'd love to hear from you.
          </p>
          <ul className="flex items-center justify-center gap-4 flex-wrap">
            {features.map((feature) => (
              <li
                key={feature.text}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full",
                  "bg-foreground/[0.04] border border-border",
                  "text-[0.8125rem] text-muted-foreground",
                )}
              >
                <feature.icon className="size-3.5 text-primary" />
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Link Cards */}
        <div className="grid grid-cols-2 gap-3 w-full max-md:grid-cols-1">
          {contactLinks.map((link) => (
            <Button
              key={link.name}
              variant="ghost"
              asChild
              className={cn(
                "relative h-auto p-5 justify-start gap-4",
                "rounded-xl",
                "bg-foreground/[0.03] border border-border",
                "transition-colors duration-200",
                "hover:bg-foreground/[0.05] hover:border-foreground/[0.12]",
                "group",
              )}
            >
              <a
                href={link.href}
                target={link.href.startsWith('mailto:') ? '_self' : '_blank'}
                rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
                className="flex items-center gap-4 w-full"
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                  "bg-primary/10 text-primary",
                )}>
                  <link.icon className="size-5" />
                </div>
                <div className="flex flex-col items-start text-left min-w-0">
                  <div className="text-sm font-medium text-foreground">{link.name}</div>
                  <div className="text-xs text-primary truncate">{link.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{link.description}</div>
                </div>
                <ArrowRight className={cn(
                  "ml-auto size-4 shrink-0 text-muted-foreground",
                  "transition-transform duration-200 group-hover:translate-x-0.5",
                )} />
              </a>
            </Button>
          ))}
        </div>
      </div>

      {/* Footer / Status */}
      <div className="flex flex-col items-center gap-2 mt-10 pt-6 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="absolute w-2 h-2 rounded-full bg-success/35 animate-status-pulse" />
          </div>
          <span>Available for new projects</span>
        </div>
        <div className="text-xs text-muted-foreground/60">
          Based in Mexico · UTC-6
        </div>
      </div>
    </Section>
  );
}
