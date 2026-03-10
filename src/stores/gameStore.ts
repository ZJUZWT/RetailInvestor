import { create } from 'zustand';
import type { GameState, Card, OpeningPattern, MAVisible, TradeMarker, DeathCause, JobState, PendingOrder } from '../types';
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
import { ACTIVITIES as ACTIVITIES_DATA } from '../data/activities';
import type { FlashEvent } from '../data/flashEvents';
import { rollFlashEvent } from '../data/flashEvents';
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
  type MarketPhase,
  getCalendar,
  minuteToTimeStr,
  getDayOfWeekLabel,
  gameMinuteToTick,
} from '../engine/CalendarSystem';
import { checkTutorialTrigger } from '../engine/TutorialSystem';
import { updateMetaOnGameEnd } from '../engine/MetaSystem';
import type { Achievement } from '../engine/MetaSystem';

const SAVE_KEY = 'retail_investor_save';

// === 上班系统常量 ===
const JOB_TITLES = ['程序员', '运营专员', '产品经理', '测试工程师', '设计师', '财务会计', '行政文员', '销售代表'];
const JOB_SALARY_RANGE = { min: 250, max: 500 }; // 日薪范围
const CATCH_PENALTY = 500; // 被抓一次罚款
const SLACKING_CATCH_RATE = 0.015; // 摸鱼每分钟被抓概率 (~1.5%)
const TOILET_MAX_MINUTES = 30; // 带薪拉屎最大时长
const WORK_START_MINUTE = 540; // 09:00
const WORK_END_MINUTE = 1080; // 18:00

const WORK_TOTAL_MINUTES = WORK_END_MINUTE - WORK_START_MINUTE; // 540分钟 = 9小时

function createInitialJob(): JobState {
  const title = JOB_TITLES[Math.floor(Math.random() * JOB_TITLES.length)];
  const salary = JOB_SALARY_RANGE.min + Math.floor(Math.random() * (JOB_SALARY_RANGE.max - JOB_SALARY_RANGE.min));
  return {
    employed: true,
    dailySalary: salary,
    jobTitle: title,
    isSlacking: false,
    caughtToday: 0,
    totalCaught: 0,
    catchPenalty: CATCH_PENALTY,
    toiletUsedToday: false,
    isOnToilet: false,
    toiletStartMinute: 0,
    toiletMaxMinutes: TOILET_MAX_MINUTES,
    paidToday: false,
    isWorkingHours: false,
    workProgress: 0,
    workMinutesToday: 0,
    slackMinutesToday: 0,
  };
}

export type PlaybackSpeed = 0 | 1 | 2 | 3; // 0=暂停, 1=正常, 2=快进, 3=超快

// 每个speed对应的ms/tick间隔（每tick = 1游戏分钟）
const SPEED_INTERVALS: Record<PlaybackSpeed, number> = {
  0: Infinity, // 暂停
  1: 500,      // 正常
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
  chartView: 'intraday' | 'daily' | 'weekly' | 'monthly' | '5day';
  recentIntradayHistory: IntradayTick[][]; // 最近5天分时数据
  maVisible: MAVisible;

  // 消息瀑布系统
  waterfallQueue: NewsMessage[];
  intradayNewsSchedule: ScheduledNews[];
  newsIdCounter: number;

  // 交易标记
  tradeMarkers: TradeMarker[];

  // 挂单系统
  pendingOrders: PendingOrder[];

  // 盘中快速事件
  activeFlashEvent: FlashEvent | null;
  lastFlashEventMinute: number;  // 上次快速事件触发的游戏分钟

  // === 核心时间系统 ===
  vitality: VitalityState;
  totalGameMinutes: number;          // 游戏总分钟数（核心时钟）
  calendar: GameCalendar;            // 当前日历状态
  deathCause: DeathCause | null;
  currentTradingDay: number;         // 当前交易日序号
  todayIntradayGenerated: boolean;   // 当天分时数据是否已生成
  todaySettled: boolean;             // 当天是否已结算
  lastMarketPhase: MarketPhase;      // 上一个tick的市场阶段（用于检测转换）

  // 自动加速标记（非交易时段自动加速到2x）
  autoSpeedUp: boolean;

  // 新手教程
  tutorialStep: number;           // 当前教程步骤索引
  wasSlackingBefore: boolean;     // 是否曾经摸过鱼（教程用）

  // Meta解锁：本局新解锁成就
  lastUnlockedAchievements: Achievement[];

  // 信息瀑布：当天已推送的事件类型（避免重复）
  todayNewsPushed: {
    morningNews: boolean;
    openBurst: boolean;
    lunchNews: boolean;
    pmBurst: boolean;
    closeNews: boolean;
  };
}

interface GameActions {
  newGame: () => void;
  loadGame: () => boolean;
  saveGame: () => void;
  buy: (shares: number) => void;
  sell: (shares: number) => void;
  doActivity: (activityId: string) => void;
  replaceCardAt: (index: number, newCard: Card) => void;
  dismissPendingCard: () => void;
  addMessage: (msg: string) => void;
  getTotalAssets: () => number;
  dismissWaterfallMessage: (id: number) => void;

  // 时间控制
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  globalTick: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  setChartView: (view: StoreState['chartView']) => void;
  toggleMA: (key: keyof MAVisible) => void;
  skipToNext: () => void;          // 跳过到下一事件节点

  // 生命体征
  eat: (foodId: string) => void;
  startSleep: (hours: number) => void;
  wakeUp: () => void;

  // 上班系统
  toggleSlacking: () => void;     // 开关摸鱼
  startToilet: () => void;        // 开始带薪拉屎
  quitJob: () => void;            // 离职

  // 挂单系统
  placeOrder: (order: Omit<PendingOrder, 'id' | 'createdAt' | 'executed'>) => void;
  cancelOrder: (orderId: string) => void;

  // 盘中快速事件
  resolveFlashEvent: (choiceIndex: number) => void;
}

// 辅助函数
let _globalNewsId = 1;
function sysMsg(text: string, source: NewsMessage['source'] = 'system', priority: NewsMessage['priority'] = 'normal'): NewsMessage {
  return { id: _globalNewsId++, text, source, priority, timestamp: Date.now() };
}
function sysMsgs(texts: string[], source?: NewsMessage['source']): NewsMessage[] {
  return texts.map(t => sysMsg(t, source));
}

function createInitialState(): Omit<StoreState, 'actions'> {
  const price = getInitialPrice();
  // 游戏从第1天 08:00 开始
  const initialMinutes = 480;
  const initialCalendar = getCalendar(initialMinutes);
  return {
    day: 0,
    gameStatus: 'menu',
    cash: 10000,
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
    job: createInitialJob(),
    peakAssets: 10000,
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
    pendingOrders: [],
    activeFlashEvent: null,
    lastFlashEventMinute: 0,
    // 核心时间系统
    vitality: createInitialVitality(),
    totalGameMinutes: initialMinutes,
    calendar: initialCalendar,
    deathCause: null,
    currentTradingDay: 0,
    todayIntradayGenerated: false,
    todaySettled: false,
    lastMarketPhase: initialCalendar.marketPhase,
    todayNewsPushed: {
      morningNews: false,
      openBurst: false,
      lunchNews: false,
      pmBurst: false,
      closeNews: false,
    },
    autoSpeedUp: false,
    tutorialStep: 0,
    wasSlackingBefore: false,
    lastUnlockedAchievements: [],
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

      const historyData = generateHistoryData(historyDays, price, segments);
      const lastClose = historyData.length > 0
        ? historyData[historyData.length - 1].close
        : price;
      const startDay = historyDays + 1;

      // 游戏从08:00开始
      const initialMinutes = 480;
      const initialCalendar = getCalendar(initialMinutes);

      const initialJob = createInitialJob();

      set({
        ...createInitialState(),
        day: startDay,
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
        job: initialJob,
        messages: sysMsgs([
          `欢迎来到股市！你的目标：${goal.title}（¥${goal.targetAmount.toLocaleString()}）`,
          `你选择了【${stockName}】，当前价格 ¥${lastClose}`,
          `📅 ${initialCalendar.date} ${getDayOfWeekLabel(initialCalendar.dayOfWeek)} ${minuteToTimeStr(initialCalendar.minuteOfDay)}`,
          `💼 你的工作：${initialJob.jobTitle}，日薪 ¥${initialJob.dailySalary}`,
          '⚠️ 上班时间想炒股得摸鱼，小心被领导抓到！',
          '⚡ 注意管理你的精力和饥饿值，不要猝死哦！',
          '祝你好运，散户！',
        ]),
        waterfallQueue: [],
        intradayNewsSchedule: [],
        vitality: createInitialVitality(),
        totalGameMinutes: initialMinutes,
        calendar: initialCalendar,
        deathCause: null,
        currentTradingDay: 0,
        todayIntradayGenerated: false,
        todaySettled: false,
        lastMarketPhase: initialCalendar.marketPhase,
        todayNewsPushed: {
          morningNews: false,
          openBurst: false,
          lunchNews: false,
          pmBurst: false,
          closeNews: false,
        },
      });

      // 自动开始时间流动
      setTimeout(() => get().actions.startPlayback(), 100);
    },

    loadGame: () => {
      try {
        const saved = localStorage.getItem(SAVE_KEY);
        if (!saved) return false;
        const state = JSON.parse(saved);
        // 兼容旧存档
        if (state.messages && state.messages.length > 0 && typeof state.messages[0] === 'string') {
          state.messages = (state.messages as string[]).map((t: string) => sysMsg(t));
        }
        if (!state.waterfallQueue) state.waterfallQueue = [];
        if (!state.intradayNewsSchedule) state.intradayNewsSchedule = [];
        if (!state.newsIdCounter) state.newsIdCounter = _globalNewsId;
        if (!state.vitality) state.vitality = createInitialVitality();
        if (!state.totalGameMinutes) state.totalGameMinutes = 480;
        if (!state.calendar) state.calendar = getCalendar(state.totalGameMinutes);
        if (!state.tradeMarkers) state.tradeMarkers = [];
        if (!state.pendingOrders) state.pendingOrders = [];
        if (!state.job) state.job = createInitialJob();
        if (state.deathCause === undefined) state.deathCause = null;
        if (!state.currentTradingDay) state.currentTradingDay = 0;
        if (state.todayIntradayGenerated === undefined) state.todayIntradayGenerated = false;
        if (state.todaySettled === undefined) state.todaySettled = false;
        if (!state.lastMarketPhase) state.lastMarketPhase = state.calendar?.marketPhase ?? 'pre_market';
        if (!state.todayNewsPushed) state.todayNewsPushed = {
          morningNews: false, openBurst: false, lunchNews: false, pmBurst: false, closeNews: false,
        };
        if (state.autoSpeedUp === undefined) state.autoSpeedUp = false;
        if (state.activeFlashEvent === undefined) state.activeFlashEvent = null;
        if (state.lastFlashEventMinute === undefined) state.lastFlashEventMinute = 0;
        if (state.tutorialStep === undefined) state.tutorialStep = 9; // 旧存档跳过教程
        if (state.wasSlackingBefore === undefined) state.wasSlackingBefore = true;
        // 移除旧的 phase 字段
        delete state.phase;
        set({ ...state, pendingCard: null, lunchHint: null, tickTimerId: null, playbackSpeed: 1 as PlaybackSpeed, autoSpeedUp: false });
        // 自动恢复时间流动
        setTimeout(() => get().actions.startPlayback(), 100);
        return true;
      } catch {
        return false;
      }
    },

    saveGame: () => {
      const state = get();
      const { actions, pendingCard, lunchHint, tickTimerId, waterfallQueue, ...saveable } = state;
      const saveState = {
        ...saveable,
        vitality: { ...saveable.vitality, isSleeping: false },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveState));
    },

    // ==================== 时间控制 ====================

    setPlaybackSpeed: (speed: PlaybackSpeed) => {
      const state = get();
      set({ playbackSpeed: speed });

      if (state.tickTimerId !== null) {
        clearInterval(state.tickTimerId);
        set({ tickTimerId: null });
      }
      if (speed > 0) {
        get().actions.startPlayback();
      }
    },

    startPlayback: () => {
      const state = get();
      if (state.tickTimerId !== null) clearInterval(state.tickTimerId);
      if (state.playbackSpeed === 0) return;
      if (state.gameStatus !== 'playing') return;

      const interval = SPEED_INTERVALS[state.playbackSpeed];
      const id = window.setInterval(() => {
        get().actions.globalTick();
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

    // ==================== 核心：全局时间推进 ====================
    globalTick: () => {
      const state = get();
      if (state.gameStatus !== 'playing') return;

      // 闪电事件激活时暂停时间流动
      if (state.activeFlashEvent) return;

      const newTotalMin = state.totalGameMinutes + 1;
      const newCalendar = getCalendar(newTotalMin);
      const prevCalendar = state.calendar;
      const prevPhase = state.lastMarketPhase;
      const curPhase = newCalendar.marketPhase;

      // 新的一天检测（日期变了）
      const isNewDay = newCalendar.date !== prevCalendar.date;

      let updates: Partial<StoreState> = {
        totalGameMinutes: newTotalMin,
        calendar: newCalendar,
        lastMarketPhase: curPhase,
      };

      const newMessages: NewsMessage[] = [];
      const newWaterfall: NewsMessage[] = [];
      const skipWaterfall = state.playbackSpeed >= 3;

      // ====== 新一天处理 ======
      if (isNewDay) {
        const newDayUpdates = handleNewDay(state, newCalendar);
        updates = { ...updates, ...newDayUpdates.updates };
        newMessages.push(...newDayUpdates.messages);
        newWaterfall.push(...newDayUpdates.messages);
      }

      // ====== 市场阶段转换事件 ======
      const todayPushed = { ...(isNewDay ? {
        morningNews: false, openBurst: false, lunchNews: false, pmBurst: false, closeNews: false,
      } : (updates.todayNewsPushed ?? state.todayNewsPushed)) };

      // 盘前晨报（08:30自动推送，每天一次）
      if (newCalendar.isTradingDay && newCalendar.minuteOfDay >= 510 && !todayPushed.morningNews) {
        const morningMsgs = generateMorningNews(state);
        newMessages.push(...morningMsgs);
        newWaterfall.push(...morningMsgs);
        todayPushed.morningNews = true;
      }

      // 进入上午交易时段：生成分时数据 + 开盘爆发消息
      if (curPhase === 'am_trading' && !state.todayIntradayGenerated && !(updates.todayIntradayGenerated)) {
        const openResult = handleMarketOpen(state, updates);
        updates = { ...updates, ...openResult.updates };
        newMessages.push(...openResult.messages);
        newWaterfall.push(...openResult.messages);
        todayPushed.openBurst = true;
      }

      // 上午→午休转换：生成午间消息
      if (prevPhase === 'am_trading' && curPhase === 'lunch_break' && !todayPushed.lunchNews) {
        const lunchResult = handleLunchTransition(state);
        newMessages.push(...lunchResult.messages);
        newWaterfall.push(...lunchResult.messages);
        todayPushed.lunchNews = true;
        // 记录上午收盘价
        const amEndTick = 120;
        const amClosePrice = state.intradayTicks[amEndTick]?.price ?? state.currentPrice;
        updates.amClose = amClosePrice;
      }

      // 午休→下午交易转换：下午开盘消息
      if (prevPhase === 'lunch_break' && curPhase === 'pm_trading' && !todayPushed.pmBurst) {
        const pmResult = handlePMOpen(state);
        newMessages.push(...pmResult.messages);
        newWaterfall.push(...pmResult.messages);
        todayPushed.pmBurst = true;
      }

      // 下午交易→盘后转换：收盘 + 结算
      if (prevPhase === 'pm_trading' && curPhase === 'after_hours' && !todayPushed.closeNews) {
        const closeResult = handleMarketClose(state);
        updates = { ...updates, ...closeResult.updates };
        newMessages.push(...closeResult.messages);
        newWaterfall.push(...closeResult.messages);
        todayPushed.closeNews = true;
      }

      updates.todayNewsPushed = todayPushed;

      // ====== 交易时段：推进分时tick ======
      if ((curPhase === 'am_trading' || curPhase === 'pm_trading') && state.intradayTicks.length > 0) {
        const tickIdx = gameMinuteToTick(newCalendar.minuteOfDay);
        if (tickIdx !== null && tickIdx < state.intradayTicks.length) {
          const tick = state.intradayTicks[tickIdx];
          updates.currentTick = tickIdx;
          updates.currentPrice = tick.price;

          // 检查预排新闻
          const changePercent = ((tick.price - state.todayOpen) / state.todayOpen) * 100;
          const newsCtx = {
            stockName: state.stockName,
            price: tick.price,
            changePercent,
            todayOpen: state.todayOpen,
            amClose: updates.amClose ?? state.amClose,
          };
          const { messages: tickNews, updatedSchedule, nextId } = checkScheduledNews(
            tickIdx, state.intradayNewsSchedule, newsCtx, updates.newsIdCounter ?? state.newsIdCounter,
          );
          if (tickNews.length > 0) {
            newMessages.push(...tickNews);
            if (!skipWaterfall) newWaterfall.push(...tickNews);
          }
          updates.intradayNewsSchedule = updatedSchedule;
          updates.newsIdCounter = nextId;
        }
      }

      // ====== 挂单触发检查 ======
      if ((curPhase === 'am_trading' || curPhase === 'pm_trading') && (state.pendingOrders?.length ?? 0) > 0) {
        const curPrice = updates.currentPrice ?? state.currentPrice;
        const orders = [...(state.pendingOrders ?? [])];
        let cashAfterOrders = updates.cash ?? state.cash;
        let sharesAfterOrders = updates.shares ?? state.shares;
        let costBasisAfterOrders = updates.shareCostBasis ?? state.shareCostBasis;
        let boughtTodayAfterOrders = updates.boughtToday ?? state.boughtToday;
        const orderMarkers: TradeMarker[] = [];
        let hasChanges = false;

        for (const order of orders) {
          if (order.executed) continue;
          let triggered = false;

          switch (order.type) {
            case 'limit_buy':
              triggered = curPrice <= order.triggerPrice;
              break;
            case 'limit_sell':
            case 'take_profit':
              triggered = curPrice >= order.triggerPrice;
              break;
            case 'stop_loss':
              triggered = curPrice <= order.triggerPrice;
              break;
          }

          if (triggered) {
            if (order.type === 'limit_buy') {
              const buyCost = order.shares * curPrice;
              if (buyCost <= cashAfterOrders) {
                const totalCost = costBasisAfterOrders * sharesAfterOrders + buyCost;
                sharesAfterOrders += order.shares;
                costBasisAfterOrders = Math.round((totalCost / sharesAfterOrders) * 100) / 100;
                cashAfterOrders = Math.round((cashAfterOrders - buyCost) * 100) / 100;
                boughtTodayAfterOrders = true;
                orderMarkers.push({ tick: updates.currentTick ?? state.currentTick, price: curPrice, type: 'B', shares: order.shares });
                newMessages.push(sysMsg(`📋 限价买入触发！买入 ${order.shares} 股 @ ¥${curPrice.toFixed(2)}`, 'trade', 'important'));
                order.executed = true;
                hasChanges = true;
              }
            } else {
              // 卖出类挂单
              const sellShares = Math.min(order.shares, sharesAfterOrders);
              if (sellShares > 0 && !boughtTodayAfterOrders) {
                const revenue = sellShares * curPrice;
                cashAfterOrders = Math.round((cashAfterOrders + revenue) * 100) / 100;
                sharesAfterOrders -= sellShares;
                if (sharesAfterOrders === 0) costBasisAfterOrders = 0;
                orderMarkers.push({ tick: updates.currentTick ?? state.currentTick, price: curPrice, type: 'S', shares: sellShares });
                const label = order.type === 'stop_loss' ? '止损' : order.type === 'take_profit' ? '止盈' : '限价卖出';
                newMessages.push(sysMsg(`📋 ${label}触发！卖出 ${sellShares} 股 @ ¥${curPrice.toFixed(2)}`, 'trade', 'important'));
                order.executed = true;
                hasChanges = true;
              }
            }
          }
        }

        if (hasChanges) {
          updates.pendingOrders = orders;
          updates.cash = cashAfterOrders;
          updates.shares = sharesAfterOrders;
          updates.shareCostBasis = costBasisAfterOrders;
          updates.boughtToday = boughtTodayAfterOrders;
          updates.tradeMarkers = [...(updates.tradeMarkers ?? state.tradeMarkers), ...orderMarkers];
        }
      }

      // ====== 盘中快速事件触发 ======
      if ((curPhase === 'am_trading' || curPhase === 'pm_trading') && !state.activeFlashEvent) {
        // 距上次事件至少间隔60分钟，每分钟0.3%概率触发（~每交易日约1次）
        const minsSinceLastFlash = newTotalMin - (state.lastFlashEventMinute ?? 0);
        if (minsSinceLastFlash >= 60 && Math.random() < 0.003) {
          const changePercent = state.todayOpen > 0
            ? (((updates.currentPrice ?? state.currentPrice) - state.todayOpen) / state.todayOpen * 100)
            : 0;
          const flashEvent = rollFlashEvent(changePercent);
          updates.activeFlashEvent = flashEvent;
          updates.lastFlashEventMinute = newTotalMin;
          newMessages.push(sysMsg(`⚡ ${flashEvent.emoji} ${flashEvent.title}`, 'breaking', 'urgent'));
        }
      }

      // ====== 生命体征更新 ======
      const isInTrading = curPhase === 'am_trading' || curPhase === 'pm_trading';
      const holdingChangePercent = state.shares > 0 && state.shareCostBasis > 0
        ? ((state.currentPrice - state.shareCostBasis) / state.shareCostBasis * 100)
        : 0;

      const sleepElapsed = state.vitality.isSleeping
        ? (newTotalMin - state.vitality.sleepStartMinute) / 60
        : 0;

      const vitalityUpdates = tickVitality(state.vitality, 1, {
        isSleeping: state.vitality.isSleeping,
        holdingChangePercent,
        isWatching: isInTrading && !state.vitality.isSleeping,
        sleepElapsedHours: sleepElapsed,
      });

      const newVitality = { ...state.vitality, ...vitalityUpdates };

      // 自动醒来检查
      if (state.vitality.isSleeping && state.vitality.sleepHours > 0) {
        const sleepDuration = (newTotalMin - state.vitality.sleepStartMinute) / 60;
        if (sleepDuration >= state.vitality.sleepHours) {
          newVitality.isSleeping = false;
          newVitality.sleepStartMinute = 0;
          newVitality.sleepHours = 0;
          newVitality.hoursWithoutSleep = 0;
          const wakeMsg = sysMsg(`☀️ 自然醒来！睡了${sleepDuration.toFixed(1)}小时，精力: ${Math.round(newVitality.energy)}/100`);
          newMessages.push(wakeMsg);
          newWaterfall.push(wakeMsg);
        }
      }

      updates.vitality = newVitality;

      // ====== 上班系统更新 ======
      const jobState = updates.job ?? state.job;
      if (jobState.employed) {
        const isWorkDay = newCalendar.isTradingDay; // 工作日 = 交易日
        const inWorkHours = isWorkDay && newCalendar.minuteOfDay >= WORK_START_MINUTE && newCalendar.minuteOfDay < WORK_END_MINUTE;
        const newJob = { ...jobState, isWorkingHours: inWorkHours };

        // 上班时间：工作进度 & 摸鱼分钟统计
        if (inWorkHours) {
          newJob.workMinutesToday += 1;
          if (newJob.isSlacking) {
            // 摸鱼中 → 不涨工作进度，统计摸鱼分钟
            newJob.slackMinutesToday += 1;
          } else {
            // 认真工作 → 涨工作进度（每分钟增加 100/WORK_TOTAL_MINUTES）
            newJob.workProgress = Math.min(100, newJob.workProgress + (100 / WORK_TOTAL_MINUTES));
          }
        }

        // 发工资：每个工作日到下班时（18:00）按工作进度比率发放
        if (isWorkDay && newCalendar.minuteOfDay >= WORK_END_MINUTE && !newJob.paidToday) {
          const progressRatio = Math.round(newJob.workProgress) / 100;
          const salaryReduce = sumCardEffects(state.cards, 'salary_reduce');
          const actualSalary = Math.round(newJob.dailySalary * progressRatio * (1 - salaryReduce));
          updates.cash = Math.round(((updates.cash ?? state.cash) + actualSalary) * 100) / 100;
          if (progressRatio >= 0.9) {
            newMessages.push(sysMsg(`💰 今日工资到账: +¥${actualSalary} (${newJob.jobTitle}，出勤率${Math.round(newJob.workProgress)}%，表现优秀！)`, 'system', 'important'));
          } else if (progressRatio >= 0.5) {
            newMessages.push(sysMsg(`💰 今日工资到账: +¥${actualSalary} (${newJob.jobTitle}，出勤率仅${Math.round(newJob.workProgress)}%，按比例扣薪)`, 'system', 'important'));
          } else {
            newMessages.push(sysMsg(`💰 今日工资到账: +¥${actualSalary} (${newJob.jobTitle}，出勤率${Math.round(newJob.workProgress)}%，你今天大部分时间在摸鱼...)`, 'system', 'urgent'));
          }
          newWaterfall.push(sysMsg(`💰 工资: +¥${actualSalary} (进度${Math.round(newJob.workProgress)}%)`, 'system', 'important'));
          newJob.paidToday = true;
        }

        // 下班自动关闭摸鱼
        if (!inWorkHours && newJob.isSlacking) {
          newJob.isSlacking = false;
          newJob.isOnToilet = false;
        }

        // 带薪拉屎倒计时
        if (newJob.isOnToilet) {
          const toiletElapsed = newTotalMin - newJob.toiletStartMinute;
          if (toiletElapsed >= newJob.toiletMaxMinutes) {
            // 拉屎时间用完
            newJob.isOnToilet = false;
            const toiletEndMsg = sysMsg('🚽 带薪拉屎时间到！你被迫回到工位...小心摸鱼被抓！', 'system', 'important');
            newMessages.push(toiletEndMsg);
            newWaterfall.push(toiletEndMsg);
          }
        }

        // 摸鱼被抓检测（上班时间 + 正在摸鱼 + 不在厕所）
        if (inWorkHours && newJob.isSlacking && !newJob.isOnToilet) {
          const catchReduceRate = sumCardEffects(state.cards, 'catch_rate_reduce');
          const actualCatchRate = SLACKING_CATCH_RATE * (1 - Math.min(catchReduceRate, 1));
          if (Math.random() < actualCatchRate) {
            const penalty = newJob.catchPenalty;
            newJob.caughtToday += 1;
            newJob.totalCaught += 1;
            newJob.isSlacking = false; // 被抓后自动关闭摸鱼
            updates.cash = Math.round(((updates.cash ?? state.cash) - penalty) * 100) / 100;
            const catchMsgs = [
              `👔 "小${newJob.jobTitle.slice(-1)}，上班时间看什么股票！" 罚款 ¥${penalty}`,
              `😱 领导突然出现在身后！"这是K线图？？" 罚款 ¥${penalty}`,
              `👀 HR发来消息：有人举报你上班摸鱼。罚款 ¥${penalty}`,
              `📸 被领导拍到屏幕上的股票APP！罚款 ¥${penalty}`,
              `🤦 开会时手机屏幕亮了，弹出股票成交通知... 罚款 ¥${penalty}`,
            ];
            const catchMsg = sysMsg(catchMsgs[Math.floor(Math.random() * catchMsgs.length)], 'system', 'urgent');
            newMessages.push(catchMsg);
            newWaterfall.push(catchMsg);
          }
        }

        updates.job = newJob;
      }

      // 死亡检查
      const death = checkDeath(newVitality);
      if (death) {
        updates.gameStatus = 'lost';
        updates.deathCause = death;
        get().actions.stopPlayback();

        // Meta 系统更新
        const curCash = updates.cash ?? state.cash;
        const curShares = updates.shares ?? state.shares;
        const curPrice = updates.currentPrice ?? state.currentPrice;
        const metaResult = updateMetaOnGameEnd({
          isWin: false,
          totalAssets: curCash + curShares * curPrice,
          peakAssets: updates.peakAssets ?? state.peakAssets,
          totalTradingDays: updates.totalTradingDays ?? state.totalTradingDays,
          deathCause: death,
          totalCaught: (updates.job ?? state.job).totalCaught,
          cards: (updates.cards ?? state.cards).map(c => c.id),
        });
        updates.lastUnlockedAchievements = metaResult.newAchievements;
      }

      // ====== 智能自动加速 ======
      // 当市场阶段发生变化时，自动调整速度
      if (curPhase !== prevPhase && !death) {
        const enteringIdle = curPhase === 'after_hours' || curPhase === 'pre_market' || curPhase === 'closed' || curPhase === 'lunch_break';
        const enteringActive = curPhase === 'am_trading' || curPhase === 'pm_trading';

        if (enteringIdle && state.playbackSpeed <= 1 && !state.vitality.isSleeping) {
          // 进入非交易时段 → 自动加速到2x
          updates.autoSpeedUp = true;
          setTimeout(() => {
            const s = get();
            if (s.autoSpeedUp) get().actions.setPlaybackSpeed(2);
          }, 50);
        } else if (enteringActive && state.autoSpeedUp) {
          // 进入交易时段 → 恢复1x（仅当是自动加速的情况下）
          updates.autoSpeedUp = false;
          setTimeout(() => get().actions.setPlaybackSpeed(1), 50);
        }
      }

      // ====== 新手教程检查 ======
      const tutorialCtx = {
        tutorialStep: state.tutorialStep,
        isFirstTradingDay: (updates.currentTradingDay ?? state.currentTradingDay) <= 1,
        minuteOfDay: newCalendar.minuteOfDay,
        marketPhase: curPhase as string,
        isSlacking: (updates.job ?? state.job).isSlacking,
        wasSlackingBefore: state.wasSlackingBefore,
        energy: (updates.vitality ?? state.vitality).energy,
        isNewDay,
        currentTradingDay: updates.currentTradingDay ?? state.currentTradingDay,
      };
      const triggeredTutorial = checkTutorialTrigger(tutorialCtx);
      if (triggeredTutorial) {
        const tutorialMsgs = triggeredTutorial.messages.map(t =>
          sysMsg(`💬 老张：${t}`, 'system', triggeredTutorial.important ? 'important' : 'normal')
        );
        newMessages.push(...tutorialMsgs);
        newWaterfall.push(...tutorialMsgs);
        updates.tutorialStep = state.tutorialStep + 1;
      }

      // ====== Meta 系统：结算导致的胜利/破产 ======
      if ((updates.gameStatus === 'won' || updates.gameStatus === 'lost') && !death) {
        get().actions.stopPlayback();
        const metaCash = updates.cash ?? state.cash;
        const metaShares = updates.shares ?? state.shares;
        const metaPrice = updates.currentPrice ?? state.currentPrice;
        const metaResult = updateMetaOnGameEnd({
          isWin: updates.gameStatus === 'won',
          totalAssets: metaCash + metaShares * metaPrice,
          peakAssets: updates.peakAssets ?? state.peakAssets,
          totalTradingDays: updates.totalTradingDays ?? state.totalTradingDays,
          deathCause: updates.deathCause ?? null,
          totalCaught: (updates.job ?? state.job).totalCaught,
          cards: (updates.cards ?? state.cards).map(c => c.id),
        });
        updates.lastUnlockedAchievements = metaResult.newAchievements;
      }

      // 合并消息
      if (newMessages.length > 0) {
        updates.messages = [...state.messages, ...newMessages].slice(-100); // 保留最新100条
        if (!skipWaterfall && newWaterfall.length > 0) {
          updates.waterfallQueue = [...state.waterfallQueue, ...newWaterfall];
        }
      }

      set(updates as Partial<StoreState>);
    },

    setChartView: (view: StoreState['chartView']) => {
      set({ chartView: view });
    },

    toggleMA: (key: keyof MAVisible) => {
      const state = get();
      set({ maVisible: { ...state.maVisible, [key]: !state.maVisible[key] } });
    },

    // ==================== 交易 ====================

    buy: (shares: number) => {
      const state = get();
      const { marketPhase } = state.calendar;
      const isTrading = marketPhase === 'am_trading' || marketPhase === 'pm_trading';
      if (!isTrading) {
        set({ messages: [...state.messages, sysMsg('❌ 非交易时段，无法买入')] });
        return;
      }
      if (state.vitality.isSleeping) {
        set({ messages: [...state.messages, sysMsg('💤 你在睡觉，无法交易')] });
        return;
      }
      // 上班时间必须摸鱼才能交易（除非有 skip_work_check 卡牌）
      const buySkipWork = sumCardEffects(state.cards, 'skip_work_check') > 0;
      if (state.job.employed && state.job.isWorkingHours && !state.job.isSlacking && !buySkipWork) {
        set({ messages: [...state.messages, sysMsg('❌ 上班时间！先开启摸鱼模式才能交易', 'system', 'important')] });
        return;
      }
      if (state.vitality.isInsane) {
        const check = insanityCheck();
        if (check?.blocked) {
          set({ messages: [...state.messages, sysMsg(check.message)] });
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
        messages: [...state.messages, sysMsg(`✅ 买入 ${shares} 股 @ ¥${state.currentPrice.toFixed(2)}，花费 ¥${cost.toFixed(2)}`, 'trade')],
      });
    },

    sell: (shares: number) => {
      const state = get();
      const { marketPhase } = state.calendar;
      const isTrading = marketPhase === 'am_trading' || marketPhase === 'pm_trading';
      if (!isTrading) {
        set({ messages: [...state.messages, sysMsg('❌ 非交易时段，无法卖出')] });
        return;
      }
      if (state.vitality.isSleeping) {
        set({ messages: [...state.messages, sysMsg('💤 你在睡觉，无法交易')] });
        return;
      }
      // 上班时间必须摸鱼才能交易（除非有 skip_work_check 卡牌）
      const sellSkipWork = sumCardEffects(state.cards, 'skip_work_check') > 0;
      if (state.job.employed && state.job.isWorkingHours && !state.job.isSlacking && !sellSkipWork) {
        set({ messages: [...state.messages, sysMsg('❌ 上班时间！先开启摸鱼模式才能交易', 'system', 'important')] });
        return;
      }
      if (state.vitality.isInsane) {
        const check = insanityCheck();
        if (check?.blocked) {
          set({ messages: [...state.messages, sysMsg(check.message)] });
          return;
        }
        if (check) set({ messages: [...state.messages, sysMsg(check.message)] });
      }
      if (shares > state.shares || shares <= 0) return;
      const hasT0 = sumCardEffects(state.cards, 't0_enabled') > 0;
      if (state.boughtToday && !hasT0) {
        set({ messages: [...state.messages, sysMsg('❌ T+1规则：今日买入的股票明天才能卖出！', 'system', 'important')] });
        return;
      }

      const revenue = shares * state.currentPrice;
      const sellBonus = sumCardEffects(state.cards, 'sell_bonus');
      const revenueBonus = sumCardEffects(state.cards, 'revenue_bonus');
      const bonus = revenue * (sellBonus + revenueBonus);
      const sellFee = sumCardEffects(state.cards, 'sell_fee');
      const total = revenue + bonus - sellFee;
      const remainingShares = state.shares - shares;

      set({
        cash: Math.round((state.cash + total) * 100) / 100,
        shares: remainingShares,
        shareCostBasis: remainingShares > 0 ? state.shareCostBasis : 0,
        tradeMarkers: [...state.tradeMarkers, { tick: state.currentTick, price: state.currentPrice, type: 'S' as const, shares }],
        messages: [...state.messages,
          sysMsg(`✅ 卖出 ${shares} 股 @ ¥${state.currentPrice.toFixed(2)}，获得 ¥${total.toFixed(2)}${bonus > 0 ? ` (含加成 +¥${bonus.toFixed(2)})` : ''}`, 'trade'),
        ],
      });
    },

    // ==================== 活动 ====================

    doActivity: (activityId: string) => {
      const state = get();
      if (state.vitality.isSleeping) {
        set({ messages: [...state.messages, sysMsg('💤 你在睡觉，无法进行活动')] });
        return;
      }

      // 找工作特殊检查：已有工作不能找
      if (activityId === 'find_job' && state.job.employed) {
        set({ messages: [...state.messages, sysMsg('❌ 你已经有工作了！想找新工作得先离职')] });
        return;
      }

      // 从 ACTIVITIES 数据中查找精力消耗
      const activity = ACTIVITIES_DATA.find(a => a.id === activityId);
      const cost = activity?.energyCost ?? 10;

      if (state.vitality.energy < cost) {
        set({ messages: [...state.messages, sysMsg(`❌ 精力不足！需要 ${cost} 精力，当前仅有 ${Math.round(state.vitality.energy)}`)] });
        return;
      }
      if (state.activitiesDoneToday.includes(activityId)) {
        set({ messages: [...state.messages, sysMsg('❌ 今天已经做过了！')] });
        return;
      }

      const result = executeActivity(activityId, state.cash, state.cards);
      const newEnergy = Math.max(0, state.vitality.energy - cost);
      const resultUpdates: Partial<StoreState> = {
        vitality: { ...state.vitality, energy: newEnergy },
        activitiesDoneToday: [...state.activitiesDoneToday, activityId],
      };

      // 找工作特殊处理
      if (activityId === 'find_job' && result.message === '__JOB_FOUND__') {
        const newJob = createInitialJob();
        resultUpdates.job = newJob;
        resultUpdates.messages = [...state.messages,
          sysMsg(`🎉 找到新工作了！岗位：${newJob.jobTitle}，日薪 ¥${newJob.dailySalary}`, 'system', 'important'),
          sysMsg('💼 明天开始上班，记得摸鱼要小心！'),
        ];
      } else {
        resultUpdates.messages = [...state.messages, sysMsg(result.message)];
      }

      if (result.cashChange) resultUpdates.cash = Math.round((state.cash + result.cashChange) * 100) / 100;
      if (result.infoHint) resultUpdates.lunchHint = result.infoHint;
      if (result.card) {
        const cardResult = addCard(state.cards, result.card, state.maxCardSlots);
        if (cardResult === null) resultUpdates.pendingCard = { card: result.card };
        else resultUpdates.cards = cardResult;
      }

      set(resultUpdates as StoreState);
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
        set({ messages: [...state.messages, sysMsg(`❌ 钱不够！${food.name}需要¥${food.cost}`)] });
        return;
      }
      if (state.vitality.isSleeping) {
        set({ messages: [...state.messages, sysMsg('❌ 睡觉中不能吃东西...')] });
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
        messages: [...state.messages, sysMsg(`${food.emoji} 吃了${food.name}！饱腹+${food.hungerRestore} (¥${food.cost})${food.sanityRestore > 0 ? ` SAN+${food.sanityRestore}` : ''}`)],
      });
    },

    startSleep: (hours: number) => {
      const state = get();
      if (state.vitality.isSleeping) return;
      if (hours <= 0 || hours > 12) return;

      set({
        vitality: {
          ...state.vitality,
          isSleeping: true,
          sleepStartMinute: state.totalGameMinutes,
          sleepHours: hours,
        },
        messages: [...state.messages, sysMsg(`😴 开始睡觉，计划睡${hours}小时... 💤`)],
      });

      // 睡觉时加速时间
      if (state.playbackSpeed < 3) {
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
        messages: [...state.messages, sysMsg(`☀️ 醒来了！睡了${actualHours.toFixed(1)}小时，精力: ${Math.round(state.vitality.energy)}/100`)],
      });

      // 恢复正常速度
      get().actions.setPlaybackSpeed(1);
    },

    // ==================== 上班系统 ====================

    toggleSlacking: () => {
      const state = get();
      const { job } = state;
      if (!job.employed) {
        set({ messages: [...state.messages, sysMsg('❌ 你没有工作，不需要摸鱼')] });
        return;
      }
      if (!job.isWorkingHours) {
        set({ messages: [...state.messages, sysMsg('❌ 现在不是上班时间')] });
        return;
      }
      if (state.vitality.isSleeping) {
        set({ messages: [...state.messages, sysMsg('💤 你在睡觉...')] });
        return;
      }

      const newSlacking = !job.isSlacking;

      if (newSlacking) {
        // 开始摸鱼
        set({
          job: { ...job, isSlacking: true },
          wasSlackingBefore: true,
          messages: [...state.messages, sysMsg('🐟 开始摸鱼！偷偷打开了股票APP...小心领导！', 'system', 'important')],
        });
      } else {
        // 关闭摸鱼 — 关闭的瞬间如果不在拉屎就有概率被抓
        const onToilet = job.isOnToilet;
        if (!onToilet && Math.random() < 0.2) {
          // 关闭摸鱼时被发现屏幕上有股票APP
          const penalty = job.catchPenalty;
          const catchMessages = [
            `👔 领导经过时看到你屏幕上的K线图："在干嘛？" 罚款 ¥${penalty}`,
            `👀 同事举报你上班炒股，领导约谈！罚款 ¥${penalty}`,
            `😱 切屏幕太慢被领导看到了！罚款 ¥${penalty}`,
          ];
          const msg = catchMessages[Math.floor(Math.random() * catchMessages.length)];
          set({
            job: {
              ...job,
              isSlacking: false,
              caughtToday: job.caughtToday + 1,
              totalCaught: job.totalCaught + 1,
            },
            cash: Math.round((state.cash - penalty) * 100) / 100,
            messages: [...state.messages, sysMsg(msg, 'system', 'urgent')],
          });
        } else {
          set({
            job: { ...job, isSlacking: false },
            messages: [...state.messages, sysMsg('📋 收起手机，假装认真工作...')],
          });
        }
      }
    },

    startToilet: () => {
      const state = get();
      const { job } = state;
      if (!job.employed || !job.isWorkingHours) {
        set({ messages: [...state.messages, sysMsg('❌ 现在不是上班时间')] });
        return;
      }
      if (job.toiletUsedToday) {
        set({ messages: [...state.messages, sysMsg('❌ 今天的带薪拉屎机会已经用过了！')] });
        return;
      }
      if (job.isOnToilet) {
        set({ messages: [...state.messages, sysMsg('❌ 你已经在厕所了...')] });
        return;
      }

      set({
        job: {
          ...job,
          isOnToilet: true,
          isSlacking: true, // 进厕所自动开启摸鱼
          toiletUsedToday: true,
          toiletStartMinute: state.totalGameMinutes,
        },
        messages: [...state.messages, sysMsg('🚽 带薪拉屎开始！30分钟内摸鱼不会被抓，放心操作！', 'system', 'important')],
      });
    },

    quitJob: () => {
      const state = get();
      if (!state.job.employed) {
        set({ messages: [...state.messages, sysMsg('❌ 你已经没有工作了')] });
        return;
      }

      set({
        job: {
          ...state.job,
          employed: false,
          isSlacking: false,
          isOnToilet: false,
          isWorkingHours: false,
        },
        messages: [...state.messages,
          sysMsg(`📝 你递交了辞职信，正式从${state.job.jobTitle}岗位离职`, 'system', 'important'),
          sysMsg('🆓 从此再也不用摸鱼了！但也没有工资了...', 'system'),
        ],
      });
    },

    // ==================== 快速跳过 ====================

    placeOrder: (order) => {
      const state = get();
      const maxOrders = 3;
      const activeOrders = (state.pendingOrders ?? []).filter(o => !o.executed);
      if (activeOrders.length >= maxOrders) {
        set({ messages: [...state.messages, sysMsg(`❌ 最多只能有${maxOrders}个挂单！`)] });
        return;
      }

      const newOrder: PendingOrder = {
        ...order,
        id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: state.totalGameMinutes,
        executed: false,
      };

      const typeLabels = { limit_buy: '限价买入', limit_sell: '限价卖出', stop_loss: '止损', take_profit: '止盈' };
      set({
        pendingOrders: [...(state.pendingOrders ?? []), newOrder],
        messages: [...state.messages, sysMsg(`📋 挂单成功：${typeLabels[order.type]} ${order.shares}股 @ ¥${order.triggerPrice.toFixed(2)}`, 'trade')],
      });
    },

    cancelOrder: (orderId: string) => {
      const state = get();
      set({
        pendingOrders: (state.pendingOrders ?? []).filter(o => o.id !== orderId),
        messages: [...state.messages, sysMsg('📋 挂单已取消')],
      });
    },

    // ==================== 盘中快速事件 ====================

    resolveFlashEvent: (choiceIndex: number) => {
      const state = get();
      const event = state.activeFlashEvent;
      if (!event) return;

      const choice = event.choices[choiceIndex] ?? event.choices[event.defaultChoice];
      const effect = choice.effect;
      const newMessages: NewsMessage[] = [];
      let cashDelta = 0;
      let newShares = state.shares;
      let newCash = state.cash;
      let newCostBasis = state.shareCostBasis;
      const price = state.currentPrice;

      // 处理买入
      if (effect.buy_percent && effect.buy_percent > 0) {
        const buyBudget = newCash * (effect.buy_percent / 100);
        const buyShares = Math.floor(buyBudget / price / 100) * 100; // 100的整数倍
        if (buyShares > 0) {
          const buyCost = buyShares * price;
          const totalCost = newCostBasis * newShares + buyCost;
          newShares += buyShares;
          newCostBasis = Math.round((totalCost / newShares) * 100) / 100;
          newCash = Math.round((newCash - buyCost) * 100) / 100;
          newMessages.push(sysMsg(`⚡ 买入 ${buyShares} 股 @ ¥${price.toFixed(2)}`, 'trade', 'important'));
        }
      }

      // 处理卖出
      if (effect.sell_percent && effect.sell_percent > 0 && newShares > 0) {
        const sellShares = Math.floor(newShares * effect.sell_percent / 100 / 100) * 100 || Math.min(newShares, 100);
        if (sellShares > 0 && !state.boughtToday) {
          const revenue = sellShares * price;
          newCash = Math.round((newCash + revenue) * 100) / 100;
          newShares -= sellShares;
          if (newShares === 0) newCostBasis = 0;
          newMessages.push(sysMsg(`⚡ 卖出 ${sellShares} 股 @ ¥${price.toFixed(2)}`, 'trade', 'important'));
        } else if (state.boughtToday) {
          newMessages.push(sysMsg('⚡ T+1限制，今日买入股票无法卖出', 'system'));
        }
      }

      // 处理现金变化
      if (effect.cash_change) {
        cashDelta += effect.cash_change;
        if (effect.cash_change > 0) {
          newMessages.push(sysMsg(`💰 获得 ¥${effect.cash_change}`, 'system'));
        } else {
          newMessages.push(sysMsg(`💸 损失 ¥${Math.abs(effect.cash_change)}`, 'system'));
        }
      }
      newCash = Math.round((newCash + cashDelta) * 100) / 100;

      // 处理SAN和精力变化
      const newVitality = { ...state.vitality };
      if (effect.sanity_change) {
        newVitality.sanity = Math.max(0, Math.min(newVitality.maxSanity, newVitality.sanity + effect.sanity_change));
        if (effect.sanity_change > 0) {
          newMessages.push(sysMsg(`🧠 SAN值 +${effect.sanity_change}`));
        } else {
          newMessages.push(sysMsg(`🧠 SAN值 ${effect.sanity_change}`));
        }
      }
      if (effect.energy_change) {
        newVitality.energy = Math.max(0, Math.min(100, newVitality.energy + effect.energy_change));
        if (effect.energy_change > 0) {
          newMessages.push(sysMsg(`⚡ 精力 +${effect.energy_change}`));
        } else {
          newMessages.push(sysMsg(`⚡ 精力 ${effect.energy_change}`));
        }
      }

      newMessages.push(sysMsg(`${event.emoji} ${event.title} — 你选择了「${choice.text}」`));

      set({
        activeFlashEvent: null,
        cash: newCash,
        shares: newShares,
        shareCostBasis: newCostBasis,
        vitality: newVitality,
        messages: [...state.messages, ...newMessages].slice(-100),
        waterfallQueue: [...state.waterfallQueue, ...newMessages],
        tradeMarkers: effect.buy_percent || effect.sell_percent
          ? [...state.tradeMarkers, {
              tick: state.currentTick,
              price,
              type: (effect.buy_percent ? 'B' : 'S') as 'B' | 'S',
              shares: effect.buy_percent
                ? Math.floor(state.cash * (effect.buy_percent / 100) / price / 100) * 100
                : Math.floor(state.shares * (effect.sell_percent ?? 0) / 100 / 100) * 100 || Math.min(state.shares, 100),
            }]
          : state.tradeMarkers,
      });
    },

    skipToNext: () => {
      const state = get();
      if (state.gameStatus !== 'playing') return;
      if (state.vitality.isSleeping) return; // 睡觉时不能跳

      const { marketPhase, minuteOfDay, isTradingDay } = state.calendar;

      // 交易时段不能跳过
      if (marketPhase === 'am_trading' || marketPhase === 'pm_trading') return;

      let targetMinuteOfDay: number;

      if (marketPhase === 'lunch_break') {
        // 午休 → 跳到13:00下午开盘
        targetMinuteOfDay = 780;
      } else if (marketPhase === 'after_hours') {
        // 盘后 → 跳到22:00（该睡觉了）
        if (minuteOfDay < 1320) {
          targetMinuteOfDay = 1320;
        } else {
          // 已经很晚了 → 跳到次日08:00
          targetMinuteOfDay = 1440 + 480;
        }
      } else if (marketPhase === 'pre_market') {
        if (isTradingDay && minuteOfDay < 510) {
          // 交易日盘前 → 跳到08:30（晨报时间）
          targetMinuteOfDay = 510;
        } else if (isTradingDay) {
          // 已过08:30 → 跳到09:30开盘
          targetMinuteOfDay = 570;
        } else {
          // 休市日 → 跳到22:00
          targetMinuteOfDay = 1320;
        }
      } else {
        // closed 休市 → 跳到22:00
        if (minuteOfDay < 1320) {
          targetMinuteOfDay = 1320;
        } else {
          targetMinuteOfDay = 1440 + 480;
        }
      }

      const minutesToSkip = targetMinuteOfDay - minuteOfDay;
      if (minutesToSkip <= 0) return;

      // 限制单次最多跳过 960 分钟（16小时），防止极端情况
      const safeSkip = Math.min(minutesToSkip, 960);

      // 暂停播放，批量推进
      get().actions.stopPlayback();
      for (let i = 0; i < safeSkip; i++) {
        get().actions.globalTick();
        // 如果游戏结束了就停止
        if (get().gameStatus !== 'playing') return;
      }
      get().actions.startPlayback();
    },
  },
}));

// ==================== 辅助事件处理函数 ====================

/** 新的一天处理：结算前一天 + 生成事件 */
function handleNewDay(state: StoreState, newCalendar: GameCalendar): { updates: Partial<StoreState>; messages: NewsMessage[] } {
  const messages: NewsMessage[] = [];
  const updates: Partial<StoreState> = {};

  // 如果前一天还没结算，先结算
  if (!state.todaySettled && state.totalTradingDays > 0) {
    const settlementResult = performSettlement(state);
    Object.assign(updates, settlementResult.updates);
    messages.push(...settlementResult.messages);
  }

  // 新的一天
  const nextDay = state.day + 1;
  const staminaBonus = sumCardEffects(state.cards, 'stamina_bonus');
  const baseStamina = 3 + staminaBonus + state.extraStaminaNextDay;

  // 事件系统
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
  let newCards = updates.cards ?? state.cards;
  if (cardFromEvent) {
    const result = addCard(newCards, cardFromEvent, state.maxCardSlots);
    if (result === null) {
      pendingCard = { card: cardFromEvent };
    } else {
      newCards = result;
    }
  }

  const newStamina = Math.max(0, baseStamina + staminaFromEvent);

  updates.day = nextDay;
  updates.currentEvent = todayEvent;
  updates.eventLog = [...state.eventLog, { day: nextDay, event: todayEvent }];
  updates.cash = (updates.cash ?? state.cash) + cashFromEvent;
  updates.dailyExpense = Math.max(100, (updates.dailyExpense ?? state.dailyExpense) + expenseFromEvent);
  updates.stamina = newStamina;
  updates.maxStamina = baseStamina;
  updates.boughtToday = false;
  updates.activitiesDoneToday = [];
  updates.activeEventChains = newChains;
  updates.cards = newCards;
  updates.pendingCard = pendingCard;
  updates.eventModifier = eventMod;
  updates.extraStaminaNextDay = 0;
  updates.lunchHint = null;
  updates.intradayTicks = [];
  updates.currentTick = 0;
  updates.chartView = 'intraday';
  updates.tradeMarkers = [];
  updates.todayIntradayGenerated = false;
  updates.todaySettled = false;
  updates.todayNewsPushed = {
    morningNews: false,
    openBurst: false,
    lunchNews: false,
    pmBurst: false,
    closeNews: false,
  };

  // 重置上班系统每日状态
  const currentJob = state.job;
  if (currentJob.employed) {
    updates.job = {
      ...currentJob,
      isSlacking: false,
      caughtToday: 0,
      toiletUsedToday: false,
      isOnToilet: false,
      toiletStartMinute: 0,
      paidToday: false,
      isWorkingHours: false,
      workProgress: 0,
      workMinutesToday: 0,
      slackMinutesToday: 0,
    };
  }

  messages.push(
    sysMsg(`📅 ${newCalendar.date} ${getDayOfWeekLabel(newCalendar.dayOfWeek)} — 新的一天`),
  );

  if (!newCalendar.isTradingDay) {
    messages.push(sysMsg('📅 今天休市，享受生活吧！'));
  }

  return { updates, messages };
}

/** 盘前晨报（作为信息瀑布推送） */
function generateMorningNews(state: StoreState): NewsMessage[] {
  const event = state.currentEvent;
  if (!event) return [sysMsg('📰 早安，散户！今天没什么特别新闻。')];

  const messages: NewsMessage[] = [
    sysMsg(`📰 晨报 — 第 ${state.day - state.historyDays} 天`, 'system', 'important'),
    sysMsg(`🔴 ${event.title}`, 'breaking', event.rarity === 'legendary' ? 'urgent' : 'important'),
    sysMsg(event.description),
  ];

  for (const e of event.effects) {
    if (e.description) {
      messages.push(sysMsg(`  📋 ${e.description}`, 'institution'));
    }
  }

  return messages;
}

/** 开盘处理：生成分时数据 */
function handleMarketOpen(state: StoreState, currentUpdates: Partial<StoreState>): { updates: Partial<StoreState>; messages: NewsMessage[] } {
  const prevClose = currentUpdates.currentPrice ?? state.currentPrice;
  const day = currentUpdates.day ?? state.day;
  const eventMod = currentUpdates.eventModifier ?? state.eventModifier;
  const trend = getTrendForDay(day, state.trendSegments);
  const ticks = generateIntradayTicks(prevClose, trend, eventMod);
  const openPrice = ticks[0].price;
  const changePercent = ((openPrice - prevClose) / prevClose) * 100;

  const newsCtx = { stockName: state.stockName, price: openPrice, changePercent, todayOpen: openPrice };
  const { messages: burstMsgs, nextId } = generateSessionBurst('am_trading', newsCtx, currentUpdates.newsIdCounter ?? state.newsIdCounter);

  // 预排上午新闻
  const amSchedule = scheduleSessionNews(5, 115);

  const messages: NewsMessage[] = [
    sysMsg(`🔔 开盘！${state.stockName} ¥${openPrice.toFixed(2)} ${openPrice >= prevClose ? '↑' : '↓'} ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`, 'market_index', 'important'),
    ...burstMsgs,
  ];

  return {
    updates: {
      todayOpen: openPrice,
      currentPrice: openPrice,
      intradayTicks: ticks,
      currentTick: 0,
      chartView: 'intraday',
      todayIntradayGenerated: true,
      intradayNewsSchedule: amSchedule,
      newsIdCounter: nextId,
      currentTradingDay: (currentUpdates.currentTradingDay ?? state.currentTradingDay) + 1,
    },
    messages,
  };
}

/** 午间转换：生成午间消息 */
function handleLunchTransition(state: StoreState): { messages: NewsMessage[] } {
  const amClosePrice = state.intradayTicks[120]?.price ?? state.currentPrice;
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

  const amChange = state.todayOpen > 0
    ? ((amClosePrice - state.todayOpen) / state.todayOpen * 100)
    : 0;

  return {
    messages: [
      sysMsg(`🍜 午间休息 | 上午收盘: ¥${amClosePrice.toFixed(2)} (${amChange >= 0 ? '+' : ''}${amChange.toFixed(2)}%)`, 'market_index'),
      sysMsg(`💬 ${lunchMsg.source}：${lunchMsg.text}${hintDirection === 'up' ? '涨 📈' : '跌 📉'}`, 'rumor'),
    ],
  };
}

/** 下午开盘处理 */
function handlePMOpen(state: StoreState): { messages: NewsMessage[] } {
  const pmTick = state.intradayTicks[121];
  const pmPrice = pmTick?.price ?? state.currentPrice;
  const changePercent = ((pmPrice - state.todayOpen) / state.todayOpen) * 100;

  const newsCtx = { stockName: state.stockName, price: pmPrice, changePercent, todayOpen: state.todayOpen, amClose: state.amClose };
  const { messages: burstMsgs } = generateSessionBurst('pm_trading', newsCtx, state.newsIdCounter);

  return {
    messages: [
      sysMsg('📈 下午开盘，继续交易', 'market_index'),
      ...burstMsgs,
    ],
  };
}

/** 收盘处理：生成日K + 结算 */
function handleMarketClose(state: StoreState): { updates: Partial<StoreState>; messages: NewsMessage[] } {
  const closePrice = state.intradayTicks[TOTAL_TICKS - 1]?.price ?? state.currentPrice;
  const ohlc = intradayToOHLC(state.intradayTicks);
  const dayData = { day: state.day, ...ohlc };
  const changePercent = ((closePrice - state.todayOpen) / state.todayOpen * 100).toFixed(2);

  // 保留最近5天分时
  const recentHistory = [...state.recentIntradayHistory, state.intradayTicks];
  if (recentHistory.length > 5) recentHistory.shift();

  // 结算
  const settlementResult = performSettlement({
    ...state,
    currentPrice: closePrice,
    stockHistory: [...state.stockHistory, dayData],
  });

  return {
    updates: {
      currentPrice: closePrice,
      stockHistory: [...state.stockHistory, dayData],
      recentIntradayHistory: recentHistory,
      todaySettled: true,
      totalTradingDays: state.totalTradingDays + 1,
      ...settlementResult.updates,
    },
    messages: [
      sysMsg(`📊 收盘！¥${closePrice.toFixed(2)} (${Number(changePercent) >= 0 ? '+' : ''}${changePercent}%)`, 'market_index', 'important'),
      ...settlementResult.messages,
    ],
  };
}

/** 日终结算 */
function performSettlement(state: StoreState & Partial<StoreState>): { updates: Partial<StoreState>; messages: NewsMessage[] } {
  const cash = state.cash ?? 0;
  const currentPrice = state.currentPrice ?? 0;
  const shares = state.shares ?? 0;
  const dailyExpense = state.dailyExpense ?? 150;
  const peakAssets = state.peakAssets ?? 30000;
  const goal = state.goal;

  const expenseReduction = sumCardEffects(state.cards ?? [], 'expense_reduce');
  const expenseMult = sumCardEffects(state.cards ?? [], 'expense_mult');
  const baseExpense = Math.max(50, dailyExpense - expenseReduction);
  const actualExpense = expenseMult > 0 ? Math.round(baseExpense * expenseMult) : baseExpense;
  const newCash = Math.round((cash - actualExpense) * 100) / 100;
  const totalAssets = newCash + shares * currentPrice;
  const newPeak = Math.max(peakAssets, totalAssets);

  const messages: NewsMessage[] = [
    sysMsg(`💸 生活费: -¥${actualExpense}`),
    sysMsg(`💰 现金: ¥${newCash.toFixed(2)} | 总资产: ¥${totalAssets.toFixed(2)}`),
  ];

  const updates: Partial<StoreState> = {
    cash: newCash,
    peakAssets: newPeak,
    todaySettled: true,
  };

  if (totalAssets >= goal.targetAmount) {
    updates.gameStatus = 'won';
    messages.push(sysMsg(`🎉 恭喜！你达成了目标【${goal.title}】！`, 'system', 'urgent'));
    localStorage.removeItem(SAVE_KEY);
  } else if (totalAssets < actualExpense) {
    updates.gameStatus = 'lost';
    updates.deathCause = 'bankruptcy';
    messages.push(sysMsg('💀 破产了！连生活费都付不起了...', 'system', 'urgent'));
    localStorage.removeItem(SAVE_KEY);
  } else if (newCash < 0) {
    messages.push(sysMsg('⚠️ 现金为负！尽快卖出股票回笼资金！', 'system', 'important'));
  }

  return { updates, messages };
}
