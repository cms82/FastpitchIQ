import { useState, useEffect } from 'react';
import { Scenario } from '../types';
import { fetchScenarios, createScenario, updateScenario, deleteScenario } from '../utils/scenarios';
import { loadScenarios } from '../utils/scenarioEngine';
import { Edit2, Trash2, Plus, X, Save } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';
import ScenarioFormEditor from './ScenarioFormEditor';

type Tab = 'list' | 'edit' | 'add';
type ViewMode = 'form' | 'json';

export default function AdminScenarioManager() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>('list');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [jsonEditor, setJsonEditor] = useState<string>('');

  // Load scenarios on mount
  useEffect(() => {
    loadAllScenarios();
  }, []);

  const loadAllScenarios = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load from static JSON (always available)
      const staticScenarios = loadScenarios();
      
      // Try to load from KV (may be empty in dev)
      const kvScenarios = await fetchScenarios();
      
      // Merge: KV scenarios take precedence (by ID), then static
      const scenarioMap = new Map<string, Scenario>();
      
      // Add static scenarios first
      staticScenarios.forEach(s => scenarioMap.set(s.id, s));
      
      // Override with KV scenarios if they exist
      kvScenarios.forEach(s => scenarioMap.set(s.id, s));
      
      setScenarios(Array.from(scenarioMap.values()));
    } catch (err) {
      console.error('Error loading scenarios:', err);
      setError('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setJsonError(null);
    setJsonEditor(JSON.stringify(scenario, null, 2));
    setViewMode('form');
    setCurrentTab('edit');
  };

  const handleAdd = () => {
    setSelectedScenario(null);
    setJsonError(null);
    setJsonEditor('');
    setViewMode('form');
    setCurrentTab('add');
  };

  const handleSaveFromForm = async (scenario: Scenario) => {
    setJsonError(null);
    setSaving(true);
    
    try {
      // Save to KV
      if (selectedScenario) {
        // Update existing
        await updateScenario(scenario);
      } else {
        // Create new
        await createScenario(scenario);
      }
      
      // Reload scenarios
      await loadAllScenarios();
      
      // Go back to list
      setCurrentTab('list');
      setSelectedScenario(null);
      setJsonEditor('');
      setViewMode('form');
    } catch (err: any) {
      console.error('Error saving scenario:', err);
      setJsonError(err.message || 'Failed to save scenario.');
      throw err; // Re-throw to let form handle it
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFromJson = async () => {
    setJsonError(null);
    setSaving(true);
    
    try {
      // Parse JSON
      let scenario: Scenario;
      try {
        scenario = JSON.parse(jsonEditor);
      } catch (e) {
        setJsonError('Invalid JSON format. Please check your JSON syntax.');
        setSaving(false);
        return;
      }
      
      // Basic validation
      if (!scenario.id || !scenario.title || !scenario.category) {
        setJsonError('Missing required fields: id, title, category');
        setSaving(false);
        return;
      }
      
      // Save to KV
      if (selectedScenario) {
        // Update existing - ensure ID matches
        if (scenario.id !== selectedScenario.id) {
          setJsonError(`Scenario ID cannot be changed. Expected "${selectedScenario.id}", got "${scenario.id}".`);
          setSaving(false);
          return;
        }
        await updateScenario(scenario);
      } else {
        // Create new
        await createScenario(scenario);
      }
      
      // Reload scenarios
      await loadAllScenarios();
      
      // Go back to list
      setCurrentTab('list');
      setSelectedScenario(null);
      setJsonEditor('');
      setViewMode('form');
    } catch (err: any) {
      console.error('Error saving scenario:', err);
      setJsonError(err.message || 'Failed to save scenario.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedScenario) return;
    
    setDeleting(true);
    try {
      await deleteScenario(selectedScenario.id);
      await loadAllScenarios();
      setShowDeleteConfirm(false);
      setSelectedScenario(null);
      if (currentTab !== 'list') {
        setCurrentTab('list');
      }
    } catch (err: any) {
      console.error('Error deleting scenario:', err);
      setError(err.message || 'Failed to delete scenario');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && scenarios.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading scenarios...</p>
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
            <h2 className="text-2xl font-semibold text-card-foreground">Scenarios ({scenarios.length})</h2>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              Add New Scenario
            </button>
          </div>

          {scenarios.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground text-lg">No scenarios found. Click "Add New Scenario" to create one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg text-card-foreground mb-1">{scenario.title}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><span className="font-medium">ID:</span> {scenario.id}</p>
                        <p><span className="font-medium">Category:</span> {scenario.category}</p>
                        <p><span className="font-medium">Ball Zone:</span> {scenario.situation.ballZone}</p>
                        <p><span className="font-medium">Runners:</span> {
                          [scenario.situation.runners.on1 && '1st', scenario.situation.runners.on2 && '2nd', scenario.situation.runners.on3 && '3rd']
                            .filter(Boolean).join(', ') || 'None'
                        }</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      <button
                        onClick={() => handleEdit(scenario)}
                        className="flex-1 px-3 py-2 rounded-lg border border-border text-card-foreground hover:bg-secondary transition-colors text-sm font-medium"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 inline mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(scenario)}
                        className="px-3 py-2 rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 inline mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit View - Form or JSON with Toggle */}
      {currentTab === 'edit' && selectedScenario && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-card-foreground">Edit Scenario</h2>
            <div className="flex items-center gap-2">
              {/* Toggle between Form and JSON for Edit */}
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
                <button
                  onClick={() => {
                    setViewMode('form');
                    setJsonError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'form'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-card-foreground'
                  }`}
                >
                  Form
                </button>
                <button
                  onClick={() => {
                    setViewMode('json');
                    setJsonError(null);
                    // If switching to JSON, ensure editor has current scenario
                    if (!jsonEditor.trim() || jsonEditor !== JSON.stringify(selectedScenario, null, 2)) {
                      setJsonEditor(JSON.stringify(selectedScenario, null, 2));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'json'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-card-foreground'
                  }`}
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => {
                  setCurrentTab('list');
                  setSelectedScenario(null);
                  setJsonError(null);
                  setJsonEditor('');
                  setViewMode('form');
                }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {jsonError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
              {jsonError}
            </div>
          )}

          {viewMode === 'form' ? (
            <ScenarioFormEditor
              scenario={selectedScenario}
              onSave={handleSaveFromForm}
              onCancel={() => {
                setCurrentTab('list');
                setSelectedScenario(null);
                setJsonError(null);
                setJsonEditor('');
                setViewMode('form');
              }}
              saving={saving}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Scenario JSON *</label>
                  <textarea
                    value={jsonEditor}
                    onChange={(e) => {
                      setJsonEditor(e.target.value);
                      if (jsonError) setJsonError(null);
                    }}
                    className="w-full h-96 p-4 rounded-lg border border-border bg-background text-card-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Edit scenario JSON here..."
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Edit the scenario JSON. Note: The scenario ID cannot be changed. All fields (id, title, category, situation, roles, roleGroups, promptPlan) are required.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4">
                <button
                  onClick={() => {
                    setCurrentTab('list');
                    setSelectedScenario(null);
                    setJsonError(null);
                    setJsonEditor('');
                    setViewMode('form');
                  }}
                  disabled={saving}
                  type="button"
                  className="px-6 py-3 rounded-xl border border-border text-card-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFromJson}
                  disabled={saving || !jsonEditor.trim()}
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Scenario'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add View - Form or JSON with Toggle */}
      {currentTab === 'add' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-card-foreground">Add New Scenario</h2>
            <div className="flex items-center gap-2">
              {/* Toggle between Form and JSON for Add */}
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
                <button
                  onClick={() => {
                    setViewMode('form');
                    setJsonError(null);
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'form'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-card-foreground'
                  }`}
                >
                  Form
                </button>
                <button
                  onClick={() => {
                    setViewMode('json');
                    setJsonError(null);
                    // If switching to JSON and editor is empty, create a template
                    if (!jsonEditor.trim()) {
                      const template: Scenario = {
                        id: `new-scenario-${Date.now()}`,
                        title: 'New Scenario Title',
                        category: 'cut_relay',
                        situation: {
                          runners: { on1: false, on2: false, on3: false },
                          ballZone: 'LF',
                          goal: '',
                        },
                        roles: {} as Record<string, any>,
                        roleGroups: {
                          ballSide: [],
                          infieldCore: [],
                          coverage: [],
                          backups: [],
                        },
                        promptPlan: {
                          recommendedRoles: [],
                          difficulty: 1,
                        },
                      };
                      setJsonEditor(JSON.stringify(template, null, 2));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'json'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-card-foreground'
                  }`}
                >
                  JSON
                </button>
              </div>
              <button
                onClick={() => {
                  setCurrentTab('list');
                  setSelectedScenario(null);
                  setJsonError(null);
                  setJsonEditor('');
                  setViewMode('form');
                }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {jsonError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
              {jsonError}
            </div>
          )}

          {viewMode === 'form' ? (
            <ScenarioFormEditor
              scenario={null}
              onSave={handleSaveFromForm}
              onCancel={() => {
                setCurrentTab('list');
                setSelectedScenario(null);
                setJsonError(null);
                setJsonEditor('');
                setViewMode('form');
              }}
              saving={saving}
            />
          ) : (
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Scenario JSON *</label>
                  <textarea
                    value={jsonEditor}
                    onChange={(e) => {
                      setJsonEditor(e.target.value);
                      if (jsonError) setJsonError(null);
                    }}
                    className="w-full h-96 p-4 rounded-lg border border-border bg-background text-card-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Paste or type scenario JSON here..."
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a complete scenario JSON object. All fields (id, title, category, situation, roles, roleGroups, promptPlan) are required.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-4">
                <button
                  onClick={() => {
                    setCurrentTab('list');
                    setSelectedScenario(null);
                    setJsonError(null);
                    setJsonEditor('');
                    setViewMode('form');
                  }}
                  disabled={saving}
                  type="button"
                  className="px-6 py-3 rounded-xl border border-border text-card-foreground font-medium hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFromJson}
                  disabled={saving || !jsonEditor.trim()}
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Scenario'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {selectedScenario && (
        <ConfirmationDialog
          isOpen={showDeleteConfirm}
          title="Delete Scenario"
          message={`Are you sure you want to permanently delete "${selectedScenario.title}"? This action cannot be undone.`}
          confirmText={deleting ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedScenario(null);
          }}
        />
      )}
    </div>
  );
}
