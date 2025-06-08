export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer__text">
        &copy; {new Date().getFullYear()} arz.ai. All rights reserved.
      </p>
    </footer>
  );
}