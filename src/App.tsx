import React, { useEffect } from 'react';
import './App.css';

import { Header, Hero, About, Projects, Contact, Footer, ChatBot } from './components';

function App() {
  // Simple header scroll behavior without complex throttling
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('.header');
      if (header) {
        if (window.scrollY > 100) {
          header.classList.add('header--scrolled');
        } else {
          header.classList.remove('header--scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
