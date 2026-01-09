// Primary Intent (used for most prompts; always fair for all positions)
export enum PrimaryIntent {
  FIELD = 'FIELD',
  COVER = 'COVER',
  CUTOFF = 'CUTOFF',
  BACKUP = 'BACKUP',
  HOLD = 'HOLD',
}

// Fielder Secondary Action (ONLY asked when highlighted role is the fielder)
export enum FielderAction {
  THROW_THROUGH_CUTOFF = 'THROW_THROUGH_CUTOFF',
  THROW_TO_BASE = 'THROW_TO_BASE',
  HOLD_BALL = 'HOLD_BALL',
}

// UI Label Mapping (kid/coach friendly text)
export const intentLabels: Record<PrimaryIntent | FielderAction, string> = {
  [PrimaryIntent.FIELD]: 'Field it',
  [PrimaryIntent.COVER]: 'Cover base',
  [PrimaryIntent.CUTOFF]: 'Be cutoff',
  [PrimaryIntent.BACKUP]: 'Back up',
  [PrimaryIntent.HOLD]: 'Hold / stay home',
  [FielderAction.THROW_THROUGH_CUTOFF]: 'Throw through cutoff',
  [FielderAction.THROW_TO_BASE]: 'Throw to base',
  [FielderAction.HOLD_BALL]: 'Hold the ball',
};

// Positions
export type Position = 'P' | 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF';

export const POSITIONS: Position[] = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];

// Ball Zones
export type BallZone =
  | 'LF'
  | 'LF_LINE'
  | 'LF_GAP'
  | 'CF'
  | 'RF_GAP'
  | 'RF'
  | 'RF_LINE'
  | 'INFIELD_LEFT'
  | 'INFIELD_RIGHT';

// Ball Zone Coordinates (for SVG positioning)
// Coordinates are normalized 0-1, will be scaled to viewBox
export const ballZoneCoordinates: Record<BallZone, { x: number; y: number }> = {
  LF: { x: 0.2, y: 0.7 },
  LF_LINE: { x: 0.1, y: 0.8 },
  LF_GAP: { x: 0.3, y: 0.65 },
  CF: { x: 0.5, y: 0.6 },
  RF_GAP: { x: 0.7, y: 0.65 },
  RF: { x: 0.8, y: 0.7 },
  RF_LINE: { x: 0.9, y: 0.8 },
  INFIELD_LEFT: { x: 0.3, y: 0.5 },
  INFIELD_RIGHT: { x: 0.7, y: 0.5 },
};

// Global plausible distractors (fallback when role pools are insufficient)
export const GLOBAL_PRIMARY_DISTRACTORS: PrimaryIntent[] = [
  PrimaryIntent.COVER,
  PrimaryIntent.CUTOFF,
  PrimaryIntent.BACKUP,
  PrimaryIntent.HOLD,
];

export const GLOBAL_FIELDER_ACTION_DISTRACTORS: FielderAction[] = [
  FielderAction.THROW_TO_BASE,
  FielderAction.HOLD_BALL,
];
