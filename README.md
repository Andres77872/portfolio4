# Portfolio 4

The portfolio of Andres Arizmendi (AI developer), live at [arizmendi.io](https://arizmendi.io/). Built with React, TypeScript, Vite and Tailwind CSS v4.

## What's on the page

The site is **projects-first**: a compact intro, then the work, then personal details at the bottom.

- **Work** — five featured projects as spotlight cards (one lead + a 2×2 grid) followed by an index of every other project, newest first. Filter by category, by technology stack (several = AND) or by free-text search.
- **Project details** — a modal with the full write-up, facts (release date, status, license, access), languages and technologies, plus prev/next navigation (buttons or ←/→). Every project has a shareable link: `/?project=<slug>`. Filters are in the URL too (`?category=…&stack=…`).
- **Playground** — four experiments that load only when scrolled into view, each linkable with `?experiment=<id>`:
  - **Perceptron on MNIST** (`perceptron`) — ten neurons learn to read handwritten digits from real MNIST data, live in the browser, with weight maps, a learning curve, test errors and a drawing pad.
  - **Game of Life** (`game-of-life`) — Conway's automaton and other life-like rules on a wrap-around grid, with a pattern library.
  - **Neural Nexus** (`neural-nexus`) — a physics toy and scoring game on a neural-network graph.
  - **Matrix RPG** (`matrix-rpg`) — a CRT terminal mystery with an LLM-driven NPC.
- **About** — bio, focus areas that jump to the matching projects, a contact card (with copy-to-clipboard email) and a toolbox built from the project data.
- **Portfolio Assistant** — a streaming chat that answers from the site's own data. Project names, filters and sections in its answers are links that open the project, apply the filter or scroll to the section right on the page. It floats in the corner on desktop and becomes a full-screen sheet on phones; conversations are kept in memory only. See [docs/chatbot.md](docs/chatbot.md).

All project content lives in `src/data/projects.json`; the intro stats, category counts, featured cards, toolbox and chatbot prompt are all derived from it. See [docs/data.md](docs/data.md) to add a project.

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

## Environment Variables

Create a local `.env.local` file with the Vite public variables used by the browser client:

```bash
VITE_CHAT_API_URL=https://llm.arz.ai/v1/completions
VITE_CHAT_PORTFOLIO_AGENT_ID=agt-your-portfolio-assistant-agent-id
VITE_CHAT_MATRIX_RPG_AGENT_ID=agt-your-matrix-rpg-agent-id
VITE_CHAT_API_KEY=
```

The chat API is called anonymously by default. `VITE_CHAT_API_KEY` is optional, client-visible, and only intended for public/sentinel tokens; real secrets do not belong in Vite variables. Without `VITE_CHAT_PORTFOLIO_AGENT_ID` the assistant simply does not render (one console warning names the variable). `.env` and `.env.*` are gitignored; `.env.example` is the committed template.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **CSS Variables** for consistent theming
- **React Markdown** for rich text rendering
- **AI Chat Integration** with streaming responses

## Development

The project uses modern development practices:
- ESLint for code quality
- TypeScript for type safety
- CSS custom properties for theming
- Component-based architecture
- Performance monitoring and optimization
