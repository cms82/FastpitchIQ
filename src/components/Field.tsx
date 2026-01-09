import { Scenario, Position } from '../types';
import { useState, useEffect } from 'react';

interface FieldProps {
  scenario: Scenario;
  highlightedRole?: Position | null;
  showFeedback?: {
    role: Position;
    target?: string;
  } | null;
}

// Position coordinates matching the SVG viewBox (24.654 81.888 480.692 413.582)
// Based on the SVG field layout - using exact coordinates from SVG base rectangles
const POSITION_COORDS: Record<Position, { x: number; y: number }> = {
  P: { x: 265, y: 354.6 },      // Pitcher's mound (Y coordinate matches 1B and 3B)
  C: { x: 265, y: 475 },      // Catcher (moved down 5 more units)
  '1B': { x: 336.5, y: 354.6 },   // First base (equidistant from Pitcher X as 3B, opposite direction)
  '2B': { x: 315, y: 295 },   // Second base (equidistant from Pitcher X as SS, opposite direction)
  SS: { x: 215, y: 295 },     // Shortstop (moved up 5 units)
  '3B': { x: 193.5, y: 354.6 },   // Third base (anchor - 71.5 units left of Pitcher X)
  LF: { x: 150, y: 200 },     // Left field
  CF: { x: 265, y: 150 },     // Center field
  RF: { x: 380, y: 200 },     // Right field
};

const BASE_COORDS = {
  '1B': { x: 336.5, y: 354.6 },
  '2B': { x: 315, y: 295 },
  '3B': { x: 193.5, y: 354.6 },
  HOME: { x: 265.5, y: 453.4 },
};

export default function Field({ scenario, highlightedRole, showFeedback }: FieldProps) {
  // Match the SVG's viewBox: "24.654 81.888 480.692 413.582"
  const viewBox = '24.654 81.888 480.692 413.582';
  const [useEpsSvg, setUseEpsSvg] = useState(true); // Default to true since we have the SVG

  // Check if converted SVG exists (with timeout for mobile)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const img = new Image();
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
    
    img.onload = () => {
      cleanup();
      setUseEpsSvg(true);
    };
    
    img.onerror = () => {
      cleanup();
      setUseEpsSvg(false);
    };
    
    // Set a timeout to prevent infinite loading on mobile
    timeoutId = setTimeout(() => {
      setUseEpsSvg(false);
    }, 5000); // 5 second timeout
    
    img.src = '/assets/softballfield.svg';
    
    return cleanup;
  }, []);

  // Convert ball zone to coordinates (matching SVG viewBox)
  // Maps play types (category + ballZone) to ball positions on the field
  // The position includes the base position plus any fine-tuning offsets
  const getBallPosition = () => {
    const ballZone = scenario.situation.ballZone;
    const category = scenario.category;
    
    // Create a play type key (e.g., "cut_relay_LF", "bunt_INFIELD_LEFT")
    const playType = `${category}_${ballZone}`;
    
    // Ball position mapping for different play types
    // Each entry contains the final position (base + offset) for the ball marker
    // Format: { x: finalX, y: finalY, offsetX: offset for transform, offsetY: offset for transform }
    // The offset values are used in the transform to center the ball marker
    const ballPositionMap: Record<string, { x: number; y: number; offsetX: number; offsetY: number }> = {
      // Cut/Relay plays - Singles
      'cut_relay_LF': { x: 150, y: 180, offsetX: -5.625, offsetY: 24.375 }, // Single to LF - LOCKED IN
      'cut_relay_CF': { x: 265, y: 120, offsetX: 0, offsetY: 0 }, // Single to CF - PLACEHOLDER
      'cut_relay_RF': { x: 380, y: 180, offsetX: 0, offsetY: 0 }, // Single to RF - PLACEHOLDER
      
      // Cut/Relay plays - To the fence
      'cut_relay_LF_FENCE': { x: 100, y: 150, offsetX: 0, offsetY: 0 }, // LF to fence - PLACEHOLDER
      'cut_relay_CF_FENCE': { x: 265, y: 80, offsetX: 0, offsetY: 0 }, // CF to fence - PLACEHOLDER
      'cut_relay_RF_FENCE': { x: 430, y: 150, offsetX: 0, offsetY: 0 }, // RF to fence - PLACEHOLDER
      
      // Bunt plays
      'bunt_INFIELD_LEFT': { x: 220, y: 300, offsetX: 0, offsetY: 0 }, // Bunt left - PLACEHOLDER
      'bunt_INFIELD_RIGHT': { x: 310, y: 300, offsetX: 0, offsetY: 0 }, // Bunt right - PLACEHOLDER
      'bunt_INFIELD_CENTER': { x: 265, y: 320, offsetX: 0, offsetY: 0 }, // Bunt center - PLACEHOLDER
      
      // Other zones (fallback to generic positions)
      'cut_relay_LF_LINE': { x: 100, y: 250, offsetX: 0, offsetY: 0 },
      'cut_relay_RF_LINE': { x: 430, y: 250, offsetX: 0, offsetY: 0 },
      'cut_relay_LF_GAP': { x: 200, y: 160, offsetX: 0, offsetY: 0 },
      'cut_relay_RF_GAP': { x: 330, y: 160, offsetX: 0, offsetY: 0 },
      'cut_relay_INFIELD_LEFT': { x: 220, y: 300, offsetX: 0, offsetY: 0 },
      'cut_relay_INFIELD_RIGHT': { x: 310, y: 300, offsetX: 0, offsetY: 0 },
    };
    
    // Get the position for this play type, or use a default
    const position = ballPositionMap[playType] || { 
      x: 265, 
      y: 250, 
      offsetX: 0, 
      offsetY: 0 
    };
    
    return position;
  };

  const ballPositionData = getBallPosition();
  const ballPosition = { x: ballPositionData.x, y: ballPositionData.y };

  return (
    <div className="w-screen md:w-full md:max-w-md md:mx-auto -mx-4 md:mx-auto overflow-hidden mb-2 bg-white">
      <svg
        viewBox={viewBox}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
          {/* Softball field base vector from EPS file (public/assets/softballfield.eps) */}
          {/* 
            NOTE: EPS files cannot be used directly in browsers.
            Convert softballfield.eps to SVG and save as public/assets/softballfield.svg
            See public/assets/CONVERSION_INSTRUCTIONS.md for details.
          */}
          <g id="field-base">
            {/* Use converted SVG from EPS file */}
            {useEpsSvg ? (
              <image
                href="/assets/softballfield.svg"
                x="24.654"
                y="81.888"
                width="480.692"
                height="413.582"
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <>
                {/* Fallback: Outfield grass */}
                <path
                  d="M 150 230 L 30 80 Q 150 -20 270 80 Z"
                  fill="oklch(0.5 0.12 145 / 0.15)"
                  stroke="oklch(0.5 0.12 145 / 0.3)"
                  strokeWidth="1"
                />

                {/* Fallback: Infield dirt */}
                <path
                  d="M 150 230 L 80 165 L 150 100 L 220 165 Z"
                  fill="oklch(0.55 0.08 60 / 0.3)"
                  stroke="oklch(0.5 0.06 60 / 0.5)"
                  strokeWidth="1"
                />
              </>
            )}
          </g>

          {/* Bases, foul lines, etc. are included in the SVG, so only render them if not using SVG */}
          {!useEpsSvg && (
            <>
              {/* Bases */}
              <rect x="195" y="180" width="12" height="12" fill="white" transform="rotate(45 200 185)" />
              <rect x="145" y="135" width="12" height="12" fill="white" transform="rotate(45 150 140)" />
              <rect x="95" y="180" width="12" height="12" fill="white" transform="rotate(45 100 185)" />

              {/* Home plate */}
              <polygon points="150,225 145,230 145,238 155,238 155,230" fill="white" />

              {/* Pitcher's circle */}
              <circle
                cx="150"
                cy="180"
                r="12"
                fill="oklch(0.55 0.08 60 / 0.5)"
                stroke="oklch(0.5 0.06 60 / 0.7)"
                strokeWidth="1"
              />

              {/* Foul lines */}
              <line x1="150" y1="230" x2="30" y2="100" stroke="white" strokeWidth="1" opacity="0.5" />
              <line x1="150" y1="230" x2="270" y2="100" stroke="white" strokeWidth="1" opacity="0.5" />
            </>
          )}

          {/* Runner dots */}
          {scenario.situation.runners.on1 && (
            <circle
              cx={BASE_COORDS['1B'].x}
              cy={BASE_COORDS['1B'].y}
              r="8"
              fill="oklch(0.5 0.2 260)"
              stroke="white"
              strokeWidth="2"
            />
          )}
          {scenario.situation.runners.on2 && (
            <circle
              cx={BASE_COORDS['2B'].x}
              cy={BASE_COORDS['2B'].y}
              r="8"
              fill="oklch(0.5 0.2 260)"
              stroke="white"
              strokeWidth="2"
            />
          )}
          {scenario.situation.runners.on3 && (
            <circle
              cx={BASE_COORDS['3B'].x}
              cy={BASE_COORDS['3B'].y}
              r="8"
              fill="oklch(0.5 0.2 260)"
              stroke="white"
              strokeWidth="2"
            />
          )}

          {/* Pulse ring for active position - rendered separately to prevent drift */}
          {highlightedRole && (() => {
            const activeCoords = POSITION_COORDS[highlightedRole];
            return (
              <g key={`pulse-wrapper-${highlightedRole}`}>
                <circle
                  cx={activeCoords.x}
                  cy={activeCoords.y}
                  r="28.125"
                  fill="none"
                  stroke="#EC4E23"
                  strokeWidth="2.5"
                  className="animate-pulse-ring"
                  style={{ transformOrigin: 'center', stroke: '#EC4E23' }}
                />
              </g>
            );
          })()}

          {/* Position markers */}
          {(Object.entries(POSITION_COORDS) as [Position, { x: number; y: number }][]).map(([pos, coords]) => {
            const isActive = pos === highlightedRole;
            // Use highlightedRole's coordinates directly when active to ensure accuracy
            const activeCoords = isActive && highlightedRole ? POSITION_COORDS[highlightedRole] : coords;
            return (
              <g key={pos}>
                {/* Position dot */}
                <circle
                  cx={isActive ? activeCoords.x : coords.x}
                  cy={isActive ? activeCoords.y : coords.y}
                  r={isActive ? 21.875 : 15.625}
                  fill={isActive ? '#EC4E23' : 'oklch(0.4 0.02 260)'}
                  stroke="white"
                  strokeWidth="3.125"
                />
                {/* Position label */}
                <text
                  x={isActive ? activeCoords.x : coords.x}
                  y={(isActive ? activeCoords.y : coords.y) + 6.25}
                  textAnchor="middle"
                  fontSize={isActive ? 15.625 : 12.5}
                  fontWeight="bold"
                  fill="white"
                >
                  {pos}
                </text>
                {/* Active role label bubble */}
                {isActive && (
                  <g>
                    <rect x={activeCoords.x - 31.25} y={activeCoords.y - 50} width="62.5" height="25" rx="6.25" fill="#EC4E23" />
                    <text
                      x={activeCoords.x}
                      y={activeCoords.y - 32.5}
                      textAnchor="middle"
                      fontSize="12.5"
                      fontWeight="bold"
                      fill="white"
                    >
                      YOU
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Ball marker - using softball.svg - rendered after positions so it appears on top */}
          <g className="animate-ball-glow ball-marker-glow" transform={`translate(${ballPosition.x + ballPositionData.offsetX}, ${ballPosition.y + ballPositionData.offsetY}) scale(0.434375)`}>
            {/* Multiple glow circles for mobile compatibility - more prominent on mobile */}
            <circle
              cx="36"
              cy="36"
              r="32"
              fill="none"
              stroke="#fcea2b"
              strokeWidth="3"
              opacity="0.6"
              className="animate-ball-glow-circle ball-glow-outer"
            />
            <circle
              cx="36"
              cy="36"
              r="28"
              fill="none"
              stroke="#fcea2b"
              strokeWidth="2"
              opacity="0.8"
              className="animate-ball-glow-circle ball-glow-inner"
            />
            {/* Additional mobile-only glow circle for extra visibility */}
            <circle
              cx="36"
              cy="36"
              r="38"
              fill="none"
              stroke="#fcea2b"
              strokeWidth="3"
              opacity="0.5"
              className="animate-ball-glow-circle ball-glow-mobile"
            />
            <image
              href="/assets/softball.svg"
              x="0"
              y="0"
              width="72"
              height="72"
              preserveAspectRatio="xMidYMid meet"
            />
          </g>

          {/* Feedback arrow */}
          {showFeedback && showFeedback.target && (() => {
            const fromPos = POSITION_COORDS[showFeedback.role];
            return (
              <line
                x1={fromPos.x}
                y1={fromPos.y}
                x2={150}
                y2={150}
                stroke="#10b981"
                strokeWidth="3"
                strokeDasharray="8,4"
                opacity="0.8"
              />
            );
          })()}
      </svg>
    </div>
  );
}
