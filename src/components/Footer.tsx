export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
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
                <li><a href="mailto:andres@arz.ai">Email</a></li>
                <li><a href="https://www.linkedin.com/in/arz-ai/" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
                <li><a href="https://github.com/Andres77872" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              </ul>
            </div>
            
            <div className="footer__section">
              <h4>Portfolio</h4>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#projects">Projects</a></li>
                <li><a href="#contact">Contact</a></li>
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