import { useEffect, useState } from 'react';
import { Player } from '../config/players';
import { setPlayerId } from '../utils/localStorage';
import { fetchPlayers } from '../utils/players';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

interface PlayerSelectModalProps {
  onSelect: (playerId: number) => void;
  onClose?: () => void;
}

export default function PlayerSelectModal({ onSelect, onClose }: PlayerSelectModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPlayers = async () => {
      setLoading(true);
      setError(null);

      try {
        const kvPlayers = await fetchPlayers();
        if (!isMounted) return;
        setPlayers(kvPlayers);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load players for selection modal:', err);
        setError('Failed to load players');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPlayers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleConfirm = () => {
    if (selectedPlayer) {
      setPlayerId(selectedPlayer.id);
      onSelect(selectedPlayer.id);
      if (onClose) onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-card-foreground">Select Your Player</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Choose your player to track your stats on the leaderboard
        </p>

        {/* Player Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 max-h-[400px] overflow-y-auto">
          {loading && (
            <p className="col-span-2 text-center text-sm text-muted-foreground">Loading players...</p>
          )}
          {!loading && error && (
            <p className="col-span-2 text-center text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && players.length === 0 && (
            <p className="col-span-2 text-center text-sm text-muted-foreground">No players found.</p>
          )}
          {!loading && !error && players.map((player) => {
            const isSelected = selectedPlayer?.id === player.id;
            return (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={cn(
                  'relative rounded-xl p-4 transition-all duration-200 active:scale-95',
                  'flex flex-col items-center justify-center gap-1 min-h-[80px]',
                  'border-2',
                  isSelected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border hover:border-primary/30',
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <span className={cn('text-lg font-bold', isSelected ? 'text-primary' : 'text-card-foreground')}>
                  {player.number === 0 && player.id === 1 ? '#00' : player.number === 0 ? '#0' : `#${player.number}`}
                </span>
                <span className="text-xs text-muted-foreground">{player.name}</span>
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedPlayer || loading || players.length === 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
