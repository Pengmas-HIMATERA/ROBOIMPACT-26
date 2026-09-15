import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { element } from './dom';
import type { Arena } from './types';
import { CHASSIS_LENGTH, CHASSIS_WIDTH, WHEEL_RADIUS, WHEEL_TRACK, SENSOR_FORWARD, SENSOR_OFFSETS } from './robot';
import { paperSide } from './track';
import trackImage from './assets/track.png';

type CameraMode = 'perspective' | 'top' | 'side' | 'follow';

export function createArena(host: HTMLElement): Arena {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dedfd4');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', 'Simulasi robot 3D dengan controller PID');
  host.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    const status = element('scene-status');
    status.hidden = false;
    status.textContent = 'Konteks grafis terputus. Muat ulang halaman untuk memulihkan arena 3D.';
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 180;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  scene.add(new THREE.HemisphereLight(0xd6f7ff, 0x293d42, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-3, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6 });
  sun.shadow.normalBias = .035;
  scene.add(sun);

  const material = (color: THREE.ColorRepresentation, metalness = .15) => new THREE.MeshStandardMaterial({ color, roughness: .48, metalness });
  const teal = material(0xc55732, .45), dark = material(0x182630), rubber = material(0x080e14);
  const silver = material(0x8cabb8, .7), gold = material(0xf2c578);
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const box = (w: number, h: number, d: number, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z);
  const straightRoad = new THREE.Group(); scene.add(straightRoad);
  const floor = box(12, .15, 40, material(0xa9ac9d), straightRoad, 0, -.12, -6);
  box(.13, .014, 40, material(0x090e13), straightRoad, 0, -.025, -6);
  box(.04, .02, 40, silver, straightRoad, -4, -.02, -6);
  box(.04, .02, 40, silver, straightRoad, 4, -.02, -6);
  const roadMarkers: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i++) {
    for (const x of [-4.5, 4.5]) roadMarkers.push(box(.45, .015, .06, dark, straightRoad, x, -.02, i * 2 - 24));
  }

  const trackTexture = new THREE.TextureLoader().load(trackImage, undefined, undefined, () => {
    element('scene-status').hidden = false;
    element('scene-status').textContent = 'Gambar track gagal dimuat; muat ulang halaman.';
  });
  trackTexture.colorSpace = THREE.SRGBColorSpace;
  trackTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const pdfBoard = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: trackTexture, roughness: 1 }));
  pdfBoard.rotation.x = -Math.PI / 2;
  pdfBoard.receiveShadow = true;
  scene.add(pdfBoard);

  function label(text: string, color: string, width = 1.9) {
    const canvas = document.createElement('canvas');
    canvas.width = 384; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D tidak tersedia untuk label arena');
    ctx.fillStyle = 'rgba(10,20,28,0.86)'; ctx.fillRect(0, 0, 384, 96);
    ctx.fillStyle = color; ctx.font = '600 46px Segoe UI, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 192, 48);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.scale.set(width, width / 4, 1);
    sprite.renderOrder = 5;
    return sprite;
  }
  const lineLabel = label('GARIS · x = 0', '#f2c578', 2.4);
  lineLabel.position.set(0, .25, -8); scene.add(lineLabel);
  const forwardLabel = label('MAJU ↑', '#68e5d5', 1.8);
  forwardLabel.position.set(-2.5, .1, -5); scene.add(forwardLabel);

  const robot = new THREE.Group();
  scene.add(robot);
  const carbon = material(0x202725);
  const pcb = material(0x264e3e);
  const orange = material(0xf4a034);
  // Rear electronics deck, with one driven wheel on each side of the axle.
  // Chamfered CNC-style deck with real mounting holes.
  const outline = new THREE.Shape();
  const halfL = CHASSIS_LENGTH / 2, halfW = CHASSIS_WIDTH / 2;
  const corners = [[-halfL+.08,-halfW],[halfL-.12,-halfW],[halfL,-halfW+.12],
    [halfL,halfW-.12],[halfL-.12,halfW],[-halfL+.08,halfW],[-halfL,halfW-.08],[-halfL,-halfW+.08]];
  corners.forEach(([x,z],i) => i ? outline.lineTo(x,z) : outline.moveTo(x,z)); outline.closePath();
  for (const x of [-.32,.22]) for(const z of [-.3,.3]) {
    const hole = new THREE.Path(); hole.absarc(x,z,.025,0,Math.PI*2,true); outline.holes.push(hole);
  }
  const deck = mesh(new THREE.ExtrudeGeometry(outline,{depth:.045,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:2,steps:1}),carbon,robot,-.1,.27,0);
  deck.rotation.x=Math.PI/2;
  box(.53, .055, .57, pcb, robot, -.13, .355, 0);
  box(.24, .055, .24, dark, robot, -.13, .41, 0);
  box(.32, .14, .23, dark, robot, -.32, .495, 0);
  for (const z of [-.26, .26]) for (const x of [-.32, .07]) {
    box(.035, .08, .035, silver, robot, x, .3, z);
    for (let i = 0; i < 5; i++) box(.022, .028, .032, silver, robot, -.28 + i * .065, .4, z);
  }
  // Pin headers, processor legs, USB socket and power components.
  for (const z of [-.18,.18]) {
    box(.39,.045,.05,dark,robot,-.12,.417,z);
    for(let n=0;n<8;n++) box(.012,.028,.022,gold,robot,-.28+n*.045,.449,z);
  }
  for(let n=0;n<7;n++) for(const z of [-.128,.128]) box(.012,.012,.037,silver,robot,-.23+n*.033,.397,z);
  box(.1,.06,.14,silver,robot,.13,.41,0);
  box(.012,.039,.105,dark,robot,.185,.41,0);
  for(const z of [-.2,.2]) {
    mesh(new THREE.CylinderGeometry(.035,.035,.09,16),dark,robot,-.33,.432,z);
    mesh(new THREE.CylinderGeometry(.029,.029,.005,16),silver,robot,-.33,.48,z);
  }
  for(let n=0;n<4;n++) {
    box(.035,.018,.02,material(0xb8ad8c),robot,.035,.396,-.11+n*.07);
  }
  box(.035,.023,.026,material(0x8bd67a),robot,.07,.412,.22);
  // Battery retention strap.
  box(.045,.012,.25,carbon,robot,-.32,.57,0);
  for(const z of [-.32,.32]) for(const x of [-.4,.12]) {
    const screw=mesh(new THREE.CylinderGeometry(.022,.022,.012,12),silver,robot,x,.286,z);
    box(.027,.003,.005,dark,screw,0,.007,0);
  }
  const printCanvas=document.createElement('canvas'); printCanvas.width=512;printCanvas.height=256;
  const printContext=printCanvas.getContext('2d');
  if(printContext) {
    printContext.fillStyle='#d9e7d2'; printContext.font='bold 38px monospace';
    printContext.fillText('ROBOIMPACT',20,52);printContext.font='24px monospace';
    printContext.fillText('R01 / LINE CTRL',20,94);
    printContext.strokeStyle='#94b8a2';printContext.lineWidth=3;
    for(let n=0;n<5;n++){printContext.beginPath();printContext.moveTo(25+n*70,130);printContext.lineTo(25+n*70,180);printContext.lineTo(55+n*70,210);printContext.stroke();}
    const ink=new THREE.CanvasTexture(printCanvas);ink.colorSpace=THREE.SRGBColorSpace;
    const decal=mesh(new THREE.PlaneGeometry(.43,.2),new THREE.MeshBasicMaterial({map:ink,transparent:true,depthWrite:false}),robot,-.1,.388,.27);
    decal.rotation.x=-Math.PI/2;
  }
  const wheels: THREE.Group[] = [];
  for (const z of [-WHEEL_TRACK / 2, WHEEL_TRACK / 2]) {
    box(.28, .17, .19, silver, robot, 0, WHEEL_RADIUS, z * .58);
    box(.12,.19,.16,orange,robot,.11,WHEEL_RADIUS,z*.57);
    box(.065,.22,.22,carbon,robot,-.1,WHEEL_RADIUS,z*.58);
    const axle=mesh(new THREE.CylinderGeometry(.022,.022,.24,12),silver,robot,0,WHEEL_RADIUS,z*.77);
    axle.rotation.x=Math.PI/2;
    const wheel = new THREE.Group(); wheel.position.set(0, WHEEL_RADIUS, z); robot.add(wheel);
    const tire = mesh(new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, .12, 32), orange, wheel);
    tire.rotation.x = Math.PI / 2;
    const hub = mesh(new THREE.CylinderGeometry(.085, .085, .135, 20), dark, wheel);
    hub.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      box(.03, .03, .14, silver, wheel, Math.cos(angle) * .055, Math.sin(angle) * .055, 0);
    }
    for(const edge of [-.048,.048]) {
      mesh(new THREE.TorusGeometry(WHEEL_RADIUS-.008,.008,6,40),carbon,wheel,0,0,edge);
    }
    for(let n=0;n<24;n++) {
      const angle=n*Math.PI/12;
      const tread=box(.009,.007,.093,material(0xc58128),wheel,Math.cos(angle)*(WHEEL_RADIUS-.002),Math.sin(angle)*(WHEEL_RADIUS-.002),0);
      tread.rotation.z=angle-Math.PI/2;
    }
    wheels.push(wheel);
  }
  // Narrow front boom with low sensor bar, like the supplied line-follower photo.
  const boom = box(.85, .045, .15, carbon, robot, .53, .19, 0);
  boom.rotation.z = -.08;
  box(.15, .05, .91, carbon, robot, SENSOR_FORWARD, .15, 0);
  box(.11,.018,.84,pcb,robot,SENSOR_FORWARD,.18,0);
  const sensorLights = SENSOR_OFFSETS.map(z => {
    box(.09, .055, .085, dark, robot, SENSOR_FORWARD, .105, z);
    for(const dx of [-.024,.024]) mesh(new THREE.SphereGeometry(.017,10,8),material(0x16222c),robot,SENSOR_FORWARD+dx,.079,z);
    box(.025,.012,.045,silver,robot,SENSOR_FORWARD-.04,.194,z);
    return mesh(new THREE.SphereGeometry(.022, 12, 8), material(0x333333), robot, SENSOR_FORWARD, .19, z);
  });
  for (const z of [-.41, .41]) mesh(new THREE.SphereGeometry(.033, 12, 8), silver, robot, SENSOR_FORWARD, .19, z);
  [0xe55738, 0xf3c44e, 0x4385c5, 0xe8e5da].forEach((color, index) => {
    const z = (index - 1.5) * .026;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.2, .435, z), new THREE.Vector3(.14, .355, z),
      new THREE.Vector3(.52, .23, z), new THREE.Vector3(.9, .2, z)
    ]);
    mesh(new THREE.TubeGeometry(path, 16, .009, 6, false), material(color), robot);
  });
  const robotLabel = label('ROBOT R–01', '#68e5d5');
  robotLabel.position.set(0, 1.3, -.65); robot.add(robotLabel);

  const errorArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xf2c578, .16, .1);
  const forceArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xb5a0ff, .2, .13);
  scene.add(errorArrow, forceArrow);
  const errorLabel = label('ERROR e', '#f2c578', 1.5); scene.add(errorLabel);
  const forceLabel = label('ARAH BELOK', '#b5a0ff', 1.7); scene.add(forceLabel);
  const pushArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xff725f, .25, .18);
  scene.add(pushArrow);
  const pushLabel = label('GAYA LUAR', '#ff927f', 1.8); scene.add(pushLabel);
  const trailGeometry = new THREE.BufferGeometry();
  const trailPositions = new THREE.Float32BufferAttribute(new Float32Array(400 * 3), 3);
  trailPositions.setUsage(THREE.DynamicDrawUsage);
  trailGeometry.setAttribute('position', trailPositions);
  trailGeometry.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: 0x997942 }));
  trail.frustumCulled = false;
  scene.add(trail);
  const trace: { x: number; forward: number; t: number }[] = [];
  const direction = new THREE.Vector3();
  let mode: CameraMode = 'top';
  let pdfMode = true, trackKey = '';
  let showLabels = false;
  let extent = 6, lastTime = 0;
  function setCamera(nextMode: CameraMode = mode) {
    mode = nextMode;
    const distance = extent * Math.max(1, 1.45 / camera.aspect);
    controls.target.set(0, .15, pdfMode ? 0 : -3);
    if (mode === 'top') camera.position.set(0, distance * 1.8, pdfMode ? .01 : -2.99);
    else if (mode === 'side') camera.position.set(0, distance * .4, distance * 2.1);
    else camera.position.set(distance * .65, distance * 1.2, distance * 1.4);
    if (mode === 'follow') {
      const close = 5 * Math.max(1, 1 / camera.aspect);
      controls.target.set(robot.position.x, .15, robot.position.z);
      camera.position.set(robot.position.x + close * .6, close * 1.2, robot.position.z + close);
    }
    controls.update();
    document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.classList.toggle('active', button.dataset.camera === mode));
  }
  document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.camera;
    if (next === 'perspective' || next === 'top' || next === 'side' || next === 'follow') setCamera(next);
  }));
  controls.addEventListener('start', () => document.querySelectorAll('[data-camera]').forEach(button => button.classList.remove('active')));
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    setCamera();
  });
  resize.observe(host);
  setCamera();

  return {
    setLabels(visible) { showLabels = visible; },
    update(state, config) {
      sensorLights.forEach((light, index) => {
        const mat = light.material as THREE.MeshStandardMaterial;
        mat.color.setHex(state.sensors[index] > 100 ? 0xefb64c : 0x333333);
      });
      pdfMode = config.track === 'pdf';
      const key = String(pdfMode) + config.boardMeters;
      if (key !== trackKey) {
        trackKey = key; extent = pdfMode ? paperSide(config) * .85 : 6;
        setCamera(); trace.length = 0;
      }
      straightRoad.visible = !pdfMode;
      pdfBoard.visible = pdfMode;
      pdfBoard.scale.setScalar(paperSide(config));
      const robotZ = pdfMode ? -state.forward : 0;
      robot.position.z = robotZ;
      robot.position.x = state.x;
      robot.rotation.y = Math.PI / 2 - state.heading;
      const elapsed = Math.max(0, state.t - lastTime);
      if (state.t < lastTime) { trace.length = 0; for (const wheel of wheels) wheel.rotation.z = 0; }
      for (const wheel of wheels) {
        const speed = wheel.position.z < 0 ? state.leftMotor : state.rightMotor;
        wheel.rotation.z -= speed * elapsed / WHEEL_RADIUS;
      }
      lastTime = state.t;
      for (let i = 0; i < roadMarkers.length; i++) {
        roadMarkers[i].position.z = ((state.forward + Math.floor(i / 2) * 2) % 36 + 36) % 36 - 26;
      }
      if (!trace.length || state.t - trace[trace.length - 1].t > .05) {
        trace.push({ x: state.x, forward: state.forward, t: state.t });
        if (trace.length > 400) trace.shift();
      }
      trace.forEach((point, index) => trailPositions.setXYZ(index, point.x, .012, (pdfMode ? 0 : state.forward) - point.forward));
      trailPositions.needsUpdate = true;
      trailGeometry.setDrawRange(0, trace.length);
      // Follow longitudinal progress; expand the view only for large lateral excursions.
      const needed = Math.max(6, Math.abs(state.x) + 2);
      if (!pdfMode && (needed > extent + .5 || (state.t < .02 && extent !== 6))) {
        extent = needed; floor.scale.x = extent / 6; setCamera();
      }
      const error = -state.x;
      errorArrow.visible = errorLabel.visible = Math.abs(error) > .04;
      errorArrow.position.set(state.x, .15, 1.1);
      errorArrow.setDirection(direction.set(Math.sign(error) || 1, 0, 0));
      errorArrow.setLength(Math.max(.001, Math.abs(error)), Math.min(.16, Math.abs(error) * .3), .1);
      errorLabel.position.set(state.x / 2, .45, 1.4);
      forceArrow.visible = forceLabel.visible = Math.abs(state.u) > .08;
      forceArrow.position.set(state.x, .7, -.65);
      const steering = state.heading + state.yawRate * .35;
      forceArrow.setDirection(direction.set(Math.sin(steering), 0, -Math.cos(steering)));
      forceArrow.setLength(1.3, .2, .13);
      forceLabel.position.set(state.x + Math.sin(steering) * 1.8, 1.1, -.65 - Math.cos(steering) * 1.8);
      const force = state.finished ? 0 : (state.pushRemaining > 0 ? state.push : 0) + config.bias;
      const pushX = Math.cos(state.heading) * Math.sign(force);
      const pushZ = Math.sin(state.heading) * Math.sign(force);
      pushArrow.visible = pushLabel.visible = Math.abs(force) > .01;
      pushArrow.position.set(state.x - pushX * 2, .65, -pushZ * 2);
      pushArrow.setDirection(direction.set(pushX || (force === 0 ? 1 : 0), 0, pushZ));
      pushArrow.setLength(1.6, .25, .18);
      pushLabel.position.set(state.x - pushX * 2, 1.1, -pushZ * 2 + .3);
      for (const object of [errorArrow, errorLabel, forceArrow, forceLabel, pushArrow, pushLabel]) object.position.z += robotZ;
      if (pdfMode) errorArrow.visible = false;
      robotLabel.visible = showLabels;
      lineLabel.visible = forwardLabel.visible = showLabels && !pdfMode;
      errorLabel.visible = showLabels && errorArrow.visible;
      forceLabel.visible = showLabels && forceArrow.visible;
      pushLabel.visible = showLabels && pushArrow.visible;
      if (mode === 'follow') {
        camera.position.x += robot.position.x - controls.target.x;
        camera.position.z += robot.position.z - controls.target.z;
        controls.target.set(robot.position.x, .15, robot.position.z);
      }
      controls.update();
      renderer.render(scene, camera);
    }
  };
}
