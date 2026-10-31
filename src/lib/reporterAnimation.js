import { fmt } from './market.js';

// Dialog der beiden Reporter: [Sprecher (0 = Reporterin, 1 = Reporter), Schlagzeile, Text(market)].
export const TURNS = [
  [0, 'GETRÄNKE-CRASH: HANDEL GESTOPPT', market => `${market.name}: von ${fmt(market.opening)} auf ${fmt(market.price)} Euro! Der Handel wurde ausgesetzt. Was bedeutet das für die Gäste?`],
  [1, 'DIE KURVE FÄLLT. DIE LAUNE STEIGT.', market => `Ganz einfach: ${market.name} bleibt bei ${fmt(market.price)} Euro. Die Börse macht Pause, die Bar zum Glück nicht.`],
  [0, 'EIL: JOHANNES BERUFT KRISENSTAB EIN', () => 'Heimleiter Johannes führt Krisengespräche mit Heimsprecherin Sarah. Auf der Tagesordnung: Wie konnte der Kurs so tief und die Stimmung so hoch steigen?'],
  [1, 'SARAH FORDERT FLÜSSIGE MITTEL', () => 'Sarah verlangt sofortige Liquidität. Johannes hat vorsorglich nachgefragt, ob damit das Heimkonto oder der nächste Krug gemeint ist.'],
  [0, 'HEIMLEITER UNTER DRUCK', () => 'Johannes steht unter Druck. Sarah prüft die Lage. Die Bar stellt klar: Beim Fass ist Druck ausdrücklich erwünscht.'],
  [1, 'RETTUNGSSCHIRM WIRD AUFGESPANNT', () => 'Johannes und Sarah beraten das weitere Vorgehen. Ein Rettungsschirm ist im Gespräch. Bisher verfügbar: drei Cocktail-Schirmchen.'],
  [0, 'KRISENGIPFEL GEHT IN VERLÄNGERUNG', () => 'Noch keine Einigung zwischen Johannes und Sarah. Man hat sich aber einstimmig darauf verständigt, die nächste Runde einzuläuten.'],
  [1, 'ERSTER BESCHLUSS: RUHE BEWAHREN', market => `Der Krisenstab meldet: ${market.name} bleibt bei ${fmt(market.price)} Euro. Johannes bittet um Ruhe. Sarah bestellt sie vorsichtshalber auf Eis.`],
  [0, 'AXEL FRIDOLIN ÜBERNIMMT DAS RUDER', () => 'Barchef Axel Fridolin legt seinen Rettungsplan vor: kurze Wege zur Theke, lange Öffnungszeiten. Johannes fragt, ob das schon als Strukturreform zählt.'],
  [1, 'BAR STABIL. KRISENSTAB DURSTIG.', () => 'Sarah fordert einen Lagebericht. Axel Fridolin meldet: Eis vorhanden, Gläser bereit. Damit ist die Bar besser vorbereitet als der Krisenstab.'],
  [0, 'KEVIN G PRÜFT DIE VERBINDUNG', () => 'Netzwerkler-CEO Kevin G wurde zur Krisensitzung gerufen. Seine erste Diagnose: Das Netzwerk steht. Abgestürzt sind nur die Preise.'],
  [1, 'NEUSTART VORERST ABGELEHNT', () => 'Kevin G empfiehlt: einmal aus- und wieder einschalten. Sarah lehnt ab. Bei diesen Preisen möchte niemand riskieren, dass die Börse wieder hochfährt.'],
  [0, 'SIMON B MIT SONDERAUFTRAG', () => 'Johannes schickt Simon B zur Lageerkundung an die Bar. Er soll prüfen, ob die günstigen Kurse auch in der Praxis funktionieren.'],
  [1, 'PRÜFUNG DAUERT AN', () => 'Simon B meldet sich von der Theke: Die Stichprobe sei vielversprechend, aber noch nicht repräsentativ. Er bittet um Verlängerung seines Forschungsauftrags.']
];

// Wie lange jede Meldung stehen bleibt (ms).
export const TURN_DURATION = 9000;

export const captionFor = speaker => (speaker === 0 ? 'Reporterin · live im Gespräch' : 'Reporter · live im Gespräch');

const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

const FACES = [
  { x: 603, y: 486, radius: 46, eyes: [[574, 366], [671, 377]], phase: 0 },
  { x: 1183, y: 435, radius: 42, eyes: [[1133, 305], [1209, 300]], phase: 2.1 }
];

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
 * Startet die Gesichts- und Körperanimation auf `canvas` anhand des Studiobilds
 * `photo` (Gesichtspunkte im Studiobild 1672 × 941).
 * `onFrame(time)` liefert den aktuellen Sprecherindex (0/1) zurück.
 * Gibt eine Stopp-Funktion zurück.
 */
export function startReporterAnimation(photo, canvas, onFrame) {
  canvas.width = photo.naturalWidth;
  canvas.height = photo.naturalHeight;
  const output = canvas.getContext('2d');
  const scene = document.createElement('canvas');
  scene.width = canvas.width;
  scene.height = canvas.height;
  const context = scene.getContext('2d');
  if (!context || !output) return () => {};
  const scale = photo.naturalWidth / 1672;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Das fertig animierte Gesicht und der Körper bewegen sich gemeinsam.
  // Studio-Logos und Bauchbinde bleiben dabei fest an ihrer Position.
  function bodyPoint(x, y, seconds, active, speaking) {
    const edge = smooth((y - 85) / 70) * smooth((789 - y) / 65)
      * smooth(x / 100) * smooth((1672 - x) / 70);
    let dx = 0;
    let dy = 0;
    [
      { x: 530, headX: 580, headY: 335, phase: 0 },
      { x: 1300, headX: 1255, headY: 285, phase: 1.8 }
    ].forEach((person, index) => {
      const phase = seconds + person.phase;
      const body = Math.exp(-(((x - person.x) / 285) ** 4));
      const head = Math.exp(-(((x - person.headX) / 210) ** 4)
        - (((y - person.headY) / 265) ** 4));
      const chest = smooth((y - 380) / 220);
      const isTalking = active === index && speaking;
      const breath = Math.sin(phase * 1.65);
      const sway = Math.sin(phase * 0.8) * 3.5;
      const angle = Math.sin(phase * 1.1) * 0.006
        + (isTalking ? Math.sin(phase * 3.6) * 0.009 : Math.sin(phase * 2.1) * 0.003);
      dx += body * (sway + (x - person.x) * breath * 0.004 * chest);
      dy += body * (-breath * 2.4 * chest);
      dx -= (y - person.headY) * angle * head;
      dy += ((x - person.headX) * angle
        + Math.sin(phase * (isTalking ? 4.1 : 1.7)) * (isTalking ? 3.2 : 1.2)) * head;
      // Kleine Bewegung der Mikrofonhand, ohne neue Armhaltungen zu erfinden.
      const hand = Math.exp(-(((x - (index === 0 ? 610 : 1170)) / 105) ** 2)
        - (((y - 719) / 100) ** 2));
      dy += hand * Math.sin(phase * 2.8) * (isTalking ? 3.5 : 1);
    });
    // Die linke Nase bleibt ein fester Anker, auch beim Kopfnicken.
    const noseDistance = Math.hypot((x - 611) / 44, (y - 439) / 30);
    const noseAnchor = smooth((noseDistance - 1) / 0.8);
    return { x: (x + dx * edge * noseAnchor) * scale, y: (y + dy * edge * noseAnchor) * scale };
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
        const x = column / columns * 1672;
        const y = 85 + row / rows * (789 - 85);
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
    face.eyes.forEach(([eyeX, eyeY]) => {
      for (let x = eyeX - 35; x < eyeX + 35; x += 2) {
        const horizontal = Math.exp(-(((x + 1 - eyeX) / 23) ** 4));
        const targetY = y => {
          const d = y - eyeY;
          return eyeY + d * (1 - closure * 0.92 * horizontal * Math.exp(-((d / 12) ** 2)));
        };
        for (let y = eyeY - 38; y < eyeY + 38; y += 2) {
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
    const active = onFrame(time);
    context.drawImage(photo, 0, 0);
    if (reducedMotion.matches) {
      output.drawImage(scene, 0, 0);
      return;
    }
    const turnStarted = time - time % TURN_DURATION;
    const elapsed = time - turnStarted;
    const speaking = elapsed > 250 && elapsed < TURN_DURATION - 750 && elapsed % 1900 < 1550;
    const syllable = speaking ? mouthOpening(elapsed - 250) : 0;

    FACES.forEach((face, index) => {
      // Vorhandene Lippen und Zähne werden geschlossen/geöffnet, ohne
      // gezeichneten Mund oder fremde Zahnbereiche einzublenden.
      const openness = index === active && speaking
        ? 0.2 + syllable * (index === 0 ? 1.55 : 1.35)
        : 0.2;
      const cx = face.x * scale;
      const cy = face.y * scale;
      const radius = face.radius * scale;
      const step = 3 * scale;
      for (let x = cx - radius * 2.5; x < cx + radius * 2.5; x += step) {
        const weightX = Math.exp(-(((x + step / 2 - cx) / radius) ** 4));
        const targetY = y => {
          const d = y - cy;
          // Oberhalb der linken Oberlippe keine Verformung der Nase.
          const lipOnly = index === 0 ? smooth((y / scale - 463) / 14) : 1;
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
  frame = requestAnimationFrame(render);
  return () => cancelAnimationFrame(frame);
}
