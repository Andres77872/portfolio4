export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer__text">
        &copy; {new Date().getFullYear()} Andres. All rights reserved.
      </p>
    </footer>
  );
}