import { useGameStore } from '../stores/gameStore';
import { getDayOfWeekLabel, minuteToTimeStr } from '../engine/CalendarSystem';

export function StatusBar() {
  const { cash, shares, currentPrice, goal, gameStatus, vitality, calendar, playbackSpeed, job } =
    useGameStore();
  if (gameStatus !== 'playing') return null;

  const totalAssets = cash + shares * currentPrice;
  const progress = Math.min(100, (totalAssets / goal.targetAmount) * 100);

  const isDaytime = calendar.minuteOfDay >= 360 && calendar.minuteOfDay < 1080;
  const isTrading = calendar.marketPhase === 'am_trading' || calendar.marketPhase === 'pm_trading';

  // 市场状态标签
  const marketLabel = isTrading ? '交易中' :
    calendar.marketPhase === 'lunch_break' ? '午休' :
    calendar.marketPhase === 'pre_market' ? '盘前' :
    calendar.marketPhase === 'after_hours' ? '盘后' :
    '休市';

  const marketColor = isTrading ? '#ef4444' :
    calendar.marketPhase === 'lunch_break' ? '#eab308' :
    '#6b7280';

  return (
    <div className="bg-[#12121a] border-b border-gray-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-lg font-bold text-white">散户大冒险</span>

        {/* 日期时间 */}
        <span className="text-gray-400 text-xs">
          {isDaytime ? '☀️' : '🌙'} {calendar.date} {getDayOfWeekLabel(calendar.dayOfWeek)}
          <span className="text-yellow-400 font-mono ml-1">{minuteToTimeStr(calendar.minuteOfDay)}</span>
        </span>

        {/* 市场状态 */}
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${marketColor}20`,
            color: marketColor,
          }}
        >
          {marketLabel}
        </span>

        {/* 速度指示 */}
        <span className="text-xs text-gray-500">
          {playbackSpeed === 0 ? '⏸ 暂停' : `${playbackSpeed}x`}
        </span>

        {/* 三属性条 */}
        <div className="flex items-center gap-2">
          <MiniBar emoji="⚡" value={vitality.energy} max={vitality.maxEnergy} color="#eab308" lowColor="#ef4444" />
          <MiniBar emoji="🍚" value={vitality.hunger} max={vitality.maxHunger} color="#22c55e" lowColor="#f97316" />
          <MiniBar emoji="🧠" value={vitality.sanity} max={vitality.maxSanity} color="#3b82f6" lowColor="#a855f7" />
        </div>

        {/* 状态 */}
        {vitality.isSleeping && (
          <span className="text-indigo-400 text-xs animate-pulse">💤 睡觉中</span>
        )}
        {vitality.isInsane && (
          <span className="text-purple-400 text-xs animate-pulse">🤯 失控</span>
        )}
        {job.employed && job.isWorkingHours && (
          <span className={`text-xs ${job.isSlacking
            ? job.isOnToilet
              ? 'text-amber-400'
              : 'text-red-400 animate-pulse'
            : 'text-yellow-400'
          }`}>
            {job.isSlacking
              ? job.isOnToilet ? '🚽 拉屎中' : '🐟 摸鱼中'
              : `🏢 工作${Math.round(job.workProgress)}%`}
          </span>
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
