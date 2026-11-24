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
import { isWebGLAvailable } from "@/lib/webgl-support";
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
const DESKTOP_CAMERA_Z = 6.4;
const DESKTOP_CAMERA_FOV = 35;
const DESKTOP_X_FACTOR = 0.78;
const DESKTOP_SCALE_FACTOR = 0.88;

function getVisibleWorldHeight(cameraZ: number, fovDeg: number): number {
  return 2 * cameraZ * Math.tan(THREE.MathUtils.degToRad(fovDeg / 2));
}

interface StudioRigProps {
  scrollProgressRef: RefObject<number>;
  zoneOffsetYRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  reducedMotion: boolean;
  heroOnly: boolean;
  glbUrl?: string;
}

function CameraRig({
  scrollProgressRef,
  zoneOffsetYRef,
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

    const targetX = heroOnly ? 0 : pose.position[0] * DESKTOP_X_FACTOR;
    const targetY = heroOnly ? 0 : pose.position[1] + zoneOffsetYRef.current;
    const targetZ = heroOnly ? 0.25 : pose.position[2] * 0.4;
    const targetScale = heroOnly ? 1.0 : pose.scale * DESKTOP_SCALE_FACTOR;

    const floatY =
      reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.45) * 0.032;
    const parallaxX =
      reducedMotion || heroOnly ? 0 : -pointerRef.current.y * MAX_PARALLAX_RAD;
    const parallaxY =
      reducedMotion || heroOnly ? 0 : pointerRef.current.x * MAX_PARALLAX_RAD;

    const dampFactor = reducedMotion ? 16 : 7.5;

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
      {/* Offline Studio Lighting using oblique Lightformer softboxes (0 external HDRI calls) */}
      <ambientLight intensity={0.48} color="#FFF8F0" />
      <directionalLight position={[4, 5, 5]} intensity={1.5} color="#FFF8F0" />
      <spotLight
        position={[-4.5, 3, 3.5]}
        angle={0.5}
        penumbra={0.8}
        intensity={1.65}
        color="#F5D07A"
      />
      <pointLight position={[0, -3.5, 2.5]} intensity={0.65} color="#7A1419" />

      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.8}
          color="#FFF9F2"
          position={[4.2, 5.2, 3.8]}
          scale={[6.5, 3.5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.3}
          color="#F5D27B"
          position={[-5.4, 2.6, 2.2]}
          scale={[2.6, 5.5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          color="#8B1D24"
          position={[0, -4.5, 2.2]}
          scale={[8, 4, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.0}
          color="#FFFFFF"
          position={[0, 3.5, -5.5]}
          scale={[10, 4, 1]}
          target={[0, 0, 0]}
        />
      </Environment>

      <group
        ref={rigRef}
        position={heroOnly ? [0, 0, 0.25] : [1.7 * DESKTOP_X_FACTOR, 0.05, 0.12]}
        scale={heroOnly ? 1.0 : DESKTOP_SCALE_FACTOR}
      >
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
 * - Desktop (`>= 900px`, `mode="desktop-scroll"`): sticky full-viewport stage aligned cleanly
 *   inside the Hero & Final CTA dark-wine bookends so it never overlaps middle copy or clips into Footer.
 * - Mobile (`< 900px`, `mode="hero-mobile"`): contained cleanly inside the Hero so below-the-fold scrolling stays 60fps & unobstructed.
 */
export function CameraScrollStage({
  containerRef,
  mode = "desktop-scroll",
  glbUrl,
}: CameraScrollStageProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglReady, setWebglReady] = useState(true);
  const scrollProgressRef = useRef(0);
  const zoneOffsetYRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWebglReady(isWebGLAvailable());
  }, []);

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

    const visibleWorldHeight = getVisibleWorldHeight(
      DESKTOP_CAMERA_Z,
      DESKTOP_CAMERA_FOV
    );

    const syncZoneAlignment = (progress: number) => {
      const el = overlayRef.current;
      if (!el) return;

      const target = containerRef?.current;
      const vh = Math.max(1, window.innerHeight);

      if (target) {
        const heroEl = target.querySelector<HTMLElement>('[data-camera-zone="hero"]');
        const ctaEl = target.querySelector<HTMLElement>('[data-camera-zone="cta"]');

        if (heroEl && ctaEl) {
          const heroRect = heroEl.getBoundingClientRect();
          const ctaRect = ctaEl.getBoundingClientRect();

          // Hero bookend: full opacity while Hero occupies >= 82% of viewport,
          // completely hidden before Hero bottom crosses 62% so Features never overlaps the camera.
          const heroOpacity = clamp01((heroRect.bottom - vh * 0.62) / (vh * 0.22));

          // Final CTA bookend: appears smoothly once Final CTA rises past 65% of viewport height
          // and stays aligned to the CTA card center so Pricing & Footer never clip the camera.
          const ctaOpacity = clamp01((vh * 0.65 - ctaRect.top) / (vh * 0.28));

          const opacity = Math.max(heroOpacity, ctaOpacity);
          el.style.opacity = String(opacity);
          el.style.visibility = opacity < 0.01 ? "hidden" : "visible";

          if (ctaOpacity >= heroOpacity && ctaOpacity > 0.01) {
            const stickyRect = stickyRef.current?.getBoundingClientRect();
            const stickyHeight =
              stickyRect && stickyRect.height > 0 ? stickyRect.height : vh;
            const stickyCenterY = stickyRect
              ? stickyRect.top + stickyHeight / 2
              : vh / 2;
            const ctaCenterY = (ctaRect.top + ctaRect.bottom) / 2;
            const normOffset = (stickyCenterY - ctaCenterY) / stickyHeight;
            zoneOffsetYRef.current = THREE.MathUtils.clamp(
              normOffset * visibleWorldHeight,
              -1.5,
              1.5
            );
          } else {
            zoneOffsetYRef.current = 0;
          }
          return;
        }
      }

      // Fallback when data-camera-zone markers are unavailable
      let opacity = 1;
      if (progress > 0.1 && progress < 0.8) {
        opacity = progress < 0.16 ? 1 - (progress - 0.1) / 0.06 : 0;
      } else if (progress >= 0.8 && progress < 0.9) {
        opacity = (progress - 0.8) / 0.1;
      }
      el.style.opacity = String(clamp01(opacity));
      el.style.visibility = opacity < 0.01 ? "hidden" : "visible";
      zoneOffsetYRef.current = 0;
    };

    const updateScrollProgress = () => {
      const target = containerRef?.current;
      if (target) {
        const rect = target.getBoundingClientRect();
        const scrollableHeight = Math.max(1, target.offsetHeight - window.innerHeight);
        const passed = -rect.top;
        const progress = clamp01(passed / scrollableHeight);
        scrollProgressRef.current = progress;
        syncZoneAlignment(progress);
        return;
      }

      const docScrollable = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = clamp01(window.scrollY / docScrollable);
      scrollProgressRef.current = progress;
      syncZoneAlignment(progress);
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
      <div
        ref={isHeroMobile ? undefined : stickyRef}
        className={isHeroMobile ? styles.canvasShell : styles.stickyViewport}
      >
        {!webglReady ? (
          <StaticCameraFallback />
        ) : (
          <WebGLErrorBoundary fallback={<StaticCameraFallback />}>
            <Canvas
              dpr={[1, 2]}
              camera={{
                position: isHeroMobile
                  ? [0, 0.12, 4.7]
                  : [0, 0.08, DESKTOP_CAMERA_Z],
                fov: isHeroMobile ? 38 : DESKTOP_CAMERA_FOV,
                near: 0.1,
                far: 40,
              }}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener(
                  "webglcontextlost",
                  (event) => {
                    event.preventDefault();
                    setWebglReady(false);
                  },
                  { once: true }
                );
              }}
            >
              <CameraRig
                scrollProgressRef={scrollProgressRef}
                zoneOffsetYRef={zoneOffsetYRef}
                pointerRef={pointerRef}
                reducedMotion={reducedMotion}
                heroOnly={isHeroMobile}
                glbUrl={glbUrl}
              />
            </Canvas>
          </WebGLErrorBoundary>
        )}
      </div>
    </div>
  );
}
