/**
 * 新手引导系统 — 第一个交易日通过"前辈老张"以消息形式逐步引导核心操作
 */

export interface TutorialStep {
  id: string;
  /** 触发条件检查函数名 */
  trigger: string;
  /** 引导消息（可多条） */
  messages: string[];
  /** 是否为重要消息 */
  important?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    trigger: 'game_start',
    messages: [
      '👋 嘿，新来的！我是你的前辈老张。第一天上班？我来教你几招。',
      '💡 这个游戏的核心就是——上班摸鱼炒股，同时别饿死、别猝死、别发疯。',
    ],
    important: true,
  },
  {
    id: 'work_start',
    trigger: 'work_hours_start',
    messages: [
      '📋 上班了！看到右边的工作面板了吗？工作进度条代表你今天的出勤率。',
      '💰 下班时工资按工作进度比例发放，摸鱼太多工资就少了！',
    ],
  },
  {
    id: 'market_open',
    trigger: 'market_open',
    messages: [
      '📈 开盘了！但是...你现在在上班，想看盘就得"摸鱼"！',
      '🐟 点击工作面板的"开始摸鱼"按钮，就能看到K线图和交易面板。',
      '⚠️ 注意！摸鱼有1.5%/分钟的概率被领导抓到，罚款¥500！',
    ],
    important: true,
  },
  {
    id: 'first_slacking',
    trigger: 'first_slacking',
    messages: [
      '🎯 很好！你开始摸鱼了。现在你可以看到K线图了。',
      '📊 在左下角的交易面板可以买卖股票。A股是T+1规则——今天买的明天才能卖。',
      '💡 小技巧：可以设置"挂单"，即使不看盘也能自动买卖！',
    ],
  },
  {
    id: 'toilet_tip',
    trigger: 'mid_morning',
    messages: [
      '🚽 教你个绝活——"带薪拉屎"！每天可以用一次，30分钟内摸鱼不会被抓。',
      '💡 最好在开盘时段使用，这样能安全地看盘操作。',
    ],
  },
  {
    id: 'lunch_break',
    trigger: 'lunch_break',
    messages: [
      '🍜 午休了！11:30-13:00之间不能交易，但你可以做一些活动。',
      '🍔 记得吃东西补充饱腹值，饿太久会死的！右边的"角色操作"里有吃饭选项。',
    ],
  },
  {
    id: 'energy_warning',
    trigger: 'energy_low',
    messages: [
      '😴 精力快没了！精力太低会影响判断力，归零就猝死了。',
      '🛌 晚上记得睡觉恢复精力。在"角色操作"面板可以设置睡眠时间。',
    ],
    important: true,
  },
  {
    id: 'day_end',
    trigger: 'after_hours',
    messages: [
      '📊 收盘了！今天的交易日结束。来看看盈亏面板回顾一下吧。',
      '⏭ 非交易时段可以点"跳过"按钮快速推进到下一个重要节点。',
      '🌙 别忘了吃饭和睡觉，保持精力和饱腹值！',
    ],
  },
  {
    id: 'complete',
    trigger: 'day_2',
    messages: [
      '✅ 新手教程完成！你已经掌握了基本操作，接下来的路就靠你自己了。',
      '🎮 记住：合理分配摸鱼和工作时间，管理好生存指标，早日实现财务自由！',
      '👋 老张走了，祝你好运，散户！',
    ],
    important: true,
  },
];

export interface TutorialContext {
  tutorialStep: number;
  isFirstTradingDay: boolean;
  minuteOfDay: number;
  marketPhase: string;
  isSlacking: boolean;
  wasSlackingBefore: boolean;
  energy: number;
  isNewDay: boolean;
  currentTradingDay: number;
}

/**
 * 检查是否应该推进到下一个教程步骤
 * @returns 如果触发了，返回该步骤的消息；否则返回null
 */
export function checkTutorialTrigger(ctx: TutorialContext): TutorialStep | null {
  if (ctx.tutorialStep >= TUTORIAL_STEPS.length) return null;
  if (!ctx.isFirstTradingDay && ctx.tutorialStep < TUTORIAL_STEPS.length - 1) return null;

  const step = TUTORIAL_STEPS[ctx.tutorialStep];

  switch (step.trigger) {
    case 'game_start':
      // 游戏开始立即触发
      return step;

    case 'work_hours_start':
      // 09:00 上班
      return ctx.minuteOfDay >= 540 && ctx.minuteOfDay < 545 ? step : null;

    case 'market_open':
      // 09:30 开盘
      return ctx.marketPhase === 'am_trading' ? step : null;

    case 'first_slacking':
      // 第一次开始摸鱼
      return ctx.isSlacking && !ctx.wasSlackingBefore ? step : null;

    case 'mid_morning':
      // 上午10:00
      return ctx.minuteOfDay >= 600 && ctx.minuteOfDay < 605 ? step : null;

    case 'lunch_break':
      // 午休开始
      return ctx.marketPhase === 'lunch_break' && ctx.minuteOfDay >= 690 && ctx.minuteOfDay < 695 ? step : null;

    case 'energy_low':
      // 精力低于40
      return ctx.energy < 40 ? step : null;

    case 'after_hours':
      // 盘后
      return ctx.marketPhase === 'after_hours' ? step : null;

    case 'day_2':
      // 第二个交易日
      return ctx.currentTradingDay >= 2 && ctx.isNewDay ? step : null;

    default:
      return null;
  }
}
