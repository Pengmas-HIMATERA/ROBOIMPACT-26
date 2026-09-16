/* Differential-drive line follower with lateral disturbances. */
import { element as el, input } from './dom';
import type { Arena, PIDConfig, SimulationState, PositionSample } from './types';

import { DT, MAX_TURN, createState, advance, pushRobot } from './model';
import { SKETCH } from './firmware';
const gainKeys = ['kp', 'ki', 'kd'] as const;
const presets = { p: [18, 0, 0], pd: [18, 0, 5], pid: [18, .05, 5] };
const config: PIDConfig = { kp: SKETCH.kp, ki: SKETCH.ki, kd: SKETCH.kd, pushStrength: 6, bias: 0, speed: 1, loopMs: 10, swapMotors: false, track: 'pdf', boardMeters: 2, startSide: 'left' };
let state: SimulationState, history: PositionSample[];
let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
let arena: Arena | null = null;
import('./scene').then(({ createArena }) => {
  arena = createArena(el('scene-host'));
  arena.setLabels(input('show-labels').checked);
  el('scene-status').hidden = true;
}).catch(error => {
  el('scene-status').textContent = 'Arena 3D gagal dimuat. Jalankan npm install di folder Simulator, buka lewat localhost, dan pastikan WebGL 2 tersedia. Grafik PID tetap berjalan.';
  console.error('Arena 3D:', error);
});

function sample(): PositionSample {
  return { t: state.t, x: state.x, target: 0, error: state.firmware.error, p: state.p, i: state.i, d: state.d, leftMotor: state.firmware.pwmLeft, rightMotor: state.firmware.pwmRight };
}

function reset() {
  state = createState(config);
  history = [sample()];
}

function step() {
  if (state.finished) return;
  advance(state, config);
  if (state.steps % 4 === 0) {
    history.push(sample());
    while (history.length && history[0].t < state.t - 16) history.shift();
  }
}

type ChartMode = 'error' | 'pid' | 'motors';
type Series = { key: keyof PositionSample; color: string; label: string; dashed?: boolean };
const charts: Record<ChartMode, { series: Series[]; description: string; label: string }> = {
  error: { series: [{ key: 'error', color: '#9a6819', label: 'Error' }, { key: 'target', color: '#77836a', label: 'Garis nol', dashed: true }], description: 'Error sensor berbobot · nilai terakhir ditahan saat garis hilang', label: 'Grafik error sensor selama 16 detik terakhir' },
  pid: { series: [{ key: 'p', color: '#ce4b22', label: 'P' }, { key: 'i', color: '#9a6819', label: 'I' }, { key: 'd', color: '#76569b', label: 'D' }], description: 'Kontribusi PID per loop · output sebelum clamp PWM', label: 'Grafik kontribusi P, I, dan D selama 16 detik terakhir' },
  motors: { series: [{ key: 'leftMotor', color: '#3f775e', label: 'Kiri' }, { key: 'rightMotor', color: '#76569b', label: 'Kanan' }], description: 'Perintah PWM fungsi setLeftMotor / setRightMotor (0–90)', label: 'Grafik perintah PWM kiri dan kanan selama 16 detik terakhir' }
};
let chartMode: ChartMode = 'error';
function selectChart(mode: ChartMode) {
  chartMode = mode;
  document.querySelectorAll<HTMLButtonElement>('[data-chart]').forEach(button => {
    const selected = button.dataset.chart === mode;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  el('chart-panel').setAttribute('aria-labelledby', 'tab-' + mode);
  el('chart').setAttribute('aria-label', charts[mode].label);
  el('chart-description').textContent = charts[mode].description;
  el('chart-legend').replaceChildren(...charts[mode].series.map(series => {
    const item = document.createElement('span');
    item.style.color = series.color;
    item.textContent = (series.dashed ? '┄ ' : '● ') + series.label;
    return item;
  }));
}
const chartTabs = [...document.querySelectorAll<HTMLButtonElement>('[data-chart]')];
chartTabs.forEach((button, index) => {
  button.addEventListener('click', () => {
    const mode = button.dataset.chart;
    if (mode === 'error' || mode === 'pid' || mode === 'motors') selectChart(mode);
  });
  button.addEventListener('keydown', event => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % chartTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + chartTabs.length - 1) % chartTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = chartTabs.length - 1;
    else return;
    event.preventDefault(); chartTabs[next].click(); chartTabs[next].focus();
  });
});
input('show-labels').addEventListener('change', () => arena?.setLabels(input('show-labels').checked));

function drawChart() {
  const canvas = el('chart');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const rect = canvas.getBoundingClientRect(), ratio = devicePixelRatio || 1;
  const w = rect.width, h = rect.height;
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, w, h);
  const left = 45, right = w - 24, top = 16, bottom = h - 28;
  const start = Math.max(0, state.t - 16), end = Math.max(16, state.t);
  const series = charts[chartMode].series;
  const extent = Math.max(chartMode === "motors" ? 2 : 1, Math.ceil(Math.max(...history.flatMap(sample => series.map(line => Math.abs(sample[line.key]))))));
  const px = (t: number) => left + (t - start) / (end - start) * (right - left);
  const py = (x: number) => bottom - (x + extent) / (extent * 2) * (bottom - top);
  ctx.font = '10px Consolas, monospace'; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    const value = i * extent / 2, y = py(value);
    ctx.strokeStyle = '#d8dccd'; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    ctx.fillStyle = '#69765f'; ctx.fillText(value.toFixed(1), 12, y + 3);
  }
  for (let i = 0; i <= 4; i++) {
    const t = start + (end - start) * i / 4;
    ctx.fillText(t.toFixed(0) + 's', px(t) - 7, h - 9);
  }
  for (const { key: field, color, dashed } of series) {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [5, 5] : []); ctx.beginPath();
    history.forEach((s, i) => {
      if (!i) ctx.moveTo(px(s.t), py(s[field]));
      else { if (dashed) ctx.lineTo(px(s.t), py(history[i - 1][field])); ctx.lineTo(px(s.t), py(s[field])); }
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function render() {
  arena?.update(state, config);
  const error = state.firmware.error;
  for (const [id, value] of Object.entries({ 'target-value': state.travelled, 'position-value': state.x, 'error-value': error, 'output-value': state.u, 'p-value': state.p, 'i-value': state.i, 'd-value': state.d })) el(id).textContent = value.toFixed(2);
  for (const key of ['p', 'i', 'd'] as const) {
    const width = Math.min(50, Math.abs(state[key]) / MAX_TURN * 50);
    el(key + '-bar').style.width = width + '%';
    el(key + '-bar').style.left = (state[key] >= 0 ? 50 : 50 - width) + '%';
  }
  el('time').textContent = state.t.toFixed(1) + ' s';
  const modes = { startup: 'Startup · delay 1000 ms', tracking: 'Garis terdeteksi · PID aktif', coasting: 'Garis hilang · maju pelan 150 ms', 'search-left': 'Mencari garis ke kiri', 'search-right': 'Mencari garis ke kanan', 'lost-stop': 'Garis tidak ditemukan · motor stop — Reset untuk ulang' };
  el('motion').textContent = state.finished ? 'Finish tengah · motor berhenti — Reset untuk ulang' : modes[state.firmware.mode];
  el('firmware-mode').textContent = state.finished ? 'FINISH' : state.firmware.mode.toUpperCase();
  el('formula').textContent = `${state.p.toFixed(2)} + ${state.i.toFixed(2)} + ${state.d.toFixed(2)} = ${state.u.toFixed(2)} · PWM ${state.firmware.pwmLeft} / ${state.firmware.pwmRight}${state.firmware.detected ? '' : ' · PID terakhir ditahan'}`;
  el('motor-left').textContent = String(state.firmware.pwmLeft);
  el('motor-right').textContent = String(state.firmware.pwmRight);
  state.sensors.forEach((value, index) => {
    el('sensor-' + index).textContent = String(value);
    el('sensor-' + index).classList.toggle('detected', value > SKETCH.threshold);
  });
  el('heading').textContent = (state.heading * 180 / Math.PI).toFixed(1) + '°';
  el('pause').textContent = paused ? 'Lanjut' : 'Jeda';
  el('run-status').textContent = state.finished ? 'FINISH · MOTOR BERHENTI' : paused ? 'SIMULASI DIJEDA' : 'SIMULASI AKTIF';
  document.body.dataset.paused = String(paused);
  el('push-left').classList.toggle('firing', state.pushRemaining > 0 && state.push < 0);
  el('push-right').classList.toggle('firing', state.pushRemaining > 0 && state.push > 0);
  drawChart();
}

for (const key of gainKeys) input(key).addEventListener('input', () => {
  config[key] = Number(input(key).value); el(key + '-label').textContent = config[key].toFixed(key === "ki" ? 2 : 1);
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('active'));
});
input('push-strength').addEventListener('input', () => {
  config.pushStrength = Number(input('push-strength').value); el('push-strength-label').textContent = config.pushStrength.toFixed(1);
});
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => {
  const preset = button.dataset.preset;
  if (preset !== 'p' && preset !== 'pd' && preset !== 'pid') return;
  gainKeys.forEach((key, index) => {
    config[key] = presets[preset][index]; input(key).value = String(config[key]); el(key + '-label').textContent = config[key].toFixed(key === "ki" ? 2 : 1);
  });
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b === button));
  reset();
}));
input('bias').addEventListener('change', () => { config.bias = input('bias').checked ? .8 : 0; });
el('speed').addEventListener('change', event => {
  if (event.currentTarget instanceof HTMLSelectElement) config.speed = Number(event.currentTarget.value);
});
el('pause').addEventListener('click', () => { paused = !paused; });
el('reset').addEventListener('click', reset);
el('sketch-preset').addEventListener('click', () => {
  gainKeys.forEach(key => { config[key] = SKETCH[key]; input(key).value = String(config[key]); el(key + '-label').textContent = config[key].toFixed(2); });
  document.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('active'));
  reset();
});
el('loop-ms').addEventListener('change', event => { if (event.currentTarget instanceof HTMLSelectElement) { config.loopMs = Number(event.currentTarget.value); reset(); } });
input('swap-motors').addEventListener('change', () => { config.swapMotors = input('swap-motors').checked; reset(); });
el('push-left').addEventListener('click', () => { pushRobot(state, -config.pushStrength); });
el('push-right').addEventListener('click', () => { pushRobot(state, config.pushStrength); });
let previousTime: number | null = null, accumulator = 0;
function frame(now: number) {
  const elapsed = previousTime === null ? 0 : Math.min((now - previousTime) / 1000, .1);
  previousTime = now;
  if (!paused) {
    accumulator += elapsed * config.speed;
    while (accumulator >= DT) { step(); accumulator -= DT; }
  } else accumulator = 0;
  render(); requestAnimationFrame(frame);
}
reset(); requestAnimationFrame(frame);

for (const id of ['track-select', 'start-side', 'board-size']) el(id).addEventListener('change', () => {
  const track = el('track-select') as HTMLSelectElement;
  const start = el('start-side') as HTMLSelectElement;
  config.track = track.value === 'pdf' ? 'pdf' : 'straight';
  config.startSide = start.value === 'right' ? 'right' : 'left';
  config.boardMeters = Math.max(1, Math.min(5, Number(input('board-size').value) || 2));
  input('board-size').value = String(config.boardMeters);
  el('position-label').textContent = config.track === 'pdf' ? 'Posisi X' : 'Simpangan';
  reset();
});

// Fullscreen the whole arena so existing playback and push controls stay accessible.
const arenaPanel = el('arena-panel');
const fullscreenButton = el('fullscreen');
// Start in viewport fullscreen; native fullscreen requires a user gesture.
let expanded = true;
function syncFullscreen() {
  const active = document.fullscreenElement === arenaPanel || expanded;
  arenaPanel.classList.toggle('arena-expanded', active);
  document.body.classList.toggle('arena-is-expanded', active);
  fullscreenButton.textContent = active ? '↙ Keluar' : '⛶ Fullscreen';
  fullscreenButton.setAttribute('aria-label', active ? 'Keluar fullscreen' : 'Buka arena fullscreen');
  fullscreenButton.setAttribute('aria-pressed', String(active));
}
syncFullscreen();
fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement === arenaPanel) {
    await document.exitFullscreen();
  } else if (expanded) {
    expanded = false; syncFullscreen(); fullscreenButton.focus();
  } else {
    try {
      if (!arenaPanel.requestFullscreen) throw new Error('Fullscreen unavailable');
      await arenaPanel.requestFullscreen();
    } catch {
      // Embedded browsers may disallow the native API; use the full app viewport.
      expanded = true;
    }
    syncFullscreen();
  }
});
document.addEventListener('fullscreenchange', () => {
  syncFullscreen(); fullscreenButton.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && expanded) {
    expanded = false; syncFullscreen(); fullscreenButton.focus();
  }
});
