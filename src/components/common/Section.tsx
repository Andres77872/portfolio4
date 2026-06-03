import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  title?: string;
  description?: string | ReactNode;
  children: ReactNode;
  className?: string;
}

const Section: React.FC<SectionProps> = ({
  id,
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <section
      id={id}
      className={cn(
        "py-20 relative",
        "max-md:py-16",
        className,
      )}
    >
      <div className="max-w-[1200px] mx-auto px-6 relative max-md:px-4">
        {(title || description) && (
          <div className="text-center mb-16">
            {title && (
              <>
                <h2 className={cn(
                  "font-sans font-bold tracking-tight leading-tight text-foreground mb-3 inline-block",
                  "text-[clamp(2rem,4vw,3rem)]",
                  "max-xs:text-[1.75rem]",
                )}>
                  {title}
                </h2>
                <div className="w-12 h-0.5 bg-primary mx-auto mt-4 mb-6 rounded-full opacity-60" />
              </>
            )}
            {description && (
              <div className={cn(
                "text-lg leading-relaxed text-muted-foreground max-w-[600px] mx-auto",
                "max-xs:text-base",
              )}>
                {typeof description === 'string' ? <p>{description}</p> : description}
              </div>
            )}
          </div>
        )}
        
        <div className="relative">
          {children}
        </div>
      </div>
    </section>
  );
};

export default Section;
