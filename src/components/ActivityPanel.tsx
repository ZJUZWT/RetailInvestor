import { useGameStore } from '../stores/gameStore';
import { ACTIVITIES } from '../data/activities';

/**
 * 活动面板 — 常驻显示，任何时间都可以做活动消耗精力
 */
export function ActivityPanel() {
  const { activitiesDoneToday, gameStatus, vitality, job } = useGameStore();
  const { doActivity } = useGameStore(s => s.actions);

  if (gameStatus !== 'playing') return null;

  const isSleeping = vitality.isSleeping;
  const energy = Math.round(vitality.energy);

  return (
    <div className="p-4">
      <h3 className="text-white font-bold mb-3 text-sm">
        🎯 活动 <span className="text-cyan-400 text-xs font-normal">⚡{energy}/{vitality.maxEnergy}</span>
      </h3>

      {isSleeping && (
        <div className="text-center py-2 text-gray-500 text-sm">
          💤 正在睡觉，无法进行活动...
        </div>
      )}

      <div className="space-y-2">
        {ACTIVITIES.map(activity => {
          const done = activitiesDoneToday.includes(activity.id);
          const noEnergy = vitality.energy < activity.energyCost;

          // 找工作特殊逻辑：已有工作时禁用
          const isFindJob = activity.id === 'find_job';
          const hasJob = job.employed;
          const jobBlocked = isFindJob && hasJob;

          const disabled = done || noEnergy || isSleeping || jobBlocked;

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
                <span className={`text-xs ${noEnergy ? 'text-red-400' : 'text-cyan-400'}`}>
                  ⚡{activity.energyCost}
                </span>
              </div>
              <p className="text-xs mt-1 ml-7 text-gray-500">{activity.description}</p>
              {done && <p className="text-xs mt-1 ml-7 text-gray-600">（今天已做过）</p>}
              {!done && noEnergy && !isSleeping && !jobBlocked && (
                <p className="text-xs mt-1 ml-7 text-red-400/70">（精力不足）</p>
              )}
              {jobBlocked && (
                <p className="text-xs mt-1 ml-7 text-yellow-400/70">（需要先离职才能找工作）</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
