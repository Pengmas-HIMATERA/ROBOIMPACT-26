import type { FirmwareState } from './firmware';
export interface PIDConfig {
  kp: number;
  ki: number;
  kd: number;
  pushStrength: number;
  bias: number;
  speed: number;
  loopMs: number;
  swapMotors: boolean;
  track?: 'straight' | 'pdf';
  boardMeters?: number;
  startSide?: 'left' | 'right';
}

export interface SimulationState {
  finished: boolean;
  firmware: FirmwareState;
  sensors: number[];
  nextLoopMs: number;
  t: number;
  x: number;
  v: number; // World X disturbance velocity.
  vForward: number; // World forward (-Z) disturbance velocity.
  forward: number;
  travelled: number;
  heading: number;
  yawRate: number;
  leftMotor: number;
  rightMotor: number;
  push: number;
  pushRemaining: number;
  integral: number;
  previousError: number;
  derivative: number;
  p: number;
  i: number;
  d: number;
  u: number;
  steps: number;
}

export interface PositionSample {
  t: number;
  x: number;
  target: number;
  error: number;
  p: number;
  i: number;
  d: number;
  leftMotor: number;
  rightMotor: number;
}

export interface Arena {
  setLabels(visible: boolean): void;
  update(state: SimulationState, config: PIDConfig): void;
}
