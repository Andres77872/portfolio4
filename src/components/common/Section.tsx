import React, { ReactNode } from 'react';
import '../../css/components/common/Section.css';

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
    <section id={id} className={`section ${className}`}>
      <div className="section__container">
        {(title || description) && (
          <div className="section__header">
            {title && (
              <>
                <h2 className="section__title">{title}</h2>
                <div className="section__title-underline"></div>
              </>
            )}
            {description && (
              <div className="section__description">
                {typeof description === 'string' ? <p>{description}</p> : description}
              </div>
            )}
          </div>
        )}
        
        <div className="section__content">
          {children}
        </div>
      </div>
    </section>
  );
};

export default Section;
