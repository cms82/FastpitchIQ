"use client"

import type { Position } from "@/lib/types"

interface FieldCardProps {
  activeRole: Position
  ballZone: string
  runners: ("1B" | "2B" | "3B")[]
}

const POSITION_COORDS: Record<Position, { x: number; y: number }> = {
  P: { x: 150, y: 180 },
  C: { x: 150, y: 260 },
  "1B": { x: 220, y: 165 },
  "2B": { x: 180, y: 120 },
  SS: { x: 120, y: 120 },
  "3B": { x: 80, y: 165 },
  LF: { x: 50, y: 60 },
  CF: { x: 150, y: 40 },
  RF: { x: 250, y: 60 },
}

const BALL_ZONES: Record<string, { x: number; y: number }> = {
  LF: { x: 50, y: 45 },
  CF: { x: 150, y: 25 },
  RF: { x: 250, y: 45 },
  "LF-LINE": { x: 30, y: 100 },
  "RF-LINE": { x: 270, y: 100 },
  "SS-HOLE": { x: 100, y: 135 },
  "2B-HOLE": { x: 200, y: 135 },
  INFIELD: { x: 150, y: 150 },
  BUNT: { x: 150, y: 200 },
}

const BASE_COORDS = {
  "1B": { x: 200, y: 185 },
  "2B": { x: 150, y: 140 },
  "3B": { x: 100, y: 185 },
  HOME: { x: 150, y: 230 },
}

export function FieldCard({ activeRole, ballZone, runners }: FieldCardProps) {
  const ballPosition = BALL_ZONES[ballZone] || { x: 150, y: 100 }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="relative bg-gradient-to-b from-green-600/10 to-green-700/20 p-4">
        <svg viewBox="0 0 300 280" className="w-full h-auto">
          {/* Outfield grass */}
          <path
            d="M 150 230 L 30 80 Q 150 -20 270 80 Z"
            fill="oklch(0.5 0.12 145 / 0.15)"
            stroke="oklch(0.5 0.12 145 / 0.3)"
            strokeWidth="1"
          />

          {/* Infield dirt */}
          <path
            d="M 150 230 L 80 165 L 150 100 L 220 165 Z"
            fill="oklch(0.55 0.08 60 / 0.3)"
            stroke="oklch(0.5 0.06 60 / 0.5)"
            strokeWidth="1"
          />

          {/* Base paths */}
          <line x1="150" y1="230" x2="200" y2="185" stroke="oklch(0.9 0.01 90)" strokeWidth="2" />
          <line x1="200" y1="185" x2="150" y2="140" stroke="oklch(0.9 0.01 90)" strokeWidth="2" />
          <line x1="150" y1="140" x2="100" y2="185" stroke="oklch(0.9 0.01 90)" strokeWidth="2" />
          <line x1="100" y1="185" x2="150" y2="230" stroke="oklch(0.9 0.01 90)" strokeWidth="2" />

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

          {/* Runner dots */}
          {runners.map((base) => (
            <circle
              key={base}
              cx={BASE_COORDS[base].x}
              cy={BASE_COORDS[base].y}
              r="8"
              fill="oklch(0.5 0.2 260)"
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* Position markers */}
          {(Object.entries(POSITION_COORDS) as [Position, { x: number; y: number }][]).map(([pos, coords]) => {
            const isActive = pos === activeRole
            return (
              <g key={pos}>
                {/* Pulse ring for active position */}
                {isActive && (
                  <circle
                    cx={coords.x}
                    cy={coords.y}
                    r="18"
                    fill="none"
                    stroke="oklch(0.65 0.2 40)"
                    strokeWidth="2"
                    className="animate-pulse-ring"
                    opacity="0.6"
                  />
                )}
                {/* Position dot */}
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r={isActive ? 14 : 10}
                  fill={isActive ? "oklch(0.65 0.2 40)" : "oklch(0.4 0.02 260)"}
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Position label */}
                <text
                  x={coords.x}
                  y={coords.y + 4}
                  textAnchor="middle"
                  fontSize={isActive ? 10 : 8}
                  fontWeight="bold"
                  fill="white"
                >
                  {pos}
                </text>
                {/* Active role label bubble */}
                {isActive && (
                  <g>
                    <rect x={coords.x - 20} y={coords.y - 32} width="40" height="16" rx="4" fill="oklch(0.65 0.2 40)" />
                    <text
                      x={coords.x}
                      y={coords.y - 21}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="white"
                    >
                      YOU
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Ball marker */}
          <g className="animate-ball-glow">
            <circle
              cx={ballPosition.x}
              cy={ballPosition.y}
              r="10"
              fill="oklch(0.85 0.18 85)"
              stroke="white"
              strokeWidth="2"
            />
            <circle cx={ballPosition.x - 2} cy={ballPosition.y - 2} r="3" fill="white" opacity="0.6" />
          </g>
        </svg>
      </div>
    </div>
  )
}
