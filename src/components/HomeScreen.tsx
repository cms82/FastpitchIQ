import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPreferences } from '../utils/localStorage';
import PrimaryActionCard from './PrimaryActionCard';
import { Target, Globe, BarChart3 } from 'lucide-react';

export default function HomeScreen() {
  const navigate = useNavigate();
  const prefs = getPreferences();
  const [learningMode, setLearningMode] = useState(true);

  const handleMyPositions = () => {
    if (!prefs.selectedPrimaryPosition) {
      navigate('/setup');
    } else {
      const url = learningMode ? '/game/my_positions?learning=true' : '/game/my_positions';
      navigate(url);
    }
  };

  const handleWholeField = () => {
    const url = learningMode ? '/game/whole_field?learning=true' : '/game/whole_field';
    navigate(url);
  };

  const handleProgress = () => {
    navigate('/progress');
  };

  const handleEditPositions = () => {
    navigate('/setup');
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
              title="Quiz – My Positions"
              description="Practice your primary & secondary spots"
              icon={<Target className="w-6 h-6" />}
              onClick={handleMyPositions}
            />
            <PrimaryActionCard
              title="Quiz – Whole Field"
              description="Play all 9 positions randomly"
              icon={<Globe className="w-6 h-6" />}
              onClick={handleWholeField}
            />
            <PrimaryActionCard
              title="Review My Progress"
              description="See your stats and weak spots"
              icon={<BarChart3 className="w-6 h-6" />}
              onClick={handleProgress}
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

          {/* Positions info */}
          {prefs.selectedPrimaryPosition && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Your positions: <span className="font-semibold text-card-foreground">
                  {prefs.selectedPrimaryPosition}
                  {prefs.selectedSecondaryPosition && `, ${prefs.selectedSecondaryPosition}`}
                </span>
              </p>
              <button
                onClick={handleEditPositions}
                className="text-sm text-primary hover:underline"
              >
                Edit Positions
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
