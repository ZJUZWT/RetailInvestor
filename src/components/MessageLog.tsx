import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { NEWS_SOURCE_CONFIG } from '../types/newsTypes';

export function MessageLog() {
  const { messages } = useGameStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <h3 className="text-white font-bold mb-2 text-sm">📋 消息</h3>
      <div ref={scrollRef} className="space-y-1.5 max-h-48 overflow-y-auto">
        {messages.map((msg) => {
          const config = NEWS_SOURCE_CONFIG[msg.source];
          return (
            <div key={msg.id} className="flex items-start gap-1.5">
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0 mt-0.5"
                style={{
                  backgroundColor: config.bgColor,
                  color: config.color,
                  border: `1px solid ${config.borderColor}`,
                }}
              >
                {config.emoji}{config.label}
              </span>
              <p
                className="text-xs leading-relaxed"
                style={{ color: msg.priority === 'urgent' ? '#fbbf24' : msg.priority === 'important' ? config.color : '#9ca3af' }}
              >
                {msg.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
