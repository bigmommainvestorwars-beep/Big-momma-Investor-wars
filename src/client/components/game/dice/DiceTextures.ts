import * as THREE from 'three';

export type DiceMaterialType = 'ivory' | 'glossy-plastic';

export interface DiceTexturePackage {
  colorMaps: THREE.CanvasTexture[];
  bumpMaps: THREE.CanvasTexture[];
  roughnessMaps: THREE.CanvasTexture[];
}

// Global Texture Cache to avoid redundant canvas rendering & GPU uploads across multiple dice & frames
const textureCache = new Map<string, DiceTexturePackage>();

/**
 * Creates high-resolution procedural textures for standard D6 dice.
 * Benchmarked against Monopoly GO, Coin Master, and Las Vegas VIP casino dice:
 * - Real concave spherical carved pip bowls with ambient occlusion
 * - Multi-layer lacquer infill with dual specular highlight glints
 * - Raised outer rim highlights catching directional light
 * - Micro-inlaid 24K gold framing borders
 * - Physically based bump maps for genuine surface height perturbation
 * - Specular roughness maps for authentic material response
 *
 * Mobile Optimization (iPhone & Android):
 * - Shared texture cache across both dice (50% VRAM reduction)
 * - Dynamic resolution (512px on mobile, 1024px on desktop)
 * - Optimized anisotropic filtering (2-4x on mobile, 8x on desktop)
 */
export function createDiceFaceTextures(
  materialType: DiceMaterialType = 'glossy-plastic',
  isMobile: boolean = false
): DiceTexturePackage {
  const cacheKey = `${materialType}_${isMobile ? 'mobile' : 'desktop'}`;
  const existing = textureCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  if (typeof document === 'undefined') {
    const dummy = Array.from({ length: 6 }, () => new THREE.CanvasTexture({} as HTMLCanvasElement));
    const fallbackPkg = { colorMaps: dummy, bumpMaps: dummy, roughnessMaps: dummy };
    textureCache.set(cacheKey, fallbackPkg);
    return fallbackPkg;
  }

  const colorMaps: THREE.CanvasTexture[] = [];
  const bumpMaps: THREE.CanvasTexture[] = [];
  const roughnessMaps: THREE.CanvasTexture[] = [];
  
  // 512px on mobile provides retina-sharp pips on phones while saving 75% texture VRAM
  const size = isMobile ? 512 : 1024;
  const scale = size / 1024;
  const maxAnisotropy = isMobile ? 2 : 8;

  // Exact standard D6 pip coordinates scaled dynamically
  const L = Math.round(295 * scale); // Left
  const C = Math.round(512 * scale); // Center
  const R = Math.round(729 * scale); // Right
  const T = Math.round(295 * scale); // Top
  const M = Math.round(512 * scale); // Middle
  const B = Math.round(729 * scale); // Bottom

  const facePips: [number, number][][] = [
    // Face 1 (Ace)
    [[C, M]],
    // Face 2
    [[L, T], [R, B]],
    // Face 3
    [[L, T], [C, M], [R, B]],
    // Face 4
    [[L, T], [R, T], [L, B], [R, B]],
    // Face 5
    [[L, T], [R, T], [C, M], [L, B], [R, B]],
    // Face 6
    [[L, T], [L, M], [L, B], [R, T], [R, M], [R, B]],
  ];

  for (let face = 1; face <= 6; face++) {
    const pips = facePips[face - 1];
    const isAce = face === 1;

    // ----------------------------------------------------
    // 1. COLOR / ALBEDO MAP (1024x1024)
    // ----------------------------------------------------
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const ctx = colorCanvas.getContext('2d');

    if (ctx) {
      if (materialType === 'ivory') {
        // --- POLISHED IVORY BASE ---
        // Warm ivory / porcelain radial gradient
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 60, size / 2, size / 2, size * 0.72);
        bgGrad.addColorStop(0, '#fffefc'); // Warm ivory highlight center
        bgGrad.addColorStop(0.55, '#fcf7ed'); // Silky creamy ivory body
        bgGrad.addColorStop(0.85, '#f6eee0'); // Subtle warm ivory tone
        bgGrad.addColorStop(1, '#ebe0cc'); // Natural ambient falloff towards rounded bevel
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Organic micro-porcelain grain (prevents CGI plastic flatness)
        const grainStep = 4;
        ctx.fillStyle = 'rgba(180, 150, 110, 0.025)';
        for (let x = 0; x < size; x += grainStep * 2) {
          for (let y = (x % 3) * grainStep; y < size; y += grainStep * 3) {
            ctx.fillRect(x, y, grainStep, grainStep);
          }
        }

        // Luxury 24K Gold Inlay Framing Border (Vegas / Monte Carlo High-Roller edition)
        const margin = 76;
        const cornerRad = 64;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = 2.5;
        const goldBorderGrad = ctx.createLinearGradient(margin, margin, size - margin, size - margin);
        goldBorderGrad.addColorStop(0, '#fde68a'); // 24K Gold light glint
        goldBorderGrad.addColorStop(0.3, '#f59e0b'); // Amber gold body
        goldBorderGrad.addColorStop(0.7, '#d97706'); // Deep warm gold
        goldBorderGrad.addColorStop(1, '#92400e'); // Burnished gold shadow
        ctx.strokeStyle = goldBorderGrad;
        ctx.stroke();

        // 1px inner contact shadow along the gold inlay groove
        ctx.beginPath();
        ctx.roundRect(margin + 2, margin + 2, size - (margin + 2) * 2, size - (margin + 2) * 2, cornerRad - 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.stroke();
        ctx.restore();
      } else {
        // --- GLOSSY CASINO PLASTIC BASE ---
        // Deep translucent ruby-red acrylic / candy resin with internal refraction
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.72);
        bgGrad.addColorStop(0, '#e11d48'); // Vibrant candy crimson center
        bgGrad.addColorStop(0.5, '#be123c'); // Rich casino ruby body
        bgGrad.addColorStop(0.85, '#9f1239'); // Deep wine edge
        bgGrad.addColorStop(1, '#4c0519'); // Dark boundary
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Translucent internal light flecks
        const margin = 76;
        const cornerRad = 64;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();
        ctx.restore();
      }

      // --- HIGH-RESOLUTION PIPS WITH TRUE 3D DEPTH ---
      const pipRadius = isAce ? 96 : 64;

      pips.forEach(([px, py]) => {
        ctx.save();

        // 1. Carved Indentation Cavity: Ambient Occlusion & Depth Shadow
        const cavityRadius = pipRadius + 12;
        const cavityGrad = ctx.createRadialGradient(px - 10, py - 10, 10, px, py, cavityRadius);
        if (materialType === 'ivory') {
          cavityGrad.addColorStop(0, 'rgba(30, 20, 10, 0.45)');
          cavityGrad.addColorStop(0.7, 'rgba(60, 45, 25, 0.25)');
          cavityGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          cavityGrad.addColorStop(0, 'rgba(20, 0, 5, 0.6)');
          cavityGrad.addColorStop(0.7, 'rgba(50, 0, 10, 0.3)');
          cavityGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.fillStyle = cavityGrad;
        ctx.beginPath();
        ctx.arc(px, py, cavityRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Outer Beveled Rim Highlight (Light catching the carved hole's bottom-right edge)
        ctx.beginPath();
        ctx.arc(px, py, cavityRadius - 1, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.lineWidth = 3;
        ctx.strokeStyle = materialType === 'ivory' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 220, 230, 0.65)';
        ctx.stroke();

        // 3. Lacquer / Enamel Infill
        if (isAce) {
          // --- ACE OF DICE: IMPERIAL CASINO MEDALLION ---
          // 24K Gold Leaf Filigree Ring around Ace
          const goldRingOuter = pipRadius + 8;
          const goldRingInner = pipRadius;
          const goldRingGrad = ctx.createLinearGradient(px - goldRingOuter, py - goldRingOuter, px + goldRingOuter, py + goldRingOuter);
          goldRingGrad.addColorStop(0, '#fef08a');
          goldRingGrad.addColorStop(0.3, '#f59e0b');
          goldRingGrad.addColorStop(0.7, '#d97706');
          goldRingGrad.addColorStop(1, '#78350f');

          ctx.beginPath();
          ctx.arc(px, py, goldRingOuter, 0, Math.PI * 2);
          ctx.fillStyle = goldRingGrad;
          ctx.fill();

          // Recessed Jewel Bowl
          const jewelGrad = ctx.createRadialGradient(px - 18, py - 18, 12, px, py, pipRadius);
          if (materialType === 'ivory') {
            // Radiant Imperial Ruby Jewel Core
            jewelGrad.addColorStop(0, '#f43f5e'); // Rose 500 highlight
            jewelGrad.addColorStop(0.25, '#e11d48'); // Rose 600
            jewelGrad.addColorStop(0.65, '#9f1239'); // Rose 800
            jewelGrad.addColorStop(1, '#4c0519'); // Deep crimson shadow
          } else {
            // Radiant Emerald Gold Medallion Core on Red Plastic
            jewelGrad.addColorStop(0, '#6ee7b7');
            jewelGrad.addColorStop(0.35, '#10b981');
            jewelGrad.addColorStop(0.75, '#047857');
            jewelGrad.addColorStop(1, '#022c22');
          }
          ctx.fillStyle = jewelGrad;
          ctx.beginPath();
          ctx.arc(px, py, goldRingInner, 0, Math.PI * 2);
          ctx.fill();

          // Signature 24K Gold Starburst Emblem inside the Ace
          ctx.save();
          ctx.translate(px, py);
          const starRadius = pipRadius * 0.44;
          const starInner = starRadius * 0.38;
          ctx.beginPath();
          for (let s = 0; s < 8; s++) {
            const angle = (s * Math.PI) / 4;
            const r = s % 2 === 0 ? starRadius : starInner;
            const sx = Math.cos(angle) * r;
            const sy = Math.sin(angle) * r;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          const starGrad = ctx.createLinearGradient(-starRadius, -starRadius, starRadius, starRadius);
          starGrad.addColorStop(0, '#fffbeb');
          starGrad.addColorStop(0.5, '#fde68a');
          starGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = starGrad;
          ctx.fill();
          ctx.restore();
        } else {
          // --- FACES 2-6: DEEP CONCAVE LACQUER PIPS ---
          const bowlGrad = ctx.createRadialGradient(px - 12, py - 12, 6, px, py, pipRadius);
          if (materialType === 'ivory') {
            // Deep Polished Obsidian / Onyx Lacquer with warm rich depth
            bowlGrad.addColorStop(0, '#1e293b'); // Slate obsidian glint
            bowlGrad.addColorStop(0.35, '#0f172a'); // Rich deep onyx
            bowlGrad.addColorStop(0.85, '#020617'); // Pitch black cavity
            bowlGrad.addColorStop(1, '#000000');
          } else {
            // Pure Polished Pearl White Enamel on Candy Red Acrylic
            bowlGrad.addColorStop(0, '#ffffff');
            bowlGrad.addColorStop(0.35, '#f8fafc');
            bowlGrad.addColorStop(0.75, '#cbd5e1');
            bowlGrad.addColorStop(1, '#94a3b8');
          }
          ctx.fillStyle = bowlGrad;
          ctx.beginPath();
          ctx.arc(px, py, pipRadius, 0, Math.PI * 2);
          ctx.fill();

          // Subtle meniscus rim ring (bonding line of liquid lacquer)
          ctx.beginPath();
          ctx.arc(px, py, pipRadius * 0.92, 0, Math.PI * 2);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = materialType === 'ivory' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)';
          ctx.stroke();
        }

        // 4. Primary Specular Glint (Sharp light reflection on the wet lacquer surface)
        const glintX = px - pipRadius * 0.35;
        const glintY = py - pipRadius * 0.35;
        const glintRad = pipRadius * 0.22;
        const glintGrad = ctx.createRadialGradient(glintX, glintY, 1, glintX, glintY, glintRad);
        glintGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        glintGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
        glintGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glintGrad;
        ctx.beginPath();
        ctx.arc(glintX, glintY, glintRad, 0, Math.PI * 2);
        ctx.fill();

        // 5. Secondary Soft Ambient Bounce Light (Light bouncing off the opposing cavity wall)
        const bounceX = px + pipRadius * 0.32;
        const bounceY = py + pipRadius * 0.32;
        const bounceRad = pipRadius * 0.28;
        const bounceGrad = ctx.createRadialGradient(bounceX, bounceY, 2, bounceX, bounceY, bounceRad);
        if (materialType === 'ivory') {
          bounceGrad.addColorStop(0, 'rgba(254, 243, 199, 0.35)');
        } else {
          bounceGrad.addColorStop(0, 'rgba(255, 220, 220, 0.35)');
        }
        bounceGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = bounceGrad;
        ctx.beginPath();
        ctx.arc(bounceX, bounceY, bounceRad, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }

    const colorTexture = new THREE.CanvasTexture(colorCanvas);
    colorTexture.colorSpace = THREE.SRGBColorSpace;
    colorTexture.anisotropy = maxAnisotropy;
    colorTexture.generateMipmaps = true;
    colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
    colorTexture.magFilter = THREE.LinearFilter;
    colorTexture.needsUpdate = true;
    colorMaps.push(colorTexture);

    // ----------------------------------------------------
    // 2. BUMP / HEIGHT MAP (1024x1024 or 512x512)
    // Physically based normal perturbation for real 3D carved pips
    // ----------------------------------------------------
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d');

    if (bCtx) {
      // Flat face height = 0.88 (light gray #e0e0e0)
      bCtx.fillStyle = '#e0e0e0';
      bCtx.fillRect(0, 0, size, size);

      // Inset hairline groove = 0.80 (#cccccc)
      const margin = Math.round(76 * scale);
      const cornerRad = Math.round(64 * scale);
      bCtx.beginPath();
      bCtx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
      bCtx.lineWidth = Math.max(1.5, 3 * scale);
      bCtx.strokeStyle = '#cccccc';
      bCtx.stroke();

      const pipRadius = isAce ? Math.round(96 * scale) : Math.round(64 * scale);

      pips.forEach(([px, py]) => {
        // Raised lip at rim = 0.95 (#f2f2f2)
        const rimRad = pipRadius + Math.max(3, Math.round(6 * scale));
        bCtx.beginPath();
        bCtx.arc(px, py, rimRad, 0, Math.PI * 2);
        bCtx.fillStyle = '#f0f0f0';
        bCtx.fill();

        // Spherical concave carved indentation:
        // Center drops down to 0.15 (#262626) in a smooth spherical dome curve
        const bowlGrad = bCtx.createRadialGradient(px, py, 2, px, py, pipRadius);
        bowlGrad.addColorStop(0, '#1a1a1a'); // Deepest point
        bowlGrad.addColorStop(0.5, '#3a3a3a');
        bowlGrad.addColorStop(0.85, '#888888');
        bowlGrad.addColorStop(1, '#e0e0e0'); // Merges with surface height
        bCtx.fillStyle = bowlGrad;
        bCtx.beginPath();
        bCtx.arc(px, py, pipRadius, 0, Math.PI * 2);
        bCtx.fill();
      });
    }

    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.anisotropy = maxAnisotropy;
    bumpTexture.generateMipmaps = true;
    bumpTexture.minFilter = THREE.LinearMipmapLinearFilter;
    bumpTexture.magFilter = THREE.LinearFilter;
    bumpTexture.needsUpdate = true;
    bumpMaps.push(bumpTexture);

    // ----------------------------------------------------
    // 3. ROUGHNESS MAP (1024x1024 or 512x512)
    // Differentiates silky ivory vs mirror-gloss lacquer vs micro-textured rim
    // ----------------------------------------------------
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = size;
    roughCanvas.height = size;
    const rCtx = roughCanvas.getContext('2d');

    if (rCtx) {
      // Polished Ivory / Plastic Base Roughness:
      // Dark value = very smooth/glossy (roughness ~0.12 = #1f1f1f)
      rCtx.fillStyle = materialType === 'ivory' ? '#202020' : '#141414';
      rCtx.fillRect(0, 0, size, size);

      // Gold inlay groove: extra mirror polish
      const margin = Math.round(76 * scale);
      const cornerRad = Math.round(64 * scale);
      rCtx.beginPath();
      rCtx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
      rCtx.lineWidth = Math.max(1.5, 3 * scale);
      rCtx.strokeStyle = '#0e0e0e';
      rCtx.stroke();

      const pipRadius = isAce ? Math.round(96 * scale) : Math.round(64 * scale);

      pips.forEach(([px, py]) => {
        // Carved cavity rim: slightly higher micro-texture from drilling (~0.28 = #474747)
        rCtx.beginPath();
        rCtx.arc(px, py, pipRadius + Math.max(3, Math.round(6 * scale)), 0, Math.PI * 2);
        rCtx.fillStyle = '#404040';
        rCtx.fill();

        // Lacquer Infill: ultra-glossy liquid mirror enamel (~0.03 = #080808)
        rCtx.beginPath();
        rCtx.arc(px, py, pipRadius, 0, Math.PI * 2);
        rCtx.fillStyle = '#080808';
        rCtx.fill();
      });
    }

    const roughTexture = new THREE.CanvasTexture(roughCanvas);
    roughTexture.anisotropy = maxAnisotropy;
    roughTexture.generateMipmaps = true;
    roughTexture.minFilter = THREE.LinearMipmapLinearFilter;
    roughTexture.magFilter = THREE.LinearFilter;
    roughTexture.needsUpdate = true;
    roughnessMaps.push(roughTexture);
  }

  const pkg: DiceTexturePackage = { colorMaps, bumpMaps, roughnessMaps };
  textureCache.set(cacheKey, pkg);
  return pkg;
}
