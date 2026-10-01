import type { OutlineMode } from '../core';

export interface FishpaperOptions {
  outlineFace: OutlineMode;
  outlineWrap: OutlineMode;
  /** Randzugabe Stirnseite (mm), + = größer, − = kleiner */
  faceMargin: number;
  /** Überlappung Umwicklung (mm) */
  wrapOverlap: number;
  /** Umschlag Umwicklung je Seite (mm) */
  wrapFold: number;
  wrapMode: 'perPack' | 'combined';
  interlayer: 'single' | 'double';
  bridgeCutout: 'none' | 'notch' | 'slot';
  cutoutWidth: number;
  cutoutHeight: number;
  includeSides: boolean;
  includeTopBottom: boolean;
  /** Teile-Auswahl je Teil-ID: aus/an und Anzahl */
  partOverrides: Record<string, { enabled: boolean; count: number }>;
}

/** 2D-Punkt im Teil: x nach rechts, y nach UNTEN (wie auf dem Papier), mm */
export interface P2 {
  x: number;
  y: number;
}

/**
 * Segment im Teil. Bogen: Punkt(t) = c + r·(cos t, sin t), t von a0 nach a1 (vorzeichenbehaftet).
 */
export type Seg2 = { kind: 'line'; a: P2; b: P2 } | { kind: 'arc'; c: P2; r: number; a0: number; a1: number };

export interface Path2 {
  /** Polylinie (bei Segmentkonturen daraus abgeleitet; für Vorschau, Kachelung, Punkt-in-Kontur) */
  pts: P2[];
  closed: boolean;
  /** echte Geometrie mit Bögen (Laser-Export); fehlt bei reinen Polylinien */
  segs?: Seg2[];
}

export interface PartText {
  x: number;
  y: number;
  text: string;
  /** Schrifthöhe in mm */
  size: number;
  anchor: 'start' | 'middle' | 'end';
  /** Drehung in Grad (gegen den Uhrzeigersinn auf dem Papier) */
  rotate?: number;
}

export type PartType = 'face' | 'interlayer' | 'side' | 'topbottom' | 'wrap';

export interface Part {
  /** stabil, z. B. 'face-V-P0' – Schlüssel für Auswahl/Anzahl */
  id: string;
  type: PartType;
  /** SubPack.key oder 'ALL' (gemeinsame Umwicklung) */
  pack: string;
  name: string;
  count: number;
  enabled: boolean;
  w: number;
  h: number;
  /** Schnittlinien: Außenkontur zuerst, dann Löcher/Einschnitte */
  cut: Path2[];
  /** Falz-/Biegelinien (gestrichelt) */
  fold: Path2[];
  /** Biegebereiche (hellgraue Fläche) */
  zones: Path2[];
  /** Markierungen (Brücke, Anschluss, Passmarken) – dünn grau */
  marks: Path2[];
  texts: PartText[];
  /** Fläche eines Stücks in mm² */
  area: number;
  /** darf bei Übergröße in Stücke geteilt werden (Streifen) */
  splittable: boolean;
  /** Umwicklung: Länge der Überlappungszone am Ende (für das Teilen) */
  overlap?: number;
}
