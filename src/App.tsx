// Portfolio App - Main Component
import './App.css';

import { Header, Hero, About, Projects, Contact, Footer, ChatBot } from './components';

function App() {
  // No scroll behavior - keeping original header style

  return (
    <div className="App">
      <Header />
      
      <main>
        <Hero />
        <About />
        <Projects />
        <Contact />
      </main>
      
      <Footer />
      <ChatBot />
    </div>
  );
}

export default App;
