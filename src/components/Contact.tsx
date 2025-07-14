import { useState } from 'react';

const contactLinks = [
  {
    name: "Email",
    label: "andres@arz.ai",
    href: "mailto:andres@arz.ai",
    icon: "✉️",
    description: "Drop me a line anytime"
  },
  {
    name: "LinkedIn",
    label: "Connect on LinkedIn", 
    href: "https://www.linkedin.com/in/arz-ai/",
    icon: "💼",
    description: "Let's connect professionally"
  },
  {
    name: "GitHub",
    label: "Check out my code",
    href: "https://github.com/Andres77872",
    icon: "🚀",
    description: "Explore my repositories"
  }
];

export default function Contact() {
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  return (
    <section id="contact" className="section contact">
      <div className="contact__container">
        <div className="contact__header">
          <h2 className="contact__section-title">
            Let's Connect
          </h2>
          <div className="contact__title-underline"></div>
          <p className="contact__description">
            Ready to build something amazing together? I'm always open to discussing new opportunities, 
            innovative projects, and collaborations in AI and machine learning.
          </p>
        </div>

        <div className="contact__content">
          <div className="contact__text">
            <div className="contact__cta">
              <h3>Get in Touch</h3>
              <p>
                Whether you're looking to develop AI solutions, need consulting on machine learning projects, 
                or just want to discuss the latest in AI research, I'd love to hear from you.
              </p>
              <div className="contact__features">
                <div className="contact__feature">
                  <span className="contact__feature-icon">⚡</span>
                  <span>Quick Response</span>
                </div>
                <div className="contact__feature">
                  <span className="contact__feature-icon">🎯</span>
                  <span>Focused Solutions</span>
                </div>
                <div className="contact__feature">
                  <span className="contact__feature-icon">🤝</span>
                  <span>Collaborative Approach</span>
                </div>
              </div>
            </div>
          </div>

          <div className="contact__links">
            {contactLinks.map((link, index) => (
              <a
                key={index}
                className={`contact__link ${
                  hoveredLink === index ? 'contact__link--hovered' : ''
                }`}
                href={link.href}
                target={link.href.startsWith('mailto:') ? '_self' : '_blank'}
                rel={link.href.startsWith('mailto:') ? '' : 'noopener noreferrer'}
                onMouseEnter={() => setHoveredLink(index)}
                onMouseLeave={() => setHoveredLink(null)}
              >
                <div className="contact__link-icon">
                  {link.icon}
                </div>
                <div className="contact__link-content">
                  <div className="contact__link-name">{link.name}</div>
                  <div className="contact__link-label">{link.label}</div>
                  <div className="contact__link-description">{link.description}</div>
                </div>
                <div className="contact__link-arrow">→</div>
              </a>
            ))}
          </div>
        </div>

        <div className="contact__footer">
          <div className="contact__availability">
            <div className="contact__status">
              <div className="contact__status-indicator"></div>
              <span>Available for new projects</span>
            </div>
            <div className="contact__timezone">
              Based in Mexico • UTC-6
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}