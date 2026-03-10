import { useGameStore } from '../stores/gameStore';
import { minuteToTimeStr, getDayOfWeekLabel } from '../engine/CalendarSystem';

/**
 * 太阳月亮时间轮盘 — 用一个圆盘展示24小时时间流动
 * 太阳在上半圈(6:00-18:00)，月亮在下半圈(18:00-6:00)
 * 交易时段用红色弧标注，当前时间用指针/光晕指示
 */
export function DayClock() {
  const { calendar, gameStatus, vitality } = useGameStore();
  if (gameStatus !== 'playing') return null;

  const { minuteOfDay, isTradingDay, marketPhase, date, dayOfWeek } = calendar;

  // 将分钟 (0-1440) 映射到角度 (0-360)
  // 0:00 在底部(180°), 6:00 在左(270°), 12:00 在顶(0°/360°), 18:00 在右(90°)
  // 公式: angle = ((minuteOfDay / 1440) * 360 + 180) % 360
  const timeAngleDeg = ((minuteOfDay / 1440) * 360 + 180) % 360;
  const timeAngleRad = (timeAngleDeg * Math.PI) / 180;

  const cx = 60;
  const cy = 60;
  const r = 48;

  // 指针终点
  const pointerLen = r - 6;
  const px = cx + pointerLen * Math.sin(timeAngleRad);
  const py = cy - pointerLen * Math.cos(timeAngleRad);

  // 太阳位置 (12:00 = 顶部, 自然跟随时间)
  // 太阳在白天半圈, 月亮在夜晚半圈
  const sunAngleDeg = timeAngleDeg;
  const sunAngleRad = (sunAngleDeg * Math.PI) / 180;
  const sunR = r - 14;
  const sunX = cx + sunR * Math.sin(sunAngleRad);
  const sunY = cy - sunR * Math.cos(sunAngleRad);

  // 判断白天还是黑夜 (6:00=360min ~ 18:00=1080min 为白天)
  const isDaytime = minuteOfDay >= 360 && minuteOfDay < 1080;

  // 交易时段弧线
  const tradingArcs = isTradingDay ? [
    { start: 570, end: 690, label: 'AM' },   // 09:30-11:30
    { start: 780, end: 900, label: 'PM' },   // 13:00-15:00
  ] : [];

  // 分钟转角度（SVG弧线用）
  const minToAngle = (min: number) => ((min / 1440) * 360 + 180) % 360;

  // 绘制弧线路径
  function arcPath(startMin: number, endMin: number, radius: number) {
    const startAngle = (minToAngle(startMin) - 90) * (Math.PI / 180);
    const endAngle = (minToAngle(endMin) - 90) * (Math.PI / 180);
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const sweepAngle = endMin - startMin;
    const largeArc = sweepAngle > 720 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // 白天/夜晚弧线
  function halfArcPath(startMin: number, endMin: number, radius: number) {
    return arcPath(startMin, endMin, radius);
  }

  // 市场阶段文字
  const phaseLabel = marketPhase === 'am_trading' ? '交易中' :
    marketPhase === 'pm_trading' ? '交易中' :
    marketPhase === 'lunch_break' ? '午休' :
    marketPhase === 'pre_market' ? '盘前' :
    marketPhase === 'after_hours' ? '盘后' :
    '休市';

  const phaseColor = (marketPhase === 'am_trading' || marketPhase === 'pm_trading') ? '#ef4444' :
    marketPhase === 'lunch_break' ? '#eab308' :
    marketPhase === 'closed' ? '#4b5563' : '#6b7280';

  // 时钟刻度
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const angleDeg = ((i * 60 / 1440) * 360 + 180) % 360;
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const outerR = r + 1;
    const innerR = i % 6 === 0 ? r - 6 : r - 3;
    return {
      x1: cx + outerR * Math.cos(angleRad),
      y1: cy + outerR * Math.sin(angleRad),
      x2: cx + innerR * Math.cos(angleRad),
      y2: cy + innerR * Math.sin(angleRad),
      isMajor: i % 6 === 0,
      hour: i,
    };
  });

  // 数字标签 (0,6,12,18)
  const hourLabels = [0, 6, 12, 18].map(h => {
    const angleDeg = ((h * 60 / 1440) * 360 + 180) % 360;
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    const labelR = r - 12;
    return {
      hour: h,
      x: cx + labelR * Math.cos(angleRad),
      y: cy + labelR * Math.sin(angleRad),
    };
  });

  // 睡觉状态
  const isSleeping = vitality.isSleeping;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          {/* 背景渐变：白天暖色，夜晚深蓝 */}
          <radialGradient id="clockBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isDaytime ? '#1a1a2e' : '#0a0a14'} />
            <stop offset="100%" stopColor={isDaytime ? '#12121f' : '#06060c'} />
          </radialGradient>

          {/* 太阳/月亮光晕 */}
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
          </radialGradient>

          {/* 指针光晕 */}
          <filter id="pointerGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 外圈 */}
        <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#1f2937" strokeWidth="1" />

        {/* 白天/夜晚弧（外圈装饰） */}
        <path
          d={halfArcPath(360, 1080, r + 2)}
          fill="none" stroke="#fbbf2420" strokeWidth="3"
        />
        <path
          d={halfArcPath(1080, 1440 + 360, r + 2)}
          fill="none" stroke="#3b82f620" strokeWidth="3"
        />

        {/* 背景圆 */}
        <circle cx={cx} cy={cy} r={r} fill="url(#clockBg)" />

        {/* 交易时段弧 */}
        {tradingArcs.map(arc => (
          <path
            key={arc.label}
            d={arcPath(arc.start, arc.end, r - 1)}
            fill="none" stroke="#ef444460" strokeWidth="4" strokeLinecap="round"
          />
        ))}

        {/* 刻度 */}
        {ticks.map(t => (
          <line
            key={t.hour}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.isMajor ? '#6b7280' : '#374151'}
            strokeWidth={t.isMajor ? 1.5 : 0.5}
          />
        ))}

        {/* 小时数字 */}
        {hourLabels.map(l => (
          <text
            key={l.hour}
            x={l.x} y={l.y}
            textAnchor="middle" dominantBaseline="central"
            fill="#6b7280" fontSize="7" fontFamily="monospace"
          >
            {l.hour}
          </text>
        ))}

        {/* 太阳/月亮图标 */}
        {isDaytime ? (
          <g>
            <circle cx={sunX} cy={sunY} r="10" fill="url(#sunGlow)" />
            <text
              x={sunX} y={sunY}
              textAnchor="middle" dominantBaseline="central"
              fontSize="12"
            >
              ☀️
            </text>
          </g>
        ) : (
          <g>
            <circle cx={sunX} cy={sunY} r="10" fill="url(#moonGlow)" />
            <text
              x={sunX} y={sunY}
              textAnchor="middle" dominantBaseline="central"
              fontSize="12"
            >
              🌙
            </text>
          </g>
        )}

        {/* 指针 */}
        <line
          x1={cx} y1={cy} x2={px} y2={py}
          stroke={isDaytime ? '#fbbf24' : '#93c5fd'}
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#pointerGlow)"
        />

        {/* 中心点 */}
        <circle cx={cx} cy={cy} r="2.5"
          fill={isDaytime ? '#fbbf24' : '#93c5fd'}
        />

        {/* 睡觉遮罩 */}
        {isSleeping && (
          <g>
            <circle cx={cx} cy={cy} r={r} fill="#1e1b4b80" />
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="20">
              💤
            </text>
          </g>
        )}
      </svg>

      {/* 时间文字 */}
      <div className="text-center mt-1">
        <div className="text-white font-mono text-sm font-bold">
          {minuteToTimeStr(minuteOfDay)}
        </div>
        <div className="text-gray-500 text-[10px]">
          {date} {getDayOfWeekLabel(dayOfWeek)}
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
          style={{
            backgroundColor: `${phaseColor}20`,
            color: phaseColor,
          }}
        >
          {isTradingDay ? phaseLabel : '休市'}
        </span>
      </div>
    </div>
  );
}
