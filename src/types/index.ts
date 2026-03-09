// === 游戏阶段 ===
export type GamePhase =
  | 'morning_news'
  | 'am_trading'
  | 'lunch_break'
  | 'pm_trading'
  | 'after_hours'
  | 'settlement';

export const PHASE_NAMES: Record<GamePhase, string> = {
  morning_news: '晨报',
  am_trading: '上午交易',
  lunch_break: '午间休息',
  pm_trading: '下午交易',
  after_hours: '盘后活动',
  settlement: '今日结算',
};

export const PHASE_ORDER: GamePhase[] = [
  'morning_news',
  'am_trading',
  'lunch_break',
  'pm_trading',
  'after_hours',
  'settlement',
];

export type GameStatus = 'menu' | 'playing' | 'won' | 'lost';

// === 股票数据 ===
export interface StockDataPoint {
  day: number;
  open: number;
  close: number;
  high: number;
  low: number;
}

// === 稀有度 ===
export type Rarity = 'common' | 'rare' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#b0b0b0',
  rare: '#4a9eff',
  legendary: '#ffb340',
};

export const RARITY_NAMES: Record<Rarity, string> = {
  common: '常见',
  rare: '稀有',
  legendary: '传说',
};

// === 事件系统 ===
export type EventEffectType =
  | 'stock_trend'
  | 'cash'
  | 'daily_expense'
  | 'stamina'
  | 'card'
  | 'chain';

export interface EventEffect {
  type: EventEffectType;
  value: number;
  cardId?: string;
  chainEventId?: string;
  description?: string;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  rarity: Rarity;
  effects: EventEffect[];
  chainNext?: string[];
  phase?: GamePhase;
}

// === 卡牌系统 ===
export type CardEffectType =
  | 'info_accuracy'
  | 'trend_hint'
  | 'sell_bonus'
  | 'expense_reduce'
  | 'stamina_bonus'
  | 'trade_override';

export interface CardEffect {
  type: CardEffectType;
  value: number;
  description: string;
}

export interface Card {
  id: string;
  name: string;
  emoji: string;
  description: string;
  rarity: Rarity;
  type: 'passive' | 'active';
  effects: CardEffect[];
  usesRemaining?: number;
}

// === 目标 ===
export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  description: string;
}

// === 活动 ===
export interface Activity {
  id: string;
  name: string;
  emoji: string;
  staminaCost: number;
  description: string;
}

// === 牛熊趋势 ===
export interface TrendSegment {
  startDay: number;
  endDay: number;
  dailyBias: number;
  volatility: number;
}

// === 开局模式 ===
export type OpeningPattern =
  | 'slow_bull_pullback'    // 慢牛回调
  | 'dark_decline_bottom'   // 暗跌见底
  | 'sideways_consolidation'// 震荡盘整
  | 'surge_high'            // 暴涨后高位
  | 'v_shape_rebound';      // V型反弹

export const OPENING_PATTERN_NAMES: Record<OpeningPattern, string> = {
  slow_bull_pullback: '慢牛回调',
  dark_decline_bottom: '暗跌见底',
  sideways_consolidation: '震荡盘整',
  surge_high: '暴涨后高位',
  v_shape_rebound: 'V型反弹',
};

// === 均线显示 ===
export interface MAVisible {
  ma5: boolean;
  ma10: boolean;
  ma20: boolean;
}

// === 活动结果 ===
export interface ActivityResult {
  message: string;
  cashChange?: number;
  staminaChange?: number;
  card?: Card;
  infoHint?: { direction: 'up' | 'down'; reliable: boolean };
}

// === 游戏状态 ===
export interface GameState {
  day: number;
  phase: GamePhase;
  gameStatus: GameStatus;

  cash: number;
  shares: number;
  shareCostBasis: number;
  stamina: number;
  maxStamina: number;
  dailyExpense: number;

  goal: Goal;

  currentPrice: number;
  stockHistory: StockDataPoint[];
  trendSegments: TrendSegment[];
  stockName: string;
  historyDays: number;            // 历史预生成天数（250）
  openingPattern: OpeningPattern; // 本局开局模式

  boughtToday: boolean;
  todayOpen: number;
  amClose: number;

  cards: Card[];
  maxCardSlots: number;
  activeEventChains: { eventId: string; triggerDay: number }[];
  currentEvent: GameEvent | null;
  eventLog: { day: number; event: GameEvent }[];

  messages: string[];

  // 盘后活动追踪
  activitiesDoneToday: string[];

  // 统计
  peakAssets: number;
  totalTradingDays: number;
}
