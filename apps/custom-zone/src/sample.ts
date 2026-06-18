import {
  createUniverseLayoutModel,
  createZoneLayout,
  type UniverseLayoutModel,
  type UniverseModel,
} from "@zoneflow/core";

/**
 * 의미 있는 `zoneType`(trigger / send / branch / wait / exit)을 가진 단순한
 * 플로우. 모두 root-level leaf 존이라 좌표가 절대값이라 읽기 쉽다. CustomZoneCard
 * 가 이 zoneType 으로 아이콘·색·라벨을 분기해 카드를 통째로 그린다.
 */
export const customModel: UniverseModel = {
  version: "2.0.0",
  universeId: "custom-zone-demo",
  meta: { name: "Custom Zone Rendering" },
  rootZoneIds: ["signup", "welcome", "opened", "reminder", "done"],
  zonesById: {
    signup: {
      id: "signup",
      parentZoneId: null,
      name: "신규 가입",
      zoneType: "trigger",
      inputDisabled: true,
      childZoneIds: [],
      pathIds: ["signup-next"],
      pathsById: {
        "signup-next": {
          id: "signup-next",
          key: "next",
          name: "가입 완료",
          target: { universeId: "custom-zone-demo", zoneId: "welcome" },
          rule: { type: "event", payload: { eventName: "signup" } },
        },
      },
      meta: { summary: "이벤트: signup 발생 시 시작" },
    },
    welcome: {
      id: "welcome",
      parentZoneId: null,
      name: "환영 메일",
      zoneType: "send",
      childZoneIds: [],
      pathIds: ["welcome-next"],
      pathsById: {
        "welcome-next": {
          id: "welcome-next",
          key: "next",
          name: "발송 후",
          target: { universeId: "custom-zone-demo", zoneId: "opened" },
          rule: { type: "step", payload: { order: 1 } },
        },
      },
      action: { type: "sendEmail", payload: { templateId: "welcome" } },
      meta: { summary: "템플릿: welcome" },
    },
    opened: {
      id: "opened",
      parentZoneId: null,
      name: "메일 열람?",
      zoneType: "branch",
      childZoneIds: [],
      pathIds: ["opened-yes", "opened-no"],
      pathsById: {
        "opened-yes": {
          id: "opened-yes",
          key: "yes",
          name: "열람함",
          target: { universeId: "custom-zone-demo", zoneId: "done" },
          rule: { type: "condition", payload: { opened: true } },
        },
        "opened-no": {
          id: "opened-no",
          key: "no",
          name: "미열람",
          target: { universeId: "custom-zone-demo", zoneId: "reminder" },
          rule: { type: "condition", payload: { opened: false } },
        },
      },
      meta: { summary: "분기: 열람 여부" },
    },
    reminder: {
      id: "reminder",
      parentZoneId: null,
      name: "재발송 대기",
      zoneType: "wait",
      childZoneIds: [],
      pathIds: ["reminder-next"],
      pathsById: {
        "reminder-next": {
          id: "reminder-next",
          key: "next",
          name: "1일 후",
          target: { universeId: "custom-zone-demo", zoneId: "done" },
          rule: { type: "delay", payload: { seconds: 86400 } },
        },
      },
      action: { type: "wait", payload: { seconds: 86400 } },
      meta: { summary: "대기: 24시간" },
    },
    done: {
      id: "done",
      parentZoneId: null,
      name: "완료",
      zoneType: "exit",
      outputDisabled: true,
      childZoneIds: [],
      pathIds: [],
      pathsById: {},
      meta: { summary: "여정 종료" },
    },
  },
};

export const customLayoutModel: UniverseLayoutModel = createUniverseLayoutModel({
  universeId: customModel.universeId,
  version: customModel.version,
  zoneLayoutsById: {
    signup: createZoneLayout({ x: 40, y: 190, width: 188, height: 96 }),
    welcome: createZoneLayout({ x: 388, y: 190, width: 188, height: 96 }),
    opened: createZoneLayout({ x: 736, y: 190, width: 188, height: 96 }),
    reminder: createZoneLayout({ x: 1084, y: 40, width: 188, height: 96 }),
    done: createZoneLayout({ x: 1084, y: 340, width: 188, height: 96 }),
  },
  pathLayoutsById: {
    "opened-yes": { routeOffset: { x: 0, y: 28 } },
    "opened-no": { routeOffset: { x: 0, y: -24 } },
  },
});
