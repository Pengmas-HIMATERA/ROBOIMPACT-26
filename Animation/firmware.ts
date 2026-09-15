/** Sketch PID with simulator-only lost-line recovery. */
export const SKETCH = {
  kp: 18, ki: 0, kd: 5, baseLeft: 55, baseRight: 55,
  min: 0, max: 90, threshold: 100, weights: [-10, -2, 0, 2, 10],
  startupMs: 1000, lostGraceMs: 1000,
} as const;
export const RECOVERY = { graceMs: 150, timeoutMs: 3000, sweepMs: 600, deadband: .25, coastPWM: 30, searchPWM: 55 } as const;
export type FirmwareMode = 'startup' | 'tracking' | 'coasting' | 'search-left' | 'search-right' | 'lost-stop';
export interface FirmwareState {
  error: number; lastError: number; integral: number; derivative: number;
  p: number; i: number; d: number; output: number;
  lostSinceMs: number | null;
  detected: boolean; lastLineMs: number; searchDirection: number;
  pwmLeft: number; pwmRight: number; mode: FirmwareMode;
}
export function createFirmware(): FirmwareState {
  return { error: 0, lastError: 0, integral: 0, derivative: 0, p: 0, i: 0, d: 0,
    output: 0, lostSinceMs: null, detected: false, lastLineMs: 0, searchDirection: 0,
    pwmLeft: 0, pwmRight: 0, mode: 'startup' };
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function moveMotors(state: FirmwareState) {
  // C++ assignment to int occurs BEFORE constrain().
  state.pwmLeft = clamp(Math.trunc(SKETCH.baseLeft + state.output), SKETCH.min, SKETCH.max);
  state.pwmRight = clamp(Math.trunc(SKETCH.baseRight - state.output), SKETCH.min, SKETCH.max);
}
export function firmwareLoop(state: FirmwareState, sensors: readonly number[], nowMs: number, gain: {kp: number; ki: number; kd: number}): void {
  if (nowMs < SKETCH.startupMs) return;
  let weighted = 0, total = 0;
  for (let index = 0; index < 5; index++) {
    const value = sensors[index];
    if (value > SKETCH.threshold) {
      const weight = value - SKETCH.threshold;
      weighted += SKETCH.weights[index] * weight;
      total += weight;
    }
  }
  state.detected = total !== 0;
  if (state.mode === 'lost-stop') {
    state.pwmLeft = 0; state.pwmRight = 0;
    return; // Latched stop; Reset explicitly starts a new run.
  }
  if (state.detected) {
    const reacquired = state.lostSinceMs !== null;
    state.lostSinceMs = null;
    state.error = weighted / total;
    state.lastLineMs = nowMs;
    if (state.error > RECOVERY.deadband) state.searchDirection = 1;
    else if (state.error < -RECOVERY.deadband) state.searchDirection = -1;
    state.p = gain.kp * state.error;
    state.integral = clamp(state.integral + state.error, -100, 100);
    state.i = gain.ki * state.integral;
    state.derivative = reacquired ? 0 : state.error - state.lastError;
    state.d = gain.kd * state.derivative;
    state.output = state.p + state.i + state.d;
    state.lastError = state.error;
    moveMotors(state);
    state.mode = 'tracking';
  } else {
    state.lostSinceMs ??= nowMs;
    const elapsed = nowMs - state.lostSinceMs;
    state.integral = 0; state.derivative = 0;
    state.p = 0; state.i = 0; state.d = 0; state.output = 0;
    if (elapsed >= RECOVERY.timeoutMs) {
      state.pwmLeft = 0; state.pwmRight = 0; state.mode = 'lost-stop';
    } else if (elapsed < RECOVERY.graceMs) {
      // Brief slow, straight bridge; never replay stale PID or derivative.
      state.pwmLeft = RECOVERY.coastPWM; state.pwmRight = RECOVERY.coastPWM;
      state.mode = 'coasting';
    } else {
      // Try last known side first. Unknown direction starts right, then alternates.
      const phase = Math.floor((elapsed - RECOVERY.graceMs) / RECOVERY.sweepMs);
      const direction = (state.searchDirection || 1) * (phase % 2 === 0 ? 1 : -1);
      state.pwmLeft = direction === 1 ? RECOVERY.searchPWM : 0;
      state.pwmRight = direction === -1 ? RECOVERY.searchPWM : 0;
      state.mode = direction === 1 ? 'search-right' : 'search-left';
    }
  }
}
