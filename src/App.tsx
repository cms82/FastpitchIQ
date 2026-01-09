import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import ProgressScreen from './components/ProgressScreen';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/setup" element={<SetupScreen />} />
        <Route path="/game/:mode" element={<GameScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
