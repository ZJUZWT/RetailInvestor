import { useGameStore } from '../stores/gameStore';
import { RARITY_COLORS } from '../types';

export function EventLog() {
  const eventLog = useGameStore(s => s.eventLog);
  const historyDays = useGameStore(s => s.historyDays);

  if (eventLog.length === 0) return null;

  // 倒序显示，最新的在最上面
  const reversed = [...eventLog].reverse();

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-2 text-sm">📜 事件日志</h3>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {reversed.map((entry, i) => {
          const color = RARITY_COLORS[entry.event.rarity];
          return (
            <div key={i} className="flex gap-2 items-start text-xs">
              <span className="text-gray-600 shrink-0 font-mono">
                D{entry.day - historyDays}
              </span>
              <span
                className="shrink-0 w-1 h-1 rounded-full mt-1.5"
                style={{ backgroundColor: color }}
              />
              <span className="text-gray-400">
                <span style={{ color }} className="font-medium">{entry.event.title}</span>
                {' — '}
                {entry.event.effects.map(e => e.description).filter(Boolean).join('，') || entry.event.description.slice(0, 30)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
