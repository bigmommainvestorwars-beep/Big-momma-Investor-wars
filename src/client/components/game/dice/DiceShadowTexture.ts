import * as THREE from 'three';

let cachedShadowTexture: THREE.CanvasTexture | null = null;

/**
 * Procedural Contact Shadow Texture for 3D Dice.
 * Creates an ultra-clean, realistic rounded-box ambient occlusion footprint
 * matching the 1.55x1.55 D6 die with beveled corners:
 * - Inner core: Deep, crisp contact occlusion directly under the resting face.
 * - Mid zone: Smooth Gaussian penumbra simulating light bounce and felt absorption.
 * - Outer zone: Soft cubic falloff to zero opacity, eliminating any hard disk/ring artifacts.
 */
export function getDiceContactShadowTexture(isMobile: boolean = false): THREE.CanvasTexture {
  if (cachedShadowTexture) {
    return cachedShadowTexture;
  }

  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const size = isMobile ? 256 : 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const boxSize = size * 0.56;
    const cornerRadius = size * 0.11;

    // Layer 1: Soft diffuse ambient occlusion halo (outer penumbra)
    const gradOuter = ctx.createRadialGradient(
      center,
      center,
      boxSize * 0.25,
      center,
      center,
      size * 0.48
    );
    gradOuter.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
    gradOuter.addColorStop(0.45, 'rgba(0, 0, 0, 0.24)');
    gradOuter.addColorStop(0.78, 'rgba(0, 0, 0, 0.06)');
    gradOuter.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradOuter;
    ctx.beginPath();
    ctx.arc(center, center, size * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Rounded-box mid shadow matching the die geometry
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = size * 0.09;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.beginPath();
    ctx.roundRect(
      center - boxSize / 2,
      center - boxSize / 2,
      boxSize,
      boxSize,
      cornerRadius
    );
    ctx.fill();
    ctx.restore();

    // Layer 3: Deep contact core directly beneath the bottom resting face
    const coreSize = boxSize * 0.86;
    const coreRadius = cornerRadius * 0.82;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = size * 0.04;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.beginPath();
    ctx.roundRect(
      center - coreSize / 2,
      center - coreSize / 2,
      coreSize,
      coreSize,
      coreRadius
    );
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  cachedShadowTexture = texture;
  return texture;
}
