import { create } from 'zustand';
import type { GameState, GamePhase, Card, OpeningPattern, MAVisible, TradeMarker, DeathCause } from '../types';
import type { NewsMessage, ScheduledNews } from '../types/newsTypes';
import type { IntradayTick } from '../engine/IntradaySimulator';
import { getRandomGoal } from '../data/goals';
import {
  generateTrendSegments,
  getTrendForDay,
  getRandomStockName,
  getInitialPrice,
  getRandomOpeningPattern,
  generateHistoryData,
} from '../engine/StockSimulator';
import {
  generateIntradayTicks,
  intradayToOHLC,
  AM_END_TICK,
  PM_START_TICK,
  TOTAL_TICKS,
} from '../engine/IntradaySimulator';
import {
  rollEvent,
  getEventStockModifier,
  getEventCashChange,
  getEventExpenseChange,
  getEventStaminaChange,
  getEventCard,
  getEventChainId,
  checkEventChains,
  executeActivity,
} from '../engine/EventSystem';
import { addCard, replaceCard, sumCardEffects } from '../engine/CardSystem';
import {
  scheduleSessionNews,
  checkScheduledNews,
  generateSessionBurst,
} from '../engine/IntradayNewsEngine';
import {
  type VitalityState,
  createInitialVitality,
  tickVitality,
  checkDeath,
  FOODS,
  insanityCheck,
} from '../engine/VitalitySystem';
import {
  type GameCalendar,
  getCalendar,
  minuteToTimeStr,
  getDayOfWeekLabel,
} from '../engine/CalendarSystem';

const SAVE_KEY = 'retail_investor_save';

export type PlaybackSpeed = 0 | 1 | 2 | 3; // 0=暂停, 1=正常, 2=快进, 3=超快

// 每个speed对应的ms/tick间隔
const SPEED_INTERVALS: Record<PlaybackSpeed, number> = {
  0: Infinity, // 暂停
  1: 500,      // 正常: ~2分钟/半天
  2: 200,      // 快进
  3: 80,       // 超快
};

interface PendingCard {
  card: Card;
}

export interface StoreState extends GameState {
  actions: GameActions;
  pendingCard: PendingCard | null;
  lunchHint: { direction: 'up' | 'down'; reliable: boolean } | null;
  eventModifier: number;
  extraStaminaNextDay: number;

  // 盘中实时数据
  intradayTicks: IntradayTick[];      // 预生成的全天tick
  currentTick: number;                // 当前播放到第几个tick
  playbackSpeed: PlaybackSpeed;       // 播放速度
  tickTimerId: number | null;         // setInterval id
  chartView: 'intraday' | 'daily' | 'weekly' | 'monthly' | '5day'; // K线视图
  recentIntradayHistory: IntradayTick[][]; // 最近5天分时数据
  maVisible: MAVisible;                    // 均线显示开关

  // 消息瀑布系统
  waterfallQueue: NewsMessage[];       // 待瀑布动画的消息
  intradayNewsSchedule: ScheduledNews[];  // 当前session预排新闻
  newsIdCounter: number;               // 自增ID

  // 交易标记
  tradeMarkers: TradeMarker[];          // 当日交易点位标记

  // === 新系统：生命体征 + 日历 ===
  vitality: VitalityState;
  totalGameMinutes: number;          // 游戏总分钟数（核心时钟）
  calendar: GameCalendar;            // 当前日历状态
  deathCause: DeathCause | null;     // 死亡原因
  currentTradingDay: number;         // 当前交易日序号（用于趋势查询）
  todayIntradayGenerated: boolean;   // 当天分时数据是否已生成
}

interface GameActions {
  newGame: () => void;
  loadGame: () => boolean;
  saveGame: () => void;
  advancePhase: () => void;
  buy: (shares: number) => void;
  sell: (shares: number) => void;
  doActivity: (activityId: string) => void;
  finishAfterHours: () => void;
  replaceCardAt: (index: number, newCard: Card) => void;
  dismissPendingCard: () => void;
  addMessage: (msg: string) => void;
  getTotalAssets: () => number;
  dismissWaterfallMessage: (id: number) => void;

  // 盘中控制
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  tickForward: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setChartView: (view: StoreState['chartView']) => void;
  toggleMA: (key: keyof MAVisible) => void;

  // === 新系统：生命体征 ===
  eat: (foodId: string) => void;
  startSleep: (hours: number) => void;
  wakeUp: () => void;
}

// 辅助函数：将纯文本包装为系统消息
let _globalNewsId = 1;
function sysMsg(text: string, source: NewsMessage['source'] = 'system', priority: NewsMessage['priority'] = 'normal'): NewsMessage {
  return { id: _globalNewsId++, text, source, priority, timestamp: Date.now() };
}
function sysMsgs(texts: string[], source?: NewsMessage['source']): NewsMessage[] {
  return texts.map(t => sysMsg(t, source));
}

function createInitialState(): Omit<StoreState, 'actions'> {
  const price = getInitialPrice();
  // 游戏从第1天 09:00 开始（分钟540），给玩家盘前准备时间
  const initialMinutes = 540;
  const initialCalendar = getCalendar(initialMinutes);
  return {
    day: 0,
    phase: 'morning_news' as GamePhase,
    gameStatus: 'menu',
    cash: 30000,
    shares: 0,
    shareCostBasis: 0,
    stamina: 3,
    maxStamina: 3,
    dailyExpense: 150,
    goal: getRandomGoal(),
    currentPrice: price,
    stockHistory: [],
    trendSegments: generateTrendSegments(),
    stockName: getRandomStockName(),
    boughtToday: false,
    todayOpen: price,
    amClose: price,
    cards: [],
    maxCardSlots: 3,
    activeEventChains: [],
    currentEvent: null,
    eventLog: [],
    messages: [],
    activitiesDoneToday: [],
    peakAssets: 30000,
    totalTradingDays: 0,
    pendingCard: null,
    lunchHint: null,
    eventModifier: 0,
    extraStaminaNextDay: 0,
    intradayTicks: [],
    currentTick: 0,
    playbackSpeed: 1,
    tickTimerId: null,
    chartView: 'intraday',
    recentIntradayHistory: [],
    maVisible: { ma5: true, ma10: true, ma20: true },
    historyDays: 0,
    openingPattern: 'sideways_consolidation' as OpeningPattern,
    waterfallQueue: [],
    intradayNewsSchedule: [],
    newsIdCounter: 1,
    tradeMarkers: [],
    // 新系统
    vitality: createInitialVitality(),
    totalGameMinutes: initialMinutes,
    calendar: initialCalendar,
    deathCause: null,
    currentTradingDay: 0,
    todayIntradayGenerated: false,
  };
}

export const useGameStore = create<StoreState>((set, get) => ({
  ...createInitialState(),

  actions: {
    newGame: () => {
      get().actions.stopPlayback();
      const price = getInitialPrice();
      const goal = getRandomGoal();
      const pattern = getRandomOpeningPattern();
      const historyDays = 250;
      const segments = generateTrendSegments(historyDays, 200, pattern);
      const stockName = getRandomStockName();

      // 批量生成历史日K
      const historyData = generateHistoryData(historyDays, price, segments);
      const lastClose = historyData.length > 0
        ? historyData[historyData.length - 1].close
        : price;
      const startDay = historyDays + 1;

      // 游戏从09:00开始（给盘前准备时间）
      const initialMinutes = 540;
      const initialCalendar = getCalendar(initialMinutes);

      set({
        ...createInitialState(),
        day: startDay,
        phase: 'morning_news',
        gameStatus: 'playing',
        currentPrice: lastClose,
        todayOpen: lastClose,
        amClose: lastClose,
        goal,
        trendSegments: segments,
        stockName,
        stockHistory: historyData,
        historyDays,
        openingPattern: pattern,
        recentIntradayHistory: [],
        maVisible: { ma5: true, ma10: true, ma20: true },
        messages: sysMsgs([
          `欢迎来到股市！你的目标：${goal.title}（¥${goal.targetAmount.toLocaleString()}）`,
          `你选择了【${stockName}】，当前价格 ¥${lastClose}`,
          `📅 ${initialCalendar.date} ${getDayOfWeekLabel(initialCalendar.dayOfWeek)} ${minuteToTimeStr(initialCalendar.minuteOfDay)}`,
          '⚡ 注意管理你的精力和饥饿值，不要猝死哦！',
          '祝你好运，散户！',
        ]),
        waterfallQueue: [],
        intradayNewsSchedule: [],
        // 新系统初始化
        vitality: createInitialVitality(),
        totalGameMinutes: initialMinutes,
        calendar: initialCalendar,
        deathCause: null,
        currentTradingDay: 0,
        todayIntradayGenerated: false,
      });
    },

    loadGame: () => {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;
        const state = JSON.parse(saved);
        // 兼容旧存档：string[] → NewsMessage[]
        if (state.messages && state.messages.length > 0 && typeof state.messages[0] === 'string') {
          state.messages = (state.messages as string[]).map((t: string) => sysMsg(t));
        }
        if (!state.waterfallQueue) state.waterfallQueue = [];
        if (!state.intradayNewsSchedule) state.intradayNewsSchedule = [];
        if (!state.newsIdCounter) state.newsIdCounter = _globalNewsId;
        // 兼容旧存档：新系统字段
        if (!state.vitality) state.vitality = createInitialVitality();
        if (!state.totalGameMinutes) state.totalGameMinutes = 540;
        if (!state.calendar) state.calendar = getCalendar(state.totalGameMinutes);
        if (!state.tradeMarkers) state.tradeMarkers = [];
        if (state.deathCause === undefined) state.deathCause = null;
        if (!state.currentTradingDay) state.currentTradingDay = 0;
        if (state.todayIntradayGenerated === undefined) state.todayIntradayGenerated = false;
        set({ ...state, pendingCard: null, lunchHint: null, tickTimerId: null, playbackSpeed: 1 as PlaybackSpeed });
        return true;
      } catch {
        return false;
      }
    },

    saveGame: () => {
      const state = get();
      const { actions, pendingCard, lunchHint, tickTimerId, waterfallQueue, ...saveable } = state;
      // 保存时确保睡眠状态被中断
      const saveState = {
        ...saveable,
        vitality: { ...saveable.vitality, isSleeping: false },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
    },

    // ==================== 盘中控制 ====================

    setPlaybackSpeed: (speed: PlaybackSpeed) => {
      const state = get();
      set({ playbackSpeed: speed });

      // 重启定时器
      if (state.tickTimerId !== null) {
        clearInterval(state.tickTimerId);
        set({ tickTimerId: null });
      }
      if (speed > 0 && (state.phase === 'am_trading' || state.phase === 'pm_trading')) {
        get().actions.startPlayback();
      }
    },

    startPlayback: () => {
      const state = get();
      if (state.tickTimerId !== null) clearInterval(state.tickTimerId);
      if (state.playbackSpeed === 0) return;

      const interval = SPEED_INTERVALS[state.playbackSpeed];
      const id = window.setInterval(() => {
        get().actions.tickForward();
      }, interval);

      set({ tickTimerId: id });
    },

    stopPlayback: () => {
      const state = get();
      if (state.tickTimerId !== null) {
        clearInterval(state.tickTimerId);
        set({ tickTimerId: null });
      }
    },

    tickForward: () => {
      const state = get();
      const nextTick = state.currentTick + 1;

      // 上午盘结束 → 自动进入午休
      if (state.phase === 'am_trading' && nextTick > AM_END_TICK) {
        get().actions.stopPlayback();
        const amClosePrice = state.intradayTicks[AM_END_TICK]?.price ?? state.currentPrice;

        // 自动生成午间消息：根据下午走势给出提示（40%准确率，有卡牌加成）
        const pmClosePrice = state.intradayTicks[TOTAL_TICKS - 1]?.price ?? amClosePrice;
        const actualDirection = pmClosePrice >= amClosePrice ? 'up' : 'down';
        const infoAccuracy = 0.4 + sumCardEffects(state.cards, 'info_accuracy');
        const isReliable = Math.random() < infoAccuracy;
        const hintDirection = isReliable ? actualDirection : (actualDirection === 'up' ? 'down' : 'up');

        const lunchMessages = [
          { text: '食堂里有人在聊这只股票，听说下午可能', source: '食堂八卦' },
          { text: '你刷到一条消息，分析师说下午走势可能', source: '手机推送' },
          { text: '同事神秘兮兮地跟你说，下午大概率会', source: '同事爆料' },
          { text: '午休群里有人发了条消息，说下午要', source: '微信群' },
          { text: '你打盹时梦到下午股价', source: '午间灵感' },
        ];
        const lunchMsg = lunchMessages[Math.floor(Math.random() * lunchMessages.length)];

        set({
          phase: 'lunch_break',
          currentTick: AM_END_TICK,
          currentPrice: amClosePrice,
          amClose: amClosePrice,
          chartView: 'intraday',
          lunchHint: { direction: hintDirection, reliable: isReliable },
          messages: [
            sysMsg(`🍜 午间休息 | 上午收盘: ¥${amClosePrice.toFixed(2)}`, 'market_index'),
            sysMsg(`💬 ${lunchMsg.source}：${lunchMsg.text}${hintDirection === 'up' ? '涨 📈' : '跌 📉'}`, 'rumor'),
          ],
          intradayNewsSchedule: [],
        });
        return;
      }

      // 下午盘结束 → 自动进入盘后
      if (state.phase === 'pm_trading' && nextTick >= TOTAL_TICKS - 1) {
        get().actions.stopPlayback();
        const closePrice = state.intradayTicks[TOTAL_TICKS - 1]?.price ?? state.currentPrice;

        // 生成日K数据
        const ohlc = intradayToOHLC(state.intradayTicks);
        const dayData = { day: state.day, ...ohlc };
        const changePercent = ((closePrice - state.todayOpen) / state.todayOpen * 100).toFixed(2);

        // 保留最近5天分时数据
        const recentHistory = [...state.recentIntradayHistory, state.intradayTicks];
        if (recentHistory.length > 5) recentHistory.shift();

        set({
          phase: 'after_hours',
          currentTick: TOTAL_TICKS - 1,
          currentPrice: closePrice,
          stockHistory: [...state.stockHistory, dayData],
          recentIntradayHistory: recentHistory,
          chartView: 'intraday',
          messages: [
            sysMsg(`📊 收盘价: ¥${closePrice.toFixed(2)} (${Number(changePercent) >= 0 ? '+' : ''}${changePercent}%)`, 'market_index', 'important'),
            sysMsg(`⚡${Math.round(state.vitality.energy)} 🍚${Math.round(state.vitality.hunger)} 🧠${Math.round(state.vitality.sanity)}`),
          ],
          intradayNewsSchedule: [],
        });
        return;
      }

      // 正常推进tick
      if (nextTick < state.intradayTicks.length) {
        const tick = state.intradayTicks[nextTick];
        const changePercent = ((tick.price - state.todayOpen) / state.todayOpen) * 100;

        // 检查预排新闻
        const newsCtx = {
          stockName: state.stockName,
          price: tick.price,
          changePercent,
          todayOpen: state.todayOpen,
          amClose: state.amClose,
        };
        const { messages: newNews, updatedSchedule, nextId } = checkScheduledNews(
          nextTick, state.intradayNewsSchedule, newsCtx, state.newsIdCounter,
        );

        // 快速播放（speed>=3）时跳过瀑布动画
        const skipWaterfall = state.playbackSpeed >= 3;

        // 推进游戏时间（每个分时tick = 1分钟）并更新生命体征
        const newTotalMin = state.totalGameMinutes + 1;
        const newCalendar = getCalendar(newTotalMin);

        // 计算持仓涨跌幅
        const holdingChangePercent = state.shares > 0 && state.shareCostBasis > 0
          ? ((tick.price - state.shareCostBasis) / state.shareCostBasis * 100)
          : 0;

        const vitalityUpdates = tickVitality(state.vitality, 1, {
          isSleeping: state.vitality.isSleeping,
          holdingChangePercent,
          isWatching: true, // 交易时段=看盘
          sleepElapsedHours: 0,
        });

        const newVitality = { ...state.vitality, ...vitalityUpdates };

        // 检查死亡
        const death = checkDeath(newVitality);

        set({
          currentTick: nextTick,
          currentPrice: tick.price,
          intradayNewsSchedule: updatedSchedule,
          newsIdCounter: nextId,
          totalGameMinutes: newTotalMin,
          calendar: newCalendar,
          vitality: newVitality,
          ...(death ? {
            gameStatus: 'lost' as const,
            deathCause: death,
          } : {}),
          ...(newNews.length > 0 ? {
            messages: [...state.messages, ...newNews],
            waterfallQueue: skipWaterfall ? state.waterfallQueue : [...state.waterfallQueue, ...newNews],
          } : {}),
        });

        // 如果死亡了，停止播放
        if (death) {
          get().actions.stopPlayback();
        }
      }
    },

    setChartView: (view: StoreState['chartView']) => {
      const state = get();
      // 盘中只能看分时图
      if (state.phase === 'am_trading' || state.phase === 'pm_trading') {
        return; // 锁定分时图
      }
      set({ chartView: view });
    },

    toggleMA: (key: keyof MAVisible) => {
      const state = get();
      set({ maVisible: { ...state.maVisible, [key]: !state.maVisible[key] } });
    },

    // ==================== 回合推进 ====================

    advancePhase: () => {
      const state = get();
      if (state.gameStatus !== 'playing') return;

      if (state.phase === 'settlement') {
        // 进入下一天
        const nextDay = state.day + 1;
        const staminaBonus = sumCardEffects(state.cards, 'stamina_bonus');
        const baseStamina = 3 + staminaBonus + state.extraStaminaNextDay;

        const { triggered, remaining } = checkEventChains(nextDay, state.activeEventChains);
        const chainEvent = triggered.length > 0 ? triggered[0] : null;
        const todayEvent = chainEvent || rollEvent();
        const eventMod = getEventStockModifier(todayEvent);

        const cashFromEvent = getEventCashChange(todayEvent);
        const expenseFromEvent = getEventExpenseChange(todayEvent);
        const staminaFromEvent = getEventStaminaChange(todayEvent);
        const cardFromEvent = getEventCard(todayEvent);
        const chainId = getEventChainId(todayEvent);

        const newChains = [...remaining];
        if (chainId) {
          newChains.push({ eventId: chainId, triggerDay: nextDay + 1 + Math.floor(Math.random() * 2) });
        }

        let pendingCard: PendingCard | null = null;
        let newCards = state.cards;
        if (cardFromEvent) {
          const result = addCard(state.cards, cardFromEvent, state.maxCardSlots);
          if (result === null) {
            pendingCard = { card: cardFromEvent };
          } else {
            newCards = result;
          }
        }

        const newStamina = Math.max(0, baseStamina + staminaFromEvent);

        set({
          day: nextDay,
          phase: 'morning_news',
          currentEvent: todayEvent,
          eventLog: [...state.eventLog, { day: nextDay, event: todayEvent }],
          cash: state.cash + cashFromEvent,
          dailyExpense: Math.max(100, state.dailyExpense + expenseFromEvent),
          stamina: newStamina,
          maxStamina: baseStamina,
          boughtToday: false,
          activitiesDoneToday: [],
          activeEventChains: newChains,
          cards: newCards,
          pendingCard,
          eventModifier: eventMod,
          extraStaminaNextDay: 0,
          messages: [
            sysMsg(`=== 第 ${nextDay - state.historyDays} 天 ===`),
            sysMsg(`📰 ${todayEvent.title}`, 'breaking', todayEvent.rarity === 'legendary' ? 'urgent' : 'important'),
            sysMsg(todayEvent.description),
          ],
          lunchHint: null,
          intradayTicks: [],
          currentTick: 0,
          chartView: 'intraday',
        });
        return;
      }

      if (state.phase === 'morning_news') {
        // 进入上午交易：预生成全天分时数据
        const prevClose = state.currentPrice;
        const trend = getTrendForDay(state.day, state.trendSegments);
        const ticks = generateIntradayTicks(prevClose, trend, state.eventModifier);
        const openPrice = ticks[0].price;
        const changePercent = ((openPrice - prevClose) / prevClose) * 100;

        // 生成开盘爆发消息 + 预排上午新闻
        const newsCtx = { stockName: state.stockName, price: openPrice, changePercent, todayOpen: openPrice };
        const { messages: burstMsgs, nextId } = generateSessionBurst('am_trading', newsCtx, state.newsIdCounter);
        const amSchedule = scheduleSessionNews(5, AM_END_TICK - 5);

        const openMsgs = [
          sysMsg(`📈 开盘价: ¥${openPrice.toFixed(2)} ${openPrice >= prevClose ? '↑' : '↓'}`, 'market_index', 'important'),
          sysMsg('盘中实时交易已开始，可随时买入/卖出'),
        ];

        set({
          phase: 'am_trading',
          todayOpen: openPrice,
          currentPrice: openPrice,
          intradayTicks: ticks,
          currentTick: 0,
          playbackSpeed: 1 as PlaybackSpeed,
          chartView: 'intraday',
          tradeMarkers: [],
          messages: [...openMsgs, ...burstMsgs],
          waterfallQueue: burstMsgs,
          intradayNewsSchedule: amSchedule,
          newsIdCounter: nextId,
        });

        // 启动播放
        setTimeout(() => get().actions.startPlayback(), 50);
        return;
      }

      if (state.phase === 'lunch_break') {
        // 进入下午交易：从PM_START_TICK继续
        const pmPrice = state.intradayTicks[PM_START_TICK]?.price ?? state.currentPrice;
        const changePercent = ((pmPrice - state.todayOpen) / state.todayOpen) * 100;

        // 生成下午开盘爆发消息 + 预排下午新闻
        const newsCtx = { stockName: state.stockName, price: pmPrice, changePercent, todayOpen: state.todayOpen, amClose: state.amClose };
        const { messages: burstMsgs, nextId } = generateSessionBurst('pm_trading', newsCtx, state.newsIdCounter);
        const pmSchedule = scheduleSessionNews(PM_START_TICK + 5, TOTAL_TICKS - 10);

        const pmOpenMsg = sysMsg('📈 下午开盘，继续交易', 'market_index');

        set({
          phase: 'pm_trading',
          currentTick: PM_START_TICK,
          chartView: 'intraday',
          messages: [pmOpenMsg, ...burstMsgs],
          waterfallQueue: burstMsgs,
          intradayNewsSchedule: pmSchedule,
          newsIdCounter: nextId,
        });

        setTimeout(() => get().actions.startPlayback(), 50);
        return;
      }

      if (state.phase === 'after_hours') {
        get().actions.finishAfterHours();
        return;
      }
    },

    // ==================== 交易 ====================

    buy: (shares: number) => {
      const state = get();
      if (state.vitality.isSleeping) {
        set({ messages: [sysMsg('💤 你在睡觉，无法交易')] });
        return;
      }
      // SAN失控检查
      if (state.vitality.isInsane) {
        const check = insanityCheck();
        if (check?.blocked) {
          set({ messages: [sysMsg(check.message)] });
          return;
        }
        if (check) set({ messages: [...state.messages, sysMsg(check.message)] });
      }
      const cost = shares * state.currentPrice;
      if (cost > state.cash || shares <= 0) return;

      const totalCost = state.shareCostBasis * state.shares + cost;
      const totalShares = state.shares + shares;

      set({
        cash: Math.round((state.cash - cost) * 100) / 100,
        shares: totalShares,
        shareCostBasis: Math.round((totalCost / totalShares) * 100) / 100,
        boughtToday: true,
        tradeMarkers: [...state.tradeMarkers, { tick: state.currentTick, price: state.currentPrice, type: 'B' as const, shares }],
        messages: [sysMsg(`✅ 买入 ${shares} 股 @ ¥${state.currentPrice.toFixed(2)}，花费 ¥${cost.toFixed(2)}`, 'trade')],
      });
    },

    sell: (shares: number) => {
      const state = get();
      if (state.vitality.isSleeping) {
        set({ messages: [sysMsg('💤 你在睡觉，无法交易')] });
        return;
      }
      // SAN失控检查
      if (state.vitality.isInsane) {
        const check = insanityCheck();
        if (check?.blocked) {
          set({ messages: [sysMsg(check.message)] });
          return;
        }
        if (check) set({ messages: [...state.messages, sysMsg(check.message)] });
      }
      if (shares > state.shares || shares <= 0) return;
      if (state.boughtToday) {
        set({ messages: [sysMsg('❌ T+1规则：今日买入的股票明天才能卖出！', 'system', 'important')] });
        return;
      }

      const revenue = shares * state.currentPrice;
      const sellBonus = sumCardEffects(state.cards, 'sell_bonus');
      const bonus = revenue * sellBonus;
      const total = revenue + bonus;
      const remainingShares = state.shares - shares;

      set({
        cash: Math.round((state.cash + total) * 100) / 100,
        shares: remainingShares,
        shareCostBasis: remainingShares > 0 ? state.shareCostBasis : 0,
        tradeMarkers: [...state.tradeMarkers, { tick: state.currentTick, price: state.currentPrice, type: 'S' as const, shares }],
        messages: [
          sysMsg(`✅ 卖出 ${shares} 股 @ ¥${state.currentPrice.toFixed(2)}，获得 ¥${total.toFixed(2)}${bonus > 0 ? ` (含加成 +¥${bonus.toFixed(2)})` : ''}`, 'trade'),
        ],
      });
    },

    // ==================== 活动 ====================

    doActivity: (activityId: string) => {
      const state = get();
      const costs: Record<string, number> = { social_media: 1, research: 1, socializing: 2, side_hustle: 1 };
      const cost = costs[activityId] ?? 0;
      if (state.stamina < cost) {
        set({ messages: [sysMsg('❌ 体力不足！')] });
        return;
      }
      if (state.activitiesDoneToday.includes(activityId)) {
        set({ messages: [sysMsg('❌ 今天已经做过了！')] });
        return;
      }

      const result = executeActivity(activityId, state.cash, state.cards);
      const updates: Partial<StoreState> = {
        stamina: state.stamina - cost,
        activitiesDoneToday: [...state.activitiesDoneToday, activityId],
        messages: [sysMsg(result.message)],
      };

      if (result.cashChange) updates.cash = Math.round((state.cash + result.cashChange) * 100) / 100;
      if (result.staminaChange) updates.extraStaminaNextDay = (state.extraStaminaNextDay || 0) + result.staminaChange;
      if (result.infoHint) updates.lunchHint = result.infoHint;
      if (result.card) {
        const cardResult = addCard(state.cards, result.card, state.maxCardSlots);
        if (cardResult === null) updates.pendingCard = { card: result.card };
        else updates.cards = cardResult;
      }

      set(updates as StoreState);
    },

    finishAfterHours: () => {
      const state = get();
      const expenseReduction = sumCardEffects(state.cards, 'expense_reduce');
      const actualExpense = Math.max(50, state.dailyExpense - expenseReduction);
      const newCash = Math.round((state.cash - actualExpense) * 100) / 100;
      const totalAssets = newCash + state.shares * state.currentPrice;
      const newPeak = Math.max(state.peakAssets, totalAssets);

      let gameStatus = state.gameStatus;
      const messages: NewsMessage[] = [
        sysMsg(`💸 今日生活费: -¥${actualExpense}`),
        sysMsg(`💰 剩余现金: ¥${newCash.toFixed(2)}`),
        sysMsg(`📊 总资产: ¥${totalAssets.toFixed(2)} / 目标 ¥${state.goal.targetAmount.toLocaleString()}`),
      ];

      if (totalAssets >= state.goal.targetAmount) {
        gameStatus = 'won';
        messages.push(sysMsg(`🎉 恭喜！你达成了目标【${state.goal.title}】！`, 'system', 'urgent'));
      } else if (totalAssets < actualExpense) {
        gameStatus = 'lost';
        messages.push(sysMsg('💀 破产了！连生活费都付不起了...', 'system', 'urgent'));
      } else if (newCash < 0) {
        messages.push(sysMsg('⚠️ 警告：现金已为负！请尽快卖出股票回笼资金！', 'system', 'important'));
      }

      set({
        phase: 'settlement',
        cash: newCash,
        gameStatus,
        peakAssets: newPeak,
        totalTradingDays: state.totalTradingDays + 1,
        messages,
      });

      if (gameStatus === 'playing') {
        setTimeout(() => get().actions.saveGame(), 0);
      } else {
        localStorage.removeItem(SAVE_KEY);
      }
    },

    // ==================== 卡牌 ====================

    replaceCardAt: (index: number, newCard: Card) => {
      set({ cards: replaceCard(get().cards, index, newCard), pendingCard: null });
    },

    dismissPendingCard: () => set({ pendingCard: null }),

    addMessage: (msg: string) => set(state => ({ messages: [...state.messages, sysMsg(msg)] })),

    dismissWaterfallMessage: (id: number) => set(state => ({
      waterfallQueue: state.waterfallQueue.filter(m => m.id !== id),
    })),

    getTotalAssets: () => {
      const s = get();
      return Math.round((s.cash + s.shares * s.currentPrice) * 100) / 100;
    },

    // ==================== 生命体征系统 ====================

    eat: (foodId: string) => {
      const state = get();
      const food = FOODS.find(f => f.id === foodId);
      if (!food) return;
      if (state.cash < food.cost) {
        set({ messages: [sysMsg(`❌ 钱不够！${food.name}需要¥${food.cost}`)] });
        return;
      }
      if (state.vitality.isSleeping) {
        set({ messages: [sysMsg('❌ 睡觉中不能吃东西...')] });
        return;
      }

      const newHunger = Math.min(state.vitality.maxHunger, state.vitality.hunger + food.hungerRestore);
      const newSanity = Math.min(state.vitality.maxSanity, state.vitality.sanity + food.sanityRestore);
      set({
        cash: Math.round((state.cash - food.cost) * 100) / 100,
        vitality: {
          ...state.vitality,
          hunger: newHunger,
          sanity: newSanity,
          hoursWithoutFood: 0,
        },
        messages: [sysMsg(`${food.emoji} 吃了${food.name}！饱腹+${food.hungerRestore} (¥${food.cost})${food.sanityRestore > 0 ? ` SAN+${food.sanityRestore}` : ''}`)],
      });
    },

    startSleep: (hours: number) => {
      const state = get();
      if (state.vitality.isSleeping) return;
      if (hours <= 0 || hours > 12) return;

      // 睡觉时暂停玩家操作
      set({
        vitality: {
          ...state.vitality,
          isSleeping: true,
          sleepStartMinute: state.totalGameMinutes,
          sleepHours: hours,
        },
        messages: [sysMsg(`😴 开始睡觉，计划睡${hours}小时... 💤`)],
      });

      // 不暂停分时图播放，但切换到加速模式
      if (state.phase === 'am_trading' || state.phase === 'pm_trading') {
        // 交易时段睡觉：加速到3x
        get().actions.setPlaybackSpeed(3);
      }
    },

    wakeUp: () => {
      const state = get();
      if (!state.vitality.isSleeping) return;

      const sleepMinutes = state.totalGameMinutes - state.vitality.sleepStartMinute;
      const actualHours = sleepMinutes / 60;

      set({
        vitality: {
          ...state.vitality,
          isSleeping: false,
          sleepStartMinute: 0,
          sleepHours: 0,
          hoursWithoutSleep: 0,
        },
        messages: [sysMsg(`☀️ 醒来了！睡了${actualHours.toFixed(1)}小时，精力: ${Math.round(state.vitality.energy)}/100`)],
      });

      // 恢复正常播放速度
      if (state.phase === 'am_trading' || state.phase === 'pm_trading') {
        get().actions.setPlaybackSpeed(1);
      }
    },
  },
}));
