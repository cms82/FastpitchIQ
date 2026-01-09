import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Position } from '../types';
import { getPreferences, savePreferences } from '../utils/localStorage';
import PositionPickerGrid from './PositionPickerGrid';

export default function SetupScreen() {
  const navigate = useNavigate();
  const prefs = getPreferences();
  const [primary, setPrimary] = useState<Position | null>(prefs.selectedPrimaryPosition);
  const [secondary, setSecondary] = useState<Position | null>(prefs.selectedSecondaryPosition);

  const handleSave = () => {
    if (!primary) {
      alert('Please select a primary position');
      return;
    }

    savePreferences({
      selectedPrimaryPosition: primary,
      selectedSecondaryPosition: secondary,
    });

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-safe">
        <div className="py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-card-foreground">
              {prefs.selectedPrimaryPosition ? 'Edit Positions' : 'Select Positions'}
            </h1>
          </div>

          <PositionPickerGrid
            primaryPosition={primary}
            secondaryPosition={secondary}
            onSelectPrimary={setPrimary}
            onSelectSecondary={setSecondary}
          />

          <button
            onClick={handleSave}
            disabled={!primary || !secondary}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
