/**
 * 에디터 오버레이에서 허용할 동작을 세분화해 제어하는 권한 플래그.
 *
 * 모든 값은 "그 동작을 허용하는가" 를 뜻하며, config 에는 {@link Partial} 형태로 넘기고
 * 누락한 필드는 {@link resolvePermissions} 가 `true`(허용) 로 채웁니다. 즉, `permissions`
 * 를 지정하지 않으면 기존 편집 모드와 100% 동일하게 전부 허용됩니다.
 *
 * - 구조 변경: createZone / deleteZone / createPath / deletePath / reparentZone / retargetPath
 * - 순수 레이아웃: moveZone / resizeZone / routePath
 *
 * "레이아웃만 바꾸고 추가/삭제는 막는" 모드는 {@link editorPermissionPresets.layoutOnly}
 * 를 넣으면 됩니다. 개별 동작만 켜고 싶으면 스프레드로 덮어쓰세요:
 *
 * ```ts
 * permissions={{ ...editorPermissionPresets.layoutOnly, reparentZone: true }}
 * ```
 */
export type EditorPermissions = {
  /** 외부 드롭 등으로 새 존을 생성. */
  createZone: boolean;
  /** 존 삭제(키/버튼/롱프레스). */
  deleteZone: boolean;
  /** 존 outlet 드래그로 새 패스를 생성. */
  createPath: boolean;
  /** 패스 삭제(키/버튼/롱프레스). */
  deletePath: boolean;
  /** 드래그로 존을 다른 컨테이너 안으로 옮겨 부모를 변경(reparent). */
  reparentZone: boolean;
  /** 패스 끝점을 다른 존에 다시 연결(retarget). */
  retargetPath: boolean;
  /** 존 위치 이동. */
  moveZone: boolean;
  /** 존 크기 조절. */
  resizeZone: boolean;
  /** 패스 레이아웃(라벨 위치 이동 + 라우팅 핸들) 조정. */
  routePath: boolean;
};

/** {@link EditorPermissions} 의 모든 필드를 끄는 베이스. */
const ALL_DISABLED: EditorPermissions = {
  createZone: false,
  deleteZone: false,
  createPath: false,
  deletePath: false,
  reparentZone: false,
  retargetPath: false,
  moveZone: false,
  resizeZone: false,
  routePath: false,
};

/**
 * 자주 쓰는 권한 조합 프리셋. 그대로 넣거나 스프레드로 일부만 덮어쓸 수 있습니다.
 *
 * - `full`: 전부 허용(기본값과 동일).
 * - `layoutOnly`: 위치·크기·패스 라우팅만 허용, 구조 변경은 모두 차단.
 * - `locked`: 보기 전용 — 오버레이는 떠 있되 어떤 변경도 불가.
 */
export const editorPermissionPresets = {
  full: {},
  layoutOnly: {
    createZone: false,
    deleteZone: false,
    createPath: false,
    deletePath: false,
    reparentZone: false,
    retargetPath: false,
  },
  locked: { ...ALL_DISABLED },
} satisfies Record<string, Partial<EditorPermissions>>;

/**
 * 부분 권한 입력을 완전한 {@link EditorPermissions} 로 변환합니다.
 * 누락한 필드는 `true`(허용) 로 채워지므로, 입력이 없으면 전부 허용됩니다.
 */
export function resolvePermissions(
  input?: Partial<EditorPermissions>
): EditorPermissions {
  return {
    createZone: input?.createZone ?? true,
    deleteZone: input?.deleteZone ?? true,
    createPath: input?.createPath ?? true,
    deletePath: input?.deletePath ?? true,
    reparentZone: input?.reparentZone ?? true,
    retargetPath: input?.retargetPath ?? true,
    moveZone: input?.moveZone ?? true,
    resizeZone: input?.resizeZone ?? true,
    routePath: input?.routePath ?? true,
  };
}
