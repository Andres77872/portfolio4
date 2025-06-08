import { useState, useEffect, useRef } from 'react';

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  // Function to determine which section is currently in view and close menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      // Close menu when scrolling
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }

      // Determine active section
      const sections = ['about', 'projects', 'contact'];
      const currentSection = sections.find(section => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 150 && rect.bottom >= 150;
        }
        return false;
      });

      setActiveSection(currentSection || '');
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node) && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="navbar__container" ref={navRef}>
        <button 
          className={`navbar__toggle ${isMenuOpen ? 'navbar__toggle--active' : ''}`}
          onClick={toggleMenu}
          aria-expanded={isMenuOpen}
          aria-controls="navbar-menu"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          <span className="navbar__toggle-bar"></span>
          <span className="navbar__toggle-bar"></span>
          <span className="navbar__toggle-bar"></span>
        </button>

        <ul 
          id="navbar-menu"
          className={`navbar__list ${isMenuOpen ? 'navbar__list--open' : ''}`}
        >
          <li className="navbar__item">
            <a 
              className={`navbar__link ${activeSection === 'about' ? 'navbar__link--active' : ''}`} 
              href="#about"
              onClick={closeMenu}
              aria-current={activeSection === 'about' ? 'page' : undefined}
            >
              About
            </a>
          </li>
          <li className="navbar__item">
            <a 
              className={`navbar__link ${activeSection === 'projects' ? 'navbar__link--active' : ''}`} 
              href="#projects"
              onClick={closeMenu}
              aria-current={activeSection === 'projects' ? 'page' : undefined}
            >
              Projects
            </a>
          </li>
          <li className="navbar__item">
            <a 
              className={`navbar__link ${activeSection === 'contact' ? 'navbar__link--active' : ''}`} 
              href="#contact"
              onClick={closeMenu}
              aria-current={activeSection === 'contact' ? 'page' : undefined}
            >
              Contact
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
