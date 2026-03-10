import { useGameStore } from '../stores/gameStore';
import { getDayOfWeekLabel, minuteToTimeStr } from '../engine/CalendarSystem';

export function StatusBar() {
  const { cash, shares, currentPrice, goal, gameStatus, vitality, calendar } =
    useGameStore();

  if (gameStatus !== 'playing') return null;

  const totalAssets = cash + shares * currentPrice;
  const progress = Math.min(100, (totalAssets / goal.targetAmount) * 100);

  // 判断白天/夜晚
  const isDaytime = calendar.minuteOfDay >= 360 && calendar.minuteOfDay < 1080;

  return (
    <div className="bg-[#12121a] border-b border-gray-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-lg font-bold text-white">散户大冒险</span>

        {/* 日期时间 + 太阳/月亮小图标 */}
        <span className="text-gray-400 text-xs">
          {isDaytime ? '☀️' : '🌙'} {calendar.date} {getDayOfWeekLabel(calendar.dayOfWeek)}
          <span className="text-yellow-400 font-mono ml-1">{minuteToTimeStr(calendar.minuteOfDay)}</span>
        </span>

        {/* 三属性条 */}
        <div className="flex items-center gap-2">
          <MiniBar emoji="⚡" value={vitality.energy} max={vitality.maxEnergy} color="#eab308" lowColor="#ef4444" />
          <MiniBar emoji="🍚" value={vitality.hunger} max={vitality.maxHunger} color="#22c55e" lowColor="#f97316" />
          <MiniBar emoji="🧠" value={vitality.sanity} max={vitality.maxSanity} color="#3b82f6" lowColor="#a855f7" />
        </div>

        {/* 睡觉状态 */}
        {vitality.isSleeping && (
          <span className="text-indigo-400 text-xs animate-pulse">💤 睡觉中</span>
        )}
        {vitality.isInsane && (
          <span className="text-purple-400 text-xs animate-pulse">🤯 失控</span>
        )}

        <span className={`font-mono ${cash < 0 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
          💰 ¥{cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {cash < 0 && ' ⚠️'}
        </span>

        {shares > 0 && (
          <span className="text-blue-400 font-mono">
            📦 {shares}股 ≈ ¥{(shares * currentPrice).toFixed(2)}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-gray-400 text-xs">🎯 {goal.title}</span>
          <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: progress >= 100 ? '#22c55e' : progress >= 50 ? '#eab308' : '#ef4444',
              }}
            />
          </div>
          <span className="text-xs text-gray-500 font-mono">
            {progress.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

/** 迷你属性条 */
function MiniBar({ emoji, value, max, color, lowColor }: {
  emoji: string;
  value: number;
  max: number;
  color: string;
  lowColor: string;
}) {
  const pct = (value / max) * 100;
  const isLow = pct < 25;
  return (
    <div className="flex items-center gap-1" title={`${emoji} ${Math.round(value)}/${max}`}>
      <span className="text-xs">{emoji}</span>
      <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isLow ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%`, backgroundColor: isLow ? lowColor : color }}
        />
      </div>
      <span className={`text-[10px] font-mono ${isLow ? 'text-red-400' : 'text-gray-500'}`}>
        {Math.round(value)}
      </span>
    </div>
  );
}
