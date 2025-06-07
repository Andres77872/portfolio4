import './App.css';

import { Header, Navbar, About, Projects, Contact, Footer } from './components';

function App() {
  return (
    <div className="App">
      <Header />
      <Navbar />

      <main>
        <About />
        <Projects />
        <Contact />
      </main>

      <Footer />
    </div>
  );
}

export default App;