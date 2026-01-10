import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PLAYERS } from '../config/players';
import { Trash2, AlertTriangle } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

export default function AdminScreen() {
  const navigate = useNavigate();
  const { playerId: urlPlayerId } = useParams<{ playerId?: string }>();
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    urlPlayerId ? parseInt(urlPlayerId, 10) : null
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (urlPlayerId) {
      setSelectedPlayerId(parseInt(urlPlayerId, 10));
    }
  }, [urlPlayerId]);

  const handleClearPlayer = async (playerId: number) => {
    setSelectedPlayerId(playerId);
    setShowConfirm(true);
  };

  const handleConfirmClear = async () => {
    if (!selectedPlayerId) return;

    setClearing(true);
    setError(null);
    setSuccess(false);

    try {
      // Clear player stats from Cloudflare KV via API
      const response = await fetch(`/api/leaderboard/${selectedPlayerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to clear player stats';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // If response isn't JSON, use status text
          if (response.status === 404) {
            errorMessage = 'API endpoint not found. Make sure you are using Cloudflare Pages Functions (deployed or via wrangler pages dev)';
          } else {
            errorMessage = `Failed to clear player stats (${response.status})`;
          }
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setShowConfirm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setSelectedPlayerId(null);
      }, 3000);
    } catch (err) {
      console.error('Error clearing player stats:', err);
      setError('Failed to clear player stats. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  const handleCancelClear = () => {
    setShowConfirm(false);
    setSelectedPlayerId(null);
  };

  const selectedPlayer = selectedPlayerId ? PLAYERS.find(p => p.id === selectedPlayerId) : null;
  const displayNumber = selectedPlayer
    ? selectedPlayer.number === 0 && selectedPlayer.id === 1
      ? '00'
      : selectedPlayer.number === 0
      ? '0'
      : selectedPlayer.number.toString()
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pb-safe">
        <div className="py-6 space-y-6">
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
            <h1 className="text-2xl font-bold text-card-foreground">Admin - Clear Player Stats</h1>
          </div>

          {/* Warning */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-card-foreground">
              <p className="font-semibold mb-1">Warning</p>
              <p className="text-muted-foreground">
                This will permanently delete all stats for the selected player. This action cannot be undone.
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && selectedPlayer && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-700 dark:text-green-400">
              Successfully cleared stats for #{displayNumber} {selectedPlayer.name}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Player List */}
          <div className="space-y-3">
            <h2 className="font-semibold text-card-foreground">Select Player to Clear</h2>
            <div className="grid grid-cols-2 gap-3">
              {PLAYERS.map((player) => {
                const playerDisplayNumber =
                  player.number === 0 && player.id === 1
                    ? '00'
                    : player.number === 0
                    ? '0'
                    : player.number.toString();
                return (
                  <button
                    key={player.id}
                    onClick={() => handleClearPlayer(player.id)}
                    disabled={clearing}
                    className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-2"
                  >
                    <Trash2 className="w-5 h-5 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-card-foreground">#{playerDisplayNumber}</p>
                      <p className="text-sm text-muted-foreground">{player.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {selectedPlayer && (
        <ConfirmationDialog
          isOpen={showConfirm}
          title="Clear Player Stats"
          message={`Are you sure you want to permanently delete all stats for #${displayNumber} ${selectedPlayer.name}? This action cannot be undone.`}
          confirmText={clearing ? 'Clearing...' : 'Clear Stats'}
          cancelText="Cancel"
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      )}
    </div>
  );
}
