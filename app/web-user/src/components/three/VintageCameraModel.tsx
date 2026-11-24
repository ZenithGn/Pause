"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createLeatherBumpCanvas } from "@/lib/template-canvas";

export interface VintageCameraModelProps {
  /** Press depth in `[0, 1]` for the Wine shutter release button (active at Milestone 3). */
  shutterPressAmount?: number;
  /** Extension progress in `[0, 1]` for the mini white-bordered photobooth strip. */
  stripOutAmount?: number;
  /** Disables subtle idle motion when user prefers reduced motion. */
  reducedMotion?: boolean;
}

const KNURL_COUNT = 42;
const SHUTTER_REST_Y = 0.725;
const SHUTTER_PRESS_TRAVEL = 0.048;

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  return shape;
}

function createCenteredExtrudeGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevelSize: number
): THREE.ExtrudeGeometry {
  const shape = createRoundedRectShape(width, height, radius);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevelSize,
    bevelSize,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geometry.center();
  return geometry;
}

/**
 * Procedural 3D vintage rangefinder film camera tailored to Pause's 3-color editorial palette:
 * Champagne Silver plates (#EAE4DC), Dark Pebbled Leather (#181515),
 * Antique Gold accents (#C59B38), and Deep Wine shutter/brand mark (#630D11).
 *
 * Normalized bounding dimensions: ~2.4 x 1.45 x 1.15 units, pivot at (0, 0, 0), lens facing +Z.
 */
export function VintageCameraModel({
  shutterPressAmount = 0,
  stripOutAmount = 0,
  reducedMotion = false,
}: VintageCameraModelProps) {
  const shutterRef = useRef<THREE.Group>(null);
  const stripRef = useRef<THREE.Group>(null);
  const focusKnurlsRef = useRef<THREE.InstancedMesh>(null);
  const currentPress = useRef(0);
  const currentStrip = useRef(0);

  // Extruded camera body geometries (disposed cleanly on unmount)
  const geometries = useMemo(() => {
    const leatherBody = createCenteredExtrudeGeometry(2.26, 0.94, 0.7, 0.12, 0.032);
    const topPlate = createCenteredExtrudeGeometry(2.3, 0.24, 0.72, 0.12, 0.034);
    const bottomPlate = createCenteredExtrudeGeometry(2.3, 0.16, 0.72, 0.12, 0.028);

    // 5-tier stepped lens barrel profile revolved around +Y, then rotated to +Z
    const barrelPoints = [
      new THREE.Vector2(0.54, 0.0),
      new THREE.Vector2(0.56, 0.04),
      new THREE.Vector2(0.53, 0.09),
      new THREE.Vector2(0.51, 0.16),
      new THREE.Vector2(0.49, 0.28),
      new THREE.Vector2(0.47, 0.34),
      new THREE.Vector2(0.45, 0.41),
      new THREE.Vector2(0.42, 0.44),
      new THREE.Vector2(0.37, 0.44),
      new THREE.Vector2(0.35, 0.36),
    ];
    const lensBarrel = new THREE.LatheGeometry(barrelPoints, 40);

    return { leatherBody, topPlate, bottomPlate, lensBarrel };
  }, []);

  useEffect(() => {
    return () => {
      geometries.leatherBody.dispose();
      geometries.topPlate.dispose();
      geometries.bottomPlate.dispose();
      geometries.lensBarrel.dispose();
    };
  }, [geometries]);

  // Procedural pebbled leather bump texture
  const leatherBumpMap = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = createLeatherBumpCanvas(256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 2);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      leatherBumpMap?.dispose();
    };
  }, [leatherBumpMap]);

  // Populate 42 knurled focus ring ridges in a single InstancedMesh draw call
  useLayoutEffect(() => {
    const mesh = focusKnurlsRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const radius = 0.515;
    for (let i = 0; i < KNURL_COUNT; i += 1) {
      const angle = (i / KNURL_COUNT) * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * radius, 0.21, Math.sin(angle) * radius);
      dummy.rotation.set(0, -angle, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    const dampSpeed = reducedMotion ? 18 : 9;

    currentPress.current = THREE.MathUtils.damp(
      currentPress.current,
      shutterPressAmount,
      dampSpeed,
      delta
    );

    if (shutterRef.current) {
      shutterRef.current.position.y =
        SHUTTER_REST_Y - currentPress.current * SHUTTER_PRESS_TRAVEL;
    }

    currentStrip.current = THREE.MathUtils.damp(
      currentStrip.current,
      stripOutAmount,
      dampSpeed,
      delta
    );

    if (stripRef.current) {
      const p = currentStrip.current;
      stripRef.current.visible = p > 0.015;
      stripRef.current.position.set(-1.38 - p * 0.26, -0.18 - (1 - p) * 0.14, -0.05 + p * 0.22);
      stripRef.current.rotation.set(0.06, 0.16 * p, 0.14 * p);
      const s = 0.72 + 0.28 * p;
      stripRef.current.scale.setScalar(s);
    }
  });

  return (
    <group name="VintageCameraRoot">
      {/* Main Body: Top Champagne-Silver Plate, Dark Leather Wrap, Bottom Plate */}
      <group name="cameraBody">
        <mesh geometry={geometries.leatherBody} castShadow receiveShadow>
          <meshStandardMaterial
            color="#181515"
            roughness={0.86}
            metalness={0.05}
            bumpMap={leatherBumpMap}
            bumpScale={0.016}
          />
        </mesh>

        <mesh
          geometry={geometries.topPlate}
          position={[0, 0.5, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#EAE4DC" metalness={0.86} roughness={0.24} />
        </mesh>

        <mesh
          geometry={geometries.bottomPlate}
          position={[0, -0.54, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#EAE4DC" metalness={0.86} roughness={0.24} />
        </mesh>

        {/* Subtle Wine & Gold editorial pinstripe along top-plate seam */}
        <mesh position={[0, 0.382, 0]}>
          <boxGeometry args={[2.31, 0.016, 0.75]} />
          <meshStandardMaterial color="#630D11" roughness={0.35} metalness={0.3} />
        </mesh>
      </group>

      {/* 5-Tier Lens Assembly facing +Z */}
      <group name="lensAssembly" position={[0.18, -0.04, 0.36]}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          {/* Tier 1: Silver metal mount flange */}
          <mesh position={[0, 0.015, 0]} castShadow>
            <cylinderGeometry args={[0.58, 0.59, 0.035, 48]} />
            <meshStandardMaterial color="#EAE4DC" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Tier 2: Anodized black LatheGeometry barrel */}
          <mesh geometry={geometries.lensBarrel} castShadow receiveShadow>
            <meshStandardMaterial color="#141414" metalness={0.65} roughness={0.32} />
          </mesh>

          {/* Tier 3: InstancedMesh knurled focus ring (single draw call) */}
          <instancedMesh
            ref={focusKnurlsRef}
            args={[undefined, undefined, KNURL_COUNT]}
          >
            <boxGeometry args={[0.014, 0.095, 0.018]} />
            <meshStandardMaterial color="#272424" metalness={0.55} roughness={0.38} />
          </instancedMesh>

          {/* Tier 4: Antique Gold aperture accent ring */}
          <mesh position={[0, 0.355, 0]}>
            <cylinderGeometry args={[0.478, 0.478, 0.045, 48, 1, true]} />
            <meshStandardMaterial
              color="#C59B38"
              metalness={0.92}
              roughness={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Front gold bevel lip */}
          <mesh position={[0, 0.435, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.405, 0.013, 16, 48]} />
            <meshStandardMaterial color="#C59B38" metalness={0.92} roughness={0.18} />
          </mesh>

          {/* Recessed optical barrel & aperture blade disc */}
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.34, 0.34, 0.02, 32]} />
            <meshStandardMaterial color="#0A090B" metalness={0.2} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.265, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.14, 0.31, 8]} />
            <meshStandardMaterial
              color="#1A171B"
              metalness={0.45}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Tier 5: Coated curved front glass element */}
        <mesh
          name="frontGlassElement"
          position={[0, 0, 0.32]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <sphereGeometry args={[0.365, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
          <meshPhysicalMaterial
            color="#1B0B10"
            roughness={0.05}
            metalness={0.1}
            transmission={0.72}
            ior={1.52}
            thickness={0.35}
            clearcoat={1.0}
            clearcoatRoughness={0.04}
            iridescence={0.45}
          />
        </mesh>
      </group>

      {/* Top Controls: Wine Shutter Release + Gold Collar, Mode Dials, Hot Shoe */}
      <group name="topControls">
        {/* Gold Shutter Collar */}
        <mesh position={[-0.78, 0.675, 0.06]}>
          <cylinderGeometry args={[0.105, 0.115, 0.045, 28]} />
          <meshStandardMaterial color="#C59B38" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Animated Wine Shutter Button */}
        <group ref={shutterRef} name="shutterButton" position={[-0.78, SHUTTER_REST_Y, 0.06]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.072, 0.076, 0.065, 28]} />
            <meshStandardMaterial color="#630D11" roughness={0.25} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.034, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.064, 0.008, 12, 24]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.92} roughness={0.18} />
          </mesh>
        </group>

        {/* Speed & ISO Mode Dials */}
        <group position={[-0.45, 0.695, -0.02]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.135, 0.14, 0.08, 28]} />
            <meshStandardMaterial color="#EAE4DC" metalness={0.86} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.043, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.012, 28]} />
            <meshStandardMaterial color="#181515" metalness={0.4} roughness={0.45} />
          </mesh>
        </group>

        <group position={[0.72, 0.695, -0.02]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.125, 0.075, 28]} />
            <meshStandardMaterial color="#EAE4DC" metalness={0.86} roughness={0.24} />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <cylinderGeometry args={[0.124, 0.124, 0.018, 28]} />
            <meshStandardMaterial color="#C59B38" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>

        {/* Hot Shoe Mount */}
        <group name="hotShoe" position={[0.02, 0.665, -0.02]}>
          <mesh>
            <boxGeometry args={[0.32, 0.024, 0.28]} />
            <meshStandardMaterial color="#1B1919" metalness={0.4} roughness={0.45} />
          </mesh>
          <mesh position={[-0.14, 0.022, 0]}>
            <boxGeometry args={[0.035, 0.026, 0.28]} />
            <meshStandardMaterial color="#EAE4DC" metalness={0.9} roughness={0.22} />
          </mesh>
          <mesh position={[0.14, 0.022, 0]}>
            <boxGeometry args={[0.035, 0.026, 0.28]} />
            <meshStandardMaterial color="#EAE4DC" metalness={0.9} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.022, -0.125]}>
            <boxGeometry args={[0.315, 0.026, 0.03]} />
            <meshStandardMaterial color="#EAE4DC" metalness={0.9} roughness={0.22} />
          </mesh>
        </group>
      </group>

      {/* Optical Viewfinder Window + Wine Indicator Dot */}
      <group name="viewfinderWindow" position={[-0.72, 0.495, 0.378]}>
        <mesh>
          <boxGeometry args={[0.32, 0.16, 0.035]} />
          <meshStandardMaterial color="#C59B38" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0.016]}>
          <boxGeometry args={[0.26, 0.11, 0.015]} />
          <meshPhysicalMaterial
            color="#19161F"
            roughness={0.08}
            metalness={0.15}
            clearcoat={1}
          />
        </mesh>
        {/* Tiny Wine recording/self-timer indicator */}
        <mesh position={[0.24, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.02, 20]} />
          <meshStandardMaterial color="#630D11" roughness={0.25} metalness={0.2} />
        </mesh>
      </group>

      {/* Pause Brand Emblem Dot on front face */}
      <group name="brandDot" position={[0.85, 0.24, 0.382]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.072, 0.072, 0.022, 28]} />
          <meshStandardMaterial color="#C59B38" metalness={0.92} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.056, 0.056, 0.016, 28]} />
          <meshStandardMaterial color="#630D11" roughness={0.28} metalness={0.15} />
        </mesh>
      </group>

      {/* Side Metallic Strap Lugs */}
      <mesh position={[-1.18, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.055, 0.015, 12, 24]} />
        <meshStandardMaterial color="#EAE4DC" metalness={0.92} roughness={0.2} />
      </mesh>
      <mesh position={[1.18, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.055, 0.015, 12, 24]} />
        <meshStandardMaterial color="#EAE4DC" metalness={0.92} roughness={0.2} />
      </mesh>

      {/* Mini White-Bordered Photobooth Strip (slides out gently at Milestone 3) */}
      <group ref={stripRef} name="miniPhotoStrip" visible={false}>
        {/* Cardstock strip body */}
        <mesh castShadow>
          <boxGeometry args={[0.52, 1.16, 0.022]} />
          <meshStandardMaterial color="#FFFFFF" roughness={0.55} metalness={0.02} />
        </mesh>
        {/* Gold hairline frame */}
        <mesh position={[0, 0, 0.012]}>
          <planeGeometry args={[0.46, 1.1]} />
          <meshStandardMaterial color="#FAF7F2" roughness={0.6} />
        </mesh>
        {/* 3 editorial photo tiles */}
        <mesh position={[0, 0.34, 0.015]}>
          <planeGeometry args={[0.38, 0.25]} />
          <meshStandardMaterial color="#630D11" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.04, 0.015]}>
          <planeGeometry args={[0.38, 0.25]} />
          <meshStandardMaterial color="#3B0609" roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.26, 0.015]}>
          <planeGeometry args={[0.38, 0.25]} />
          <meshStandardMaterial color="#C59B38" roughness={0.35} metalness={0.35} />
        </mesh>
        {/* Pause mini footer seal */}
        <mesh position={[0, -0.46, 0.015]}>
          <planeGeometry args={[0.18, 0.035]} />
          <meshStandardMaterial color="#111111" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
