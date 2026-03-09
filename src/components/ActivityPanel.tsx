import { useGameStore } from '../stores/gameStore';
import { ACTIVITIES } from '../data/activities';

export function ActivityPanel() {
  const { phase, stamina, activitiesDoneToday } = useGameStore();
  const { doActivity, advancePhase } = useGameStore(s => s.actions);

  if (phase !== 'after_hours') return null;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-3">
        🌙 盘后活动 <span className="text-yellow-400 text-sm font-normal">⚡{stamina} 剩余体力</span>
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
                <span className="text-xs text-yellow-400">
                  {activity.staminaCost > 0 ? `⚡${activity.staminaCost}` : '免费'}
                </span>
              </div>
              <p className="text-xs mt-1 ml-7 text-gray-500">{activity.description}</p>
              {done && <p className="text-xs mt-1 ml-7 text-gray-600">（今天已做过）</p>}
            </button>
          );
        })}
      </div>

      <button
        onClick={advancePhase}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-colors"
      >
        结束活动，进入结算 →
      </button>
    </div>
  );
}
