"use client";

import {
  type ComponentRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { RotateCw, Sun, Sparkles } from "lucide-react";
import * as THREE from "three";
import { PrintPreviewFallback2D } from "@/components/three/PrintPreviewFallback2D";
import {
  createPaperGrainCanvas,
  renderBackTemplateCanvas,
  renderFrontTemplateCanvas,
  type SlotImageSource,
} from "@/lib/template-canvas";
import { isWebGLAvailable } from "@/lib/webgl-support";
import type { CoverType, PaperType, PublicTemplate } from "@/types/catalog";
import styles from "./PrintPreviewScene3D.module.css";

export type CameraAnglePreset = "front" | "back" | "three-quarter";
export type LightingMode = "studio" | "warm";

export interface PrintPreviewScene3DProps {
  template: PublicTemplate;
  slotPhotoUrls: Record<number, string>;
  caption: string;
  coverType: CoverType;
  paperType: PaperType;
}

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

const CAMERA_PRESETS: Record<CameraAnglePreset, [number, number, number]> = {
  front: [0, 0, 5.2],
  back: [0, 0, -5.2],
  "three-quarter": [2.35, 0.72, 4.58],
};

function isDarkHex(hex: string): boolean {
  const cleaned = hex.trim().replace(/^#/, "");
  if (cleaned.length !== 3 && cleaned.length !== 6) return false;
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : cleaned;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35;
}

function loadImageElement(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

interface PrintCardMeshProps {
  template: PublicTemplate;
  slotPhotoUrls: Record<number, string>;
  caption: string;
  coverType: CoverType;
  paperType: PaperType;
  reducedMotion: boolean;
}

function PrintCardMesh({
  template,
  slotPhotoUrls,
  caption,
  coverType,
  paperType,
  reducedMotion,
}: PrintCardMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const loadedImageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const frontTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const backTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const grainTextureRef = useRef<THREE.CanvasTexture | null>(null);

  const [frontTexture, setFrontTexture] = useState<THREE.CanvasTexture | null>(null);
  const [backTexture, setBackTexture] = useState<THREE.CanvasTexture | null>(null);
  const [paperGrainTexture, setPaperGrainTexture] = useState<THREE.CanvasTexture | null>(null);

  // Subtle transition pulse on template switch (always settles cleanly back to 0 rotation)
  const transitionScaleRef = useRef(0.94);
  const transitionTwistRef = useRef(0);
  const prevTemplateIdRef = useRef(template.id);

  useEffect(() => {
    if (prevTemplateIdRef.current !== template.id) {
      prevTemplateIdRef.current = template.id;
      if (!reducedMotion) {
        transitionScaleRef.current = 0.92;
        transitionTwistRef.current = 0.22;
      }
    }
  }, [template.id, reducedMotion]);

  // Create deterministic 200gsm paper grain bump texture once
  useEffect(() => {
    const grainCanvas = createPaperGrainCanvas(256);
    const grain = new THREE.CanvasTexture(grainCanvas);
    grain.wrapS = THREE.RepeatWrapping;
    grain.wrapT = THREE.RepeatWrapping;
    grain.repeat.set(4, 4);
    grain.needsUpdate = true;
    grainTextureRef.current = grain;
    setPaperGrainTexture(grain);

    return () => {
      grainTextureRef.current?.dispose();
      grainTextureRef.current = null;
    };
  }, []);

  // Build & dispose front CanvasTexture whenever template, photos, or caption changes
  useEffect(() => {
    let cancelled = false;

    async function buildFront() {
      const activeUrls = new Set(
        Object.values(slotPhotoUrls).filter((u): u is string => Boolean(u))
      );

      // Prune stale cached images (especially revoked object URLs)
      for (const cachedUrl of loadedImageCacheRef.current.keys()) {
        if (!activeUrls.has(cachedUrl)) {
          loadedImageCacheRef.current.delete(cachedUrl);
        }
      }

      const entries = Object.entries(slotPhotoUrls);
      const loadedPairs = await Promise.all(
        entries.map(async ([idxStr, url]) => {
          const idx = Number(idxStr);
          if (!url) return [idx, null] as const;

          const cached = loadedImageCacheRef.current.get(url);
          if (cached) {
            return [idx, cached] as const;
          }

          const img = await loadImageElement(url);
          if (img && !cancelled) {
            loadedImageCacheRef.current.set(url, img);
          }
          return [idx, img] as const;
        })
      );

      if (cancelled) return;

      const slotSources: Record<number, SlotImageSource> = {};
      for (const [idx, img] of loadedPairs) {
        if (img) {
          slotSources[idx] = img;
        }
      }

      const canvas = await renderFrontTemplateCanvas(template, slotSources, caption);
      if (cancelled) return;

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;

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
  }, [template, slotPhotoUrls, caption]);

  // Build & dispose back CanvasTexture whenever template changes
  useEffect(() => {
    const canvas = renderBackTemplateCanvas(template);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    const previous = backTextureRef.current;
    backTextureRef.current = texture;
    setBackTexture(texture);
    if (previous && previous !== texture) {
      previous.dispose();
    }
  }, [template]);

  // Dispose active front/back textures on unmount
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

  const { cardWidth, cardHeight, cardDepth, edgeRadius, isGoldEdge } = useMemo(() => {
    const cfg = template.layout_config;
    const aspect = cfg.height > 0 ? cfg.width / cfg.height : 2 / 3;
    const height = 3.2;
    const width = Number((height * aspect).toFixed(4));
    const depth = coverType === "hard" ? 0.068 : 0.02;
    const radius = Math.min(0.01, depth * 0.32);
    const goldEdge = template.is_premium || isDarkHex(cfg.background_color || "");
    return {
      cardWidth: width,
      cardHeight: height,
      cardDepth: depth,
      edgeRadius: radius,
      isGoldEdge: goldEdge,
    };
  }, [template, coverType]);

  const faceWidth = Math.max(0.2, cardWidth - 0.018);
  const faceHeight = Math.max(0.2, cardHeight - 0.018);
  const frontZ = cardDepth / 2 + 0.001;
  const backZ = -cardDepth / 2 - 0.001;

  useFrame((_, delta) => {
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

  return (
    <group ref={groupRef} position={[0, 0.06, 0]}>
      {/* Physical card core with tactile thickness & warm paper or gold edge */}
      <RoundedBox
        args={[cardWidth, cardHeight, cardDepth]}
        radius={edgeRadius}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isGoldEdge ? "#C59B38" : "#E8E2D7"}
          roughness={isGoldEdge ? 0.28 : 0.72}
          metalness={isGoldEdge ? 0.8 : 0.04}
        />
      </RoundedBox>

      {/* Front printed face */}
      <mesh position={[0, 0, frontZ]}>
        <planeGeometry args={[faceWidth, faceHeight]} />
        {paperType === "premium" ? (
          <meshPhysicalMaterial
            key={`front-premium-${template.id}`}
            map={frontTexture}
            bumpMap={paperGrainTexture}
            bumpScale={0.008}
            roughness={0.36}
            metalness={0.05}
            clearcoat={0.42}
            clearcoatRoughness={0.26}
          />
        ) : (
          <meshStandardMaterial
            key={`front-standard-${template.id}`}
            map={frontTexture}
            roughness={0.78}
            metalness={0.01}
          />
        )}
      </mesh>

      {/* Back watermark face */}
      <mesh position={[0, 0, backZ]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[faceWidth, faceHeight]} />
        {paperType === "premium" ? (
          <meshPhysicalMaterial
            key={`back-premium-${template.id}`}
            map={backTexture}
            bumpMap={paperGrainTexture}
            bumpScale={0.006}
            roughness={0.44}
            metalness={0.04}
            clearcoat={0.32}
            clearcoatRoughness={0.3}
          />
        ) : (
          <meshStandardMaterial
            key={`back-standard-${template.id}`}
            map={backTexture}
            roughness={0.8}
            metalness={0.01}
          />
        )}
      </mesh>
    </group>
  );
}

interface CameraRigProps {
  targetPreset: CameraAnglePreset;
  presetVersion: number;
  controlsRef: React.RefObject<OrbitControlsHandle | null>;
  isTransitioningRef: React.MutableRefObject<boolean>;
}

/**
 * Orbits the camera smoothly in spherical coordinates around the print card origin
 * so transitions like Front -> Back glide around the card instead of clipping through it.
 */
function CameraRig({
  targetPreset,
  presetVersion,
  controlsRef,
  isTransitioningRef,
}: CameraRigProps) {
  const { camera } = useThree();
  const targetVec = useMemo(() => new THREE.Vector3(...CAMERA_PRESETS[targetPreset]), [targetPreset]);
  const targetSpherical = useMemo(
    () => new THREE.Spherical().setFromVector3(targetVec),
    [targetVec]
  );
  const currentSphericalRef = useRef(new THREE.Spherical());
  const originTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useEffect(() => {
    isTransitioningRef.current = true;
  }, [targetPreset, presetVersion, isTransitioningRef]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current) return;

    const dt = Math.min(delta, 0.05);
    const controls = controlsRef.current;
    const step = 1 - Math.exp(-8.5 * dt);

    const spherical = currentSphericalRef.current.setFromVector3(camera.position);

    let deltaTheta = targetSpherical.theta - spherical.theta;
    while (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
    while (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;

    spherical.radius += (targetSpherical.radius - spherical.radius) * step;
    spherical.phi += (targetSpherical.phi - spherical.phi) * step;
    spherical.theta += deltaTheta * step;

    camera.position.setFromSpherical(spherical);

    if (controls) {
      controls.target.lerp(originTarget, step);
      controls.update();
    } else {
      camera.lookAt(0, 0, 0);
    }

    if (
      Math.abs(deltaTheta) < 0.008 &&
      Math.abs(targetSpherical.phi - spherical.phi) < 0.008 &&
      Math.abs(targetSpherical.radius - spherical.radius) < 0.02
    ) {
      camera.position.copy(targetVec);
      if (controls) {
        controls.target.copy(originTarget);
        controls.update();
      }
      isTransitioningRef.current = false;
    }
  });

  return null;
}

/**
 * Interactive 360-degree Three.js stage displaying the physical 3D photobooth print card.
 * Automatically degrades to `<PrintPreviewFallback2D />` when WebGL is disabled or context is lost.
 */
export function PrintPreviewScene3D({
  template,
  slotPhotoUrls,
  caption,
  coverType,
  paperType,
}: PrintPreviewScene3DProps) {
  const [cameraPreset, setCameraPreset] = useState<CameraAnglePreset>("three-quarter");
  const [presetVersion, setPresetVersion] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [lightingMode, setLightingMode] = useState<LightingMode>("studio");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglStatus, setWebglStatus] = useState<"ready" | "unsupported" | "context-lost">("ready");

  const controlsRef = useRef<OrbitControlsHandle | null>(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setWebglStatus("unsupported");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (webglStatus !== "ready") {
    return (
      <PrintPreviewFallback2D
        template={template}
        slotPhotoUrls={slotPhotoUrls}
        caption={caption}
        coverType={coverType}
        paperType={paperType}
        reason={webglStatus}
      />
    );
  }

  const handleSelectAngle = (preset: CameraAnglePreset) => {
    setAutoRotate(false);
    setCameraPreset(preset);
    setPresetVersion((v) => v + 1);
  };

  const handleUserInteractStart = () => {
    isTransitioningRef.current = false;
    setAutoRotate(false);
  };

  const isWarm = lightingMode === "warm";

  return (
    <div
      className={`${styles.stageRoot} ${isWarm ? styles.stageRootWarm : ""}`}
      data-testid="print-preview-stage"
    >
      <div className={styles.stageHeader}>
        <div className={styles.stageBadge}>
          <span className={styles.stageBadgeDot} aria-hidden="true" />
          <span>{template.name}</span>
        </div>
        <span className={styles.stageHint}>
          <span className={styles.stageHintFull}>Kéo để xoay 360° · Cuộn để phóng to</span>
          <span className={styles.stageHintShort}>Vuốt xoay 360° · Chụm phóng to</span>
        </span>
      </div>

      <div
        className={styles.canvasShell}
        role="img"
        aria-label={`Mô hình 3D mẫu in ${template.name}. Kéo để xoay 360 độ hoặc dùng các nút góc nhìn bên dưới.`}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: CAMERA_PRESETS["three-quarter"], fov: 38 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
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
          <ambientLight
            intensity={isWarm ? 0.56 : 0.65}
            color={isWarm ? "#FFE6C2" : "#FFFFFF"}
          />
          <directionalLight
            position={[3.5, 5, 4.5]}
            intensity={isWarm ? 1.65 : 1.38}
            color={isWarm ? "#FFD496" : "#FFFDF9"}
            castShadow
          />
          <directionalLight
            position={[-4, 2.5, -3.5]}
            intensity={isWarm ? 1.0 : 0.78}
            color={isWarm ? "#F5D07A" : "#EAE6E1"}
          />
          <spotLight
            position={[0, 4, -4]}
            intensity={isWarm ? 1.2 : 0.85}
            color="#D4AF37"
            angle={0.55}
            penumbra={0.8}
          />

          {/* Offline studio environment re-baked cleanly on lightingMode toggle */}
          <Environment key={lightingMode} resolution={256} frames={1}>
            <Lightformer
              form="rect"
              intensity={isWarm ? 2.4 : 2.5}
              color={isWarm ? "#FFE0A8" : "#FFFDF9"}
              position={[4, 4, 4]}
              scale={[6, 6, 1]}
              target={[0, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={isWarm ? 2.6 : 1.85}
              color={isWarm ? "#F5C96B" : "#F5D27B"}
              position={[-4.5, 2.2, 3]}
              scale={[3.5, 5, 1]}
              target={[0, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={1.55}
              color={isWarm ? "#FFE8C8" : "#FFFFFF"}
              position={[0, 3, -5]}
              scale={[10, 4, 1]}
              target={[0, 0, 0]}
            />
          </Environment>

          <PrintCardMesh
            template={template}
            slotPhotoUrls={slotPhotoUrls}
            caption={caption}
            coverType={coverType}
            paperType={paperType}
            reducedMotion={reducedMotion}
          />

          <ContactShadows
            position={[0, -1.82, 0]}
            opacity={0.35}
            scale={6.5}
            blur={2.4}
            color="#3B0609"
          />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.07}
            minDistance={2.8}
            maxDistance={7.5}
            autoRotate={autoRotate && !reducedMotion}
            autoRotateSpeed={2.2}
            onStart={handleUserInteractStart}
          />

          <CameraRig
            targetPreset={cameraPreset}
            presetVersion={presetVersion}
            controlsRef={controlsRef}
            isTransitioningRef={isTransitioningRef}
          />
        </Canvas>
      </div>

      <div className={styles.toolbarWrap}>
        <div className={styles.toolbar} role="toolbar" aria-label="Điều khiển sân khấu 3D">
          <div className={styles.toolbarGroup}>
            <button
              type="button"
              className={`${styles.toolButton} ${
                cameraPreset === "front" ? styles.toolButtonActive : ""
              }`}
              onClick={() => handleSelectAngle("front")}
            >
              Mặt trước
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${
                cameraPreset === "back" ? styles.toolButtonActive : ""
              }`}
              onClick={() => handleSelectAngle("back")}
            >
              Mặt sau
            </button>
            <button
              type="button"
              className={`${styles.toolButton} ${
                cameraPreset === "three-quarter" ? styles.toolButtonActive : ""
              }`}
              onClick={() => handleSelectAngle("three-quarter")}
            >
              Góc 3/4
            </button>
          </div>

          <span className={styles.toolbarDivider} aria-hidden="true" />

          <div className={styles.toolbarGroup}>
            <button
              type="button"
              aria-pressed={autoRotate}
              className={`${styles.toolButton} ${
                autoRotate ? styles.toolButtonActive : ""
              }`}
              onClick={() => setAutoRotate((prev) => !prev)}
            >
              <RotateCw size={14} aria-hidden="true" />
              <span>Tự xoay</span>
            </button>

            <button
              type="button"
              aria-pressed={isWarm}
              className={`${styles.toolButton} ${isWarm ? styles.toolButtonWarm : ""}`}
              onClick={() =>
                setLightingMode((prev) => (prev === "studio" ? "warm" : "studio"))
              }
            >
              {isWarm ? (
                <Sparkles size={14} aria-hidden="true" />
              ) : (
                <Sun size={14} aria-hidden="true" />
              )}
              <span>
                {isWarm ? "Ánh sáng: Đèn vàng ấm" : "Ánh sáng: Sáng studio"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
