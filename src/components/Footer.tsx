import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SITE_REPO_URL, profile } from '@/data/profile';

const linkClasses = cn(
  'rounded-sm text-muted-foreground no-underline transition-colors hover:text-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'contrast-more:text-foreground contrast-more:underline',
);

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border contrast-more:border-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 pt-8 pb-24 text-sm max-md:px-4">
        <p className="text-muted-foreground">
          © {year} {profile.name} ·{' '}
          <a href={SITE_REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClasses}>
            Source on GitHub
          </a>
        </p>

        <nav aria-label="Elsewhere">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {profile.contactLinks.map((link) => {
              const isEmail = link.url.startsWith('mailto:');
              return (
                <li key={link.name}>
                  <a
                    href={link.url}
                    className={linkClasses}
                    {...(isEmail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    {link.name}
                  </a>
                </li>
              );
            })}
            <li>
              <a href="#top" className={cn(linkClasses, 'inline-flex items-center gap-1')}>
                Back to top
                <ArrowUp aria-hidden="true" className="size-3.5" />
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
