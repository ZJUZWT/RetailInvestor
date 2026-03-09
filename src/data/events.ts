import type { GameEvent } from '../types';

// ========== 常见事件（白色）- 半写实 ==========
const COMMON_EVENTS: GameEvent[] = [
  {
    id: 'c_rate_cut',
    title: '央行宣布降准',
    description: '央行宣布降准0.25个百分点，释放流动性约5000亿。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0.03, description: '小幅利好' }],
  },
  {
    id: 'c_bad_earnings',
    title: '季度财报不及预期',
    description: '公司发布季度财报，净利润同比下滑15%，低于市场预期。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.04, description: '利空' }],
  },
  {
    id: 'c_northbound_out',
    title: '北向资金大幅流出',
    description: '今日北向资金净流出超80亿，市场情绪偏谨慎。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.025, description: '偏空' }],
  },
  {
    id: 'c_policy_support',
    title: '行业利好政策出台',
    description: '国务院出台新政策大力支持该行业发展，减税降费。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0.04, description: '利好' }],
  },
  {
    id: 'c_analyst_upgrade',
    title: '券商上调评级',
    description: '知名券商发布研报，上调该股评级至"强烈推荐"。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0.02, description: '小幅利好' }],
  },
  {
    id: 'c_sector_rotation',
    title: '板块资金轮动',
    description: '资金从该板块流出，转向其他热门概念。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.02, description: '偏空' }],
  },
  {
    id: 'c_dividend',
    title: '公司宣布分红',
    description: '公司宣布每10股派发现金红利3元。',
    rarity: 'common',
    effects: [
      { type: 'stock_trend', value: 0.01, description: '微幅利好' },
      { type: 'cash', value: 500, description: '获得分红' },
    ],
  },
  {
    id: 'c_market_stable',
    title: '市场横盘震荡',
    description: '大盘缩量震荡，两市成交额不足7000亿，观望情绪浓厚。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0, description: '无影响' }],
  },
  {
    id: 'c_inflation_data',
    title: 'CPI数据公布',
    description: '统计局公布CPI同比上涨2.8%，略超预期。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.015, description: '偏空' }],
  },
  {
    id: 'c_tech_breakthrough',
    title: '公司发布新产品',
    description: '公司在发布会上展示了新一代产品，市场反应积极。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0.035, description: '利好' }],
  },
  {
    id: 'c_shareholder_reduce',
    title: '大股东减持公告',
    description: '公司大股东计划未来6个月内减持不超过2%的股份。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.03, description: '利空' }],
  },
  {
    id: 'c_ipo_news',
    title: '新股申购潮',
    description: '本周有10只新股集中申购，资金面趋紧。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.01, description: '微幅偏空' }],
  },
  {
    id: 'c_rent_increase',
    title: '房东涨房租',
    description: '房东说了，下个月起房租涨500。在这城市活着真不容易。',
    rarity: 'common',
    effects: [{ type: 'daily_expense', value: 30, description: '每日生活费+30' }],
  },
  {
    id: 'c_found_coupon',
    title: '捡到优惠券',
    description: '路上捡到一叠超市优惠券，这个月伙食费省了不少。',
    rarity: 'common',
    effects: [{ type: 'cash', value: 800, description: '节省800元' }],
  },
  {
    id: 'c_overtime_bonus',
    title: '副业外快',
    description: '帮朋友做了个PPT，赚了点外快。',
    rarity: 'common',
    effects: [{ type: 'cash', value: 1500, description: '获得1500元' }],
  },
  {
    id: 'c_market_rally',
    title: '大盘放量上攻',
    description: '两市成交额突破万亿，市场情绪高涨，个股普涨。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0.045, description: '利好' }],
  },
  {
    id: 'c_regulatory_warning',
    title: '监管层喊话',
    description: '证监会发言人表示将加强市场监管，打击违规行为。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: -0.02, description: '偏空' }],
  },
  {
    id: 'c_peer_ipo',
    title: '竞争对手上市',
    description: '同行业竞争对手在科创板上市，首日涨幅300%。',
    rarity: 'common',
    effects: [{ type: 'stock_trend', value: 0.02, description: '概念利好' }],
  },
];

// ========== 稀有事件（蓝色）- 近似抽象 ==========
const RARE_EVENTS: GameEvent[] = [
  {
    id: 'r_aunt_wang',
    title: '隔壁王大妈All In了',
    description: '隔壁王大妈把广场舞基金全投进去了，还拉了整个舞蹈队一起买。这是见顶信号吗？',
    rarity: 'rare',
    effects: [{ type: 'stock_trend', value: 0.05, description: '短期利好但可能见顶' }],
  },
  {
    id: 'r_ceo_weibo',
    title: 'CEO深夜发微博',
    description: 'CEO凌晨3点发了条微博："明天见。" 配图是一杯咖啡。什么意思？',
    rarity: 'rare',
    effects: [
      { type: 'stock_trend', value: 0.02, description: '不确定性增加' },
      { type: 'chain', value: 0, chainEventId: 'r_ceo_weibo_2', description: '事件将继续发展...' },
    ],
  },
  {
    id: 'r_ceo_weibo_2',
    title: '微博被删了！',
    description: 'CEO的微博被删了，但截图已经传遍全网。各路大V开始疯狂解读...',
    rarity: 'rare',
    effects: [
      { type: 'stock_trend', value: -0.03, description: '恐慌情绪蔓延' },
      { type: 'chain', value: 0, chainEventId: 'r_ceo_weibo_3', description: '真相即将揭晓...' },
    ],
  },
  {
    id: 'r_ceo_weibo_3',
    title: 'CEO道歉：昨晚喝多了',
    description: 'CEO发视频道歉："不好意思，昨晚和朋友喝酒，手滑发的。明天一切照常。" 全网笑疯。',
    rarity: 'rare',
    effects: [{ type: 'stock_trend', value: 0.01, description: '虚惊一场，微幅利好' }],
  },
  {
    id: 'r_kol_pump',
    title: '大V直播间喊单',
    description: '某500万粉丝大V在直播间疯狂推荐这只股票："兄弟们冲！全仓干！" 弹幕刷满了火箭。',
    rarity: 'rare',
    effects: [{ type: 'stock_trend', value: 0.06, description: '短期暴涨但风险极高' }],
  },
  {
    id: 'r_elevator_gossip',
    title: '电梯偶遇',
    description: '你在电梯里听到两个穿西装的男人在小声讨论这只股票，其中一个说"下周会有大动作"。',
    rarity: 'rare',
    effects: [{ type: 'stock_trend', value: 0.03, description: '获得模糊线索' }],
  },
  {
    id: 'r_wife_found_out',
    title: '老婆发现你在炒股',
    description: '老婆翻你手机发现了炒股APP！她说："从今天起，家里的钱我管！" 每日生活费翻倍！',
    rarity: 'rare',
    effects: [{ type: 'daily_expense', value: 200, description: '生活费翻倍！' }],
  },
  {
    id: 'r_classmate_flex',
    title: '同学聚会受刺激',
    description: '高中同学聚会，隔壁班学渣说自己炒股赚了200万，你心态崩了。但他说了一个消息...',
    rarity: 'rare',
    effects: [
      { type: 'stamina', value: -1, description: '心态受创，体力-1' },
      { type: 'stock_trend', value: 0.02, description: '获得一条"内幕"' },
    ],
  },
  {
    id: 'r_taxi_driver',
    title: '出租车司机荐股',
    description: '出租车司机一路给你分析大盘，说他去年靠炒股换了辆新车。这是最强反向指标！',
    rarity: 'rare',
    effects: [{ type: 'stock_trend', value: -0.04, description: '经典反向指标' }],
  },
  {
    id: 'r_cat_forecast',
    title: '猫咪选股',
    description: '你把两张纸放地上：涨和跌。你的猫选了... 等等，猫选股的准确率据说有60%？',
    rarity: 'rare',
    effects: [{ type: 'stock_trend', value: 0.03, description: '玄学利好' }],
  },
];

// ========== 传说事件（金色）- 完全魔幻 ==========
const LEGENDARY_EVENTS: GameEvent[] = [
  {
    id: 'l_stock_god_dream',
    title: '股神托梦',
    description: '昨晚梦见巴菲特对你说："年轻人，明天涨停。" 醒来后你发现枕头下面多了一张K线图。',
    rarity: 'legendary',
    effects: [{ type: 'stock_trend', value: 0.08, description: '大概率利好（但梦也有不准的时候）' }],
  },
  {
    id: 'l_monkey_ceo',
    title: '猴子当上了董事长',
    description: '震惊！一只金丝猴在董事会选举中获得多数票，正式就任公司董事长。股民们陷入困惑。',
    rarity: 'legendary',
    effects: [
      { type: 'stock_trend', value: 0.05, description: '巨大不确定性带来投机热潮' },
      { type: 'stamina', value: 1, description: '太搞笑了，心情好体力+1' },
    ],
  },
  {
    id: 'l_alien_hack',
    title: '外星人入侵交易所',
    description: '突发：交易所服务器被不明信号入侵，屏幕上显示"你们的股票现在归我们了"。紧急停牌一天。',
    rarity: 'legendary',
    effects: [{ type: 'stock_trend', value: 0, description: '停牌一天，明天再战' }],
  },
  {
    id: 'l_secret_manual',
    title: '路边捡到《炒股秘籍》',
    description: '你在路边的垃圾桶旁捡到一本泛黄的古书《炒股天机秘籍》。翻开一看，第一页写着："别炒了。"',
    rarity: 'legendary',
    effects: [
      { type: 'card', value: 0, cardId: 'diamond_hands', description: '获得传说卡牌：钻石手' },
      { type: 'stamina', value: 2, description: '顿悟了，体力+2' },
    ],
  },
];

export const ALL_EVENTS: GameEvent[] = [...COMMON_EVENTS, ...RARE_EVENTS, ...LEGENDARY_EVENTS];

export function getEventById(id: string): GameEvent | undefined {
  return ALL_EVENTS.find(e => e.id === id);
}

export function getEventsPool(): { common: GameEvent[]; rare: GameEvent[]; legendary: GameEvent[] } {
  return {
    common: COMMON_EVENTS.filter(e => !e.id.includes('_2') && !e.id.includes('_3')),
    rare: RARE_EVENTS.filter(e => !e.id.includes('_2') && !e.id.includes('_3')),
    legendary: LEGENDARY_EVENTS,
  };
}
