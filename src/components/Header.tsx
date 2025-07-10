import { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Update CSS variable with header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    // Initial update
    updateHeaderHeight();

    // Update on resize
    window.addEventListener('resize', updateHeaderHeight);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`header ${isScrolled ? 'header--scrolled' : ''}`} ref={headerRef}>
      <div className="header__content">
        <div className="header__logo">
          <a href="#" className="header__logo-link">
            <div className="header__logo-content">
              <div className="header__logo-main">
                <span className="header__logo-name">arizmendi</span>
                <span className="header__logo-accent">.ai</span>
              </div>
              <div className="header__logo-subtitle">AI Developer</div>
            </div>
          </a>
        </div>

        <Navbar />

        <div className="header__actions">
          <a 
            href="https://github.com/Andres77872/portfolio4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="header__github-link"
            aria-label="GitHub repository"
          >
            <span className="header__github-icon">⚡</span>
            <span className="header__github-text">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
