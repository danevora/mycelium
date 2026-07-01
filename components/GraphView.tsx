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

export default function GraphView({ graph, wikiId }: { graph: Graph; wikiId: string }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [palette, setPalette] = useState<Palette | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Current zoom level (k), used for Obsidian-style level-of-detail: hubs show
  // when zoomed out, smaller/leaf nodes + labels reveal as you zoom in.
  const [zoom, setZoom] = useState(1);

  // id -> node, for resolving neighbor titles/stub state.
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph],
  );

  // Adjacency derived from links, split by direction so the panel can show
  // "links to" vs "linked from".
  const adjacency = useMemo(() => {
    const out = new Map<string, Set<string>>();
    const inc = new Map<string, Set<string>>();
    const add = (m: Map<string, Set<string>>, k: string, v: string) => {
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(v);
    };
    for (const l of graph.links) {
      const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      add(out, s, t);
      add(inc, t, s);
    }
    return { out, inc };
  }, [graph]);

  // Total connection count per node (in + out), the "importance" used to decide
  // what survives at low zoom.
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const n of graph.nodes) {
      d.set(
        n.id,
        (adjacency.out.get(n.id)?.size ?? 0) + (adjacency.inc.get(n.id)?.size ?? 0),
      );
    }
    return d;
  }, [graph, adjacency]);

  // Spread nodes out so they don't crowd/overlap. Repulsion scales with the
  // node count, and link distance grows slightly, so the layout stays legible
  // as the wiki gets bigger. The graph instance arrives async (dynamic import),
  // so retry via rAF for a short window until the ref is populated.
  useEffect(() => {
    let raf = 0;
    let tries = 0;
    const apply = () => {
      const fg = fgRef.current;
      if (!fg) {
        if (tries++ < 120) raf = requestAnimationFrame(apply);
        return;
      }
      const n = graph.nodes.length;
      fg.d3Force("charge")?.strength(-120 - Math.min(n * 6, 600)).distanceMax(600);
      fg.d3Force("link")?.distance(60 + Math.min(n, 40)).strength(0.3);
      fg.d3ReheatSimulation?.();
    };
    apply();
    return () => cancelAnimationFrame(raf);
  }, [graph]);

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

  const selectedNode = selected ? nodeById.get(selected) ?? null : null;
  const outgoing = selected ? [...(adjacency.out.get(selected) ?? [])] : [];
  const incoming = selected ? [...(adjacency.inc.get(selected) ?? [])] : [];

  const open = (slug: string) => {
    const node = nodeById.get(slug);
    if (node?.isStub) return; // stub has no page to open
    router.push(`/w/${wikiId}/wiki/${slug}`);
  };

  // Level-of-detail: the more zoomed out, the higher the connection count a
  // node needs to stay on screen. A selected node and its neighbors always show
  // so the side panel stays coherent.
  const minDegree = zoom < 0.4 ? 3 : zoom < 0.8 ? 2 : zoom < 1.3 ? 1 : 0;
  const nodeVisible = (id: string) => {
    if (id === selected) return true;
    if (selected && (adjacency.out.get(selected)?.has(id) || adjacency.inc.get(selected)?.has(id)))
      return true;
    return (degree.get(id) ?? 0) >= minDegree;
  };
  const linkId = (end: string | GraphNode) =>
    typeof end === "string" ? end : end.id;

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-xl border border-edge bg-sunken"
    >
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={size.width}
        height={size.height}
        backgroundColor={p.bg}
        linkColor={() => p.link}
        linkDirectionalParticles={0}
        cooldownTicks={200}
        d3VelocityDecay={0.25}
        onZoom={(t: { k: number }) =>
          setZoom((z) => (Math.abs(z - t.k) > 0.03 ? t.k : z))
        }
        nodeVisibility={(node: object) => nodeVisible((node as GraphNode).id)}
        linkVisibility={(link: object) => {
          const l = link as { source: string | GraphNode; target: string | GraphNode };
          return nodeVisible(linkId(l.source)) && nodeVisible(linkId(l.target));
        }}
        onNodeClick={(node: object) => {
          const n = node as GraphNode;
          setSelected(n.id);
        }}
        onBackgroundClick={() => setSelected(null)}
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

          // label — only when zoomed in enough, or for hubs / the selected node,
          // so the canvas isn't a wall of text when zoomed out.
          const deg = degree.get(n.id) ?? 0;
          const showLabel = scale >= 1.1 || deg >= 4 || n.id === selected;
          if (showLabel) {
            const fontSize = Math.max(10 / scale, 2.5);
            ctx.font = `${fontSize}px ui-sans-serif, system-ui`;
            ctx.fillStyle = n.isStub ? p.labelStub : p.label;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(n.title, n.x, n.y + radius + 1);
          }
        }}
      />

      {selectedNode && (
        <div className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-edge bg-bg/95 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2 border-b border-edge p-4">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-fg">
                {selectedNode.title}
              </h2>
              {selectedNode.isStub ? (
                <p className="mt-0.5 text-xs text-faint">Stub — no page yet</p>
              ) : (
                <button
                  onClick={() => open(selectedNode.id)}
                  className="mt-1 text-xs font-medium text-lav hover:text-lav-light"
                >
                  Open page →
                </button>
              )}
            </div>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="shrink-0 rounded p-1 text-faint hover:text-fg"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {outgoing.length === 0 && incoming.length === 0 ? (
              <p className="text-xs text-faint">No connected pages.</p>
            ) : (
              <>
                <NeighborList label="Links to" slugs={outgoing} nodeById={nodeById} onOpen={open} />
                <NeighborList label="Linked from" slugs={incoming} nodeById={nodeById} onOpen={open} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NeighborList({
  label,
  slugs,
  nodeById,
  onOpen,
}: {
  label: string;
  slugs: string[];
  nodeById: Map<string, GraphNode>;
  onOpen: (slug: string) => void;
}) {
  if (slugs.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        {label}
      </h3>
      <ul className="space-y-0.5">
        {slugs.map((slug) => {
          const node = nodeById.get(slug);
          const title = node?.title ?? slug;
          const isStub = node?.isStub ?? true;
          return (
            <li key={slug}>
              <button
                onClick={() => onOpen(slug)}
                disabled={isStub}
                className={
                  isStub
                    ? "w-full truncate rounded px-2 py-1 text-left text-sm text-faint"
                    : "w-full truncate rounded px-2 py-1 text-left text-sm text-muted hover:bg-sunken hover:text-fg"
                }
                title={isStub ? `${title} (stub)` : title}
              >
                {title}
                {isStub && <span className="ml-1 text-xs text-faint">(stub)</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
