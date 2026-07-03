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
  rootZoneIds: ["visit", "journey", "converted", "auditGroup"],
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
          entry: true,
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
      pathIds: ["path-retarget-exit"],
      pathsById: {
        // 자식 → 부모 컨테이너 = 내부 탈출 합류(exit) — 엣지가 컨테이너
        // 아웃렛 안쪽 면에서 만난다.
        "path-retarget-exit": {
          id: "path-retarget-exit",
          key: "done",
          name: "완료",
          target: { universeId: "parallel-flow", zoneId: "journey" },
          rule: { type: "complete", payload: {} },
        },
      },
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
    // canDropZone 데모용 자유 컨테이너 — 도킹 레인에 끌어넣으면 ✕ 마커가 뜨고
    // 드롭 시 원위치로 복원된다 (playground editorConfig.canDropZone 참조).
    auditGroup: {
      id: "auditGroup",
      parentZoneId: null,
      name: "Audit Group",
      zoneType: "container",
      childZoneIds: [],
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
      slotLayoutsByKey: {
        parallel: {
          // 좌측 엣지에서 띄운(inset) 자유 배치 — 인렛 → 레인 진입 점선이
          // 그려진다 (entry: true). height 를 생략하면 레인이 컨테이너
          // 높이를 추종한다 — 컨테이너를 상하로 리사이즈하면 자동 조절.
          rect: { x: 40, y: 0, width: 260 },
          // 도킹 스냅 포인트(슬롯 로컬) — 존 중앙이 빈 포인트로 스냅되고,
          // 한 포인트에 한 존만 앉는다. 마지막 하나는 빈 자리로 남겨둔 데모.
          snapPoints: [
            { x: 130, y: 84 },
            { x: 130, y: 176 },
            { x: 130, y: 268 },
            { x: 130, y: 360 },
          ],
        },
      },
      anchors: {
        inlet: { point: { x: 0, y: 210 } },
        outlet: { point: { x: 760, y: 210 } },
      },
    },
    pushAd: {
      x: 80,
      y: 40,
      width: 180,
      height: 88,
      anchors: {
        inlet: { point: { x: 0, y: 44 } },
        outlet: { point: { x: 180, y: 44 } },
      },
    },
    emailNudge: {
      x: 80,
      y: 132,
      width: 180,
      height: 88,
      anchors: {
        inlet: { point: { x: 0, y: 44 } },
        outlet: { point: { x: 180, y: 44 } },
      },
    },
    smsCoupon: {
      x: 80,
      y: 224,
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
    auditGroup: {
      x: 40,
      y: 460,
      width: 240,
      height: 140,
      anchors: {
        inlet: { point: { x: 0, y: 70 } },
        outlet: { point: { x: 240, y: 70 } },
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
    "path-retarget-exit": {
      routeOffset: { x: 8, y: 10 },
    },
  },
};
