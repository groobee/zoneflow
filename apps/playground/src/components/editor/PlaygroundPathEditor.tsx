import React, { useMemo, useState } from "react";
import {
  updatePath,
  type PathId,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import { OverlayModal } from "../ui/OverlayModal";

function resolvePathSource(params: {
  model: UniverseModel;
  pathId: PathId;
}): { sourceZoneId: ZoneId; pathName: string } | null {
  const { model, pathId } = params;

  for (const zone of Object.values(model.zonesById)) {
    const path = zone.pathsById[pathId];
    if (!path) continue;

    return {
      sourceZoneId: zone.id,
      pathName: path.name,
    };
  }

  return null;
}

export function PlaygroundPathEditor(props: {
  model: UniverseModel;
  pathId: PathId;
  onModelChange: (nextModel: UniverseModel) => void;
  onClose: () => void;
}) {
  const { model, pathId, onModelChange, onClose } = props;
  const resolved = useMemo(
    () => resolvePathSource({ model, pathId }),
    [model, pathId]
  );

  const path = resolved
    ? model.zonesById[resolved.sourceZoneId]?.pathsById[pathId]
    : undefined;
  const [name, setName] = useState(path?.name ?? "");

  if (!resolved || !path) {
    return null;
  }

  return (
    <OverlayModal title={`Path Name · ${path.name}`} onClose={onClose} width={420}>
      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Path Name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "#111827",
              color: "#f8fafc",
              padding: "12px 14px",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "transparent",
              color: "#cbd5e1",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => {
              const nextModel = updatePath(model, resolved.sourceZoneId, pathId, {
                name: name.trim() || path.name,
              });

              onModelChange(nextModel);
              onClose();
            }}
            style={{
              border: "1px solid #2563eb",
              background: "#2563eb",
              color: "#eff6ff",
              borderRadius: 999,
              padding: "10px 14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            저장
          </button>
        </div>
      </div>
    </OverlayModal>
  );
}
