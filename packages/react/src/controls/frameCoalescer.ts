/**
 * 프레임당 한 번만 적용되는 값 게이트.
 *
 * 포인터 이동은 프레임보다 훨씬 자주 온다(고주사율 트랙패드·펜). 적용 하나가
 * 비싼 작업이면 이벤트마다 적용할 때 입력 빈도가 렌더 빈도를 끌어올린다 —
 * 마지막 값만 남기고 다음 프레임에 한 번 적용한다.
 *
 * ⚠️ **버려도 되는 값에만 쓴다.** 중간 값이 누산에 쓰이면(예: 이전 값을 읽어
 * 배율을 곱하는 휠 줌) 합치는 순간 그만큼이 사라진다. 제스처 시작값 기준의
 * 절대 계산만 안전하다.
 *
 * @internal
 */
export type FrameCoalescer<T> = {
  /** 다음 프레임에 적용할 값을 예약한다. 같은 프레임의 이전 예약은 대체된다. */
  schedule(value: T): void;
  /** 예약분이 있으면 지금 즉시 적용한다. 없으면 아무 일도 하지 않는다. */
  flush(): void;
  /** 예약분을 적용하지 않고 버린다(언마운트 등). */
  cancel(): void;
};

/** @internal */
export function createFrameCoalescer<T>(
  apply: (value: T) => void
): FrameCoalescer<T> {
  let pending: { value: T } | null = null;
  let frameId: number | null = null;

  const flush = () => {
    frameId = null;
    const next = pending;
    if (!next) return;
    pending = null;
    apply(next.value);
  };

  return {
    schedule(value) {
      pending = { value };

      // rAF 가 없는 환경(SSR·테스트 러너)에서는 합치지 않고 그대로 적용한다 —
      // 예약만 해두면 영영 안 흘러간다.
      if (typeof globalThis.requestAnimationFrame !== "function") {
        flush();
        return;
      }
      if (frameId !== null) return;
      frameId = globalThis.requestAnimationFrame(flush);
    },

    flush,

    cancel() {
      if (frameId !== null && typeof globalThis.cancelAnimationFrame === "function") {
        globalThis.cancelAnimationFrame(frameId);
      }
      frameId = null;
      pending = null;
    },
  };
}
