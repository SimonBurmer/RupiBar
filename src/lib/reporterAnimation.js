import { TURN_DURATION } from './scenes.js';

export { TURN_DURATION } from './scenes.js';

const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

// Unterschiedlich lange Silben und Lippenverschlüsse statt einer Sinuswelle.
const SYLLABLES = [
  [130, 0], [180, 0.85], [110, 0.2], [220, 1], [90, 0],
  [170, 0.55], [140, 0.15], [240, 0.75], [160, 0],
  [190, 0.9], [120, 0.3], [200, 0.65], [310, 0]
];
const CYCLE_LENGTH = SYLLABLES.reduce((total, syllable) => total + syllable[0], 0);

function mouthOpening(elapsed) {
  let position = elapsed % CYCLE_LENGTH;
  for (const [duration, strength] of SYLLABLES) {
    if (position < duration) {
      const phase = position / duration;
      return strength * Math.pow(Math.sin(Math.PI * phase), 0.75);
    }
    position -= duration;
  }
  return 0;
}

/**
 * Startet die Gesichts- und Körperanimation einer Szene (siehe scenes.js) auf
 * `canvas`. `photo` ist das geladene Szenenbild. `onFrame(time)` liefert
 * { speaker, turnElapsed } zurück: wer gerade spricht und seit wann (ms).
 * Gibt eine Stopp-Funktion zurück.
 */
export function startReporterAnimation(sceneConfig, photo, canvas, onFrame) {
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const output = canvas.getContext('2d');
  const scene = document.createElement('canvas');
  scene.width = canvas.width;
  scene.height = canvas.height;
  const context = scene.getContext('2d');
  if (!context || !output) return () => {};
  const scale = photo.naturalWidth / sceneConfig.width;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const { faces, bodies, noseAnchor, mesh } = sceneConfig;

  // Das fertig animierte Gesicht und der Körper bewegen sich gemeinsam.
  // Logos und Bauchbinde liegen außerhalb von `mesh` und bleiben fest.
  function bodyPoint(x, y, seconds, active, speaking) {
    const edge = smooth((y - mesh.top) / mesh.fadeTop) * smooth((mesh.bottom - y) / mesh.fadeBottom)
      * smooth((x - mesh.left) / mesh.fadeLeft) * smooth((mesh.right - x) / mesh.fadeRight);
    let dx = 0;
    let dy = 0;
    bodies.forEach((person, index) => {
      const phase = seconds + person.phase;
      const body = Math.exp(-(((x - person.x) / 285) ** 4));
      const head = Math.exp(-(((x - person.headX) / 210) ** 4)
        - (((y - person.headY) / 265) ** 4));
      const chest = smooth((y - 380) / 220);
      const isTalking = active === index && speaking;
      const breath = Math.sin(phase * 1.65);
      const sway = Math.sin(phase * 0.8) * (person.sway ?? 3.5);
      const angle = Math.sin(phase * 1.1) * 0.006
        + (isTalking ? Math.sin(phase * 3.6) * 0.009 : Math.sin(phase * 2.1) * 0.003);
      dx += body * (sway + (x - person.x) * breath * 0.004 * chest);
      dy += body * (-breath * 2.4 * chest);
      dx -= (y - person.headY) * angle * head;
      dy += ((x - person.headX) * angle
        + Math.sin(phase * (isTalking ? 4.1 : 1.7)) * (isTalking ? 3.2 : 1.2)) * head;
      // Kleine Bewegung der Mikrofonhand, ohne neue Armhaltungen zu erfinden.
      if (person.hand) {
        const hand = Math.exp(-(((x - person.hand[0]) / 105) ** 2)
          - (((y - person.hand[1]) / 100) ** 2));
        dy += hand * Math.sin(phase * 2.8) * (isTalking ? 3.5 : 1);
      }
    });
    // Optional bleibt ein Punkt (z. B. eine Nase) fest verankert, auch beim Kopfnicken.
    const anchor = noseAnchor
      ? smooth((Math.hypot((x - noseAnchor.x) / noseAnchor.rx, (y - noseAnchor.y) / noseAnchor.ry) - 1) / 0.8)
      : 1;
    return { x: (x + dx * edge * anchor) * scale, y: (y + dy * edge * anchor) * scale };
  }

  function drawTriangle(a, b, c, pa, pb, pc) {
    // Affine Abbildung eines Dreiecks hält Lippen und Gesicht deckungsgleich.
    const determinant = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    const ux = (pb.x - pa.x) / determinant;
    const vx = (pc.x - pa.x) / determinant;
    const uy = (pb.y - pa.y) / determinant;
    const vy = (pc.y - pa.y) / determinant;
    const m11 = ux * (c.y - a.y) - vx * (b.y - a.y);
    const m21 = vx * (b.x - a.x) - ux * (c.x - a.x);
    const m12 = uy * (c.y - a.y) - vy * (b.y - a.y);
    const m22 = vy * (b.x - a.x) - uy * (c.x - a.x);
    output.save();
    output.beginPath();
    output.moveTo(pa.x, pa.y);
    output.lineTo(pb.x, pb.y);
    output.lineTo(pc.x, pc.y);
    output.closePath();
    output.clip();
    output.setTransform(m11, m12, m21, m22,
      pa.x - m11 * a.x - m21 * a.y, pa.y - m12 * a.x - m22 * a.y);
    output.drawImage(scene, 0, 0);
    output.restore();
  }

  function animateBodies(time, active, speaking) {
    output.drawImage(scene, 0, 0);
    const columns = 28;
    const rows = 18;
    const vertices = [];
    for (let row = 0; row <= rows; row++) {
      vertices[row] = [];
      for (let column = 0; column <= columns; column++) {
        const x = mesh.left + column / columns * (mesh.right - mesh.left);
        const y = mesh.top + row / rows * (mesh.bottom - mesh.top);
        vertices[row][column] = {
          source: { x: x * scale, y: y * scale },
          target: bodyPoint(x, y, time / 1000, active, speaking)
        };
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const a = vertices[row][column];
        const b = vertices[row][column + 1];
        const c = vertices[row + 1][column];
        const d = vertices[row + 1][column + 1];
        drawTriangle(a.source, b.source, c.source, a.target, b.target, c.target);
        drawTriangle(b.source, d.source, c.source, b.target, d.target, c.target);
      }
    }
  }

  function blink(face, time) {
    const phase = (time / 1000 + face.phase) % 5.3;
    const closure = phase < 0.19 ? Math.sin(phase / 0.19 * Math.PI) ** 2 : 0;
    if (closure < 0.01) return;
    const width = face.eyeWidth ?? 23;
    const height = face.eyeHeight ?? 12;
    const reachX = Math.round(width * 35 / 23);
    const reachY = Math.round(height * 38 / 12);
    face.eyes.forEach(([eyeX, eyeY]) => {
      for (let x = eyeX - reachX; x < eyeX + reachX; x += 2) {
        const horizontal = Math.exp(-(((x + 1 - eyeX) / width) ** 4));
        const targetY = y => {
          const d = y - eyeY;
          return eyeY + d * (1 - closure * 0.92 * horizontal * Math.exp(-((d / height) ** 2)));
        };
        for (let y = eyeY - reachY; y < eyeY + reachY; y += 2) {
          const from = targetY(y);
          const to = targetY(y + 2);
          context.drawImage(photo, x * scale, y * scale, 2 * scale, 2 * scale,
            x * scale, from * scale, 2 * scale, (to - from) * scale + 0.1);
        }
      }
    });
  }

  let previousFrame = -Infinity;
  let frame = 0;

  function render(time) {
    frame = requestAnimationFrame(render);
    if (document.hidden || time - previousFrame < 40) return;
    previousFrame = time;
    const { speaker: active, turnElapsed: elapsed } = onFrame(time);
    context.drawImage(photo, 0, 0);
    if (reducedMotion.matches) {
      output.drawImage(scene, 0, 0);
      return;
    }
    const speaking = elapsed > 250 && elapsed < TURN_DURATION - 750 && elapsed % 1900 < 1550;
    const syllable = speaking ? mouthOpening(elapsed - 250) : 0;

    faces.forEach((face, index) => {
      // Vorhandene Lippen und Zähne werden geschlossen/geöffnet, ohne
      // gezeichneten Mund oder fremde Zahnbereiche einzublenden.
      const rest = face.rest ?? 0.2;
      const openness = index === active && speaking ? rest + syllable * face.gain : rest;
      const cx = face.x * scale;
      const cy = face.y * scale;
      const radius = face.radius * scale;
      const step = 3 * scale;
      for (let x = cx - radius * 2.5; x < cx + radius * 2.5; x += step) {
        const weightX = Math.exp(-(((x + step / 2 - cx) / radius) ** 4));
        const targetY = y => {
          const d = y - cy;
          // Oberhalb der Oberlippe (lipTop) keine Verformung der Nase.
          const lipOnly = face.lipTop === undefined ? 1 : smooth((y / scale - face.lipTop) / face.lipFade);
          return cy + d * (1 + (openness - 1) * weightX * lipOnly * Math.exp(-((d / (radius * 0.72)) ** 2)));
        };
        for (let y = cy - radius * 2.5; y < cy + radius * 2.5; y += step) {
          const from = targetY(y);
          const to = targetY(y + step);
          context.drawImage(photo, x, y, step, step, x, from, step, to - from + 0.12);
        }
      }
      blink(face, time);
    });
    animateBodies(time, active, speaking);
  }
  // Erstes Bild sofort zeichnen, damit beim Szenenwechsel kein leerer Rahmen aufblitzt.
  render(performance.now());
  return () => cancelAnimationFrame(frame);
}
