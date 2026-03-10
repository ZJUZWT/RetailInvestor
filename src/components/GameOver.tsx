import { useGameStore } from '../stores/gameStore';
import { useCountUp } from '../hooks/useCountUp';
import type { DeathCause } from '../types';
import { loadMeta } from '../engine/MetaSystem';

const DEATH_MESSAGES: Record<DeathCause, { emoji: string; title: string; description: string }> = {
  bankruptcy: { emoji: '💸', title: '破产了！', description: '连生活费都付不起了，被扫地出门...' },
  exhaustion: { emoji: '💀', title: '猝死了！', description: '连续熬夜看盘，你倒在了电脑前...' },
  starved: { emoji: '🍚', title: '饿死了！', description: '光顾着炒股忘了吃饭，饿晕在K线面前...' },
  insanity: { emoji: '🤯', title: '精神崩溃！', description: '亏损太大，SAN值归零，你再也无法面对K线了...' },
};

export function GameOver() {
  const { gameStatus, peakAssets, cash, shares, currentPrice, goal, totalTradingDays, deathCause, lastUnlockedAchievements } = useGameStore();
  const { newGame } = useGameStore(s => s.actions);

  const totalAssets = cash + shares * currentPrice;
  const isWin = gameStatus === 'won';

  const animatedAssets = useCountUp(totalAssets, 1500, 2);
  const animatedPeak = useCountUp(peakAssets, 1500, 2);
  const animatedCompletion = useCountUp(totalAssets / goal.targetAmount * 100, 1200, 1);

  if (gameStatus !== 'won' && gameStatus !== 'lost') return null;

  const death = deathCause ? DEATH_MESSAGES[deathCause] : null;
  const meta = loadMeta();
  const newAchievements = lastUnlockedAchievements ?? [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-backdropFadeIn overflow-y-auto">
      <div className="bg-[#12121a] rounded-xl p-8 max-w-md mx-4 my-8 border border-gray-700 text-center animate-modalBounceIn">
        <div className="text-6xl mb-4">{isWin ? '🎉' : (death?.emoji || '💀')}</div>

        <h2 className={`text-3xl font-black mb-2 ${isWin ? 'text-yellow-400' : 'text-red-500'}`}>
          {isWin ? '恭喜发财！' : (death?.title || '游戏结束')}
        </h2>

        <p className="text-gray-400 mb-6">
          {isWin
            ? `你用了 ${totalTradingDays} 个交易日达成了【${goal.title}】！`
            : (death?.description || `坚持了 ${totalTradingDays} 个交易日，最终没能扛住...`)}
        </p>

        <div className="bg-[#0a0a0f] rounded-lg p-4 mb-4 text-sm">
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="text-gray-500">交易天数</div>
            <div className="text-white font-mono text-right">{totalTradingDays}天</div>

            <div className="text-gray-500">最终资产</div>
            <div className="text-white font-mono text-right">¥{animatedAssets}</div>

            <div className="text-gray-500">峰值资产</div>
            <div className="text-yellow-400 font-mono text-right">¥{animatedPeak}</div>

            <div className="text-gray-500">目标金额</div>
            <div className="text-gray-300 font-mono text-right">¥{goal.targetAmount.toLocaleString()}</div>

            <div className="text-gray-500">完成度</div>
            <div className={`font-mono text-right ${isWin ? 'text-green-400' : 'text-red-400'}`}>
              {animatedCompletion}%
            </div>

            {deathCause && deathCause !== 'bankruptcy' && (
              <>
                <div className="text-gray-500">死因</div>
                <div className="text-red-400 text-right">{death?.emoji} {death?.title}</div>
              </>
            )}
          </div>
        </div>

        {/* Meta 统计 */}
        <div className="bg-[#0a0a0f] rounded-lg p-3 mb-4 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>总局数: {meta.totalGames}</span>
            <span>胜率: {meta.totalGames > 0 ? Math.round(meta.totalWins / meta.totalGames * 100) : 0}%</span>
            <span>成就: {meta.achievements.length}/22</span>
          </div>
        </div>

        {/* 本局新解锁成就 */}
        {newAchievements.length > 0 && (
          <div className="mb-4">
            <h3 className="text-yellow-400 font-bold text-sm mb-2">🏅 本局新解锁成就！</h3>
            <div className="space-y-2">
              {newAchievements.map(a => (
                <div key={a.id} className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-2.5 text-left flex items-center gap-2">
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <div className="text-yellow-400 font-bold text-sm">{a.name}</div>
                    <div className="text-gray-400 text-xs">{a.description}</div>
                    {a.reward && <div className="text-green-400 text-xs mt-0.5">🎁 {a.reward}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
