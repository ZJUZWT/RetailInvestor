import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import type { FlashEventChoice } from '../data/flashEvents';

export function FlashEventModal() {
  const { activeFlashEvent, gameStatus } = useGameStore();
  const { resolveFlashEvent } = useGameStore(s => s.actions);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<number | null>(null);

  const event = activeFlashEvent;

  useEffect(() => {
    if (!event) return;
    setTimeLeft(event.timeLimit);

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // 时间到，自动选择默认选项
          if (timerRef.current) clearInterval(timerRef.current);
          resolveFlashEvent(event.defaultChoice);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [event?.id]);

  if (!event || gameStatus !== 'playing') return null;

  const handleChoice = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    resolveFlashEvent(index);
  };

  const urgencyColor = timeLeft <= 3 ? 'text-red-500 animate-pulse' : timeLeft <= 5 ? 'text-orange-400' : 'text-yellow-400';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-backdropFadeIn">
      <div className="bg-[#12121a] rounded-xl p-6 max-w-sm mx-4 border border-yellow-600/50 shadow-2xl shadow-yellow-500/10 animate-modalBounceIn">
        {/* 倒计时 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-3xl">{event.emoji}</span>
          <div className={`text-2xl font-black font-mono ${urgencyColor}`}>
            {timeLeft}s
          </div>
        </div>

        {/* 标题 */}
        <h3 className="text-white font-black text-lg mb-1">{event.title}</h3>
        <p className="text-gray-400 text-sm mb-4">{event.description}</p>

        {/* 倒计时进度条 */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / event.timeLimit) * 100}%` }}
          />
        </div>

        {/* 选项 */}
        <div className="space-y-2">
          {event.choices.map((choice: FlashEventChoice, index: number) => (
            <button
              key={index}
              onClick={() => handleChoice(index)}
              className="w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.02] active:scale-95 bg-[#1a1a2e] border-gray-700 hover:border-yellow-600/50 hover:bg-[#252540] text-gray-200"
            >
              <span className="text-sm font-bold">{choice.text}</span>
            </button>
          ))}
        </div>

        {/* 默认提示 */}
        <p className="text-xs text-gray-600 mt-3 text-center">
          ⏰ 不选择将自动选择「{event.choices[event.defaultChoice].text}」
        </p>
      </div>
    </div>
  );
}
