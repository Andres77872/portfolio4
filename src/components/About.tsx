import { useMemo } from 'react';
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
      <h2 className="about__section-title">About Me</h2>
      <div className="about__content">
        {data.description.map((paragraph, index) => (
          <p key={index} className="about__description">
            {paragraph}
          </p>
        ))}
      </div>

      {data.skills && data.skills.length > 0 && (
        <div className="about__skills-section">
          <h2 className="about__section-title">Skills</h2>
          <div className="about__skills">
            {data.skills.map((skillGroup, index) => (
              <div key={index} className="about__skill-group">
                <h3 className="about__skill-category">{skillGroup.category}</h3>
                <ul className="about__skill-list">
                  {skillGroup.items.map((skill, skillIndex) => (
                    <li key={skillIndex} className="about__skill-item">{skill}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
