export default function Navbar() {
  return (
    <nav className="navbar">
      <ul className="navbar__list">
        <li className="navbar__item">
          <a className="navbar__link" href="#about">About</a>
        </li>
        <li className="navbar__item">
          <a className="navbar__link" href="#projects">Projects</a>
        </li>
        <li className="navbar__item">
          <a className="navbar__link" href="#contact">Contact</a>
        </li>
      </ul>
    </nav>
  );
}