/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoVeritasProps {
  className?: string;
  size?: number;
  /** 'dark' = black shield on transparent (for light backgrounds)
   *  'light' = white shield on transparent (for dark backgrounds like sidebar) */
  variant?: 'dark' | 'light';
}

/**
 * Veritas Dominican shield rendered as inline SVG.
 * Faithfully recreates the VERITAS heraldic crest:
 * - Top banner: "VERITAS"
 * - 4 quadrants alternating black / white
 * - Ornate cross with fleur-de-lis terminals
 */
export default function LogoVeritas({ className = '', size = 40, variant = 'dark' }: LogoVeritasProps) {
  const w = Math.round(size * 0.77);
  const h = size;
  const fg = variant === 'light' ? 'white' : '#111111';
  const bg = variant === 'light' ? '#111111' : 'white';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 308 400"
      width={w}
      height={h}
      className={className}
      aria-label="Escudo Veritas"
      role="img"
      style={{ display: 'block' }}
    >
      {/* ── Shield silhouette (clip path) ── */}
      <defs>
        <clipPath id="shield-clip">
          <path d="M 8 8 L 300 8 L 300 270 Q 300 395 154 398 Q 8 395 8 270 Z" />
        </clipPath>
      </defs>

      {/* Shield background */}
      <path
        d="M 8 8 L 300 8 L 300 270 Q 300 395 154 398 Q 8 395 8 270 Z"
        fill={bg}
        stroke={fg}
        strokeWidth="9"
      />

      {/* ── Everything clipped to shield ── */}
      <g clipPath="url(#shield-clip)">

        {/* VERITAS banner */}
        <rect x="8" y="8" width="292" height="68" fill={fg} />
        <text
          x="154"
          y="58"
          textAnchor="middle"
          fontFamily="'Times New Roman', Georgia, serif"
          fontWeight="bold"
          fontSize="44"
          letterSpacing="6"
          fill={bg}
        >
          VERITAS
        </text>

        {/* Banner bottom border */}
        <rect x="8" y="74" width="292" height="7" fill={fg} />

        {/* ── Quadrant fills ── */}
        {/* Top-left BLACK */}
        <polygon points="8,81 147,81 8,218" fill={fg} />
        {/* Top-right WHITE — already bg */}
        {/* Bottom-left WHITE — already bg */}
        {/* Bottom-right BLACK */}
        <polygon points="161,232 300,232 300,398 161,398" fill={fg} />

        {/* ── Cross ── */}
        {/* Vertical bar */}
        <rect x="144" y="81" width="20" height="317" fill={fg} />
        {/* Horizontal bar */}
        <rect x="8" y="218" width="292" height="20" fill={fg} />

        {/* ── Fleur-de-lis terminals ── */}
        {/* TOP terminal */}
        <g fill={fg}>
          {/* center bud */}
          <ellipse cx="154" cy="82" rx="9" ry="11" />
          {/* left wing */}
          <ellipse cx="140" cy="88" rx="11" ry="6" transform="rotate(-35 140 88)" />
          {/* right wing */}
          <ellipse cx="168" cy="88" rx="11" ry="6" transform="rotate(35 168 88)" />
        </g>

        {/* BOTTOM terminal */}
        <g fill={fg}>
          <ellipse cx="154" cy="395" rx="9" ry="11" />
          <ellipse cx="140" cy="389" rx="11" ry="6" transform="rotate(35 140 389)" />
          <ellipse cx="168" cy="389" rx="11" ry="6" transform="rotate(-35 168 389)" />
        </g>

        {/* LEFT terminal */}
        <g fill={fg}>
          <ellipse cx="9" cy="228" rx="11" ry="9" />
          <ellipse cx="15" cy="215" rx="6" ry="11" transform="rotate(35 15 215)" />
          <ellipse cx="15" cy="241" rx="6" ry="11" transform="rotate(-35 15 241)" />
        </g>

        {/* RIGHT terminal */}
        <g fill={fg}>
          <ellipse cx="299" cy="228" rx="11" ry="9" />
          <ellipse cx="293" cy="215" rx="6" ry="11" transform="rotate(-35 293 215)" />
          <ellipse cx="293" cy="241" rx="6" ry="11" transform="rotate(35 293 241)" />
        </g>

      </g>

      {/* ── Shield outer border (on top) ── */}
      <path
        d="M 8 8 L 300 8 L 300 270 Q 300 395 154 398 Q 8 395 8 270 Z"
        fill="none"
        stroke={fg}
        strokeWidth="9"
      />
    </svg>
  );
}
