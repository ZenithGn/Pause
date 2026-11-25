"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  buildBackCardCanvasTexture,
  buildFrontCardCanvasTexture,
  computePrintCardDimensions,
  createPaperGrainBumpTexture,
} from "@/lib/print-card-3d";
import type { CoverType, PaperType, PhotoTone, PublicTemplate } from "@/types/catalog";

export interface PhysicalPrintCardProps {
  template: PublicTemplate;
  slotPhotoUrls: Record<number, string>;
  caption?: string;
  photoTone?: PhotoTone;
  coverType: CoverType;
  paperType: PaperType;
  /** Shared paper grain bump texture (if omitted, creates & disposes a local one). */
  paperGrainTexture?: THREE.CanvasTexture | null;
  maxHeight?: number;
  maxWidth?: number;
  /** Satin clearcoat strength on 200gsm art paper (0..1). */
  clearcoatStrength?: number;
  /** Enables gentle scale/twist spring when switching templates in the same slot. */
  enableSwitchPulse?: boolean;
  reducedMotion?: boolean;
  position?: [number, number, number];
}

/**
 * Shared 3D physical Photobooth / Polaroid print card backed by `template-canvas.ts`
 * with tactile cardstock edge thickness, satin 200gsm clearcoat sheen, and Pause back watermark.
 */
export function PhysicalPrintCard({
  template,
  slotPhotoUrls,
  caption = "",
  photoTone = "original",
  coverType,
  paperType,
  paperGrainTexture: externalGrainTexture,
  maxHeight = 3.2,
  maxWidth = 3.2,
  clearcoatStrength = 0.48,
  enableSwitchPulse = false,
  reducedMotion = false,
  position = [0, 0, 0],
}: PhysicalPrintCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const loadedImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const frontTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const backTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const localGrainRef = useRef<THREE.CanvasTexture | null>(null);

  const [frontTexture, setFrontTexture] = useState<THREE.CanvasTexture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.CanvasTexture | null>(null);
  const [localGrainTexture, setLocalGrainTexture] = useState<THREE.CanvasTexture | null>(null);

  const transitionScaleRef = useRef(enableSwitchPulse ? 0.94 : 1);
  const transitionTwistRef = useRef(0);
  const prevTemplateIdRef = useRef(template.id);

  useEffect(() => {
    if (prevTemplateIdRef.current !== template.id) {
      prevTemplateIdRef.current = template.id;
      if (enableSwitchPulse && !reducedMotion) {
        transitionScaleRef.current = 0.92;
        transitionTwistRef.current = 0.22;
      }
    }
  }, [template.id, enableSwitchPulse, reducedMotion]);

  // Only allocate a local grain texture when the parent did not share one
  useEffect(() => {
    if (externalGrainTexture !== undefined) {
      return;
    }
    const grain = createPaperGrainBumpTexture();
    localGrainRef.current = grain;
    setLocalGrainTexture(grain);

    return () => {
      localGrainRef.current?.dispose();
      localGrainRef.current = null;
    };
  }, [externalGrainTexture]);

  const activeGrainTexture =
    externalGrainTexture !== undefined ? externalGrainTexture : localGrainTexture;

  // Build & dispose front CanvasTexture whenever template, photos, or caption changes
  useEffect(() => {
    let cancelled = false;

    async function buildFront() {
      const texture = await buildFrontCardCanvasTexture(
        template,
        slotPhotoUrls,
        caption,
        loadedImageCacheRef.current,
        () => cancelled,
        photoTone
      );
      if (!texture || cancelled) {
        texture?.dispose();
        return;
      }

      const previous = frontTextureRef.current;
      frontTextureRef.current = texture;
      setFrontTexture(texture);
      if (previous && previous !== texture) {
        previous.dispose();
      }
    }

    void buildFront();

    return () => {
      cancelled = true;
    };
  }, [template, slotPhotoUrls, caption, photoTone]);

  // Build & dispose back CanvasTexture whenever template changes
  useEffect(() => {
    const texture = buildBackCardCanvasTexture(template);
    const previous = backTextureRef.current;
    backTextureRef.current = texture;
    setBackTexture(texture);
    if (previous && previous !== texture) {
      previous.dispose();
    }
  }, [template]);

  // Dispose textures & image cache on unmount
  useEffect(() => {
    const cache = loadedImageCacheRef.current;
    return () => {
      frontTextureRef.current?.dispose();
      frontTextureRef.current = null;
      backTextureRef.current?.dispose();
      backTextureRef.current = null;
      cache.clear();
    };
  }, []);

  const dims = useMemo(
    () => computePrintCardDimensions(template, coverType, maxHeight, maxWidth),
    [template, coverType, maxHeight, maxWidth]
  );

  useFrame((_, delta) => {
    if (!enableSwitchPulse) return;
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.05);
    transitionScaleRef.current = THREE.MathUtils.damp(
      transitionScaleRef.current,
      1,
      8,
      dt
    );
    group.scale.setScalar(transitionScaleRef.current);

    transitionTwistRef.current = THREE.MathUtils.damp(
      transitionTwistRef.current,
      0,
      7.5,
      dt
    );
    group.rotation.y =
      Math.abs(transitionTwistRef.current) > 0.0005 ? transitionTwistRef.current : 0;
  });

  const placeholderFaceColor = template.layout_config.background_color || "#FFFFFF";

  return (
    <group ref={groupRef} position={position}>
      {/* Physical cardstock core */}
      <RoundedBox
        args={[dims.cardWidth, dims.cardHeight, dims.cardDepth]}
        radius={dims.edgeRadius}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={dims.isGoldEdge ? "#C59B38" : "#E8E2D7"}
          roughness={dims.isGoldEdge ? 0.28 : 0.7}
          metalness={dims.isGoldEdge ? 0.8 : 0.04}
        />
      </RoundedBox>

      {/* Front printed face */}
      <mesh position={[0, 0, dims.frontZ]}>
        <planeGeometry args={[dims.faceWidth, dims.faceHeight]} />
        {paperType === "premium" ? (
          <meshPhysicalMaterial
            key={`front-premium-${template.id}-${activeGrainTexture ? "g" : "n"}-${frontTexture ? "m1" : "m0"}`}
            map={frontTexture}
            color={frontTexture ? "#FFFFFF" : placeholderFaceColor}
            bumpMap={activeGrainTexture ?? undefined}
            bumpScale={0.009}
            roughness={0.34}
            metalness={0.04}
            clearcoat={clearcoatStrength}
            clearcoatRoughness={0.21}
            envMapIntensity={1.15}
          />
        ) : (
          <meshStandardMaterial
            key={`front-standard-${template.id}-${frontTexture ? "m1" : "m0"}`}
            map={frontTexture}
            color={frontTexture ? "#FFFFFF" : placeholderFaceColor}
            roughness={0.78}
            metalness={0.01}
          />
        )}
      </mesh>

      {/* Back watermark face */}
      <mesh position={[0, 0, dims.backZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[dims.faceWidth, dims.faceHeight]} />
        {paperType === "premium" ? (
          <meshPhysicalMaterial
            key={`back-premium-${template.id}-${activeGrainTexture ? "g" : "n"}-${backTexture ? "m1" : "m0"}`}
            map={backTexture}
            color={backTexture ? "#FFFFFF" : "#FAF7F2"}
            bumpMap={activeGrainTexture ?? undefined}
            bumpScale={0.007}
            roughness={0.4}
            metalness={0.04}
            clearcoat={clearcoatStrength * 0.8}
            clearcoatRoughness={0.24}
            envMapIntensity={1.05}
          />
        ) : (
          <meshStandardMaterial
            key={`back-standard-${template.id}-${backTexture ? "m1" : "m0"}`}
            map={backTexture}
            color={backTexture ? "#FFFFFF" : "#FAF7F2"}
            roughness={0.8}
            metalness={0.01}
          />
        )}
      </mesh>
    </group>
  );
}
