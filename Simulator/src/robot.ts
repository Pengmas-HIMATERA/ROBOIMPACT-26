// One scene unit is 10 cm. Compact dimensions are provisional, not measured.
export const CHASSIS_LENGTH = .95;
export const CHASSIS_WIDTH = .84;
export const WHEEL_TRACK = .96;
export const SENSOR_FORWARD = .95;
export const SENSOR_OFFSETS = [-.18, 0, .18];
export const WHEEL_RADIUS = .2; // 4 cm diameter, provisional.

// Estimated mass budget and mounting positions in scene units (1 unit = 0.1 m).
// Uno dimensions/mass from Arduino; remaining masses are provisional.
export const UNO = { length: .686, width: .534, massKg: .025 } as const;
export const MASS_PARTS = [
  { name: 'Chassis + mounts', massKg: .12, x: -.1, y: .35, z: 0, length: .95, width: .84 },
  { name: '2 cells + holder', massKg: .095, x: -.14, y: .38, z: 0, length: .65, width: .4 },
  { name: 'Left motor', massKg: .045, x: 0, y: .2, z: -.28, length: .4, width: .19 },
  { name: 'Right motor', massKg: .045, x: 0, y: .2, z: .28, length: .4, width: .19 },
  { name: 'Left wheel', massKg: .0225, x: 0, y: .2, z: -.48, length: .4, width: .12 },
  { name: 'Right wheel', massKg: .0225, x: 0, y: .2, z: .48, length: .4, width: .12 },
  { name: 'Uno', massKg: UNO.massKg, x: -.1, y: .54, z: 0, length: UNO.length, width: UNO.width },
  { name: 'Driver', massKg: .03, x: .28, y: .36, z: 0, length: .25, width: .3 },
  { name: '3 blue sensor modules + mounts', massKg: .035, x: SENSOR_FORWARD, y: .15, z: 0, length: .28, width: .48 },
  { name: 'Wires + fasteners', massKg: .11, x: .1, y: .35, z: 0, length: .85, width: .8 },
] as const;
export const ROBOT_MASS_KG = MASS_PARTS.reduce((sum, part) => sum + part.massKg, 0);
export const CENTER_OF_MASS = {
  x: MASS_PARTS.reduce((sum, part) => sum + part.massKg * part.x, 0) / ROBOT_MASS_KG,
  y: MASS_PARTS.reduce((sum, part) => sum + part.massKg * part.y, 0) / ROBOT_MASS_KG,
  z: MASS_PARTS.reduce((sum, part) => sum + part.massKg * part.z, 0) / ROBOT_MASS_KG,
};
export const YAW_INERTIA_KG_M2 = MASS_PARTS.reduce((sum, part) => sum + part.massKg * .01 * (
  (part.x - CENTER_OF_MASS.x) ** 2 + (part.z - CENTER_OF_MASS.z) ** 2
  + (part.length ** 2 + part.width ** 2) / 12
), 0);
