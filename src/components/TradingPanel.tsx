import { useState, useRef } from 'react';
import { useGameStore, type PlaybackSpeed } from '../stores/gameStore';

export function TradingPanel() {
  const {
    phase, cash, shares, currentPrice, boughtToday, shareCostBasis,
    playbackSpeed, intradayTicks, currentTick,
  } = useGameStore();
  const { buy, sell, setPlaybackSpeed } = useGameStore(s => s.actions);
  const [amount, setAmount] = useState('');
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'buy' | 'sell' }[]>([]);
  const toastIdRef = useRef(0);

  const showToast = (message: string, type: 'buy' | 'sell') => {
    const id = toastIdRef.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2300);
  };

  const isTrading = phase === 'am_trading' || phase === 'pm_trading';
  if (!isTrading) return null;

  const maxBuyShares = Math.floor(cash / currentPrice / 100) * 100;
  const shareAmount = parseInt(amount) || 0;
  const profitPerShare = shares > 0 ? currentPrice - shareCostBasis : 0;
  const profitPercent = shareCostBasis > 0 ? (profitPerShare / shareCostBasis * 100) : 0;

  const handleBuy = () => {
    if (shareAmount > 0 && shareAmount <= maxBuyShares) {
      buy(shareAmount);
      showToast(`买入 ${shareAmount} 股 ¥${(shareAmount * currentPrice).toFixed(0)}`, 'buy');
      setAmount('');
    }
  };

  const handleSell = () => {
    if (shareAmount > 0 && shareAmount <= shares) {
      sell(shareAmount);
      showToast(`卖出 ${shareAmount} 股 ¥${(shareAmount * currentPrice).toFixed(0)}`, 'sell');
      setAmount('');
    }
  };

  const timeLabel = intradayTicks[currentTick]?.timeLabel ?? '';

  const SPEED_BUTTONS: { speed: PlaybackSpeed; label: string; icon: string }[] = [
    { speed: 0, label: '暂停', icon: '⏸' },
    { speed: 1, label: '1x', icon: '▶' },
    { speed: 2, label: '2x', icon: '⏩' },
    { speed: 3, label: '3x', icon: '⏭' },
  ];

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">
          {phase === 'am_trading' ? '📈 上午盘' : '📈 下午盘'}
          <span className="text-yellow-400 font-mono text-sm ml-2">{timeLabel}</span>
        </h3>

        {/* 速度控制 */}
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

      {/* 持仓信息 */}
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

      {/* 交易输入 */}
      <div className="flex gap-2 mb-2">
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="股数（100整数倍）"
          className="flex-1 bg-[#1a1a2e] text-white rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
          step={100}
          min={0}
        />
      </div>

      {/* 快捷按钮 */}
      <div className="flex gap-1 mb-2">
        <button onClick={() => setAmount(String(maxBuyShares))} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700">全仓买</button>
        <button onClick={() => setAmount(String(Math.floor(maxBuyShares / 2 / 100) * 100))} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700">半仓买</button>
        <button onClick={() => setAmount(String(shares))} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700">全部卖</button>
        <button onClick={() => setAmount(String(Math.floor(shares / 2 / 100) * 100))} className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700">卖一半</button>
      </div>

      {/* 买入/卖出按钮 */}
      <div className="flex gap-2">
        <button
          onClick={handleBuy}
          disabled={shareAmount <= 0 || shareAmount > maxBuyShares}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 rounded font-bold transition-colors"
        >
          买入
        </button>
        <button
          onClick={handleSell}
          disabled={shareAmount <= 0 || shareAmount > shares || boughtToday}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white py-2 rounded font-bold transition-colors"
        >
          卖出
        </button>
      </div>

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
              {toast.type === 'buy' ? '\u{1F4C8}' : '\u{1F4C9}'} {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
