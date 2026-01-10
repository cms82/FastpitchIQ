# Leaderboard Design Proposal

## Current Issues
1. **No mode separation**: Stats are aggregated for both "One Position" and "All Positions" modes
2. **Unfair ranking**: One round at 100% can rank higher than 100 rounds at 95%
3. **No minimum threshold**: Players with very few rounds appear in rankings

## Proposed Solution

### 1. Separate Stats by Mode
Store stats separately in KV:
- `player:{id}:one_position` - Stats for "Compete - One Position"
- `player:{id}:all_positions` - Stats for "Compete - All Positions"

### 2. Ranking Algorithm (Confidence-Adjusted Score)

Use a **Bayesian Ranking** approach that factors in sample size:

```
Score = (correct + minAttempts × globalAvg) / (totalAttempts + minAttempts)
```

Where:
- `minAttempts` = minimum threshold (e.g., 5 rounds)
- `globalAvg` = average accuracy across all players (used as "prior")

This ensures:
- Players need at least 5 rounds to be ranked fairly
- 1 round at 100% gets pulled toward the average
- 100 rounds at 95% is ranked higher than 1 round at 100%
- More attempts = more confidence in the score

### 3. Ranking Sort Order
1. **Primary**: Confidence-adjusted score (descending)
2. **Secondary**: Total attempts (descending) - for tie-breaking
3. **Tertiary**: Best streak (descending) - for further tie-breaking

### 4. UI Options

**Option A: Separate Tabs** (Recommended)
- Tab 1: "One Position Leaderboard"
- Tab 2: "All Positions Leaderboard"
- Each shows its own ranking

**Option B: Mode Selector**
- Dropdown to switch between "One Position" and "All Positions"
- Single leaderboard view that changes based on selection

**Option C: Combined View**
- Show both rankings side-by-side or stacked
- More complex but shows full picture

### 5. Minimum Rounds Requirement

Require minimum rounds (e.g., 5) before showing in leaderboard:
- Players below threshold: "Complete 5 rounds to appear on leaderboard"
- Prevents premature ranking

### 6. Additional Stats to Track

For each mode, track:
- `totalRounds` - Number of completed rounds (6 prompts each)
- `totalAttempts` - Total individual prompt attempts
- `totalCorrect` - Total correct answers
- `totalTime` - Total time across all rounds
- `bestStreak` - Best consecutive correct streak
- `bestRoundAccuracy` - Best single-round accuracy

## Implementation Steps

1. **Update data model** to separate by mode
2. **Update sync function** to accept mode parameter
3. **Update ranking algorithm** with confidence-adjusted scoring
4. **Add minimum rounds threshold**
5. **Update UI** to show separate leaderboards or mode selector
6. **Migration**: Convert existing aggregated stats to mode-specific (distribute proportionally or default to "all_positions")

## Example Ranking Calculation

**Player A**: 1 round, 6/6 correct (100%)
- Score = (6 + 5 × 0.70) / (6 + 5) = 9.5 / 11 = 86.4%

**Player B**: 100 rounds, 570/600 correct (95%)
- Score = (570 + 5 × 0.70) / (600 + 5) = 573.5 / 605 = 94.8%

**Player B ranks higher** despite lower raw accuracy because of sample size!
