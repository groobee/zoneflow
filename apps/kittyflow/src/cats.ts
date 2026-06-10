import {
  createUniverseLayoutModel,
  createZoneLayout,
  type Path,
  type UniverseLayoutModel,
  type UniverseModel,
  type Zone,
  type ZoneId,
} from "@zoneflow/core";

export const KITTYFLOW_UNIVERSE_ID = "kittyflow";

export type RelationKind = "friend" | "enemy" | "rival" | "crush";

export type CatRelation = {
  pathId: string;
  sourceCatId: ZoneId;
  targetCatId: ZoneId;
  kind: RelationKind;
  label: string;
  story: string;
};

export type CatProfile = {
  id: ZoneId;
  name: string;
  englishName: string;
  breed: string;
  age: string;
  color: string;
  personality: string;
  intro: string;
  likes: string[];
  /** 캔버스 존 안에 들어가는 3줄짜리 미니 얼굴 */
  miniFace: string;
  /** 정보창에 크게 보여주는 얼굴 */
  face: string;
};

export const RELATION_STYLE: Record<
  RelationKind,
  { label: string; color: string; symbol: string }
> = {
  friend: { label: "친구", color: "#16a34a", symbol: "o(^.^)o" },
  enemy: { label: "앙숙", color: "#dc2626", symbol: ">(-.-)<" },
  rival: { label: "라이벌", color: "#ea580c", symbol: "=(o.o)=" },
  crush: { label: "짝사랑", color: "#ec4899", symbol: "~(*.*)~" },
};

export const CATS: CatProfile[] = [
  {
    id: "nabi",
    name: "나비",
    englishName: "Nabi",
    breed: "코리안 숏헤어 (삼색)",
    age: "4살",
    color: "#d97706",
    personality: "당당한 골목 대장",
    intro: "이 골목의 평화는 내가 지킨다.",
    likes: ["옥상 순찰", "참치캔", "턱 긁어주기"],
    miniFace: ` /\\_/\\
( o.o )
 > ^ <`,
    face: `    /\\_/\\
   ( o.o )
    > ^ <
   /|   |\\
  (_|   |_)
    |___|`,
  },
  {
    id: "cheese",
    name: "치즈",
    englishName: "Cheese",
    breed: "치즈 태비",
    age: "2살",
    color: "#eab308",
    personality: "츄르에 진심인 먹보",
    intro: "츄르 앞에서는 모두가 평등하다냥.",
    likes: ["츄르", "두 번째 츄르", "낮잠 후 간식"],
    miniFace: ` /\\_/\\
( ^.^ )
 > w <`,
    face: `    /\\_/\\
   ( ^.^ )
    > w <
   /|   |\\
  (_|   |_)
    |___|`,
  },
  {
    id: "kkamang",
    name: "까망",
    englishName: "Kkamang",
    breed: "봄베이 (올블랙)",
    age: "5살",
    color: "#44403c",
    personality: "시크한 츤데레",
    intro: "관심 없다. ...간식은 두고 가라.",
    likes: ["높은 곳", "어둠 속 잠복", "혼자만의 시간"],
    miniFace: ` /\\_/\\
( -.- )
 > _ <`,
    face: `    /\\_/\\
   ( -.- )
    > _ <
   /|   |\\
  (_|   |_)
    |___|`,
  },
  {
    id: "kongi",
    name: "콩이",
    englishName: "Kongi",
    breed: "러시안 블루",
    age: "1살",
    color: "#0ea5e9",
    personality: "소심한 막내",
    intro: "저, 저는 그냥 지나가던 고양이인데요...",
    likes: ["상자 속", "깃털 장난감", "형아들 몰래 보기"],
    miniFace: ` /\\_/\\
( 0.0 )
 > . <`,
    face: `    /\\_/\\
   ( 0.0 )
    > . <
   /|   |\\
  (_|   |_)
    |___|`,
  },
  {
    id: "hodu",
    name: "호두",
    englishName: "Hodu",
    breed: "페르시안",
    age: "3살",
    color: "#8b5cf6",
    personality: "낮잠이 인생인 몽글이",
    intro: "햇볕... 좋다... 쿨쿨...",
    likes: ["햇볕 명당", "쿠션", "16시간 수면"],
    miniFace: ` /\\_/\\
( =.= )
 > v <`,
    face: `    /\\_/\\
   ( =.= )
    > v <
   /|   |\\
  (_|   |_)
    |___|`,
  },
];

export const CATS_BY_ID: Record<ZoneId, CatProfile> = Object.fromEntries(
  CATS.map((cat) => [cat.id, cat])
);

export const RELATIONS: CatRelation[] = [
  {
    pathId: "nabi-cheese",
    sourceCatId: "nabi",
    targetCatId: "cheese",
    kind: "friend",
    label: "절친",
    story: "참치캔을 반씩 나눠 먹은 뒤로 둘도 없는 사이.",
  },
  {
    pathId: "cheese-kongi",
    sourceCatId: "cheese",
    targetCatId: "kongi",
    kind: "friend",
    label: "친구",
    story: "츄르를 처음 나눠준 상대. 콩이는 아직도 그날을 기억한다.",
  },
  {
    pathId: "nabi-kkamang",
    sourceCatId: "nabi",
    targetCatId: "kkamang",
    kind: "enemy",
    label: "앙숙",
    story: "옥상 명당을 두고 3년째 영역 다툼 중.",
  },
  {
    pathId: "kkamang-kongi",
    sourceCatId: "kkamang",
    targetCatId: "kongi",
    kind: "rival",
    label: "라이벌",
    story: "캣타워 1층 자리를 두고 매일 눈치 싸움을 벌인다.",
  },
  {
    pathId: "kongi-hodu",
    sourceCatId: "kongi",
    targetCatId: "hodu",
    kind: "crush",
    label: "짝사랑",
    story: "낮잠 자는 호두를 상자 뒤에서 몰래 지켜본다.",
  },
  {
    pathId: "hodu-nabi",
    sourceCatId: "hodu",
    targetCatId: "nabi",
    kind: "friend",
    label: "친구",
    story: "햇볕 명당을 양보해 준 의리의 은인.",
  },
  {
    pathId: "kkamang-hodu",
    sourceCatId: "kkamang",
    targetCatId: "hodu",
    kind: "enemy",
    label: "앙숙",
    story: "자고 있는 호두의 꼬리를 밟은 사건 이후 냉전 중.",
  },
];

export function getRelationsOf(catId: ZoneId): {
  outgoing: CatRelation[];
  incoming: CatRelation[];
} {
  return {
    outgoing: RELATIONS.filter((relation) => relation.sourceCatId === catId),
    incoming: RELATIONS.filter((relation) => relation.targetCatId === catId),
  };
}

function buildCatZone(cat: CatProfile): Zone {
  const relations = RELATIONS.filter(
    (relation) => relation.sourceCatId === cat.id
  );

  return {
    id: cat.id,
    parentZoneId: null,
    name: cat.name,
    zoneType: "action",
    childZoneIds: [],
    pathIds: relations.map((relation) => relation.pathId),
    pathsById: Object.fromEntries(
      relations.map((relation): [string, Path] => [
        relation.pathId,
        {
          id: relation.pathId,
          key: relation.kind,
          name: relation.label,
          target: {
            universeId: KITTYFLOW_UNIVERSE_ID,
            zoneId: relation.targetCatId,
          },
          rule: {
            type: "relation",
            payload: {
              kind: relation.kind,
            },
          },
          meta: {
            kind: relation.kind,
            color: RELATION_STYLE[relation.kind].color,
            story: relation.story,
          },
        },
      ])
    ),
    meta: {
      color: cat.color,
    },
  };
}

export const kittyflowModel: UniverseModel = {
  version: "2.0.0",
  universeId: KITTYFLOW_UNIVERSE_ID,
  meta: {
    name: "Kittyflow — 골목 고양이 관계도",
  },
  rootZoneIds: CATS.map((cat) => cat.id),
  zonesById: Object.fromEntries(CATS.map((cat) => [cat.id, buildCatZone(cat)])),
};

export const kittyflowLayoutModel: UniverseLayoutModel =
  createUniverseLayoutModel({
    universeId: KITTYFLOW_UNIVERSE_ID,
    version: kittyflowModel.version,
    zoneLayoutsById: {
      nabi: createZoneLayout({ x: 470, y: 48, width: 220, height: 168 }),
      cheese: createZoneLayout({ x: 880, y: 250, width: 220, height: 168 }),
      kongi: createZoneLayout({ x: 720, y: 560, width: 220, height: 168 }),
      kkamang: createZoneLayout({ x: 220, y: 560, width: 220, height: 168 }),
      hodu: createZoneLayout({ x: 60, y: 250, width: 220, height: 168 }),
    },
    pathLayoutsById: {
      "nabi-cheese": { routeOffset: { x: 24, y: -32 } },
      "cheese-kongi": { routeOffset: { x: 36, y: 0 } },
      "nabi-kkamang": { routeOffset: { x: -56, y: 72 } },
      "kkamang-kongi": { routeOffset: { x: 24, y: 56 } },
      "kongi-hodu": { routeOffset: { x: 0, y: 52 } },
      "hodu-nabi": { routeOffset: { x: 30, y: -105 } },
      "kkamang-hodu": { routeOffset: { x: -80, y: -150 } },
    },
  });
