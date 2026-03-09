import { useGameStore } from '../stores/gameStore';

export function LunchBreak() {
  const { phase, lunchHint, intradayTicks, stockName, messages } = useGameStore();
  const { advancePhase, setChartView } = useGameStore(s => s.actions);

  if (phase !== 'lunch_break') return null;

  // 上午盘总结
  const amOpen = intradayTicks[0]?.price ?? 0;
  const amClose = intradayTicks[120]?.price ?? 0;
  const amChange = amOpen > 0 ? ((amClose - amOpen) / amOpen * 100) : 0;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-3">🍜 午间休息 (11:30 - 13:00)</h3>

      {/* 上午盘回顾 */}
      <div className="bg-[#1a1a2e] rounded p-3 mb-3 border border-gray-700">
        <p className="text-xs text-gray-500 mb-1">上午盘回顾 — {stockName}</p>
        <p className="text-sm text-gray-300">
          开盘 ¥{amOpen.toFixed(2)} → 午收 ¥{amClose.toFixed(2)}{' '}
          <span className={amChange >= 0 ? 'text-red-400' : 'text-green-400'}>
            ({amChange >= 0 ? '+' : ''}{amChange.toFixed(2)}%)
          </span>
        </p>
      </div>

      {/* 午间消息 */}
      {lunchHint && (
        <div className="bg-[#1a1a2e] rounded p-3 mb-3 border border-yellow-900/50">
          <p className="text-xs text-yellow-600 mb-1">📱 午间小道消息</p>
          <p className="text-sm text-gray-300">
            你从消息中感觉到下午行情可能会
            <span className={lunchHint.direction === 'up' ? 'text-red-400 font-bold' : 'text-green-400 font-bold'}>
              {lunchHint.direction === 'up' ? '上涨 📈' : '下跌 📉'}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {lunchHint.reliable ? '（这条消息看起来比较靠谱）' : '（这条消息...谁知道呢）'}
          </p>
        </div>
      )}

      {/* 消息日志 */}
      {messages.length > 0 && (
        <div className="bg-[#12121f] rounded p-2 mb-3 max-h-24 overflow-y-auto">
          {messages.map((msg, i) => (
            <p key={i} className="text-xs text-gray-400 py-0.5">{msg}</p>
          ))}
        </div>
      )}

      {/* 午休时可以查看历史K线 */}
      <p className="text-xs text-gray-500 mb-2">
        💡 午休时可以切换图表查看日K/周K/月K
      </p>
      <div className="flex gap-1 mb-3">
        {(['intraday', 'daily', '5day', 'weekly', 'monthly'] as const).map(view => (
          <button
            key={view}
            onClick={() => setChartView(view)}
            className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded hover:bg-gray-700"
          >
            {{ intraday: '分时', daily: '日K', '5day': '5日', weekly: '周K', monthly: '月K' }[view]}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-600 mb-3">⚡ 消耗1点体力浏览午间消息</p>

      <button
        onClick={() => { setChartView('intraday'); advancePhase(); }}
        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
      >
        下午开盘 📈
      </button>
    </div>
  );
}
