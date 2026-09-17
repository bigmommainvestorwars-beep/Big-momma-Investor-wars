import React, { useRef, useEffect } from 'react';
import { SpaceAnimationType, SPACE_GDD_REGISTRY } from './spaceGddData';

interface SpaceEntailAnimationProps {
  spaceIndex: number;
  animationType: SpaceAnimationType;
  accentColor: string;
  secondaryColor: string;
  className?: string;
}

export const SpaceEntailAnimation: React.FC<SpaceEntailAnimationProps> = ({
  spaceIndex,
  animationType,
  accentColor,
  secondaryColor,
  className = 'w-full h-44',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1));
    let height = (canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    };

    window.addEventListener('resize', handleResize);

    let t = 0;

    // Pre-create persistent particles for particle-driven animations
    const particleCount = 42;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: (Math.sin(i * 99) * 0.5 + 0.5) * (width || 300),
      y: (Math.cos(i * 33) * 0.5 + 0.5) * (height || 200),
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 0.4,
      size: Math.random() * 3 + 1.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      t += 0.025;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const mx = mouseRef.current.active ? mouseRef.current.x * (window.devicePixelRatio || 1) : cx;
      const my = mouseRef.current.active ? mouseRef.current.y * (window.devicePixelRatio || 1) : cy;
      const mouseOffsetX = (mx - cx) * 0.08;
      const mouseOffsetY = (my - cy) * 0.08;

      ctx.save();
      ctx.translate(mouseOffsetX, mouseOffsetY);

      switch (animationType) {
        // 0. START / GO: Sovereign Vault Gateway
        case 'start_vault': {
          ctx.lineWidth = 3;
          for (let r = 25; r <= 85; r += 20) {
            ctx.strokeStyle = r === 65 ? accentColor : secondaryColor;
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            const startAngle = t * (r % 30 === 0 ? 1 : -1);
            ctx.arc(cx, cy, r, startAngle, startAngle + Math.PI * 1.6);
            ctx.stroke();
          }
          // Gold dividend coin particles
          particles.slice(0, 18).forEach((p, idx) => {
            const py = (p.y + t * 45 + idx * 12) % height;
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, py, p.size + 1, 0, Math.PI * 2);
            ctx.fill();
          });
          // Vault core emblem
          ctx.fillStyle = accentColor;
          ctx.font = `900 ${Math.floor(width * 0.065)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('200 ƁM', cx, cy);
          break;
        }

        // 1. Seed Capital Alpha: Angel Seed Germination
        case 'seed_sprout': {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(cx, cy + 50);
          ctx.lineTo(cx, cy - 10);
          ctx.stroke();

          // Sprouting branches
          for (let i = 0; i < 6; i++) {
            const angle = -Math.PI / 2 + (i - 2.5) * 0.45 + Math.sin(t + i) * 0.1;
            const len = 35 + Math.sin(t * 2 + i) * 8;
            const bx = cx + Math.cos(angle) * len;
            const by = cy - 10 + Math.sin(angle) * len;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(bx, by);
            ctx.stroke();
            // Golden venture node
            ctx.fillStyle = secondaryColor;
            ctx.beginPath();
            ctx.arc(bx, by, 4 + Math.sin(t * 3 + i) * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        // 2. Angel Syndicate: Venture Constellation
        case 'angel_network': {
          const nodes = 7;
          const nodeCoords = [];
          for (let i = 0; i < nodes; i++) {
            const angle = (i / nodes) * Math.PI * 2 + t * 0.4;
            const dist = 45 + Math.sin(t * 1.5 + i) * 12;
            const nx = cx + Math.cos(angle) * dist;
            const ny = cy + Math.sin(angle) * dist;
            nodeCoords.push({ x: nx, y: ny });
          }
          // Interconnecting capital links
          ctx.strokeStyle = `${accentColor}88`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < nodes; i++) {
            for (let j = i + 1; j < nodes; j++) {
              ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
              ctx.lineTo(nodeCoords[j].x, nodeCoords[j].y);
            }
          }
          ctx.stroke();

          // Glowing angel nodes
          nodeCoords.forEach((n, idx) => {
            ctx.fillStyle = idx % 2 === 0 ? accentColor : secondaryColor;
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        // 3. Seed Capital Beta: Orbital Accelerator Rings
        case 'seed_accelerator': {
          ctx.lineWidth = 2;
          for (let i = 1; i <= 3; i++) {
            ctx.strokeStyle = i === 2 ? accentColor : secondaryColor;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 25 * i, 14 * i, t * 0.5 * (i % 2 === 0 ? 1 : -1), 0, Math.PI * 2);
            ctx.stroke();
            // Accelerating orbital particle
            const orbAngle = t * 2.5 * i;
            const ox = cx + Math.cos(orbAngle) * (25 * i);
            const oy = cy + Math.sin(orbAngle) * (14 * i);
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(ox, oy, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        // 4. Capital Gains Tax: Regulatory Audit Laser
        case 'tax_laser': {
          // Warning grid lines
          ctx.strokeStyle = '#f43f5e33';
          ctx.lineWidth = 1;
          for (let y = 20; y < height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(width - 10, y);
            ctx.stroke();
          }
          // High-voltage sweeping red audit laser
          const laserY = cy + Math.sin(t * 3) * (height * 0.35);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(20, laserY);
          ctx.lineTo(width - 20, laserY);
          ctx.stroke();

          // Deduction hazard warning stamp
          ctx.fillStyle = '#fb7185';
          ctx.font = `bold ${Math.floor(width * 0.05)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('AUDIT LEVY: -150 ƁM', cx, cy - 25);
          break;
        }

        // 5. Metro Transit System: Neon Maglev Rail
        case 'metro_transit': {
          // Curving railway lines
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(10, cy + 20);
          ctx.bezierCurveTo(cx - 50, cy - 40, cx + 50, cy + 40, width - 10, cy - 20);
          ctx.stroke();

          // High speed train head
          const trainProg = (t * 0.8) % 1;
          const tx = 10 + trainProg * (width - 40);
          const ty = cy + Math.sin(trainProg * Math.PI * 2) * 20;
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.fillRect(tx - 15, ty - 6, 30, 12);

          // Speed trails
          ctx.strokeStyle = '#38bdf866';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx - 35, ty);
          ctx.lineTo(tx - 15, ty);
          ctx.stroke();
          break;
        }

        // 6. Quantum Cyber Lab: Bloch Sphere 3D Wireframe
        case 'quantum_qubit': {
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = accentColor;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 10;
          // Outer circle
          ctx.beginPath();
          ctx.arc(cx, cy, 50, 0, Math.PI * 2);
          ctx.stroke();
          // Horizontal & vertical ellipses (rotating 3D sphere)
          ctx.beginPath();
          ctx.ellipse(cx, cy, 50, 20 * Math.abs(Math.cos(t)), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx, cy, 20 * Math.abs(Math.sin(t)), 50, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Quantum state vector
          const qx = cx + Math.cos(t * 2) * 45;
          const qy = cy + Math.sin(t * 1.5) * 45;
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(qx, qy);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(qx, qy, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        // 7. Strategy Hub Alpha: 360 Tactical Radar
        case 'strategy_radar_alpha': {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 1.5;
          [25, 45, 65].forEach((r) => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          });
          // Radar crosshairs
          ctx.beginPath();
          ctx.moveTo(cx - 70, cy);
          ctx.lineTo(cx + 70, cy);
          ctx.moveTo(cx, cy - 70);
          ctx.lineTo(cx, cy + 70);
          ctx.stroke();

          // Sweeping radar beam
          const sweepAngle = t * 2.5;
          ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, 65, sweepAngle, sweepAngle + 0.5);
          ctx.closePath();
          ctx.fill();

          // Blip coordinates
          const bx = cx + Math.cos(sweepAngle - 0.4) * 40;
          const by = cy + Math.sin(sweepAngle - 0.4) * 40;
          ctx.fillStyle = '#818cf8';
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(bx, by, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        // 8. Neural Net Research: Synaptic Propagation
        case 'neural_network': {
          const layers = [3, 4, 3];
          const layerX = [cx - 60, cx, cx + 60];
          const nodePositions: { x: number; y: number }[][] = [];

          layers.forEach((cnt, lIdx) => {
            const arr = [];
            for (let i = 0; i < cnt; i++) {
              const ny = cy + (i - (cnt - 1) / 2) * 28;
              arr.push({ x: layerX[lIdx], y: ny });
            }
            nodePositions.push(arr);
          });

          // Draw synaptic weights
          ctx.lineWidth = 1;
          for (let l = 0; l < nodePositions.length - 1; l++) {
            const currLayer = nodePositions[l];
            const nextLayer = nodePositions[l + 1];
            currLayer.forEach((from, fIdx) => {
              nextLayer.forEach((to, tIdx) => {
                const signal = Math.sin(t * 3 + fIdx + tIdx);
                ctx.strokeStyle = signal > 0 ? `${accentColor}bb` : `${secondaryColor}33`;
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
              });
            });
          }

          // Draw neuron nodes
          nodePositions.forEach((layer) => {
            layer.forEach((node, idx) => {
              ctx.fillStyle = idx % 2 === 0 ? accentColor : secondaryColor;
              ctx.shadowColor = accentColor;
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(node.x, node.y, 4.5, 0, Math.PI * 2);
              ctx.fill();
            });
          });
          break;
        }

        // 9. Cloud Fabric Core: Hyperscale Server Blade Matrix
        case 'cloud_datacenter': {
          const cols = 5;
          const colW = 22;
          const startX = cx - (cols * colW) / 2;
          for (let c = 0; c < cols; c++) {
            const rx = startX + c * colW;
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.fillRect(rx, cy - 40, 16, 80);
            ctx.strokeRect(rx, cy - 40, 16, 80);

            // Server LED activity
            for (let led = 0; led < 5; led++) {
              const ly = cy - 32 + led * 14;
              const active = Math.sin(t * 4 + c * 3 + led) > 0.1;
              ctx.fillStyle = active ? accentColor : '#0284c733';
              ctx.beginPath();
              ctx.arc(rx + 8, ly, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;
        }

        // 10. SEC Compliance Hold: Mechanical Vault Lock Shield
        case 'sec_vault': {
          // Hexagonal security barrier
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + t * 0.2;
            const hx = cx + Math.cos(angle) * 55;
            const hy = cy + Math.sin(angle) * 55;
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.stroke();

          // Locking pins
          for (let i = 0; i < 4; i++) {
            const pinAngle = (i / 4) * Math.PI * 2 - t * 0.5;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(pinAngle) * 20, cy + Math.sin(pinAngle) * 20);
            ctx.lineTo(cx + Math.cos(pinAngle) * 45, cy + Math.sin(pinAngle) * 45);
            ctx.stroke();
          }

          ctx.fillStyle = '#cbd5e1';
          ctx.font = `bold ${Math.floor(width * 0.045)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('COMPLIANCE SHIELD', cx, cy + 5);
          break;
        }

        // 11. BioGen Therapeutics: 3D DNA Double Helix
        case 'biotech_dna': {
          const steps = 14;
          const heightStep = 6.5;
          const amplitude = 38;
          ctx.lineWidth = 2.5;

          for (let i = 0; i < steps; i++) {
            const sy = cy - (steps * heightStep) / 2 + i * heightStep;
            const phase = t * 2 + i * 0.45;
            const x1 = cx + Math.cos(phase) * amplitude;
            const x2 = cx - Math.cos(phase) * amplitude;

            // Base pair connector
            ctx.strokeStyle = '#10b98155';
            ctx.beginPath();
            ctx.moveTo(x1, sy);
            ctx.lineTo(x2, sy);
            ctx.stroke();

            // Helix strand nodes
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x1, sy, 3.5, 0, Math.PI * 2);
            ctx.arc(x2, sy, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        // 12. CleanGrid Utility: Electric AC Sine Waves
        case 'cleangrid_wave': {
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 10;

          // Wave 1
          ctx.strokeStyle = '#eab308';
          ctx.beginPath();
          for (let x = 20; x < width - 20; x += 4) {
            const y = cy + Math.sin((x * 0.04) + t * 4) * 24;
            if (x === 20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Wave 2 (Phase shifted)
          ctx.strokeStyle = '#fef08a';
          ctx.beginPath();
          for (let x = 20; x < width - 20; x += 4) {
            const y = cy + Math.cos((x * 0.04) - t * 3) * 18;
            if (x === 20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          break;
        }

        // 13. GeneTech Diagnostics: Genomic Laser Barcode Scanner
        case 'genomic_scanner': {
          // Barcode gene bands
          for (let i = 0; i < 24; i++) {
            const bx = cx - 90 + i * 7.5;
            const h = 20 + Math.abs(Math.sin(i * 123)) * 40;
            ctx.fillStyle = i % 3 === 0 ? accentColor : '#065f46';
            ctx.fillRect(bx, cy - h / 2, 4, h);
          }

          // Sweeping optical scanner beam
          const scanX = cx + Math.sin(t * 3) * 85;
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#34d399';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(scanX, cy - 45);
          ctx.lineTo(scanX, cy + 45);
          ctx.stroke();
          break;
        }

        // 14. ImmunoHealth Global: Cellular Bio-Defense
        case 'immuno_cell': {
          // Central antibody cell
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 38 + Math.sin(t * 3) * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Orbiting receptor spikes
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + t;
            const rx1 = cx + Math.cos(ang) * 40;
            const ry1 = cy + Math.sin(ang) * 40;
            const rx2 = cx + Math.cos(ang) * 54;
            const ry2 = cy + Math.sin(ang) * 54;
            ctx.beginPath();
            ctx.moveTo(rx1, ry1);
            ctx.lineTo(rx2, ry2);
            ctx.stroke();
          }
          break;
        }

        // 15. Intermodal Logistics: Robotic Freight Crane
        case 'intermodal_freight': {
          // Gantry frame
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx - 70, cy + 40);
          ctx.lineTo(cx - 70, cy - 35);
          ctx.lineTo(cx + 70, cy - 35);
          ctx.lineTo(cx + 70, cy + 40);
          ctx.stroke();

          // Moving trolley & cable
          const trolleyX = cx + Math.sin(t * 1.5) * 45;
          ctx.beginPath();
          ctx.moveTo(trolleyX, cy - 35);
          ctx.lineTo(trolleyX, cy);
          ctx.stroke();

          // Suspended cargo container
          ctx.fillStyle = '#0284c7';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 6;
          ctx.fillRect(trolleyX - 16, cy, 32, 18);
          break;
        }

        // 16. Solaris Renewables: Photovoltaic Solar Corona
        case 'solaris_corona': {
          // Solar corona rays
          for (let i = 0; i < 16; i++) {
            const ang = (i / 16) * Math.PI * 2 + t * 0.8;
            const r1 = 30;
            const r2 = 55 + Math.sin(t * 3 + i) * 10;
            ctx.strokeStyle = '#14b8a6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
            ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
            ctx.stroke();
          }
          // Solar core
          ctx.fillStyle = '#2dd4bf';
          ctx.shadowColor = '#14b8a6';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(cx, cy, 26, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        // 17. Venture Syndicate: Dynamic Term Sheet Signing
        case 'venture_parchment': {
          // Parchment paper
          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.fillRect(cx - 60, cy - 40, 120, 80);
          ctx.strokeRect(cx - 60, cy - 40, 120, 80);

          // Simulated contract text lines
          for (let l = 0; l < 4; l++) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(cx - 45, cy - 25 + l * 12, 70 + (l % 2) * 15, 3);
          }

          // Golden quill writing signature
          const sigX = cx - 35 + ((t * 40) % 70);
          const sigY = cy + 22 + Math.sin(t * 10) * 4;
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sigX, sigY, 3.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        // 18. Fusion Dynamics: Tokamak Torus Plasma Vortex
        case 'fusion_tokamak': {
          // Magnetic confinement ring
          ctx.strokeStyle = '#0f766e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, 50, 0, Math.PI * 2);
          ctx.stroke();

          // Swirling plasma particles
          particles.slice(0, 30).forEach((p, idx) => {
            const ang = t * 4 + idx * 0.25;
            const rad = 32 + Math.sin(t * 3 + idx) * 14;
            const px = cx + Math.cos(ang) * rad;
            const py = cy + Math.sin(ang) * rad;
            ctx.fillStyle = idx % 2 === 0 ? '#2dd4bf' : '#38bdf8';
            ctx.shadowColor = '#2dd4bf';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        // 19. Apex Power Grid: Superconducting Continental Arc
        case 'apex_pylons': {
          // Pylon tower outline
          ctx.strokeStyle = '#0d9488';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 45);
          ctx.lineTo(cx - 30, cy + 40);
          ctx.moveTo(cx, cy - 45);
          ctx.lineTo(cx + 30, cy + 40);
          ctx.moveTo(cx - 40, cy - 15);
          ctx.lineTo(cx + 40, cy - 15);
          ctx.stroke();

          // High voltage lightning spark
          if (Math.sin(t * 12) > 0.4) {
            ctx.strokeStyle = '#5eead4';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#5eead4';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(cx - 40, cy - 15);
            ctx.lineTo(cx - 15, cy - 25);
            ctx.lineTo(cx + 10, cy - 10);
            ctx.lineTo(cx + 40, cy - 15);
            ctx.stroke();
          }
          break;
        }

        // 20. Liquidity Reserve: Subterranean Bullion Sanctuary
        case 'liquidity_sanctuary': {
          // Vault floor reflection
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + 30, 75, 20, 0, 0, Math.PI * 2);
          ctx.fill();

          // Water ripple rings
          for (let r = 1; r <= 3; r++) {
            const ripRad = ((t * 25 + r * 22) % 65);
            ctx.strokeStyle = `rgba(56, 189, 248, ${1 - ripRad / 65})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 30, ripRad, ripRad * 0.3, 0, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Gold bullion pyramid
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.fillRect(cx - 24, cy - 8, 48, 12);
          ctx.fillRect(cx - 16, cy - 22, 32, 12);
          break;
        }

        // 21. PayStream Platform: Real-Time Global Transaction Net
        case 'paystream_globe': {
          // World longitude circles
          ctx.strokeStyle = '#3b82f644';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 48, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx, cy, 48, 20, t * 0.2, 0, Math.PI * 2);
          ctx.stroke();

          // Firing financial transaction beams
          for (let i = 0; i < 5; i++) {
            const ang = i * 1.3 + t * 2;
            const tx = cx + Math.cos(ang) * 44;
            const ty = cy + Math.sin(ang) * 44;
            ctx.fillStyle = '#60a5fa';
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        // 22. High-Frequency Auction: Gavel Strike & Bid Shockwaves
        case 'auction_gavel': {
          // Gavel strike impact point
          const hit = Math.sin(t * 4);
          const impact = hit > 0.85;

          // Shockwave rings
          if (impact) {
            for (let r = 10; r <= 50; r += 15) {
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.arc(cx, cy + 20, r, 0, Math.PI * 2);
              ctx.stroke();
            }
          }

          // Gavel head
          const gavelAngle = impact ? 0 : -0.4 + Math.sin(t * 4) * 0.4;
          ctx.save();
          ctx.translate(cx, cy + 15);
          ctx.rotate(gavelAngle);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-8, -40, 16, 12);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-3, -28, 6, 28);
          ctx.restore();
          break;
        }

        // 23. LedgerVault Security: Concentric Cryptographic Cipher Wheels
        case 'ledgervault_cipher': {
          ctx.lineWidth = 2;
          [24, 42, 60].forEach((r, idx) => {
            const rot = t * (idx % 2 === 0 ? 1.2 : -1.2);
            ctx.strokeStyle = idx === 1 ? '#60a5fa' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();

            // Cipher teeth
            for (let teeth = 0; teeth < 8; teeth++) {
              const tang = rot + (teeth / 8) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(cx + Math.cos(tang) * r, cy + Math.sin(tang) * r);
              ctx.lineTo(cx + Math.cos(tang) * (r + 4), cy + Math.sin(tang) * (r + 4));
              ctx.stroke();
            }
          });
          break;
        }

        // 24. StripeLine Payments: Dual Fibre-Optic Rails
        case 'stripeline_rails': {
          // Parallel tracks
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(20, cy - 16);
          ctx.lineTo(width - 20, cy - 16);
          ctx.moveTo(20, cy + 16);
          ctx.lineTo(width - 20, cy + 16);
          ctx.stroke();

          // Streaming payment data packets
          for (let p = 0; p < 8; p++) {
            const px1 = (20 + (t * 120 + p * 45)) % (width - 40);
            const px2 = (width - 20 - (t * 95 + p * 40)) % (width - 40);
            ctx.fillStyle = '#60a5fa';
            ctx.shadowColor = '#93c5fd';
            ctx.shadowBlur = 8;
            ctx.fillRect(px1, cy - 20, 14, 8);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px2, cy + 12, 14, 8);
          }
          break;
        }

        // 25. HyperLoop Express: Supersonic Vacuum Tube Pod
        case 'hyperloop_tube': {
          // Vacuum tube casing
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(cx, cy, width * 0.42, 28, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Aerodynamic supersonic pod
          const podProgress = (t * 1.4) % 1;
          const podX = cx - width * 0.35 + podProgress * width * 0.7;
          ctx.fillStyle = '#e2e8f0';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.roundRect(podX - 22, cy - 10, 44, 20, 8);
          ctx.fill();

          // Mach 1 speed trails
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(podX - 45, cy);
          ctx.lineTo(podX - 22, cy);
          ctx.stroke();
          break;
        }

        // 26. Tensor Data Core: 100K GPU Isometric Cluster
        case 'tensor_gpu': {
          // Isometric compute blocks
          for (let bx = -2; bx <= 2; bx++) {
            for (let by = -1; by <= 1; by++) {
              const gx = cx + (bx - by) * 22;
              const gy = cy + (bx + by) * 12;
              const pulse = Math.sin(t * 4 + bx * 2 + by * 3);
              ctx.fillStyle = pulse > 0 ? '#a855f7' : '#581c87';
              ctx.shadowColor = '#c084fc';
              ctx.shadowBlur = 6;
              ctx.beginPath();
              ctx.moveTo(gx, gy - 8);
              ctx.lineTo(gx + 12, gy);
              ctx.lineTo(gx, gy + 8);
              ctx.lineTo(gx - 12, gy);
              ctx.closePath();
              ctx.fill();
            }
          }
          break;
        }

        // 27. Strategy Hub Beta: Holographic Corporate Chessboard
        case 'strategy_chess': {
          // Perspective grid
          ctx.strokeStyle = '#4f46e555';
          ctx.lineWidth = 1.5;
          for (let i = -3; i <= 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 20, cy - 25);
            ctx.lineTo(cx + i * 36, cy + 35);
            ctx.stroke();
          }
          for (let j = 0; j < 4; j++) {
            const py = cy - 25 + j * 20;
            ctx.beginPath();
            ctx.moveTo(cx - 70 - j * 12, py);
            ctx.lineTo(cx + 70 + j * 12, py);
            ctx.stroke();
          }
          // Strategic King / Queen beacon
          ctx.fillStyle = '#818cf8';
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cx + Math.sin(t * 2) * 25, cy, 6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        // 28. Synthetix Cognitive: Multimodal Transformer Attention
        case 'synthetix_transformer': {
          const numTokens = 8;
          const tokens = [];
          for (let i = 0; i < numTokens; i++) {
            const ang = (i / numTokens) * Math.PI * 2 + t * 0.4;
            tokens.push({ x: cx + Math.cos(ang) * 50, y: cy + Math.sin(ang) * 50 });
          }
          // Dynamic attention heads
          ctx.lineWidth = 1.2;
          for (let i = 0; i < numTokens; i++) {
            for (let j = i + 1; j < numTokens; j++) {
              const weight = Math.sin(t * 3 + i * 2 + j * 3);
              if (weight > 0.2) {
                ctx.strokeStyle = `rgba(168, 85, 247, ${weight * 0.9})`;
                ctx.beginPath();
                ctx.moveTo(tokens[i].x, tokens[i].y);
                ctx.lineTo(tokens[j].x, tokens[j].y);
                ctx.stroke();
              }
            }
          }
          tokens.forEach((tk) => {
            ctx.fillStyle = '#c084fc';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(tk.x, tk.y, 4, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        // 29. Omni Intelligence HQ: Frontier AGI Monolith
        case 'omni_monolith': {
          // Glowing cognitive aura waves
          for (let w = 1; w <= 3; w++) {
            const rad = ((t * 30 + w * 25) % 80);
            ctx.strokeStyle = `rgba(168, 85, 247, ${1 - rad / 80})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Obsidian AGI Monolith
          ctx.fillStyle = '#0f0728';
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 15;
          ctx.fillRect(cx - 18, cy - 45, 36, 90);
          ctx.strokeRect(cx - 18, cy - 45, 36, 90);
          break;
        }

        // 30. Market Volatility Fee: Flash Crash Spikes
        case 'volatility_spikes': {
          // Seismograph volatility needle
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          for (let x = 20; x < width - 20; x += 6) {
            const spike = Math.random() > 0.7 ? (Math.random() - 0.5) * 60 : Math.sin(t * 5 + x) * 12;
            const y = cy + spike;
            if (x === 20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          break;
        }

        // 31. Titan Conglomerate: Sovereign Industrial Gears
        case 'titan_fortress': {
          // Interlocking gears
          [cx - 30, cx + 30].forEach((gx, gIdx) => {
            const rot = t * (gIdx === 0 ? 1 : -1);
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(gx, cy, 32, 0, Math.PI * 2);
            ctx.stroke();
            for (let i = 0; i < 8; i++) {
              const ang = rot + (i / 8) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(gx + Math.cos(ang) * 32, cy + Math.sin(ang) * 32);
              ctx.lineTo(gx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40);
              ctx.stroke();
            }
          });
          break;
        }

        // 32. AeroSpace Prime: Heavy Orbital Rocket Launch
        case 'aerospace_rocket': {
          // Rocket plume
          particles.slice(0, 20).forEach((p, idx) => {
            const py = (cy + 15 + t * 40 + idx * 8) % (height * 0.85);
            const px = cx + (Math.sin(idx * 4) * 12);
            ctx.fillStyle = idx % 2 === 0 ? '#fb7185' : '#f59e0b';
            ctx.shadowColor = '#f43f5e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(px, py, p.size + 1.5, 0, Math.PI * 2);
            ctx.fill();
          });
          // Rocket body
          ctx.fillStyle = '#f1f5f9';
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 45);
          ctx.lineTo(cx + 12, cy + 10);
          ctx.lineTo(cx - 12, cy + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }

        // 33. Central Bank Directive: Liquidity Ripple Shock
        case 'centralbank_shock': {
          // Central bank seal
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Shockwave ripple lines
          for (let r = 1; r <= 3; r++) {
            const rad = ((t * 22 + r * 20) % 70);
            ctx.strokeStyle = `rgba(245, 158, 11, ${1 - rad / 70})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.fillStyle = '#fbbf24';
          ctx.font = `bold ${Math.floor(width * 0.05)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('POLICY RATE', cx, cy);
          break;
        }

        // 34. Quantum Dynamics Corp: Tactical Reticle HUD
        case 'quantum_reticle': {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          // Reticle ring
          ctx.beginPath();
          ctx.arc(cx, cy, 45, 0, Math.PI * 2);
          ctx.stroke();

          // Corner brackets
          const brk = 55;
          [
            [cx - brk, cy - brk, 1, 1],
            [cx + brk, cy - brk, -1, 1],
            [cx - brk, cy + brk, 1, -1],
            [cx + brk, cy + brk, -1, -1],
          ].forEach(([bx, by, dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(bx, by + dy * 12);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + dx * 12, by);
            ctx.stroke();
          });
          break;
        }

        // 35. Orbital Constellation: Telecom Satellite Laser Crosslinks
        case 'orbital_satellite': {
          // Earth horizon
          ctx.strokeStyle = '#38bdf844';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy + 90, 110, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();

          // Satellites with laser links
          const sats = [-50, 0, 50].map((ox, i) => ({
            x: cx + ox,
            y: cy - 20 + Math.sin(t * 2 + i) * 10,
          }));

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(sats[0].x, sats[0].y);
          ctx.lineTo(sats[1].x, sats[1].y);
          ctx.lineTo(sats[2].x, sats[2].y);
          ctx.stroke();

          sats.forEach((s) => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
            ctx.fill();
          });
          break;
        }

        // 36. Venture Capital Board: Executive Voting Dial
        case 'vc_boardroom': {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(cx, cy, 46, 0, Math.PI * 2);
          ctx.stroke();

          // 100% Unanimous dial sweep
          const dial = (t * 1.2) % (Math.PI * 2);
          ctx.strokeStyle = '#a5b4fc';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#818cf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, 46, 0, dial);
          ctx.stroke();

          ctx.fillStyle = '#c7d2fe';
          ctx.font = `bold ${Math.floor(width * 0.045)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('BOARD VOTE', cx, cy);
          break;
        }

        // 37. Wall Street Citadel: Orderbook Candlestick Depth
        case 'wallstreet_depth': {
          // Candlesticks
          for (let i = 0; i < 12; i++) {
            const cxCandle = cx - 65 + i * 11;
            const isGreen = (i + Math.floor(t * 2)) % 2 === 0;
            const candleH = 12 + Math.abs(Math.sin(t * 3 + i * 2)) * 32;
            const yOffset = cy + Math.sin(i * 0.5 + t) * 14;

            ctx.strokeStyle = isGreen ? '#10b981' : '#f43f5e';
            ctx.fillStyle = isGreen ? '#10b981' : '#f43f5e';
            ctx.lineWidth = 1.5;

            // Wick
            ctx.beginPath();
            ctx.moveTo(cxCandle, yOffset - candleH / 2 - 6);
            ctx.lineTo(cxCandle, yOffset + candleH / 2 + 6);
            ctx.stroke();

            // Body
            ctx.fillRect(cxCandle - 3.5, yOffset - candleH / 2, 7, candleH);
          }
          break;
        }

        // 38. Super-Wealth Assessment: Regulatory Balance Scale
        case 'superwealth_scale': {
          // Scale fulcrum
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy - 35);
          ctx.lineTo(cx, cy + 30);
          ctx.stroke();

          // Tilting beam
          const tilt = Math.sin(t * 2) * 0.2;
          ctx.save();
          ctx.translate(cx, cy - 25);
          ctx.rotate(tilt);
          ctx.beginPath();
          ctx.moveTo(-50, 0);
          ctx.lineTo(50, 0);
          ctx.stroke();

          // Left and right pans
          ctx.fillStyle = '#fb7185';
          ctx.fillRect(-58, 20, 16, 6);
          ctx.fillRect(42, 20, 16, 6);
          ctx.restore();
          break;
        }

        // 39. Mayfair Financial Tower: Penthouse Skyscraper Silhouettes
        case 'mayfair_penthouse': {
          // Skyscraper silhouettes
          ctx.fillStyle = '#1e1b4b';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.fillRect(cx - 30, cy - 50, 60, 95);
          ctx.strokeRect(cx - 30, cy - 50, 60, 95);

          // Sweeping searchlight beacons
          const beamAng = t * 1.5;
          ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
          ctx.beginPath();
          ctx.moveTo(cx, cy - 50);
          ctx.lineTo(cx + Math.cos(beamAng) * 90, cy - 50 + Math.sin(beamAng) * 90);
          ctx.lineTo(cx + Math.cos(beamAng + 0.3) * 90, cy - 50 + Math.sin(beamAng + 0.3) * 90);
          ctx.closePath();
          ctx.fill();
          break;
        }

        // 40. Silicon Valley Incubator: Garage Circuitry & Unicorn Spark
        case 'silicon_garage': {
          // PCB circuit lines
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + i * 20, cy + 40);
            ctx.lineTo(cx + i * 20, cy);
            ctx.lineTo(cx + (i < 0 ? -45 : 45), cy - 20);
            ctx.stroke();
          }
          // Glowing unicorn beacon
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(cx, cy - 25, 8 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        // 41. Private Equity Fund: LBO Financial Flywheel
        case 'privateequity_flywheel': {
          // Flywheel outer ring
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 45, 0, Math.PI * 2);
          ctx.stroke();

          // High-velocity rotating spokes
          for (let i = 0; i < 6; i++) {
            const spk = (i / 6) * Math.PI * 2 + t * 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(spk) * 45, cy + Math.sin(spk) * 45);
            ctx.stroke();
          }
          break;
        }

        // 42. CyberShield Systems: Hexagonal Cyber Forcefield
        case 'cybershield_matrix': {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
          for (let r = 24; r <= 52; r += 14) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2 + (r % 28 === 0 ? t * 0.4 : -t * 0.4);
              const px = cx + Math.cos(ang) * r;
              const py = cy + Math.sin(ang) * r;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
          break;
        }

        // 43. Strategy Hub Gamma: Geopolitical World Strategic Grid
        case 'strategy_globe': {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 48, 0, Math.PI * 2);
          ctx.stroke();
          // Latitude & longitude lines
          ctx.beginPath();
          ctx.ellipse(cx, cy, 48, 16, t * 0.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx, cy, 16, 48, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        // 44. NeuroLink Technologies: Bio-Digital Synapse Interface
        case 'neurolink_interface': {
          // Cortex electrode circle
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Synaptic sparks
          for (let s = 0; s < 6; s++) {
            const ang = (s / 6) * Math.PI * 2 + t * 1.5;
            const sx = cx + Math.cos(ang) * 40;
            const sy = cy + Math.sin(ang) * 40;
            ctx.fillStyle = '#34d399';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }

        // 45. Global Shipping Fleet: Autonomous Container Megaship
        case 'shipping_armada': {
          // Water waves
          ctx.strokeStyle = '#38bdf866';
          ctx.lineWidth = 2;
          for (let y = cy + 10; y <= cy + 35; y += 12) {
            ctx.beginPath();
            for (let x = 20; x < width - 20; x += 8) {
              const wy = y + Math.sin(x * 0.05 + t * 3) * 4;
              if (x === 20) ctx.moveTo(x, wy);
              else ctx.lineTo(x, wy);
            }
            ctx.stroke();
          }

          // Cargo vessel hull
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 50, cy);
          ctx.lineTo(cx + 40, cy);
          ctx.lineTo(cx + 55, cy + 14);
          ctx.lineTo(cx - 45, cy + 14);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        }

        // 46. WindFarm Dynamics: Kinetic Aerofoil Turbines
        case 'windfarm_turbines': {
          // Turbine pylon
          ctx.strokeStyle = '#14b8a6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx, cy + 45);
          ctx.lineTo(cx, cy - 10);
          ctx.stroke();

          // Rotating 3-blade aerofoils
          for (let b = 0; b < 3; b++) {
            const bAng = (b / 3) * Math.PI * 2 + t * 4;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 10);
            ctx.lineTo(cx + Math.cos(bAng) * 45, cy - 10 + Math.sin(bAng) * 45);
            ctx.stroke();
          }
          break;
        }

        // 47. DeFi Liquidity Pool: Algorithmic AMM Bonding Curve
        case 'defi_curve': {
          // Axes
          ctx.strokeStyle = '#1d4ed8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 55, cy + 35);
          ctx.lineTo(cx + 55, cy + 35);
          ctx.moveTo(cx - 55, cy + 35);
          ctx.lineTo(cx - 55, cy - 35);
          ctx.stroke();

          // Constant product curve (x * y = k)
          ctx.strokeStyle = '#60a5fa';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#60a5fa';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          for (let x = -48; x <= 48; x += 2) {
            const normX = (x + 50) / 100;
            const normY = 0.2 / Math.max(0.1, normX);
            const plotY = cy + 35 - normY * 60;
            if (x === -48) ctx.moveTo(cx + x, plotY);
            else ctx.lineTo(cx + x, plotY);
          }
          ctx.stroke();
          break;
        }

        // 48. High-Frequency Auction 2: Flash Dutch Countdown
        case 'auction_dutch': {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 45, 0, Math.PI * 2);
          ctx.stroke();

          // Countdown ticker arm
          const tickerAng = (t * 5) % (Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(tickerAng) * 40, cy + Math.sin(tickerAng) * 40);
          ctx.stroke();
          break;
        }

        // 49. Sentient AI Labs: Bio-Digital Brain Cortex
        case 'sentient_brain': {
          // Beating brain hemispheres
          const pulse = 1 + Math.sin(t * 4) * 0.08;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(pulse, pulse);

          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 12;

          // Left & Right lobes
          ctx.beginPath();
          ctx.arc(-16, 0, 24, Math.PI * 0.5, Math.PI * 1.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(16, 0, 24, Math.PI * 1.5, Math.PI * 0.5);
          ctx.stroke();

          // Center synaptic bridge
          ctx.fillStyle = '#e9d5ff';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        }

        // 50. MegaCorp Holdings: Planetary Sovereign Lattice
        case 'megacorp_lattice': {
          // Globe circle
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, 45, 0, Math.PI * 2);
          ctx.stroke();

          // Planetary lattice coordinates
          for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI + t * 0.3;
            ctx.beginPath();
            ctx.ellipse(cx, cy, 45, 14, ang, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;
        }

        // 51. Hedge Fund Citadel: The Apex Financial Arbitrage Engine
        case 'hedgefund_apex': {
          // Majestic fortress spires with gold ray sweeps
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 16;

          // Apex tower
          ctx.beginPath();
          ctx.moveTo(cx, cy - 50);
          ctx.lineTo(cx + 25, cy + 35);
          ctx.lineTo(cx - 25, cy + 35);
          ctx.closePath();
          ctx.stroke();

          // Multi-million ƁM arbitrage streams
          particles.slice(0, 25).forEach((p, idx) => {
            const py = (cy + 35 - ((t * 60 + idx * 14) % 95));
            const px = cx + (Math.sin(idx * 7) * 28);
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(px, py, p.size + 1, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.fillStyle = '#fbbf24';
          ctx.font = `bold ${Math.floor(width * 0.04)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('APEX CITADEL', cx, cy + 48);
          break;
        }

        default: {
          // Generic fallback high-tech circular pulse
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, 40 + Math.sin(t * 2) * 8, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }

      ctx.restore();
      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    if (canvas && typeof canvas.addEventListener === 'function') {
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseleave', onMouseLeave);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      if (canvas && typeof canvas.removeEventListener === 'function') {
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseleave', onMouseLeave);
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [spaceIndex, animationType, accentColor, secondaryColor]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-950/80 border border-slate-800 ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Subtle Scanlines Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
          backgroundSize: '100% 4px',
        }}
      />
    </div>
  );
};
