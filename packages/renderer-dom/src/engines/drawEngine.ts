import type { DrawEngine } from "../types";

export const domDrawEngine: DrawEngine = {
  draw(input) {
    const { host } = input;

    // TODO:
    // 1. clear or patch host
    // 2. zone layer draw
    // 3. path node layer draw
    // 4. edge layer draw
    // 5. component renderer mount

    host.innerHTML = "";
  },
};