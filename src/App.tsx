import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import ProgressScreen from './components/ProgressScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import AdminScreen from './components/AdminScreen';
import CoachScreen from './components/CoachScreen';

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/game/:mode" element={<GameScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
        <Route path="/admin/player/:playerId" element={<AdminScreen />} />
        <Route path="/coach" element={<CoachScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
