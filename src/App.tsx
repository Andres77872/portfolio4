// Portfolio App - Main Component
import { Header, Hero, About, Projects, Contact, Footer, ChatBot } from './components';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <ModalProvider>
          <div className="mx-auto min-h-screen flex flex-col bg-background text-foreground font-sans">
            <Header />
            
            <main className="grow flex flex-col gap-12 lg:gap-16">
              <Hero />
              <About />
              <Projects />
              <Contact />
            </main>
            
            <Footer />
            <ChatBot />
          </div>
        </ModalProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
