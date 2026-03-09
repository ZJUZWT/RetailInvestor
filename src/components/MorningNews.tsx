import { useGameStore } from '../stores/gameStore';

export function MorningNews() {
  const { phase, day, currentEvent } = useGameStore();
  const historyDays = useGameStore(s => s.historyDays);
  const { advancePhase } = useGameStore(s => s.actions);

  if (phase !== 'morning_news') return null;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-3">📰 晨报 - 第 {day - historyDays} 天</h3>

      {currentEvent && (
        <div className="mb-4">
          <p className="text-gray-300 text-sm mb-1 font-bold">{currentEvent.title}</p>
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
