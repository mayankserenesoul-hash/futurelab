import test from "node:test";
import assert from "node:assert/strict";
import { createWindowLimiter } from "./limits.js";

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

test("limiter: allows up to the maximum, then blocks", () => {
  const limiter = createWindowLimiter({ max: 3, windowMs: 60000, now: clock().now });
  assert.deepEqual([1, 2, 3, 4, 5].map(() => limiter.take("a")), [true, true, true, false, false]);
});

test("limiter: the window slides, so blocked visitors get in again later", () => {
  const c = clock();
  const limiter = createWindowLimiter({ max: 2, windowMs: 1000, now: c.now });
  assert.ok(limiter.take("a"));
  assert.ok(limiter.take("a"));
  assert.equal(limiter.take("a"), false);
  c.advance(1001);
  assert.ok(limiter.take("a"));
});

test("limiter: different keys are counted separately", () => {
  const limiter = createWindowLimiter({ max: 1, windowMs: 60000, now: clock().now });
  assert.ok(limiter.take("visitor-1"));
  assert.equal(limiter.take("visitor-1"), false);
  assert.ok(limiter.take("visitor-2"));
});

test("limiter: blocked requests do not extend the block", () => {
  const c = clock();
  const limiter = createWindowLimiter({ max: 1, windowMs: 1000, now: c.now });
  assert.ok(limiter.take("a"));
  for (let i = 0; i < 50; i++) { c.advance(10); assert.equal(limiter.take("a"), false); }
  c.advance(600); // 1100ms since the one allowed request
  assert.ok(limiter.take("a"));
});

test("limiter: prune forgets idle keys and keeps active ones", () => {
  const c = clock();
  const limiter = createWindowLimiter({ max: 5, windowMs: 1000, now: c.now });
  limiter.take("old");
  c.advance(2000);
  limiter.take("fresh");
  assert.equal(limiter.size(), 2);
  limiter.prune();
  assert.equal(limiter.size(), 1);
  assert.equal(limiter.take("old"), true); // starts fresh
});

test("limiter: the default key works as a single global counter", () => {
  const limiter = createWindowLimiter({ max: 2, windowMs: 60000, now: clock().now });
  assert.deepEqual([limiter.take(), limiter.take(), limiter.take()], [true, true, false]);
});