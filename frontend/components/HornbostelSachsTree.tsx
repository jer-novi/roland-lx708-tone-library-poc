"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMemo } from "react";
import { fetchHsPath, fetchHsTree } from "@/lib/api";
import type { HsNode, HsPathResponse, HsTreeResponse } from "@/lib/types";
import "@xyflow/react/dist/style.css";

/**
 * Kleine boom-grafiek (3-4 nodes) van root-family tot leaf voor de
 * huidige tone. Gebruikt React Flow met een verticale layout.
 *
 * <p>Voor de volledige 350-node boom zie {@link HornbostelSachsTreeFull}.
 */

const NODE_WIDTH = 220;
const NODE_HEIGHT = 56;
const GAP_X = 40;
const GAP_Y = 24;

interface PathNodeData extends Record<string, unknown> {
  code: string;
  name: string;
  isLeaf: boolean;
  isCurrent: boolean;
}

function HsPathNode({ data }: NodeProps<Node<PathNodeData>>) {
  const tone = data.isCurrent
    ? "border-accent/70 bg-accent-soft text-foreground"
    : "border-border-soft bg-surface text-foreground";
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left shadow-sm ${tone}`}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
        HS {data.code}
      </span>
      <span className="truncate text-sm font-medium">{data.name || data.code}</span>
      <Handle type="target" position={Position.Left} className="!bg-border-soft" />
      <Handle type="source" position={Position.Right} className="!bg-border-soft" />
    </div>
  );
}

const nodeTypes = { hsPath: HsPathNode };

function buildSmallTree(path: HsPathResponse) {
  const nodes: Node<PathNodeData>[] = [];
  const edges: Edge[] = [];
  path.path.forEach((p, i) => {
    const x = i * (NODE_WIDTH + GAP_X);
    const y = 0;
    nodes.push({
      id: p.code || `idx-${i}`,
      type: "hsPath",
      position: { x, y },
      data: {
        code: p.code,
        name: p.name,
        isLeaf: i === path.path.length - 1,
        isCurrent: i === path.path.length - 1,
      },
    });
    if (i > 0) {
      const prev = path.path[i - 1];
      edges.push({
        id: `${prev.code}->${p.code}`,
        source: prev.code || `idx-${i - 1}`,
        target: p.code || `idx-${i}`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#9c917f" },
        style: { stroke: "#9c917f", strokeWidth: 1.5 },
      });
    }
  });
  return { nodes, edges };
}

function SmallHsTree({ toneId }: { toneId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hs-path", toneId],
    queryFn: () => fetchHsPath(toneId),
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    return buildSmallTree(data);
  }, [data]);

  if (isLoading) {
    return (
      <p className="animate-pulse text-xs text-muted">HS-taxonomie laden…</p>
    );
  }
  if (isError || !data) {
    return (
      <p className="text-xs text-muted">
        HS-taxonomie niet beschikbaar voor deze tone.
      </p>
    );
  }
  if (nodes.length === 0) {
    return (
      <p className="text-xs text-muted">
        Geen HS-mapping voor deze tone (GM2 default-categorie).
      </p>
    );
  }

  return (
    <div
      className="rounded-lg border border-border-soft bg-background/50 p-2"
      style={{ height: 90 + NODE_HEIGHT }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnDrag={false}
        panOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="#2c251c" />
      </ReactFlow>
    </div>
  );
}

export function HornbostelSachsTree({ toneId }: { toneId: number }) {
  // ReactFlowProvider is nodig zodat we in een parent-context kunnen renderen;
  // in een modal werkt useReactFlow zonder provider niet.
  return (
    <ReactFlowProvider>
      <SmallHsTree toneId={toneId} />
    </ReactFlowProvider>
  );
}
