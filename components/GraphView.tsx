"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Graph, GraphNode } from "@/lib/wikilinks";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type Palette = {
  bg: string;
  link: string;
  node: string;
  special: string;
  orphan: string;
  stub: string;
  label: string;
  labelStub: string;
  glow: string;
};

// Read theme colors from the CSS variables so the graph tracks light/dark + accent.
function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => `rgb(${s.getPropertyValue(name).trim() || "0 0 0"})`;
  const va = (name: string, a: number) =>
    `rgb(${s.getPropertyValue(name).trim() || "0 0 0"} / ${a})`;
  return {
    bg: v("--sunken"),
    link: va("--lav-dim", 0.35),
    node: v("--lav"),
    special: v("--lav-light"),
    orphan: va("--lav-dim", 0.85),
    stub: va("--faint", 0.9),
    label: v("--muted"),
    labelStub: v("--faint"),
    glow: va("--lav-glow", 0.3),
  };
}

export default function GraphView({ graph }: { graph: Graph }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [palette, setPalette] = useState<Palette | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: Math.max(480, window.innerHeight - 220) });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Re-read palette on mount and whenever the theme class on <html> changes.
  useEffect(() => {
    setPalette(readPalette());
    const mo = new MutationObserver(() => setPalette(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  // Recently-updated nodes (within 90s of load) get a highlight ring.
  const recentThreshold = useMemo(() => Date.now() - 90_000, []);

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.links.map((l) => ({ ...l })),
    }),
    [graph],
  );

  if (!palette) {
    return <div ref={wrapRef} className="h-[60vh] rounded-xl border border-edge bg-sunken" />;
  }
  const p = palette;

  return (
    <div ref={wrapRef} className="overflow-hidden rounded-xl border border-edge bg-sunken">
      <ForceGraph2D
        graphData={data}
        width={size.width}
        height={size.height}
        backgroundColor={p.bg}
        linkColor={() => p.link}
        linkDirectionalParticles={0}
        cooldownTicks={120}
        onNodeClick={(node: object) => {
          const n = node as GraphNode;
          if (!n.isStub) router.push(`/wiki/${n.id}`);
        }}
        nodeCanvasObject={(node: object, ctx: CanvasRenderingContext2D, scale: number) => {
          const n = node as GraphNode & { x: number; y: number };
          const radius = 3 + Math.min(10, n.inbound * 1.6) + (n.isSpecial ? 2 : 0);

          let color = p.node;
          if (n.isStub) color = p.stub;
          else if (n.isSpecial) color = p.special;
          else if (n.isOrphan) color = p.orphan;

          // recent-update glow ring
          const updatedRecently =
            n.updatedAt && Date.parse(n.updatedAt) > recentThreshold;
          if (updatedRecently) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, radius + 4, 0, 2 * Math.PI);
            ctx.fillStyle = p.glow;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(n.x, n.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.globalAlpha = n.isStub || n.isOrphan ? 0.7 : 1;
          ctx.fill();
          ctx.globalAlpha = 1;

          // label
          const fontSize = Math.max(10 / scale, 2.5);
          ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
          ctx.fillStyle = n.isStub ? p.labelStub : p.label;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(n.title, n.x, n.y + radius + 1);
        }}
      />
    </div>
  );
}
