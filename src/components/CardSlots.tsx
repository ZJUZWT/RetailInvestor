import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { RARITY_COLORS } from '../types';

export function CardSlots() {
  const { cards, maxCardSlots, pendingCard } = useGameStore();
  const { replaceCardAt, dismissPendingCard } = useGameStore(s => s.actions);

  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (pendingCard) {
      setFlipped(false);
      const timer = setTimeout(() => setFlipped(true), 100);
      return () => clearTimeout(timer);
    }
  }, [pendingCard]);

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-3 text-sm">🃏 卡牌 ({cards.length}/{maxCardSlots})</h3>

      <div className="grid gap-2">
        {Array.from({ length: maxCardSlots }).map((_, i) => {
          const card = cards[i];
          if (!card) {
            return (
              <div
                key={i}
                className="border border-dashed border-gray-700 rounded p-2 text-center text-gray-600 text-xs"
              >
                空槽位
              </div>
            );
          }

          const color = RARITY_COLORS[card.rarity];
          return (
            <div
              key={card.id}
              className="rounded p-2 text-xs animate-fadeIn"
              style={{
                border: `1px solid ${color}60`,
                background: `${color}10`,
              }}
            >
              <div className="flex items-center gap-1 mb-1">
                <span>{card.emoji}</span>
                <span className="font-bold text-white">{card.name}</span>
                <span className="text-gray-500 text-[10px] ml-auto">{card.type === 'active' ? '主动' : '被动'}</span>
              </div>
              <p className="text-gray-400">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* 待选择卡牌弹窗 */}
      {pendingCard && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-backdropFadeIn">
          <div className="bg-[#1a1a2e] rounded-lg p-6 max-w-sm mx-4 border border-gray-700 animate-modalBounceIn">
            <h4 className="text-white font-bold mb-3">获得新卡牌！</h4>
            <div
              className={`rounded p-3 mb-4 ${flipped ? 'animate-cardFlip' : ''}`}
              style={{
                border: `2px solid ${RARITY_COLORS[pendingCard.card.rarity]}`,
                background: flipped
                  ? `${RARITY_COLORS[pendingCard.card.rarity]}15`
                  : 'linear-gradient(135deg, #1a1a2e 0%, #2a2a4e 50%, #1a1a2e 100%)',
              }}
            >
              {flipped ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{pendingCard.card.emoji}</span>
                    <span className="text-white font-bold">{pendingCard.card.name}</span>
                  </div>
                  <p className="text-gray-300 text-sm">{pendingCard.card.description}</p>
                </>
              ) : (
                <div className="h-16 flex items-center justify-center">
                  <span className="text-2xl">🃏</span>
                </div>
              )}
            </div>

            <p className="text-gray-400 text-sm mb-3">卡槽已满！选择一张卡牌替换，或放弃新卡：</p>

            <div className="space-y-2 mb-3">
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => replaceCardAt(i, pendingCard.card)}
                  className="w-full text-left p-2 rounded bg-gray-800 hover:bg-gray-700 text-sm flex items-center gap-2"
                >
                  <span>{card.emoji}</span>
                  <span className="text-white">{card.name}</span>
                  <span className="text-gray-500 text-xs ml-auto">替换</span>
                </button>
              ))}
            </div>

            <button
              onClick={dismissPendingCard}
              className="w-full py-2 rounded bg-gray-700 text-gray-400 hover:bg-gray-600 text-sm"
            >
              放弃新卡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
