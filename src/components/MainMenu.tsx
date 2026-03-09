import { useGameStore } from '../stores/gameStore';

export function MainMenu() {
  const { gameStatus } = useGameStore();
  const { newGame, loadGame } = useGameStore(s => s.actions);

  if (gameStatus !== 'menu') return null;

  const hasSave = !!localStorage.getItem('retail_investor_save');

  return (
    <div className="w-full h-screen bg-[#0a0a0f] flex flex-col items-center justify-center">
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
      </div>

      <div className="mt-16 text-gray-700 text-xs text-center">
        <p>A股规则 | T+1 | 涨跌停±10%</p>
        <p className="mt-1">祝你好运，散户</p>
      </div>
    </div>
  );
}
