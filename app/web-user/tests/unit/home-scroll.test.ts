import { describe, expect, it } from "vitest";
import {
  clamp01,
  computeCameraPoseAtScroll,
} from "@/features/home/scroll-choreography";

describe("scroll-choreography", () => {
  it("clamps out-of-range and non-finite progress values safely", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1.8)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(Number.NEGATIVE_INFINITY)).toBe(0);

    expect(computeCameraPoseAtScroll(-1.5)).toEqual(computeCameraPoseAtScroll(0));
    expect(computeCameraPoseAtScroll(2.5)).toEqual(computeCameraPoseAtScroll(1));
  });

  it("positions camera on the right in Milestone 1 (Hero: 0.00 - 0.20)", () => {
    const start = computeCameraPoseAtScroll(0);
    const mid = computeCameraPoseAtScroll(0.12);

    expect(start.milestone).toBe("hero");
    expect(mid.milestone).toBe("hero");
    expect(start.position[0]).toBeCloseTo(1.7, 2);
    expect(mid.position[0]).toBeGreaterThan(1.4);
    expect(mid.scale).toBeCloseTo(1.0, 2);
    expect(mid.stripOut).toBe(0);
    expect(mid.shutterPress).toBe(0);
  });

  it("moves camera to the left in Milestone 2 (Drawers: 0.20 - 0.44)", () => {
    const mid = computeCameraPoseAtScroll(0.32);

    expect(mid.milestone).toBe("drawers");
    expect(mid.position[0]).toBeLessThan(-1.5);
    expect(mid.rotation[1]).toBeGreaterThan(0.3);
    expect(mid.stripOut).toBe(0);
    expect(mid.shutterPress).toBe(0);
  });

  it("extends mini photobooth strip and presses shutter in Milestone 3 (Process: 0.44 - 0.66)", () => {
    const mid = computeCameraPoseAtScroll(0.55);

    expect(mid.milestone).toBe("process");
    expect(mid.position[0]).toBeGreaterThan(1.4);
    expect(mid.rotation[0]).toBeGreaterThan(0.35);
    expect(mid.stripOut).toBeGreaterThan(0.7);
    expect(mid.shutterPress).toBeGreaterThan(0.7);
  });

  it("shrinks camera to top-right (scale ~0.65) in Milestone 4 (Pricing: 0.66 - 0.86)", () => {
    const mid = computeCameraPoseAtScroll(0.76);

    expect(mid.milestone).toBe("pricing");
    expect(mid.position[0]).toBeGreaterThan(2.0);
    expect(mid.position[1]).toBeGreaterThan(0.7);
    expect(mid.position[2]).toBeLessThan(-0.3);
    expect(mid.scale).toBeCloseTo(0.65, 2);
    expect(mid.stripOut).toBe(0);
    expect(mid.shutterPress).toBe(0);
    expect(mid.opacity).toBeLessThan(1);
  });

  it("returns camera to balanced right-front pose in Milestone 5 (Final CTA: 0.86 - 1.00)", () => {
    const end = computeCameraPoseAtScroll(0.95);

    expect(end.milestone).toBe("cta");
    expect(end.position[0]).toBeCloseTo(1.6, 1);
    expect(end.position[1]).toBeCloseTo(0, 1);
    expect(Math.abs(end.rotation[1])).toBeLessThan(0.25);
    expect(end.scale).toBeGreaterThan(0.95);
    expect(end.stripOut).toBe(0);
    expect(end.shutterPress).toBe(0);
  });

  it("transitions continuously across milestone boundaries without NaN", () => {
    const boundaries = [0.2, 0.44, 0.66, 0.86];
    for (const b of boundaries) {
      const before = computeCameraPoseAtScroll(b - 0.001);
      const after = computeCameraPoseAtScroll(b + 0.001);

      expect(Math.abs(after.position[0] - before.position[0])).toBeLessThan(0.1);
      expect(Math.abs(after.scale - before.scale)).toBeLessThan(0.05);
      for (const val of [...before.position, ...before.rotation, ...after.position, ...after.rotation]) {
        expect(Number.isFinite(val)).toBe(true);
      }
    }
  });
});
