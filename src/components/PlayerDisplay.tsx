import { getPlayerId } from '../utils/localStorage';
import { PLAYERS } from '../config/players';
import { User } from 'lucide-react';

export default function PlayerDisplay() {
  const playerId = getPlayerId();
  
  if (!playerId) {
    return null;
  }

  const player = PLAYERS.find(p => p.id === playerId);
  
  if (!player) {
    return null;
  }

  const displayNumber = player.number === 0 && player.id === 1 ? '00' : player.number === 0 ? '0' : player.number.toString();

  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <User className="w-4 h-4" />
      <span className="text-sm font-medium">
        #{displayNumber} {player.name}
      </span>
    </div>
  );
}
