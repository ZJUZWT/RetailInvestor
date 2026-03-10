import type { GameEvent, Card, ActivityResult } from '../types';
import { getEventsPool, getEventById } from '../data/events';
import { getCardById, ALL_CARDS } from '../data/cards';

/** 按稀有度概率抽取事件 */
export function rollEvent(): GameEvent {
  const pool = getEventsPool();
  const roll = Math.random();

  let events: GameEvent[];
  if (roll < 0.1) {
    events = pool.legendary;
  } else if (roll < 0.4) {
    events = pool.rare;
  } else {
    events = pool.common;
  }

  return events[Math.floor(Math.random() * events.length)];
}

/** 从事件效果中提取股价修正值 */
export function getEventStockModifier(event: GameEvent | null): number {
  if (!event) return 0;
  return event.effects
    .filter(e => e.type === 'stock_trend')
    .reduce((sum, e) => sum + e.value, 0);
}

/** 从事件效果中提取现金变化 */
export function getEventCashChange(event: GameEvent | null): number {
  if (!event) return 0;
  return event.effects
    .filter(e => e.type === 'cash')
    .reduce((sum, e) => sum + e.value, 0);
}

/** 从事件效果中提取生活费变化 */
export function getEventExpenseChange(event: GameEvent | null): number {
  if (!event) return 0;
  return event.effects
    .filter(e => e.type === 'daily_expense')
    .reduce((sum, e) => sum + e.value, 0);
}

/** 从事件效果中提取体力变化 */
export function getEventStaminaChange(event: GameEvent | null): number {
  if (!event) return 0;
  return event.effects
    .filter(e => e.type === 'stamina')
    .reduce((sum, e) => sum + e.value, 0);
}

/** 从事件效果中提取新卡牌 */
export function getEventCard(event: GameEvent | null): Card | undefined {
  if (!event) return undefined;
  const cardEffect = event.effects.find(e => e.type === 'card');
  if (cardEffect?.cardId) {
    return getCardById(cardEffect.cardId);
  }
  return undefined;
}

/** 从事件效果中提取链式事件ID */
export function getEventChainId(event: GameEvent | null): string | undefined {
  if (!event) return undefined;
  const chainEffect = event.effects.find(e => e.type === 'chain');
  return chainEffect?.chainEventId;
}

/** 检查事件链，返回应触发的事件 */
export function checkEventChains(
  day: number,
  activeChains: { eventId: string; triggerDay: number }[],
): { triggered: GameEvent[]; remaining: { eventId: string; triggerDay: number }[] } {
  const triggered: GameEvent[] = [];
  const remaining: { eventId: string; triggerDay: number }[] = [];

  for (const chain of activeChains) {
    if (day >= chain.triggerDay) {
      const event = getEventById(chain.eventId);
      if (event) triggered.push(event);
    } else {
      remaining.push(chain);
    }
  }

  return { triggered, remaining };
}

/** 执行盘后活动 */
export function executeActivity(
  activityId: string,
  _cash: number,
  cards: Card[],
): ActivityResult {
  switch (activityId) {
    case 'social_media': {
      const hints = [
        '某大V说："明天必涨！"（信不信由你）',
        '热搜上说这只股票要完蛋了（但热搜什么时候准过？）',
        '你刷到一条"这只股票的内幕消息"，但看起来像营销号',
        '一个自称"前操盘手"的人说明天会大涨',
        '散户论坛里全是看多的，这可能不是好兆头...',
      ];
      const isReliable = Math.random() < 0.35;
      const direction = Math.random() > 0.5 ? 'up' : 'down';
      return {
        message: hints[Math.floor(Math.random() * hints.length)],
        infoHint: { direction: isReliable ? direction : (direction === 'up' ? 'down' : 'up'), reliable: isReliable },
      };
    }

    case 'research': {
      const isReliable = Math.random() < 0.65;
      const direction = Math.random() > 0.5 ? 'up' : 'down';
      return {
        message: isReliable
          ? `经过认真分析，你判断明天大概率${direction === 'up' ? '上涨' : '下跌'}。`
          : '研究了半天，发现自己什么也看不懂...',
        infoHint: { direction, reliable: isReliable },
      };
    }

    case 'socializing': {
      const cost = 500 + Math.floor(Math.random() * 1500);
      const gotCard = Math.random() < 0.2;
      let card: Card | undefined;
      if (gotCard && cards.length < 5) {
        const availableCards = ALL_CARDS.filter(
          c => c.rarity !== 'legendary' && !cards.some(held => held.id === c.id)
        );
        if (availableCards.length > 0) {
          card = availableCards[Math.floor(Math.random() * availableCards.length)];
        }
      }
      return {
        message: card
          ? `花了¥${cost}请客吃饭，酒过三巡，有人给你透露了一个秘密... 获得卡牌【${card.name}】！`
          : `花了¥${cost}请客吃饭，但什么有用的消息都没套到。钱白花了。`,
        cashChange: -cost,
        card,
      };
    }

    case 'side_hustle': {
      const outcomes = [
        { message: '帮人代购赚了点差价', cashChange: 800 + Math.floor(Math.random() * 1200) },
        { message: '摆地摊卖手机壳，生意还不错', cashChange: 500 + Math.floor(Math.random() * 800) },
        { message: '接了个私活写代码，通宵但赚到了', cashChange: 2000 + Math.floor(Math.random() * 3000) },
        { message: '跑外卖赚了点辛苦钱', cashChange: 300 + Math.floor(Math.random() * 500) },
        { message: '买彩票，一分没中', cashChange: -200 },
        { message: '做微商被朋友拉黑了，还亏了本金', cashChange: -(500 + Math.floor(Math.random() * 1000)) },
        { message: '帮人搬家闪了腰，还得花医药费', cashChange: -(300 + Math.floor(Math.random() * 700)) },
      ];
      const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
      return {
        message: outcome.message + ` (${outcome.cashChange >= 0 ? '+' : ''}¥${outcome.cashChange})`,
        cashChange: outcome.cashChange,
      };
    }

    case 'rest':
      return {
        message: '早早上床睡觉，明天精力充沛。（明日体力+1）',
        staminaChange: 1,
      };

    case 'find_job': {
      // 找工作结果由 gameStore 的 doActivity 特殊处理
      // 这里只返回基础消息
      const success = Math.random() < 0.5; // 50%成功率
      if (success) {
        return {
          message: '__JOB_FOUND__', // 特殊标记，让 gameStore 处理
        };
      } else {
        const failMsgs = [
          '投了十几份简历，一个回复都没有...',
          '面试官问你为什么离职，你说想专心炒股，当场被拒',
          '面试到最后一轮被刷了，太惨了',
          'HR说"我们会通知你"，基本凉了',
          '面试时手机弹出股票通知，面试官表情微妙...',
        ];
        return {
          message: failMsgs[Math.floor(Math.random() * failMsgs.length)],
          cashChange: -(50 + Math.floor(Math.random() * 100)), // 面试交通费
        };
      }
    }

    default:
      return { message: '什么也没做。' };
  }
}
