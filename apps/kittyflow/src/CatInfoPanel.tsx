import type { CSSProperties } from "react";
import {
  CATS_BY_ID,
  getRelationsOf,
  RELATION_STYLE,
  type CatRelation,
} from "./cats";

const sans = "'IBM Plex Sans', 'Pretendard', sans-serif";
const mono = "'IBM Plex Mono', 'SFMono-Regular', monospace";

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  borderRadius: 20,
  border: "1px solid rgba(120, 86, 35, 0.18)",
  background: "#fffdf7",
  boxShadow: "0 22px 54px rgba(120, 72, 15, 0.10)",
};

const sectionTitleStyle: CSSProperties = {
  fontFamily: sans,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.1em",
  color: "#a16207",
};

const SLEEPING_CAT = `      |\\      _,,,---,,_
ZZZzz /,\`.-'\`'    -.  ;-;;,_
     |,4-  ) )-,_. ,\\ (  \`'-'
    '---''(_/--'  \`-'\\_)`;

function RelationRow(props: {
  relation: CatRelation;
  /** 패널 주인 기준 — outgoing 이면 상대는 target, incoming 이면 source */
  direction: "outgoing" | "incoming";
  onSelectCat: (catId: string) => void;
}) {
  const { relation, direction, onSelectCat } = props;
  const otherCatId =
    direction === "outgoing" ? relation.targetCatId : relation.sourceCatId;
  const otherCat = CATS_BY_ID[otherCatId];
  const style = RELATION_STYLE[relation.kind];

  if (!otherCat) return null;

  return (
    <button
      type="button"
      onClick={() => onSelectCat(otherCat.id)}
      style={{
        appearance: "none",
        display: "grid",
        gap: 4,
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(120, 86, 35, 0.14)",
        background: "#ffffff",
        cursor: "pointer",
        minWidth: 0,
      }}
      title={`${otherCat.name} 프로필 보기`}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: style.color,
            flex: "none",
          }}
        />
        <span
          style={{
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 800,
            color: "#1c1917",
            whiteSpace: "nowrap",
          }}
        >
          {direction === "outgoing" ? "→" : "←"} {otherCat.name}
        </span>
        <span
          style={{
            marginLeft: "auto",
            padding: "2px 8px",
            borderRadius: 999,
            background: `${style.color}1a`,
            color: style.color,
            fontFamily: sans,
            fontSize: 10,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {relation.label}
        </span>
      </span>
      <span
        style={{
          fontFamily: sans,
          fontSize: 11,
          lineHeight: 1.5,
          color: "#78716c",
        }}
      >
        {relation.story}
      </span>
    </button>
  );
}

export function CatInfoPanel(props: {
  selectedCatId: string | null;
  onSelectCat: (catId: string) => void;
}) {
  const { selectedCatId, onSelectCat } = props;
  const cat = selectedCatId ? CATS_BY_ID[selectedCatId] : null;

  if (!cat) {
    return (
      <aside style={panelStyle}>
        <div
          style={{
            flex: 1,
            display: "grid",
            placeContent: "center",
            justifyItems: "center",
            gap: 16,
            padding: 24,
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: mono,
              fontSize: 11,
              lineHeight: 1.4,
              color: "#a8a29e",
            }}
          >
            {SLEEPING_CAT}
          </pre>
          <div
            style={{
              fontFamily: sans,
              fontSize: 13,
              fontWeight: 700,
              color: "#78716c",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            아직 아무도 안 깨웠어요.
            <br />
            캔버스에서 고양이 존을 클릭해 보세요!
          </div>
        </div>
      </aside>
    );
  }

  const { outgoing, incoming } = getRelationsOf(cat.id);

  return (
    <aside style={panelStyle}>
      <div
        style={{
          padding: "20px 20px 16px",
          display: "grid",
          justifyItems: "center",
          gap: 10,
          background: `linear-gradient(180deg, ${cat.color}22, transparent)`,
          borderBottom: "1px solid rgba(120, 86, 35, 0.12)",
        }}
      >
        <pre
          style={{
            margin: 0,
            fontFamily: mono,
            fontSize: 14,
            lineHeight: 1.3,
            fontWeight: 700,
            color: cat.color,
          }}
        >
          {cat.face}
        </pre>
        <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 18,
              fontWeight: 900,
              color: "#1c1917",
            }}
          >
            {cat.name}
            <span
              style={{
                marginLeft: 6,
                fontSize: 12,
                fontWeight: 700,
                color: "#a8a29e",
              }}
            >
              {cat.englishName}
            </span>
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 12,
              fontWeight: 700,
              color: "#78716c",
            }}
          >
            {cat.breed} · {cat.age} · {cat.personality}
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          display: "grid",
          alignContent: "start",
          gap: 16,
          padding: 20,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: `${cat.color}14`,
            fontFamily: sans,
            fontSize: 13,
            lineHeight: 1.6,
            fontWeight: 600,
            color: "#44403c",
          }}
        >
          "{cat.intro}"
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={sectionTitleStyle}>좋아하는 것</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cat.likes.map((item) => (
              <span
                key={item}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(120, 86, 35, 0.16)",
                  background: "#ffffff",
                  fontFamily: sans,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#57534e",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={sectionTitleStyle}>
            {cat.name}가 생각하는 관계 ({outgoing.length})
          </div>
          {outgoing.length > 0 ? (
            outgoing.map((relation) => (
              <RelationRow
                key={relation.pathId}
                relation={relation}
                direction="outgoing"
                onSelectCat={onSelectCat}
              />
            ))
          ) : (
            <div
              style={{
                fontFamily: sans,
                fontSize: 12,
                color: "#a8a29e",
              }}
            >
              아직 마음을 연 상대가 없어요.
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={sectionTitleStyle}>
            {cat.name}를 향한 마음 ({incoming.length})
          </div>
          {incoming.length > 0 ? (
            incoming.map((relation) => (
              <RelationRow
                key={relation.pathId}
                relation={relation}
                direction="incoming"
                onSelectCat={onSelectCat}
              />
            ))
          ) : (
            <div
              style={{
                fontFamily: sans,
                fontSize: 12,
                color: "#a8a29e",
              }}
            >
              아직 이 고양이를 지목한 상대가 없어요.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
