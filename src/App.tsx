import { useState, useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { StatusBar } from './components/StatusBar';
import { KLineChart } from './components/KLineChart';
import { TradingPanel } from './components/TradingPanel';
import { EventDisplay } from './components/EventDisplay';
import { CardSlots } from './components/CardSlots';
import { ActivityPanel } from './components/ActivityPanel';
import { MorningNews } from './components/MorningNews';
import { Settlement } from './components/Settlement';
import { LunchBreak } from './components/LunchBreak';
import { MainMenu } from './components/MainMenu';
import { GameOver } from './components/GameOver';
import { MessageLog } from './components/MessageLog';
import { EventLog } from './components/EventLog';
import { NewsWaterfall } from './components/NewsWaterfall';
import { Calendar } from './components/Calendar';
import { PlayerActions } from './components/PlayerActions';

function GameScreen() {
  const { gameStatus } = useGameStore();

  if (gameStatus !== 'playing') return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <StatusBar />
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧：K线图 + 交易/阶段面板 */}
          <div className="lg:col-span-2 space-y-4">
            <KLineChart />
            <MorningNews />
            <TradingPanel />
            <LunchBreak />
            <ActivityPanel />
            <Settlement />
          </div>

          {/* 右侧：日历 + 角色操作 + 事件 + 卡牌 + 消息 */}
          <div className="space-y-4">
            <Calendar />
            <PlayerActions />
            <EventDisplay />
            <CardSlots />
            <MessageLog />
            <EventLog />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    const handler = () => {
      setShaking(true);
      setTimeout(() => setShaking(false), 800);
    };
    window.addEventListener('screen-shake', handler);
    return () => window.removeEventListener('screen-shake', handler);
  }, []);

  return (
    <div className={shaking ? 'animate-shakeScreen' : ''}>
      <MainMenu />
      <GameScreen />
      <GameOver />
      <NewsWaterfall />
    </div>
  );
}

export default App;
