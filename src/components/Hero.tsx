import React, { useEffect, useState } from 'react';
import NeuralNexus from '../games/neural-nexus/NeuralNexus';
import MatrixRPG from '../games/matrix-rpg/MatrixRPG';

const roles = [
  "AI Developer",
  "LLM Engineer", 
  "Machine Learning Engineer",
  "Full Stack Developer"
];

export default function Hero() {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  
  // Available minigames
  const games = [
    { component: NeuralNexus, name: "Neural Nexus" },
    { component: MatrixRPG, name: "Matrix RPG" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentRoleIndex((prev) => (prev + 1) % roles.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '0');
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="hero">
      <div className="hero__content">
        <div className="hero__text">
          <div className="hero__greeting">
            <span className="hero__wave">👋</span>
            Hi, I'm Andres
          </div>
          
          <h1 className="hero__title">
            <span className="hero__title-main">Building the Future with</span>
            <span className="hero__title-accent">Artificial Intelligence</span>
          </h1>
          
          <div className="hero__role">
            <span className="hero__role-prefix">I'm a </span>
            <span 
              className={`hero__role-text ${isAnimating ? 'hero__role-text--animating' : ''}`}
              key={currentRoleIndex}
            >
              {roles[currentRoleIndex]}
            </span>
          </div>
          
          <p className="hero__description">
            Specializing in Generative AI, Large Language Models, and autonomous agent systems. 
            I transform cutting-edge research into production-ready AI solutions.
          </p>
          
          <div className="hero__actions">
            <button 
              className="hero__cta hero__cta--primary"
              onClick={() => scrollToSection('projects')}
            >
              View My Work
              <span className="hero__cta-icon">→</span>
            </button>
            <button 
              className="hero__cta hero__cta--secondary"
              onClick={() => scrollToSection('contact')}
            >
              Let's Connect
            </button>
          </div>
        </div>
        
        <div className="hero__visual">
          <div>
            {/* Render current game */}
            {React.createElement(games[currentGameIndex].component, {
              className: "hero__ai-canvas"
            })}

            {/* Game switcher overlay */}
            <div className="hero__game-switcher">
              <div className="hero__game-pagination">
                {games.map((game, index) => (
                  <button
                    key={game.name}
                    className={`hero__game-dot ${index === currentGameIndex ? 'hero__game-dot--active' : ''}`}
                    onClick={() => setCurrentGameIndex(index)}
                    aria-label={`Switch to ${game.name}`}
                    title={game.name}
                  />
                ))}
              </div>
              <div className="hero__game-title">
                {games[currentGameIndex].name}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero__scroll-indicator">
        <div className="hero__scroll-arrow" onClick={() => scrollToSection('about')}>
          <span>Scroll to explore</span>
          <div className="hero__scroll-icon">↓</div>
        </div>
      </div>
    </section>
  );
}
