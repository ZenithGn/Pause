export type CameraMilestoneId =
  | "hero"
  | "drawers"
  | "process"
  | "pricing"
  | "cta";

export interface CameraPose {
  milestone: CameraMilestoneId;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  shutterPress: number;
  stripOut: number;
  opacity: number;
}

interface PoseKeyframe {
  t: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

const POSE_KEYFRAMES: readonly PoseKeyframe[] = [
  // Milestone 1 (0.00 - 0.20): Hero right, 3/4 view showcasing lens & wine shutter
  {
    t: 0.0,
    position: [1.7, 0.05, 0.3],
    rotation: [0.12, -0.48, 0.04],
    scale: 1.0,
  },
  {
    t: 0.16,
    position: [1.7, 0.05, 0.3],
    rotation: [0.12, -0.46, 0.04],
    scale: 1.0,
  },
  // Milestone 2 (0.20 - 0.44): Memory Drawers left, angled toward right copy
  {
    t: 0.32,
    position: [-1.85, 0.0, 0.1],
    rotation: [0.08, 0.54, -0.03],
    scale: 0.98,
  },
  {
    t: 0.4,
    position: [-1.82, 0.0, 0.1],
    rotation: [0.08, 0.52, -0.03],
    scale: 0.98,
  },
  // Milestone 3 (0.44 - 0.66): Process right, ~25deg top-down + shutter press + strip
  {
    t: 0.52,
    position: [1.8, -0.05, 0.25],
    rotation: [0.43, -0.4, 0.05],
    scale: 1.0,
  },
  {
    t: 0.61,
    position: [1.8, -0.05, 0.25],
    rotation: [0.44, -0.42, 0.05],
    scale: 1.0,
  },
  // Milestone 4 (0.66 - 0.86): Pricing subtle top-right, never overlapping 4 cards
  {
    t: 0.74,
    position: [2.3, 0.9, -0.6],
    rotation: [0.18, -0.52, -0.04],
    scale: 0.65,
  },
  {
    t: 0.82,
    position: [2.3, 0.9, -0.6],
    rotation: [0.18, -0.5, -0.04],
    scale: 0.65,
  },
  // Milestone 5 (0.86 - 1.00): Final CTA right, facing near-front toward user
  {
    t: 0.93,
    position: [1.6, 0.0, 0.2],
    rotation: [0.06, -0.16, 0.0],
    scale: 1.02,
  },
  {
    t: 1.0,
    position: [1.6, 0.0, 0.2],
    rotation: [0.05, -0.14, 0.0],
    scale: 1.02,
  },
];

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function resolveMilestone(progress: number): CameraMilestoneId {
  if (progress < 0.2) return "hero";
  if (progress < 0.44) return "drawers";
  if (progress < 0.66) return "process";
  if (progress < 0.86) return "pricing";
  return "cta";
}

/**
 * Computes a deterministic 3D camera pose for a normalized page scroll progress in `[0, 1]`.
 * Smoothly interpolates across 5 editorial milestones without overlapping section text or cards.
 */
export function computeCameraPoseAtScroll(rawProgress: number): CameraPose {
  const progress = clamp01(rawProgress);
  const milestone = resolveMilestone(progress);

  let lower = POSE_KEYFRAMES[0];
  let upper = POSE_KEYFRAMES[POSE_KEYFRAMES.length - 1];

  for (let i = 0; i < POSE_KEYFRAMES.length - 1; i += 1) {
    const a = POSE_KEYFRAMES[i];
    const b = POSE_KEYFRAMES[i + 1];
    if (progress >= a.t && progress <= b.t) {
      lower = a;
      upper = b;
      break;
    }
  }

  const localT = smoothstep(lower.t, upper.t, progress);

  const position: [number, number, number] = [
    lerp(lower.position[0], upper.position[0], localT),
    lerp(lower.position[1], upper.position[1], localT),
    lerp(lower.position[2], upper.position[2], localT),
  ];

  const rotation: [number, number, number] = [
    lerp(lower.rotation[0], upper.rotation[0], localT),
    lerp(lower.rotation[1], upper.rotation[1], localT),
    lerp(lower.rotation[2], upper.rotation[2], localT),
  ];

  const scale = lerp(lower.scale, upper.scale, localT);

  // Mini photobooth strip slides gently out during Milestone 3 (0.44 -> 0.66)
  const stripIn = smoothstep(0.44, 0.51, progress);
  const stripOutFade = 1 - smoothstep(0.61, 0.66, progress);
  const stripOut = clamp01(stripIn * stripOutFade);

  // Shutter button presses cleanly in the middle of Milestone 3
  const shutterIn = smoothstep(0.47, 0.53, progress);
  const shutterRelease = 1 - smoothstep(0.58, 0.64, progress);
  const shutterPress = clamp01(shutterIn * shutterRelease);

  // Slightly soften opacity during the Pricing section so cards stay paramount
  const pricingFadeIn = smoothstep(0.66, 0.72, progress);
  const pricingFadeOut = 1 - smoothstep(0.82, 0.87, progress);
  const opacity = 1 - 0.18 * clamp01(pricingFadeIn * pricingFadeOut);

  return {
    milestone,
    position,
    rotation,
    scale,
    shutterPress,
    stripOut,
    opacity,
  };
}
