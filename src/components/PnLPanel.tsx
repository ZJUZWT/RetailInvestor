import { useGameStore } from '../stores/gameStore';

/**
 * 盈亏面板 — 常驻显示当前持仓和资产信息
 */
export function PnLPanel() {
  const {
    cash, shares, currentPrice, shareCostBasis,
    todayOpen, goal, peakAssets, dailyExpense,
    gameStatus, calendar, stockName, totalTradingDays, job,
  } = useGameStore();

  if (gameStatus !== 'playing') return null;

  const totalAssets = cash + shares * currentPrice;
  const progress = Math.min(100, (totalAssets / goal.targetAmount) * 100);

  // 持仓盈亏
  const holdingValue = shares * currentPrice;
  const holdingCost = shares * shareCostBasis;
  const holdingPnL = holdingValue - holdingCost;
  const holdingPnLPercent = holdingCost > 0 ? (holdingPnL / holdingCost * 100) : 0;

  // 今日股价变化
  const todayChange = todayOpen > 0 ? ((currentPrice - todayOpen) / todayOpen * 100) : 0;

  // 今日持仓浮盈变化
  const todayHoldingPnL = shares > 0 && todayOpen > 0
    ? shares * (currentPrice - todayOpen)
    : 0;

  const isMarketOpen = calendar.marketPhase === 'am_trading' || calendar.marketPhase === 'pm_trading';

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">💰 资产概览</h3>
        <span className="text-xs text-gray-500">
          交易日 {totalTradingDays}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 总资产 */}
        <div className="bg-[#1a1a2e] rounded p-3 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">总资产</div>
          <div className="text-white font-bold font-mono text-lg">
            ¥{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            峰值 ¥{peakAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* 目标进度 */}
        <div className="bg-[#1a1a2e] rounded p-3 border border-gray-700">
          <div className="text-xs text-gray-500 mb-1">🎯 {goal.title}</div>
          <div className={`font-bold font-mono text-lg ${
            progress >= 100 ? 'text-green-400' : progress >= 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {progress.toFixed(1)}%
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, progress)}%`,
                backgroundColor: progress >= 100 ? '#22c55e' : progress >= 50 ? '#eab308' : '#ef4444',
              }}
            />
          </div>
        </div>
      </div>

      {/* 现金 + 持仓 */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">现金</span>
          <span className={`font-mono ${cash < 0 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
            ¥{cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {shares > 0 && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">
                {stockName} <span className="text-blue-400">{shares}股</span>
              </span>
              <span className="text-blue-400 font-mono">
                ¥{holdingValue.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">持仓盈亏</span>
              <span className={`font-mono font-bold ${holdingPnL >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                {holdingPnL >= 0 ? '+' : ''}{holdingPnL.toFixed(2)}
                <span className="text-xs ml-1">({holdingPnLPercent >= 0 ? '+' : ''}{holdingPnLPercent.toFixed(2)}%)</span>
              </span>
            </div>

            {isMarketOpen && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">今日浮盈</span>
                <span className={`font-mono ${todayHoldingPnL >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {todayHoldingPnL >= 0 ? '+' : ''}¥{todayHoldingPnL.toFixed(2)}
                </span>
              </div>
            )}
          </>
        )}

        {isMarketOpen && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">今日涨跌</span>
            <span className={`font-mono ${todayChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-gray-800 pt-2">
          <span className="text-gray-400">每日开销</span>
          <span className="text-orange-400 font-mono">-¥{dailyExpense}</span>
        </div>
        {job.employed && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">💼 日薪</span>
            <span className="text-green-400 font-mono">
              +¥{Math.round(job.dailySalary * Math.round(job.workProgress) / 100)}
              {job.isWorkingHours && (
                <span className="text-gray-500 text-xs ml-1">({Math.round(job.workProgress)}%)</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
