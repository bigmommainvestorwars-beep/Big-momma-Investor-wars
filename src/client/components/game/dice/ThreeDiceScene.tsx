import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Volume2, VolumeX } from 'lucide-react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createDiceFaceTextures, type DiceMaterialType } from './DiceTextures';
import { getDiceContactShadowTexture } from './DiceShadowTexture';
import { diceAudio } from './diceAudio';
import {
  FACE_EULER_ANGLES,
  getTargetQuaternionForFace,
  createInitialDicePhysicsState,
  launchDicePhysicsSimulation,
  stepDicePhysics,
  type DicePhysicsState,
} from './dicePhysics';

export { FACE_EULER_ANGLES, diceAudio };
export type { DiceMaterialType };

export interface ThreeDiceSceneProps {
  lastRoll: [number, number] | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  onAnimationComplete?: (result: number) => void;
  initialMaterial?: DiceMaterialType;
}

/**
 * Mobile Device Detector (iPhone, iPad, Android, touch devices)
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) ||
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 1 && window.innerWidth < 1024)
  );
};

// Global cache for PMREM environment texture to prevent repeated compile/allocation pauses
let cachedEnvTexture: THREE.Texture | null = null;

/**
 * High-End Studio Environment for Soft Physical Reflections
 * Generates an HDR-grade image-based lighting environment using RoomEnvironment
 * and PMREMGenerator to give the dice realistic softbox highlights and clearcoat reflections.
 * Cached to prevent GPU hitching on mobile devices.
 */
function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    if (cachedEnvTexture) {
      scene.environment = cachedEnvTexture;
      scene.environmentIntensity = 0.95;
      return;
    }

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    cachedEnvTexture = envTexture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.95;

    pmremGenerator.dispose();
    roomEnv.dispose();
  }, [gl, scene]);

  return null;
}

/**
 * High-Precision Soft Shadow Manager:
 * Enables PCFSoftShadowMap and ensures shadows are updated cleanly both during motion and at rest.
 */
function ShadowManager({ isRolling }: { isRolling: boolean }) {
  const { gl } = useThree();

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.autoUpdate = true;
    gl.shadowMap.needsUpdate = true;
  }, [gl, isRolling]);

  return null;
}

/**
 * Step 2: Premium Casino Cinematic Camera Controller
 *
 * During rolling:
 * - Camera follows dice movement (tracking vertical lift & lateral toss trajectory).
 * - Camera slightly rotates (graceful orbital pan of ~22° around the rolling die).
 * - Camera slightly zooms (zooms ~24% closer and tightens FOV from 38° to 33.5°).
 * - Camera creates cinematic motion with dynamic hero framing and landing impact impulse.
 *
 * After landing:
 * - Camera smoothly returns to default position [2.8, 3.1, 3.4] and lookAt [0, 0.1, 0].
 */
export const DEFAULT_CAM_POS = new THREE.Vector3(2.9, 3.2, 3.5);
export const DEFAULT_LOOKAT = new THREE.Vector3(0, 0.1, 0);
export const DEFAULT_FOV = 40;
const DEFAULT_RXZ = Math.hypot(2.9, 3.5); // ~4.545
const DEFAULT_THETA = Math.atan2(2.9, 3.5); // ~0.692 rad

interface CameraControllerProps {
  isRolling: boolean;
  animTime: number;
  dicePosRef: React.MutableRefObject<THREE.Vector3>;
}

function CameraController({ isRolling, animTime, dicePosRef }: CameraControllerProps) {
  const currentLookAt = useRef(new THREE.Vector3(0, 0.1, 0));
  const currentUp = useRef(new THREE.Vector3(0, 1, 0));

  useFrame(({ camera }, delta) => {
    const dicePos = dicePosRef.current;
    const isPerspectiveCamera = 'isPerspectiveCamera' in camera && (camera as THREE.PerspectiveCamera).isPerspectiveCamera;
    const persCamera = camera as THREE.PerspectiveCamera;

    // During rolling (before final landing & settle at ~2.05s)
    const inFlight = isRolling && animTime < 2.05;

    let targetCamPos: THREE.Vector3;
    let targetLookAt: THREE.Vector3;
    let targetFov: number;
    let targetBankAngle: number;

    if (inFlight) {
      // Progress of roll flight (0 to 1 as it ascends, tumbles, and approaches ground impact at 1.85s)
      const flightProgress = Math.min(animTime / 1.85, 1);
      // Smooth bell curve peaking during mid-air flight
      const flightArc = Math.sin(flightProgress * Math.PI);

      // 1. Camera gently orbits:
      // Graceful orbital sweep around the dice to showcase 3D lighting, edges & tumble
      const orbitSweep = flightArc * 0.28;
      const theta = DEFAULT_THETA + orbitSweep;

      // 2. Camera stays at optimal framing distance:
      // Dice remains 100% visible, never leaves camera view across any aspect ratio
      const currentRXZ = THREE.MathUtils.lerp(DEFAULT_RXZ, DEFAULT_RXZ * 0.92, flightArc);
      const targetCamX = Math.sin(theta) * currentRXZ + dicePos.x * 0.30;
      const targetCamZ = Math.cos(theta) * currentRXZ + dicePos.z * 0.30;

      // 3. Camera tracks vertical lift:
      // Elevation smoothly follows the upward toss keeping dice centered vertically
      let targetCamY = 3.2 + dicePos.y * 0.45;

      // 4. Subtle landing impact micro-shake on table contact (1.85s - 2.05s)
      if (animTime >= 1.85 && animTime < 2.05) {
        const bouncePhase = (animTime - 1.85) / 0.20;
        const impactShake = Math.sin(bouncePhase * Math.PI * 4) * (1 - bouncePhase) * 0.025;
        targetCamY += impactShake;
      }

      targetCamPos = new THREE.Vector3(targetCamX, targetCamY, targetCamZ);

      // Camera smoothly frames the physical tumbling dice
      targetLookAt = new THREE.Vector3(
        dicePos.x * 0.45,
        dicePos.y * 0.75 + 0.1,
        dicePos.z * 0.45
      );

      targetFov = 40;

      // Subtle dynamic banking / roll angle for cinematic crane-shot feel (~1.8 degrees)
      targetBankAngle = Math.sin(flightProgress * Math.PI * 1.5) * 0.03;
    } else {
      // After landing: Camera smoothly returns to default position
      targetCamPos = DEFAULT_CAM_POS;
      targetLookAt = DEFAULT_LOOKAT;
      targetFov = DEFAULT_FOV;
      targetBankAngle = 0;
    }

    // Smoothly ease position toward target (exponential decay)
    const posLerpRate = inFlight ? 8.0 : 4.5;
    camera.position.lerp(targetCamPos, 1 - Math.exp(-posLerpRate * delta));

    // Smoothly ease lookAt target
    const lookAtLerpRate = inFlight ? 12.0 : 5.0;
    currentLookAt.current.lerp(targetLookAt, 1 - Math.exp(-lookAtLerpRate * delta));

    // Smoothly ease banking tilt & up vector
    const bankLerpRate = inFlight ? 8.0 : 4.0;
    const targetUp = new THREE.Vector3(
      Math.sin(targetBankAngle),
      Math.cos(targetBankAngle),
      0
    );
    currentUp.current.lerp(targetUp, 1 - Math.exp(-bankLerpRate * delta));
    camera.up.copy(currentUp.current);

    // Apply lookAt with stabilized up vector
    camera.lookAt(currentLookAt.current);

    // Smoothly ease FOV zoom
    if (isPerspectiveCamera) {
      persCamera.fov = THREE.MathUtils.lerp(persCamera.fov, targetFov, 1 - Math.exp(-6 * delta));
      persCamera.updateProjectionMatrix();
    }
  });

  return null;
}

/**
 * Radiant Result Glow Effect on Pedestal
 * Dynamic visibility ensures zero render passes when inactive
 */
function PedestalGlow({ glowIntensity, isMobile }: { glowIntensity: number; isMobile: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (glowIntensity <= 0.005) return;
    if (ringRef.current) {
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = glowIntensity * 0.65;
      const scale = 1 + glowIntensity * 0.2;
      ringRef.current.scale.set(scale, scale, 1);
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = glowIntensity * (isMobile ? 2.2 : 3.2);
    }
  });

  if (glowIntensity <= 0.005) return null;

  return (
    <group position={[0, -0.7742, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.35, 1.85, isMobile ? 24 : 48]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight
        ref={pointLightRef}
        position={[0, 0, 0.4]}
        intensity={0}
        color="#34d399"
        distance={isMobile ? 5 : 6}
      />
    </group>
  );
}

// Global Geometry & Material Caches shared across both dice
const geometryCache = new Map<number, RoundedBoxGeometry>();
function getSharedDiceGeometry(segments: number): RoundedBoxGeometry {
  let geom = geometryCache.get(segments);
  if (!geom) {
    geom = new RoundedBoxGeometry(1.55, 1.55, 1.55, segments, 0.16);
    geometryCache.set(segments, geom);
  }
  return geom;
}

const materialCache = new Map<string, THREE.MeshPhysicalMaterial[]>();
function getSharedDiceMaterials(materialType: DiceMaterialType, isMobile: boolean): THREE.MeshPhysicalMaterial[] {
  const cacheKey = `${materialType}_${isMobile ? 'mobile' : 'desktop'}`;
  let materials = materialCache.get(cacheKey);
  if (materials) return materials;

  const texturePkg = createDiceFaceTextures(materialType, isMobile);
  const faceIndices = [3, 4, 1, 6, 2, 5];

  materials = faceIndices.map((faceNum) => {
    const colorMap = texturePkg.colorMaps[faceNum - 1];
    const bumpMap = texturePkg.bumpMaps[faceNum - 1];
    const roughnessMap = texturePkg.roughnessMaps[faceNum - 1];

    if (materialType === 'ivory') {
      // Luxury Polished Ivory / Porcelain with thick glossy clearcoat
      return new THREE.MeshPhysicalMaterial({
        map: colorMap,
        bumpMap: bumpMap,
        bumpScale: 0.055, // Real physical surface relief for recessed pips
        roughnessMap: roughnessMap,
        roughness: 0.12, // Soft micro-roughness for silky soft reflections
        metalness: 0.0, // Pure dielectric ivory
        clearcoat: 1.0, // Thick liquid-glass lacquer coat
        clearcoatRoughness: 0.04, // Mirror-smooth clearcoat
        reflectivity: 0.9,
        ior: 1.54, // Refractive index of acrylic / ivory resin
        sheen: 0.4, // Subtle warm ivory sheen on grazing angles
        sheenColor: new THREE.Color('#fff9eb'),
        specularIntensity: 1.0,
        specularColor: new THREE.Color('#ffffff'),
      });
    } else {
      // High-Gloss Vegas Casino Translucent Ruby Acrylic
      return new THREE.MeshPhysicalMaterial({
        map: colorMap,
        bumpMap: bumpMap,
        bumpScale: 0.055,
        roughnessMap: roughnessMap,
        roughness: 0.08,
        metalness: 0.02,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        transmission: isMobile ? 0.18 : 0.25, // Mobile-optimized transmission shader
        thickness: 1.2,
        reflectivity: 0.95,
        ior: 1.58,
        specularIntensity: 1.0,
        specularColor: new THREE.Color('#ffffff'),
      });
    }
  });

  materialCache.set(cacheKey, materials);
  return materials;
}

interface PhysicalDiceCubeProps {
  lastRoll: number | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
  shadowGeometry: THREE.BufferGeometry;
  shadowTexture: THREE.CanvasTexture;
  dicePosRef?: React.MutableRefObject<THREE.Vector3>; // Optional for the second die
  dieIndex?: number; // 0 or 1
  onAnimationComplete?: (result: number) => void;
  onGlowChange?: (glow: number) => void;
  onAnimTimeChange?: (t: number) => void;
}

function PhysicalDiceCube({
  lastRoll,
  isRolling,
  canRoll,
  onRoll,
  geometry,
  materials,
  shadowGeometry,
  shadowTexture,
  dicePosRef,
  dieIndex = 0,
  onAnimationComplete,
  onGlowChange,
  onAnimTimeChange,
}: PhysicalDiceCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  // Track authoritative rigid-body physics simulation state
  const physicsState = useRef<DicePhysicsState>(createInitialDicePhysicsState(lastRoll || 1));

  // Audio synchronization event tracking flags
  const audioFlagsRef = useRef({
    lastTumbleSoundTime: 0,
    hasPlayedBounce1: false,
    hasPlayedBounce2: false,
    hasPlayedFinalLanding: false,
    hasPlayedSuccess: false,
  });

  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  // Whenever a roll starts or target updates
  useEffect(() => {
    const ps = physicsState.current;
    const targetNumber = lastRoll && lastRoll >= 1 && lastRoll <= 6 ? lastRoll : 1;
    const targetQuat = getTargetQuaternionForFace(targetNumber);
    ps.targetQuaternion.copy(targetQuat);
    ps.targetNumber = targetNumber;

    if (isRolling) {
      audioFlagsRef.current = {
        lastTumbleSoundTime: 0,
        hasPlayedBounce1: false,
        hasPlayedBounce2: false,
        hasPlayedFinalLanding: false,
        hasPlayedSuccess: false,
      };
      if (dieIndex === 0) diceAudio.startRollingSound();
      launchDicePhysicsSimulation(ps, targetNumber);
    } else {
      if (dieIndex === 0) diceAudio.stopRollingSound();
      ps.isSimulating = false;
      ps.quaternion.copy(targetQuat);
      const offsetX = dieIndex === 0 ? -0.85 : 0.85;
      const offsetZ = dieIndex === 0 ? -0.2 : 0.2;
      if (meshRef.current) {
        meshRef.current.position.set(offsetX, 0, offsetZ);
        meshRef.current.quaternion.copy(targetQuat);
      }
    }
  }, [isRolling, lastRoll, dieIndex]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (dieIndex === 0) diceAudio.stopRollingSound();
    };
  }, [dieIndex]);

  // Frame Loop with authentic Rigid-Body Physics Simulation & Synchronized Audio
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const ps = physicsState.current;

    const offsetX = dieIndex === 0 ? -0.85 : 0.85;
    const offsetZ = dieIndex === 0 ? -0.2 : 0.2;

    if (ps.isSimulating && isRolling) {
      // Step the physics simulation (inertia, gravity, angular velocity, friction, bounce)
      stepDicePhysics(ps, delta, dieIndex);

      if (dieIndex === 0) {
        onAnimTimeChange?.(ps.time);
        onGlowChange?.(ps.glow);
      }

      meshRef.current.position.copy(ps.position);
      meshRef.current.quaternion.copy(ps.quaternion);
      if (dicePosRef) dicePosRef.current.copy(ps.position);

      // === SYNCHRONIZED CASINO AUDIO PIPELINE ===
      // Only trigger audio from the primary die to avoid phasing/doubling
      if (dieIndex === 0) {
        const flags = audioFlagsRef.current;

        // 1. Cube Tumble Sounds: Periodic sharp acoustic ivory/acrylic micro-clacks during rapid mid-air tumble
        if (ps.time >= 0.15 && ps.time < 1.75) {
          if (ps.time - flags.lastTumbleSoundTime >= 0.20) {
            flags.lastTumbleSoundTime = ps.time;
            diceAudio.playCubeTumbleSound(0.92 + Math.random() * 0.20);
          }
        }

        // 2. Table Impacts: Synchronized directly with physics simulation bounce impacts on the pedestal
        if (ps.bounceCount === 1 && !flags.hasPlayedBounce1) {
          flags.hasPlayedBounce1 = true;
          diceAudio.playTableImpact(1);
        } else if (ps.bounceCount === 2 && !flags.hasPlayedBounce2) {
          flags.hasPlayedBounce2 = true;
          diceAudio.playTableImpact(2);
        }

        // 3. Final Landing Impact: Authoritative table settlement snap as die lands flat
        if (ps.settled && !flags.hasPlayedFinalLanding) {
          flags.hasPlayedFinalLanding = true;
          diceAudio.playFinalLandingImpact();
        }

        // 4. Success Sound: Radiant ascending casino victory chime synchronized with pedestal glow appearance
        if (ps.glow >= 0.10 && !flags.hasPlayedSuccess) {
          flags.hasPlayedSuccess = true;
          diceAudio.playResultSuccessSound(ps.targetNumber);
        }
      }

      // Trigger movement sequence after die gradually loses momentum, settles, and glow appears
      if (ps.settled && ps.time >= 2.25 && !ps.hasNotifiedCompletion) {
        ps.hasNotifiedCompletion = true;
        if (dieIndex === 0) onAnimationCompleteRef.current?.(ps.targetNumber);
      }
    } else {
      // At rest on platform: die sits firmly flat on platform with target face strictly on top
      meshRef.current.position.set(offsetX, 0, offsetZ);
      if (dicePosRef) dicePosRef.current.set(offsetX, 0, offsetZ);

      // Subtle breathing on Y-axis only so the upward face remains 100% horizontal and on top
      const idleTime = performance.now() * 0.001;
      const idleYaw = Math.sin(idleTime * 0.8) * 0.03;
      const baseQuat = ps.targetQuaternion.clone();
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), idleYaw);
      baseQuat.premultiply(yawQuat);

      meshRef.current.quaternion.copy(baseQuat);
    }

    // Dynamic contact shadow on floor: tracks physical position, expands/fades during flight, sharpens on landing
    if (shadowRef.current) {
      const currentPos = meshRef.current.position;
      const h = Math.max(0, currentPos.y);

      // Subtle directional drift away from the key light as the die rises
      const driftX = -Math.min(h * 0.12, 0.35);
      const driftZ = -Math.min(h * 0.09, 0.28);

      shadowRef.current.position.set(
        currentPos.x + driftX,
        -0.774,
        currentPos.z + driftZ
      );

      // As die rises, penumbra spreads out softly
      const shadowScale = THREE.MathUtils.lerp(1.0, 1.80, Math.min(h / 1.75, 1));
      const shadowOpacity = THREE.MathUtils.lerp(0.82, 0.10, Math.min(h / 1.75, 1));

      shadowRef.current.scale.set(shadowScale, shadowScale, 1);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = shadowOpacity;

      // Align contact shadow rotation with die yaw when near ground
      if (h < 0.35) {
        const euler = new THREE.Euler().setFromQuaternion(meshRef.current.quaternion, 'YXZ');
        shadowRef.current.rotation.z = -euler.y;
      }
    }
  });

  return (
    <group>
      {/* Contact Shadow on Floor - shared geometry & procedural soft AO map */}
      <mesh
        ref={shadowRef}
        position={[0, -0.774, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={shadowGeometry}
      >
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.82}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* The Physical 3D Cube Mesh with Rounded Corners */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (canRoll && !isRolling) onRoll();
        }}
      />
    </group>
  );
}

export const ThreeDiceScene: React.FC<ThreeDiceSceneProps> = ({
  lastRoll,
  isRolling,
  canRoll,
  onRoll,
  onAnimationComplete,
  initialMaterial = 'glossy-plastic',
}) => {
  const [materialType, setMaterialType] = useState<DiceMaterialType>(initialMaterial);
  const [isMuted, setIsMuted] = useState(diceAudio.getMuted());
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [animTime, setAnimTime] = useState(0);
  const dicePosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Determine mobile environment for 60 FPS performance tuning (iPhone & Android)
  const isMobile = useMemo(() => isMobileDevice(), []);

  // Shared geometry (4 radial segments on mobile, 6 on desktop)
  const sharedGeometry = useMemo(() => getSharedDiceGeometry(isMobile ? 4 : 6), [isMobile]);

  // Shared PBR materials across both dice
  const sharedMaterials = useMemo(
    () => getSharedDiceMaterials(materialType, isMobile),
    [materialType, isMobile]
  );

  // Shared contact shadow texture & geometry
  const shadowTexture = useMemo(() => getDiceContactShadowTexture(isMobile), [isMobile]);
  const sharedShadowGeometry = useMemo(
    () => new THREE.PlaneGeometry(2.4, 2.4),
    []
  );

  return (
    <div
      className="relative w-full h-44 sm:h-48 select-none touch-none"
      style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}
      onClick={() => {
        if (canRoll && !isRolling) onRoll();
      }}
      onTouchStart={() => {
        // Instant audio context resumption on mobile touch interaction
        diceAudio.getMuted();
      }}
    >
      {/* Premium Toolbar: Sound FX Toggle & Material Selector (Polished Ivory vs Vegas Glossy Ruby) */}
      <div
        className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg p-0.5 text-xs shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sound FX Mute / Unmute Toggle */}
        <button
          type="button"
          onClick={() => {
            const nextMuted = !isMuted;
            setIsMuted(nextMuted);
            diceAudio.setMuted(nextMuted);
          }}
          className={`p-1 rounded transition-colors ${
            !isMuted
              ? 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
          }`}
          title={isMuted ? 'Sound Effects Muted (Click to Unmute)' : 'Sound Effects Active (Click to Mute)'}
          aria-label={isMuted ? 'Unmute dice audio' : 'Mute dice audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <div className="w-px h-3.5 bg-slate-700/60" />

        <button
          type="button"
          onClick={() => setMaterialType('ivory')}
          className={`px-2 py-0.5 rounded transition-all font-medium ${
            materialType === 'ivory'
              ? 'bg-amber-100 text-slate-900 shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Polished Ivory with 24K Gold Trim & Recessed Onyx Pips"
        >
          Polished Ivory
        </button>
        <button
          type="button"
          onClick={() => setMaterialType('glossy-plastic')}
          className={`px-2 py-0.5 rounded transition-all font-medium ${
            materialType === 'glossy-plastic'
              ? 'bg-rose-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Vegas Casino Candy Ruby Plastic"
        >
          Glossy Ruby
        </button>
      </div>

      <Canvas
        shadows
        dpr={isMobile ? [1, 1.6] : [1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          preserveDrawingBuffer: false,
        }}
        camera={{
          position: [2.9, 3.2, 3.5],
          fov: 40,
          near: 0.1,
          far: 50,
        }}
        style={{ width: '100%', height: '100%', background: 'transparent', touchAction: 'none' }}
      >
        {/* Softbox Studio Environment for realistic physically based reflections */}
        <StudioEnvironment />

        {/* Intelligent Mobile Shadow Manager: Disables shadowMap autoUpdate during idle to preserve 60 FPS */}
        <ShadowManager isRolling={isRolling} />

        {/* Step 2: Camera Controller with Smooth Zoom Effect */}
        <CameraController
          isRolling={isRolling}
          animTime={animTime}
          dicePosRef={dicePosRef}
        />

        {/* Ambient Fill Light - balanced for mobile single-fill optimization */}
        <ambientLight intensity={isMobile ? 0.8 : 0.65} color="#f8fafc" />

        {/* Primary Directional Key Light with Mobile-Optimized Soft Shadows */}
        <directionalLight
          position={[3.8, 7.5, 3.2]}
          intensity={2.8}
          color="#ffffff"
          castShadow
          shadow-mapSize={isMobile ? [1024, 1024] : [2048, 2048]}
          shadow-bias={-0.00015}
          shadow-normalBias={0.035}
          shadow-radius={isMobile ? 2.5 : 3.5}
          shadow-camera-near={0.5}
          shadow-camera-far={22}
          shadow-camera-left={-4.0}
          shadow-camera-right={4.0}
          shadow-camera-top={4.0}
          shadow-camera-bottom={-4.0}
        />

        {/* Secondary Warm Champagne Gold Rim Light (Accentuates rounded edges & corners) */}
        <directionalLight
          position={[-3.5, 3.2, -3.2]}
          intensity={isMobile ? 0.95 : 1.3}
          color="#fef08a"
        />

        {/* Cool Daylight Fill Light - enabled on desktop, combined with ambient on mobile to save GPU cycles */}
        {!isMobile && (
          <directionalLight
            position={[-2.8, 1.8, 3.8]}
            intensity={0.65}
            color="#93c5fd"
          />
        )}

        {/* Emerald Accent Light from Pedestal Center */}
        <pointLight
          position={[0, -0.6, 2.5]}
          intensity={isMobile ? 0.4 : 0.6}
          color="#10b981"
          distance={isMobile ? 6 : 8}
        />

        {/* Floor Shadow Plane to receive realistic directional drop shadow */}
        <mesh
          position={[0, -0.775, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[16, 16]} />
          <shadowMaterial opacity={0.38} />
        </mesh>

        {/* High-Tech Circular Floor Pedestal Graphic */}
        <group position={[0, -0.7745, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* Inner Pedestal Ring */}
          <mesh>
            <ringGeometry args={[1.35, 1.42, isMobile ? 24 : 48]} />
            <meshBasicMaterial color="#065f46" transparent opacity={0.5} depthWrite={false} />
          </mesh>
          {/* Outer Segmented Ring */}
          <mesh>
            <ringGeometry args={[1.7, 1.74, isMobile ? 24 : 48]} />
            <meshBasicMaterial color="#0e7490" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        </group>

        {/* Step 15: Pedestal Glow Effect */}
        <PedestalGlow glowIntensity={glowIntensity} isMobile={isMobile} />

        {/* The 3D Dice Physical Cubes with Rounded Corners & PBR Shading */}
        <PhysicalDiceCube
          lastRoll={lastRoll ? lastRoll[0] : null}
          isRolling={isRolling}
          canRoll={canRoll}
          onRoll={onRoll}
          geometry={sharedGeometry}
          materials={sharedMaterials}
          shadowGeometry={sharedShadowGeometry}
          shadowTexture={shadowTexture}
          dicePosRef={dicePosRef}
          dieIndex={0}
          onAnimationComplete={onAnimationComplete}
          onGlowChange={setGlowIntensity}
          onAnimTimeChange={setAnimTime}
        />
        <PhysicalDiceCube
          lastRoll={lastRoll ? lastRoll[1] : null}
          isRolling={isRolling}
          canRoll={canRoll}
          onRoll={onRoll}
          geometry={sharedGeometry}
          materials={sharedMaterials}
          shadowGeometry={sharedShadowGeometry}
          shadowTexture={shadowTexture}
          dieIndex={1}
        />
      </Canvas>
    </div>
  );
};
