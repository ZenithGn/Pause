"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { CameraModelSlot } from "@/components/three/CameraModelSlot";
import { WebGLErrorBoundary } from "@/components/three/WebGLErrorBoundary";
import {
  clamp01,
  computeCameraPoseAtScroll,
} from "@/features/home/scroll-choreography";
import styles from "./CameraScrollStage.module.css";

export { computeCameraPoseAtScroll, type CameraPose } from "@/features/home/scroll-choreography";

export interface CameraScrollStageProps {
  /** Ref to the Home sections container so scroll progress stops cleanly before Footer. */
  containerRef?: RefObject<HTMLElement | null>;
  /** `"desktop-scroll"` renders the sticky full-height overlay (`>= 900px`); `"hero-mobile"` renders inline in Hero (`< 900px`). */
  mode?: "desktop-scroll" | "hero-mobile";
  /** Optional custom `.glb` URL forwarded to `CameraModelSlot`. */
  glbUrl?: string;
}

const MAX_PARALLAX_RAD = THREE.MathUtils.degToRad(5.2); // Strictly <= 6 deg

interface StudioRigProps {
  scrollProgressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
  heroOnly: boolean;
  glbUrl?: string;
}

function CameraRig({
  scrollProgressRef,
  pointerRef,
  reducedMotion,
  heroOnly,
  glbUrl,
}: StudioRigProps) {
  const rigRef = useRef<THREE.Group>(null);
  const [stripOut, setStripOut] = useState(0);
  const [shutterPress, setShutterPress] = useState(0);
  const lastStripRef = useRef(0);
  const lastPressRef = useRef(0);

  useFrame((state, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    const progress = heroOnly ? 0 : scrollProgressRef.current;
    const pose = computeCameraPoseAtScroll(progress);

    const targetX = heroOnly ? 0 : pose.position[0];
    const targetY = heroOnly ? 0 : pose.position[1];
    const targetZ = heroOnly ? 0.35 : pose.position[2];
    const targetScale = heroOnly ? 1.05 : pose.scale;

    const floatY =
      reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.45) * 0.035;
    const parallaxX =
      reducedMotion || heroOnly ? 0 : -pointerRef.current.y * MAX_PARALLAX_RAD;
    const parallaxY =
      reducedMotion || heroOnly ? 0 : pointerRef.current.x * MAX_PARALLAX_RAD;

    const dampFactor = reducedMotion ? 16 : 6.5;

    rig.position.x = THREE.MathUtils.damp(rig.position.x, targetX, dampFactor, delta);
    rig.position.y = THREE.MathUtils.damp(
      rig.position.y,
      targetY + floatY,
      dampFactor,
      delta
    );
    rig.position.z = THREE.MathUtils.damp(rig.position.z, targetZ, dampFactor, delta);

    rig.rotation.x = THREE.MathUtils.damp(
      rig.rotation.x,
      pose.rotation[0] + parallaxX,
      dampFactor,
      delta
    );
    rig.rotation.y = THREE.MathUtils.damp(
      rig.rotation.y,
      pose.rotation[1] + parallaxY,
      dampFactor,
      delta
    );
    rig.rotation.z = THREE.MathUtils.damp(
      rig.rotation.z,
      pose.rotation[2],
      dampFactor,
      delta
    );

    const nextScale = THREE.MathUtils.damp(rig.scale.x, targetScale, dampFactor, delta);
    rig.scale.setScalar(nextScale);

    if (Math.abs(pose.stripOut - lastStripRef.current) > 0.01) {
      lastStripRef.current = pose.stripOut;
      setStripOut(pose.stripOut);
    }
    if (Math.abs(pose.shutterPress - lastPressRef.current) > 0.01) {
      lastPressRef.current = pose.shutterPress;
      setShutterPress(pose.shutterPress);
    }
  });

  return (
    <>
      {/* Offline Studio Lighting using Lightformer (0 external HDRI network calls) */}
      <ambientLight intensity={0.45} color="#FFF8F0" />
      <directionalLight position={[4, 5, 5]} intensity={1.45} color="#FFF8F0" />
      <spotLight
        position={[-4.5, 3, 3.5]}
        angle={0.5}
        penumbra={0.8}
        intensity={1.6}
        color="#F5D07A"
      />
      <pointLight position={[0, -3.5, 2.5]} intensity={0.65} color="#7A1419" />

      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#FFF8F0"
          position={[4, 5, 4]}
          scale={[6, 6, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={2.2}
          color="#F5D27B"
          position={[-4, 2, 3]}
          scale={4}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#8B1D24"
          position={[0, -4, 2]}
          scale={[8, 4, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.8}
          color="#FFFFFF"
          position={[0, 3, -5]}
          scale={[10, 4, 1]}
          target={[0, 0, 0]}
        />
      </Environment>

      <group ref={rigRef} position={heroOnly ? [0, 0, 0.35] : [1.7, 0.05, 0.3]}>
        <CameraModelSlot
          glbUrl={glbUrl}
          shutterPressAmount={heroOnly ? 0 : shutterPress}
          stripOutAmount={heroOnly ? 0 : stripOut}
          reducedMotion={reducedMotion}
        />
      </group>
    </>
  );
}

function StaticCameraFallback() {
  return (
    <div className={styles.fallbackFrame} aria-hidden="true">
      <div className={styles.editorialFallbackCard}>
        <div className={styles.editorialFallbackLens} />
        <span className={styles.editorialFallbackLabel}>PAUSE RANGEFINDER</span>
      </div>
    </div>
  );
}

/**
 * Scroll-choreographed 3D vintage camera stage.
 * - Desktop (`>= 900px`, `mode="desktop-scroll"`): sticky full-viewport stage contained inside Home sections above Footer.
 * - Mobile (`< 900px`, `mode="hero-mobile"`): contained cleanly inside the Hero so below-the-fold scrolling stays 60fps & unobstructed.
 */
export function CameraScrollStage({
  containerRef,
  mode = "desktop-scroll",
  glbUrl,
}: CameraScrollStageProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const scrollProgressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 900px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncFlags = () => {
      setIsDesktop(mqDesktop.matches);
      setReducedMotion(mqMotion.matches);
    };
    syncFlags();

    mqDesktop.addEventListener("change", syncFlags);
    mqMotion.addEventListener("change", syncFlags);
    return () => {
      mqDesktop.removeEventListener("change", syncFlags);
      mqMotion.removeEventListener("change", syncFlags);
    };
  }, []);

  useEffect(() => {
    if (mode !== "desktop-scroll" || !isDesktop) return;

    const applyBookendOpacity = (progress: number) => {
      const el = overlayRef.current;
      if (!el) return;
      // Bookend visibility: full in Hero (0..0.14), fade out over middle sections (0.24..0.78), return at Final CTA (0.88..1)
      let opacity = 1;
      if (progress > 0.14 && progress < 0.78) {
        opacity = progress < 0.24 ? 1 - (progress - 0.14) / 0.1 : 0;
      } else if (progress >= 0.78 && progress < 0.88) {
        opacity = (progress - 0.78) / 0.1;
      }
      el.style.opacity = String(clamp01(opacity));
    };

    const updateScrollProgress = () => {
      const target = containerRef?.current;
      if (target) {
        const rect = target.getBoundingClientRect();
        const scrollableHeight = Math.max(1, target.offsetHeight - window.innerHeight);
        const passed = -rect.top;
        const progress = clamp01(passed / scrollableHeight);
        scrollProgressRef.current = progress;
        applyBookendOpacity(progress);
        return;
      }

      const docScrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = clamp01(window.scrollY / docScrollable);
      scrollProgressRef.current = progress;
      applyBookendOpacity(progress);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion) return;
      const nx = (event.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (event.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      pointerRef.current = { x: nx, y: ny };
    };

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [containerRef, isDesktop, mode, reducedMotion]);

  if (mode === "desktop-scroll" && !isDesktop) {
    return null;
  }
  if (mode === "hero-mobile" && isDesktop) {
    return null;
  }

  const isHeroMobile = mode === "hero-mobile";

  return (
    <div
      ref={isHeroMobile ? undefined : overlayRef}
      className={isHeroMobile ? styles.heroMobileWrap : styles.desktopOverlay}
      aria-hidden="true"
    >
      <div className={isHeroMobile ? styles.canvasShell : styles.stickyViewport}>
        <WebGLErrorBoundary fallback={<StaticCameraFallback />}>
          <Canvas
            dpr={[1, 2]}
            camera={{
              position: isHeroMobile ? [0, 0.15, 4.4] : [0, 0.12, 5.4],
              fov: isHeroMobile ? 38 : 36,
              near: 0.1,
              far: 40,
            }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          >
            <CameraRig
              scrollProgressRef={scrollProgressRef}
              pointerRef={pointerRef}
              reducedMotion={reducedMotion}
              heroOnly={isHeroMobile}
              glbUrl={glbUrl}
            />
          </Canvas>
        </WebGLErrorBoundary>
      </div>
    </div>
  );
}
