# Portfolio 4

A modern, interactive portfolio built with React, TypeScript, and Vite, featuring an AI-powered chatbot assistant.

## Features

- **Interactive AI Assistant**: Portfolio chatbot with streaming responses and image optimization
- **Modern UI/UX**: Clean, responsive design with smooth animations
- **Performance Optimized**: Memoized components and efficient image loading
- **TypeScript**: Full type safety throughout the application
- **Responsive**: Mobile-first design that works on all devices

## ChatBot Performance Optimizations

The chatbot system has been optimized to prevent image re-fetching and improve overall performance:

### Image Handling Optimizations
- **Optimized Image Component**: Custom `OptimizedImage` component with lazy loading, error handling, and proper caching
- **Loading States**: Visual feedback during image loading with fallback for failed loads
- **Lazy Loading**: Images load only when needed using `loading="lazy"` and `decoding="async"`
- **Browser Caching**: Proper image attributes to leverage browser caching mechanisms

### React Performance Optimizations
- **Memoized Components**: `React.memo()` applied to prevent unnecessary re-renders
- **Stable Keys**: Timestamp-based keys for message lists to prevent React reconciliation issues
- **Memoized Functions**: All event handlers and computations use `useCallback()` and `useMemo()`
- **System Context Caching**: Portfolio data is memoized to prevent recreation on every render

### Component Architecture
- **Separated Concerns**: Individual memoized components for each message type
- **ReactMarkdown Optimization**: Component configuration memoized to prevent recreation
- **Image Link Detection**: Automatic detection and optimization of image links in markdown

### Key Benefits
- ✅ **No More Image Re-fetching**: Images are loaded once and cached properly
- ✅ **Improved Rendering Performance**: Reduced unnecessary component re-renders
- ✅ **Better User Experience**: Faster loading and smoother interactions
- ✅ **Memory Efficiency**: Reduced memory usage through proper component lifecycle management

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

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
