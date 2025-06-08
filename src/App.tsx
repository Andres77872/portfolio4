import './App.css';

import { Header, About, Projects, Contact, Footer, ChatBot } from './components';

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

      {/* Floating ChatBot button */}
      <ChatBot />
    </div>
  );
}

export default App;
