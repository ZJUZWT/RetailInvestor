import { useGameStore } from '../stores/gameStore';
import { RARITY_COLORS } from '../types';

export function EventDisplay() {
  const { currentEvent } = useGameStore();

  if (!currentEvent) return null;

  const borderColor = RARITY_COLORS[currentEvent.rarity];

  return (
    <div
      className="rounded-lg p-4 mb-3 animate-fadeIn"
      style={{
        background: `linear-gradient(135deg, ${borderColor}15, #0e0e18)`,
        border: `1px solid ${borderColor}60`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: `${borderColor}30`, color: borderColor }}
        >
          {currentEvent.rarity === 'common' ? '常见' : currentEvent.rarity === 'rare' ? '稀有' : '传说'}
        </span>
        <h4 className="text-white font-bold text-sm">{currentEvent.title}</h4>
      </div>

      <p className="text-gray-300 text-sm mb-2">{currentEvent.description}</p>

      <div className="flex flex-wrap gap-1">
        {currentEvent.effects.map((effect, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
          >
            {effect.description}
          </span>
        ))}
      </div>
    </div>
  );
}
