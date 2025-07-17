// Portfolio App - Main Component
import './App.css';

import { Header, Hero, About, Projects, Contact, Footer, ChatBot } from './components';
import { ModalProvider } from './contexts/ModalContext';

function App() {
  // No scroll behavior - keeping original header style

  return (
    <ModalProvider>
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
    </ModalProvider>
  );
}

export default App;
