import { useMemo, useState } from 'react';
import aboutData from '../data/about.json';

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
  const [activeSkillCategory, setActiveSkillCategory] = useState<number | null>(null);
  
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
    <section id="about" className="section about">
      <div className="about__container">
        <div className="about__header">
          <h2 className="about__section-title">
            About Me
          </h2>
          <div className="about__title-underline"></div>
        </div>

        <div className="about__content">
          <div className="about__text">
            {data.description.map((paragraph, index) => (
              <div key={index} className="about__paragraph-wrapper">
                <p className="about__description">
                  {paragraph}
                </p>
              </div>
            ))}
          </div>

          <div className="about__highlights">
            <div className="about__highlight-card">
              <div className="about__highlight-icon">🚀</div>
              <h3>Innovation Focus</h3>
              <p>Transforming cutting-edge AI research into real-world applications</p>
            </div>
            <div className="about__highlight-card">
              <div className="about__highlight-icon">🔬</div>
              <h3>Research & Development</h3>
              <p>Bridging the gap between academic research and production systems</p>
            </div>
            <div className="about__highlight-card">
              <div className="about__highlight-icon">⚡</div>
              <h3>End-to-End Solutions</h3>
              <p>From concept to deployment, creating comprehensive AI ecosystems</p>
            </div>
          </div>
        </div>

        {data.skills && data.skills.length > 0 && (
          <div className="about__skills-section">
            <div className="about__skills-header">
              <h3 className="about__section-title">
                Technical Expertise
              </h3>
              <p className="about__skills-subtitle">
                Technologies and frameworks I work with
              </p>
            </div>
            
            <div className="about__skills">
              {data.skills.map((skillGroup, index) => (
                <div 
                  key={index} 
                  className={`about__skill-group ${
                    activeSkillCategory === index ? 'about__skill-group--active' : ''
                  }`}
                  onMouseEnter={() => setActiveSkillCategory(index)}
                  onMouseLeave={() => setActiveSkillCategory(null)}
                >
                  <div className="about__skill-header">
                    <h4 className="about__skill-category">{skillGroup.category}</h4>
                    <div className="about__skill-count">{skillGroup.items.length}</div>
                  </div>
                  <div className="about__skill-list">
                    {skillGroup.items.map((skill, skillIndex) => (
                      <span 
                        key={skillIndex} 
                        className="about__skill-item"
                        style={{ '--delay': `${skillIndex * 0.1}s` } as React.CSSProperties}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="about__stats">
          <div className="about__stat">
            <div className="about__stat-number">3+</div>
            <div className="about__stat-label">Years Experience</div>
          </div>
          <div className="about__stat">
            <div className="about__stat-number">10+</div>
            <div className="about__stat-label">AI Projects</div>
          </div>
          <div className="about__stat">
            <div className="about__stat-number">5+</div>
            <div className="about__stat-label">Technologies</div>
          </div>
        </div>
      </div>
    </section>
  );
}
