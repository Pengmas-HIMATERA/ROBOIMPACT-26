// Provisional TT-motor thresholds on Arduino's 0..255 PWM scale, not measured.
export const MOTOR_DEADZONE = { startPWM: 60, sustainPWM: 45, speedOffsetPWM: 40 } as const;

/** Controller feed-forward: preserve zero; map useful demand above deadzone. */
export function compensatePWM(demand: number): number {
  if (demand <= 0) return 0;
  const pwm = MOTOR_DEADZONE.speedOffsetPWM + (255 - MOTOR_DEADZONE.speedOffsetPWM) * Math.min(255, demand) / 255;
  return Math.max(MOTOR_DEADZONE.startPWM, Math.round(pwm));
}

/** Plant hysteresis: stopped motors need more PWM than rotating motors. */
export function motorDrive(pwm: number, running: boolean): { running: boolean; throttle: number } {
  const threshold = running ? MOTOR_DEADZONE.sustainPWM : MOTOR_DEADZONE.startPWM;
  const active = pwm > 0 && pwm >= threshold;
  return { running: active,
    throttle: active ? Math.max(0, Math.min(1, (pwm - MOTOR_DEADZONE.speedOffsetPWM) / (255 - MOTOR_DEADZONE.speedOffsetPWM))) : 0 };
}
