import {
  createUniverseLayoutModel,
  createZoneLayout,
  type UniverseLayoutModel,
  type UniverseModel,
} from "@zoneflow/core";

const UNIVERSE_ID = "material-bank-demo";

/**
 * 전부 루트 레벨 존 + 그 사이 패스. 두세 개를 골라(자유 선택) "소재"로 저장한 뒤
 * 빈 곳에 드롭해 재사용하는 흐름을 보여주기 위한 작은 샘플.
 */
export const sampleModel: UniverseModel = {
  version: "2.0.0",
  universeId: UNIVERSE_ID,
  meta: { name: "Material Bank Demo" },
  rootZoneIds: ["greeting", "delay", "offer", "thanks"],
  zonesById: {
    greeting: {
      id: "greeting",
      parentZoneId: null,
      name: "Greeting",
      zoneType: "action",
      childZoneIds: [],
      pathIds: ["greeting-wait"],
      pathsById: {
        "greeting-wait": {
          id: "greeting-wait",
          key: "wait",
          name: "Wait a day",
          target: { universeId: UNIVERSE_ID, zoneId: "delay" },
          rule: { type: "step", payload: { order: 1 } },
        },
      },
      action: { type: "sendEmail", payload: { templateId: "welcome" } },
    },
    delay: {
      id: "delay",
      parentZoneId: null,
      name: "Delay",
      zoneType: "action",
      childZoneIds: [],
      pathIds: ["delay-then"],
      pathsById: {
        "delay-then": {
          id: "delay-then",
          key: "then",
          name: "Then",
          target: { universeId: UNIVERSE_ID, zoneId: "offer" },
          rule: { type: "wait", payload: { seconds: 86400 } },
        },
      },
      action: { type: "wait", payload: { seconds: 86400 } },
    },
    offer: {
      id: "offer",
      parentZoneId: null,
      name: "Offer",
      zoneType: "action",
      childZoneIds: [],
      pathIds: ["offer-done"],
      pathsById: {
        "offer-done": {
          id: "offer-done",
          key: "done",
          name: "Done",
          target: { universeId: UNIVERSE_ID, zoneId: "thanks" },
          rule: null,
        },
      },
      action: { type: "sendPush", payload: { templateId: "promo" } },
    },
    thanks: {
      id: "thanks",
      parentZoneId: null,
      name: "Thanks",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      pathIds: [],
      pathsById: {},
      action: { type: "markCompleted" },
    },
  },
};

export const sampleLayoutModel: UniverseLayoutModel = createUniverseLayoutModel({
  universeId: sampleModel.universeId,
  version: sampleModel.version,
  zoneLayoutsById: {
    greeting: createZoneLayout({ x: 80, y: 96, width: 190, height: 120 }),
    delay: createZoneLayout({ x: 340, y: 96, width: 190, height: 120 }),
    offer: createZoneLayout({ x: 600, y: 96, width: 190, height: 120 }),
    thanks: createZoneLayout({ x: 860, y: 96, width: 190, height: 120 }),
  },
});
