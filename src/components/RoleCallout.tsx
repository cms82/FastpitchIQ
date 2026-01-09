import { Position, QuestionType } from '../types';

interface RoleCalloutProps {
  role: Position;
  questionType: QuestionType;
}

export default function RoleCallout({ role, questionType }: RoleCalloutProps) {
  return (
    <div className="role-callout">
      <span className="role-callout-label">You are</span>
      <span className="role-callout-position">{role}</span>
      {questionType === 'fielderAction' && (
        <span className="role-callout-hint">Throw decision</span>
      )}
    </div>
  );
}
