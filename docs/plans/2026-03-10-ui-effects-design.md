# UI 动效增强设计文档

> 日期: 2026-03-10
> 分支: feature/effects

## 概述

为"散户大冒险"全面提升 UI 表现力和动效，让所有交互更生动。技术约束：只用 Tailwind CSS + CSS `@keyframes`，不引入第三方动画库，不改 engine/ 和 stores/。

## 动画清单

### 1. 事件弹出动画（稀有度分级）

| 稀有度 | 入场动画 | 附加效果 |
|--------|----------|----------|
| 常见（白） | `fadeSlideIn` 0.3s | 无 |
| 稀有（蓝） | `fadeSlideIn` 0.3s | 蓝色 `box-shadow` 脉冲 `glowPulseBlue` 1s |
| 传说（金） | `scaleIn` 0.5s 弹跳 | 整页 `shakeScreen` 8px/1s + 金色径向光芒覆盖层 |

**实现位置**: `EventDisplay.tsx`, `MorningNews.tsx`, `App.tsx`（震屏 wrapper）

### 2. 股价涨跌实时动画

- 价格数字变化时背景短暂闪烁红/绿（`priceFlash` 0.4s）
- 通过 React `key` 切换触发动画重播
- 涨跌百分比颜色用 CSS `transition` 平滑过渡

**实现位置**: `KLineChart.tsx`（价格显示区域）

### 3. 交易操作反馈

- 买入/卖出成功后显示 Toast 通知（`slideInRight` 入场，2s 后 `fadeOut` 退场）
- TradingPanel 中现金/股数变化时 `flashHighlight` 高亮（0.5s 背景闪烁）
- Toast 用组件内 `useState` 管理，不改 store

**实现位置**: `TradingPanel.tsx`

### 4. 涨停/跌停视觉提示

- 涨跌幅达 ±10% 时价格数字加 `pulseGlow` 持续脉冲光晕
- 显示"涨停！"/"跌停！"角标，带 `bounceIn` 弹跳动画
- 分时图头部区域醒目标识

**实现位置**: `KLineChart.tsx`

### 5. 卡牌翻牌动画

- 获得新卡弹窗中卡片 Y 轴 3D 翻转（`cardFlip` 0.6s，rotateY 180°→0°）
- 卡牌背面用纯 CSS 渲染（渐变 + 图案）
- 卡牌替换时旧卡 `fadeScaleOut`（0.3s 缩小淡出）

**实现位置**: `CardSlots.tsx`

### 6. 结算计数滚动

- `useCountUp` 自定义 hook（纯 React，~20 行）
- 用 `requestAnimationFrame` 在 1.5s 内从 0 滚动到目标值
- 应用于：总资产、持仓市值、目标进度%

**实现位置**: `Settlement.tsx`, `hooks/useCountUp.ts`

### 7. 整体过渡动画

- 所有阶段面板统一 `fadeSlideIn` 入场动画
- GameOver 弹窗：背景 `backdropFadeIn` 0.3s + 内容 `modalBounceIn` 0.4s
- MainMenu 标题 `floatPulse` 呼吸浮动效果
- GameOver 统计数字也用 `useCountUp`

**实现位置**: `MorningNews.tsx`, `TradingPanel.tsx`, `LunchBreak.tsx`, `ActivityPanel.tsx`, `Settlement.tsx`, `GameOver.tsx`, `MainMenu.tsx`

## CSS 动画定义（index.css）

需新增的 `@keyframes`：

```
fadeSlideIn     — 淡入+上移（已有，保留）
scaleIn         — 弹跳缩放入场（0.8→1.05→1.0）
shakeScreen     — 夸张震屏（8px 幅度，多次往返）
glowPulseBlue   — 蓝色 box-shadow 脉冲
glowPulseGold   — 金色 box-shadow 脉冲
priceFlash      — 背景颜色闪烁（透明→颜色→透明）
flashHighlight  — 高亮闪烁
slideInRight    — 从右侧滑入
fadeOut          — 淡出
bounceIn        — 弹跳入场
cardFlip        — Y轴3D翻转
fadeScaleOut    — 缩小淡出
backdropFadeIn  — 背景遮罩淡入
modalBounceIn   — 弹窗弹跳入场
floatPulse      — 呼吸浮动
pulseGlow       — 持续脉冲光晕
```

## 约束

- 不修改 `engine/` 和 `stores/` 下任何文件
- 不引入第三方动画库（framer-motion、react-spring 等）
- `useCountUp` hook 是唯一新增的 JS 文件（纯 React hook）
- `App.tsx` 中添加震屏 wrapper div 是 components 外唯一的小改动
- 改完后 `npm run build` 必须通过
