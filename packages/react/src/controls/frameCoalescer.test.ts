import { afterEach, describe, expect, it, vi } from "vitest";
import { createFrameCoalescer } from "./frameCoalescer.js";

/** 수동으로 프레임을 돌리는 rAF 스텁. */
function installManualRaf() {
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;

  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    callbacks.delete(id);
  });

  return {
    /** 예약된 콜백을 모두 실행한다(= 브라우저가 한 프레임 그린 것). */
    tick() {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      for (const [, cb] of pending) cb(performance.now());
    },
    get pendingCount() {
      return callbacks.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createFrameCoalescer", () => {
  it("한 프레임 안의 여러 예약을 마지막 값 하나로 합친다", () => {
    const raf = installManualRaf();
    const applied: number[] = [];
    const coalescer = createFrameCoalescer<number>((v) => applied.push(v));

    coalescer.schedule(1);
    coalescer.schedule(2);
    coalescer.schedule(3);

    expect(applied).toEqual([]); // 아직 프레임 전 — 아무것도 적용되지 않았다
    raf.tick();
    expect(applied).toEqual([3]);
  });

  it("프레임마다 한 번씩 적용된다", () => {
    const raf = installManualRaf();
    const applied: number[] = [];
    const coalescer = createFrameCoalescer<number>((v) => applied.push(v));

    coalescer.schedule(1);
    coalescer.schedule(2);
    raf.tick();
    coalescer.schedule(3);
    coalescer.schedule(4);
    raf.tick();

    expect(applied).toEqual([2, 4]);
  });

  it("flush 는 예약분을 즉시 적용하고, 뒤따르는 프레임은 중복 적용하지 않는다", () => {
    const raf = installManualRaf();
    const applied: number[] = [];
    const coalescer = createFrameCoalescer<number>((v) => applied.push(v));

    coalescer.schedule(7);
    coalescer.flush();
    expect(applied).toEqual([7]);

    raf.tick(); // 이미 흘려보냈으므로 재적용되면 안 된다
    expect(applied).toEqual([7]);
  });

  it("예약분이 없을 때 flush 는 아무 일도 하지 않는다", () => {
    installManualRaf();
    const apply = vi.fn();
    const coalescer = createFrameCoalescer<number>(apply);

    coalescer.flush();
    coalescer.flush();

    expect(apply).not.toHaveBeenCalled();
  });

  it("cancel 은 예약분을 버리고 프레임도 취소한다", () => {
    const raf = installManualRaf();
    const applied: number[] = [];
    const coalescer = createFrameCoalescer<number>((v) => applied.push(v));

    coalescer.schedule(9);
    coalescer.cancel();
    expect(raf.pendingCount).toBe(0);

    raf.tick();
    expect(applied).toEqual([]);
  });

  it("cancel 뒤에도 다시 예약할 수 있다", () => {
    const raf = installManualRaf();
    const applied: number[] = [];
    const coalescer = createFrameCoalescer<number>((v) => applied.push(v));

    coalescer.schedule(1);
    coalescer.cancel();
    coalescer.schedule(2);
    raf.tick();

    expect(applied).toEqual([2]);
  });

  it("rAF 가 없는 환경(SSR 등)에서는 합치지 않고 즉시 적용한다", () => {
    vi.stubGlobal("requestAnimationFrame", undefined);
    const applied: number[] = [];
    const coalescer = createFrameCoalescer<number>((v) => applied.push(v));

    coalescer.schedule(1);
    coalescer.schedule(2);

    expect(applied).toEqual([1, 2]);
  });

  it("팬 제스처 시나리오 — 중간 이벤트를 버려도 최종 카메라가 같다", () => {
    const raf = installManualRaf();
    type Camera = { x: number; y: number; zoom: number };

    // 팬은 제스처 시작값 기준 절대 계산이라 중간값이 누산에 쓰이지 않는다.
    const startCamera: Camera = { x: 100, y: 50, zoom: 2 };
    const moves = [3, 11, 27, 40, 58]; // 한 프레임 안에 들어온 pointermove 5개

    let committed: Camera = { ...startCamera };
    const coalescer = createFrameCoalescer<(prev: Camera) => Camera>(
      (updater) => {
        committed = updater(committed);
      }
    );

    for (const delta of moves) {
      coalescer.schedule((prev) => ({
        ...prev,
        x: startCamera.x + delta,
        y: startCamera.y + delta,
      }));
    }
    raf.tick();

    const last = moves[moves.length - 1];
    // 이벤트마다 적용했을 때의 최종 상태와 정확히 같아야 한다.
    expect(committed).toEqual({
      x: startCamera.x + last,
      y: startCamera.y + last,
      zoom: startCamera.zoom, // 합쳐도 다른 축은 보존된다
    });
  });
});
