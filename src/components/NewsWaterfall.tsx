import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { NEWS_SOURCE_CONFIG } from '../types/newsTypes';
import type { NewsMessage } from '../types/newsTypes';

interface WaterfallItem {
  message: NewsMessage;
  state: 'entering' | 'visible' | 'exiting';
}

const MAX_VISIBLE = 5;
const DISPLAY_DURATION = 4000; // 4秒后开始淡出
const EXIT_DURATION = 500;     // 淡出动画时长

export function NewsWaterfall() {
  const waterfallQueue = useGameStore(s => s.waterfallQueue);
  const { dismissWaterfallMessage } = useGameStore(s => s.actions);
  const [items, setItems] = useState<WaterfallItem[]>([]);
  const processedRef = useRef(new Set<number>());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // 当新消息进入队列时处理
  useEffect(() => {
    const newMessages = waterfallQueue.filter(m => !processedRef.current.has(m.id));
    if (newMessages.length === 0) return;

    newMessages.forEach((msg, index) => {
      processedRef.current.add(msg.id);

      // stagger 进入动画（300ms间隔）
      const enterDelay = index * 300;

      setTimeout(() => {
        setItems(prev => {
          const updated = [...prev, { message: msg, state: 'entering' as const }];
          // 超过最大数量时移除最早的
          if (updated.length > MAX_VISIBLE) {
            const removed = updated.shift()!;
            if (removed) {
              dismissWaterfallMessage(removed.message.id);
              const timer = timersRef.current.get(removed.message.id);
              if (timer) { clearTimeout(timer); timersRef.current.delete(removed.message.id); }
            }
          }
          return updated;
        });

        // 进入动画完成后切换状态
        setTimeout(() => {
          setItems(prev => prev.map(item =>
            item.message.id === msg.id ? { ...item, state: 'visible' } : item
          ));
        }, 400);

        // 设置自动淡出
        const fadeTimer = setTimeout(() => {
          setItems(prev => prev.map(item =>
            item.message.id === msg.id ? { ...item, state: 'exiting' } : item
          ));

          // 淡出完成后移除
          setTimeout(() => {
            setItems(prev => prev.filter(item => item.message.id !== msg.id));
            dismissWaterfallMessage(msg.id);
            timersRef.current.delete(msg.id);
          }, EXIT_DURATION);
        }, DISPLAY_DURATION);

        timersRef.current.set(msg.id, fadeTimer);
      }, enterDelay);
    });
  }, [waterfallQueue, dismissWaterfallMessage]);

  // 清理定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none"
         style={{ maxWidth: '400px' }}>
      {items.map(item => {
        const config = NEWS_SOURCE_CONFIG[item.message.source];
        const isUrgent = item.message.priority === 'urgent';

        return (
          <div
            key={item.message.id}
            className={`
              pointer-events-auto rounded-lg px-3 py-2 border
              ${item.state === 'entering' ? 'animate-newsSlideIn' : ''}
              ${item.state === 'exiting' ? 'animate-newsFadeOut' : ''}
              ${isUrgent ? 'animate-urgentFlash' : ''}
            `}
            style={{
              backgroundColor: config.bgColor,
              borderColor: config.borderColor,
              boxShadow: `0 4px 12px ${config.borderColor}40`,
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: config.borderColor, color: config.color }}
              >
                {config.emoji} {config.label}
              </span>
              {item.message.priority === 'urgent' && (
                <span className="text-[10px] text-red-400 font-bold">URGENT</span>
              )}
              {item.message.priority === 'important' && (
                <span className="text-[10px] text-yellow-500 font-bold">!</span>
              )}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: config.color }}>
              {item.message.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
