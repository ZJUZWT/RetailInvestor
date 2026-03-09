import { useEffect, useRef, useMemo } from 'react';
import { createChart, LineSeries, CandlestickSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useGameStore, type StoreState } from '../stores/gameStore';

/** 计算移动平均线 */
function calculateMA(
  data: { time: UTCTimestamp; close: number }[],
  period: number,
): { time: UTCTimestamp; value: number }[] {
  const result: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: Math.round((sum / period) * 100) / 100 });
  }
  return result;
}

/** 计算分时均价线（累计均价） */
function calculateAvgPriceLine(
  data: { time: UTCTimestamp; value: number }[],
): { time: UTCTimestamp; value: number }[] {
  const result: { time: UTCTimestamp; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].value;
    result.push({ time: data[i].time, value: Math.round((sum / (i + 1)) * 100) / 100 });
  }
  return result;
}

export function KLineChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | ISeriesApi<'Candlestick'> | null>(null);

  const {
    stockHistory, stockName, currentPrice, todayOpen,
    intradayTicks, currentTick, phase, chartView,
  } = useGameStore();
  const maVisible = useGameStore(s => s.maVisible);
  const recentIntradayHistory = useGameStore(s => s.recentIntradayHistory);
  const { setChartView, toggleMA } = useGameStore(s => s.actions);

  const isTrading = phase === 'am_trading' || phase === 'pm_trading';
  const canSwitchView = !isTrading;

  // 计算K线聚合数据
  const chartData = useMemo(() => {
    if (chartView === 'intraday') return null; // 分时图单独处理

    const history = stockHistory;
    if (history.length === 0) return [];

    if (chartView === 'daily') {
      return history.map(d => ({
        time: d.day as unknown as import('lightweight-charts').UTCTimestamp,
        open: d.open, high: d.high, low: d.low, close: d.close,
      }));
    }

    if (chartView === '5day') {
      // 5日分时拼接（如果有分时数据），否则回退到5日K线
      if (recentIntradayHistory.length > 0) return null; // 用分时线渲染
      const recent = history.slice(-5);
      return recent.map(d => ({
        time: d.day as unknown as import('lightweight-charts').UTCTimestamp,
        open: d.open, high: d.high, low: d.low, close: d.close,
      }));
    }

    // 周K / 月K 聚合
    const groupSize = chartView === 'weekly' ? 5 : 20; // 5交易日/周, ~20交易日/月
    const grouped: typeof history[number][] = [];

    for (let i = 0; i < history.length; i += groupSize) {
      const chunk = history.slice(i, i + groupSize);
      if (chunk.length === 0) continue;
      grouped.push({
        day: chunk[0].day,
        open: chunk[0].open,
        close: chunk[chunk.length - 1].close,
        high: Math.max(...chunk.map(c => c.high)),
        low: Math.min(...chunk.map(c => c.low)),
      });
    }

    return grouped.map(d => ({
      time: d.day as unknown as import('lightweight-charts').UTCTimestamp,
      open: d.open, high: d.high, low: d.low, close: d.close,
    }));
  }, [stockHistory, chartView, recentIntradayHistory]);

  // 分时图数据：截取到当前tick
  const intradayData = useMemo(() => {
    if (chartView !== 'intraday' || intradayTicks.length === 0) return [];
    return intradayTicks
      .filter(t => t.minute <= currentTick)
      .map(t => ({
        time: t.minute as unknown as import('lightweight-charts').UTCTimestamp,
        value: t.price,
      }));
  }, [intradayTicks, currentTick, chartView]);

  const maData = useMemo(() => {
    if (chartView === 'intraday' || chartView === '5day' || !chartData || chartData.length === 0) return null;

    const withClose = chartData.map(d => ({ ...d, close: d.close }));
    return {
      ma5: calculateMA(withClose, 5),
      ma10: calculateMA(withClose, 10),
      ma20: calculateMA(withClose, 20),
    };
  }, [chartData, chartView]);

  const avgPriceData = useMemo(() => {
    if (chartView !== 'intraday' || intradayData.length === 0) return [];
    return calculateAvgPriceLine(intradayData);
  }, [intradayData, chartView]);

  const fiveDayIntradayData = useMemo(() => {
    if (chartView !== '5day' || recentIntradayHistory.length === 0) return [];
    const result: { time: UTCTimestamp; value: number }[] = [];
    recentIntradayHistory.forEach((dayTicks, dayIndex) => {
      dayTicks.forEach(tick => {
        result.push({
          time: (dayIndex * 241 + tick.minute) as unknown as UTCTimestamp,
          value: tick.price,
        });
      });
    });
    // 追加当天已有的tick
    if (intradayTicks.length > 0) {
      const dayIndex = recentIntradayHistory.length;
      intradayTicks
        .filter(t => t.minute <= currentTick)
        .forEach(tick => {
          result.push({
            time: (dayIndex * 241 + tick.minute) as unknown as UTCTimestamp,
            value: tick.price,
          });
        });
    }
    return result;
  }, [chartView, recentIntradayHistory, intradayTicks, currentTick]);

  // 渲染图表
  useEffect(() => {
    if (!chartRef.current) return;

    if (chartApiRef.current) {
      chartApiRef.current.remove();
      chartApiRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: '#0a0a0f' },
        textColor: '#9ca3af',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      width: chartRef.current.clientWidth,
      height: 300,
      crosshair: { mode: 0 },
      timeScale: {
        borderColor: '#1a1a2e',
        timeVisible: false,
        // 分时图：自定义横坐标显示真实时间
        ...(chartView === 'intraday' ? {
          tickMarkFormatter: (time: number) => {
            const minute = time as number;
            if (minute <= 120) {
              const totalMins = 9 * 60 + 30 + minute;
              const h = Math.floor(totalMins / 60);
              const m = totalMins % 60;
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            } else {
              const pmMinute = minute - 121;
              const totalMins = 13 * 60 + pmMinute;
              const h = Math.floor(totalMins / 60);
              const m = totalMins % 60;
              return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }
          },
        } : {}),
      },
      rightPriceScale: { borderColor: '#1a1a2e' },
    });
    chartApiRef.current = chart;

    if (chartView === '5day' && fiveDayIntradayData.length > 0) {
      const series = chart.addSeries(LineSeries, {
        color: '#ffffff',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });
      series.setData(fiveDayIntradayData);
      seriesRef.current = series;
      chart.timeScale().fitContent();
    } else if (chartView === 'intraday') {
      // 分时线
      const series = chart.addSeries(LineSeries, {
        color: '#ffffff',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      });

      if (intradayData.length > 0) {
        series.setData(intradayData);
      }

      // 昨收均价线
      if (todayOpen > 0) {
        series.createPriceLine({
          price: todayOpen,
          color: '#666',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: '开盘',
        });
      }

      // 分时均价线
      if (avgPriceData.length > 0) {
        const avgSeries = chart.addSeries(LineSeries, {
          color: '#f97316',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        avgSeries.setData(avgPriceData);
      }

      seriesRef.current = series;
      // 固定分时图横轴范围为整个交易日 (0-240)，避免少量数据点占满屏幕
      chart.timeScale().setVisibleRange({
        from: 0 as unknown as UTCTimestamp,
        to: 240 as unknown as UTCTimestamp,
      });
    } else {
      // K线图
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#ef4444',
        downColor: '#22c55e',
        borderUpColor: '#ef4444',
        borderDownColor: '#22c55e',
        wickUpColor: '#ef4444',
        wickDownColor: '#22c55e',
      });

      if (chartData && chartData.length > 0) {
        series.setData(chartData);
      }

      seriesRef.current = series;

      // 添加均线
      const MA_COLORS: Record<string, string> = { ma5: '#f6c244', ma10: '#4a9eff', ma20: '#a855f7' };
      if (maData) {
        for (const [key, color] of Object.entries(MA_COLORS)) {
          if (maVisible[key as keyof typeof maVisible] && maData[key as keyof typeof maData].length > 0) {
            const maSeries = chart.addSeries(LineSeries, {
              color,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
              crosshairMarkerVisible: false,
            });
            maSeries.setData(maData[key as keyof typeof maData]);
          }
        }
      }

      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartApiRef.current = null;
      seriesRef.current = null;
    };
  }, [chartView, chartData, stockHistory.length, maVisible, maData, avgPriceData, fiveDayIntradayData]); // 重建条件

  // 分时图实时更新（不重建，只追加数据）
  useEffect(() => {
    if (chartView !== 'intraday' || !seriesRef.current || intradayData.length === 0) return;
    try {
      const last = intradayData[intradayData.length - 1];
      (seriesRef.current as ISeriesApi<'Line'>).update(last);
    } catch {
      // 忽略
    }
  }, [currentTick]);

  // Price direction tracking for flash animation
  const prevPriceRef = useRef(currentPrice);
  const priceDirection = currentPrice > prevPriceRef.current ? 'up'
    : currentPrice < prevPriceRef.current ? 'down'
    : 'flat';

  useEffect(() => {
    prevPriceRef.current = currentPrice;
  }, [currentPrice]);

  const changePercent = todayOpen > 0 ? ((currentPrice - todayOpen) / todayOpen * 100) : 0;
  const isUp = changePercent >= 0;
  const isLimitUp = changePercent >= 9.9;
  const isLimitDown = changePercent <= -9.9;

  // 当前时间标签
  const timeLabel = intradayTicks[currentTick]?.timeLabel ?? '';

  const VIEW_TABS: { key: StoreState['chartView']; label: string }[] = [
    { key: 'intraday', label: '分时' },
    { key: 'daily', label: '日K' },
    { key: '5day', label: '5日' },
    { key: 'weekly', label: '周K' },
    { key: 'monthly', label: '月K' },
  ];

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      {/* 头部信息 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-white font-bold text-lg">{stockName}</span>
          {isTrading && timeLabel && (
            <span className="text-yellow-400 text-sm ml-2 font-mono">{timeLabel}</span>
          )}
        </div>
        <div className="text-right flex items-center">
          <span
            key={currentPrice}
            className={`text-2xl font-bold font-mono rounded px-2 ${isUp ? 'text-red-500' : 'text-green-500'} ${
              priceDirection === 'up' ? 'animate-priceFlashRed' : priceDirection === 'down' ? 'animate-priceFlashGreen' : ''
            } ${isLimitUp ? 'animate-pulseGlowRed' : isLimitDown ? 'animate-pulseGlowGreen' : ''}`}
          >
            ¥{currentPrice.toFixed(2)}
          </span>
          <span className={`text-sm ml-2 ${isUp ? 'text-red-400' : 'text-green-400'}`}>
            {isUp ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
          {isLimitUp && <span className="animate-bounceIn text-red-500 font-black text-sm ml-2">涨停！</span>}
          {isLimitDown && <span className="animate-bounceIn text-green-500 font-black text-sm ml-2">跌停！</span>}
        </div>
      </div>

      {/* K线视图切换按钮 */}
      <div className="flex gap-1 mb-2 items-center">
        {VIEW_TABS.map(tab => {
          const isActive = chartView === tab.key;
          const disabled = !canSwitchView && tab.key !== 'intraday';
          return (
            <button
              key={tab.key}
              onClick={() => setChartView(tab.key)}
              disabled={disabled}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : disabled
                    ? 'bg-gray-900 text-gray-700 cursor-not-allowed'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {disabled && tab.key !== 'intraday' && ' 🔒'}
            </button>
          );
        })}

        {/* 均线开关 - 非分时且非5日视图时显示 */}
        {chartView !== 'intraday' && chartView !== '5day' && (
          <div className="flex gap-1 items-center ml-auto">
            <span className="text-xs text-gray-500">MA:</span>
            {([
              { key: 'ma5' as const, label: 'MA5', color: '#f6c244' },
              { key: 'ma10' as const, label: 'MA10', color: '#4a9eff' },
              { key: 'ma20' as const, label: 'MA20', color: '#a855f7' },
            ]).map(ma => (
              <button
                key={ma.key}
                onClick={() => toggleMA(ma.key)}
                className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                  maVisible[ma.key]
                    ? 'opacity-100'
                    : 'opacity-30'
                }`}
                style={{ color: ma.color, borderColor: ma.color, borderWidth: '1px', borderStyle: 'solid' }}
              >
                {ma.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 图表 */}
      <div ref={chartRef} />

      {/* 盘中锁定提示 */}
      {isTrading && (
        <p className="text-xs text-gray-600 mt-1">
          盘中仅显示分时图，收盘后可切换日K/周K/月K
        </p>
      )}
    </div>
  );
}
