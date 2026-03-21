'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const BADGE_VISUALS: Record<
  string,
  { ringGradient: string; glow: string; icon: React.ReactNode }
> = {
  'tier:newbie': {
    ringGradient:
      'conic-gradient(from 180deg, #cd7f32 0%, #e8a96d 25%, #f5c885 50%, #e8a96d 75%, #a0522d 100%)',
    glow: 'drop-shadow(0 0 10px rgba(205,127,50,0.50))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M19 30 V20"
          stroke="#86efac"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="19" cy="18" rx="7" ry="5" fill="#22c55e" opacity="0.9" />
        <ellipse
          cx="15.5"
          cy="21"
          rx="5"
          ry="3.5"
          fill="#16a34a"
          opacity="0.8"
          transform="rotate(-15 15.5 21)"
        />
        <ellipse
          cx="22"
          cy="22"
          rx="4"
          ry="3"
          fill="#15803d"
          opacity="0.7"
          transform="rotate(15 22 22)"
        />
      </svg>
    ),
  },
  'tier:explorer': {
    ringGradient:
      'conic-gradient(from 180deg, #94a3b8 0%, #cbd5e1 30%, #f1f5f9 50%, #cbd5e1 70%, #64748b 100%)',
    glow: 'drop-shadow(0 0 10px rgba(148,163,184,0.45))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <circle
          cx="19"
          cy="19"
          r="10"
          stroke="#94a3b8"
          strokeWidth="1.2"
          opacity="0.5"
        />
        <circle cx="19" cy="19" r="2" fill="#e2e8f0" />
        <path d="M19 10 L21 17 L19 19 L17 17Z" fill="#f1f5f9" />
        <path d="M19 28 L17 21 L19 19 L21 21Z" fill="#64748b" />
        <path d="M28 19 L21 21 L19 19 L21 17Z" fill="#f1f5f9" />
        <path d="M10 19 L17 17 L19 19 L17 21Z" fill="#64748b" />
        <circle cx="28" cy="12" r="1.5" fill="#cbd5e1" opacity="0.8" />
      </svg>
    ),
  },
  'tier:achiever': {
    ringGradient:
      'conic-gradient(from 180deg, #d97706 0%, #fbbf24 30%, #fef3c7 50%, #fbbf24 70%, #b45309 100%)',
    glow: 'drop-shadow(0 0 12px rgba(217,119,6,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M19 9 L21.5 15.8 L29 16.3 L23.5 21 L25.3 28.5 L19 24.5 L12.7 28.5 L14.5 21 L9 16.3 L16.5 15.8Z"
          fill="#fbbf24"
          stroke="#f59e0b"
          strokeWidth="0.4"
        />
        <path
          d="M19 12 L21 17.5 L27 18 L22.5 21.5 L24 27.5 L19 24 L14 27.5 L15.5 21.5 L11 18 L17 17.5Z"
          fill="#fef3c7"
          opacity="0.6"
        />
      </svg>
    ),
  },
  'tier:specialist': {
    ringGradient:
      'conic-gradient(from 180deg, #059669 0%, #34d399 30%, #d1fae5 50%, #34d399 70%, #047857 100%)',
    glow: 'drop-shadow(0 0 12px rgba(5,150,105,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <circle
          cx="19"
          cy="19"
          r="9"
          stroke="#34d399"
          strokeWidth="1.2"
          opacity="0.35"
        />
        <circle
          cx="19"
          cy="19"
          r="5.5"
          stroke="#34d399"
          strokeWidth="1.2"
          opacity="0.65"
        />
        <circle cx="19" cy="19" r="2.5" fill="#10b981" />
        <line
          x1="25"
          y1="13"
          x2="20.5"
          y2="18"
          stroke="#6ee7b7"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M24 12 L27 12.5 L27.5 15.5 L25 13Z" fill="#6ee7b7" />
      </svg>
    ),
  },
  'tier:expert': {
    ringGradient:
      'conic-gradient(from 180deg, #7c3aed 0%, #a78bfa 30%, #ede9fe 50%, #a78bfa 70%, #5b21b6 100%)',
    glow: 'drop-shadow(0 0 14px rgba(124,58,237,0.60))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path d="M19 9 L27 16 L19 29 L11 16Z" fill="#a78bfa" opacity="0.75" />
        <path d="M19 9 L27 16 L19 19Z" fill="#ddd6fe" opacity="0.9" />
        <path d="M19 9 L11 16 L19 19Z" fill="#c4b5fd" opacity="0.7" />
        <path d="M11 16 L19 19 L19 29Z" fill="#6d28d9" opacity="0.8" />
        <path d="M27 16 L19 29 L19 19Z" fill="#5b21b6" opacity="0.9" />
      </svg>
    ),
  },
  'tier:master': {
    ringGradient:
      'conic-gradient(from 180deg, #0284c7 0%, #38bdf8 30%, #e0f2fe 50%, #38bdf8 70%, #0369a1 100%)',
    glow: 'drop-shadow(0 0 16px rgba(2,132,199,0.65))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M9 26 L9 19 L13.5 23.5 L19 14 L24.5 23.5 L29 19 L29 26Z"
          fill="#38bdf8"
          opacity="0.85"
        />
        <path
          d="M9 26 L29 26"
          stroke="#7dd3fc"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="9" cy="19" r="2" fill="#e0f2fe" />
        <circle cx="19" cy="14" r="2.5" fill="#bae6fd" />
        <circle cx="29" cy="19" r="2" fill="#e0f2fe" />
        <path
          d="M15 10 L15.4 11.6 L17 12 L15.4 12.4 L15 14 L14.6 12.4 L13 12 L14.6 11.6Z"
          fill="#e0f2fe"
          opacity="0.8"
        />
      </svg>
    ),
  },
  'achievement:first-step': {
    ringGradient:
      'conic-gradient(from 180deg, #ea580c 0%, #fb923c 30%, #ffedd5 50%, #fb923c 70%, #c2410c 100%)',
    glow: 'drop-shadow(0 0 12px rgba(234,88,12,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <rect
          x="12"
          y="10"
          width="14"
          height="18"
          rx="2"
          stroke="#fed7aa"
          strokeWidth="1.4"
          fill="none"
          opacity="0.55"
        />
        <line
          x1="19"
          y1="10"
          x2="19"
          y2="28"
          stroke="#fed7aa"
          strokeWidth="0.8"
          opacity="0.35"
        />
        <circle cx="21.5" cy="19" r="1.2" fill="#fb923c" />
        <path
          d="M24 19 L18 19 M21 16.5 L18 19 L21 21.5"
          stroke="#fb923c"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  'achievement:on-fire': {
    ringGradient:
      'conic-gradient(from 180deg, #dc2626 0%, #f87171 30%, #fee2e2 50%, #f87171 70%, #b91c1c 100%)',
    glow: 'drop-shadow(0 0 12px rgba(220,38,38,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M19 30C13 30 10 25 10 21 10 17 13 15 14 12 15 16 16 17 17 16 17 13 19 10 20 8 23 12 26 16 26 21 26 25 23 30 19 30Z"
          fill="#f97316"
          opacity="0.9"
        />
        <path
          d="M19 30C15 30 13 26 13 23 13 20 15 19 16 17 16 20 17 21 18 20 18 18 19 16 20 15 22 18 23 21 23 23 23 26 21 30 19 30Z"
          fill="#fbbf24"
          opacity="0.9"
        />
        <path
          d="M19 30C17 30 16 27.5 16 26 16 24 17.5 23.5 18 22.5 18 24 19 24.5 19 24 19.5 23 20 22 20.5 21.5 21.5 23 21.5 24.5 21.5 26 21.5 28.5 20 30 19 30Z"
          fill="#fef3c7"
          opacity="0.8"
        />
      </svg>
    ),
  },
  'achievement:scholar': {
    ringGradient:
      'conic-gradient(from 180deg, #9333ea 0%, #c084fc 30%, #f3e8ff 50%, #c084fc 70%, #7e22ce 100%)',
    glow: 'drop-shadow(0 0 12px rgba(147,51,234,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path d="M19 12 L31 18 L19 24 L7 18Z" fill="#c084fc" opacity="0.85" />
        <path
          d="M12 20.5 L12 28C12 28 15 31 19 31 23 31 26 28 26 28 L26 20.5"
          stroke="#a855f7"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <line
          x1="31"
          y1="18"
          x2="31"
          y2="25"
          stroke="#a855f7"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="31" cy="26" r="1.5" fill="#e9d5ff" />
        <circle cx="19" cy="12" r="1.5" fill="#f3e8ff" />
      </svg>
    ),
  },
  'achievement:collector': {
    ringGradient:
      'conic-gradient(from 180deg, #0f766e 0%, #2dd4bf 30%, #ccfbf1 50%, #2dd4bf 70%, #115e59 100%)',
    glow: 'drop-shadow(0 0 12px rgba(15,118,110,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <rect
          x="9"
          y="24"
          width="20"
          height="5"
          rx="1"
          fill="#2dd4bf"
          opacity="0.9"
        />
        <rect
          x="10"
          y="19"
          width="18"
          height="5"
          rx="1"
          fill="#5eead4"
          opacity="0.75"
        />
        <rect
          x="11"
          y="14"
          width="16"
          height="5"
          rx="1"
          fill="#99f6e4"
          opacity="0.6"
        />
        <line
          x1="12"
          y1="24"
          x2="12"
          y2="29"
          stroke="#0d9488"
          strokeWidth="1"
          opacity="0.6"
        />
        <line
          x1="13"
          y1="19"
          x2="13"
          y2="24"
          stroke="#0d9488"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1="14"
          y1="14"
          x2="14"
          y2="19"
          stroke="#0d9488"
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
    ),
  },
  'achievement:quiz-master': {
    ringGradient:
      'conic-gradient(from 180deg, #db2777 0%, #f472b6 30%, #fdf2f8 50%, #f472b6 70%, #be185d 100%)',
    glow: 'drop-shadow(0 0 12px rgba(219,39,119,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <circle
          cx="19"
          cy="19"
          r="9"
          stroke="#f9a8d4"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <path
          d="M13 19 L17.5 23.5 L26 14"
          stroke="#ec4899"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M29 11 L29.4 12.6 L31 13 L29.4 13.4 L29 15 L28.6 13.4 L27 13 L28.6 12.6Z"
          fill="#fbcfe8"
          opacity="0.9"
        />
      </svg>
    ),
  },
  'achievement:perfect-run': {
    ringGradient:
      'conic-gradient(from 180deg, #b45309 0%, #fcd34d 30%, #fefce8 50%, #fcd34d 70%, #92400e 100%)',
    glow: 'drop-shadow(0 0 12px rgba(180,83,9,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M19 8 L20.2 12 L24.4 12 L21.1 14.5 L22.3 18.5 L19 16 L15.7 18.5 L16.9 14.5 L13.6 12 L17.8 12Z"
          fill="#fcd34d"
          opacity="0.9"
        />
        <path
          d="M10 21 L10.8 23.5 L13.5 23.5 L11.3 25 L12.1 27.5 L10 26 L7.9 27.5 L8.7 25 L6.5 23.5 L9.2 23.5Z"
          fill="#fcd34d"
          opacity="0.6"
        />
        <path
          d="M28 21 L28.8 23.5 L31.5 23.5 L29.3 25 L30.1 27.5 L28 26 L25.9 27.5 L26.7 25 L24.5 23.5 L27.2 23.5Z"
          fill="#fcd34d"
          opacity="0.6"
        />
      </svg>
    ),
  },
  'achievement:speed-learner': {
    ringGradient:
      'conic-gradient(from 180deg, #0891b2 0%, #67e8f9 30%, #ecfeff 50%, #67e8f9 70%, #0e7490 100%)',
    glow: 'drop-shadow(0 0 12px rgba(8,145,178,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M22 9 L14 20 L19 20 L16 31 L24 18 L19 18Z"
          fill="#67e8f9"
          stroke="#06b6d4"
          strokeWidth="0.5"
        />
        <line
          x1="8"
          y1="16"
          x2="12"
          y2="16"
          stroke="#a5f3fc"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <line
          x1="7"
          y1="20"
          x2="11"
          y2="20"
          stroke="#a5f3fc"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        <line
          x1="8"
          y1="24"
          x2="12"
          y2="24"
          stroke="#a5f3fc"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    ),
  },
  'achievement:certified': {
    ringGradient:
      'conic-gradient(from 180deg, #d97706 0%, #fde68a 30%, #fef9c3 50%, #fde68a 70%, #b45309 100%)',
    glow: 'drop-shadow(0 0 14px rgba(217,119,6,0.60))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <rect
          x="10"
          y="10"
          width="18"
          height="14"
          rx="2"
          fill="none"
          stroke="#fde68a"
          strokeWidth="1.4"
          opacity="0.65"
        />
        <line
          x1="14"
          y1="15"
          x2="24"
          y2="15"
          stroke="#fde68a"
          strokeWidth="1"
          opacity="0.55"
          strokeLinecap="round"
        />
        <line
          x1="14"
          y1="18"
          x2="22"
          y2="18"
          stroke="#fde68a"
          strokeWidth="1"
          opacity="0.4"
          strokeLinecap="round"
        />
        <circle cx="19" cy="27.5" r="3.5" fill="#f59e0b" opacity="0.9" />
        <path
          d="M16 27.5 L13 31.5 L19 29.5 L25 31.5 L22 27.5"
          fill="#b45309"
          opacity="0.8"
        />
        <circle cx="19" cy="27.5" r="1.8" fill="#fef9c3" />
      </svg>
    ),
  },
  'achievement:multi-cert': {
    ringGradient:
      'conic-gradient(from 180deg, #4338ca 0%, #818cf8 30%, #e0e7ff 50%, #818cf8 70%, #3730a3 100%)',
    glow: 'drop-shadow(0 0 14px rgba(67,56,202,0.60))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <rect
          x="14"
          y="8"
          width="14"
          height="10"
          rx="1.5"
          fill="none"
          stroke="#818cf8"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <rect
          x="11"
          y="13"
          width="14"
          height="10"
          rx="1.5"
          fill="none"
          stroke="#818cf8"
          strokeWidth="1.2"
          opacity="0.65"
        />
        <rect
          x="8"
          y="18"
          width="14"
          height="10"
          rx="1.5"
          fill="#3730a3"
          stroke="#818cf8"
          strokeWidth="1.2"
          opacity="0.85"
        />
        <path
          d="M11 23 L13.5 25.5 L20 19"
          stroke="#a5b4fc"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  'achievement:early-bird': {
    ringGradient:
      'conic-gradient(from 180deg, #0d9488 0%, #5eead4 30%, #f0fdfa 50%, #5eead4 70%, #0f766e 100%)',
    glow: 'drop-shadow(0 0 12px rgba(13,148,136,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M8 22 Q19 10 30 22"
          stroke="#5eead4"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="19" cy="20" r="5" fill="#2dd4bf" opacity="0.85" />
        <line
          x1="19"
          y1="9"
          x2="19"
          y2="11.5"
          stroke="#5eead4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="10.5"
          y1="12.5"
          x2="12.3"
          y2="14.2"
          stroke="#5eead4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="27.5"
          y1="12.5"
          x2="25.7"
          y2="14.2"
          stroke="#5eead4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="7"
          y1="20"
          x2="9.5"
          y2="20"
          stroke="#5eead4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="28.5"
          y1="20"
          x2="31"
          y2="20"
          stroke="#5eead4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  'achievement:dedicated': {
    ringGradient:
      'conic-gradient(from 180deg, #16a34a 0%, #86efac 30%, #dcfce7 50%, #86efac 70%, #15803d 100%)',
    glow: 'drop-shadow(0 0 12px rgba(22,163,74,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <rect
          x="9"
          y="11"
          width="20"
          height="18"
          rx="2"
          fill="none"
          stroke="#86efac"
          strokeWidth="1.4"
          opacity="0.6"
        />
        <line
          x1="9"
          y1="16"
          x2="29"
          y2="16"
          stroke="#86efac"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1="14"
          y1="9"
          x2="14"
          y2="13"
          stroke="#86efac"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <line
          x1="24"
          y1="9"
          x2="24"
          y2="13"
          stroke="#86efac"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          d="M13 22.5 L17 26.5 L25 19"
          stroke="#4ade80"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  'achievement:reviewer': {
    ringGradient:
      'conic-gradient(from 180deg, #c026d3 0%, #e879f9 30%, #fdf4ff 50%, #e879f9 70%, #a21caf 100%)',
    glow: 'drop-shadow(0 0 12px rgba(192,38,211,0.55))',
    icon: (
      <svg viewBox="0 0 38 38" fill="none">
        <path
          d="M8 12 Q8 9 11 9 L27 9 Q30 9 30 12 L30 22 Q30 25 27 25 L21 25 L17 30 L17 25 L11 25 Q8 25 8 22Z"
          fill="#9333ea"
          opacity="0.3"
          stroke="#c084fc"
          strokeWidth="1.2"
        />
        <path
          d="M19 13 L20 16 L23.2 16 L20.6 17.9 L21.6 21 L19 19.1 L16.4 21 L17.4 17.9 L14.8 16 L18 16Z"
          fill="#e879f9"
          opacity="0.9"
        />
      </svg>
    ),
  },
};

const SIZE_MAP = {
  sm: { ring: 48, inner: 38, svg: 22 },
  md: { ring: 80, inner: 66, svg: 38 },
  lg: { ring: 112, inner: 94, svg: 54 },
};

interface BadgeIconProps {
  badgeKey: string;
  size?: 'sm' | 'md' | 'lg';
  locked?: boolean;
  showLabel?: boolean;
}

export function BadgeIcon({
  badgeKey,
  size = 'md',
  locked = false,
  showLabel = false,
}: BadgeIconProps) {
  const visual = BADGE_VISUALS[badgeKey];
  const dim = SIZE_MAP[size];

  if (!visual) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[BadgeIcon] Unknown badgeKey: "${badgeKey}"`);
    }
    return null;
  }

  const name =
    badgeKey
      .split(':')[1]
      ?.replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? badgeKey;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5',
        locked && 'opacity-40',
      )}
    >
      {/* Outer ring */}
      <div
        className="rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
        style={{
          width: dim.ring,
          height: dim.ring,
          background: visual.ringGradient,
          filter: visual.glow,
          padding: Math.round(dim.ring * 0.05),
        }}
      >
        {/* Inner dark circle */}
        <div
          className="rounded-full flex items-center justify-center relative overflow-hidden"
          style={{
            width: dim.inner,
            height: dim.inner,
            background: 'radial-gradient(circle at 38% 35%, #1c2333, #0d1117)',
          }}
        >
          {/* Highlight overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 60%)',
            }}
          />
          {/* SVG icon */}
          <div
            style={{ width: dim.svg, height: dim.svg }}
            className="relative z-10"
          >
            {visual.icon}
          </div>
        </div>
      </div>

      {showLabel && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center leading-tight max-w-[72px]">
          {name}
        </span>
      )}
    </div>
  );
}
