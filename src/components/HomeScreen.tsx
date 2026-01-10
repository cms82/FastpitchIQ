import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PrimaryActionCard from './PrimaryActionCard';
import { Target, Globe, BarChart3, Trophy } from 'lucide-react';
import PositionSelectionModal from './PositionSelectionModal';
import PlayerSelectModal from './PlayerSelectModal';
import { Position } from '../types';
import { getPlayerId, getLearningMode, setLearningMode as saveLearningMode } from '../utils/localStorage';
import { initializePlayerStats } from '../utils/leaderboard';

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [learningMode, setLearningMode] = useState(() => getLearningMode());
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
    // URL encode the position parameter
    const encodedPosition = encodeURIComponent(position);
    const url = learningMode 
      ? `/game/my_positions?position=${encodedPosition}&learning=true` 
      : `/game/my_positions?position=${encodedPosition}`;
    
    // Close modals first
    setShowPositionModal(false);
    setShowPlayerModal(false);
    
    // Detect mobile devices and use window.location for more reliable navigation
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use window.location for mobile - more reliable than React Router navigate on mobile Safari
      window.location.href = url;
    } else {
      // Use React Router for desktop
      navigate(url, { replace: false });
    }
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
        <div className="py-12">
          {/* Logo */}
          <div className="text-center mb-3">
            <div className="inline-flex items-center justify-center mb-2">
              <img src="/logo.png" alt="Fastpitch IQ Trainer Logo" className="h-32 w-auto" />
            </div>
          </div>

          {/* Mode Toggle - Pill Style */}
          <div className="flex items-center justify-center mb-3">
            <div className="inline-flex rounded-full bg-secondary p-1 border border-border">
              <button
                onClick={() => {
                  setLearningMode(true);
                  saveLearningMode(true);
                }}
                className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                  learningMode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Practice Mode
              </button>
              <button
                onClick={() => {
                  setLearningMode(false);
                  saveLearningMode(false);
                }}
                className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${
                  !learningMode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Competition Mode
              </button>
            </div>
          </div>

          {/* Main actions */}
          <div className="space-y-3">
            <PrimaryActionCard
              title={learningMode ? "Practice – One Position" : "Compete – One Position"}
              description="Play one position at a time"
              icon={<Target className="w-6 h-6" />}
              onClick={handleOnePosition}
            />
            <PrimaryActionCard
              title={learningMode ? "Practice – All Positions" : "Compete – All Positions"}
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
