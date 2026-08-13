import { useMemo } from "react";

export type GraphNode = { id: string; label: string; level: string; platform: string | null };
export type GraphEdge = { source: string; target: string; type: string };

const RADIUS = 150;

export function NetworkGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((node, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      map.set(node.id, {
        x: 260 + Math.cos(angle) * RADIUS,
        y: 190 + Math.sin(angle) * RADIUS,
      });
    });
    return map;
  }, [nodes]);

  const color = (level: string) =>
    level === "critical"
      ? "var(--threat)"
      : level === "high"
        ? "var(--signal)"
        : level === "medium"
          ? "var(--muted-foreground)"
          : "var(--verified)";

  return (
    <svg viewBox="0 0 520 380" className="h-[380px] w-full">
      <defs>
        <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M 26 0 L 0 0 0 26" fill="none" stroke="var(--grid)" strokeWidth="0.5" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="520" height="380" fill="url(#grid)" />
      {edges.map((edge, i) => {
        const a = positions.get(edge.source);
        const b = positions.get(edge.target);
        if (!a || !b) return null;
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--border)"
              strokeWidth={1.5}
              strokeDasharray={edge.type === "funding" ? "4 3" : undefined}
            />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2 - 4}
              fill="var(--muted-foreground)"
              fontSize="8"
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {edge.type}
            </text>
          </g>
        );
      })}
      {nodes.map((node) => {
        const p = positions.get(node.id);
        if (!p) return null;
        const active = selectedId === node.id;
        return (
          <g
            key={node.id}
            transform={`translate(${p.x}, ${p.y})`}
            className="cursor-pointer"
            onClick={() => onSelect?.(node.id)}
          >
            <circle r={active ? 20 : 15} fill={color(node.level)} opacity={active ? 0.35 : 0.18} />
            <circle r={7} fill={color(node.level)} />
            <text
              y={30}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--font-mono)"
              fill="var(--foreground)"
            >
              {node.label}
            </text>
            <text
              y={42}
              textAnchor="middle"
              fontSize="8"
              fontFamily="var(--font-mono)"
              fill="var(--muted-foreground)"
            >
              {node.platform ?? "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
