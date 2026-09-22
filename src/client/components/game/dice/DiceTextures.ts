import * as THREE from 'three';

export type DiceMaterialType =
  | 'obsidian-gold'
  | 'neon-cyberpunk'
  | 'crystal-ruby'
  | 'ivory'
  | 'emerald-vip'
  | 'glossy-plastic';

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
      if (materialType === 'obsidian-gold') {
        // --- OBSIDIAN & GOLD BASE ---
        // Ultra-dense volcanic glass: Deep mirror black with subtle mineral flecks
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.75);
        bgGrad.addColorStop(0, '#1c1917'); // Stone 900 highlight center
        bgGrad.addColorStop(0.5, '#0c0a09'); // Stone 950 deep body
        bgGrad.addColorStop(0.85, '#050505'); // Pitch obsidian
        bgGrad.addColorStop(1, '#000000'); // Pure void rim
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Volcanic mineral obsidian flecks (subtle gold / bronze crystal dust)
        ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
        for (let i = 0; i < 40; i++) {
          const fx = (Math.sin(i * 99 + face) * 0.5 + 0.5) * size;
          const fy = (Math.cos(i * 33 + face) * 0.5 + 0.5) * size;
          ctx.fillRect(fx, fy, 3, 3);
        }

        // Luxury 24K Gold Inlay Framing Border
        const margin = Math.round(76 * scale);
        const cornerRad = Math.round(64 * scale);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = Math.max(2, 3 * scale);
        const goldBorderGrad = ctx.createLinearGradient(margin, margin, size - margin, size - margin);
        goldBorderGrad.addColorStop(0, '#fef08a'); // 24K Gold light glint
        goldBorderGrad.addColorStop(0.3, '#f59e0b'); // Amber gold body
        goldBorderGrad.addColorStop(0.7, '#d97706'); // Deep warm gold
        goldBorderGrad.addColorStop(1, '#78350f'); // Burnished gold shadow
        ctx.strokeStyle = goldBorderGrad;
        ctx.stroke();

        // 1px Inner Gold Contact Highlight
        ctx.beginPath();
        ctx.roundRect(margin + 2, margin + 2, size - (margin + 2) * 2, size - (margin + 2) * 2, Math.max(1, cornerRad - 2));
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.stroke();
        ctx.restore();
      } else if (materialType === 'neon-cyberpunk') {
        // --- NEON CYBERPUNK BASE ---
        // Carbon nano-mesh matrix with cyber circuitry traces & UV phosphors
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.75);
        bgGrad.addColorStop(0, '#0f172a'); // Slate 900 core
        bgGrad.addColorStop(0.55, '#070b14'); // Cyber midnight
        bgGrad.addColorStop(0.85, '#03050a'); // Carbon edge
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Cyber Grid Nano-Traces
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.lineWidth = 1;
        const gridStep = Math.round(64 * scale);
        for (let g = gridStep; g < size; g += gridStep) {
          ctx.beginPath();
          ctx.moveTo(g, 0);
          ctx.lineTo(g, size);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, g);
          ctx.lineTo(size, g);
          ctx.stroke();
        }

        // Cyberpunk Angular Framing Border (Cyan to Neon Pink)
        const margin = Math.round(76 * scale);
        const cornerRad = Math.round(48 * scale);
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = Math.max(2, 3 * scale);
        const cyberBorderGrad = ctx.createLinearGradient(margin, margin, size - margin, size - margin);
        cyberBorderGrad.addColorStop(0, '#00f0ff'); // Electric Cyan
        cyberBorderGrad.addColorStop(0.5, '#06b6d4');
        cyberBorderGrad.addColorStop(1, '#ff007f'); // Hot Neon Pink
        ctx.strokeStyle = cyberBorderGrad;
        ctx.stroke();

        // Corner Cyber Circuitry Nodes
        const nodes = [
          [margin, margin],
          [size - margin, margin],
          [margin, size - margin],
          [size - margin, size - margin],
        ];
        ctx.fillStyle = '#00f0ff';
        nodes.forEach(([nx, ny]) => {
          ctx.beginPath();
          ctx.arc(nx, ny, 3.5 * scale, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      } else if (materialType === 'emerald-vip') {
        // --- EMERALD VIP BASE ---
        // Imperial Jadeite Crystal with golden starbursts & gold trim
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.72);
        bgGrad.addColorStop(0, '#10b981'); // Vibrant Emerald center
        bgGrad.addColorStop(0.45, '#059669'); // Jade body
        bgGrad.addColorStop(0.8, '#047857'); // Deep jade
        bgGrad.addColorStop(1, '#022c22'); // Dark boundary
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        // Jade crystal vein flecks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < 30; i++) {
          const fx = (Math.sin(i * 67 + face) * 0.5 + 0.5) * size;
          const fy = (Math.cos(i * 41 + face) * 0.5 + 0.5) * size;
          ctx.fillRect(fx, fy, 4 * scale, 2 * scale);
        }

        // 24K Gold Inlay Framing Border
        const margin = Math.round(76 * scale);
        const cornerRad = Math.round(64 * scale);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = Math.max(2, 3 * scale);
        const goldBorderGrad = ctx.createLinearGradient(margin, margin, size - margin, size - margin);
        goldBorderGrad.addColorStop(0, '#fef08a');
        goldBorderGrad.addColorStop(0.3, '#f59e0b');
        goldBorderGrad.addColorStop(0.7, '#d97706');
        goldBorderGrad.addColorStop(1, '#78350f');
        ctx.strokeStyle = goldBorderGrad;
        ctx.stroke();
        ctx.restore();
      } else if (materialType === 'ivory') {
        // --- POLISHED IVORY BASE ---
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 60, size / 2, size / 2, size * 0.72);
        bgGrad.addColorStop(0, '#fffefc');
        bgGrad.addColorStop(0.55, '#fcf7ed');
        bgGrad.addColorStop(0.85, '#f6eee0');
        bgGrad.addColorStop(1, '#ebe0cc');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        const grainStep = 4;
        ctx.fillStyle = 'rgba(180, 150, 110, 0.025)';
        for (let x = 0; x < size; x += grainStep * 2) {
          for (let y = (x % 3) * grainStep; y < size; y += grainStep * 3) {
            ctx.fillRect(x, y, grainStep, grainStep);
          }
        }

        const margin = Math.round(76 * scale);
        const cornerRad = Math.round(64 * scale);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = Math.max(2, 2.5 * scale);
        const goldBorderGrad = ctx.createLinearGradient(margin, margin, size - margin, size - margin);
        goldBorderGrad.addColorStop(0, '#fde68a');
        goldBorderGrad.addColorStop(0.3, '#f59e0b');
        goldBorderGrad.addColorStop(0.7, '#d97706');
        goldBorderGrad.addColorStop(1, '#92400e');
        ctx.strokeStyle = goldBorderGrad;
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(margin + 2, margin + 2, size - (margin + 2) * 2, size - (margin + 2) * 2, Math.max(1, cornerRad - 2));
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.stroke();
        ctx.restore();
      } else {
        // --- CRYSTAL RUBY / GLOSSY CASINO BASE ---
        const bgGrad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.72);
        bgGrad.addColorStop(0, '#e11d48');
        bgGrad.addColorStop(0.5, '#be123c');
        bgGrad.addColorStop(0.85, '#9f1239');
        bgGrad.addColorStop(1, '#4c0519');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, size, size);

        const margin = Math.round(76 * scale);
        const cornerRad = Math.round(64 * scale);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(margin, margin, size - margin * 2, size - margin * 2, cornerRad);
        ctx.lineWidth = Math.max(1.5, 2 * scale);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();
        ctx.restore();
      }

      // --- HIGH-RESOLUTION PIPS WITH TRUE 3D DEPTH ---
      const pipRadius = isAce ? Math.round(96 * scale) : Math.round(64 * scale);

      pips.forEach(([px, py]) => {
        ctx.save();

        // 1. Carved Indentation Cavity: Ambient Occlusion & Depth Shadow
        const cavityRadius = pipRadius + Math.round(12 * scale);
        const cavityGrad = ctx.createRadialGradient(px - 10, py - 10, 10, px, py, cavityRadius);
        if (materialType === 'obsidian-gold') {
          cavityGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
          cavityGrad.addColorStop(0.6, 'rgba(30, 20, 10, 0.5)');
          cavityGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (materialType === 'neon-cyberpunk') {
          cavityGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
          cavityGrad.addColorStop(0.7, 'rgba(255, 0, 127, 0.15)');
          cavityGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (materialType === 'emerald-vip') {
          cavityGrad.addColorStop(0, 'rgba(2, 44, 34, 0.7)');
          cavityGrad.addColorStop(0.7, 'rgba(4, 120, 87, 0.3)');
          cavityGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (materialType === 'ivory') {
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

        // 2. Outer Beveled Rim Highlight
        ctx.beginPath();
        ctx.arc(px, py, cavityRadius - 1, 0.08 * Math.PI, 0.92 * Math.PI);
        ctx.lineWidth = Math.max(1.5, 3 * scale);
        if (materialType === 'obsidian-gold') {
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
        } else if (materialType === 'neon-cyberpunk') {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.95)';
        } else if (materialType === 'emerald-vip') {
          ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
        } else if (materialType === 'ivory') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        } else {
          ctx.strokeStyle = 'rgba(255, 220, 230, 0.65)';
        }
        ctx.stroke();

        // 3. Lacquer / Enamel Infill
        if (isAce) {
          // --- ACE OF DICE: IMPERIAL MEDALLION ---
          const goldRingOuter = pipRadius + Math.round(8 * scale);
          const goldRingInner = pipRadius;
          const goldRingGrad = ctx.createLinearGradient(px - goldRingOuter, py - goldRingOuter, px + goldRingOuter, py + goldRingOuter);
          
          if (materialType === 'neon-cyberpunk') {
            goldRingGrad.addColorStop(0, '#00f0ff');
            goldRingGrad.addColorStop(0.5, '#38bdf8');
            goldRingGrad.addColorStop(1, '#ff007f');
          } else {
            goldRingGrad.addColorStop(0, '#fef08a');
            goldRingGrad.addColorStop(0.3, '#f59e0b');
            goldRingGrad.addColorStop(0.7, '#d97706');
            goldRingGrad.addColorStop(1, '#78350f');
          }

          ctx.beginPath();
          ctx.arc(px, py, goldRingOuter, 0, Math.PI * 2);
          ctx.fillStyle = goldRingGrad;
          ctx.fill();

          // Recessed Jewel Bowl
          const jewelGrad = ctx.createRadialGradient(px - 18 * scale, py - 18 * scale, 12 * scale, px, py, pipRadius);
          if (materialType === 'obsidian-gold') {
            // Radiant Liquid 24K Gold Core
            jewelGrad.addColorStop(0, '#fffbeb');
            jewelGrad.addColorStop(0.3, '#fde047');
            jewelGrad.addColorStop(0.7, '#d97706');
            jewelGrad.addColorStop(1, '#78350f');
          } else if (materialType === 'neon-cyberpunk') {
            // Quantum Cyber HUD Core
            jewelGrad.addColorStop(0, '#ffffff');
            jewelGrad.addColorStop(0.4, '#00f0ff');
            jewelGrad.addColorStop(0.8, '#ff007f');
            jewelGrad.addColorStop(1, '#020617');
          } else if (materialType === 'emerald-vip') {
            // Crowned Emerald Jewel Core
            jewelGrad.addColorStop(0, '#6ee7b7');
            jewelGrad.addColorStop(0.35, '#10b981');
            jewelGrad.addColorStop(0.75, '#047857');
            jewelGrad.addColorStop(1, '#022c22');
          } else if (materialType === 'ivory') {
            // Radiant Imperial Ruby Jewel Core
            jewelGrad.addColorStop(0, '#f43f5e');
            jewelGrad.addColorStop(0.25, '#e11d48');
            jewelGrad.addColorStop(0.65, '#9f1239');
            jewelGrad.addColorStop(1, '#4c0519');
          } else {
            jewelGrad.addColorStop(0, '#ffffff');
            jewelGrad.addColorStop(0.35, '#f8fafc');
            jewelGrad.addColorStop(0.75, '#cbd5e1');
            jewelGrad.addColorStop(1, '#94a3b8');
          }
          ctx.fillStyle = jewelGrad;
          ctx.beginPath();
          ctx.arc(px, py, goldRingInner, 0, Math.PI * 2);
          ctx.fill();

          // Signature Starburst Emblem inside the Ace
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
          if (materialType === 'neon-cyberpunk') {
            starGrad.addColorStop(0, '#ffffff');
            starGrad.addColorStop(0.5, '#67e8f9');
            starGrad.addColorStop(1, '#00f0ff');
          } else if (materialType === 'obsidian-gold') {
            starGrad.addColorStop(0, '#ffffff');
            starGrad.addColorStop(0.5, '#fef08a');
            starGrad.addColorStop(1, '#b45309');
          } else {
            starGrad.addColorStop(0, '#fffbeb');
            starGrad.addColorStop(0.5, '#fde68a');
            starGrad.addColorStop(1, '#b45309');
          }
          ctx.fillStyle = starGrad;
          ctx.fill();
          ctx.restore();
        } else {
          // --- FACES 2-6: DEEP CONCAVE PIPS ---
          const bowlGrad = ctx.createRadialGradient(px - 12 * scale, py - 12 * scale, 6 * scale, px, py, pipRadius);
          if (materialType === 'obsidian-gold') {
            // 24K Liquid Gold Enamel
            bowlGrad.addColorStop(0, '#fffbeb');
            bowlGrad.addColorStop(0.25, '#fde047');
            bowlGrad.addColorStop(0.65, '#f59e0b');
            bowlGrad.addColorStop(0.9, '#b45309');
            bowlGrad.addColorStop(1, '#78350f');
          } else if (materialType === 'neon-cyberpunk') {
            // Electric UV Phosphor Cyan / Magenta Core
            bowlGrad.addColorStop(0, '#ffffff');
            bowlGrad.addColorStop(0.3, '#67e8f9');
            bowlGrad.addColorStop(0.7, '#00f0ff');
            bowlGrad.addColorStop(0.92, '#ff007f');
            bowlGrad.addColorStop(1, '#090d16');
          } else if (materialType === 'emerald-vip') {
            // Pure Gold Starlight Pips on Emerald
            bowlGrad.addColorStop(0, '#fffbeb');
            bowlGrad.addColorStop(0.35, '#fde047');
            bowlGrad.addColorStop(0.75, '#f59e0b');
            bowlGrad.addColorStop(1, '#92400e');
          } else if (materialType === 'ivory') {
            // Deep Polished Onyx
            bowlGrad.addColorStop(0, '#1e293b');
            bowlGrad.addColorStop(0.35, '#0f172a');
            bowlGrad.addColorStop(0.85, '#020617');
            bowlGrad.addColorStop(1, '#000000');
          } else {
            // Pure Polished Diamond White Enamel
            bowlGrad.addColorStop(0, '#ffffff');
            bowlGrad.addColorStop(0.35, '#f8fafc');
            bowlGrad.addColorStop(0.75, '#cbd5e1');
            bowlGrad.addColorStop(1, '#94a3b8');
          }
          ctx.fillStyle = bowlGrad;
          ctx.beginPath();
          ctx.arc(px, py, pipRadius, 0, Math.PI * 2);
          ctx.fill();

          // Subtle meniscus rim ring
          ctx.beginPath();
          ctx.arc(px, py, pipRadius * 0.92, 0, Math.PI * 2);
          ctx.lineWidth = Math.max(1, 1.5 * scale);
          ctx.strokeStyle = materialType === 'neon-cyberpunk' ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
          ctx.stroke();
        }

        // 4. Specular Glint
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

        // 5. Secondary Ambient Bounce Light
        const bounceX = px + pipRadius * 0.32;
        const bounceY = py + pipRadius * 0.32;
        const bounceRad = pipRadius * 0.28;
        const bounceGrad = ctx.createRadialGradient(bounceX, bounceY, 2, bounceX, bounceY, bounceRad);
        if (materialType === 'obsidian-gold' || materialType === 'emerald-vip') {
          bounceGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
        } else if (materialType === 'neon-cyberpunk') {
          bounceGrad.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
        } else if (materialType === 'ivory') {
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
      const cornerRad = materialType === 'neon-cyberpunk' ? Math.round(48 * scale) : Math.round(64 * scale);
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
      // Polished Ivory / Plastic / Obsidian / Cyberpunk Base Roughness:
      // Dark value = very smooth/glossy (roughness ~0.12 = #1f1f1f, cyber matte ~0.24 = #3d3d3d)
      rCtx.fillStyle =
        materialType === 'neon-cyberpunk'
          ? '#383838'
          : materialType === 'ivory'
          ? '#202020'
          : materialType === 'obsidian-gold'
          ? '#0c0c0c'
          : '#141414';
      rCtx.fillRect(0, 0, size, size);

      // Gold inlay groove: extra mirror polish
      const margin = Math.round(76 * scale);
      const cornerRad = materialType === 'neon-cyberpunk' ? Math.round(48 * scale) : Math.round(64 * scale);
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
