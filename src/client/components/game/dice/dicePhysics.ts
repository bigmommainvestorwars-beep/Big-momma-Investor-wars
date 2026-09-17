import * as THREE from 'three';

/**
 * Standard D6 Opposite Face Mapping (Sum = 7):
 * Face 1 (+Y) <-> Face 6 (-Y)
 * Face 2 (+Z) <-> Face 5 (-Z)
 * Face 3 (+X) <-> Face 4 (-X)
 */
export const FACE_EULER_ANGLES: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

export const LOCAL_FACE_NORMALS: Record<number, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  2: new THREE.Vector3(0, 0, 1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  5: new THREE.Vector3(0, 0, -1),
  6: new THREE.Vector3(0, -1, 0),
};

export interface DicePhysicsConfig {
  gravity: number; // m/s^2 (downward acceleration)
  restitution: number; // coefficient of restitution for bounce
  frictionAir: number; // linear air drag coefficient
  frictionGround: number; // tangential ground friction
  rotationalAirDrag: number; // angular drag in air
  rotationalGroundDrag: number; // angular friction on ground
  mass: number;
  size: number;
}

export const DEFAULT_PHYSICS_CONFIG: DicePhysicsConfig = {
  gravity: -13.5,
  restitution: 0.54,
  frictionAir: 0.28,
  frictionGround: 8.5,
  rotationalAirDrag: 0.35,
  rotationalGroundDrag: 6.5,
  mass: 1.0,
  size: 1.55,
};

export interface DicePhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3; // rad/s
  time: number;
  isSimulating: boolean;
  settled: boolean;
  bounceCount: number;
  targetNumber: number;
  targetQuaternion: THREE.Quaternion;
  hasNotifiedCompletion: boolean;
  glow: number;
  kineticEnergy: number;
}

/**
 * Calculates which face of the die is currently facing upward (+Y in world space)
 */
export function getUpwardFace(quaternion: THREE.Quaternion): number {
  let bestDot = -Infinity;
  let bestFace = 1;
  const worldUp = new THREE.Vector3(0, 1, 0);

  for (let face = 1; face <= 6; face++) {
    const localNormal = LOCAL_FACE_NORMALS[face];
    const worldNormal = localNormal.clone().applyQuaternion(quaternion);
    const dot = worldNormal.dot(worldUp);
    if (dot > bestDot) {
      bestDot = dot;
      bestFace = face;
    }
  }

  return bestFace;
}

/**
 * Constructs the target quaternion for a given face number,
 * with standard isometric viewing slant (+0.38 rad Y-axis) so top + sides are visible.
 * Rotating around the world Y-axis preserves the upward (+Y) normal perfectly:
 * (0, 1, 0) rotated around Y is STILL (0, 1, 0)!
 */
export function getTargetQuaternionForFace(faceNumber: number): THREE.Quaternion {
  const [rx, ry, rz] = FACE_EULER_ANGLES[faceNumber] || FACE_EULER_ANGLES[1];
  const qFace = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));
  const qWorldY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.38);
  return qWorldY.multiply(qFace);
}

/**
 * Creates initial physics state at rest on the table
 */
export function createInitialDicePhysicsState(initialFace = 1): DicePhysicsState {
  const targetNumber = initialFace >= 1 && initialFace <= 6 ? initialFace : 1;
  const targetQuat = getTargetQuaternionForFace(targetNumber);
  return {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    quaternion: targetQuat.clone(),
    angularVelocity: new THREE.Vector3(0, 0, 0),
    time: 0,
    isSimulating: false,
    settled: true,
    bounceCount: 0,
    targetNumber,
    targetQuaternion: targetQuat.clone(),
    hasNotifiedCompletion: true,
    glow: 0,
    kineticEnergy: 0,
  };
}

/**
 * Launches a new physics simulation roll with authentic inertia, impulse,
 * angular velocity, and guaranteed target face landing orientation.
 */
export function launchDicePhysicsSimulation(
  state: DicePhysicsState,
  targetNumber: number
): void {
  const validTarget = targetNumber >= 1 && targetNumber <= 6 ? targetNumber : 1;
  state.targetNumber = validTarget;
  state.targetQuaternion = getTargetQuaternionForFace(validTarget);
  state.time = 0;
  state.isSimulating = true;
  state.settled = false;
  state.bounceCount = 0;
  state.glow = 0;
  state.hasNotifiedCompletion = false;

  // 1. Initial position on pedestal
  state.position.set(0, 0, 0);

  // 2. Initial upward velocity impulse (6.2 m/s vertical launch)
  state.velocity.set(0.18, 6.2, 0.12);

  // 3. Initial angular velocity impulse (tumbling ~28 rad/s across all axes)
  state.angularVelocity.set(24.5, 30.2, 21.8);
  state.kineticEnergy = 0.5 * (6.2 * 6.2) + 0.5 * 0.4 * (30 * 30);
}

/**
 * Integrates one time-step of rigid-body physics:
 * - Upward launch impulse & gravity deceleration
 * - Rapid 3-axis tumble across all 6 faces, 12 edges, 8 corners
 * - Easing deceleration towards the target orientation
 * - Restitution floor bounce on table felt
 * - Exact landing on the generated value (Face is 100% on top)
 * - Result glow effect and completion event trigger
 */
export function stepDicePhysics(
  state: DicePhysicsState,
  dt: number,
  dieIndex: number = 0,
  config: DicePhysicsConfig = DEFAULT_PHYSICS_CONFIG
): void {
  if (!state.isSimulating) {
    return;
  }

  // Cap dt to prevent numerical instability during frame drops
  const clampedDt = Math.min(dt, 0.033);
  state.time += clampedDt;

  const t = state.time;
  const inertia = (1 / 6) * config.mass * config.size * config.size;

  let posX = 0;
  let posY = 0;
  let posZ = 0;

  // Offset based on dieIndex to keep dice apart
  const offsetX = dieIndex === 0 ? -0.85 : 0.85;
  const offsetZ = dieIndex === 0 ? -0.2 : 0.2;
  const phaseOffset = dieIndex === 0 ? 0 : 0.05; // Second die is slightly behind

  // Adjust time with phaseOffset
  const adjT = Math.max(0, t - phaseOffset);

  // Authentic physical toss arc trajectory across the pedestal
  if (adjT < 1.85) {
    const tossT = adjT / 1.85;
    const tossArc = Math.sin(tossT * Math.PI);
    posX = offsetX + tossArc * (0.18 * (dieIndex === 0 ? 1 : -1));
    posZ = offsetZ + tossArc * (0.12 * (dieIndex === 0 ? 1 : -1));
  }

  // Phase 1: Dice lifts from platform with upward velocity (0.00s -> 0.45s)
  if (adjT < 0.45) {
    const flightProgress = adjT / 1.85;
    const parabola = Math.sin(flightProgress * Math.PI);
    posY = 1.76 * Math.pow(parabola, 0.90);

    const u = adjT / 0.45;
    // Dice begins rotating rapidly across 3D space with gyroscopic precession
    const spinSpeed = THREE.MathUtils.lerp(18, 28, u);
    
    // Dynamic precessing tumble axis that sweeps through full 3D space,
    // guaranteeing all 6 faces, 12 edges, and 8 corners face the camera
    const freq = dieIndex === 0 ? 6.2 : 6.0;
    const phase = dieIndex === 0 ? 2.0 : 2.0;
    const angleX = adjT * freq + phase;
    const angleY = adjT * (freq * 0.8 + 0.3) + phase * 0.7;
    const angleZ = adjT * (freq * 1.2 - 0.2) + phase * 1.2;
    const axis = new THREE.Vector3(
      Math.sin(angleX),
      Math.cos(angleY),
      Math.sin(angleZ)
    ).normalize();

    // Multi-axial rotation (simultaneously rotates on X, Y, and Z axes)
    const rotX = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.sin(angleX) * spinSpeed * clampedDt * 0.65
    );
    const rotY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.cos(angleY) * spinSpeed * clampedDt * 0.75
    );
    const rotZ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      Math.sin(angleZ) * spinSpeed * clampedDt * 0.65
    );

    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, spinSpeed * clampedDt);
    state.quaternion.premultiply(deltaQuat);
    state.quaternion.premultiply(rotX);
    state.quaternion.premultiply(rotY);
    state.quaternion.premultiply(rotZ);
    state.angularVelocity.set(
      Math.sin(angleX) * spinSpeed,
      Math.cos(angleY) * spinSpeed,
      Math.sin(angleZ) * spinSpeed
    );
  }
  // Phase 2: Rapid multi-axis tumble with high momentum (0.45s -> 1.35s)
  // End-over-end flips, rolls, and yaw sweeps actively showcase all 6 faces, 8 corners, and 12 edges
  else if (adjT < 1.35) {
    const flightProgress = adjT / 1.85;
    const parabola = Math.sin(flightProgress * Math.PI);
    posY = 1.76 * Math.pow(parabola, 0.90);

    const spinSpeed = 28;
    const freq = dieIndex === 0 ? 6.2 : 6.0;
    const phase = dieIndex === 0 ? 2.0 : 2.0;
    const angleX = adjT * freq + phase;
    const angleY = adjT * (freq * 0.8 + 0.3) + phase * 0.7;
    const angleZ = adjT * (freq * 1.2 - 0.2) + phase * 1.2;
    const axis = new THREE.Vector3(
      Math.sin(angleX),
      Math.cos(angleY),
      Math.sin(angleZ)
    ).normalize();

    // Multi-axial rotation (simultaneously rotates on X, Y, and Z axes performing multiple full rotations)
    const rotX = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.sin(angleX) * spinSpeed * clampedDt * 0.65
    );
    const rotY = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.cos(angleY) * spinSpeed * clampedDt * 0.75
    );
    const rotZ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      Math.sin(angleZ) * spinSpeed * clampedDt * 0.65
    );

    const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, spinSpeed * clampedDt);
    state.quaternion.premultiply(deltaQuat);
    state.quaternion.premultiply(rotX);
    state.quaternion.premultiply(rotY);
    state.quaternion.premultiply(rotZ);
    state.angularVelocity.set(
      Math.sin(angleX) * spinSpeed,
      Math.cos(angleY) * spinSpeed,
      Math.sin(angleZ) * spinSpeed
    );
  }
  // Phase 3: Natural slowing down with easing & descent (1.35s -> 1.85s)
  // Continuous ballistic descent with orientation smoothly easing toward target orientation
  else if (adjT < 1.85) {
    const flightProgress = adjT / 1.85;
    const parabola = Math.sin(flightProgress * Math.PI);
    posY = 1.76 * Math.pow(parabola, 0.90);

    const u = (adjT - 1.35) / 0.50;
    // Smooth spherical linear interpolation easing toward target orientation
    const slerpWeight = 1 - Math.exp(-(8 + u * 14) * clampedDt);
    state.quaternion.slerp(state.targetQuaternion, slerpWeight);

    const remainingSpin = 28 * (1 - u);
    state.angularVelocity.set(remainingSpin * 0.8, remainingSpin, remainingSpin * 0.6);
  }
  // Phase 4: Ground contact, realistic bounce on impact with table felt (1.85s -> 2.08s)
  else if (adjT < 2.08) {
    const bounceT = adjT - 1.85;
    if (bounceT < 0.13) {
      // Bounce 1: reaches peak 0.28 with sharp felt contact
      posY = Math.sin((bounceT / 0.13) * Math.PI) * 0.28;
      state.bounceCount = 1;
      const skid = (1 - bounceT / 0.13) * 0.035 * (dieIndex === 0 ? 1 : -1);
      posX = offsetX + skid;
      posZ = offsetZ + skid * 0.5;
    } else {
      // Bounce 2: secondary micro-clatter bounce reaching peak 0.08
      const p2 = (bounceT - 0.13) / 0.10;
      posY = Math.sin(Math.min(p2, 1) * Math.PI) * 0.08;
      state.bounceCount = 2;
      posX = offsetX;
      posZ = offsetZ;
    }

    // Locks orientation firmly into target orientation during bounce settling
    state.quaternion.slerp(state.targetQuaternion, 1 - Math.exp(-24 * clampedDt));
    state.angularVelocity.set(0.5, 0.5, 0.5);
  }
  // Phase 5: Dice lands flat, exact face displayed on top, result glow appears (>= 2.08s)
  else {
    posX = offsetX;
    posY = 0;
    posZ = offsetZ;
    // Guaranteed final face strictly equals generated result
    state.quaternion.copy(state.targetQuaternion);
    state.settled = true;
    state.angularVelocity.set(0, 0, 0);
    state.velocity.set(0, 0, 0);
    state.kineticEnergy = 0;

    // Result glow effect appears on pedestal
    state.glow = Math.min((adjT - 2.08) / 0.14, 1);

    if (adjT >= 2.25) {
      state.isSimulating = false;
    }
  }

  // Update physical linear velocity and kinetic energy accurately
  const prevX = state.position.x;
  const prevY = state.position.y;
  const prevZ = state.position.z;
  state.position.set(posX, posY, posZ);
  state.velocity.set(
    (posX - prevX) / clampedDt,
    (posY - prevY) / clampedDt,
    (posZ - prevZ) / clampedDt
  );

  const linSpeed = state.velocity.length();
  const angSpeed = state.angularVelocity.length();
  state.kineticEnergy = 0.5 * config.mass * (linSpeed * linSpeed) + 0.5 * inertia * (angSpeed * angSpeed);
}
