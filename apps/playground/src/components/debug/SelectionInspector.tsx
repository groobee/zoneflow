import React from "react";
import {
  findPathSourceZone,
  getPath,
  getZone,
  type PathId,
  type UniverseModel,
  type ZoneId,
} from "@zoneflow/core";
import { Card } from "../common/Card";
import { subsectionTitleStyle } from "./debug.styles";

type Props = {
  model: UniverseModel;
  zoneIds: ZoneId[];
  pathIds: PathId[];
};

const mutedStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--pg-panel-muted, #94a3b8)",
};

const entryStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
  padding: "8px 0",
  borderTop: "1px solid var(--pg-card-border, rgba(148, 163, 184, 0.18))",
};

const nameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--pg-panel-text, #e2e8f0)",
};

const tagStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--pg-panel-muted, #94a3b8)",
};

const idStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--pg-panel-muted, #94a3b8)",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

/**
 * 선택된 존/패스를 라이브러리의 onZoneSelectionChange / onPathSelectionChange
 * 로 받아 실제 모델에서 해석해 보여준다(고정 'Nothing selected' 대체).
 * zone/path 선택은 상호 배타라 보통 한쪽만 채워진다.
 */
export function SelectionInspector({ model, zoneIds, pathIds }: Props) {
  const zones = zoneIds
    .map((id) => getZone(model, id))
    .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone));

  const paths = pathIds
    .map((id) => {
      const sourceZone = findPathSourceZone(model, id);
      const path = sourceZone ? getPath(sourceZone, id) : undefined;
      return path && sourceZone ? { path, sourceZone } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const isEmpty = zones.length === 0 && paths.length === 0;

  return (
    <Card>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Selection</div>

      {isEmpty ? (
        <div style={mutedStyle}>Nothing selected</div>
      ) : (
        <div>
          {zones.length > 0 ? (
            <div>
              <div style={subsectionTitleStyle}>Zones · {zones.length}</div>
              {zones.map((zone) => (
                <div key={zone.id} style={entryStyle}>
                  <span style={nameStyle}>{zone.name || "(이름 없음)"}</span>
                  <span style={tagStyle}>
                    type: {zone.zoneType}
                    {zone.childZoneIds.length > 0
                      ? ` · 자식 ${zone.childZoneIds.length}`
                      : ""}
                  </span>
                  <span style={idStyle}>{shortId(zone.id)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {paths.length > 0 ? (
            <div>
              <div
                style={{
                  ...subsectionTitleStyle,
                  marginTop: zones.length > 0 ? 12 : 0,
                }}
              >
                Paths · {paths.length}
              </div>
              {paths.map(({ path, sourceZone }) => {
                const targetZone = path.target
                  ? getZone(model, path.target.zoneId)
                  : undefined;
                const targetLabel = targetZone
                  ? targetZone.name
                  : path.target
                    ? "(없는 존)"
                    : "— dangling";

                return (
                  <div key={path.id} style={entryStyle}>
                    <span style={nameStyle}>{path.name || "(이름 없음)"}</span>
                    <span style={tagStyle}>
                      rule: {path.rule ? path.rule.type : "— 미설정"}
                    </span>
                    <span style={tagStyle}>
                      {sourceZone.name} → {targetLabel}
                    </span>
                    <span style={idStyle}>{shortId(path.id)}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
