import { useGameStore } from '../stores/gameStore';
import { RARITY_COLORS } from '../types';

export function MorningNews() {
  const { phase, day, currentEvent } = useGameStore();
  const historyDays = useGameStore(s => s.historyDays);
  const { advancePhase } = useGameStore(s => s.actions);

  if (phase !== 'morning_news') return null;

  const borderColor = currentEvent ? RARITY_COLORS[currentEvent.rarity] : undefined;

  const eventAnimClass = currentEvent
    ? currentEvent.rarity === 'legendary'
      ? 'animate-scaleIn animate-glowPulseGold'
      : currentEvent.rarity === 'rare'
        ? 'animate-fadeIn animate-glowPulseBlue'
        : 'animate-fadeIn'
    : '';

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4 animate-fadeIn">
      <h3 className="text-white font-bold mb-3">📰 晨报 - 第 {day - historyDays} 天</h3>

      {currentEvent && borderColor && (
        <div
          key={currentEvent.id}
          className={`mb-4 rounded-lg p-3 ${eventAnimClass}`}
          style={{
            background: `linear-gradient(135deg, ${borderColor}15, #0e0e18)`,
            border: `1px solid ${borderColor}60`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: `${borderColor}30`, color: borderColor }}
            >
              {currentEvent.rarity === 'common' ? '常见' : currentEvent.rarity === 'rare' ? '稀有' : '传说'}
            </span>
            <p className="text-gray-300 text-sm font-bold">{currentEvent.title}</p>
          </div>
          <p className="text-gray-400 text-sm">{currentEvent.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {currentEvent.effects.map((e, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                {e.description}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={advancePhase}
        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
      >
        开盘！📈
      </button>
    </div>
  );
}
