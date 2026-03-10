import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { ACTIVITIES } from '../data/activities';

export function ActivityPanel() {
  const { phase, stamina, maxStamina, activitiesDoneToday } = useGameStore();
  const { doActivity, advancePhase } = useGameStore(s => s.actions);
  const autoAdvancedRef = useRef(false);

  // 盘后活动8秒后自动进入结算（给玩家时间做活动）
  useEffect(() => {
    if (phase !== 'after_hours') {
      autoAdvancedRef.current = false;
      return;
    }
    if (autoAdvancedRef.current) return;
    const timer = setTimeout(() => {
      autoAdvancedRef.current = true;
      advancePhase();
    }, 8000);
    return () => clearTimeout(timer);
  }, [phase, advancePhase]);

  if (phase !== 'after_hours') return null;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4 animate-fadeIn">
      <h3 className="text-white font-bold mb-3">
        🌙 盘后时间 <span className="text-yellow-400 text-sm font-normal">⚡ {stamina}/{maxStamina}</span>
      </h3>

      <div className="space-y-2 mb-4">
        {ACTIVITIES.map(activity => {
          const done = activitiesDoneToday.includes(activity.id);
          const noStamina = stamina < activity.staminaCost;
          const disabled = done || noStamina;

          return (
            <button
              key={activity.id}
              onClick={() => doActivity(activity.id)}
              disabled={disabled}
              className={`w-full text-left p-3 rounded transition-colors ${
                disabled
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                  : 'bg-[#1a1a2e] text-gray-300 hover:bg-[#252540] cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{activity.emoji}</span>
                  <span className="font-bold text-sm">{activity.name}</span>
                </div>
                <span className="text-xs text-yellow-400">⚡{activity.staminaCost}</span>
              </div>
              <p className="text-xs mt-1 ml-7 text-gray-500">{activity.description}</p>
              {done && <p className="text-xs mt-1 ml-7 text-gray-600">（今天已做过）</p>}
            </button>
          );
        })}
      </div>

      {/* 自动结算倒计时提示 */}
      <div className="text-center py-2">
        <span className="text-gray-400 text-sm animate-pulse">🌙 做些盘后活动吧，时间在流逝...</span>
      </div>
    </div>
  );
}
