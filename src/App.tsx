import './App.css';

function App() {
  return (
    <div className="App">
      {/* Header Section */}
      <header className="header">
        <h1>Your Name</h1>
        <p>Frontend Developer & Designer</p>
      </header>

      {/* Navigation Bar */}
      <nav className="navbar">
        <ul>
          <li><a href="#about">About</a></li>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      {/* Main Content */}
      <main>
        {/* About Section */}
        <section id="about" className="section about">
          <h2>About Me</h2>
          <p>Hello! I'm a Mexican System Engineer specialized in Machine Learning (ML) and Web Services (WS) Back-End. I'm working in research, designing and deploying ML models as WS in self-hosted servers, ML models for segmentation, detection and OCR in the computer vision field, also predictive models for auto tagging images and efficient search engines. Welcome to my portfolio!</p>
        </section>

        {/* Projects Section */}
        <section id="projects" className="section projects">
          <h2>My Projects</h2>
          <div className="cards-container">
            <div className="card">
              <h3>Project One</h3>
              <p>Brief description of the project with key features and technologies used.</p>
            </div>
            <div className="card">
              <h3>Project Two</h3>
              <p>Another interesting project you have accomplished.</p>
            </div>
            {/* Add more cards/projects here */}
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="section contact">
          <h2>Contact</h2>
          <p>Email: yourname@example.com | LinkedIn | GitHub</p>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Your Name. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;