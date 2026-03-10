import { useGameStore } from '../stores/gameStore';
import { getWeekCalendar } from '../engine/CalendarSystem';
import { DayClock } from './DayClock';

export function Calendar() {
  const { calendar, gameStatus } = useGameStore();

  if (gameStatus !== 'playing') return null;

  const weekDays = getWeekCalendar(calendar.date);

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-3">
      {/* 时间轮盘 */}
      <DayClock />

      {/* 周历 */}
      <div className="grid grid-cols-7 gap-1 mt-3">
        {weekDays.map(day => (
          <div
            key={day.date}
            className={`text-center py-1 rounded text-xs transition-colors ${
              day.isToday
                ? 'bg-blue-600/30 border border-blue-500/50 text-white font-bold'
                : day.isTradingDay
                  ? 'bg-[#1a1a2e] text-gray-400'
                  : 'bg-gray-900/50 text-gray-600'
            }`}
          >
            <div className="text-[10px]">{day.label.slice(1)}</div>
            <div className={day.isToday ? 'text-blue-400' : ''}>{day.dayNum}</div>
            {!day.isTradingDay && <div className="text-[8px] text-gray-600">休</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
