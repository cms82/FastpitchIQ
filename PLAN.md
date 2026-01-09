---
name: FastpitchIQ MVP Implementation
overview: Build a mobile-first browser app for fastpitch defensive training with two game modes (My Positions, Whole Field), JSON-driven scenarios, randomized multiple-choice prompts, and localStorage-based progress tracking.
todos:
  - id: setup
    content: Initialize Vite + React + TypeScript project
    status: pending
  - id: types
    content: Define TypeScript types (Scenario, RoleDefinition, GameMode, etc.) and constants (two-layer intent model: PrimaryIntent + FielderAction, positions, ballZones)
    status: pending
    dependencies:
      - setup
  - id: content
    content: Create scenarios.json with at least one complete scenario (Single to LF - No Runners) using new schema (primaryIntent, optional fielderAction, roleGroups, distractorPoolHigh/Low)
    status: pending
    dependencies:
      - types
  - id: storage
    content: Implement localStorage utilities for stats persistence and position preferences
    status: pending
    dependencies:
      - types
  - id: engine
    content: Build scenario engine, prompt generator (both modes with roleGroups coverage), and answer generator with anti-memorization algorithm
    status: pending
    dependencies:
      - content
      - storage
  - id: field
    content: Create SVG Field component with positions, runners, and ball visualization
    status: pending
    dependencies:
      - types
  - id: game
    content: Build GameScreen with timer, answer buttons, feedback overlay, and game loop logic (supporting primary vs fielder secondary question types)
    status: pending
    dependencies:
      - field
      - engine
  - id: screens
    content: Implement HomeScreen, SetupScreen, and ProgressScreen with routing
    status: pending
    dependencies:
      - storage
      - game
  - id: weakspots
    content: Add 'Practice Weak Spots' feature that prioritizes missed roles/intents
    status: pending
    dependencies:
      - screens
  - id: styling
    content: Apply mobile-first styling with large touch targets and responsive design
    status: pending
    dependencies:
      - screens
  - id: pwa
    content: (Optional) Configure PWA manifest and icons for "Add to Home Screen" experience
    status: pending
    dependencies:
      - setup
  - id: readme
    content: Write README with setup instructions, scenario extension guide (new schema), and architecture notes
    status: pending
    dependencies:
      - screens
---

# FastpitchIQ MVP Implementation Plan

## Architecture Overview

The app will be a single-page React + TypeScript application using Vite, with a simple router for navigation. Content is JSON-driven for easy extensibility. State and progress are stored in localStorage.

### Tech Stack

- **Vite** + React 18 + TypeScript
- **React Router** (lightweight routing)
- **SVG** for field visualization
- **localStorage** for persistence
- **PWA manifest** (optional, for "Add to Home Screen" only; no service worker)

## Project Structure

```
FastpitchIQ/
├── public/
│   ├── manifest.json (optional, for PWA)
│   └── icons/ (optional PWA icons)
├── src/
│   ├── content/
│   │   └── scenarios.json (extensible scenario data)
│   ├── types/
│   │   └── index.ts (all TypeScript types)
│   ├── constants/
│   │   └── index.ts (intents, positions, ballZones)
│   ├── utils/
│   │   ├── localStorage.ts (stats persistence)
│   │   ├── scenarioEngine.ts (scenario selection)
│   │   ├── promptGenerator.ts (role selection logic)
│   │   └── answerGenerator.ts (randomized answers)
│   ├── components/
│   │   ├── Field.tsx (SVG field diagram)
│   │   ├── GameScreen.tsx (main drill interface)
│   │   ├── HomeScreen.tsx
│   │   ├── SetupScreen.tsx
│   │   ├── ProgressScreen.tsx
│   │   ├── AnswerButtons.tsx
│   │   ├── Timer.tsx
│   │   └── FeedbackOverlay.tsx
│   ├── hooks/
│   │   ├── useGameState.ts (game loop state)
│   │   └── useStats.ts (stats management)
│   ├── App.tsx (router + main app)
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## Implementation Details

### 1. Core Types & Constants (`src/types/index.ts`, `src/constants/index.ts`)

**Two-Layer Intent Model** (prevents "gotcha" questions for non-fielders):

**A) Primary Intent** (used for most prompts; always fair for all positions):
- `FIELD` - Field the ball
- `COVER` - Cover a base
- `CUTOFF` - Become the cutoff player
- `BACKUP` - Back up a throw or position
- `HOLD` - Stay in current position

**B) Fielder Secondary Action** (ONLY asked when highlighted role is the fielder):
- `THROW_THROUGH_CUTOFF` - Throw through cutoff to target
- `THROW_TO_BASE` - Throw directly to a base
- `HOLD_BALL` - Hold the ball (no throw)

**Implementation Rule**: For non-fielders, never ask throw-type questions. Only ask primary responsibility. For fielders, ask primary responsibility first (FIELD), then optionally a second prompt about throw type (secondary action) depending on difficulty.

**UI Label Mapping** (kid/coach friendly text):
- Keep enums in code/data as PrimaryIntent + FielderAction
- Add `intentLabels` constants mapping for display:
  - FIELD → "Field it"
  - COVER → "Cover base"
  - CUTOFF → "Be cutoff"
  - BACKUP → "Back up"
  - HOLD → "Hold / stay home"
  - THROW_THROUGH_CUTOFF → "Throw through cutoff"
  - THROW_TO_BASE → "Throw to base"
  - HOLD_BALL → "Hold the ball"
- All multiple-choice buttons use these labels, not raw enum names

**Positions**: `P`, `C`, `1B`, `2B`, `SS`, `3B`, `LF`, `CF`, `RF`

**Ball Zones**: `LF`, `LF_LINE`, `LF_GAP`, `CF`, `RF_GAP`, `RF`, `RF_LINE`, `INFIELD_LEFT`, `INFIELD_RIGHT`, etc.

**Type Definitions**:

- `Scenario` - id, title, category, situation (runners, ballZone), roles (dict), roleGroups (dict), promptPlan
- `RoleDefinition` - primaryIntent, fielderAction (optional; only for roles that field the ball), target (optional; used only for feedback), explanation (one sentence), distractorPoolHigh, distractorPoolLow
- `RoleGroups` - ballSide (array), infieldCore (array), coverage (array), backups (array)
- `GameMode` - "my_positions" | "whole_field"
- `GameState` - current scenario, prompt index, selected role, questionType (primary | fielderAction), timer, etc.
- `AnswerOption` - union type: PrimaryIntent | FielderAction

### 2. Content System (`src/content/scenarios.json`)

JSON structure matching the content model. Implement at minimum:

- "Single to Left Field — No Runners" scenario with all 9 positions defined
- Each role includes:
  - `primaryIntent` (required)
  - `fielderAction` (optional; only for roles that field the ball, e.g., LF)
  - `target` (optional; used only for feedback text)
  - `explanation` (one sentence max)
  - `distractorPoolHigh` (array of plausible primary intents or fielder actions)
  - `distractorPoolLow` (array of less plausible but still softball-related options)
- `roleGroups` object defining:
  - `ballSide`: ["LF","CF"] (fielders on ball side)
  - `infieldCore`: ["SS","2B"] (primary cutoff/base coverage)
  - `coverage`: ["1B","3B"] (base coverage)
  - `backups`: ["RF","P","C"] (backup roles)

**JSON Validation** (at load time):
- Validate each scenario has:
  - `id`, `title`, `category`, `situation.runners`, `situation.ballZone`
  - `roles` for all positions it references
  - `roleGroups` includes `ballSide`, `infieldCore`, `coverage`, `backups` (arrays; can be empty but must exist)
  - Primary intent questions: require at least 3 distractors available (high+low combined), else fallback to global plausible list
  - FielderAction questions: require at least 2 distractors available (high+low combined), else fallback to global plausible list
- Validate `ballZone` exists in central `ballZoneCoordinates` map (constants)
- If validation fails:
  - In dev: throw with clear error message listing `scenarioId` and missing fields
  - In prod: show simple "Content error" screen (no crash loop)

**Example for "Single to Left Field — No Runners"**:
- SS: primaryIntent = `CUTOFF`, target = "2B", distractorPoolHigh = ["COVER", "BACKUP", "HOLD"]
- 2B: primaryIntent = `COVER`, target = "2B", distractorPoolHigh = ["CUTOFF", "BACKUP", "HOLD"]
- LF: primaryIntent = `FIELD`, fielderAction = `THROW_THROUGH_CUTOFF`, target = "SS/2B"
  - Primary distractors: distractorPoolHigh = ["COVER", "BACKUP", "HOLD"]
  - FielderAction distractors: distractorPoolHigh = ["THROW_TO_BASE", "HOLD_BALL"] (only 2 expected; fallback to global plausible list if needed)

### 3. Scenario Engine (`src/utils/scenarioEngine.ts`)

- Load scenarios from JSON
- Run validation (see Content System section) before accepting scenarios
- Random selection (later: filter by category)
- Track scenario usage stats

### 4. Prompt Generator (`src/utils/promptGenerator.ts`)

**My Positions Mode**:

- Weighted selection: 80% primary, 20% secondary
- Only select roles that exist in current scenario
- Skip if role not present
- **Round invariant: A round is ALWAYS exactly 6 prompts**
- For fielders, may include a fielder secondary prompt (fielderAction question) which REPLACES one of the 6 prompts (does not add an extra prompt)
- MVP constraint: At most 1 fielder secondary prompt per round (configurable later)

**Whole Field Mode** (ensures "running the play" feel):

- Each round of 6 prompts must include minimum coverage:
  - At least 1 role from `roleGroups.ballSide`
  - At least 1 role from `roleGroups.infieldCore`
  - At least 1 role from `roleGroups.coverage`
  - Remaining prompts chosen using least-recently-asked algorithm
- After satisfying minimum group coverage, apply existing coverage algorithm:
  - Use `lastAskedAt` from localStorage
  - Boost positions in `scenario.promptPlan.recommendedRoles`
  - Prefer least-recently-asked positions
- **Soft constraint for backup roles**:
  - After satisfying the hard minimums (ballSide, infieldCore, coverage), attempt to include 1 role from `roleGroups.backups` in most rounds when available
  - This is a soft constraint (target ~70% of rounds)
  - Do not violate the 6-prompt invariant
  - Do not force repetition if backup roles were recently asked
- **Round invariant: A round is ALWAYS exactly 6 prompts**
- For fielders selected, may include a fielder secondary prompt (fielderAction question) which REPLACES one of the 6 prompts (does not add an extra prompt)
- MVP constraint: At most 1 fielder secondary prompt per round (configurable later)

### 5. Answer Generator (`src/utils/answerGenerator.ts`)

**Concrete Anti-Memorization Algorithm**:

**A) Always shuffle answer order every prompt** (Fisher-Yates or similar).

**B) Enforce "no repeated pattern" constraints**:
- Track `lastCorrectIndexHistory` (last 5 correct option indices) in memory for current round
- When generating options, if correct option would appear in same button index too frequently (e.g., 3+ out of last 5), reshuffle until distribution is acceptable
- Cap reshuffle attempts (e.g., max 10) to avoid infinite loops

**C) Prevent repeating exact same option set**:
- Maintain `lastOptionsSignature` per `(scenarioId, role, questionType)` in memory
- Signature = `${questionType}:${scenarioId}:${role}:${sortedOptionIds.join(",")}:${correctOptionId}`
  - Note: Signature represents the option SET, not button layout (no index/position)
  - `sortedOptionIds` are drawn from the correct enum for that questionType (PrimaryIntent for "primary", FielderAction for "fielderAction")
  - Keep correct-index distribution rule (part B) separate from signature matching
- If signature matches last signature for same (scenarioId, role, questionType), swap at least one distractor (or reshuffle if swap not possible)

**D) Plausible, difficulty-driven distractors**:
- Use `distractorPoolHigh` (most plausible) and `distractorPoolLow` (less plausible)
- Difficulty levels:
  - Easy: 2 high + 1 low distractors
  - Normal: 3 high distractors (MVP default)
  - Hard: 3 high distractors + shorter timer (optional later)
- Never include "silly" distractors unrelated to softball defensive context
- **Uniqueness and correctness constraints (hard requirements)**:
  - Never include the correct optionId as a distractor
  - Never include duplicate optionIds in the 4 answer choices
  - When falling back to a global plausible list, still enforce:
    - uniqueness of optionIds
    - exclusion of the correct optionId
  - The final answer set must always contain exactly 4 unique optionIds

**E) Question Type Handling**:
- For questionType = "primary": all optionIds must be PrimaryIntent values only
- For questionType = "fielderAction": all optionIds must be FielderAction values only
- Never mix PrimaryIntent + FielderAction in a single question's options set
- For primary intent questions: use PrimaryIntent enum options
- For fielderAction questions: use FielderAction enum options (only shown for fielders)

### 6. Field Component (`src/components/Field.tsx`)

- SVG diamond with outfield arc
- Position dots at approximate locations
- Runner circles on bases (from scenario.situation.runners)
- Ball icon positioned by `ballZone` (mapped to x,y coordinates)
- Optional: arrow line for feedback (Phase 1.1, can skip for MVP)
- Responsive scaling

### 7. Game Screen (`src/components/GameScreen.tsx`)

**Game Loop**:

1. Load scenario
2. Generate prompt sequence (exactly 6 prompts; fielder secondary prompts replace one of the 6, not added)
3. For each prompt:

   - Highlight role with pulsing ring
   - Show "You are <ROLE>" text
   - Show question type context if needed (primary responsibility vs throw decision)
   - Start 2.5s timer
   - Show 4 answer buttons (randomized, using anti-memorization algorithm)
   - On answer or timeout: show feedback (1-1.5s freeze)
   - Auto-advance to next prompt

4. End-of-round summary

**State Management**:

- Use `useGameState` hook for game loop
- Track: current prompt index, selected answer, timer state, round stats

### 8. Stats & Persistence (`src/utils/localStorage.ts`, `src/hooks/useStats.ts`)

**Store**:

- `selectedPrimaryPosition`, `selectedSecondaryPosition`
- Per-position: `attempts`, `correct`, `avgTimeMs`, `lastAskedAt`
- Per-scenario: `attempts`, `correct`
- Overall: `totalAttempts`, `totalCorrect`, `bestStreak`

**Weak Spots Calculation**:

- Track missed role+intent combinations (including questionType: primary vs fielderAction)
- Sort by frequency, return top 1-3
- Used for "Practice Weak Spots" feature

### 9. UI Screens

**HomeScreen** (`src/components/HomeScreen.tsx`):

- Large buttons: "My Positions", "Whole Field", "Progress"
- Check if positions are set, redirect to Setup if needed

**SetupScreen** (`src/components/SetupScreen.tsx`):

- Primary position selector (button grid or dropdown)
- Secondary position selector
- Save to localStorage

**ProgressScreen** (`src/components/ProgressScreen.tsx`):

- Overall stats (accuracy, avg response time)
- Per-position stats table/cards
- Weak spots list
- "Practice Weak Spots" button (starts round prioritizing missed roles/intents)

### 10. Styling

- Mobile-first CSS (or CSS-in-JS)
- Large touch targets (min 44x44px, prefer 60x60px+)
- Minimal text, clear hierarchy
- Responsive for iPhone, Android, iPad
- Fast transitions, no lag

### 11. PWA Setup (Optional)

- `public/manifest.json` with app name, icons, theme colors
- Icons: 192x192, 512x512 minimum
- `index.html` includes manifest link (if PWA enabled)
- Test installability on iOS/Android
- **Note**: This is a browser-delivered app. PWA manifest is only for optional "Add to Home Screen" experience. No service worker required for MVP.

### 12. Router (`src/App.tsx`)

Simple React Router setup:

- `/` - Home
- `/setup` - Position selection
- `/game/:mode` - Game screen
- `/progress` - Stats screen

## Key Implementation Notes

1. **Two-Layer Question Types**: 
   - Primary responsibility questions (FIELD, COVER, CUTOFF, BACKUP, HOLD) are asked for all positions
   - Fielder secondary action questions (THROW_THROUGH_CUTOFF, THROW_TO_BASE, HOLD_BALL) are ONLY asked when the highlighted role is the fielder
   - This prevents "gotcha" questions for non-fielders and builds trust

2. **Anti-Memorization Algorithm**:
   - Always shuffle answer order every prompt
   - Track last 5 correct indices; prevent correct option appearing in same position too frequently (3+ out of last 5)
   - Prevent exact same 4-option set for same (scenarioId, role, questionType) back-to-back using signature matching
   - Use difficulty-driven distractor pools (High/Low plausibility)
   - Never include silly distractors unrelated to softball defense

3. **Whole Field RoleGroups Coverage**:
   - Each round must include at least 1 role from ballSide, infieldCore, and coverage groups
   - Remaining prompts use least-recently-asked algorithm with recommendedRoles boost
   - Ensures "running the play" feel rather than random role selection

4. **Feedback Format**: "Correct: <Intent Label> (to <target>)." + one-sentence explanation.

5. **Timer**: 2.5 seconds. On timeout, mark incorrect and show correct answer immediately.

6. **Extensibility**: Adding new scenarios = add JSON entry with new schema (primaryIntent, optional fielderAction, roleGroups, distractorPoolHigh/Low). No code changes needed.

## MVP Deliverables

- [ ] Working app with both game modes
- [ ] At least 1 complete scenario JSON (using new schema with primaryIntent, optional fielderAction, roleGroups, distractorPoolHigh/Low)
- [ ] All UI screens functional
- [ ] Stats tracking and persistence
- [ ] Two-layer intent model implemented (primary vs fielder secondary questions)
- [ ] Anti-memorization algorithm with distribution tracking and signature prevention
- [ ] Whole Field mode with roleGroups minimum coverage
- [ ] README with setup and extension instructions (including new schema)
- [ ] "Practice Weak Spots" feature
- [ ] PWA manifest (optional, for "Add to Home Screen")

## Testing Considerations

- Test on iPhone Safari (iOS 14+)
- Test on Android Chrome
- Test on iPad (scaling)
- Verify localStorage persistence
- Verify answer randomization (test anti-memorization: no repeated patterns, no back-to-back same sets)
- Verify timer behavior
- Verify two-layer question types (non-fielders never see throw questions)
- Verify Whole Field roleGroups coverage (each round has ballSide, infieldCore, coverage)
