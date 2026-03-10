import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';

/**
 * 上班系统面板 — 工作进度/摸鱼/带薪拉屎/离职
 */
export function JobPanel() {
  const { job, gameStatus, calendar, totalGameMinutes } = useGameStore();
  const { toggleSlacking, startToilet, quitJob } = useGameStore(s => s.actions);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  if (gameStatus !== 'playing') return null;

  // 没有工作
  if (!job.employed) {
    return (
      <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
        <h3 className="text-white font-bold mb-2">
          💼 工作状态
        </h3>
        <div className="bg-[#1a1a2e] rounded p-3 text-center">
          <span className="text-2xl">🆓</span>
          <p className="text-gray-400 text-sm mt-2">自由职业中（无业）</p>
          <p className="text-gray-500 text-xs mt-1">没有工资收入，但炒股自由！</p>
          <p className="text-gray-500 text-xs mt-1">可以在活动面板「找工作」重新上班</p>
        </div>
      </div>
    );
  }

  const {
    isWorkingHours, isSlacking, isOnToilet, toiletUsedToday,
    caughtToday, totalCaught, dailySalary, jobTitle, catchPenalty,
    workProgress, slackMinutesToday,
  } = job;

  // 带薪拉屎剩余时间
  const toiletRemaining = isOnToilet
    ? Math.max(0, job.toiletMaxMinutes - (totalGameMinutes - job.toiletStartMinute))
    : 0;

  const isTradingTime = calendar.marketPhase === 'am_trading' || calendar.marketPhase === 'pm_trading';

  // 预计薪资
  const progressRatio = Math.round(workProgress) / 100;
  const estimatedSalary = Math.round(dailySalary * progressRatio);

  // 进度条颜色
  const progressColor = workProgress >= 80 ? '#22c55e' : workProgress >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="bg-[#0e0e18] rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold">
          💼 {jobTitle}
        </h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isWorkingHours
            ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
            : 'bg-green-900/50 text-green-400 border border-green-700'
        }`}>
          {isWorkingHours ? '🏢 上班中' : '🏠 下班'}
        </span>
      </div>

      {/* 工作进度条 — 始终显示（工作日） */}
      {calendar.isTradingDay && (
        <div className="mb-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-gray-400">📊 今日工作进度</span>
            <span className="font-mono" style={{ color: progressColor }}>
              {Math.round(workProgress)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, workProgress)}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] mt-1">
            <span className="text-gray-600">
              {slackMinutesToday > 0 && `🐟 摸鱼${slackMinutesToday}分钟`}
            </span>
            <span className={`font-mono ${progressRatio >= 0.8 ? 'text-green-400' : progressRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
              预计薪资: ¥{estimatedSalary} / ¥{dailySalary}
            </span>
          </div>
        </div>
      )}

      {/* 工资信息（非工作日显示） */}
      {!calendar.isTradingDay && (
        <div className="flex justify-between items-center text-sm mb-3 bg-[#1a1a2e] rounded px-3 py-2">
          <span className="text-gray-400">日薪</span>
          <span className="text-green-400 font-mono">¥{dailySalary}</span>
        </div>
      )}

      {/* 上班时间面板 */}
      {isWorkingHours && (
        <div className="space-y-2 mb-3">
          {/* 摸鱼状态 */}
          <div className={`rounded p-3 border transition-all ${
            isSlacking
              ? isOnToilet
                ? 'bg-amber-900/20 border-amber-700/50'
                : 'bg-red-900/20 border-red-700/50 animate-pulse'
              : 'bg-[#1a1a2e] border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{isSlacking ? (isOnToilet ? '🚽' : '🐟') : '📋'}</span>
                <div>
                  <span className="text-sm font-bold text-white">
                    {isSlacking
                      ? isOnToilet
                        ? `带薪拉屎中 (${toiletRemaining}分钟)`
                        : '摸鱼中...'
                      : '认真工作'}
                  </span>
                  {isSlacking && !isOnToilet && (
                    <p className="text-xs text-red-400">⚠️ 随时可能被领导抓到！罚款¥{catchPenalty}</p>
                  )}
                  {isOnToilet && (
                    <p className="text-xs text-amber-400">🛡️ 厕所保护中，安心操作</p>
                  )}
                  {!isSlacking && (
                    <p className="text-xs text-green-400/70">📈 工作进度增长中...</p>
                  )}
                </div>
              </div>
            </div>

            {/* 摸鱼开关 */}
            <button
              onClick={toggleSlacking}
              className={`w-full py-2 rounded font-bold text-sm transition-colors ${
                isSlacking
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-red-600/80 hover:bg-red-600 text-white'
              }`}
            >
              {isSlacking ? '📋 收起手机（回去工作）' : '🐟 开始摸鱼（看盘交易）'}
            </button>
          </div>

          {/* 带薪拉屎按钮 */}
          {!isOnToilet && (
            <button
              onClick={startToilet}
              disabled={toiletUsedToday}
              className={`w-full py-2 rounded font-bold text-sm transition-colors ${
                toiletUsedToday
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-amber-700/80 hover:bg-amber-700 text-white'
              }`}
            >
              {toiletUsedToday
                ? '🚽 带薪拉屎（今日已用）'
                : '🚽 带薪拉屎（30分钟免抓）'
              }
            </button>
          )}

          {/* 需要摸鱼才能交易的提示 */}
          {isTradingTime && !isSlacking && (
            <div className="bg-orange-900/20 border border-orange-800/50 rounded p-2">
              <p className="text-orange-400 text-xs">
                💡 股市正在交易！但你在认真工作，盘面已隐藏
              </p>
            </div>
          )}

          {/* 今日被抓记录 */}
          {caughtToday > 0 && (
            <div className="text-xs text-red-400/70 text-right">
              今日被抓 {caughtToday} 次 | 累计 {totalCaught} 次
            </div>
          )}
        </div>
      )}

      {/* 非上班时间 */}
      {!isWorkingHours && (
        <div className="text-center py-2 mb-3">
          <p className="text-gray-500 text-sm">
            {calendar.isTradingDay
              ? '🌙 下班了，自由交易时间！'
              : '📅 今天休息，不用上班'}
          </p>
        </div>
      )}

      {/* 离职按钮 */}
      <div className="border-t border-gray-800 pt-2">
        {!showQuitConfirm ? (
          <button
            onClick={() => setShowQuitConfirm(true)}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            📝 考虑离职...
          </button>
        ) : (
          <div className="bg-red-900/20 border border-red-800/50 rounded p-3">
            <p className="text-red-400 text-sm mb-2">
              ⚠️ 确定要离职吗？你将失去每天 ¥{dailySalary} 的工资收入！
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { quitJob(); setShowQuitConfirm(false); }}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
              >
                确定离职
              </button>
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm"
              >
                再想想
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
