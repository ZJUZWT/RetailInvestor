import { useGameStore } from '../stores/gameStore';

export function GameOver() {
  const { gameStatus, peakAssets, cash, shares, currentPrice, goal, totalTradingDays } = useGameStore();
  const { newGame } = useGameStore(s => s.actions);

  if (gameStatus !== 'won' && gameStatus !== 'lost') return null;

  const totalAssets = cash + shares * currentPrice;
  const isWin = gameStatus === 'won';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-[#12121a] rounded-xl p-8 max-w-md mx-4 border border-gray-700 text-center">
        <div className="text-6xl mb-4">{isWin ? '🎉' : '💀'}</div>

        <h2 className={`text-3xl font-black mb-2 ${isWin ? 'text-yellow-400' : 'text-red-500'}`}>
          {isWin ? '恭喜发财！' : '破产了！'}
        </h2>

        <p className="text-gray-400 mb-6">
          {isWin
            ? `你用了 ${totalTradingDays} 个交易日达成了【${goal.title}】！`
            : `坚持了 ${totalTradingDays} 个交易日，最终没能扛住生活的压力...`}
        </p>

        <div className="bg-[#0a0a0f] rounded-lg p-4 mb-6 text-sm">
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="text-gray-500">交易天数</div>
            <div className="text-white font-mono text-right">{totalTradingDays}天</div>

            <div className="text-gray-500">最终资产</div>
            <div className="text-white font-mono text-right">¥{totalAssets.toFixed(2)}</div>

            <div className="text-gray-500">峰值资产</div>
            <div className="text-yellow-400 font-mono text-right">¥{peakAssets.toFixed(2)}</div>

            <div className="text-gray-500">目标金额</div>
            <div className="text-gray-300 font-mono text-right">¥{goal.targetAmount.toLocaleString()}</div>

            <div className="text-gray-500">完成度</div>
            <div className={`font-mono text-right ${isWin ? 'text-green-400' : 'text-red-400'}`}>
              {(totalAssets / goal.targetAmount * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <button
          onClick={newGame}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-colors"
        >
          再来一局！
        </button>
      </div>
    </div>
  );
}
