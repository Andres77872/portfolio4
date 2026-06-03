import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const THEME_CYCLE = ["system", "light", "dark"] as const;
const THEME_LABELS = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
} as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const cycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(theme as typeof THEME_CYCLE[number])
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length
    setTheme(THEME_CYCLE[nextIndex])
  }

  // Determine which icon to show based on current theme
  const getIconState = () => {
    if (!mounted) return { sun: true, moon: false, monitor: false }
    
    if (theme === "system") {
      // Show monitor icon when system theme is active
      return { sun: false, moon: false, monitor: true }
    }
    
    // Show sun/moon based on resolved theme for light/dark
    const isDark = resolvedTheme === "dark"
    return { sun: !isDark, moon: isDark, monitor: false }
  }

  const iconState = getIconState()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          className="relative h-9 w-9 rounded-none"
          aria-label={`Current: ${THEME_LABELS[theme as keyof typeof THEME_LABELS]}. Click to change.`}
        >
          <Sun 
            className={cn(
              "size-4 transition-all duration-200",
              iconState.sun ? "rotate-0 scale-100" : "-rotate-90 scale-0"
            )} 
          />
          <Moon 
            className={cn(
              "absolute size-4 transition-all duration-200",
              iconState.monitor ? "-rotate-90 scale-0" : "",
              iconState.moon ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )} 
          />
          <Monitor 
            className={cn(
              "absolute size-4 transition-all duration-200",
              iconState.monitor ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )} 
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8}>
        <p className="text-xs font-medium">
          {mounted ? THEME_LABELS[theme as keyof typeof THEME_LABELS] : "Loading..."}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
