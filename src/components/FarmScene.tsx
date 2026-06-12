import { useState, useEffect, useRef } from "react";
import { Application, Graphics, Container } from "pixi.js";
import type { GameState } from "@/engine/types";

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
  phase: number;
}

interface FarmSceneProps {
  state: GameState;
}

function statColor(value: number, low: number, high: number) {
  if (value < low) return "#ff6b6b";
  if (value > high) return "#69db7c";
  return "#ffd43b";
}

export function FarmScene({ state }: FarmSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Always-current state — readable from inside Pixi closures without re-running the effect
  const stateRef = useRef(state);
  stateRef.current = state;

  // Which cow index is hovered, plus its initial screen position for the first render
  const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);
  const hoveredRef = useRef<{ container: Container } | null>(null);

  const appRef = useRef<Application | null>(null);
  const cowLayerRef = useRef<import("pixi.js").Container | null>(null);
  const cowsRef = useRef<CowAnim[]>([]);

  const cowCount = state.farm.animals.filter(a => a.type === "cow").length;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const app = new Application();
    let alive = true;
    let initialized = false;

    (async () => {
      await app.init({
        resizeTo: wrapper,
        backgroundColor: PAL.soil,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        antialias: false,
      });

      initialized = true;
      if (!alive) { app.destroy(true); return; }

      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.display = "block";
      wrapper.appendChild(canvas);

      const W = app.screen.width;
      const H = app.screen.height;

      buildBackground(app, W, H);
      buildTrees(app, W, H);
      buildBuildings(app, W, H);
      buildFence(app, W, H);
      buildFarmPlots(app, W, H);

      const { layer, cows } = buildCows(W, H, stateRef, setHovered, hoveredRef);
      app.stage.addChild(layer);
      appRef.current = app;
      cowLayerRef.current = layer;
      cowsRef.current = cows;

      app.ticker.add((ticker) => {
        for (const cow of cowsRef.current) {
          cow.container.x = cow.baseX + Math.sin(cow.phase) * 28;
          cow.container.y = cow.baseY + Math.cos(cow.phase * 0.6) * 7;
          cow.container.scale.x = Math.cos(cow.phase) > 0 ? 1 : -1;
          cow.phase += ticker.deltaTime * 0.007;
        }
        // Move tooltip with the cow — direct DOM write, no React re-render
        if (hoveredRef.current && tooltipRef.current) {
          tooltipRef.current.style.left = `${hoveredRef.current.container.x}px`;
          tooltipRef.current.style.top = `${hoveredRef.current.container.y - 140}px`;
        }
      });
    })();

    return () => {
      alive = false;
      setHovered(null);
      appRef.current = null;
      cowLayerRef.current = null;
      cowsRef.current = [];
      if (initialized) app.destroy(true);
    };
  }, []);

  // Rebuild just the cow layer whenever the cow count changes
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    const W = app.screen.width;
    const H = app.screen.height;

    if (cowLayerRef.current) {
      app.stage.removeChild(cowLayerRef.current);
      cowLayerRef.current.destroy({ children: true });
    }
    setHovered(null);
    hoveredRef.current = null;

    const { layer, cows } = buildCows(W, H, stateRef, setHovered, hoveredRef);
    app.stage.addChild(layer);
    cowLayerRef.current = layer;
    cowsRef.current = cows;
  }, [cowCount]);

  // Read animal from the *current* state so it always matches HUD / debug panel
  const cowAnimals = stateRef.current.farm.animals.filter(a => a.type === "cow");
  const hoveredAnimal = hovered !== null ? (cowAnimals[hovered.index] ?? null) : null;

  return (
    <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      {hoveredAnimal && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            left: hovered!.x,
            top: hovered!.y - 140,
            transform: "translateX(-50%)",
            background: "rgba(16, 8, 2, 0.93)",
            border: "2px solid #c89050",
            borderRadius: 8,
            padding: "8px 12px",
            color: "#f0d090",
            fontFamily: "monospace",
            fontSize: 12,
            lineHeight: 1.7,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: 2, color: "#ffe4a0", fontSize: 13 }}>
            {hoveredAnimal.name}
          </div>
          <div>Health: <span style={{ color: statColor(hoveredAnimal.health, 20, 80) }}>{hoveredAnimal.health}</span></div>
          <div>Mood: <span style={{ color: statColor(hoveredAnimal.mood, 30, 70) }}>{hoveredAnimal.mood}</span></div>
          <div>Productivity: {hoveredAnimal.productivity}/day</div>
          <div>Age: day {hoveredAnimal.age}</div>
          <div style={{
            position: "absolute",
            bottom: -9,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid #c89050",
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Scene builders ───────────────────────────────────────────────────────────

function buildBackground(app: Application, W: number, H: number) {
  const g = new Graphics();
  g.rect(0, 0, W, H * 0.18).fill(PAL.skyTop);
  g.rect(0, H * 0.18, W, H * 0.16).fill(PAL.skyMid);
  g.rect(0, H * 0.34, W, H * 0.14).fill(PAL.horizon);
  g.rect(0, H * 0.48, W, H * 0.52).fill(PAL.ground);
  g.rect(W * 0.08, H * 0.49, W * 0.44, H * 0.3).fill(PAL.grassLight);
  g.rect(W * 0.08, H * 0.62, W * 0.44, H * 0.08).fill(PAL.grassDark);
  app.stage.addChild(g);
}

function buildTrees(app: Application, W: number, H: number) {
  const g = new Graphics();
  const drawTree = (cx: number, groundY: number, w: number, h: number) => {
    g.poly([cx, groundY - h, cx - w / 2, groundY, cx + w / 2, groundY]).fill(PAL.tree);
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
  const hx = W * 0.14, hy = H * 0.3, hw = W * 0.13, hh = H * 0.19;
  g.rect(hx, hy + hh * 0.3, hw, hh * 0.7).fill(PAL.house);
  g.poly([hx - hw * 0.04, hy + hh * 0.33, hx + hw * 0.5, hy, hx + hw * 1.04, hy + hh * 0.33]).fill(PAL.houseRoof);
  g.rect(hx + hw * 0.36, hy + hh * 0.65, hw * 0.28, hh * 0.35).fill(PAL.door);
  g.rect(hx + hw * 0.06, hy + hh * 0.4, hw * 0.24, hh * 0.22).fill(PAL.window);
  g.rect(hx + hw * 0.7, hy + hh * 0.4, hw * 0.24, hh * 0.22).fill(PAL.window);
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
  const postCount = 7;
  for (let i = 0; i <= postCount; i++) {
    g.rect(fx + i * (fw / postCount) - 3, fy - 5, 6, fh + 10).fill(PAL.fence);
  }
  g.rect(fx, fy + fh * 0.25, fw, 4).fill(PAL.fence);
  g.rect(fx, fy + fh * 0.7, fw, 4).fill(PAL.fence);
  app.stage.addChild(g);
}

function buildFarmPlots(app: Application, W: number, H: number) {
  const g = new Graphics();
  g.rect(W * 0.56, H * 0.52, W * 0.28, H * 0.22).fill(PAL.soil);
  for (let i = 0; i < 5; i++) {
    g.rect(W * 0.58 + i * W * 0.05, H * 0.54, W * 0.036, H * 0.17).fill(PAL.soilRow);
  }
  app.stage.addChild(g);
}

function buildCows(
  W: number,
  H: number,
  stateRef: React.RefObject<GameState>,
  setHovered: (v: { index: number; x: number; y: number } | null) => void,
  hoveredRef: React.MutableRefObject<{ container: Container } | null>,
): { layer: Container; cows: CowAnim[] } {
  const layer = new Container();
  const cows: CowAnim[] = [];
  const count = Math.min(stateRef.current!.farm.animals.filter(a => a.type === "cow").length, 8);

  for (let i = 0; i < count; i++) {
    const c = new Container();
    const g = new Graphics();

    // Transparent hit area covering the full cow body
    g.rect(-26, -20, 58, 42).fill({ color: 0x000000, alpha: 0 });
    g.ellipse(0, 0, 22, 13).fill(PAL.cowBody);
    g.ellipse(21, -4, 10, 8).fill(PAL.cowBody);
    g.ellipse(27, -10, 4, 3).fill(0xe0b080);
    g.ellipse(-4, -3, 7, 5).fill(PAL.cowSpot);
    g.circle(23, -7, 2).fill(PAL.cowEye);
    for (const lx of [-10, -2, 7, 15]) {
      g.rect(lx, 11, 4, 10).fill(PAL.cowLeg);
    }
    c.addChild(g);

    const baseX = W * 0.14 + (i / Math.max(count, 1)) * W * 0.34;
    const baseY = H * 0.6 + (i % 2) * H * 0.07;
    c.position.set(baseX, baseY);

    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointerover", () => {
      hoveredRef.current = { container: c };
      setHovered({ index: i, x: c.x, y: c.y });
    });
    c.on("pointerout", () => {
      hoveredRef.current = null;
      setHovered(null);
    });

    layer.addChild(c);
    cows.push({ container: c, baseX, baseY, phase: (i / Math.max(count, 1)) * Math.PI * 2 });
  }

  return { layer, cows };
}
