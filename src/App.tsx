// Portfolio App - Main Component
import { Header, Intro, Projects, Playground, About, Footer, ChatBot } from './components';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useInitialHashScroll } from '@/hooks/useInitialHashScroll';

function App() {
  useInitialHashScroll();

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <div id="top" className="flex min-h-screen flex-col font-sans text-foreground">
          <a
            href="#main"
            className="sr-only z-[300] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <Header />

          <main id="main" tabIndex={-1} className="grow outline-none">
            <Intro />
            <Projects />
            <Playground />
            <About />
          </main>

          <Footer />
          <ChatBot />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
