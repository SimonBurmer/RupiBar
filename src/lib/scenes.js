import { fmt } from './market.js';

// Reporter-Szenen. Eine neue Szene = ein Bild in src/assets/scenes/ und ein Eintrag hier.
// Alle Koordinaten sind Pixel im Referenzbild (`width` × `height`); die Animation
// rechnet sie auf die tatsächliche Bildgröße um.
//
// faces:  Mund (x, y, radius), Augen [[x, y], …], Blinzelphase, optional
//         lipTop/lipFade (oberhalb von lipTop wird nichts verformt, schützt die Nase),
//         rest/gain (Mundöffnung in Ruhe und beim Sprechen), eyeWidth/eyeHeight.
// bodies: Körpermitte x, Kopf headX/headY, Phase, optional sway (Pixel) und
//         hand: [x, y] für eine leicht wippende Mikrofonhand.
// noseAnchor: optionaler fester Punkt { x, y, rx, ry }, der sich nie bewegt.
// mesh:   Bereich, der sich bewegen darf (Logos und Bauchbinde liegen außerhalb).
// turns:  [Sprecher (Index in captions), Schlagzeile, Text(market)].

export const SCENE_DURATION = 30000;

export const SCENES = [
  {
    id: 'studio',
    image: new URL('../assets/scenes/studio.png', import.meta.url).href,
    alt: 'Unsere beiden Reporter im Börsenstudio',
    width: 1672,
    height: 941,
    captions: ['Reporterin · live im Gespräch', 'Reporter · live im Gespräch'],
    faces: [
      { x: 603, y: 486, radius: 46, eyes: [[574, 366], [671, 377]], phase: 0, gain: 1.55, lipTop: 463, lipFade: 14 },
      { x: 1183, y: 435, radius: 42, eyes: [[1133, 305], [1209, 300]], phase: 2.1, gain: 1.35 }
    ],
    bodies: [
      { x: 530, headX: 580, headY: 335, phase: 0, hand: [610, 719] },
      { x: 1300, headX: 1255, headY: 285, phase: 1.8, hand: [1170, 719] }
    ],
    noseAnchor: { x: 611, y: 439, rx: 44, ry: 30 },
    mesh: { top: 85, bottom: 789, left: 0, right: 1672, fadeTop: 70, fadeBottom: 65, fadeLeft: 100, fadeRight: 70 },
    turns: [
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
    ]
  },
  {
    id: 'brauerei',
    image: new URL('../assets/scenes/brauerei.png', import.meta.url).href,
    alt: 'Unsere Reporterin interviewt einen verzweifelten Bierbrauer in der Brauerei',
    width: 1600,
    height: 900,
    captions: ['Reporterin · live aus München', 'Bierbrauer · live aus München'],
    faces: [
      { x: 504, y: 459, radius: 24, eyes: [[473, 384]], phase: 1.2, gain: 1.4, lipTop: 446, lipFade: 7, eyeWidth: 13, eyeHeight: 6 },
      { x: 1010, y: 411, radius: 32, eyes: [[945, 291], [1025, 286]], phase: 3.4, rest: 0.55, gain: 0.75, lipTop: 381, lipFade: 9, eyeWidth: 16, eyeHeight: 8 }
    ],
    bodies: [
      { x: 380, headX: 430, headY: 360, phase: 0.6, hand: [845, 665] },
      { x: 1190, headX: 1020, headY: 280, phase: 2.4, sway: 2 }
    ],
    mesh: { top: 90, bottom: 752, left: 0, right: 1600, fadeTop: 70, fadeBottom: 60, fadeLeft: 100, fadeRight: 70 },
    turns: [
      [0, 'BRAUEREI IN DER KRISE', market => `${market.name} bei ${fmt(market.price)} Euro! Wir sind live in München. Wie fühlt man sich als Brauer an so einem Tag?`],
      [1, '„ICH HAB DOCH NUR GEBRAUT!“', () => 'Gestern war Bier noch ein solides Investment. Heute rechnet mir die RUPI BAR vor, dass mein Sudkessel mehr wert ist als die ganze Ernte.'],
      [0, 'HOPFEN UND MALZ: VERLOREN?', () => 'Experten sprechen bereits vom schwärzesten Tag seit Erfindung des Reinheitsgebots. Haben Sie einen Plan B?'],
      [1, 'PLAN B: SELBER TRINKEN', () => 'Wenn ich es nicht mehr verkaufen kann, muss ich es eben selbst vernichten. Halbe für Halbe. Ich bin bereit, dieses Opfer zu bringen.'],
      [0, 'BÖRSENAUFSICHT ERMITTELT', market => `An der Halloween Exchange notiert ${market.name} bei ${fmt(market.price)} Euro, Eröffnung war ${fmt(market.opening)}. Wer ist schuld?`],
      [1, 'SCHULDIGER GEFUNDEN: DER DURST', () => 'Die Gäste! Sie trinken schneller, als ich brauen kann, und trotzdem fällt der Preis. Das widerspricht allem, was ich in der Berufsschule gelernt habe.'],
      [0, 'GANZ MÜNCHEN BLICKT AUF DIE RUPI BAR', () => 'Insider berichten, die halbe Belegschaft sei schon auf dem Weg zur RUPI BAR, um zu Tiefstpreisen nachzukaufen. Können Sie das bestätigen?'],
      [1, 'BRAUER KAUFT EIGENES BIER ZURÜCK', () => 'Kein Kommentar. Nur so viel: Mein Rucksack ist gepackt, und er ist auffallend leer.'],
      [0, 'LETZTE FRAGE AUS DER BRAUEREI', () => 'Was raten Sie unseren Zuschauern an der Theke?'],
      [1, 'BRAUER-TIPP: JETZT ZUSCHLAGEN', market => `Kaufen, solange ${market.name} bei ${fmt(market.price)} Euro steht. Und bitte Trinkgeld geben. Für mich. Ich brauche das gerade.`]
    ]
  },
  {
    id: 'getraenkemarkt',
    image: new URL('../assets/scenes/getraenkemarkt.png', import.meta.url).href,
    alt: 'Unsere Reporterin interviewt den jubelnden Bierliebhaber N. Arens im Getränkemarkt',
    width: 1600,
    height: 901,
    captions: ['Reporterin · live aus München', 'Bierliebhaber · live aus München'],
    faces: [
      { x: 538, y: 375, radius: 18, eyes: [[510, 305]], phase: 0.7, gain: 1.3, lipTop: 360, lipFade: 6, eyeWidth: 13, eyeHeight: 6 },
      { x: 930, y: 315, radius: 30, eyes: [[876, 247], [950, 212]], phase: 2.9, rest: 0.75, gain: 0.5, lipTop: 289, lipFade: 8, eyeWidth: 15, eyeHeight: 7 }
    ],
    bodies: [
      { x: 400, headX: 500, headY: 300, phase: 0.3, hand: [800, 610] },
      { x: 1060, headX: 930, headY: 250, phase: 2.1, sway: 2, hand: [1215, 265] }
    ],
    mesh: { top: 95, bottom: 752, left: 0, right: 1600, fadeTop: 70, fadeBottom: 60, fadeLeft: 100, fadeRight: 70 },
    turns: [
      [0, 'KURSSTURZ: DIE ERSTEN GEWINNER', market => `${market.name} bei ${fmt(market.price)} Euro! Wir sind im Getränkemarkt bei Bierliebhaber N. Arens. Wie fühlen Sie sich?`],
      [1, '„DER BESTE TAG MEINES LEBENS!“', () => 'Ich hab die ganze Nacht die Kurse beobachtet. Als der Bierindex fiel, bin ich sofort los. Das ist kein Kasten, das ist eine Geldanlage.'],
      [0, 'PRIVATANLEGER GREIFT ZU', () => 'Experten raten eigentlich zur Streuung. Wie viele Kästen sind es denn bei Ihnen?'],
      [1, 'STREUUNG: HELL, DUNKEL, WEISSBIER', () => 'Ich streue doch! Hell, Dunkel und Weißbier. Breiter kann man ein Portfolio nicht aufstellen.'],
      [0, 'BRAUER IN DER KRISE – UND SIE?', () => 'Ganz München spricht von einer Brauereikrise. Haben Sie da kein schlechtes Gewissen?'],
      [1, 'SOLIDARITÄT MIT DEN BRAUERN', () => 'Natürlich! Deshalb kaufe ich ja so viel. Jemand muss die Branche jetzt stützen, und ich nehme diese Verantwortung sehr ernst.'],
      [0, 'RUPI BAR MELDET ANSTURM', market => `An der Halloween Exchange notiert ${market.name} bei ${fmt(market.price)} Euro, Eröffnung war ${fmt(market.opening)}. Fahren Sie noch hin?`],
      [1, 'NÄCHSTER HALT: RUPI BAR', () => 'Der Kasten ist für zuhause. Für die Kursbeobachtung vor Ort bin ich heute Abend an der Theke. Man muss nah am Markt sein.'],
      [0, 'ANLAGETIPP VOM PROFI', () => 'Zum Schluss: Was raten Sie unseren Zuschauern?'],
      [1, 'KAUFEN, SOLANGE ES BILLIG IST', market => `Nicht lange überlegen. ${market.name} für ${fmt(market.price)} Euro gibt es nicht alle Tage. Prost, München!`]
    ]
  }
];

// Wie lange jede Meldung stehen bleibt (ms).
export const TURN_DURATION = 9000;


/**
 * Welche Szene und welche Meldung `elapsed` ms nach dem Start zu sehen sind.
 * Die Szenen wechseln alle `sceneDuration` ms (Standard SCENE_DURATION) der Reihe nach,
 * Meldungen alle `turnDuration` ms (Standard TURN_DURATION). Jede Szene setzt
 * ihren Dialog beim nächsten Besuch dort fort, wo er aufgehört hat; die erste
 * Meldung eines Besuchs startet mit dem Szenenwechsel.
 */
export function scheduleAt(elapsed, scenes = SCENES, sceneDuration = SCENE_DURATION, turnDuration = TURN_DURATION) {
  const turnsPerVisit = Math.ceil(sceneDuration / turnDuration);
  const slot = Math.floor(Math.max(0, elapsed) / sceneDuration);
  const sceneIndex = slot % scenes.length;
  const visit = Math.floor(slot / scenes.length);
  const inScene = Math.max(0, elapsed) - slot * sceneDuration;
  const turnInVisit = Math.floor(inScene / turnDuration);
  const turnCount = scenes[sceneIndex].turns.length;
  return {
    sceneIndex,
    turnIndex: (visit * turnsPerVisit + turnInVisit) % turnCount,
    turnElapsed: inScene - turnInVisit * turnDuration,
    sceneRemaining: sceneDuration - inScene
  };
}
