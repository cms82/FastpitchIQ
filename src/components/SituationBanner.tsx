import { Scenario, GameMode } from '../types';
import { formatSituation } from '../utils/formatSituation';

interface SituationBannerProps {
  scenario: Scenario;
  mode: GameMode;
  learningMode?: boolean;
}

export default function SituationBanner({ scenario, mode, learningMode }: SituationBannerProps) {
  const situationText = formatSituation(scenario);
  const modeLabel = mode === 'my_positions' ? 'Quiz - One Position' : 'Quiz - All Positions';

  return (
    <div className="situation-banner">
      <div className="situation-text">{situationText}</div>
      <div className="situation-badges">
        <span className="badge badge-mode">{modeLabel}</span>
        {learningMode && <span className="badge badge-learning">Learning</span>}
      </div>
    </div>
  );
}
