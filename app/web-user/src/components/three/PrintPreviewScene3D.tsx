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
} from "@react-three/drei";
import { RotateCw, Sun, Sparkles } from "lucide-react";
import * as THREE from "three";
import { PhysicalPrintCard } from "@/components/three/PhysicalPrintCard";
import { PrintPreviewFallback2D } from "@/components/three/PrintPreviewFallback2D";
import { isWebGLAvailable } from "@/lib/webgl-support";
import type { CoverType, PaperType, PhotoTone, PublicTemplate } from "@/types/catalog";
import styles from "./PrintPreviewScene3D.module.css";

export type CameraAnglePreset = "front" | "back" | "three-quarter";
export type LightingMode = "studio" | "warm";

export interface PrintPreviewScene3DProps {
  template: PublicTemplate;
  slotPhotoUrls: Record<number, string>;
  caption: string;
  photoTone?: PhotoTone;
  coverType: CoverType;
  paperType: PaperType;
}

function getPrintSizeLabel(template: PublicTemplate): string {
  const { width, height } = template.layout_config;
  if (width <= 0 || height <= 0) return "10 × 15 cm";
  const ratio = height / width;
  if (Math.abs(ratio - 1) < 0.08) return "10 × 10 cm";
  return `10 × ${Math.round(10 * ratio)} cm`;
}

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

const CAMERA_PRESETS: Record<CameraAnglePreset, [number, number, number]> = {
  front: [0, 0, 5.2],
  back: [0, 0, -5.2],
  "three-quarter": [2.35, 0.72, 4.58],
};

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
  const targetVec = useMemo(
    () => new THREE.Vector3(...CAMERA_PRESETS[targetPreset]),
    [targetPreset]
  );
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
  photoTone = "original",
  coverType,
  paperType,
}: PrintPreviewScene3DProps) {
  const [cameraPreset, setCameraPreset] = useState<CameraAnglePreset>("three-quarter");
  const [presetVersion, setPresetVersion] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [lightingMode, setLightingMode] = useState<LightingMode>("studio");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglStatus, setWebglStatus] = useState<"ready" | "unsupported" | "context-lost">(
    "ready"
  );

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
        <div className={styles.stageBadgeGroup}>
          <div className={styles.stageBadge}>
            <span className={styles.stageBadgeDot} aria-hidden="true" />
            <span>{template.name}</span>
          </div>
          <span className={styles.sizeBadge}>{getPrintSizeLabel(template)}</span>
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

          <PhysicalPrintCard
            template={template}
            slotPhotoUrls={slotPhotoUrls}
            caption={caption}
            photoTone={photoTone}
            coverType={coverType}
            paperType={paperType}
            maxHeight={3.2}
            maxWidth={4.2}
            clearcoatStrength={0.44}
            enableSwitchPulse
            reducedMotion={reducedMotion}
            position={[0, 0.06, 0]}
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
