import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { FOODS, calculateSleepRecovery } from '../engine/VitalitySystem';

export function PlayerActions() {
  const { gameStatus, cash, vitality } = useGameStore();
  const { eat, startSleep, wakeUp } = useGameStore(s => s.actions);
  const [showFood, setShowFood] = useState(false);
  const [sleepHours, setSleepHours] = useState(6);

  if (gameStatus !== 'playing') return null;

  // 正在睡觉时显示睡眠界面
  if (vitality.isSleeping) {
    return (
      <div className="bg-[#0e0e18] rounded-lg border border-indigo-800/50 p-4 animate-fadeIn">
        <h3 className="text-white font-bold mb-3">💤 正在睡觉...</h3>
        <div className="bg-[#1a1a2e] rounded p-3 mb-3">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>⚡ 精力</span>
            <span className="text-yellow-400 font-mono">{Math.round(vitality.energy)}/{vitality.maxEnergy}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${(vitality.energy / vitality.maxEnergy) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            计划睡{vitality.sleepHours}小时，预计恢复精力 +{calculateSleepRecovery(vitality.sleepHours)}
          </p>
          <p className="text-xs text-indigo-400 mt-1">
            💡 时间在加速流动中...股票照常波动
          </p>
        </div>
        <button
          onClick={wakeUp}
          className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold transition-colors"
        >
          ☀️ 提前醒来
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-3">🎮 角色操作</h3>

      {/* 快速属性预览 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <VitalBar label="精力" emoji="⚡" value={vitality.energy} max={vitality.maxEnergy} color="yellow" />
        <VitalBar label="饱腹" emoji="🍚" value={vitality.hunger} max={vitality.maxHunger} color="green" />
        <VitalBar label="SAN" emoji="🧠" value={vitality.sanity} max={vitality.maxSanity} color="blue" />
      </div>

      {/* 警告 */}
      {vitality.energy < 25 && (
        <div className="bg-red-900/30 border border-red-800 rounded p-2 mb-2">
          <p className="text-red-400 text-xs">⚠️ 精力过低！赶紧睡觉，否则会猝死！</p>
        </div>
      )}
      {vitality.hunger < 25 && (
        <div className="bg-orange-900/30 border border-orange-800 rounded p-2 mb-2">
          <p className="text-orange-400 text-xs">⚠️ 快饿死了！赶紧吃点东西！</p>
        </div>
      )}
      {vitality.isInsane && (
        <div className="bg-purple-900/30 border border-purple-800 rounded p-2 mb-2 animate-pulse">
          <p className="text-purple-400 text-xs">🤯 SAN值过低！精神失控中，操作可能被阻止...</p>
        </div>
      )}

      <div className="space-y-2">
        {/* 吃饭按钮 */}
        <div>
          <button
            onClick={() => setShowFood(!showFood)}
            className="w-full text-left p-2 bg-[#1a1a2e] rounded hover:bg-[#252540] text-gray-300 transition-colors"
          >
            <span className="text-lg mr-2">🍜</span>
            <span className="text-sm font-bold">吃东西</span>
            <span className="text-xs text-gray-500 ml-2">恢复饱腹值</span>
            <span className="float-right text-xs text-gray-500">{showFood ? '▲' : '▼'}</span>
          </button>

          {showFood && (
            <div className="mt-1 space-y-1 pl-2">
              {FOODS.map(food => {
                const canAfford = cash >= food.cost;
                return (
                  <button
                    key={food.id}
                    onClick={() => { eat(food.id); setShowFood(false); }}
                    disabled={!canAfford}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      canAfford
                        ? 'bg-[#12121f] hover:bg-[#1a1a2e] text-gray-300'
                        : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <span>{food.emoji} {food.name}</span>
                    <span className="text-green-400 ml-2">+{food.hungerRestore}</span>
                    {food.sanityRestore > 0 && <span className="text-blue-400 ml-1">SAN+{food.sanityRestore}</span>}
                    <span className="float-right text-orange-400">¥{food.cost}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 睡觉按钮 */}
        <div className="bg-[#1a1a2e] rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-lg mr-2">😴</span>
              <span className="text-sm font-bold text-gray-300">睡觉</span>
            </div>
            <span className="text-xs text-gray-500">
              预计恢复 +{calculateSleepRecovery(sleepHours)} 精力
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 w-8">{sleepHours}h</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={sleepHours}
              onChange={e => setSleepHours(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 bg-gray-700"
            />
          </div>

          <button
            onClick={() => startSleep(sleepHours)}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-sm transition-colors"
          >
            💤 睡觉 {sleepHours} 小时
          </button>
        </div>
      </div>
    </div>
  );
}

/** 属性进度条小组件 */
function VitalBar({ label, emoji, value, max, color }: {
  label: string;
  emoji: string;
  value: number;
  max: number;
  color: 'yellow' | 'green' | 'blue';
}) {
  const pct = (value / max) * 100;
  const colorMap = {
    yellow: { bar: 'bg-yellow-500', text: 'text-yellow-400', lowBar: 'bg-red-500', lowText: 'text-red-400' },
    green: { bar: 'bg-green-500', text: 'text-green-400', lowBar: 'bg-orange-500', lowText: 'text-orange-400' },
    blue: { bar: 'bg-blue-500', text: 'text-blue-400', lowBar: 'bg-purple-500', lowText: 'text-purple-400' },
  };
  const isLow = pct < 25;
  const colors = colorMap[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500">{emoji}{label}</span>
        <span className={`text-[10px] font-mono ${isLow ? colors.lowText : colors.text}`}>
          {Math.round(value)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? colors.lowBar + ' animate-pulse' : colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
