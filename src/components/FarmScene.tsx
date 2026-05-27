import { useEffect, useRef } from "react";
import { Application, Graphics, Container } from "pixi.js";
import type { GameState } from "@/agent/state";

// Autumn palette — matches CSS vars
const PAL = {
  skyTop: 0xf5c430,
  skyMid: 0xe07818,
  horizon: 0xc86820,
  ground: 0x8b5a28,
  grassLight: 0x8aaa3a,
  grassDark: 0x5a7a22,
  soil: 0x4a2e08,
  soilRow: 0x6b4010,
  tree: 0x5a1a05,
  trunk: 0x3a1800,
  barn: 0x8b3a10,
  barnRoof: 0x5a2008,
  house: 0xa06428,
  houseRoof: 0x6a3a18,
  door: 0x2a1000,
  window: 0xffe060,
  fence: 0xc89050,
  cowBody: 0xc8a070,
  cowSpot: 0x7a5030,
  cowLeg: 0xb08858,
  cowEye: 0x1a0800,
};

interface CowAnim {
  container: Container;
  baseX: number;
  baseY: number;
  phase: number; // offset so cows don't move in sync
}

interface FarmSceneProps {
  state: GameState;
}

export function FarmScene({ state }: FarmSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const app = new Application();
    const cows: CowAnim[] = [];
    let alive = true;
    let initialized = false;

    (async () => {
      await app.init({
        resizeTo: wrapper,
        backgroundColor: PAL.soil,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        antialias: false, // pixel-art look — no smoothing
      });

      // Mark init done so the cleanup knows it's safe to call destroy
      initialized = true;

      // Component unmounted while init was in-flight — destroy and bail
      if (!alive) {
        app.destroy(true);
        return;
      }

      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.display = "block"; // prevent inline gap
      wrapper.appendChild(canvas);

      const W = app.screen.width;
      const H = app.screen.height;

      buildBackground(app, W, H);
      buildTrees(app, W, H);
      buildBuildings(app, W, H);
      buildFence(app, W, H);
      buildFarmPlots(app, W, H);
      buildCows(app, W, H, state, cows);

      // Idle animation — gentle sinusoidal wander, no player input
      app.ticker.add((ticker) => {
        for (const cow of cows) {
          cow.container.x = cow.baseX + Math.sin(cow.phase) * 28;
          cow.container.y = cow.baseY + Math.cos(cow.phase * 0.6) * 7;
          cow.container.scale.x = Math.cos(cow.phase) > 0 ? 1 : -1;
          cow.phase += ticker.deltaTime * 0.007;
        }
      });
    })();

    return () => {
      alive = false;
      // Only destroy if init completed — if still in-flight, the async
      // chain's !alive check above will call destroy when it resolves
      if (initialized) {
        app.destroy(true);
      }
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    />
  );
}

// ─── Scene builders ───────────────────────────────────────────────────────────

function buildBackground(app: Application, W: number, H: number) {
  const g = new Graphics();

  // Sky — three amber bands
  g.rect(0, 0, W, H * 0.18).fill(PAL.skyTop);
  g.rect(0, H * 0.18, W, H * 0.16).fill(PAL.skyMid);
  g.rect(0, H * 0.34, W, H * 0.14).fill(PAL.horizon);

  // Ground
  g.rect(0, H * 0.48, W, H * 0.52).fill(PAL.ground);

  // Pasture (lighter patch inside fence area)
  g.rect(W * 0.08, H * 0.49, W * 0.44, H * 0.3).fill(PAL.grassLight);
  g.rect(W * 0.08, H * 0.62, W * 0.44, H * 0.08).fill(PAL.grassDark);

  app.stage.addChild(g);
}

function buildTrees(app: Application, W: number, H: number) {
  const g = new Graphics();

  const drawTree = (cx: number, groundY: number, w: number, h: number) => {
    // Foliage triangle
    g.poly([cx, groundY - h, cx - w / 2, groundY, cx + w / 2, groundY]).fill(PAL.tree);
    // Trunk
    g.rect(cx - 4, groundY, 8, h * 0.22).fill(PAL.trunk);
  };

  const horizon = H * 0.48;
  drawTree(W * 0.06, horizon, 52, 100);
  drawTree(W * 0.13, horizon, 38, 78);
  drawTree(W * 0.9, horizon, 46, 88);
  drawTree(W * 0.96, horizon, 34, 68);

  app.stage.addChild(g);
}

function buildBuildings(app: Application, W: number, H: number) {
  const g = new Graphics();

  // House (left side)
  const hx = W * 0.14, hy = H * 0.3, hw = W * 0.13, hh = H * 0.19;
  g.rect(hx, hy + hh * 0.3, hw, hh * 0.7).fill(PAL.house);
  g.poly([hx - hw * 0.04, hy + hh * 0.33, hx + hw * 0.5, hy, hx + hw * 1.04, hy + hh * 0.33]).fill(PAL.houseRoof);
  g.rect(hx + hw * 0.36, hy + hh * 0.65, hw * 0.28, hh * 0.35).fill(PAL.door);
  g.rect(hx + hw * 0.06, hy + hh * 0.4, hw * 0.24, hh * 0.22).fill(PAL.window);
  g.rect(hx + hw * 0.7, hy + hh * 0.4, hw * 0.24, hh * 0.22).fill(PAL.window);

  // Barn (right side, larger)
  const bx = W * 0.66, by = H * 0.28, bw = W * 0.2, bh = H * 0.22;
  g.rect(bx, by + bh * 0.28, bw, bh * 0.72).fill(PAL.barn);
  g.poly([bx - bw * 0.04, by + bh * 0.32, bx + bw * 0.5, by, bx + bw * 1.04, by + bh * 0.32]).fill(PAL.barnRoof);
  g.rect(bx + bw * 0.33, by + bh * 0.63, bw * 0.34, bh * 0.37).fill(PAL.door);
  g.rect(bx + bw * 0.08, by + bh * 0.42, bw * 0.2, bh * 0.2).fill(PAL.window);
  g.rect(bx + bw * 0.72, by + bh * 0.42, bw * 0.2, bh * 0.2).fill(PAL.window);

  app.stage.addChild(g);
}

function buildFence(app: Application, W: number, H: number) {
  const g = new Graphics();
  const fx = W * 0.08, fy = H * 0.48, fw = W * 0.44, fh = H * 0.32;

  // Posts
  const postCount = 7;
  for (let i = 0; i <= postCount; i++) {
    g.rect(fx + i * (fw / postCount) - 3, fy - 5, 6, fh + 10).fill(PAL.fence);
  }
  // Two horizontal rails
  g.rect(fx, fy + fh * 0.25, fw, 4).fill(PAL.fence);
  g.rect(fx, fy + fh * 0.7, fw, 4).fill(PAL.fence);

  app.stage.addChild(g);
}

function buildFarmPlots(app: Application, W: number, H: number) {
  const g = new Graphics();

  // Soil patch for crops
  g.rect(W * 0.56, H * 0.52, W * 0.28, H * 0.22).fill(PAL.soil);
  // Tilled rows
  for (let i = 0; i < 5; i++) {
    g.rect(W * 0.58 + i * W * 0.05, H * 0.54, W * 0.036, H * 0.17).fill(PAL.soilRow);
  }

  app.stage.addChild(g);
}

function buildCows(
  app: Application,
  W: number,
  H: number,
  state: GameState,
  cows: CowAnim[],
) {
  const cowLayer = new Container();

  // Show at least 2 cows even if farm is empty (placeholder)
  const count = Math.max(2, Math.min(state.farm.animals.length, 5));

  for (let i = 0; i < count; i++) {
    const c = new Container();
    const g = new Graphics();

    // Body
    g.ellipse(0, 0, 22, 13).fill(PAL.cowBody);
    // Head
    g.ellipse(21, -4, 10, 8).fill(PAL.cowBody);
    // Ear
    g.ellipse(27, -10, 4, 3).fill(0xe0b080);
    // Spot on body
    g.ellipse(-4, -3, 7, 5).fill(PAL.cowSpot);
    // Eye
    g.circle(23, -7, 2).fill(PAL.cowEye);
    // Four legs
    for (const lx of [-10, -2, 7, 15]) {
      g.rect(lx, 11, 4, 10).fill(PAL.cowLeg);
    }

    c.addChild(g);

    const baseX = W * 0.14 + (i / count) * W * 0.34;
    const baseY = H * 0.6 + (i % 2) * H * 0.07;
    c.position.set(baseX, baseY);
    cowLayer.addChild(c);

    cows.push({ container: c, baseX, baseY, phase: (i / count) * Math.PI * 2 });
  }

  app.stage.addChild(cowLayer);
}
