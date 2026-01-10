import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PrimaryActionCard from './PrimaryActionCard';
import { Target, Globe, BarChart3, Trophy } from 'lucide-react';
import PositionSelectionModal from './PositionSelectionModal';
import PlayerSelectModal from './PlayerSelectModal';
import { Position } from '../types';
import { getPlayerId } from '../utils/localStorage';
import { initializePlayerStats } from '../utils/leaderboard';

export default function HomeScreen() {
  const navigate = useNavigate();
  const [learningMode, setLearningMode] = useState(true);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  // Check for player selection on mount
  useEffect(() => {
    const playerId = getPlayerId();
    if (!playerId) {
      setShowPlayerModal(true);
    } else {
      // Initialize stats from KV for cross-device sync
      initializePlayerStats(playerId).catch(err => {
        console.warn('Failed to initialize player stats:', err);
      });
    }
  }, []);

  const handleOnePosition = () => {
    setShowPositionModal(true);
  };

  const handlePositionSelected = (position: Position) => {
    setShowPositionModal(false);
    const url = learningMode 
      ? `/game/my_positions?position=${position}&learning=true` 
      : `/game/my_positions?position=${position}`;
    navigate(url);
  };

  const handlePlayerSelected = (playerId: number) => {
    setShowPlayerModal(false);
    // Initialize stats from KV after player selection
    initializePlayerStats(playerId).catch(err => {
      console.warn('Failed to initialize player stats:', err);
    });
  };

  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  const handleAllPositions = () => {
    const url = learningMode ? '/game/whole_field?learning=true' : '/game/whole_field';
    navigate(url);
  };

  const handleProgress = () => {
    navigate('/progress');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-safe">
        <div className="py-12 space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-card-foreground">Fastpitch IQ Trainer</h1>
            <p className="text-muted-foreground">6 quick prompts per round. Get faster every day.</p>
          </div>

          {/* Main actions */}
          <div className="space-y-3">
            <PrimaryActionCard
              title="Quiz – One Position"
              description="Practice a single position at a time"
              icon={<Target className="w-6 h-6" />}
              onClick={handleOnePosition}
            />
            <PrimaryActionCard
              title="Quiz – All Positions"
              description="Play all 9 positions randomly"
              icon={<Globe className="w-6 h-6" />}
              onClick={handleAllPositions}
            />
            <PrimaryActionCard
              title="Review My Progress"
              description="See your stats and weak spots"
              icon={<BarChart3 className="w-6 h-6" />}
              onClick={handleProgress}
              variant="secondary"
            />
            <PrimaryActionCard
              title="Leaderboard"
              description="See how you rank against your teammates"
              icon={<Trophy className="w-6 h-6" />}
              onClick={handleLeaderboard}
              variant="secondary"
            />
          </div>

          {/* Learning mode toggle */}
          <div className="flex items-center justify-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={learningMode}
                onChange={(e) => setLearningMode(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">Learning Mode (No Timer)</span>
            </label>
          </div>

          {/* Position Selection Modal */}
          {showPositionModal && (
            <PositionSelectionModal
              onSelect={handlePositionSelected}
              onClose={() => setShowPositionModal(false)}
            />
          )}

          {/* Player Selection Modal */}
          {showPlayerModal && (
            <PlayerSelectModal
              onSelect={handlePlayerSelected}
              onClose={() => {
                // Don't allow closing without selecting (required for leaderboard)
                const playerId = getPlayerId();
                if (!playerId) {
                  return; // Keep modal open
                }
                setShowPlayerModal(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
