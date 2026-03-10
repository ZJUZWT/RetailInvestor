/**
 * 盘中快速事件 — 限时选择题，增加紧张感和决策点
 */

export interface FlashEventChoice {
  text: string;
  effect: {
    /** 以当前持仓百分比买入 */
    buy_percent?: number;
    /** 以当前持仓百分比卖出 */
    sell_percent?: number;
    /** 现金变化 */
    cash_change?: number;
    /** SAN恢复/扣减 */
    sanity_change?: number;
    /** 精力变化 */
    energy_change?: number;
    /** 股价临时修正（当天剩余时段生效） */
    price_modifier?: number;
  };
}

export interface FlashEvent {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** 倒计时秒数 */
  timeLimit: number;
  choices: FlashEventChoice[];
  /** 不选时默认选项索引 */
  defaultChoice: number;
  /** 触发条件：涨跌状态 */
  condition?: 'up' | 'down' | 'volatile' | 'any';
}

export const FLASH_EVENTS: FlashEvent[] = [
  {
    id: 'rumor_positive',
    title: '传闻利好！',
    emoji: '📢',
    description: '突然传来消息：某大机构正在建仓这只股票！',
    timeLimit: 10,
    choices: [
      { text: '🚀 跟单买入！', effect: { buy_percent: 50 } },
      { text: '😐 冷静观望', effect: { sanity_change: 3 } },
      { text: '🏃 反手卖出', effect: { sell_percent: 30 } },
    ],
    defaultChoice: 1,
    condition: 'any',
  },
  {
    id: 'flash_crash',
    title: '急跌！',
    emoji: '💥',
    description: '大盘闪崩！你的股票跟着跳水！',
    timeLimit: 8,
    choices: [
      { text: '✂️ 割肉跑路', effect: { sell_percent: 100 } },
      { text: '💰 加仓抄底', effect: { buy_percent: 30 } },
      { text: '🧘 装死不动', effect: { sanity_change: -5 } },
    ],
    defaultChoice: 2,
    condition: 'down',
  },
  {
    id: 'sudden_spike',
    title: '急涨！',
    emoji: '🚀',
    description: '不明原因突然拉升！要追吗？',
    timeLimit: 8,
    choices: [
      { text: '🏃 追涨！', effect: { buy_percent: 50, sanity_change: -3 } },
      { text: '📉 趁机卖出', effect: { sell_percent: 50 } },
      { text: '👀 先看看', effect: {} },
    ],
    defaultChoice: 2,
    condition: 'up',
  },
  {
    id: 'insider_tip',
    title: '神秘电话',
    emoji: '📞',
    description: '一个不认识的号码打来，低声说"下午会有大动作..."',
    timeLimit: 12,
    choices: [
      { text: '📈 全仓梭哈！', effect: { buy_percent: 100 } },
      { text: '📉 全部卖出跑路', effect: { sell_percent: 100 } },
      { text: '🤔 不理他', effect: { sanity_change: 2 } },
    ],
    defaultChoice: 2,
    condition: 'any',
  },
  {
    id: 'colleague_chat',
    title: '同事八卦',
    emoji: '🗣️',
    description: '隔壁工位的老王偷偷跟你说："我听说这只票要出利空..."',
    timeLimit: 10,
    choices: [
      { text: '😱 赶紧卖', effect: { sell_percent: 50 } },
      { text: '🤫 多买点（反向指标）', effect: { buy_percent: 30 } },
      { text: '😒 老王从来不准', effect: {} },
    ],
    defaultChoice: 2,
    condition: 'any',
  },
  {
    id: 'news_flash',
    title: '突发新闻！',
    emoji: '📰',
    description: '手机弹出推送：监管层正在研究新政策...',
    timeLimit: 10,
    choices: [
      { text: '📈 利好！买入', effect: { buy_percent: 30, price_modifier: 0.01 } },
      { text: '📉 利空！卖出', effect: { sell_percent: 30, price_modifier: -0.01 } },
      { text: '🤷 看不懂，不动', effect: {} },
    ],
    defaultChoice: 2,
    condition: 'any',
  },
  {
    id: 'boss_approaching',
    title: '领导来了！',
    emoji: '👔',
    description: '摸鱼看盘时领导突然朝你走来！',
    timeLimit: 5,
    choices: [
      { text: '💨 秒切桌面', effect: { sanity_change: -2 } },
      { text: '🤡 假装看Excel', effect: { energy_change: -5 } },
      { text: '😎 就这样看着他', effect: { cash_change: -500, sanity_change: 5 } },
    ],
    defaultChoice: 0,
    condition: 'any',
  },
  {
    id: 'group_chat_panic',
    title: '群里炸了！',
    emoji: '💬',
    description: '股友群都在喊"快跑！要崩了！"',
    timeLimit: 8,
    choices: [
      { text: '😱 跟着跑', effect: { sell_percent: 100, sanity_change: -3 } },
      { text: '🧐 反向操作', effect: { buy_percent: 50 } },
      { text: '🔇 退群保平安', effect: { sanity_change: 5 } },
    ],
    defaultChoice: 2,
    condition: 'down',
  },
  {
    id: 'lucky_penny',
    title: '路边捡钱！',
    emoji: '🪙',
    description: '走路低头看手机，居然捡到了钱！',
    timeLimit: 10,
    choices: [
      { text: '💰 投进股市', effect: { cash_change: 500, buy_percent: 10 } },
      { text: '🍜 去吃顿好的', effect: { cash_change: 500, sanity_change: 5 } },
      { text: '🤝 还给失主（没找到）', effect: { cash_change: 500, sanity_change: 3 } },
    ],
    defaultChoice: 2,
    condition: 'any',
  },
  {
    id: 'market_halted',
    title: '临时停牌！',
    emoji: '⏸️',
    description: '交易所发出临时停牌通知，重大事项待公告！',
    timeLimit: 10,
    choices: [
      { text: '😰 肯定是利空...', effect: { sanity_change: -5 } },
      { text: '🤩 肯定是利好！', effect: { sanity_change: 3, energy_change: 5 } },
      { text: '🧘 平常心对待', effect: { sanity_change: 2 } },
    ],
    defaultChoice: 2,
    condition: 'volatile',
  },
];

/** 根据当前涨跌状态随机抽取一个快速事件 */
export function rollFlashEvent(changePercent: number): FlashEvent {
  const condition = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : Math.abs(changePercent) > 5 ? 'volatile' : 'any';

  // 70% 概率选匹配条件的事件
  const matchingEvents = FLASH_EVENTS.filter(e => e.condition === condition || e.condition === 'any');
  const pool = Math.random() < 0.7 && matchingEvents.length > 0 ? matchingEvents : FLASH_EVENTS;
  return pool[Math.floor(Math.random() * pool.length)];
}
