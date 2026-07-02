import type { UniverseLayoutModel, UniverseModel } from "@zoneflow/core";

/**
 * 도킹 슬롯 샘플 — 컨테이너가 선언한 `parallel` 슬롯(좌측 레인)에 도킹된
 * (`slotKey: "parallel"`) 존들은 childInput 이 막혀 인렛 앵커가 없고 패스
 * target 이 될 수 없다. "컨테이너 진입 시 동시 시작"이라는 의미 해석은 소비
 * 서비스 몫이고, 탈출조건은 컨테이너의 일반 outgoing 패스 rule(구매전환)로
 * 표현한다.
 *
 * 편집 모드에서 자식 존을 레인 안/밖으로 드래그하면 slotKey 가 세팅/해제된다.
 */
export const sampleParallelUniverse: UniverseModel = {
  version: "2.0.0",
  universeId: "parallel-flow",
  rootZoneIds: ["visit", "journey", "converted"],
  meta: {
    name: "Parallel Slot",
    description:
      "컨테이너가 선언한 parallel 슬롯(좌측 레인)에 도킹된 존들 — 진입 시 동시 실행 해석, 구매전환 rule 로 탈출.",
  },
  zonesById: {
    visit: {
      id: "visit",
      parentZoneId: null,
      name: "Visit Detected",
      zoneType: "action",
      inputDisabled: true,
      childZoneIds: [],
      action: {
        type: "detectVisit",
        payload: { page: "product-detail" },
      },
      pathIds: ["path-visit-journey"],
      pathsById: {
        "path-visit-journey": {
          id: "path-visit-journey",
          key: "enter",
          name: "진입",
          target: { universeId: "parallel-flow", zoneId: "journey" },
          rule: null,
        },
      },
    },
    journey: {
      id: "journey",
      parentZoneId: null,
      name: "Nurture Journey",
      zoneType: "container",
      slots: [
        {
          key: "parallel",
          label: "∥ PARALLEL",
          effects: { childInput: "disabled" },
        },
      ],
      childZoneIds: ["pushAd", "emailNudge", "smsCoupon", "retargetWait"],
      pathIds: ["path-journey-converted"],
      pathsById: {
        "path-journey-converted": {
          id: "path-journey-converted",
          key: "escape",
          name: "탈출: 구매전환",
          target: { universeId: "parallel-flow", zoneId: "converted" },
          rule: {
            type: "purchase-conversion",
            payload: { withinDays: 14 },
          },
        },
      },
    },
    pushAd: {
      id: "pushAd",
      parentZoneId: "journey",
      name: "Push Ad",
      zoneType: "action",
      slotKey: "parallel",
      childZoneIds: [],
      action: {
        type: "sendPush",
        payload: { campaign: "retarget-push" },
      },
      pathIds: [],
      pathsById: {},
    },
    emailNudge: {
      id: "emailNudge",
      parentZoneId: "journey",
      name: "Email Nudge",
      zoneType: "action",
      slotKey: "parallel",
      childZoneIds: [],
      action: {
        type: "sendEmail",
        payload: { templateId: "nudge-cart" },
      },
      pathIds: ["path-email-retarget"],
      pathsById: {
        "path-email-retarget": {
          id: "path-email-retarget",
          key: "no_open",
          name: "3일 미오픈",
          target: { universeId: "parallel-flow", zoneId: "retargetWait" },
          rule: {
            type: "delay",
            payload: { days: 3, event: "email-open", negate: true },
          },
        },
      },
    },
    smsCoupon: {
      id: "smsCoupon",
      parentZoneId: "journey",
      name: "SMS Coupon",
      zoneType: "action",
      slotKey: "parallel",
      childZoneIds: [],
      action: {
        type: "sendSms",
        payload: { couponId: "welcome-10" },
      },
      pathIds: [],
      pathsById: {},
    },
    retargetWait: {
      id: "retargetWait",
      parentZoneId: "journey",
      name: "Retarget Wait",
      zoneType: "action",
      childZoneIds: [],
      action: {
        type: "wait",
        payload: { days: 7 },
      },
      pathIds: [],
      pathsById: {},
    },
    converted: {
      id: "converted",
      parentZoneId: null,
      name: "Converted",
      zoneType: "action",
      outputDisabled: true,
      childZoneIds: [],
      action: {
        type: "handoff",
        payload: { queue: "post-purchase" },
      },
      pathIds: [],
      pathsById: {},
    },
  },
};

export const sampleParallelUniverseLayout: UniverseLayoutModel = {
  version: "2.0.0",
  universeId: "parallel-flow",
  zoneLayoutsById: {
    visit: {
      x: 40,
      y: 280,
      width: 210,
      height: 100,
      anchors: {
        inlet: { point: { x: 0, y: 50 } },
        outlet: { point: { x: 210, y: 50 } },
      },
    },
    journey: {
      x: 420,
      y: 120,
      width: 760,
      height: 420,
      slotLayoutsByKey: { parallel: { width: 260 } },
      anchors: {
        inlet: { point: { x: 0, y: 210 } },
        outlet: { point: { x: 760, y: 210 } },
      },
    },
    pushAd: {
      x: 40,
      y: 52,
      width: 180,
      height: 88,
      anchors: {
        inlet: { point: { x: 0, y: 44 } },
        outlet: { point: { x: 180, y: 44 } },
      },
    },
    emailNudge: {
      x: 40,
      y: 168,
      width: 180,
      height: 88,
      anchors: {
        inlet: { point: { x: 0, y: 44 } },
        outlet: { point: { x: 180, y: 44 } },
      },
    },
    smsCoupon: {
      x: 40,
      y: 284,
      width: 180,
      height: 88,
      anchors: {
        inlet: { point: { x: 0, y: 44 } },
        outlet: { point: { x: 180, y: 44 } },
      },
    },
    retargetWait: {
      x: 470,
      y: 162,
      width: 200,
      height: 96,
      anchors: {
        inlet: { point: { x: 0, y: 48 } },
        outlet: { point: { x: 200, y: 48 } },
      },
    },
    converted: {
      x: 1340,
      y: 280,
      width: 220,
      height: 110,
      anchors: {
        inlet: { point: { x: 0, y: 55 } },
        outlet: { point: { x: 220, y: 55 } },
      },
    },
  },
  pathLayoutsById: {
    "path-visit-journey": {
      routeOffset: { x: 12, y: -18 },
    },
    "path-journey-converted": {
      routeOffset: { x: 14, y: -24 },
    },
    "path-email-retarget": {
      routeOffset: { x: 10, y: -8 },
    },
  },
};
