"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { PhysicalPrintCard } from "@/components/three/PhysicalPrintCard";
import { WebGLErrorBoundary } from "@/components/three/WebGLErrorBoundary";
import {
  computeHeroCardPose,
  getHeroTemplateCaption,
  getHeroTemplateSamplePhotos,
  selectHeroShowcaseTemplates,
} from "@/features/home/hero-showcase";
import { SAMPLE_PHOTO_URLS } from "@/lib/catalog-data";
import { createPaperGrainBumpTexture, isDarkHex } from "@/lib/print-card-3d";
import { isWebGLAvailable } from "@/lib/webgl-support";
import type { PublicTemplate } from "@/types/catalog";
import styles from "./HeroPhotoboothStage.module.css";

export interface HeroPhotoboothStageProps {
  templates: PublicTemplate[];
}

interface HeroCardSlotProps {
  template: PublicTemplate;
  cardIndex: number;
  activeIndex: number;
  totalCount: number;
  isHovered: boolean;
  isFlipped: boolean;
  reducedMotion: boolean;
  scrollProgressRef: RefObject<number>;
  paperGrainTexture: THREE.CanvasTexture | null;
  onCardClick: (index: number) => void;
  onCardHoverChange: (index: number, hovered: boolean) => void;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function HeroCardSlot({
  template,
  cardIndex,
  activeIndex,
  totalCount,
  isHovered,
  isFlipped,
  reducedMotion,
  scrollProgressRef,
  paperGrainTexture,
  onCardClick,
  onCardHoverChange,
}: HeroCardSlotProps) {
  const groupRef = useRef<THREE.Group>(null);
  const isFront = cardIndex === activeIndex;

  const slotPhotos = useMemo(
    () => getHeroTemplateSamplePhotos(template, cardIndex),
    [template, cardIndex]
  );
  const caption = useMemo(() => getHeroTemplateCaption(template), [template]);

  const targetPose = computeHeroCardPose(
    cardIndex,
    activeIndex,
    totalCount,
    isHovered,
    isFront && isFlipped
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    const speed = reducedMotion ? 20 : 9.5;
    const scrollP = reducedMotion ? 0 : scrollProgressRef.current;

    const envX = (cardIndex - 1) * 0.03;
    const envY = -0.22 - cardIndex * 0.015;
    const envZ = 0.0 + cardIndex * 0.03;
    const envScale = 0.66;

    let tx: number;
    let ty: number;
    let tz: number;
    let rx: number;
    let ry: number;
    let rz: number;
    let sc: number;

    if (cardIndex === 0) {
      // Card 1: glides smoothly into the envelope first
      const tuck = smoothstep(0.14, 0.3, scrollP);
      const liftArc = Math.sin(tuck * Math.PI) * 0.25;
      tx = THREE.MathUtils.lerp(targetPose.position[0], envX, tuck);
      ty = THREE.MathUtils.lerp(targetPose.position[1], envY, tuck) + liftArc;
      tz = THREE.MathUtils.lerp(targetPose.position[2], envZ, tuck);
      rx = THREE.MathUtils.lerp(targetPose.rotation[0], 0, tuck);
      ry = THREE.MathUtils.lerp(targetPose.rotation[1], 0, tuck);
      rz = THREE.MathUtils.lerp(targetPose.rotation[2], 0, tuck);
      sc = THREE.MathUtils.lerp(targetPose.scale, envScale, tuck);
    } else {
      // Card 2 & Card 3: Phase 1 rises up above the envelope mouth, Phase 2 glides slowly down inside
      const startP = cardIndex === 1 ? 0.26 : 0.44;
      const midP = startP + 0.11;
      const endP = startP + 0.26;

      const lift = smoothstep(startP, midP, scrollP);
      const drop = smoothstep(midP, endP, scrollP);
      const hoverY = 1.48;

      tx = THREE.MathUtils.lerp(targetPose.position[0], envX, lift);
      const risenY = THREE.MathUtils.lerp(targetPose.position[1], hoverY, lift);
      ty = THREE.MathUtils.lerp(risenY, envY, drop);
      tz = THREE.MathUtils.lerp(targetPose.position[2], envZ, lift);

      rx = THREE.MathUtils.lerp(targetPose.rotation[0], 0, lift);
      ry = THREE.MathUtils.lerp(targetPose.rotation[1], 0, lift);
      rz = THREE.MathUtils.lerp(targetPose.rotation[2], 0, lift);
      const midScale = THREE.MathUtils.lerp(targetPose.scale, 0.78, lift);
      sc = THREE.MathUtils.lerp(midScale, envScale, drop);
    }

    group.position.x = THREE.MathUtils.damp(group.position.x, tx, speed, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, ty, speed, dt);
    group.position.z = THREE.MathUtils.damp(group.position.z, tz, speed, dt);

    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, rx, speed, dt);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, ry, speed, dt);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, rz, speed, dt);

    const nextScale = THREE.MathUtils.damp(group.scale.x, sc, speed, dt);
    group.scale.setScalar(nextScale);
  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        if (scrollProgressRef.current > 0.04) return;
        event.stopPropagation();
        onCardClick(cardIndex);
      }}
      onPointerOver={(event) => {
        if (scrollProgressRef.current > 0.04) return;
        event.stopPropagation();
        onCardHoverChange(cardIndex, true);
      }}
      onPointerOut={(event) => {
        if (scrollProgressRef.current > 0.04) return;
        event.stopPropagation();
        onCardHoverChange(cardIndex, false);
      }}
    >
      <PhysicalPrintCard
        template={template}
        slotPhotoUrls={slotPhotos}
        caption={caption}
        coverType="hard"
        paperType="premium"
        paperGrainTexture={paperGrainTexture}
        maxHeight={2.35}
        maxWidth={1.85}
        clearcoatStrength={0.62}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

function createEnvelopeFrontTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 624;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Warm ivory paper background
  ctx.fillStyle = "#F6EFE6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle gold inner border
  ctx.strokeStyle = "rgba(197, 155, 56, 0.45)";
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Pause monogram badge + wordmark centered in lower portion (visible even when flap closes)
  const cx = canvas.width / 2;
  const badgeY = 432;
  const badgeSize = 58;
  const bx = cx - badgeSize / 2;
  const by = badgeY - badgeSize / 2;

  ctx.fillStyle = "#630D11";
  ctx.beginPath();
  ctx.roundRect(bx, by, badgeSize, badgeSize, 12);
  ctx.fill();

  ctx.strokeStyle = "#C59B38";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '800 34px "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("P", cx, badgeY + 1);

  ctx.fillStyle = "#630D11";
  ctx.font = '800 34px "Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif';
  ctx.fillText("PAUSE", cx, badgeY + 62);

  ctx.fillStyle = "#8A6D3B";
  ctx.font = '500 20px "Be Vietnam Pro", system-ui, sans-serif';
  ctx.fillText("Pause the moment, keep the feeling", cx, badgeY + 98);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function KeepsakeEnvelope3D({
  scrollProgressRef,
  reducedMotion,
}: {
  scrollProgressRef: RefObject<number>;
  reducedMotion: boolean;
}) {
  const envGroupRef = useRef<THREE.Group>(null);
  const flapGroupRef = useRef<THREE.Group>(null);
  const [frontTexture, setFrontTexture] = useState<THREE.CanvasTexture | null>(null);

  const flapGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-1.2, 0);
    shape.lineTo(1.2, 0);
    shape.lineTo(0, -1.02);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useEffect(() => {
    const tex = createEnvelopeFrontTexture();
    setFrontTexture(tex);
    return () => {
      tex?.dispose();
      flapGeometry.dispose();
    };
  }, [flapGeometry]);

  useFrame((_, delta) => {
    const env = envGroupRef.current;
    const flap = flapGroupRef.current;
    if (!env || !flap) return;

    const dt = Math.min(delta, 0.05);
    const p = reducedMotion ? 0 : scrollProgressRef.current;

    const rise = smoothstep(0.05, 0.22, p);
    const closeFlap = smoothstep(0.7, 0.86, p);

    env.visible = rise > 0.01;

    const targetY = THREE.MathUtils.lerp(-3.4, -0.22, rise);
    const targetScale = THREE.MathUtils.lerp(0.76, 1.0, rise);
    // Open straight up BEHIND the cards (Math.PI at z = -0.08) -> fold forward OVER the front pocket (0 at z = +0.175)
    const targetFlapRotX = THREE.MathUtils.lerp(Math.PI, 0, closeFlap);
    const targetFlapZ = THREE.MathUtils.lerp(-0.08, 0.175, smoothstep(0.55, 0.72, p));

    env.position.y = THREE.MathUtils.damp(env.position.y, targetY, 9, dt);
    const nextScale = THREE.MathUtils.damp(env.scale.x, targetScale, 9, dt);
    env.scale.setScalar(nextScale);
    flap.rotation.x = THREE.MathUtils.damp(flap.rotation.x, targetFlapRotX, 9, dt);
    flap.position.z = THREE.MathUtils.damp(flap.position.z, targetFlapZ, 12, dt);
  });

  return (
    <group ref={envGroupRef} position={[0, -3.4, 0]} visible={false}>
      {/* Envelope inner back panel (warm linen interior) */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[2.4, 1.95]} />
        <meshStandardMaterial color="#E5D9C8" roughness={0.9} />
      </mesh>

      {/* Envelope front pocket with printed Pause logo */}
      <mesh position={[0, 0, 0.16]}>
        <planeGeometry args={[2.4, 1.95]} />
        <meshStandardMaterial
          map={frontTexture}
          color="#FFFFFF"
          roughness={0.85}
        />
      </mesh>

      {/* Subtle gold foil hairline along the pocket top edge */}
      <mesh position={[0, 0.96, 0.165]}>
        <planeGeometry args={[2.4, 0.028]} />
        <meshStandardMaterial color="#C59B38" roughness={0.4} metalness={0.35} />
      </mesh>

      {/* Hinged top triangular flap anchored to the BACK panel when open so it NEVER overlaps Card 1 */}
      <group ref={flapGroupRef} position={[0, 0.975, -0.08]} rotation={[Math.PI, 0, 0]}>
        <mesh geometry={flapGeometry} position={[0, 0, 0]}>
          <meshStandardMaterial
            color="#EFE6DA"
            roughness={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Pause Wine wax seal at the tip of the flap */}
        <mesh position={[0, -0.92, 0.012]}>
          <circleGeometry args={[0.16, 32]} />
          <meshStandardMaterial color="#630D11" roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.92, 0.016]}>
          <ringGeometry args={[0.11, 0.135, 32]} />
          <meshStandardMaterial color="#D4AF37" roughness={0.4} metalness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

interface HeroClusterRigProps {
  cards: PublicTemplate[];
  activeIndex: number;
  hoveredCardIndex: number | null;
  isFlipped: boolean;
  pointerRef: RefObject<{ x: number; y: number }>;
  scrollProgressRef: RefObject<number>;
  reducedMotion: boolean;
  onCardClick: (index: number) => void;
  onCardHoverChange: (index: number, hovered: boolean) => void;
}

function HeroClusterRig({
  cards,
  activeIndex,
  hoveredCardIndex,
  isFlipped,
  pointerRef,
  scrollProgressRef,
  reducedMotion,
  onCardClick,
  onCardHoverChange,
}: HeroClusterRigProps) {
  const clusterRef = useRef<THREE.Group>(null);
  const sheenLightRef = useRef<THREE.PointLight>(null);
  const grainRef = useRef<THREE.CanvasTexture | null>(null);
  const [paperGrainTexture, setPaperGrainTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const grain = createPaperGrainBumpTexture();
    grainRef.current = grain;
    setPaperGrainTexture(grain);

    return () => {
      grainRef.current?.dispose();
      grainRef.current = null;
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const cluster = clusterRef.current;
    const sheenLight = sheenLightRef.current;

    const px = pointerRef.current.x;
    const py = pointerRef.current.y;

    if (cluster) {
      const floatY = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.15) * 0.025;
      const targetRotY = reducedMotion ? 0 : px * 0.14;
      const targetRotX = reducedMotion ? 0 : -py * 0.085;
      const speed = reducedMotion ? 16 : 7;

      cluster.position.y = THREE.MathUtils.damp(cluster.position.y, floatY, speed, dt);
      cluster.rotation.y = THREE.MathUtils.damp(cluster.rotation.y, targetRotY, speed, dt);
      cluster.rotation.x = THREE.MathUtils.damp(cluster.rotation.x, targetRotX, speed, dt);
    }

    if (sheenLight) {
      const targetLightX = reducedMotion ? 1.8 : px * 4.1;
      const targetLightY = reducedMotion ? 1.4 : 0.9 - py * 2.3;
      const lightSpeed = reducedMotion ? 16 : 8;

      sheenLight.position.x = THREE.MathUtils.damp(
        sheenLight.position.x,
        targetLightX,
        lightSpeed,
        dt
      );
      sheenLight.position.y = THREE.MathUtils.damp(
        sheenLight.position.y,
        targetLightY,
        lightSpeed,
        dt
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.44} color="#FFF8F0" />
      <directionalLight position={[3.2, 4.4, 4.5]} intensity={1.05} color="#FFFDF8" />

      {/* Pointer-driven satin sheen light sweeping across 200gsm paper */}
      <pointLight
        ref={sheenLightRef}
        position={[1.4, 1.1, 3.8]}
        intensity={26}
        decay={1.55}
        distance={14}
        color="#FFF2D6"
      />

      {/* Warm champagne gold rim highlight along beveled cardstock edges */}
      <spotLight
        position={[-4.2, 3.2, -2.2]}
        intensity={20}
        decay={1.5}
        angle={0.65}
        penumbra={0.85}
        color="#F5D07A"
      />

      {/* Offline Studio Environment for satin clearcoat reflections */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={1.9}
          color="#FFFBF4"
          position={[4.2, 4.2, 4.2]}
          scale={[6, 4.5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.65}
          color="#F5D27B"
          position={[-4.5, 2.2, 2.8]}
          scale={[3, 5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#8B1D24"
          position={[0, -3.5, 3]}
          scale={[8, 3, 1]}
          target={[0, 0, 0]}
        />
      </Environment>

      <group ref={clusterRef}>
        <KeepsakeEnvelope3D
          scrollProgressRef={scrollProgressRef}
          reducedMotion={reducedMotion}
        />
        {cards.map((tpl, idx) => (
          <HeroCardSlot
            key={tpl.id}
            template={tpl}
            cardIndex={idx}
            activeIndex={activeIndex}
            totalCount={cards.length}
            isHovered={hoveredCardIndex === idx}
            isFlipped={isFlipped}
            reducedMotion={reducedMotion}
            scrollProgressRef={scrollProgressRef}
            paperGrainTexture={paperGrainTexture}
            onCardClick={onCardClick}
            onCardHoverChange={onCardHoverChange}
          />
        ))}
      </group>

      <ContactShadows
        position={[0, -1.48, 0]}
        opacity={0.38}
        scale={7.2}
        blur={2.4}
        color="#1A0305"
      />
    </>
  );
}

function HeroPhotoboothFallback2D({
  cards,
  activeIndex,
  isFlipped,
  onSelectCard,
}: {
  cards: PublicTemplate[];
  activeIndex: number;
  isFlipped: boolean;
  onSelectCard: (index: number) => void;
}) {
  return (
    <div className={styles.fallbackDeck} aria-label="Xem trước dải ảnh Photobooth 2D">
      {cards.map((tpl, idx) => {
        const total = cards.length;
        const offset = (((idx - activeIndex) % total) + total) % total;
        const posClass =
          offset === 0
            ? styles.fallbackCardFront
            : offset === 1
              ? styles.fallbackCardRight
              : styles.fallbackCardLeft;

        const isDark = isDarkHex(tpl.layout_config.background_color || "");
        const bg = tpl.layout_config.background_color || "#FFFFFF";
        const showingBack = offset === 0 && isFlipped;

        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelectCard(idx)}
            className={`${styles.fallbackCard} ${posClass}`}
            style={{
              backgroundColor: showingBack ? (isDark ? "#161414" : "#FAF7F2") : bg,
              color: showingBack
                ? isDark
                  ? "#D4AF37"
                  : "#630D11"
                : isDark
                  ? "#D4AF37"
                  : "#111111",
            }}
            aria-label={`Chọn mẫu ${tpl.name}`}
          >
            {showingBack ? (
              <div className={styles.fallbackCardBackView}>
                <strong>PAUSE</strong>
                <span>Memory Studio · 200gsm</span>
              </div>
            ) : (
              <>
                <div
                  className={`${styles.fallbackSlots} ${
                    tpl.slot_count >= 4 ? styles.fallbackSlots4 : styles.fallbackSlots2
                  }`}
                >
                  {tpl.layout_config.slots.slice(0, 4).map((slot) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={slot.index}
                      src={SAMPLE_PHOTO_URLS[(slot.index + idx) % SAMPLE_PHOTO_URLS.length]}
                      alt=""
                      className={styles.fallbackSlotImg}
                    />
                  ))}
                </div>
                <p className={styles.fallbackCardLabel}>{tpl.name}</p>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Interactive 3D cluster of 2–3 Photobooth & Polaroid prints mounted directly in the Hero right column.
 * Pointer movement sweeps studio specular reflections across the 200gsm satin paper surface.
 */
export function HeroPhotoboothStage({ templates }: HeroPhotoboothStageProps) {
  const cards = useMemo(() => selectHeroShowcaseTemplates(templates), [templates]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [webglStatus, setWebglStatus] = useState<"ready" | "unsupported" | "context-lost">(
    () => (typeof window !== "undefined" && !isWebGLAvailable() ? "unsupported" : "ready")
  );

  const pointerRef = useRef({ x: 0.22, y: -0.15 });
  const scrollProgressRef = useRef(0);
  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const stageFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebglStatus("unsupported");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || reducedMotion) {
      scrollProgressRef.current = 0;
      if (stageWrapperRef.current) {
        stageWrapperRef.current.style.opacity = "1";
      }
      return;
    }

    const handleScroll = () => {
      const heroEl = stageFrameRef.current?.closest("section");
      if (!heroEl) return;
      const rect = heroEl.getBoundingClientRect();
      const stickyTravel = rect.height - window.innerHeight;
      const travel = stickyTravel > 40 ? stickyTravel : Math.max(1, rect.height * 0.85);
      const progress = THREE.MathUtils.clamp(-rect.top / travel, 0, 1);
      scrollProgressRef.current = progress;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqCompact = window.matchMedia("(max-width: 899px)");

    const sync = () => {
      setReducedMotion(mqMotion.matches);
      setIsCompactViewport(mqCompact.matches);
    };
    sync();

    mqMotion.addEventListener("change", sync);
    mqCompact.addEventListener("change", sync);
    return () => {
      mqMotion.removeEventListener("change", sync);
      mqCompact.removeEventListener("change", sync);
    };
  }, []);

  const safeActiveIndex = cards.length > 0 ? activeIndex % cards.length : 0;
  const activeTemplate = cards[safeActiveIndex] ?? templates[0];

  const handleSelectTemplateIndex = (idx: number) => {
    if (idx === safeActiveIndex) {
      setIsFlipped((prev) => !prev);
      return;
    }
    setActiveIndex(idx);
    setIsFlipped(false);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !stageFrameRef.current) return;
    const rect = stageFrameRef.current.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    pointerRef.current = {
      x: THREE.MathUtils.clamp(nx, -1, 1),
      y: THREE.MathUtils.clamp(ny, -1, 1),
    };
  };

  const handlePointerLeave = () => {
    setHoveredCardIndex(null);
    pointerRef.current = { x: 0.22, y: -0.15 };
  };

  const handleCardHoverChange = (idx: number, hovered: boolean) => {
    setHoveredCardIndex((prev) => {
      if (hovered) return idx;
      return prev === idx ? null : prev;
    });
  };

  if (!activeTemplate) return null;

  return (
    <div
      ref={stageWrapperRef}
      className={styles.stageWrapper}
      data-testid="hero-photobooth-stage"
    >
      <div
        ref={stageFrameRef}
        className={styles.stageFrame}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: hoveredCardIndex !== null ? "pointer" : "default" }}
      >
        <div className={styles.canvasShell}>
          {webglStatus !== "ready" ? (
            <HeroPhotoboothFallback2D
              cards={cards}
              activeIndex={safeActiveIndex}
              isFlipped={isFlipped}
              onSelectCard={handleSelectTemplateIndex}
            />
          ) : (
            <WebGLErrorBoundary
              fallback={
                <HeroPhotoboothFallback2D
                  cards={cards}
                  activeIndex={safeActiveIndex}
                  isFlipped={isFlipped}
                  onSelectCard={handleSelectTemplateIndex}
                />
              }
            >
              <Canvas
                shadows
                dpr={[1, 2]}
                camera={{
                  position: [0, 0.02, isCompactViewport ? 6.2 : 5.85],
                  fov: isCompactViewport ? 38 : 36,
                  near: 0.1,
                  far: 30,
                }}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                onCreated={({ gl }) => {
                  gl.domElement.addEventListener(
                    "webglcontextlost",
                    (event) => {
                      event.preventDefault();
                      setWebglStatus("context-lost");
                    },
                    { once: true }
                  );
                }}
              >
                <HeroClusterRig
                  cards={cards}
                  activeIndex={safeActiveIndex}
                  hoveredCardIndex={hoveredCardIndex}
                  isFlipped={isFlipped}
                  pointerRef={pointerRef}
                  scrollProgressRef={scrollProgressRef}
                  reducedMotion={reducedMotion}
                  onCardClick={handleSelectTemplateIndex}
                  onCardHoverChange={handleCardHoverChange}
                />
              </Canvas>
            </WebGLErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
