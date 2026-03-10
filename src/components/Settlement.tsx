import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useCountUp } from '../hooks/useCountUp';

export function Settlement() {
  const { phase, cash, shares, currentPrice, goal, dailyExpense, day, peakAssets, gameStatus } = useGameStore();
  const historyDays = useGameStore(s => s.historyDays);
  const { advancePhase } = useGameStore(s => s.actions);
  const autoAdvancedRef = useRef(false);

  const totalAssets = cash + shares * currentPrice;
  const progress = (totalAssets / goal.targetAmount * 100).toFixed(1);

  // Hooks must be called before any conditional return (Rules of Hooks)
  const animatedCash = useCountUp(cash, 1500, 2);
  const animatedMarketValue = useCountUp(shares * currentPrice, 1500, 2);
  const animatedAssets = useCountUp(totalAssets, 1500, 2);
  const animatedPeak = useCountUp(peakAssets, 1200, 2);
  const animatedProgress = useCountUp(parseFloat(progress), 1200, 1);

  // 结算展示4秒后自动进入下一天
  useEffect(() => {
    if (phase !== 'settlement') {
      autoAdvancedRef.current = false;
      return;
    }
    // 如果游戏已经结束（赢/输），不自动推进
    if (gameStatus !== 'playing') return;
    if (autoAdvancedRef.current) return;
    const timer = setTimeout(() => {
      autoAdvancedRef.current = true;
      advancePhase();
    }, 4000);
    return () => clearTimeout(timer);
  }, [phase, gameStatus, advancePhase]);

  if (phase !== 'settlement') return null;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4 animate-fadeIn">
      <h3 className="text-white font-bold mb-3">📊 今日结算 - 第 {day - historyDays} 天</h3>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between text-gray-400">
          <span>现金余额</span>
          <span className={`font-mono ${cash < 0 ? 'text-red-500' : 'text-green-400'}`}>¥{animatedCash}</span>
        </div>
        {cash < 0 && (
          <div className="bg-red-900/30 border border-red-800 rounded p-2">
            <p className="text-red-400 text-xs font-bold">⚠️ 现金已为负！尽快卖出股票回笼资金，否则将面临破产！</p>
          </div>
        )}
        {shares > 0 && (
          <div className="flex justify-between text-gray-400">
            <span>持仓市值</span>
            <span className="text-blue-400 font-mono">¥{animatedMarketValue}</span>
          </div>
        )}
        <div className="border-t border-gray-800 pt-2 flex justify-between text-white font-bold">
          <span>总资产</span>
          <span className="font-mono">¥{animatedAssets}</span>
        </div>
        <div className="flex justify-between text-gray-500 text-xs">
          <span>历史峰值</span>
          <span className="font-mono">¥{animatedPeak}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>明日生活费</span>
          <span className="text-orange-400 font-mono">-¥{dailyExpense}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>🎯 目标进度</span>
          <span className="text-yellow-400 font-mono">{animatedProgress}%</span>
        </div>
      </div>

      {/* 自动进入下一天提示 */}
      {gameStatus === 'playing' && (
        <div className="text-center py-2">
          <span className="text-indigo-400 text-sm animate-pulse">🌙 夜幕降临，新的一天即将到来...</span>
        </div>
      )}
    </div>
  );
}
