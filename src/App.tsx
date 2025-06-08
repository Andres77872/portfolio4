import './App.css';

import { Header, About, Projects, Contact, Footer } from './components';

function App() {
  return (
    <div className="App">
      <Header />

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
