import React, { useMemo, useState } from "react";
import {
  updatePath,
  type PathId,
  type PathRule,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import { OverlayModal } from "../ui/OverlayModal";

function parseOptionalJson(label: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`${label} JSON 형식이 올바르지 않습니다.`);
  }
}

type PathTypeOption = {
  value: string;
  label: string;
};

const EMPTY_RULE = "__empty__";

function getPathTypeOptions(sourceZoneType?: string): PathTypeOption[] {
  if (sourceZoneType === "container") {
    return [
      { value: EMPTY_RULE, label: "Empty" },
      { value: "event", label: "Event" },
      { value: "timeout", label: "Timeout" },
      { value: "segment", label: "Segment" },
    ];
  }

  return [
    { value: EMPTY_RULE, label: "Empty" },
    { value: "next", label: "Next" },
    { value: "success", label: "Success" },
    { value: "failure", label: "Failure" },
    { value: "wait", label: "Wait" },
  ];
}

function createRuleFromType(type: string): PathRule | null {
  if (type === EMPTY_RULE) return null;

  return {
    type,
    payload: {},
  };
}

export function PlaygroundPathEditor(props: {
  model: UniverseModel;
  pathId: PathId;
  sourceZoneId: ZoneId;
  onModelChange: (nextModel: UniverseModel) => void;
  onClose: () => void;
}) {
  const { model, pathId, sourceZoneId, onModelChange, onClose } = props;
  const sourceZone = model.zonesById[sourceZoneId];
  const path = sourceZone?.pathsById[pathId];
  const typeOptions = useMemo(
    () => getPathTypeOptions(sourceZone?.zoneType),
    [sourceZone?.zoneType]
  );
  const [name, setName] = useState(path?.name ?? "");
  const [type, setType] = useState(path?.rule?.type ?? EMPTY_RULE);
  const initialMeta = useMemo(
    () => (path?.meta ? JSON.stringify(path.meta, null, 2) : ""),
    [path?.meta]
  );
  const [metaText, setMetaText] = useState(initialMeta);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!sourceZone || !path) {
    return null;
  }

  const displayName = path.name.trim() || "Empty";

  return (
    <OverlayModal
      title={`Path Editor · ${displayName}`}
      onClose={onClose}
      width={440}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Source Zone
          </span>
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.16)",
              background: "#0f172a",
              color: "#e2e8f0",
              padding: "12px 14px",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {sourceZone.name}
          </div>
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Path Type
          </span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "#111827",
              color: "#f8fafc",
              padding: "12px 14px",
            }}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

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

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Meta JSON
          </span>
          <textarea
            value={metaText}
            onChange={(event) => setMetaText(event.target.value)}
            rows={6}
            placeholder={'{\n  "color": "#ec4899"\n}'}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(148, 163, 184, 0.2)",
              background: "#111827",
              color: "#f8fafc",
              padding: "12px 14px",
              resize: "vertical",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
        </label>

        {errorMessage ? (
          <div
            style={{
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.28)",
              color: "#fecaca",
              padding: "12px 14px",
              fontSize: 12,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

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
              try {
                const meta = parseOptionalJson("Meta", metaText);
                const selectedType =
                  typeOptions.find((option) => option.value === type)?.label ?? "Empty";
                const nextModel = updatePath(model, sourceZoneId, pathId, {
                  name: name.trim() || selectedType,
                  rule: createRuleFromType(type),
                  meta,
                });

                onModelChange(nextModel);
                onClose();
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "저장 중 오류가 발생했습니다."
                );
              }
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
