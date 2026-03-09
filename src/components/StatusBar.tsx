import { useGameStore } from '../stores/gameStore';
import { PHASE_NAMES } from '../types';

export function StatusBar() {
  const { day, phase, stamina, maxStamina, cash, shares, currentPrice, goal, gameStatus, dailyExpense } =
    useGameStore();
  const historyDays = useGameStore(s => s.historyDays);

  if (gameStatus !== 'playing') return null;

  const totalAssets = cash + shares * currentPrice;
  const progress = Math.min(100, (totalAssets / goal.targetAmount) * 100);

  return (
    <div className="bg-[#12121a] border-b border-gray-800 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="text-lg font-bold text-white">散户大冒险</span>
        <span className="text-gray-400">
          Day <span className="text-white font-mono">{day - historyDays}</span>
        </span>
        <span className="bg-[#1a1a2e] px-2 py-0.5 rounded text-yellow-400 text-xs">
          {PHASE_NAMES[phase]}
        </span>

        <div className="flex items-center gap-1">
          {Array.from({ length: maxStamina }).map((_, i) => (
            <span key={i} className={i < stamina ? 'text-yellow-400' : 'text-gray-700'}>
              ⚡
            </span>
          ))}
        </div>

        <span className={`font-mono ${cash < 0 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
          💰 ¥{cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          {cash < 0 && ' ⚠️'}
        </span>

        {shares > 0 && (
          <span className="text-blue-400 font-mono">
            📦 {shares}股 ≈ ¥{(shares * currentPrice).toFixed(2)}
          </span>
        )}

        <span className="text-gray-500 text-xs">
          生活费 ¥{dailyExpense}/天
        </span>

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
