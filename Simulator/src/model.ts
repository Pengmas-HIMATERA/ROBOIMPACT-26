import { WHEEL_RADIUS, WHEEL_TRACK, SENSOR_FORWARD, SENSOR_OFFSETS, ROBOT_MASS_KG, YAW_INERTIA_KG_M2 } from './robot.ts';
export { SENSOR_OFFSETS } from './robot.ts';
import type { PIDConfig, SimulationState } from './types';
import { createFirmware, firmwareLoop, SKETCH } from './firmware.ts';
import { trackADC, trackStart, atTrackFinish } from './track.ts';
import { motorDrive } from './motor.ts';

export const DT = 1 / 120;
// Assumed plant: one scene unit = 0.1 m; TT 200 RPM at full PWM, 40 mm wheel.
export const TRACK_WIDTH = WHEEL_TRACK;
export const WHEEL_DIAMETER_M = WHEEL_RADIUS * 2 * .1;
export const FULL_PWM_RPM = 200;
export const MAX_SPEED = Math.PI * WHEEL_DIAMETER_M * FULL_PWM_RPM / 60 / .1;
export const MAX_TURN = 255; // Plot contribution scale, NOT a PID-output limit.
export const FORCE_UNIT_N = .06; // Each existing strength unit represents 0.06 N.
const MOTOR_RESPONSE_S = .12; // Assumed response at the default estimated load.
const SLIP_DRAG_N_S_M = 1.5; // Assumed viscous lateral drag, not measured traction.
export function robotDynamics(massKg = ROBOT_MASS_KG) {
  const mass = Number.isFinite(massKg) && massKg > 0 ? massKg : ROBOT_MASS_KG;
  const inertia = YAW_INERTIA_KG_M2 * mass / ROBOT_MASS_KG;
  return { massKg: mass, inertiaKgM2: inertia,
    translationResponseS: MOTOR_RESPONSE_S * mass / ROBOT_MASS_KG,
    rotationResponseS: MOTOR_RESPONSE_S * inertia / YAW_INERTIA_KG_M2 };
}
export function createState(config?: PIDConfig): SimulationState {
  return { finished: false, t: 0, x: 0, v: 0, vForward: 0, forward: 0, travelled: 0, heading: 0, yawRate: 0,
    firmware: createFirmware(), sensors: [30, 850, 30], nextLoopMs: SKETCH.startupMs,
    leftMotor: 0, rightMotor: 0, push: 0, pushRemaining: 0,
    leftMotorRunning: false, rightMotorRunning: false,
    integral: 0, previousError: 0, derivative: 0, p: 0, i: 0, d: 0, u: 0, steps: 0,
    ...(config?.track === 'pdf' ? trackStart(config) : {}) }; 
}
export function pushRobot(state: SimulationState, force: number): void {
  if (state.finished) return;
  state.push = force; state.pushRemaining = .35;
}
export function readVirtualSensors(state: SimulationState, config?: PIDConfig): number[] {
  return SENSOR_OFFSETS.map(offset => {
    const distance = state.x + SENSOR_FORWARD * Math.sin(state.heading) + offset * Math.cos(state.heading);
    if (config?.track === 'pdf') {
      const z = -state.forward - SENSOR_FORWARD * Math.cos(state.heading) + offset * Math.sin(state.heading);
      return trackADC(distance, z, config);
    }
    // Assumed optical response, high signal on black line; ADC range 0..1023.
    return Math.round(30 + 820 * Math.exp(-.5 * (distance / .08) ** 2));
  });
}
export function advance(state: SimulationState, config: PIDConfig, controllerStep = firmwareLoop): void {
  if (state.finished) return;
  const dynamics = robotDynamics(config.massKg);
  // Each physics interval is split at firmware boundaries (including 1 ms loops).
  const end = state.t + DT;
  while (state.t < end - 1e-10) {
    if (state.t * 1000 >= state.nextLoopMs - 1e-6) {
      state.sensors = readVirtualSensors(state, config);
      controllerStep(state.firmware, state.sensors, Math.round(state.nextLoopMs), config, config.controller);
      state.nextLoopMs += Math.max(1, config.loopMs);
    }
    const dt = Math.min(end - state.t, Math.max(1e-9, state.nextLoopMs / 1000 - state.t));
    const fw = state.firmware;
    const pwmLeft = config.swapMotors ? fw.pwmRight : fw.pwmLeft;
    const pwmRight = config.swapMotors ? fw.pwmLeft : fw.pwmRight;
    const leftDrive = motorDrive(pwmLeft, state.leftMotorRunning);
    const rightDrive = motorDrive(pwmRight, state.rightMotorRunning);
    state.leftMotorRunning = leftDrive.running;
    state.rightMotorRunning = rightDrive.running;
    const targetLeft = MAX_SPEED * leftDrive.throttle, targetRight = MAX_SPEED * rightDrive.throttle;
    let driveSpeed = (state.leftMotor + state.rightMotor) / 2;
    let driveYaw = (state.leftMotor - state.rightMotor) / TRACK_WIDTH;
    driveSpeed += dt / (dynamics.translationResponseS + dt) * ((targetLeft + targetRight) / 2 - driveSpeed);
    driveYaw += dt / (dynamics.rotationResponseS + dt) * ((targetLeft - targetRight) / TRACK_WIDTH - driveYaw);
    state.leftMotor = driveSpeed + driveYaw * TRACK_WIDTH / 2;
    state.rightMotor = driveSpeed - driveYaw * TRACK_WIDTH / 2;
    state.yawRate = (state.leftMotor - state.rightMotor) / TRACK_WIDTH;
    state.heading += state.yawRate * dt;
    state.heading = Math.atan2(Math.sin(state.heading), Math.cos(state.heading));
    const forceN = (config.bias + (state.pushRemaining > 0 ? state.push : 0)) * FORCE_UNIT_N;
    // Local right = (cos heading, -sin heading) in X/forward coordinates.
    // Keep velocity in world coordinates so existing momentum does not rotate with the robot.
    // F = m*a in SI, then convert m/s² to scene units/s².
    state.v += (forceN * Math.cos(state.heading) / .1 - SLIP_DRAG_N_S_M * state.v) / dynamics.massKg * dt;
    state.vForward += (-forceN * Math.sin(state.heading) / .1 - SLIP_DRAG_N_S_M * state.vForward) / dynamics.massKg * dt;
    const speed = (state.leftMotor + state.rightMotor) / 2;
    state.x += (speed * Math.sin(state.heading) + state.v) * dt;
    state.forward += (speed * Math.cos(state.heading) + state.vForward) * dt;
    state.travelled += Math.abs(speed) * dt;
    state.pushRemaining = Math.max(0, state.pushRemaining - dt);
    if (state.pushRemaining < 1e-9) { state.pushRemaining = 0; state.push = 0; }
    state.t += dt;
    if (atTrackFinish(state.x, state.forward, state.heading, config)) {
      state.finished = true;
      state.firmware.pwmLeft = 0; state.firmware.pwmRight = 0;
      state.leftMotor = 0; state.rightMotor = 0; state.yawRate = 0; state.v = 0; state.vForward = 0;
      state.leftMotorRunning = false; state.rightMotorRunning = false;
      state.push = 0; state.pushRemaining = 0;
      break;
    }
  }
  const fw = state.firmware;
  state.p = fw.p; state.i = fw.i; state.d = fw.d; state.u = fw.output;
  state.integral = fw.integral; state.derivative = fw.derivative; state.previousError = fw.lastError;
  state.steps++;
}
