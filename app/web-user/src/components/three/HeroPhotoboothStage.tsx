"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import Link from "next/link";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { ArrowRight, Crown, RotateCw } from "lucide-react";
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
  paperGrainTexture: THREE.CanvasTexture | null;
  onCardClick: (index: number) => void;
  onCardHoverChange: (index: number, hovered: boolean) => void;
}

function HeroCardSlot({
  template,
  cardIndex,
  activeIndex,
  totalCount,
  isHovered,
  isFlipped,
  reducedMotion,
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
    const speed = reducedMotion ? 20 : 8.5;

    group.position.x = THREE.MathUtils.damp(group.position.x, targetPose.position[0], speed, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, targetPose.position[1], speed, dt);
    group.position.z = THREE.MathUtils.damp(group.position.z, targetPose.position[2], speed, dt);

    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetPose.rotation[0], speed, dt);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetPose.rotation[1], speed, dt);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, targetPose.rotation[2], speed, dt);

    const nextScale = THREE.MathUtils.damp(group.scale.x, targetPose.scale, speed, dt);
    group.scale.setScalar(nextScale);
  });

  return (
    <group
      ref={groupRef}
      position={targetPose.position}
      rotation={targetPose.rotation}
      scale={targetPose.scale}
      onClick={(event) => {
        event.stopPropagation();
        onCardClick(cardIndex);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onCardHoverChange(cardIndex, true);
      }}
      onPointerOut={(event) => {
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

interface HeroClusterRigProps {
  cards: PublicTemplate[];
  activeIndex: number;
  hoveredCardIndex: number | null;
  isFlipped: boolean;
  pointerRef: RefObject<{ x: number; y: number }>;
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
  const stageFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebglStatus("unsupported");
    }
  }, []);

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
    <div className={styles.stageWrapper} data-testid="hero-photobooth-stage">
      <div
        ref={stageFrameRef}
        className={styles.stageFrame}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ cursor: hoveredCardIndex !== null ? "pointer" : "default" }}
      >
        <div className={styles.stageTopBar}>
          <span className={styles.interactionHint}>
            Rê chuột soi sáng · Bấm thẻ đổi mẫu
          </span>
        </div>

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
                  reducedMotion={reducedMotion}
                  onCardClick={handleSelectTemplateIndex}
                  onCardHoverChange={handleCardHoverChange}
                />
              </Canvas>
            </WebGLErrorBoundary>
          )}
        </div>

        <div className={styles.stageBottomMeta}>
          <div className={styles.activeLabel}>
            {activeTemplate.is_premium ? (
              <span className={styles.activeLabelVip}>VIP ·</span>
            ) : null}
            <span>
              {activeTemplate.name} ({activeTemplate.slot_count} ảnh)
            </span>
          </div>

          <Link
            href={`/preview?template=${encodeURIComponent(activeTemplate.id)}`}
            className={styles.studioLink}
          >
            <span>Thử ảnh của bạn</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Quick 3-template switcher + front/back flip controls */}
      <div className={styles.controlsBar} aria-label="Chọn nhanh mẫu Photobooth trên Hero">
        <div className={styles.templatePills} role="group" aria-label="Mẫu trưng bày">
          {cards.map((tpl, idx) => {
            const isActive = idx === safeActiveIndex;
            return (
              <button
                key={tpl.id}
                type="button"
                aria-pressed={isActive}
                className={`${styles.templatePill} ${
                  isActive ? styles.templatePillActive : ""
                }`}
                onClick={() => {
                  setActiveIndex(idx);
                  setIsFlipped(false);
                }}
              >
                {tpl.is_premium ? <Crown size={13} aria-hidden="true" /> : null}
                <span>{tpl.name}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-pressed={isFlipped}
          className={`${styles.flipButton} ${isFlipped ? styles.flipButtonActive : ""}`}
          onClick={() => setIsFlipped((prev) => !prev)}
        >
          <RotateCw size={14} aria-hidden="true" />
          <span>{isFlipped ? "Xem mặt trước" : "Lật mặt sau"}</span>
        </button>
      </div>
    </div>
  );
}
