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

          {/* 右侧：事件 + 卡牌 + 消息 */}
          <div className="space-y-4">
            <EventDisplay />
            <CardSlots />
            <MessageLog />
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <MainMenu />
      <GameScreen />
      <GameOver />
    </>
  );
}

export default App;
