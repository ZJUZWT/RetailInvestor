import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { getAchievementProgress, loadMeta } from '../engine/MetaSystem';

export function MainMenu() {
  const { gameStatus } = useGameStore();
  const { newGame, loadGame } = useGameStore(s => s.actions);
  const [showAchievements, setShowAchievements] = useState(false);

  if (gameStatus !== 'menu') return null;

  const hasSave = !!localStorage.getItem('retail_investor_save');
  const meta = loadMeta();
  const hasPlayed = meta.totalGames > 0;

  return (
    <div className="w-full h-screen bg-[#0a0a0f] flex flex-col items-center justify-center overflow-y-auto">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-black text-white mb-2 animate-floatPulse">
          散户大冒险
        </h1>
        <p className="text-gray-500 text-lg">一个炒股主题的Roguelike游戏</p>
        <p className="text-gray-700 text-sm mt-2">
          买入、卖出、观望——在随机事件中活下去
        </p>
      </div>

      <div className="flex flex-col gap-3 w-64">
        <button
          onClick={newGame}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-colors"
        >
          新游戏
        </button>

        {hasSave && (
          <button
            onClick={() => loadGame()}
            className="w-full py-3 bg-[#1a1a2e] hover:bg-[#252540] text-gray-300 rounded-lg font-bold text-lg transition-colors border border-gray-700"
          >
            继续游戏
          </button>
        )}

        {hasPlayed && (
          <button
            onClick={() => setShowAchievements(!showAchievements)}
            className="w-full py-3 bg-[#1a1a2e] hover:bg-[#252540] text-gray-300 rounded-lg font-bold text-lg transition-colors border border-gray-700"
          >
            🏅 成就 ({meta.achievements.length}/22)
          </button>
        )}
      </div>

      {/* Meta 统计 */}
      {hasPlayed && !showAchievements && (
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>总局数: {meta.totalGames} | 胜场: {meta.totalWins} | 历史峰值: ¥{meta.peakAssetsAllTime.toLocaleString()}</p>
          {meta.longestSurvival > 0 && (
            <p className="mt-1">最长存活: {meta.longestSurvival}天 {meta.shortestWin < Infinity ? `| 最快通关: ${meta.shortestWin}天` : ''}</p>
          )}
        </div>
      )}

      {/* 成就面板 */}
      {showAchievements && <AchievementsPanel />}

      <div className="mt-8 text-gray-700 text-xs text-center">
        <p>A股规则 | T+1 | 涨跌停±10%</p>
        <p className="mt-1">祝你好运，散户</p>
      </div>
    </div>
  );
}

function AchievementsPanel() {
  const { total, unlocked, achievements } = getAchievementProgress();

  return (
    <div className="mt-6 w-full max-w-md mx-auto px-4">
      <div className="bg-[#12121a] rounded-xl p-4 border border-gray-700">
        <h3 className="text-yellow-400 font-bold text-center mb-1">🏅 成就</h3>
        <p className="text-gray-500 text-xs text-center mb-3">{unlocked}/{total} 已解锁</p>

        {/* 进度条 */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all"
            style={{ width: `${(unlocked / total) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
          {achievements.map(a => (
            <div
              key={a.id}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                a.unlocked
                  ? 'bg-yellow-900/15 border border-yellow-800/30'
                  : 'bg-gray-900/50 border border-gray-800/30 opacity-50'
              }`}
            >
              <span className="text-xl">{a.unlocked ? a.emoji : '❓'}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-xs ${a.unlocked ? 'text-white' : 'text-gray-500'}`}>
                  {a.unlocked ? a.name : '???'}
                </div>
                <div className="text-gray-500 text-xs truncate">
                  {a.unlocked ? a.description : '完成特定条件解锁'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
