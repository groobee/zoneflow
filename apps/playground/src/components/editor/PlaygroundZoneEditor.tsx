import React, { useMemo, useState } from "react";
import {
  updateZone,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import type { ZoneEditorButtonRenderProps } from "@zoneflow/react";
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

export function PlaygroundZoneEditButton(props: ZoneEditorButtonRenderProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.openEditor();
      }}
      style={{
        border: "1px solid rgba(15, 23, 42, 0.16)",
        background: props.isEditing ? "#2563eb" : "rgba(255, 255, 255, 0.96)",
        color: props.isEditing ? "#eff6ff" : "#0f172a",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 700,
        boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)",
        cursor: "pointer",
      }}
    >
      {props.isEditing ? "편집중" : "설정"}
    </button>
  );
}

export function PlaygroundZoneEditor(props: {
  model: UniverseModel;
  zoneId: ZoneId;
  onModelChange: (nextModel: UniverseModel) => void;
  onClose: () => void;
}) {
  const { model, zoneId, onModelChange, onClose } = props;
  const zone = model.zonesById[zoneId];

  const initialActionPayload = useMemo(() => {
    return zone?.action?.payload
      ? JSON.stringify(zone.action.payload, null, 2)
      : "";
  }, [zone?.action?.payload]);

  const initialMeta = useMemo(() => {
    return zone?.meta
      ? JSON.stringify(zone.meta, null, 2)
      : "";
  }, [zone?.meta]);

  const [name, setName] = useState(zone?.name ?? "");
  const [zoneType, setZoneType] = useState(zone?.zoneType ?? "");
  const [actionType, setActionType] = useState(zone?.action?.type ?? "");
  const [actionPayloadText, setActionPayloadText] = useState(initialActionPayload);
  const [metaText, setMetaText] = useState(initialMeta);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!zone) {
    return null;
  }

  return (
    <OverlayModal title={`Zone Editor · ${zone.name}`} onClose={onClose} width={640}>
      <div
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Zone Name
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
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          }}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
              Zone Type
            </span>
            <input
              value={zoneType}
              onChange={(event) => setZoneType(event.target.value)}
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
              Action Type
            </span>
            <input
              value={actionType}
              onChange={(event) => setActionType(event.target.value)}
              placeholder="leave blank to clear action"
              style={{
                borderRadius: 12,
                border: "1px solid rgba(148, 163, 184, 0.2)",
                background: "#111827",
                color: "#f8fafc",
                padding: "12px 14px",
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Action Payload JSON
          </span>
          <textarea
            value={actionPayloadText}
            onChange={(event) => setActionPayloadText(event.target.value)}
            rows={8}
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

        <label style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
            Meta JSON
          </span>
          <textarea
            value={metaText}
            onChange={(event) => setMetaText(event.target.value)}
            rows={8}
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
                const actionPayload = parseOptionalJson(
                  "Action Payload",
                  actionPayloadText
                );
                const nextModel = updateZone(model, zone.id, {
                  name: name.trim() || zone.name,
                  zoneType: zoneType.trim() || zone.zoneType,
                  action: actionType.trim()
                    ? {
                        type: actionType.trim(),
                        payload: actionPayload,
                      }
                    : undefined,
                  meta,
                });

                onModelChange(nextModel);
                onClose();
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "알 수 없는 저장 오류가 발생했습니다."
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
