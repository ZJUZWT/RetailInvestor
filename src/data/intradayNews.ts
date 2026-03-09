// === 消息模板池 ===
// 占位符: {stockName} {price} {changePercent} {volume} {direction}

export type NewsCondition = 'up' | 'down' | 'volatile' | 'any';

export interface NewsTemplate {
  text: string;
  condition: NewsCondition;
  priority?: 'normal' | 'important' | 'urgent';
}

// === 证监会/监管 ===
export const CSRC_NEWS: NewsTemplate[] = [
  { text: '【证监会】就{stockName}所在行业发展规范征求意见', condition: 'any' },
  { text: '【证监会】发布关于加强上市公司信息披露的通知', condition: 'any' },
  { text: '【证监会】核发新一批IPO批文，市场扩容压力增大', condition: 'down', priority: 'important' },
  { text: '【证监会】严查场外配资，多家机构被点名', condition: 'down', priority: 'urgent' },
  { text: '【证监会】表态维护市场稳定，引导长期资金入市', condition: 'up', priority: 'important' },
  { text: '【央行】今日开展 2000 亿 MLF 操作，利率不变', condition: 'any' },
  { text: '【证监会】研究推进T+0交易制度改革', condition: 'up', priority: 'important' },
  { text: '【国常会】部署支持民营经济发展若干措施', condition: 'up' },
  { text: '【证监会】发布退市新规，绩差股面临出清', condition: 'down', priority: 'important' },
  { text: '【监管】北向资金盘中大幅流入，外资看好A股', condition: 'up' },
  { text: '【证监会】对异常交易行为进行重点监控', condition: 'volatile', priority: 'important' },
  { text: '【财政部】拟推出新一轮减税降费政策', condition: 'up' },
  { text: '【央行】下调存款准备金率0.25个百分点', condition: 'up', priority: 'urgent' },
  { text: '【证监会】暂停量化私募新产品备案', condition: 'volatile', priority: 'important' },
];

// === 机构研报 ===
export const INSTITUTION_NEWS: NewsTemplate[] = [
  { text: '【中信证券】{stockName}深度研报：目标价上调至 ¥{targetPrice}', condition: 'up', priority: 'important' },
  { text: '【国泰君安】{stockName}行业点评：维持"增持"评级', condition: 'up' },
  { text: '【华泰证券】下调{stockName}评级至"中性"，短期承压', condition: 'down', priority: 'important' },
  { text: '【海通证券】策略周报：震荡市中寻找结构性机会', condition: 'volatile' },
  { text: '【招商证券】{stockName}业绩预告超预期，强烈推荐', condition: 'up', priority: 'important' },
  { text: '【兴业证券】市场情绪修复，建议逢低布局', condition: 'down' },
  { text: '【广发证券】{stockName}所在赛道景气度持续向上', condition: 'up' },
  { text: '【申万宏源】减持{stockName}：估值偏高，获利了结', condition: 'down', priority: 'important' },
  { text: '【国信证券】量化模型显示{stockName}存在超跌反弹机会', condition: 'down' },
  { text: '【东方财富】{stockName}获北向资金连续净买入', condition: 'up' },
  { text: '【中金公司】{stockName}调研纪要：管理层对Q4展望乐观', condition: 'up' },
  { text: '【天风证券】{stockName}技术面已破位，建议观望', condition: 'down' },
];

// === 市场传闻 ===
export const RUMOR_NEWS: NewsTemplate[] = [
  { text: '传 {stockName} 即将获得大额订单，消息待确认', condition: 'up' },
  { text: '微信群疯传：{stockName}大股东计划增持，真假难辨', condition: 'up' },
  { text: '有知情人士透露，{stockName}正在洽谈重大资产重组', condition: 'up', priority: 'important' },
  { text: '据传{stockName}核心技术人员离职，公司未回应', condition: 'down' },
  { text: '小道消息：某大型基金正在建仓{stockName}', condition: 'up' },
  { text: '传闻{stockName}产品出现质量问题，公关部紧急否认', condition: 'down' },
  { text: '群里有人说{stockName}下午要拉涨停，信不信由你', condition: 'up' },
  { text: '据内部消息，{stockName}下季度业绩可能不及预期', condition: 'down' },
  { text: '有人在论坛爆料{stockName}获得政府补贴', condition: 'up' },
  { text: '传{stockName}即将进入某知名指数成分股', condition: 'up', priority: 'important' },
  { text: '坊间传闻{stockName}的竞争对手正酝酿价格战', condition: 'down' },
  { text: '朋友圈刷屏：{stockName}高管内部讲话流出，看好未来', condition: 'up' },
];

// === 突发新闻 ===
export const BREAKING_NEWS: NewsTemplate[] = [
  { text: '🔴 {stockName}盘中闪崩，跌幅超{changePercent}%！', condition: 'down', priority: 'urgent' },
  { text: '🔴 {stockName}放量拉升，涨幅已达{changePercent}%！', condition: 'up', priority: 'urgent' },
  { text: '🔴 {stockName}触及涨停板！散户们冲啊！', condition: 'up', priority: 'urgent' },
  { text: '🔴 突发：{stockName}所在板块集体异动', condition: 'volatile', priority: 'urgent' },
  { text: '🔴 {stockName}盘中大单频现，主力资金异动明显', condition: 'volatile', priority: 'urgent' },
  { text: '🔴 紧急：国际油价暴涨5%，相关板块全线飘红', condition: 'up', priority: 'urgent' },
  { text: '🔴 突发利空：海外市场大幅跳水，A股承压', condition: 'down', priority: 'urgent' },
  { text: '🔴 {stockName}疑似游资介入，成交量激增3倍', condition: 'volatile', priority: 'urgent' },
  { text: '🔴 {stockName}盘中临时停牌，疑有重大事项待公布', condition: 'volatile', priority: 'urgent' },
  { text: '🔴 突发：人民币汇率急跌，市场恐慌情绪蔓延', condition: 'down', priority: 'urgent' },
];

// === 大盘播报 ===
export const MARKET_INDEX_NEWS: NewsTemplate[] = [
  { text: '沪指现报 {indexPrice} 点，{indexDirection}{indexChange}%', condition: 'any' },
  { text: '两市成交额突破 {volume} 亿，量能显著放大', condition: 'volatile' },
  { text: '沪深两市超 3000 只个股上涨，赚钱效应爆棚', condition: 'up' },
  { text: '沪深两市超 3500 只个股下跌，市场一片惨绿', condition: 'down' },
  { text: '北向资金今日净流入 {northFlow} 亿元', condition: 'up' },
  { text: '北向资金今日净流出 {northFlow} 亿元，外资在跑', condition: 'down' },
  { text: '创业板指涨超2%，科技股全面爆发', condition: 'up' },
  { text: '上证50拖累大盘，权重股集体回调', condition: 'down' },
  { text: '市场震荡加剧，多空分歧明显', condition: 'volatile' },
  { text: '两融余额再创新高，杠杆资金加速入场', condition: 'up' },
  { text: '今日涨停股数量达到 {limitUpCount} 只', condition: 'up' },
  { text: '恐慌指数VIX飙升，避险情绪升温', condition: 'down' },
];

// === 散户论坛/社交媒体 ===
export const SOCIAL_MEDIA_NEWS: NewsTemplate[] = [
  { text: '【股吧热帖】"坚定持有{stockName}！钻石手！"🙌', condition: 'up' },
  { text: '【雪球】大V发文：{stockName}已经到了黄金坑位置', condition: 'down' },
  { text: '【股吧】"割了！{stockName}再也不碰了！😭"', condition: 'down' },
  { text: '【雪球热议】散户集体看多{stockName}，这次不一样？', condition: 'up' },
  { text: '【抖音】某财经博主直播喊单{stockName}，观看破10万', condition: 'volatile' },
  { text: '【微博热搜】#{stockName}涨停# 冲上热搜榜', condition: 'up', priority: 'important' },
  { text: '【股吧】"今天又是满仓的一天，{stockName}冲！"', condition: 'up' },
  { text: '【知乎】"如何看待{stockName}连续下跌？" 3.2万人浏览', condition: 'down' },
  { text: '【雪球】"{stockName}这个位置，我选择加仓！"', condition: 'down' },
  { text: '【股吧】"牛逼啊{stockName}！早盘就翻红了！"', condition: 'up' },
  { text: '【小红书】"我用{stockName}赚的钱买了包包💅"', condition: 'up' },
  { text: '【股吧】"{stockName}的庄家是不是跑了？没人拉盘了"', condition: 'down' },
  { text: '【抖音评论区】"我把彩礼钱全买了{stockName}，老婆别打我"', condition: 'volatile' },
  { text: '【股吧】"主力洗盘呢！别慌！拿稳了兄弟们！"', condition: 'down' },
];

// === 开盘爆发消息（上午/下午开盘时的氛围渲染）===
export const SESSION_OPEN_AM: NewsTemplate[] = [
  { text: '上午开盘！{stockName}以 ¥{price} 开出，{gapDesc}', condition: 'any', priority: 'important' },
  { text: '集合竞价结束，{stockName}开盘价 ¥{price}', condition: 'any' },
  { text: '盘前消息面偏{sentiment}，市场情绪{mood}', condition: 'any' },
  { text: '今日大盘高开 {indexChange}%，做多氛围浓厚', condition: 'up' },
  { text: '今日大盘低开 {indexChange}%，空头占据上风', condition: 'down' },
];

export const SESSION_OPEN_PM: NewsTemplate[] = [
  { text: '下午开盘！{stockName}午后继续交易', condition: 'any' },
  { text: '午后资金开始活跃，关注{stockName}走势变化', condition: 'any' },
  { text: '下午盘面：上午{amSummary}，午后需观察量能变化', condition: 'any' },
  { text: '外围市场午间消息偏{sentiment}，可能影响午后走势', condition: 'any' },
];

// === 所有分类模板映射 ===
export const ALL_TEMPLATES = {
  csrc: CSRC_NEWS,
  institution: INSTITUTION_NEWS,
  rumor: RUMOR_NEWS,
  breaking: BREAKING_NEWS,
  market_index: MARKET_INDEX_NEWS,
  social_media: SOCIAL_MEDIA_NEWS,
} as const;

export type TemplateCategory = keyof typeof ALL_TEMPLATES;

// === 模板占位符插值 ===
export interface NewsContext {
  stockName: string;
  price: number;
  changePercent: number;
  todayOpen: number;
  amClose?: number;
}

export function interpolateNews(template: string, ctx: NewsContext): string {
  const absChange = Math.abs(ctx.changePercent);
  const direction = ctx.changePercent >= 0 ? '涨' : '跌';
  const sentiment = ctx.changePercent >= 0 ? '多' : '空';
  const mood = ctx.changePercent >= 0 ? '较为乐观' : '偏向谨慎';
  const gapDesc = ctx.price > ctx.todayOpen
    ? `高开${((ctx.price - ctx.todayOpen) / ctx.todayOpen * 100).toFixed(2)}%`
    : ctx.price < ctx.todayOpen
    ? `低开${((ctx.todayOpen - ctx.price) / ctx.todayOpen * 100).toFixed(2)}%`
    : '平开';
  const amSummary = (ctx.amClose ?? ctx.price) >= ctx.todayOpen ? '震荡偏强' : '震荡走弱';

  // 生成随机但合理的数值
  const targetPrice = (ctx.price * (1 + (Math.random() * 0.3 + 0.05))).toFixed(2);
  const indexPrice = (3000 + Math.random() * 500).toFixed(2);
  const indexChange = (Math.random() * 2 + 0.1).toFixed(2);
  const indexDirection = ctx.changePercent >= 0 ? '涨' : '跌';
  const volume = Math.floor(8000 + Math.random() * 7000);
  const northFlow = Math.floor(20 + Math.random() * 80);
  const limitUpCount = Math.floor(30 + Math.random() * 70);

  return template
    .replace(/\{stockName\}/g, ctx.stockName)
    .replace(/\{price\}/g, ctx.price.toFixed(2))
    .replace(/\{changePercent\}/g, absChange.toFixed(2))
    .replace(/\{direction\}/g, direction)
    .replace(/\{sentiment\}/g, sentiment)
    .replace(/\{mood\}/g, mood)
    .replace(/\{gapDesc\}/g, gapDesc)
    .replace(/\{amSummary\}/g, amSummary)
    .replace(/\{targetPrice\}/g, targetPrice)
    .replace(/\{indexPrice\}/g, indexPrice)
    .replace(/\{indexChange\}/g, indexChange)
    .replace(/\{indexDirection\}/g, indexDirection)
    .replace(/\{volume\}/g, String(volume))
    .replace(/\{northFlow\}/g, String(northFlow))
    .replace(/\{limitUpCount\}/g, String(limitUpCount));
}

/** 根据涨跌状态选择匹配的模板 */
export function pickTemplate(templates: NewsTemplate[], changePercent: number): NewsTemplate {
  const condition: NewsCondition =
    changePercent > 1.5 ? 'up' :
    changePercent < -1.5 ? 'down' :
    'volatile';

  // 70%概率选匹配条件的，30%概率选any或随机（增加不确定性）
  const useMatching = Math.random() < 0.7;
  const matching = templates.filter(t => t.condition === condition || t.condition === 'any');
  const pool = useMatching && matching.length > 0 ? matching : templates;

  return pool[Math.floor(Math.random() * pool.length)];
}
