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
  '1B': { x: 326.5, y: 354.6 },   // First base (equidistant from Pitcher X as 3B, opposite direction)
  '2B': { x: 315, y: 295 },   // Second base (equidistant from Pitcher X as SS, opposite direction)
  SS: { x: 215, y: 295 },     // Shortstop (moved up 5 units)
  '3B': { x: 203.5, y: 354.6 },   // Third base (anchor - 71.5 units left of Pitcher X)
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
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const runnerSize = 38;
  const runnerOffsets = {
    '1B': { x: 18, y: -6, rotate: 0, flipX: true },
    '2B': { x: -51, y: -33, rotate: 0, flipX: true },
    '3B': { x: -18, y: -6, rotate: 0, flipX: false },
  };

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
    const title = scenario.title ? scenario.title.toLowerCase() : '';
    
    // Create a play type key (e.g., "cut_relay_LF", "bunt_INFIELD_LEFT")
    let playType = `${category}_${ballZone}`;
    if (category === 'bunt_defense' && ballZone === 'INFIELD') {
      playType = 'bunt_defense_INFIELD';
    }
    if (category === 'cut_relay' && ballZone === 'RF_LINE' && title.includes('double')) {
      playType = 'cut_relay_RF_double_line';
    }
    if (category === 'cut_relay' && ballZone === 'LF_LINE' && title.includes('double')) {
      playType = 'cut_relay_LF_double_line';
    }
    if (category === 'cut_relay' && ballZone === 'RCF' && (title.includes('double') || title.includes('triple'))) {
      playType = 'cut_relay_RCF_double';
    }
    if (category === 'cut_relay' && ballZone === 'RCF' && title.includes('fence')) {
      playType = 'cut_relay_RCF_fence';
    }
    if (category === 'cut_relay' && ballZone === 'LCF' && (title.includes('double') || title.includes('triple'))) {
      playType = 'cut_relay_LCF_double';
    }
    
    // Ball position mapping for different play types
    // Each entry contains the final position (base + offset) for the ball marker
    // Format: { x: finalX, y: finalY, offsetX: offset for transform, offsetY: offset for transform }
    // The offset values are used in the transform to center the ball marker
    const ballPositionMap: Record<string, { x: number; y: number }> = {
      // Cut/Relay plays - Singles
      'cut_relay_LF': { x: 172.0, y: 243.7 }, // Single to LF - LOCKED IN
      'cut_relay_CF': { x: 265.6, y: 206.7 }, // Single to CF - PLACEHOLDER
      'cut_relay_RF': { x: 355.7, y: 242.5 }, // Single to RF - PLACEHOLDER
      
      // Cut/Relay plays - To the fence
      'cut_relay_LF_FENCE': { x: 115.6, y: 165.6 }, // LF to fence - PLACEHOLDER
      'cut_relay_CF_FENCE': { x: 280.6, y: 95.6 }, // CF to fence - PLACEHOLDER
      'cut_relay_RF_FENCE': { x: 445.6, y: 165.6 }, // RF to fence - PLACEHOLDER
      
      // Bunt plays
      'bunt_INFIELD_LEFT': { x: 235.6, y: 315.6 }, // Bunt left - PLACEHOLDER
      'bunt_INFIELD_RIGHT': { x: 325.6, y: 315.6 }, // Bunt right - PLACEHOLDER
      'bunt_INFIELD_CENTER': { x: 280.6, y: 335.6 }, // Bunt center - PLACEHOLDER
      'bunt_defense_INFIELD': { x: 264.4, y: 414.7 },
      
      // Other zones (fallback to generic positions)
      'cut_relay_LF_LINE': { x: 42.6, y: 218.2 },
      'cut_relay_RF_LINE': { x: 481.7, y: 212.5 },
      'cut_relay_RF_double_line': { x: 443.5, y: 251.8 },
      'cut_relay_LF_double_line': { x: 88.8, y: 256.4 },
      'cut_relay_RCF': { x: 314.1, y: 214.8 },
      'cut_relay_RCF_double': { x: 346.5, y: 146.6 },
      'cut_relay_RCF_fence': { x: 340.7, y: 105.0 },
      'cut_relay_LF_GAP': { x: 215.6, y: 175.6 },
      'cut_relay_RF_GAP': { x: 345.6, y: 175.6 },
      'cut_relay_INFIELD_LEFT': { x: 235.6, y: 315.6 },
      'cut_relay_INFIELD_RIGHT': { x: 325.6, y: 315.6 },
      'defensive_situation_LF': { x: 166.2, y: 228.6 },
      'defensive_situation_CF': { x: 264.4, y: 169.7 },
      'defensive_situation_RF': { x: 366.1, y: 218.2 },
      'cut_relay_LCF': { x: 178.9, y: 107.3 },
      'cut_relay_LCF_double': { x: 203.2, y: 169.7 },
      'cut_relay_LF_CORNER': { x: 72.6, y: 237.9 },
    };
    
    // Get the position for this play type, or use a default
    const position = ballPositionMap[playType] || { 
      x: 280.6, 
      y: 265.6
    };
    
    return position;
  };

  const ballPositionData = getBallPosition();
  const ballPosition = { x: ballPositionData.x, y: ballPositionData.y };
  const ballMarkerScale = 0.434375;
  const ballMarkerHalf = (72 * ballMarkerScale) / 2;
  const playTypeLabel = `${scenario.category}_${scenario.situation.ballZone}`;

  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!isLocalhost || !event.altKey) return;
    const svg = event.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const svgPoint = pt.matrixTransform(matrix.inverse());
    const x = Number(svgPoint.x.toFixed(1));
    const y = Number(svgPoint.y.toFixed(1));
    console.log(`[Field] ${playTypeLabel} ball position: x=${x}, y=${y}`);
  };

  return (
    <div className="w-screen md:w-full md:max-w-md md:mx-auto -mx-4 md:mx-auto overflow-hidden mb-2 bg-white">
      <svg
        viewBox={viewBox}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onClick={handleSvgClick}
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

          {/* Runner markers */}
          {scenario.situation.runners.on1 && (() => {
            const offset = runnerOffsets['1B'];
            const x = BASE_COORDS['1B'].x - runnerSize / 2 + offset.x;
            const y = BASE_COORDS['1B'].y - runnerSize / 2 + offset.y;
            const cx = x + runnerSize / 2;
            const cy = y + runnerSize / 2;
            const transformParts = [];
            if (offset.flipX) {
              transformParts.push(`translate(${cx} ${cy}) scale(-1 1) translate(${-cx} ${-cy})`);
            }
            if (offset.rotate) {
              transformParts.push(`rotate(${offset.rotate} ${cx} ${cy})`);
            }
            return (
              <image
                href="/assets/runner.svg"
                x={x}
                y={y}
                width={runnerSize}
                height={runnerSize}
                preserveAspectRatio="xMidYMid meet"
                transform={transformParts.length ? transformParts.join(' ') : undefined}
              />
            );
          })()}
          {scenario.situation.runners.on2 && (() => {
            const offset = runnerOffsets['2B'];
            const x = BASE_COORDS['2B'].x - runnerSize / 2 + offset.x;
            const y = BASE_COORDS['2B'].y - runnerSize / 2 + offset.y;
            const cx = x + runnerSize / 2;
            const cy = y + runnerSize / 2;
            const transformParts = [];
            if (offset.flipX) {
              transformParts.push(`translate(${cx} ${cy}) scale(-1 1) translate(${-cx} ${-cy})`);
            }
            if (offset.rotate) {
              transformParts.push(`rotate(${offset.rotate} ${cx} ${cy})`);
            }
            return (
              <image
                href="/assets/runner.svg"
                x={x}
                y={y}
                width={runnerSize}
                height={runnerSize}
                preserveAspectRatio="xMidYMid meet"
                transform={transformParts.length ? transformParts.join(' ') : undefined}
              />
            );
          })()}
          {scenario.situation.runners.on3 && (() => {
            const offset = runnerOffsets['3B'];
            const x = BASE_COORDS['3B'].x - runnerSize / 2 + offset.x;
            const y = BASE_COORDS['3B'].y - runnerSize / 2 + offset.y;
            const cx = x + runnerSize / 2;
            const cy = y + runnerSize / 2;
            const transformParts = [];
            if (offset.flipX) {
              transformParts.push(`translate(${cx} ${cy}) scale(-1 1) translate(${-cx} ${-cy})`);
            }
            if (offset.rotate) {
              transformParts.push(`rotate(${offset.rotate} ${cx} ${cy})`);
            }
            return (
              <image
                href="/assets/runner.svg"
                x={x}
                y={y}
                width={runnerSize}
                height={runnerSize}
                preserveAspectRatio="xMidYMid meet"
                transform={transformParts.length ? transformParts.join(' ') : undefined}
              />
            );
          })()}

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
          <g key="ball-marker" transform={`translate(${ballPosition.x - ballMarkerHalf}, ${ballPosition.y - ballMarkerHalf}) scale(${ballMarkerScale})`}>
            {/* Single pulse ring for ball - same as position marker, works great on iPhone */}
            <circle
              cx="36"
              cy="36"
              r="36"
              fill="none"
              stroke="#fcea2b"
              strokeWidth="2.5"
              className="animate-pulse-ring"
              style={{ transformOrigin: 'center', stroke: '#fcea2b' }}
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
