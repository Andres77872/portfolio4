export default function Contact() {
  return (
    <section id="contact" className="section contact">
      <h2>Contact</h2>
      <p className="contact__description">
        Feel free to reach out via email, LinkedIn, or GitHub—I’d love to connect!
      </p>
      <div className="contact__links">
        <a
          className="contact__link"
          href="mailto:andres@arz.ai"
        >
          andres@arz.ai
        </a>
        <a
          className="contact__link"
          href="https://linkedin.com/in/jose-andres-arizmendi-sanchez-81b086217"
          target="_blank"
          rel="noopener noreferrer"
        >
          LinkedIn
        </a>
        <a
          className="contact__link"
          href="https://github.com/Andres77872"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </section>
  );
}