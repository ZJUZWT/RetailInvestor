// === 盘中新闻调度引擎 ===

import type { NewsMessage, NewsSource, ScheduledNews } from '../types/newsTypes';
import type { NewsContext, TemplateCategory } from '../data/intradayNews';
import {
  ALL_TEMPLATES,
  SESSION_OPEN_AM,
  SESSION_OPEN_PM,
  interpolateNews,
  pickTemplate,
} from '../data/intradayNews';

// 模板分类 → NewsSource 映射
const CATEGORY_SOURCE: Record<TemplateCategory, NewsSource> = {
  csrc: 'csrc',
  institution: 'institution',
  rumor: 'rumor',
  breaking: 'breaking',
  market_index: 'market_index',
  social_media: 'social_media',
};

const INTRADAY_CATEGORIES: TemplateCategory[] = [
  'csrc', 'institution', 'rumor', 'breaking', 'market_index', 'social_media',
];

/**
 * 为一个交易半天预排 3-5 条新闻的触发 tick
 */
export function scheduleSessionNews(startTick: number, endTick: number): ScheduledNews[] {
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 条
  const range = endTick - startTick;
  const schedule: ScheduledNews[] = [];

  // 在时间段内均匀分布，加随机偏移
  for (let i = 0; i < count; i++) {
    const baseTick = startTick + Math.floor((range * (i + 1)) / (count + 1));
    const jitter = Math.floor(Math.random() * 10) - 5;
    const tick = Math.max(startTick + 5, Math.min(endTick - 5, baseTick + jitter));

    // 随机选一个分类
    const category = INTRADAY_CATEGORIES[Math.floor(Math.random() * INTRADAY_CATEGORIES.length)];
    schedule.push({ tick, templateCategory: category, triggered: false });
  }

  return schedule.sort((a, b) => a.tick - b.tick);
}

/**
 * 每个 tick 检查是否有预排新闻需要触发
 * 返回需要触发的新闻消息数组
 */
export function checkScheduledNews(
  currentTick: number,
  schedule: ScheduledNews[],
  ctx: NewsContext,
  idCounter: number,
): { messages: NewsMessage[]; updatedSchedule: ScheduledNews[]; nextId: number } {
  const messages: NewsMessage[] = [];
  let nextId = idCounter;

  const updatedSchedule = schedule.map(item => {
    if (item.triggered || item.tick > currentTick) return item;

    const category = item.templateCategory as TemplateCategory;
    const templates = ALL_TEMPLATES[category];
    if (!templates) return { ...item, triggered: true };

    const template = pickTemplate(templates, ctx.changePercent);
    const text = interpolateNews(template.text, ctx);
    const source = CATEGORY_SOURCE[category];

    messages.push({
      id: nextId++,
      text,
      source,
      priority: template.priority ?? 'normal',
      timestamp: Date.now(),
    });

    return { ...item, triggered: true };
  });

  return { messages, updatedSchedule, nextId };
}

/**
 * 开盘时生成 3-5 条爆发消息（氛围渲染）
 */
export function generateSessionBurst(
  phase: 'am_trading' | 'pm_trading',
  ctx: NewsContext,
  idCounter: number,
): { messages: NewsMessage[]; nextId: number } {
  const templates = phase === 'am_trading' ? SESSION_OPEN_AM : SESSION_OPEN_PM;
  const messages: NewsMessage[] = [];
  let nextId = idCounter;

  // 1. 开盘消息（来自系统/大盘）
  const openTemplate = pickTemplate(templates, ctx.changePercent);
  messages.push({
    id: nextId++,
    text: interpolateNews(openTemplate.text, ctx),
    source: 'market_index',
    priority: 'important',
    timestamp: Date.now(),
  });

  // 2. 额外 2-4 条来自不同来源
  const extraCount = 2 + Math.floor(Math.random() * 3);
  const shuffled = [...INTRADAY_CATEGORIES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < extraCount && i < shuffled.length; i++) {
    const category = shuffled[i];
    const catTemplates = ALL_TEMPLATES[category];
    const template = pickTemplate(catTemplates, ctx.changePercent);
    const text = interpolateNews(template.text, ctx);

    messages.push({
      id: nextId++,
      text,
      source: CATEGORY_SOURCE[category],
      priority: template.priority ?? 'normal',
      timestamp: Date.now() + (i + 1) * 100, // 微小时间差用于排序
    });
  }

  return { messages, nextId };
}
