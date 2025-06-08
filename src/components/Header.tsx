import { useEffect, useRef } from 'react';
import Navbar from './Navbar';

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);

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

  return (
    <header className="header" ref={headerRef}>
      <div className="header__content">
        <div className="header__logo">
          <a href="#" className="header__logo-link">
            <span className="header__logo-text">Portfolio</span>
          </a>
        </div>

        <Navbar />

        <div className="header__links">
          <a 
            href="https://github.com/Andres77872/portfolio4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="header__github-link"
            aria-label="GitHub repository"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
