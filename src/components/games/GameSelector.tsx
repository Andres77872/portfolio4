import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { GameSelectorProps } from './types';

export function GameSelector({
  games,
  currentGameIndex,
  onGameChange,
  className,
}: GameSelectorProps) {
  const currentGame = games[currentGameIndex];

  return (
    <div
      className={cn(
        'absolute -bottom-7 left-1/2 -translate-x-1/2',
        'flex items-center gap-2 py-1.5 px-3',
        'bg-background/80 backdrop-blur-xl',
        'rounded-full border border-border/70',
        'transition-all duration-200',
        'hover:bg-background/95 hover:border-border',
        'hover:-translate-x-1/2 hover:-translate-y-px',
        'shadow-sm hover:shadow-md',
        'max-xs:-bottom-2 max-xs:gap-1 max-xs:py-1 max-xs:px-2',
        className,
      )}
      role="tablist"
      aria-label="Game selection"
    >
      {/* Game indicator dots */}
      <div className="flex gap-1.5 items-center" role="tablist">
        {games.map((game, index) => (
          <button
            key={game.id}
            role="tab"
            aria-selected={index === currentGameIndex}
            aria-controls={`game-panel-${game.id}`}
            tabIndex={index === currentGameIndex ? 0 : -1}
            className={cn(
              'w-[7px] h-[7px] rounded-full border-none p-0 cursor-pointer',
              'bg-foreground/30 transition-all duration-200',
              'hover:bg-foreground/55 hover:scale-130',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              'max-xs:w-1.5 max-xs:h-1.5',
              index === currentGameIndex && 'bg-primary scale-115',
            )}
            onClick={() => onGameChange(index)}
            aria-label={game.name}
            title={game.description ?? game.name}
          />
        ))}
      </div>

      {/* Current game name badge */}
      <Badge
        variant="outline"
        className={cn(
          'text-xs font-medium tracking-wide whitespace-nowrap',
          'bg-transparent border-transparent',
          'text-foreground/75',
          'max-xs:text-[10px]',
        )}
      >
        {currentGame.name}
      </Badge>
    </div>
  );
}
