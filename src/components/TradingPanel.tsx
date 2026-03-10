import { useState, useRef, useCallback } from 'react';
import { useGameStore, type PlaybackSpeed } from '../stores/gameStore';

/**
 * 交易面板 — 在交易时段显示买卖操作，非交易时段显示休市状态
 */
export function TradingPanel() {
  const {
    cash, shares, currentPrice, boughtToday, shareCostBasis,
    playbackSpeed, intradayTicks, currentTick, calendar, gameStatus, job,
  } = useGameStore();
  const { buy, sell, setPlaybackSpeed, skipToNext } = useGameStore(s => s.actions);

  const [posPercent, setPosPercent] = useState(0);
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'buy' | 'sell' }[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, type: 'buy' | 'sell') => {
    const id = toastIdRef.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2300);
  };

  const setQuickPercent = useCallback((pct: number) => {
    setPosPercent(pct);
  }, []);

  if (gameStatus !== 'playing') return null;

  const { marketPhase } = calendar;
  const isTrading = marketPhase === 'am_trading' || marketPhase === 'pm_trading';
  const isLunchBreak = marketPhase === 'lunch_break';

  const maxBuyShares = Math.floor(cash / currentPrice / 100) * 100;
  const profitPerShare = shares > 0 ? currentPrice - shareCostBasis : 0;
  const profitPercent = shareCostBasis > 0 ? (profitPerShare / shareCostBasis * 100) : 0;

  const baseShares = mode === 'buy' ? maxBuyShares : shares;
  const shareAmount = Math.floor(baseShares * posPercent / 100 / 100) * 100;
  const cost = shareAmount * currentPrice;

  const handleBuy = () => {
    if (shareAmount > 0 && shareAmount <= maxBuyShares) {
      buy(shareAmount);
      showToast(`买入 ${shareAmount} 股 ¥${(shareAmount * currentPrice).toFixed(0)}`, 'buy');
      setPosPercent(0);
    }
  };

  const handleSell = () => {
    if (shareAmount > 0 && shareAmount <= shares) {
      sell(shareAmount);
      showToast(`卖出 ${shareAmount} 股 ¥${(shareAmount * currentPrice).toFixed(0)}`, 'sell');
      setPosPercent(0);
    }
  };

  const timeLabel = intradayTicks[currentTick]?.timeLabel ?? '';

  const SPEED_BUTTONS: { speed: PlaybackSpeed; label: string; icon: string }[] = [
    { speed: 0, label: '暂停', icon: '⏸' },
    { speed: 1, label: '1x', icon: '▶' },
    { speed: 2, label: '2x', icon: '⏩' },
    { speed: 3, label: '3x', icon: '⏭' },
  ];

  const QUICK_BUTTONS = [
    { label: '1/3仓', pct: 33 },
    { label: '1/2仓', pct: 50 },
    { label: '全仓', pct: 100 },
  ];

  const canBuy = mode === 'buy' && shareAmount > 0 && shareAmount <= maxBuyShares;
  const canSell = mode === 'sell' && shareAmount > 0 && shareAmount <= shares && !boughtToday;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">
          {isTrading ? '📈 交易中' : isLunchBreak ? '🍜 午休' : '📋 交易'}
          {isTrading && <span className="text-yellow-400 font-mono text-sm ml-2">{timeLabel}</span>}
        </h3>

        {/* 速度控制 — 始终显示 */}
        <div className="flex gap-1">
          {SPEED_BUTTONS.map(btn => (
            <button
              key={btn.speed}
              onClick={() => setPlaybackSpeed(btn.speed)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackSpeed === btn.speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {btn.icon} {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 非交易时段提示 + 跳过按钮 */}
      {!isTrading && (
        <div className="text-center py-4">
          <span className="text-gray-500 text-sm block mb-3">
            {marketPhase === 'pre_market' && '⏰ 盘前准备中，09:30 开盘...'}
            {marketPhase === 'lunch_break' && '🍜 午间休息，13:00 继续交易...'}
            {marketPhase === 'after_hours' && '🌙 今日已收盘，明天继续...'}
            {marketPhase === 'closed' && '📅 今天休市，享受生活吧！'}
          </span>
          <button
            onClick={skipToNext}
            className="px-5 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors"
          >
            ⏭ 跳过到{
              marketPhase === 'lunch_break' ? '下午开盘'
                : marketPhase === 'pre_market' ? '开盘'
                : '下一节点'
            }
          </button>
        </div>
      )}

      {/* 交易时段：显示完整交易面板 */}
      {isTrading && (
        <>
          {/* 上班摸鱼限制 */}
          {job.employed && job.isWorkingHours && !job.isSlacking && (
            <div className="bg-orange-900/20 border border-orange-700/50 rounded p-3 mb-3 text-center">
              <span className="text-orange-400 text-sm">
                🏢 上班时间！在工作面板开启摸鱼才能交易
              </span>
            </div>
          )}

          {/* 摸鱼中提示 */}
          {job.employed && job.isSlacking && (
            <div className={`rounded px-3 py-1.5 mb-3 text-xs text-center ${
              job.isOnToilet
                ? 'bg-amber-900/20 border border-amber-700/30 text-amber-400'
                : 'bg-red-900/20 border border-red-700/30 text-red-400 animate-pulse'
            }`}>
              {job.isOnToilet ? '🚽 带薪拉屎中，安心交易' : '🐟 摸鱼中...小心领导！'}
            </div>
          )}          {/* 持仓信息 */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div className="text-gray-400">
              可用 <span key={cash} className="text-green-400 font-mono animate-flashHighlight rounded px-1">¥{cash.toFixed(2)}</span>
            </div>
            <div className="text-gray-400">
              持仓 <span key={shares} className="text-blue-400 font-mono animate-flashHighlight rounded px-1">{shares}股</span>
            </div>
            {shares > 0 && (
              <>
                <div className="text-gray-400">
                  成本 <span className="text-gray-300 font-mono">¥{shareCostBasis.toFixed(2)}</span>
                </div>
                <div className="text-gray-400">
                  浮盈
                  <span className={`font-mono ml-1 ${profitPerShare >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {profitPerShare >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                  </span>
                </div>
              </>
            )}
            {boughtToday && (
              <div className="text-orange-400 text-xs col-span-2">
                ⚠️ T+1: 今日买入不可卖出
              </div>
            )}
          </div>

          {/* 买入/卖出模式切换 */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => { setMode('buy'); setPosPercent(0); }}
              className={`flex-1 py-1.5 text-sm font-bold rounded-t transition-colors ${
                mode === 'buy'
                  ? 'bg-red-600/20 text-red-400 border border-red-600/50 border-b-0'
                  : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 border-b-0'
              }`}
            >
              买入
            </button>
            <button
              onClick={() => { setMode('sell'); setPosPercent(0); }}
              className={`flex-1 py-1.5 text-sm font-bold rounded-t transition-colors ${
                mode === 'sell'
                  ? 'bg-green-600/20 text-green-400 border border-green-600/50 border-b-0'
                  : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 border-b-0'
              }`}
            >
              卖出
            </button>
          </div>

          {/* 快捷比例按钮 */}
          <div className="flex gap-1.5 mb-2">
            {QUICK_BUTTONS.map(btn => (
              <button
                key={btn.pct}
                onClick={() => setQuickPercent(btn.pct)}
                className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                  posPercent === btn.pct
                    ? mode === 'buy'
                      ? 'bg-red-600/30 text-red-300 border border-red-600/50'
                      : 'bg-green-600/30 text-green-300 border border-green-600/50'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 仓位滑块 */}
          <div className="mb-3">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={posPercent}
              onChange={e => setPosPercent(Number(e.target.value))}
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                mode === 'buy' ? 'accent-red-500' : 'accent-green-500'
              } bg-gray-700`}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
              <span>0%</span>
              <span className={mode === 'buy' ? 'text-red-400' : 'text-green-400'}>
                {posPercent}%
              </span>
              <span>100%</span>
            </div>
          </div>

          {/* 股数 & 金额显示 */}
          <div className="flex justify-between items-center text-sm mb-3 bg-[#1a1a2e] rounded px-3 py-2 border border-gray-700">
            <span className="text-gray-400">
              {mode === 'buy' ? '买入' : '卖出'}
              <span className={`font-mono font-bold ml-1 ${mode === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                {shareAmount}
              </span>
              <span className="text-gray-500 ml-0.5">股</span>
            </span>
            <span className="text-gray-400 font-mono">
              ≈ ¥{cost.toFixed(0)}
            </span>
          </div>

          {/* 执行按钮 */}
          {mode === 'buy' ? (
            <button
              onClick={handleBuy}
              disabled={!canBuy}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2.5 rounded font-bold transition-colors"
            >
              买入 {shareAmount > 0 ? `${shareAmount}股` : ''}
            </button>
          ) : (
            <button
              onClick={handleSell}
              disabled={!canSell}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2.5 rounded font-bold transition-colors"
            >
              卖出 {shareAmount > 0 ? `${shareAmount}股` : ''}
            </button>
          )}
        </>
      )}

      {/* Toast 通知 */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`animate-slideInRight px-4 py-2 rounded-lg text-sm font-bold shadow-lg ${
                toast.type === 'buy' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
              }`}
            >
              {toast.type === 'buy' ? '📈' : '📉'} {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
