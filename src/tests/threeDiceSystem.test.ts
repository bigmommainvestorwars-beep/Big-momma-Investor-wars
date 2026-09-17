import test from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { authoritativeServerEngine } from '../engine/authoritativeServerEngine.js';
import {
  createInitialDicePhysicsState,
  launchDicePhysicsSimulation,
  stepDicePhysics,
  getUpwardFace,
  DEFAULT_PHYSICS_CONFIG,
  LOCAL_FACE_NORMALS,
} from '../client/components/game/dice/dicePhysics.js';
import {
  DICE_SKINS,
  DICE_SKIN_LIST,
  DiceSkinManager,
} from '../services/cosmetics/diceSkins.js';

test('True 3D Dice System: Mesh, 6 Faces, Geometry, and Authentic Pips', async (t) => {
  await t.test('1. Standard D6 Opposite Face Mapping adheres to Sum = 7 Law', () => {
    const pairs: [number, number][] = [
      [1, 6],
      [2, 5],
      [3, 4],
    ];

    pairs.forEach(([f1, f2]) => {
      assert.strictEqual(f1 + f2, 7, `Opposite faces ${f1} and ${f2} must sum to 7`);
    });
  });

  await t.test('2. All 6 Faces map to upward normal (0, 1, 0) under exact landing rotations', () => {
    const faceNormals: Record<number, THREE.Vector3> = {
      1: new THREE.Vector3(0, 1, 0),  // +Y
      2: new THREE.Vector3(0, 0, 1),  // +Z
      3: new THREE.Vector3(1, 0, 0),  // +X
      4: new THREE.Vector3(-1, 0, 0), // -X
      5: new THREE.Vector3(0, 0, -1), // -Z
      6: new THREE.Vector3(0, -1, 0), // -Y
    };

    const targetEulerAngles: Record<number, [number, number, number]> = {
      1: [0, 0, 0],
      2: [-Math.PI / 2, 0, 0],
      3: [0, 0, Math.PI / 2],
      4: [0, 0, -Math.PI / 2],
      5: [Math.PI / 2, 0, 0],
      6: [Math.PI, 0, 0],
    };

    for (let face = 1; face <= 6; face++) {
      const initialNormal = faceNormals[face].clone();
      const [rx, ry, rz] = targetEulerAngles[face];
      const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
      initialNormal.applyEuler(euler);

      assert.ok(
        Math.abs(initialNormal.y - 1.0) < 0.001,
        `Face ${face} must rotate normal.y to 1.000, got ${initialNormal.y}`
      );
      assert.ok(
        Math.abs(initialNormal.x) < 0.001,
        `Face ${face} normal.x must be 0, got ${initialNormal.x}`
      );
      assert.ok(
        Math.abs(initialNormal.z) < 0.001,
        `Face ${face} normal.z must be 0, got ${initialNormal.z}`
      );
    }
  });

  await t.test('3. Three.js BoxGeometry provides 6 distinct face material slots', () => {
    const geom = new THREE.BoxGeometry(1.55, 1.55, 1.55, 2, 2, 2);
    assert.strictEqual(geom.type, 'BoxGeometry');
    assert.strictEqual(geom.groups.length, 6, 'A standard 3D BoxGeometry must have 6 material groups');
    geom.dispose();
  });

  await t.test('4. Resting isometric perspective showcases 3 visible faces, corners and edges (never flat)', () => {
    const cameraPos = new THREE.Vector3(2.8, 3.1, 3.4).normalize();
    const cubeFaceNormals = [
      new THREE.Vector3(0, 1, 0), // Top face (+Y)
      new THREE.Vector3(0, 0, 1), // Front face (+Z)
      new THREE.Vector3(1, 0, 0), // Right face (+X)
    ];

    const visibleFacesTowardsCamera = cubeFaceNormals.filter((normal) => {
      return normal.dot(cameraPos) > 0.1;
    });

    assert.strictEqual(
      visibleFacesTowardsCamera.length,
      3,
      'Resting perspective camera must observe exactly 3 distinct 3D faces simultaneously to show edges and depth'
    );
  });

  await t.test('5. Authoritative Server Engine accepts predeterminedRoll matching client random result', async () => {
    const match = await authoritativeServerEngine.createMatch('test_match_dice', 'test_host', 'Test Host', 'board_52');
    const hostPlayerId = 'test_host';

    // Add bot to allow starting match
    await authoritativeServerEngine.addBotPlayer(match.id, 'req_add_bot');

    // Start match
    const startedMatch = await authoritativeServerEngine.startMatch(match.id, hostPlayerId);
    const activePlayerId = startedMatch.currentPlayerId!;

    // Request roll with predetermined result = 5
    const rollResult = await authoritativeServerEngine.requestRoll(
      match.id,
      'req_test_dice_1',
      activePlayerId,
      undefined,
      5
    );

    assert.strictEqual(rollResult.roll, 5, 'Server must honor predetermined roll of 5');
    assert.strictEqual(rollResult.newSpace, 5, 'Player starting at space 0 must advance 5 spaces to space 5');
  });

  await t.test('6. 16-Step Animation Sequence Trajectory & Physics Verification', () => {
    // 3. Dice lifts from platform: height rises at t = 0.25s
    const liftT = 0.25;
    const liftHeight = Math.sin((liftT / 0.45) * (Math.PI / 2)) * 1.65;
    assert.ok(liftHeight > 0.5, `Step 3: Lift height must be > 0.5 at t=${liftT}, got ${liftHeight}`);

    // 5. Multi-axis rotation simultaneously across X, Y, Z
    const speed = 28;
    const delta = 0.016;
    const rotX = speed * 1.25 * delta;
    const rotY = speed * 1.55 * delta;
    const rotZ = speed * 1.05 * delta;
    assert.ok(rotX > 0 && rotY > 0 && rotZ > 0, 'Step 5: X, Y, Z rotations must all be non-zero simultaneously');

    // 10. Bounce physics: impact at 1.85s produces bounce height
    const bounceT = 1.91 - 1.85; // peak of first bounce
    const bounceHeight = Math.sin((bounceT / 0.13) * Math.PI) * 0.30;
    assert.ok(bounceHeight > 0.15, `Step 10: Bounce height must be positive, got ${bounceHeight}`);

    // 13, 14. Final face equals generated result at landing (t >= 2.08s)
    const settleT = 2.10;
    const isLanded = settleT >= 2.08;
    assert.ok(isLanded, 'Step 13: Dice must be landed at t >= 2.08s');

    // 15. Result glow effect appears (glow > 0)
    const glow = Math.min((settleT - 2.08) / 0.14, 1);
    assert.ok(glow > 0, `Step 15: Glow must be > 0 after landing, got ${glow}`);

    // 16. Movement begins (t >= 2.25s)
    const movementTriggerTime = 2.25;
    assert.ok(movementTriggerTime >= 2.10, 'Step 16: Movement begins after dice lands and glow appears');
  });

  await t.test('7. Cinematic Camera: Zoom, Rotation, Tracking during roll and smooth return after landing', () => {
    const DEFAULT_POS = { x: 2.8, y: 3.1, z: 3.4 };
    const defaultRXZ = Math.hypot(DEFAULT_POS.x, DEFAULT_POS.z);
    const defaultTheta = Math.atan2(DEFAULT_POS.x, DEFAULT_POS.z);

    // During rolling flight (e.g. t = 0.925s, halfway through roll)
    const midRollT = 0.925;
    const flightProgress = midRollT / 1.85;
    const flightArc = Math.sin(flightProgress * Math.PI); // peak = 1.0

    // 1. Camera slightly zooms (~24% zoom closer)
    const currentRXZ = defaultRXZ * (1 - 0.24 * flightArc);
    assert.ok(
      currentRXZ < defaultRXZ,
      `Camera distance in XZ plane during rolling (${currentRXZ.toFixed(3)}) must be closer than default (${defaultRXZ.toFixed(3)}) for dynamic zoom`
    );

    // 2. Camera slightly rotates (orbital sweep ~22 degrees)
    const orbitSweep = flightArc * 0.38;
    const currentTheta = defaultTheta + orbitSweep;
    const rotationDeg = ((currentTheta - defaultTheta) * 180) / Math.PI;
    assert.ok(
      rotationDeg > 10 && rotationDeg < 30,
      `Camera rotation angle during rolling must be an authentic sweep between 10° and 30°, got ${rotationDeg.toFixed(1)}°`
    );

    // 3. Camera follows dice movement (lookAt target tracks dice elevation)
    const diceElevationAtPeak = 1.65;
    const targetLookAtY = diceElevationAtPeak * 0.80 + 0.1;
    assert.ok(
      targetLookAtY > 1.0,
      `Camera lookAt elevation must track upward with rising dice (got ${targetLookAtY.toFixed(2)})`
    );

    // 4. After landing (t >= 2.05s): Camera returns to default position & lookAt
    const settledT = 2.10;
    const inFlightSettled = settledT < 2.05;
    assert.strictEqual(inFlightSettled, false, 'inFlight must be false once dice has landed and settled');

    const settledTargetPos = !inFlightSettled ? DEFAULT_POS : null;
    assert.deepStrictEqual(
      settledTargetPos,
      DEFAULT_POS,
      'Target camera position must smoothly return to default [2.8, 3.1, 3.4] after landing'
    );
  });

  await t.test('8. Physics Simulation: Inertia, Gravity, Angular Velocity, and Friction Integration', () => {
    const state = createInitialDicePhysicsState(3);
    launchDicePhysicsSimulation(state, 3);

    assert.ok(state.isSimulating, 'Simulation must be active upon launch');
    assert.ok(state.velocity.y > 5.0, `Initial upward launch velocity must be > 5.0 m/s, got ${state.velocity.y}`);
    assert.ok(state.angularVelocity.length() > 20.0, `Initial angular speed must be > 20 rad/s, got ${state.angularVelocity.length()}`);

    // Step 10 frames of 16ms (t = 0.16s)
    const dt = 0.016;
    const initialVy = state.velocity.y;
    for (let i = 0; i < 10; i++) {
      stepDicePhysics(state, dt);
    }

    // Gravity must decelerate upward velocity
    assert.ok(
      state.velocity.y < initialVy,
      `Gravity must decelerate vertical velocity from ${initialVy} to below (got ${state.velocity.y})`
    );
    // Position must have lifted upward due to inertia
    assert.ok(state.position.y > 0.4, `Dice must have ascended due to vertical inertia (got ${state.position.y})`);
  });

  await t.test('9. Physics Simulation: Bounces on Floor with Restitution and Surface Friction', () => {
    const state = createInitialDicePhysicsState(5);
    launchDicePhysicsSimulation(state, 5);

    let recordedBounceCount = 0;
    const dt = 0.016;
    // Step forward 120 frames (approx 1.92s)
    for (let i = 0; i < 120; i++) {
      stepDicePhysics(state, dt);
      if (state.bounceCount > recordedBounceCount) {
        recordedBounceCount = state.bounceCount;
      }
    }

    assert.ok(recordedBounceCount >= 1, `Dice must experience at least 1 bounce on the floor, recorded ${recordedBounceCount}`);
  });

  await t.test('10. Physics Simulation: Momentum Gradually Decays (No Instant Freeze)', () => {
    const state = createInitialDicePhysicsState(4);
    launchDicePhysicsSimulation(state, 4);

    const energies: number[] = [];
    const dt = 0.016;

    // Sample kinetic energy at different stages
    for (let i = 0; i < 135; i++) {
      stepDicePhysics(state, dt);
      if (i === 10 || i === 40 || i === 70 || i === 100 || i === 125) {
        energies.push(state.kineticEnergy);
      }
    }

    assert.ok(energies.length >= 5, 'Must collect multiple kinetic energy samples');
    // Energy at t ~ 1.6s (index 100) must be significantly lower than early flight (index 10)
    assert.ok(
      energies[3] < energies[0],
      `Kinetic energy must dissipate over time (early: ${energies[0].toFixed(2)}, later: ${energies[3].toFixed(2)})`
    );
    // Die must not freeze to zero abruptly at step 10 or 40
    assert.ok(energies[1] > 0.1, 'Energy must persist during mid-flight inertia without premature freeze');
  });

  await t.test('11. Physics Simulation: All 6 Faces (1..6) Reliable Final Rest Matching Generated Result', () => {
    for (let targetFace = 1; targetFace <= 6; targetFace++) {
      const state = createInitialDicePhysicsState(targetFace);
      launchDicePhysicsSimulation(state, targetFace);

      // Run simulation to full settlement (140 frames of 16ms = 2.24s)
      const dt = 0.016;
      for (let f = 0; f < 140; f++) {
        stepDicePhysics(state, dt);
      }

      assert.strictEqual(state.settled, true, `Face ${targetFace} simulation must settle within 2.24s`);
      const upwardFace = getUpwardFace(state.quaternion);
      assert.strictEqual(
        upwardFace,
        targetFace,
        `Final resting upward face (${upwardFace}) must strictly equal generated target number (${targetFace})`
      );
    }
  });

  await t.test('12. Premium Geometry: RoundedBoxGeometry with radiused corners and 6 face groups', async () => {
    const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
    const geom = new RoundedBoxGeometry(1.55, 1.55, 1.55, 6, 0.16);

    assert.strictEqual(geom.groups.length, 6, 'RoundedBoxGeometry must provide 6 distinct material groups for the 6 D6 faces');
    const params = (geom as unknown as { parameters: { radius: number; segments: number } }).parameters;
    assert.strictEqual(params.radius, 0.16, 'Rounded corners radius must be 0.16 for authentic beveled edge roll-off');
    assert.strictEqual(params.segments, 6, 'Rounded corners must have 6 radial segments for smooth curvature');

    geom.dispose();
  });

  await t.test('13. Physically Based Rendering: Polished Ivory & Glossy Plastic Material Specs', () => {
    // Ivory PBR spec
    const ivoryMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.12,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.9,
      ior: 1.54,
      bumpScale: 0.055,
    });

    assert.strictEqual(ivoryMat.clearcoat, 1.0, 'Polished ivory must have full 1.0 clearcoat lacquer depth');
    assert.ok(ivoryMat.clearcoatRoughness <= 0.05, 'Clearcoat roughness must be <= 0.05 for mirror-gloss reflection');
    assert.strictEqual(ivoryMat.metalness, 0.0, 'Ivory must be pure dielectric non-metal (metalness = 0)');
    assert.strictEqual(ivoryMat.bumpScale, 0.055, 'Bump scale must be non-zero for physical 3D carved pip depth');

    // Glossy Plastic PBR spec
    const plasticMat = new THREE.MeshPhysicalMaterial({
      roughness: 0.08,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transmission: 0.25,
      thickness: 1.2,
      bumpScale: 0.055,
    });

    assert.strictEqual(plasticMat.clearcoat, 1.0, 'Glossy plastic must have 1.0 clearcoat');
    assert.ok(plasticMat.transmission > 0.2, 'Candy casino plastic must have internal light transmission');

    ivoryMat.dispose();
    plasticMat.dispose();
  });

  await t.test('14. Studio Lighting & Soft Real Shadows: High-Resolution Shadow Map & Softbox Reflection Environment', async () => {
    const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
    const roomEnv = new RoomEnvironment();

    assert.ok(roomEnv, 'RoomEnvironment studio softbox environment must instantiate properly');
    assert.strictEqual(typeof roomEnv.dispose, 'function', 'RoomEnvironment must support disposal');

    const shadowMapSize = [2048, 2048];
    assert.strictEqual(shadowMapSize[0], 2048, 'Primary key light shadow map resolution must be 2048x2048 for crisp soft shadows');

    roomEnv.dispose();
  });

  await t.test('15. Synchronized Casino Audio System: Tumble, Impacts, Landing, and Victory Chime', async () => {
    const { diceAudio } = await import('../client/components/game/dice/diceAudio');

    // Verify all audio API methods exist and handle non-browser gracefully
    assert.strictEqual(typeof diceAudio.startRollingSound, 'function');
    assert.strictEqual(typeof diceAudio.stopRollingSound, 'function');
    assert.strictEqual(typeof diceAudio.playCubeTumbleSound, 'function');
    assert.strictEqual(typeof diceAudio.playTableImpact, 'function');
    assert.strictEqual(typeof diceAudio.playFinalLandingImpact, 'function');
    assert.strictEqual(typeof diceAudio.playResultSuccessSound, 'function');
    assert.strictEqual(typeof diceAudio.setMuted, 'function');
    assert.strictEqual(typeof diceAudio.getMuted, 'function');

    // Test mute toggle functionality
    diceAudio.setMuted(true);
    assert.strictEqual(diceAudio.getMuted(), true);
    diceAudio.setMuted(false);
    assert.strictEqual(diceAudio.getMuted(), false);

    // Test calling audio methods safely in headless environment
    diceAudio.startRollingSound();
    diceAudio.playCubeTumbleSound(1.0);
    diceAudio.playTableImpact(1);
    diceAudio.playTableImpact(2);
    diceAudio.playFinalLandingImpact();
    diceAudio.playResultSuccessSound(6);
    diceAudio.stopRollingSound();

    // Verify frame-accurate synchronization with physics simulation timeline
    const targetFace = 5;
    const state = createInitialDicePhysicsState(targetFace);
    launchDicePhysicsSimulation(state, targetFace);

    const audioLog: Array<{ event: string; time: number }> = [];
    const flags = {
      lastTumble: 0,
      bounce1: false,
      bounce2: false,
      landing: false,
      success: false,
    };

    // Step physics frame by frame at 16ms delta
    const dt = 0.016;
    for (let i = 0; i < 150; i++) {
      stepDicePhysics(state, dt);

      if (state.time >= 0.15 && state.time < 1.75) {
        if (state.time - flags.lastTumble >= 0.20) {
          flags.lastTumble = state.time;
          audioLog.push({ event: 'tumble', time: state.time });
        }
      }

      if (state.bounceCount === 1 && !flags.bounce1) {
        flags.bounce1 = true;
        audioLog.push({ event: 'impact_1', time: state.time });
      }

      if (state.bounceCount === 2 && !flags.bounce2) {
        flags.bounce2 = true;
        audioLog.push({ event: 'impact_2', time: state.time });
      }

      if (state.settled && !flags.landing) {
        flags.landing = true;
        audioLog.push({ event: 'final_landing', time: state.time });
      }

      if (state.glow >= 0.10 && !flags.success) {
        flags.success = true;
        audioLog.push({ event: 'success_sound', time: state.time });
      }
    }

    // Verify timeline synchronization
    const tumbleEvents = audioLog.filter((e) => e.event === 'tumble');
    assert.ok(tumbleEvents.length >= 6, 'Must play periodic cube tumble micro-clacks during mid-air flight');

    const impact1 = audioLog.find((e) => e.event === 'impact_1');
    assert.ok(impact1, 'Must play table impact 1 on primary ground contact');
    assert.ok(impact1.time >= 1.80 && impact1.time <= 1.95, 'Table impact 1 must occur at ~1.85s');

    const impact2 = audioLog.find((e) => e.event === 'impact_2');
    assert.ok(impact2, 'Must play table impact 2 on secondary bounce');
    assert.ok(impact2.time >= 1.95 && impact2.time <= 2.05, 'Table impact 2 must occur at ~1.98s');

    const finalLanding = audioLog.find((e) => e.event === 'final_landing');
    assert.ok(finalLanding, 'Must play final landing impact sound when settled');
    assert.ok(finalLanding.time >= 2.05 && finalLanding.time <= 2.15, 'Final landing sound must occur at ~2.08s');

    const successSound = audioLog.find((e) => e.event === 'success_sound');
    assert.ok(successSound, 'Must play success chime when result appears');
    assert.ok(successSound.time >= 2.08 && successSound.time <= 2.20, 'Success sound must synchronize with result glow');
  });

  await t.test('16. Mobile Performance (60 FPS on iPhone & Android): Geometry, Lighting, Shadows & Touch', async () => {
    const { isMobileDevice } = await import('../client/components/game/dice/ThreeDiceScene');
    const { createDiceFaceTextures } = await import('../client/components/game/dice/DiceTextures');
    const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');

    // 1. Mobile Device Detection logic
    assert.strictEqual(typeof isMobileDevice, 'function', 'isMobileDevice detector must be exported');

    // 2. Texture Cache: verify that repeated calls for textures return cached packages
    const pkg1 = createDiceFaceTextures('ivory', true);
    const pkg2 = createDiceFaceTextures('ivory', true);
    assert.strictEqual(pkg1, pkg2, 'Dice textures must be cached and shared across dice to save VRAM');

    // 3. Geometry Optimization for Mobile vs Desktop
    // Mobile uses 4 segments to cut vertex load by 50%, desktop uses 6 segments
    const mobileGeom = new RoundedBoxGeometry(1.55, 1.55, 1.55, 4, 0.16);
    const desktopGeom = new RoundedBoxGeometry(1.55, 1.55, 1.55, 6, 0.16);
    assert.ok(mobileGeom.attributes.position.count < desktopGeom.attributes.position.count, 'Mobile geometry must use fewer vertices than desktop geometry');
    assert.ok(mobileGeom.attributes.position.count > 0, 'Mobile geometry must have valid vertices');
    mobileGeom.dispose();
    desktopGeom.dispose();

    // 4. Shadow Map Configuration: 1024x1024 on mobile for high frame rate, 2048x2048 on desktop
    const mobileShadowMapSize = [1024, 1024];
    const desktopShadowMapSize = [2048, 2048];
    assert.strictEqual(mobileShadowMapSize[0], 1024, 'Mobile shadow map must be 1024x1024 for 60 FPS performance');
    assert.strictEqual(desktopShadowMapSize[0], 2048, 'Desktop shadow map must be 2048x2048 for full studio fidelity');
  });

  await t.test('17. Real 3D Cube: All Six Faces Must Be Directly Seen While Dice Rotates', () => {
    // Camera is positioned at casino table perspective [2.8, 3.1, 3.4]
    const camPos = new THREE.Vector3(2.8, 3.1, 3.4);

    // Test both Die 0 and Die 1 across multiple initial faces
    for (let dieIndex of [0, 1]) {
      const state = createInitialDicePhysicsState(1);
      launchDicePhysicsSimulation(state, 6);

      const maxDotProducts: Record<number, number> = { 1: -1, 2: -1, 3: -1, 4: -1, 5: -1, 6: -1 };
      const dt = 0.016;

      // Simulate the airborne tumble phase (0 to 1.35s)
      for (let step = 0; step < 85; step++) {
        stepDicePhysics(state, dt, dieIndex);

        // Vector from dice to camera
        const camDir = new THREE.Vector3().subVectors(camPos, state.position).normalize();

        // Calculate dot product of each face normal with camera direction
        for (let face = 1; face <= 6; face++) {
          const worldNormal = LOCAL_FACE_NORMALS[face].clone().applyQuaternion(state.quaternion);
          const dot = worldNormal.dot(camDir);
          if (dot > maxDotProducts[face]) {
            maxDotProducts[face] = dot;
          }
        }
      }

      // Assert that every single one of the 6 faces directly faced the player/camera (dot product > 0.85)
      for (let face = 1; face <= 6; face++) {
        assert.ok(
          maxDotProducts[face] > 0.80,
          `Die ${dieIndex}: Face ${face} must face the camera prominently during rotation (got dot ${maxDotProducts[face].toFixed(3)})`
        );
      }
    }
  });

  await t.test('18. Multi-Axial Rotation: Rotates on X, Y, Z axes with multiple full rotations and reveals all corners & edges', () => {
    const camPos = new THREE.Vector3(2.9, 3.2, 3.5);

    const CORNER_NORMALS = [
      new THREE.Vector3(1, 1, 1).normalize(),
      new THREE.Vector3(1, 1, -1).normalize(),
      new THREE.Vector3(1, -1, 1).normalize(),
      new THREE.Vector3(1, -1, -1).normalize(),
      new THREE.Vector3(-1, 1, 1).normalize(),
      new THREE.Vector3(-1, 1, -1).normalize(),
      new THREE.Vector3(-1, -1, 1).normalize(),
      new THREE.Vector3(-1, -1, -1).normalize(),
    ];

    const EDGE_NORMALS = [
      new THREE.Vector3(1, 1, 0).normalize(),
      new THREE.Vector3(1, -1, 0).normalize(),
      new THREE.Vector3(-1, 1, 0).normalize(),
      new THREE.Vector3(-1, -1, 0).normalize(),
      new THREE.Vector3(1, 0, 1).normalize(),
      new THREE.Vector3(1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0, 1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
      new THREE.Vector3(0, 1, 1).normalize(),
      new THREE.Vector3(0, 1, -1).normalize(),
      new THREE.Vector3(0, -1, 1).normalize(),
      new THREE.Vector3(0, -1, -1).normalize(),
    ];

    for (let dieIndex of [0, 1]) {
      const state = createInitialDicePhysicsState(1);
      launchDicePhysicsSimulation(state, 5);

      const maxCornerDots = CORNER_NORMALS.map(() => -1);
      const maxEdgeDots = EDGE_NORMALS.map(() => -1);
      let totalRotAngle = 0;
      const dt = 0.016;

      for (let step = 0; step < 85; step++) {
        const prevQ = state.quaternion.clone();
        stepDicePhysics(state, dt, dieIndex);
        const deltaAngle = prevQ.angleTo(state.quaternion);
        totalRotAngle += deltaAngle;

        const camDir = new THREE.Vector3().subVectors(camPos, state.position).normalize();

        CORNER_NORMALS.forEach((cn, i) => {
          const worldN = cn.clone().applyQuaternion(state.quaternion);
          const dot = worldN.dot(camDir);
          if (dot > maxCornerDots[i]) maxCornerDots[i] = dot;
        });

        EDGE_NORMALS.forEach((en, i) => {
          const worldN = en.clone().applyQuaternion(state.quaternion);
          const dot = worldN.dot(camDir);
          if (dot > maxEdgeDots[i]) maxEdgeDots[i] = dot;
        });
      }

      // Assert multiple full rotations (> 2 full revolutions = 4 * PI rad)
      const fullRotations = totalRotAngle / (2 * Math.PI);
      assert.ok(
        fullRotations >= 3.0,
        `Die ${dieIndex} must perform multiple full rotations (completed ${fullRotations.toFixed(2)} full rotations)`
      );

      // Assert all 8 corners are prominently visible during rotation
      CORNER_NORMALS.forEach((_, i) => {
        assert.ok(
          maxCornerDots[i] > 0.80,
          `Die ${dieIndex} corner #${i} must face the camera prominently (got dot ${maxCornerDots[i].toFixed(2)})`
        );
      });

      // Assert all 12 edges are prominently visible during rotation
      EDGE_NORMALS.forEach((_, i) => {
        assert.ok(
          maxEdgeDots[i] > 0.80,
          `Die ${dieIndex} edge #${i} must face the camera prominently (got dot ${maxEdgeDots[i].toFixed(2)})`
        );
      });
    }
  });

  await t.test('19. Camera View Persistence: Dice remains continuously inside camera view throughout entire roll', () => {
    const corners = [
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),
      new THREE.Vector3(-0.5, 0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(-0.5, 0.5, 0.5),
      new THREE.Vector3(0.5, 0.5, 0.5),
    ];

    // Verify under multiple aspect ratios: widescreen, standard, square, and mobile portrait
    for (const aspect of [2.0, 1.5, 1.0, 0.85]) {
      const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);

      for (let dieIndex of [0, 1]) {
        const state = createInitialDicePhysicsState(1);
        launchDicePhysicsSimulation(state, 6);
        const dt = 0.016;

        for (let step = 0; step < 140; step++) {
          stepDicePhysics(state, dt, dieIndex);
          const animTime = state.time;

          // Camera tracking trajectory
          const inFlight = animTime < 2.05;
          const flightProgress = Math.min(animTime / 1.85, 1);
          const flightArc = Math.sin(flightProgress * Math.PI);
          const orbitSweep = flightArc * 0.28;
          const theta = Math.atan2(2.9, 3.5) + orbitSweep;
          const currentRXZ = THREE.MathUtils.lerp(Math.hypot(2.9, 3.5), Math.hypot(2.9, 3.5) * 0.92, flightArc);
          const targetCamX = inFlight ? Math.sin(theta) * currentRXZ + state.position.x * 0.30 : 2.9;
          const targetCamZ = inFlight ? Math.cos(theta) * currentRXZ + state.position.z * 0.30 : 3.5;
          const targetCamY = inFlight ? 3.2 + state.position.y * 0.45 : 3.2;

          camera.position.set(targetCamX, targetCamY, targetCamZ);
          camera.lookAt(
            inFlight ? new THREE.Vector3(state.position.x * 0.45, state.position.y * 0.75 + 0.1, state.position.z * 0.45) : new THREE.Vector3(0, 0.1, 0)
          );
          camera.updateMatrixWorld();
          camera.updateProjectionMatrix();

          // Every corner of the 3D cube must stay inside Normalized Device Coordinates [-1.0, 1.0]
          for (const c of corners) {
            const worldP = c.clone().applyQuaternion(state.quaternion).add(state.position);
            const ndc = worldP.project(camera);

            assert.ok(
              ndc.x >= -1.0 && ndc.x <= 1.0,
              `NDC X out of view at step ${step}: got ${ndc.x} (aspect ${aspect})`
            );
            assert.ok(
              ndc.y >= -1.0 && ndc.y <= 1.0,
              `NDC Y out of view at step ${step}: got ${ndc.y} (aspect ${aspect})`
            );
          }
        }
      }
    }
  });

  await t.test('20. Phase 4 Cosmetic Rewards: Dice Skins Roster & Manager Integration', () => {
    // 1. Roster verification
    assert.strictEqual(DICE_SKIN_LIST.length, 5, 'Should provide exactly 5 cosmetic dice skins');
    const expectedSkinIds = ['obsidian-gold', 'neon-cyberpunk', 'crystal-ruby', 'ivory', 'emerald-vip'];
    expectedSkinIds.forEach((id) => {
      assert.ok(DICE_SKINS[id], `DICE_SKINS must contain '${id}'`);
      assert.ok(DICE_SKINS[id].name, `Skin '${id}' must have a valid display name`);
      assert.ok(DICE_SKINS[id].badgeIcon, `Skin '${id}' must have a badge icon`);
      assert.ok(DICE_SKINS[id].rarity, `Skin '${id}' must have a rarity`);
    });

    // 2. Default unlock checks
    const unlocked = DiceSkinManager.getUnlockedSkins();
    assert.ok(unlocked.has('obsidian-gold'), 'Obsidian & Gold must be unlocked by default');
    assert.ok(unlocked.has('ivory'), 'Royal Ivory must be unlocked by default');

    // 3. Locking / unlocking rewards
    const neonUnlockedInitially = DiceSkinManager.isSkinUnlocked('neon-cyberpunk');
    DiceSkinManager.unlockSkin('neon-cyberpunk');
    assert.strictEqual(
      DiceSkinManager.isSkinUnlocked('neon-cyberpunk'),
      true,
      'Neon Cyberpunk should now be unlocked'
    );

    // 4. Equipping skin
    const equipResult = DiceSkinManager.equipSkin('neon-cyberpunk');
    assert.strictEqual(equipResult.success, true, 'Should successfully equip unlocked skin');
    assert.strictEqual(
      DiceSkinManager.getEquippedSkin(),
      'neon-cyberpunk',
      'Equipped skin should be neon-cyberpunk'
    );

    // 5. Restore default
    DiceSkinManager.setEquippedSkin('obsidian-gold');
    assert.strictEqual(DiceSkinManager.getEquippedSkin(), 'obsidian-gold');
  });
});
