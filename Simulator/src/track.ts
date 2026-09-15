import { SENSOR_FORWARD, SENSOR_OFFSETS } from './robot.ts';
import mask from '../assets/track-mask.json' with { type: 'json' };
import type { PIDConfig } from './types';

export function paperSide(config: PIDConfig): number { return (config.boardMeters ?? 2) * 10; }
export function trackBlack(x: number, z: number, config: PIDConfig): number {
  const side = paperSide(config);
  const px = Math.floor((x / side + .5) * mask.width);
  const py = Math.floor((z / side + .5) * mask.height);
  if (px < 0 || py < 0 || px >= mask.width || py >= mask.height) return 0;
  const runs = mask.rows[py];
  for (let index = 0; index < runs.length; index += 2) {
    if (px >= runs[index] && px < runs[index + 1]) return 1;
  }
  return 0;
}
export function trackADC(x: number, z: number, config: PIDConfig): number {
  let sum = 0, weights = 0;
  // Assumed finite optical footprint; integrate local black coverage, not x=0 distance.
  for (let iy = -2; iy <= 2; iy++) for (let ix = -2; ix <= 2; ix++) {
    const weight = Math.exp(-(ix * ix + iy * iy) / 2);
    sum += weight * trackBlack(x + ix * .025, z + iy * .025, config);
    weights += weight;
  }
  return Math.round(30 + 820 * sum / weights);
}
export function trackStart(config: PIDConfig): {x: number; forward: number; heading: number} {
  const side = paperSide(config);
  const right = config.startSide === 'right';
  return { x: ((right ? 1550 : 50) / 1600 - .5) * side,
    forward: -((1320 / 1600) - .5) * side, heading: right ? -Math.PI / 2 : Math.PI / 2 };
}

// The central thick bar is the finish; either outer long bar is a start.
// Check all five front sensors so an angled approach still reaches the marker.
export function atTrackFinish(x: number, forward: number, heading: number, config: PIDConfig): boolean {
  if (config.track !== 'pdf') return false;
  const side = paperSide(config);
  return SENSOR_OFFSETS.some(offset => {
    const px = ((x + SENSOR_FORWARD * Math.sin(heading) + offset * Math.cos(heading)) / side + .5) * 1600;
    const py = ((-forward - SENSOR_FORWARD * Math.cos(heading) + offset * Math.sin(heading)) / side + .5) * 1600;
    return px >= 778 && px < 827 && py >= 1063 && py <= 1223;
  });
}
