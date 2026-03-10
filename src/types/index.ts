import type { NewsMessage } from './newsTypes';

// === 游戏状态（不再有 phase 阶段） ===
export type GameStatus = 'menu' | 'playing' | 'won' | 'lost';

// === 死亡原因 ===
export type DeathCause = 'bankruptcy' | 'starved' | 'exhaustion' | 'insanity';

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
}

// === 卡牌系统 ===
export type CardEffectType =
  | 'info_accuracy'
  | 'trend_hint'
  | 'sell_bonus'
  | 'expense_reduce'
  | 'stamina_bonus'
  | 'trade_override'
  // 新增效果类型
  | 'energy_drain_reduce'    // 精力衰减降低（百分比，如0.2=降20%）
  | 'catch_rate_reduce'      // 被抓概率降低（百分比）
  | 'salary_reduce'          // 工资降低（百分比，副作用）
  | 't0_enabled'             // T+0特权
  | 'sell_fee'               // 每次卖出额外手续费（固定金额，副作用）
  | 'socializing_card_rate'  // 社交获卡率加成
  | 'socializing_cost_mult'  // 社交费用倍率（副作用）
  | 'sanity_floor'           // SAN值下限
  | 'energy_recovery_reduce' // 精力恢复降低（百分比，副作用）
  | 'skip_work_check'        // 上班时也能看盘
  | 'sanity_cap_reduce'      // SAN值上限降低（固定值，副作用）
  | 'revenue_bonus'          // 所有收益加成（百分比）
  | 'expense_mult'           // 生活费倍率（副作用）
  | 'lunch_energy_restore'   // 午休精力恢复（固定值）
  ;

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
  energyCost: number;  // 消耗精力值（vitality.energy）
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

// === 交易标记 ===
export interface TradeMarker {
  tick: number;
  price: number;
  type: 'B' | 'S';
  shares: number;
}

// === 挂单系统 ===
export type OrderType = 'limit_buy' | 'limit_sell' | 'stop_loss' | 'take_profit';

export interface PendingOrder {
  id: string;
  type: OrderType;
  /** 触发价格 */
  triggerPrice: number;
  /** 股数 */
  shares: number;
  /** 创建时间（游戏总分钟数） */
  createdAt: number;
  /** 是否已执行 */
  executed: boolean;
}

// === 上班系统 ===
export interface JobState {
  /** 是否有工作 */
  employed: boolean;
  /** 日薪 */
  dailySalary: number;
  /** 工作名称 */
  jobTitle: string;
  /** 是否正在摸鱼（开了才能看盘/交易） */
  isSlacking: boolean;
  /** 今天摸鱼被抓次数 */
  caughtToday: number;
  /** 累计被抓次数 */
  totalCaught: number;
  /** 每次被抓罚款 */
  catchPenalty: number;
  /** 带薪拉屎：今天是否已使用 */
  toiletUsedToday: boolean;
  /** 带薪拉屎：是否正在进行中 */
  isOnToilet: boolean;
  /** 带薪拉屎开始时的游戏总分钟数 */
  toiletStartMinute: number;
  /** 带薪拉屎最大时长(分钟) */
  toiletMaxMinutes: number;
  /** 今日是否已发工资 */
  paidToday: boolean;
  /** 是否在上班时间 (09:00-18:00 工作日) */
  isWorkingHours: boolean;
  /** 今日工作进度（0-100），不摸鱼时每分钟增长 */
  workProgress: number;
  /** 今日上班总分钟数（用于计算进度上限 = 上班时长） */
  workMinutesToday: number;
  /** 今日摸鱼分钟数（不算入工作进度） */
  slackMinutesToday: number;
}

// === 游戏状态（不再有 phase 字段） ===
export interface GameState {
  day: number;
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
  historyDays: number;
  openingPattern: OpeningPattern;

  boughtToday: boolean;
  todayOpen: number;
  amClose: number;

  cards: Card[];
  maxCardSlots: number;
  activeEventChains: { eventId: string; triggerDay: number }[];
  currentEvent: GameEvent | null;
  eventLog: { day: number; event: GameEvent }[];

  messages: NewsMessage[];

  // 活动追踪
  activitiesDoneToday: string[];

  // 上班系统
  job: JobState;

  // 统计
  peakAssets: number;
  totalTradingDays: number;
}
