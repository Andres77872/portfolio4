import { useEffect, useRef } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);

  // This creates parallel structure with the Header component
  useEffect(() => {
    const updateFooterHeight = () => {
      if (footerRef.current) {
        const height = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--footer-height', `${height}px`);
      }
    };

    // Initial update
    updateFooterHeight();

    // Update on resize
    window.addEventListener('resize', updateFooterHeight);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateFooterHeight);
    };
  }, []);

  return (
    <footer className="footer" ref={footerRef}>
      <div className="footer__container">
        <div className="footer__content">
          <div className="footer__brand">
            <div className="footer__logo">
              <div className="footer__logo-main">
                <span className="footer__logo-name">arizmendi</span>
                <span className="footer__logo-accent">.io</span>
              </div>
              <p className="footer__tagline">
                Building the future with Artificial Intelligence
              </p>
            </div>
          </div>

          <div className="footer__links">
            <div className="footer__section">
              <h4>Connect</h4>
              <ul>
                <li><a href="mailto:andres@arz.ai" aria-label="Email contact">Email</a></li>
                <li><a href="https://www.linkedin.com/in/arz-ai/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile">LinkedIn</a></li>
                <li><a href="https://github.com/Andres77872" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile">GitHub</a></li>
              </ul>
            </div>
            
            <div className="footer__section">
              <h4>Portfolio</h4>
              <ul>
                <li><a href="#about" aria-label="About section">About</a></li>
                <li><a href="#projects" aria-label="Projects section">Projects</a></li>
                <li><a href="#contact" aria-label="Contact section">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__copy">
            <p>&copy; {currentYear} arz.ai. All rights reserved.</p>
          </div>
          <div className="footer__built">
            <p>Built with React & TypeScript</p>
          </div>
        </div>
      </div>
    </footer>
  );
}