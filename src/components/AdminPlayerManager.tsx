import { useState, useEffect } from 'react';
import { Player } from '../config/players';
import { Edit2, Trash2, Plus, X, Save } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import { fetchPlayers, createPlayer, updatePlayer, deletePlayer } from '../utils/players';
import { clearPlayerStats } from '../utils/leaderboard';

// Helper to get display number
function getDisplayNumber(player: Player): string {
  // Special case: first player with number 0 gets "00"
  if (player.number === 0 && player.id === 1) return '00';
  if (player.number === 0) return '0';
  return player.number.toString();
}

type Tab = 'list' | 'edit' | 'add';

export default function AdminPlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>('list');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearStatsConfirm, setShowClearStatsConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clearingStats, setClearingStats] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{ name: string; number: number }>({ name: '', number: 0 });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load players on mount
  useEffect(() => {
    loadAllPlayers();
  }, []);

  const loadAllPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const playerList = await fetchPlayers();
      setPlayers(playerList);
    } catch (err) {
      console.error('Error loading players:', err);
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player: Player) => {
    setSelectedPlayer(player);
    setFormData({ name: player.name, number: player.number });
    setFormErrors({});
    setCurrentTab('edit');
  };

  const handleAdd = () => {
    setSelectedPlayer(null);
    setFormData({ name: '', number: 0 });
    setFormErrors({});
    setCurrentTab('add');
  };

  const handleSave = async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.number < 0 || formData.number > 99) newErrors.number = 'Number must be between 0 and 99';
    
    // Check for duplicate number (excluding current player)
    if (selectedPlayer) {
      const duplicate = players.find(p => p.number === formData.number && p.id !== selectedPlayer.id);
      if (duplicate) newErrors.number = `Jersey number ${formData.number} is already taken by ${duplicate.name}`;
    } else {
      const duplicate = players.find(p => p.number === formData.number);
      if (duplicate) newErrors.number = `Jersey number ${formData.number} is already taken by ${duplicate.name}`;
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setSaving(true);
    setError(null);
    setFormErrors({});

    try {
      if (selectedPlayer) {
        // Update existing
        await updatePlayer(selectedPlayer.id, { name: formData.name.trim(), number: formData.number });
      } else {
        // Create new - need to get next ID
        const maxId = players.length > 0 ? Math.max(...players.map(p => p.id)) : 0;
        const newPlayer: Player = {
          id: maxId + 1,
          name: formData.name.trim(),
          number: formData.number,
        };
        await createPlayer(newPlayer);
      }

      // Reload players
      await loadAllPlayers();

      // Go back to list
      setCurrentTab('list');
      setSelectedPlayer(null);
      setFormData({ name: '', number: 0 });
    } catch (err: any) {
      console.error('Error saving player:', err);
      setError(err.message || 'Failed to save player.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (player: Player) => {
    setSelectedPlayer(player);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedPlayer) return;

    setDeleting(true);
    setError(null);

    try {
      await deletePlayer(selectedPlayer.id);
      await loadAllPlayers(); // Refresh list
      setShowDeleteConfirm(false);
      setSelectedPlayer(null);
    } catch (err) {
      console.error('Error deleting player:', err);
      setError('Failed to delete player.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearStats = (player: Player) => {
    setSelectedPlayer(player);
    setShowClearStatsConfirm(true);
  };

  const confirmClearStats = async () => {
    if (!selectedPlayer) return;

    setClearingStats(true);
    setError(null);

    try {
      await clearPlayerStats(selectedPlayer.id);
      setShowClearStatsConfirm(false);
      setSelectedPlayer(null);
      setError(null);
      // Show success message
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error clearing player stats:', err);
      setError(err.message || 'Failed to clear player stats.');
      setShowClearStatsConfirm(false);
    } finally {
      setClearingStats(false);
    }
  };


  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading players...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* List View */}
      {currentTab === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-card-foreground">Players ({players.length})</h2>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Add New Player
            </button>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground text-lg">No players found. Click "Add New Player" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-card-foreground">#{getDisplayNumber(player)}</p>
                      <p className="text-lg font-semibold text-card-foreground mt-1">{player.name}</p>
                      <p className="text-sm text-muted-foreground">ID: {player.id}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => handleEdit(player)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border text-card-foreground hover:bg-secondary transition-colors text-sm font-medium"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 inline mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleClearStats(player)}
                        className="flex-1 px-3 py-2 rounded-lg border border-primary/50 text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
                        title="Clear Stats"
                      >
                        Clear Stats
                      </button>
                      <button
                        onClick={() => handleDelete(player)}
                        className="px-3 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit/Add Form View */}
      {(currentTab === 'edit' || currentTab === 'add') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-card-foreground">
              {currentTab === 'edit' && 'Edit Player'}
              {currentTab === 'add' && 'Add New Player'}
            </h2>
            <button
              onClick={() => {
                setCurrentTab('list');
                setSelectedPlayer(null);
                setFormData({ name: '', number: 0 });
                setFormErrors({});
                setError(null);
              }}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">Player Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Grace"
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground">Jersey Number *</label>
              <input
                type="number"
                min="0"
                max="99"
                value={formData.number}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, number: value }));
                  if (formErrors.number) setFormErrors(prev => ({ ...prev, number: '' }));
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0-99"
              />
              <p className="text-xs text-muted-foreground">
                Enter 0 for jersey number 0 (or 00 for the first player with number 0)
              </p>
              {formErrors.number && <p className="text-xs text-destructive">{formErrors.number}</p>}
            </div>

            {currentTab === 'edit' && selectedPlayer && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Player ID:</span> {selectedPlayer.id} (cannot be changed)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4">
            <button
              onClick={() => {
                setCurrentTab('list');
                setSelectedPlayer(null);
                setFormData({ name: '', number: 0 });
                setFormErrors({});
                setError(null);
              }}
              disabled={saving}
              type="button"
              className="px-6 py-3 rounded-xl border border-border text-card-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              type="button"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Player'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {selectedPlayer && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Delete Player"
          message={`Are you sure you want to permanently delete player #${getDisplayNumber(selectedPlayer)} ${selectedPlayer.name}? This will also delete all associated stats. This action cannot be undone.`}
          confirmText={deleting ? 'Deleting...' : 'Delete Player'}
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedPlayer(null);
          }}
        />
      )}

      {/* Clear Stats Confirmation */}
      {selectedPlayer && (
        <ConfirmationDialog
          isOpen={showClearStatsConfirm}
          title="Clear Player Stats"
          message={`Are you sure you want to permanently delete all stats for #${getDisplayNumber(selectedPlayer)} ${selectedPlayer.name}? This action cannot be undone.`}
          confirmText={clearingStats ? 'Clearing...' : 'Clear Stats'}
          cancelText="Cancel"
          onConfirm={confirmClearStats}
          onCancel={() => {
            setShowClearStatsConfirm(false);
            setSelectedPlayer(null);
          }}
          isDestructive={true}
        />
      )}
    </div>
  );
}
