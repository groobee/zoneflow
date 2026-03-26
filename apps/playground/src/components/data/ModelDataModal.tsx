import React, { useMemo, useState } from "react";
import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";
import { OverlayModal } from "../ui/OverlayModal";

type TabKey = "model" | "layout" | "bundle";

type Props = {
  model: UniverseModel;
  layoutModel: UniverseLayoutModel;
  onClose: () => void;
};

const tabButtonStyle: React.CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.2)",
  background: "transparent",
  color: "#cbd5e1",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

export function ModelDataModal({
  model,
  layoutModel,
  onClose,
}: Props) {
  const [tab, setTab] = useState<TabKey>("bundle");

  const payload = useMemo(() => {
    if (tab === "model") {
      return JSON.stringify(model, null, 2);
    }

    if (tab === "layout") {
      return JSON.stringify(layoutModel, null, 2);
    }

    return JSON.stringify(
      {
        model,
        layoutModel,
      },
      null,
      2
    );
  }, [layoutModel, model, tab]);

  return (
    <OverlayModal title="Current Draft Data" onClose={onClose} width={900}>
      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {(["bundle", "model", "layout"] as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                ...tabButtonStyle,
                background: tab === key ? "#2563eb" : "transparent",
                borderColor: tab === key ? "#2563eb" : "rgba(148, 163, 184, 0.2)",
                color: tab === key ? "#eff6ff" : "#cbd5e1",
              }}
            >
              {key === "bundle"
                ? "Model + Layout"
                : key === "model"
                  ? "Model"
                  : "Layout"}
            </button>
          ))}
        </div>

        <pre
          style={{
            margin: 0,
            padding: 16,
            borderRadius: 16,
            background: "#020617",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            color: "#e2e8f0",
            overflow: "auto",
            maxHeight: "calc(100vh - 240px)",
            fontSize: 12,
            lineHeight: 1.5,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {payload}
        </pre>
      </div>
    </OverlayModal>
  );
}
