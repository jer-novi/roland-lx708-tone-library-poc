"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useEffect, useMemo } from "react";
import { fetchHsTree } from "@/lib/api";
import type { HsInstrument, HsNode, HsTreeResponse } from "@/lib/types";
import "@xyflow/react/dist/style.css";

/**
 * Volledige Hornbostel-Sachs taxonomie (~350 nodes) als horizontaal
 * uitvloeiende boom-grafiek. Wordt geopend vanuit de detail-modal via
 * "Bekijk hele taxonomy". De frontend fetched de tree eenmaal en cachet
 * 'm lokaal; de browser houdt de response ook in z'n eigen cache.
 */

const FAMILY_W = 200;
const SUB_W = 180;
const INSTRUMENT_W = 160;
const ROW_H = 50;
const GAP_X = 60;
const GAP_Y = 12;

interface FamilyData extends Record<string, unknown> {
  name: string;
  hsCode: string;
  count: number;
  isFamily: true;
}
interface SubData extends Record<string, unknown> {
  name: string;
  hsCode: string;
  count?: number;
  isFamily: false;
  isInstrument: false;
}
interface InstrData extends Record<string, unknown> {
  name: string;
  hsCode: string;
  detailUrl?: string;
  isFamily: false;
  isInstrument: true;
}

function FamilyNode({ data }: NodeProps<Node<FamilyData>>) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 shadow-sm"
      style={{ width: FAMILY_W, minHeight: ROW_H }}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
        {data.hsCode} · family
      </span>
      <span className="truncate text-sm font-semibold text-foreground">
        {data.name}
      </span>
      <span className="text-[11px] text-muted">{data.count} instruments</span>
      <Handle type="source" position={Position.Right} className="!bg-accent" />
    </div>
  );
}

function SubNode({ data }: NodeProps<Node<SubData>>) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg border border-border-soft bg-surface px-3 py-2 shadow-sm"
      style={{ width: SUB_W, minHeight: ROW_H }}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
        {data.hsCode}
      </span>
      <span className="truncate text-xs font-medium text-foreground">
        {data.name}
      </span>
      <Handle type="target" position={Position.Left} className="!bg-border-soft" />
      <Handle type="source" position={Position.Right} className="!bg-border-soft" />
    </div>
  );
}

function InstrumentNode({ data }: NodeProps<Node<InstrData>>) {
  const Wrapper = data.detailUrl ? "a" : "div";
  return (
    <Wrapper
      href={data.detailUrl}
      target={data.detailUrl ? "_blank" : undefined}
      rel={data.detailUrl ? "noreferrer" : undefined}
      className="flex items-center gap-2 rounded-md border border-border-soft/60 bg-surface-raised px-2 py-1 text-[11px] text-foreground shadow-sm hover:border-accent/50"
      style={{ width: INSTRUMENT_W, minHeight: 32 }}
    >
      <span className="font-mono text-[9px] text-muted">{data.hsCode}</span>
      <span className="truncate" title={data.name}>
        {data.name}
      </span>
      <Handle type="target" position={Position.Left} className="!bg-border-soft" />
    </Wrapper>
  );
}

const nodeTypes = {
  hsFamily: FamilyNode,
  hsSub: SubNode,
  hsInstrument: InstrumentNode,
};

/**
 * Flatten de recursieve HS-tree tot een lijst React Flow nodes + edges
 * met een eenvoudige tree-layout. Families liggen op kolom 0, hun
 * sub-families op kolom 1, instruments op kolom 2+.
 */
function buildGraph(tree: HsTreeResponse) {
  const nodes: Node<FamilyData | SubData | InstrData>[] = [];
  const edges: Edge[] = [];
  const colCounts: Record<number, number> = {}; // count per column for vertical positioning

  function placeInstrument(parentId: string, inst: HsInstrument, column: number) {
    const id = `${parentId}/${inst.hs_code}/${inst.instrument_id ?? inst.name}`;
    const yRow = (colCounts[column] ?? 0);
    colCounts[column] = yRow + 1;
    const x = column * (INSTRUMENT_W + GAP_X);
    const y = yRow * (32 + GAP_Y);
    nodes.push({
      id,
      type: "hsInstrument",
      position: { x, y },
      data: {
        name: inst.name,
        hsCode: inst.hs_code,
        detailUrl: inst.detail_url,
        isFamily: false,
        isInstrument: true,
      },
    });
    edges.push({
      id: `${parentId}->${id}`,
      source: parentId,
      target: id,
      type: "smoothstep",
      style: { stroke: "#3a3024", strokeWidth: 0.75 },
    });
  }

  function placeFamily(family: HsNode) {
    const id = `F-${family.hs_code}`;
    // Plaats family: x=0, y = eerdere familie's eind
    const yRow = (colCounts[0] ?? 0);
    colCounts[0] = yRow + 1;
    nodes.push({
      id,
      type: "hsFamily",
      position: { x: 0, y: yRow * (ROW_H + GAP_Y * 2) },
      data: {
        name: family.name,
        hsCode: family.hs_code,
        count: family.instrument_count ?? 0,
        isFamily: true,
      },
    });
    // Subs (column 1)
    (family.subfamilies ?? []).forEach((sub) => {
      const subId = `S-${family.hs_code}-${sub.hs_code}`;
      const subYRow = (colCounts[1] ?? 0);
      colCounts[1] = subYRow + 1;
      const subX = GAP_X + FAMILY_W;
      const subY = subYRow * (ROW_H + GAP_Y);
      nodes.push({
        id: subId,
        type: "hsSub",
        position: { x: subX, y: subY },
        data: {
          name: sub.name,
          hsCode: sub.hs_code,
          isFamily: false,
          isInstrument: false,
        },
      });
      edges.push({
        id: `${id}->${subId}`,
        source: id,
        target: subId,
        type: "smoothstep",
        style: { stroke: "#9c917f", strokeWidth: 1.25 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#9c917f" },
      });
      // Direct instruments of deze sub (column 2)
      (sub.instruments ?? []).forEach((inst) =>
        placeInstrument(subId, inst, 2)
      );
      // Sub-sub families (column 2-3)
      (sub.subfamilies ?? []).forEach((subsub) => {
        const subsubId = `S2-${family.hs_code}-${sub.hs_code}-${subsub.hs_code}`;
        const subsubYRow = (colCounts[2] ?? 0);
        colCounts[2] = subsubYRow + 1;
        const subsubX = 2 * (INSTRUMENT_W + GAP_X);
        nodes.push({
          id: subsubId,
          type: "hsSub",
          position: { x: subsubX, y: subsubYRow * (ROW_H + GAP_Y) },
          data: {
            name: subsub.name,
            hsCode: subsub.hs_code,
            isFamily: false,
            isInstrument: false,
          },
        });
        edges.push({
          id: `${subId}->${subsubId}`,
          source: subId,
          target: subsubId,
          type: "smoothstep",
          style: { stroke: "#9c917f", strokeWidth: 1 },
        });
        (subsub.instruments ?? []).forEach((inst) =>
          placeInstrument(subsubId, inst, 3)
        );
      });
    });
    // Direct instruments of family (column 1, parallel to subs)
    (family.instruments ?? []).forEach((inst) => placeInstrument(id, inst, 1));
  }

  tree.families.forEach(placeFamily);
  return { nodes, edges };
}

function FullTreeInner() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["hs-tree"],
    queryFn: fetchHsTree,
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });

  const built = useMemo(() => (data ? buildGraph(data) : null), [data]);
  const [nodes, , onNodesChange] = useNodesState<Node<FamilyData | SubData | InstrData>>(
    built?.nodes ?? []
  );
  const [edges, , onEdgesChange] = useEdgesState<Edge>(built?.edges ?? []);

  useEffect(() => {
    if (built) {
      onNodesChange(
        built.nodes.map((n) => ({ id: n.id, type: "position", position: n.position }))
      );
    }
  }, [built, onNodesChange]);

  if (isLoading) {
    return (
      <p className="p-8 text-center text-sm text-muted">
        Volledige HS-taxonomie laden (~350 nodes)…
      </p>
    );
  }
  if (isError || !data) {
    return (
      <p className="p-8 text-center text-sm text-muted">
        HS-tree niet beschikbaar.
      </p>
    );
  }

  return (
    <div className="h-[70vh] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#2c251c" />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!bg-surface !border-border-soft"
        />
      </ReactFlow>
    </div>
  );
}

export function HornbostelSachsTreeFull() {
  return (
    <ReactFlowProvider>
      <FullTreeInner />
    </ReactFlowProvider>
  );
}
