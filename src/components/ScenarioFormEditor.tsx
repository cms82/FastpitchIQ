import { useState } from 'react';
import { Scenario, RoleDefinition } from '../types';
import { Position, BallZone, PrimaryIntent, FielderAction, POSITIONS } from '../constants';
import { Save } from 'lucide-react';

interface ScenarioFormEditorProps {
  scenario: Scenario | null;
  onSave: (scenario: Scenario) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

const CATEGORIES = ['cut_relay', 'bunt', 'other'] as const;
const PRIMARY_INTENTS: PrimaryIntent[] = [
  PrimaryIntent.FIELD,
  PrimaryIntent.COVER,
  PrimaryIntent.CUTOFF,
  PrimaryIntent.BACKUP,
  PrimaryIntent.HOLD
];
const FIELDER_ACTIONS: FielderAction[] = [
  FielderAction.THROW_THROUGH_CUTOFF,
  FielderAction.THROW_TO_BASE,
  FielderAction.HOLD_BALL
];

interface ScenarioFormData {
  id: string;
  title: string;
  category: 'cut_relay' | 'bunt' | 'other';
  situation: {
    runners: { on1: boolean; on2: boolean; on3: boolean };
    ballZone: BallZone;
    goal: string;
  };
  roles: Record<Position, Partial<RoleDefinition>>;
  roleGroups: {
    ballSide: Position[];
    infieldCore: Position[];
    coverage: Position[];
    backups: Position[];
  };
  promptPlan: {
    recommendedRoles: Position[];
    difficulty: 1 | 2 | 3;
  };
}

export default function ScenarioFormEditor({ scenario, onSave, onCancel, saving = false }: ScenarioFormEditorProps) {
  const [formData, setFormData] = useState<ScenarioFormData>(() => {
    if (scenario) {
      return {
        id: scenario.id,
        title: scenario.title,
        category: scenario.category,
        situation: {
          runners: scenario.situation.runners,
          ballZone: scenario.situation.ballZone as BallZone,
          goal: scenario.situation.goal || '',
        },
        roles: scenario.roles,
        roleGroups: scenario.roleGroups,
        promptPlan: scenario.promptPlan ? {
          recommendedRoles: scenario.promptPlan.recommendedRoles || [],
          difficulty: (scenario.promptPlan.difficulty || 1) as 1 | 2 | 3,
        } : { recommendedRoles: [], difficulty: 1 },
      };
    }
    return {
      id: `scenario-${Date.now()}`,
      title: '',
      category: 'cut_relay',
      situation: {
        runners: { on1: false, on2: false, on3: false },
        ballZone: 'LF',
        goal: '',
      },
      roles: {} as Record<Position, Partial<RoleDefinition>>,
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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.id.trim()) newErrors.id = 'ID is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.situation.ballZone) newErrors.ballZone = 'Ball zone is required';

    // Validate at least one role
    const hasRoles = Object.keys(formData.roles).length > 0;
    if (!hasRoles) newErrors.roles = 'At least one role is required';

    // Validate all roles have required fields
    for (const [position, role] of Object.entries(formData.roles)) {
      if (!role.primaryIntent) {
        newErrors[`role-${position}-primaryIntent`] = `${position}: Primary intent is required`;
      }
      if (!role.explanation || role.explanation.trim() === '') {
        newErrors[`role-${position}-explanation`] = `${position}: Explanation is required`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build scenario object
    const scenarioToSave: Scenario = {
      id: formData.id.trim(),
      title: formData.title.trim(),
      category: formData.category,
      situation: {
        runners: formData.situation.runners,
        ballZone: formData.situation.ballZone,
        goal: formData.situation.goal.trim() || undefined,
      },
      roles: formData.roles as Record<Position, RoleDefinition>,
      roleGroups: formData.roleGroups,
      promptPlan: formData.promptPlan.recommendedRoles.length > 0 ? formData.promptPlan : undefined,
    };

    await onSave(scenarioToSave);
  };

  const updateRole = (position: Position, field: keyof RoleDefinition, value: any) => {
    setFormData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        [position]: {
          ...prev.roles[position],
          [field]: value,
        },
      },
    }));
    // Clear error for this field
    if (errors[`role-${position}-${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`role-${position}-${field}`];
        return newErrors;
      });
    }
  };

  const toggleDistractor = (position: Position, pool: 'distractorPoolHigh' | 'distractorPoolLow', value: PrimaryIntent) => {
    const currentPool = formData.roles[position]?.[pool] || [];
    const newPool = currentPool.includes(value)
      ? currentPool.filter((v) => v !== value)
      : [...currentPool, value];
    updateRole(position, pool, newPool);
  };

  const toggleRoleGroup = (group: 'ballSide' | 'infieldCore' | 'coverage' | 'backups', position: Position) => {
    setFormData(prev => ({
      ...prev,
      roleGroups: {
        ...prev.roleGroups,
        [group]: prev.roleGroups[group].includes(position)
          ? prev.roleGroups[group].filter((p: Position) => p !== position)
          : [...prev.roleGroups[group], position],
      },
    }));
  };

  const toggleRecommendedRole = (position: Position) => {
    setFormData(prev => ({
      ...prev,
      promptPlan: {
        ...prev.promptPlan,
        recommendedRoles: prev.promptPlan.recommendedRoles.includes(position)
          ? prev.promptPlan.recommendedRoles.filter(p => p !== position)
          : [...prev.promptPlan.recommendedRoles, position],
      },
    }));
  };

  const addStep = (position: Position) => {
    const currentSteps = formData.roles[position]?.steps || [];
    updateRole(position, 'steps', [...currentSteps, { type: 'FIELD', target: 'BALL' }]);
  };

  const updateStep = (position: Position, index: number, field: string, value: any) => {
    const currentSteps = formData.roles[position]?.steps || [];
    const newSteps = [...currentSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    updateRole(position, 'steps', newSteps);
  };

  const removeStep = (position: Position, index: number) => {
    const currentSteps = formData.roles[position]?.steps || [];
    updateRole(position, 'steps', currentSteps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-card-foreground">Basic Information</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Scenario ID *</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, id: e.target.value }));
                if (errors.id) setErrors(prev => ({ ...prev, id: '' }));
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., single-lf-no-runners"
            />
            {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Single to Left Field — No Runners"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Situation */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-card-foreground">Situation</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Runners On Base</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.situation.runners.on1}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    situation: { ...prev.situation, runners: { ...prev.situation.runners, on1: e.target.checked } }
                  }))}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-card-foreground">1st Base</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.situation.runners.on2}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    situation: { ...prev.situation, runners: { ...prev.situation.runners, on2: e.target.checked } }
                  }))}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-card-foreground">2nd Base</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.situation.runners.on3}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    situation: { ...prev.situation, runners: { ...prev.situation.runners, on3: e.target.checked } }
                  }))}
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm text-card-foreground">3rd Base</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Ball Zone *</label>
            <select
              value={formData.situation.ballZone}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                situation: { ...prev.situation, ballZone: e.target.value as BallZone }
              }))}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="LF">LF - Left Field</option>
              <option value="LF_LINE">LF_LINE - Left Field Line</option>
              <option value="LF_GAP">LF_GAP - Left Field Gap</option>
              <option value="CF">CF - Center Field</option>
              <option value="RF_GAP">RF_GAP - Right Field Gap</option>
              <option value="RF">RF - Right Field</option>
              <option value="RF_LINE">RF_LINE - Right Field Line</option>
              <option value="INFIELD_LEFT">INFIELD_LEFT - Infield Left</option>
              <option value="INFIELD_RIGHT">INFIELD_RIGHT - Infield Right</option>
            </select>
            {errors.ballZone && <p className="text-xs text-destructive">{errors.ballZone}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Goal</label>
            <input
              type="text"
              value={formData.situation.goal}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                situation: { ...prev.situation, goal: e.target.value }
              }))}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Keep the batter-runner from taking 2B"
            />
          </div>
        </div>
      </div>

      {/* Roles - Grid layout for desktop */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-card-foreground">Position Roles</h3>
          <button
            onClick={() => {
              // Add all positions as empty roles
              const newRoles = { ...formData.roles };
              POSITIONS.forEach(pos => {
                if (!newRoles[pos]) {
                  newRoles[pos] = {
                    primaryIntent: PrimaryIntent.HOLD,
                    target: '',
                    explanation: '',
                    distractorPoolHigh: [],
                    distractorPoolLow: [],
                  };
                }
              });
              setFormData(prev => ({ ...prev, roles: newRoles }));
            }}
            className="text-sm px-4 py-2 rounded-lg border border-border text-card-foreground hover:bg-secondary transition-colors"
          >
            Add All Positions
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {POSITIONS.map(position => {
          const role = formData.roles[position];
          const hasRole = !!role;

          return (
            <div key={position} className="border border-border rounded-lg p-4 space-y-3 bg-secondary/30">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasRole}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateRole(position, 'primaryIntent', PrimaryIntent.HOLD);
                        updateRole(position, 'target', '');
                        updateRole(position, 'explanation', '');
                        updateRole(position, 'distractorPoolHigh', []);
                        updateRole(position, 'distractorPoolLow', []);
                      } else {
                        const newRoles = { ...formData.roles };
                        delete newRoles[position];
                        setFormData(prev => ({ ...prev, roles: newRoles }));
                      }
                    }}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="font-semibold text-base text-card-foreground">{position}</span>
                </label>
              </div>

              {hasRole && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Primary Intent *</label>
                        <select
                          value={role.primaryIntent || PrimaryIntent.HOLD}
                          onChange={(e) => {
                            const value = e.target.value as PrimaryIntent;
                            updateRole(position, 'primaryIntent', value);
                            if (errors[`role-${position}-primaryIntent`]) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[`role-${position}-primaryIntent`];
                                return newErrors;
                              });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {PRIMARY_INTENTS.map(intent => (
                            <option key={intent} value={intent}>{intent}</option>
                          ))}
                        </select>
                        {errors[`role-${position}-primaryIntent`] && (
                          <p className="text-xs text-destructive">{errors[`role-${position}-primaryIntent`]}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Target</label>
                        <input
                          type="text"
                          value={role.target || ''}
                          onChange={(e) => updateRole(position, 'target', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="e.g., 2B, CIRCLE, HOME"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Explanation *</label>
                      <textarea
                        value={role.explanation || ''}
                        onChange={(e) => {
                          updateRole(position, 'explanation', e.target.value);
                          if (errors[`role-${position}-explanation`]) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`role-${position}-explanation`];
                              return newErrors;
                            });
                          }
                        }}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        placeholder="Describe what this position should do..."
                      />
                      {errors[`role-${position}-explanation`] && (
                        <p className="text-xs text-destructive">{errors[`role-${position}-explanation`]}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Fielder Action (Optional)</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={role.fielderAction || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateRole(position, 'fielderAction', value ? (value as FielderAction) : undefined);
                          }}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">None</option>
                          {FIELDER_ACTIONS.map(action => (
                            <option key={action} value={action}>{action}</option>
                          ))}
                        </select>
                        {role.fielderAction && (
                          <button
                            onClick={() => updateRole(position, 'fielderAction', undefined)}
                            type="button"
                            className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Steps */}
                    {role.steps && role.steps.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">Steps</label>
                          <button
                            onClick={() => addStep(position)}
                            type="button"
                            className="text-xs px-2 py-1 rounded-lg border border-border text-card-foreground hover:bg-secondary"
                          >
                            + Add Step
                          </button>
                        </div>
                        {role.steps.map((step, idx) => (
                          <div key={idx} className="grid grid-cols-5 gap-2 p-2 bg-secondary/50 rounded-lg border border-border">
                            <input
                              type="text"
                              value={step.type || ''}
                              onChange={(e) => updateStep(position, idx, 'type', e.target.value)}
                              placeholder="Type"
                              className="px-2 py-1.5 text-xs rounded border border-border bg-background text-card-foreground"
                            />
                            <input
                              type="text"
                              value={step.target || ''}
                              onChange={(e) => updateStep(position, idx, 'target', e.target.value)}
                              placeholder="Target"
                              className="px-2 py-1.5 text-xs rounded border border-border bg-background text-card-foreground"
                            />
                            <input
                              type="text"
                              value={step.via || ''}
                              onChange={(e) => updateStep(position, idx, 'via', e.target.value)}
                              placeholder="Via"
                              className="px-2 py-1.5 text-xs rounded border border-border bg-background text-card-foreground"
                            />
                            <input
                              type="text"
                              value={step.style || ''}
                              onChange={(e) => updateStep(position, idx, 'style', e.target.value)}
                              placeholder="Style"
                              className="px-2 py-1.5 text-xs rounded border border-border bg-background text-card-foreground"
                            />
                            <button
                              onClick={() => removeStep(position, idx)}
                              type="button"
                              className="px-2 py-1.5 text-xs rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10"
                            >
                              × Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!role.steps || role.steps.length === 0) && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Steps (Optional)</label>
                        <button
                          onClick={() => addStep(position)}
                          type="button"
                          className="w-full text-xs px-3 py-2 rounded-lg border border-border text-card-foreground hover:bg-secondary"
                        >
                          + Add Step
                        </button>
                      </div>
                    )}

                    {/* Distractors */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">High Priority Distractors</label>
                        <div className="flex flex-wrap gap-2">
                          {PRIMARY_INTENTS.filter(intent => intent !== role.primaryIntent).map(intent => {
                            const pool = role.distractorPoolHigh || [];
                            const isSelected = pool.includes(intent);
                            return (
                              <button
                                key={intent}
                                type="button"
                                onClick={() => toggleDistractor(position, 'distractorPoolHigh', intent)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-card-foreground hover:bg-secondary'
                                }`}
                              >
                                {intent}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Low Priority Distractors</label>
                        <div className="flex flex-wrap gap-2">
                          {PRIMARY_INTENTS.filter(intent => intent !== role.primaryIntent).map(intent => {
                            const pool = role.distractorPoolLow || [];
                            const isSelected = pool.includes(intent);
                            return (
                              <button
                                key={intent}
                                type="button"
                                onClick={() => toggleDistractor(position, 'distractorPoolLow', intent)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-card-foreground hover:bg-secondary'
                                }`}
                              >
                                {intent}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
        {errors.roles && <p className="text-sm text-destructive mt-2">{errors.roles}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Groups */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-card-foreground">Role Groups</h3>
          
          {(['ballSide', 'infieldCore', 'coverage', 'backups'] as const).map((group: 'ballSide' | 'infieldCore' | 'coverage' | 'backups') => (
            <div key={group} className="space-y-2">
              <label className="text-sm font-medium text-card-foreground capitalize">{group.replace(/([A-Z])/g, ' $1').trim()}</label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map(position => (
                  <button
                    key={position}
                    type="button"
                    onClick={() => toggleRoleGroup(group, position)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors font-medium ${
                      formData.roleGroups[group].includes(position)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-card-foreground hover:bg-secondary'
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Prompt Plan */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-card-foreground">Prompt Plan</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Recommended Roles</label>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map(position => (
                <button
                  key={position}
                  type="button"
                  onClick={() => toggleRecommendedRole(position)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors font-medium ${
                    formData.promptPlan.recommendedRoles.includes(position)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-card-foreground hover:bg-secondary'
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">Difficulty</label>
            <select
              value={formData.promptPlan.difficulty}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                promptPlan: { ...prev.promptPlan, difficulty: parseInt(e.target.value) as 1 | 2 | 3 }
              }))}
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={1}>1 - Easy</option>
              <option value={2}>2 - Medium</option>
              <option value={3}>3 - Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 sticky bottom-0 bg-background pt-6 pb-4 border-t border-border mt-6">
        <button
          onClick={onCancel}
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
          {saving ? 'Saving...' : 'Save Scenario'}
        </button>
      </div>
    </div>
  );
}
