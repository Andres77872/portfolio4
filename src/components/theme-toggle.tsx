import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ResolvedTheme = "light" | "dark"

function getResolvedTheme(theme: string | undefined, resolvedTheme: string | undefined): ResolvedTheme {
  if (resolvedTheme === "dark" || resolvedTheme === "light") return resolvedTheme
  if (theme === "dark" || theme === "light") return theme

  return "light"
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = mounted ? getResolvedTheme(theme, resolvedTheme) : "light"
  const isDark = currentTheme === "dark"

  const toggleTheme = () => {
    const nextTheme = getResolvedTheme(theme, resolvedTheme) === "dark" ? "light" : "dark"

    setTheme(nextTheme)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "ml-1 size-8 rounded-full p-0 text-muted-foreground",
        "transition-colors duration-200",
        "hover:bg-accent/45 hover:text-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1",
        "dark:hover:bg-accent/35 contrast-more:text-foreground",
      )}
      aria-label={mounted ? `Toggle theme. Current: ${currentTheme}.` : "Toggle theme"}
      aria-pressed={mounted ? isDark : undefined}
      onClick={toggleTheme}
    >
      <span className="relative flex size-4 items-center justify-center" aria-hidden="true">
        <Sun
          className={cn(
            "size-4 transition-all duration-200",
            isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100",
          )}
        />
        <Moon
          className={cn(
            "absolute size-4 transition-all duration-200",
            isDark ? "rotate-0 scale-100" : "rotate-90 scale-0",
          )}
        />
      </span>
    </Button>
  )
}
