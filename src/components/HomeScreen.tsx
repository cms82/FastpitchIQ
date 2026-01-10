import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PrimaryActionCard from './PrimaryActionCard';
import { Target, Globe, BarChart3, Trophy } from 'lucide-react';
import PositionSelectionModal from './PositionSelectionModal';
import PlayerSelectModal from './PlayerSelectModal';
import { Position } from '../types';
import { getPlayerId } from '../utils/localStorage';
import { initializePlayerStats } from '../utils/leaderboard';

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [learningMode, setLearningMode] = useState(true);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  
  // Reset modals when location changes (navigating away)
  useEffect(() => {
    if (location.pathname !== '/') {
      setShowPositionModal(false);
      setShowPlayerModal(false);
    }
  }, [location.pathname]);
  
  // Check for player selection on mount - show modal if no player selected
  useEffect(() => {
    // Only show modal if we're on the home route and no player is selected
    if (location.pathname !== '/') return;
    
    const playerId = getPlayerId();
    if (!playerId) {
      // Show player selection modal on first visit
      setShowPlayerModal(true);
    } else {
      // Initialize stats from KV for cross-device sync (non-blocking)
      initializePlayerStats(playerId).catch(err => {
        console.warn('Failed to initialize player stats:', err);
      });
    }
  }, [location.pathname]);

  const handleOnePosition = () => {
    setShowPositionModal(true);
  };

  const handlePositionSelected = (position: Position) => {
    // Ensure modals are closed (redundant but safe)
    setShowPositionModal(false);
    setShowPlayerModal(false);
    
    // URL encode the position parameter
    const encodedPosition = encodeURIComponent(position);
    const url = learningMode 
      ? `/game/my_positions?position=${encodedPosition}&learning=true` 
      : `/game/my_positions?position=${encodedPosition}`;
    
    // Navigate - modal should already be closed by onClose call in modal
    navigate(url, { replace: false });
  };

  const handlePlayerSelected = (playerId: number) => {
    setShowPlayerModal(false);
    // Initialize stats from KV after player selection (non-blocking)
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
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-2">
              <img src="/logo.png" alt="Fastpitch IQ Trainer Logo" className="h-32 w-auto" />
            </div>
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
                // Don't allow closing without selecting - player selection is required for leaderboard
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
