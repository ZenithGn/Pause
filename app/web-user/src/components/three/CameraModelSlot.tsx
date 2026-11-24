"use client";

import { Component, Suspense, useMemo, type ErrorInfo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  VintageCameraModel,
  type VintageCameraModelProps,
} from "@/components/three/VintageCameraModel";

export interface CameraModelSlotProps extends VintageCameraModelProps {
  /** Optional `.glb` asset URL; defaults to `process.env.NEXT_PUBLIC_CAMERA_GLB_URL`. */
  glbUrl?: string;
}

interface GlbBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface GlbBoundaryState {
  hasError: boolean;
}

class GlbErrorBoundary extends Component<GlbBoundaryProps, GlbBoundaryState> {
  state: GlbBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlbBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Gracefully fall back to the procedural VintageCameraModel if GLB fails to load.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const TARGET_MAX_DIMENSION = 2.4;

function NormalizedGlbCamera({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = maxDim > 0 ? TARGET_MAX_DIMENSION / maxDim : 1;

    clone.scale.multiplyScalar(scaleFactor);
    clone.position.set(
      -center.x * scaleFactor,
      -center.y * scaleFactor,
      -center.z * scaleFactor
    );

    return clone;
  }, [scene]);

  return <primitive object={normalizedScene} />;
}

/**
 * Hybrid 3D camera slot: loads a configured `.glb` asset (centered at `(0,0,0)` and
 * normalized to `2.4` units) inside Suspense + ErrorBoundary, falling back immediately
 * to `<VintageCameraModel />` when no `.glb` is configured or when loading fails.
 */
export function CameraModelSlot({
  glbUrl,
  shutterPressAmount = 0,
  stripOutAmount = 0,
  reducedMotion = false,
}: CameraModelSlotProps) {
  const resolvedUrl = (glbUrl ?? process.env.NEXT_PUBLIC_CAMERA_GLB_URL ?? "").trim();

  const proceduralFallback = (
    <VintageCameraModel
      shutterPressAmount={shutterPressAmount}
      stripOutAmount={stripOutAmount}
      reducedMotion={reducedMotion}
    />
  );

  if (!resolvedUrl) {
    return proceduralFallback;
  }

  return (
    <GlbErrorBoundary fallback={proceduralFallback}>
      <Suspense fallback={proceduralFallback}>
        <NormalizedGlbCamera url={resolvedUrl} />
      </Suspense>
    </GlbErrorBoundary>
  );
}
