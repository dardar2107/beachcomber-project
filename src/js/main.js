import '../css/main.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------- Smooth scroll -- */

/*
 * lerp-based smoothing rather than Lenis's duration mode — the scroll keeps
 * easing toward the target every frame instead of running a fixed-length
 * tween per input, which is what gives the heavier, continuous glide.
 */
const lenis = new Lenis({
  autoRaf: false,
  lerp: 0.07,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.6,
  smoothWheel: true,
  syncTouch: true,
});

lenis.on('scroll', ScrollTrigger.update);





gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// Dev-only: `?markers` turns on ScrollTrigger markers.
const DEV = import.meta.env.DEV;
const MARKERS = DEV && new URLSearchParams(window.location.search).has('markers');

/* ------------------------------------------- Stage 1 — hero intro scrub -- */

/*
 * One pinned scene. Timeline durations are px-of-scroll / 1000, so the
 * timeline maps 1:1 onto the ScrollTrigger distance and every segment owns a
 * distinct slice of scroll.
 *
 *   (load)          Stage 1     logo (mark+wordmark) slides down from
 *                                  above + fades in, not scroll-tied —
 *                                  mirrors nav's own entrance style
 *   0     -> 500    Stage 1 K0-K1  wordmark fades out + drops; mark
 *                                  recentres and grows to ~1.8x (frame 1-2)
 *   500   -> 1000   Stage 1 K1-K2  mark keeps growing to ~3.5x (frame 1-3);
 *                                  fill starts crossfading solid -> video
 *   1000  -> 1700   Stage 1 K2-K3  mark grows to full viewport coverage;
 *                                  crossfade completes; bg fades out; once
 *                                  covered, the video freezes as the
 *                                  permanent hero backdrop (frame 1-5)
 *   1700  -> 2500   Stage 1 K3-K5  mark (now independent of the frozen
 *                                  video) fades back to solid + shrinks to
 *                                  the nav-logo slot; nav + content reveal
 *   2500  -> 3200   Stage 1 hold (nothing animates)
 *   3200  -> 4400   Segment A  cream wipe + B wipe
 *   4400  -> 5200   Segment B  figures panel reveal
 *   5200  -> 6000   Segment C1 Group revenue -> Total Assets
 *   6000  -> 6800   Segment C2 Total Assets -> Profit after tax
 *   6800  -> 7300   Stage 3 A  hold on the final stat
 *   7300  -> 8500   Stage 3 B  achievements takeover
 *   8500  -> 9100   Stage 3 C  heading reveal
 *   9100  -> 9600   Stage 3 D  hold
 *   9600  -> 10600  Stage 4 A  tablet enters (Y only)
 *   10600 -> 11000  Stage 4 B  hold
 *   11000 -> 12200  Stage 4 C  tablet moves left (X only) + bg crossfade
 *   11840 -> 12640  Stage 4 D  content rows stagger in
 *   12640 -> 13140  Stage 4 E  hold
 *   13140 -> 14140  Stage 5 A  entry cross-dissolve into Be Responsible
 *   14140 -> 15340  Stage 5    Pillar 1  Be Responsible
 *   15340 -> 16540  Stage 5    Pillar 2  Be Conscious
 *   16540 -> 17740  Stage 5    Pillar 3  Be Caring
 *   17740 -> 18940  Stage 5    Pillar 4  Be Engaged
 *   18940 -> 19940  Stage 6 A  entry: B-mask reveal, cream takeover
 *   19940 -> 22440  Stage 6 B  horizontal scroll, 0 -> -2015px
 */
const HOLD_END = 3.2;
const SEG_A = 1.2;
const SEG_B = 0.8;
const SEG_C = 0.8;
const STAGE2_END = HOLD_END + SEG_A + SEG_B + SEG_C * 2; // 6.8

const S3_HOLD_A = 0.5;
const S3_TAKEOVER = 1.2;
const S3_TEXT = 0.6;
const S3_HOLD_D = 0.5;

const STAGE3_END = STAGE2_END + S3_HOLD_A + S3_TAKEOVER + S3_TEXT + S3_HOLD_D; // 9.6

const S4_ENTER = 1.0; // tablet rises, Y axis only
const S4_HOLD_B = 0.4; // arrival beat — nothing moves
const S4_SHIFT = 1.2; // tablet moves left, X axis only
const S4_ROWS = 0.8; // content rows stagger in
const S4_ROWS_OFFSET = 0.7; // rows start 70% through the leftward move
const S4_HOLD_E = 0.5;

const STAGE4_END =
  STAGE3_END + S4_ENTER + S4_HOLD_B + S4_SHIFT * S4_ROWS_OFFSET + S4_ROWS + S4_HOLD_E;

const S5_ENTRY = 1.0;
// Pinned while the reader explores the pillars — hover/tap, not scroll, drives them.
const S5_HOLD = 2.0;

const STAGE5_END = STAGE4_END + S5_ENTRY + S5_HOLD;

const STAGE5_END_T = STAGE5_END;

const S6_ENTRY = 1.0;
const S6_SCROLL = 2.5;
// 3935px canvas against a 1920px viewport.
const ARTISANS_TRAVEL_VW = -104.9479; // -2015px @ 1920

const STAGE6_END = STAGE5_END_T + S6_ENTRY + S6_SCROLL;

// Part B's timeline starts here on the original stage clock (shifted to 0).
const FIG_START = HOLD_END + SEG_A; // 4.4

// Dev-only: `?stage2=a` runs only the dock, `?stage2=b` only the pinned figures.
const STAGE2_ONLY = DEV ? new URLSearchParams(window.location.search).get('stage2') : null;

// Every fade-in resolves out of a soft blur rather than plain opacity.
const BLUR_IN = 'blur(8px)';
const BLUR_OUT = 'blur(0px)';

function initScene() {
  const hero = document.querySelector('[data-hero]');
  const figures = document.querySelector('[data-figures]');
  if (!hero || !figures) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      id: 'stage1',
      trigger: hero,
      start: 'top top',
      end: '+=' + HOLD_END * 1000,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      markers: MARKERS,
    },
  });
  addHero(heroTl, reduceMotion);
  heroTl.to({}, { duration: 0.001 }, HOLD_END - 0.001);

  // Part A — plain scrubbed scroll, no pin.
  addDock(hero, figures, reduceMotion || STAGE2_ONLY === 'b');

  // Part B — pinned; stats cycle, then Stages 3-6 run on the same pin.
  // In `?stage2=a` the timeline is still built (initial states) but never scrubbed.
  const figTl = gsap.timeline({
    defaults: { ease: 'none' },
    paused: STAGE2_ONLY === 'a',
    scrollTrigger: STAGE2_ONLY === 'a' ? undefined : {
      id: 'figures',
      trigger: figures,
      start: 'top top',
      end: '+=' + (STAGE6_END - FIG_START) * 1000,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      markers: MARKERS,
    },
  });
  addFigures(figTl, reduceMotion);
  addAchievements(figTl, reduceMotion);
  addProduct(figTl, reduceMotion);
  addPillars(figTl, reduceMotion);
  addArtisans(figTl, reduceMotion);
  figTl.to({}, { duration: 0.001 }, STAGE6_END - 0.001);
  figTl.shiftChildren(-FIG_START);
}

/*
 * Stage 1 (Figma frames 1-1 .. 1-5). The video plays full-bleed underneath;
 * one canvas on top paints the stone backdrop with the B+sunburst cut out of
 * it, so the video shows through the mark. Mark geometry comes straight from
 * /assets/logo-fullwhite.svg as Path2D, drawn with a single setTransform —
 * the hole and the white fill can never drift apart.
 */
const MARK_BBOX = { x: 166.14, y: 0, w: 155.19, h: 185.09 };
const LOCKUP_BBOX = { x: 0, y: 0, w: 487.57, h: 295.53 };
const B_ANCHOR = { x: 241.2, y: 110.1 }; // centre of the inner "B"
const B_HEIGHT = 39.5;

// % of the 1920x921 canvas, measured from frames 1-1 / 1-2 / 1-3.
const LOCKUP_REST = { left: 37.318, top: 33.985, width: 25.394, height: 32.088 };
const K1 = { left: 42.72, top: 31.95, width: 14.52, height: 36.11 };
const K2 = { left: 35.74, top: 14.6, width: 28.48, height: 70.81 };
const K3_B_COVER = 0.77; // frame 1-4: the B spans ~77% of viewport height
const K4_EXTRA = 2.2;
const WORDMARK_DROP_PCT = 11.378;

const toPx = (pct) => ({
  x: (pct.left / 100) * window.innerWidth,
  y: (pct.top / 100) * window.innerHeight,
  w: (pct.width / 100) * window.innerWidth,
  h: (pct.height / 100) * window.innerHeight,
});

function fit(bbox, r) {
  const s = Math.min(r.w / bbox.w, r.h / bbox.h);
  return {
    s,
    tx: r.x + (r.w - bbox.w * s) / 2 - bbox.x * s,
    ty: r.y + (r.h - bbox.h * s) / 2 - bbox.y * s,
  };
}

const anchorOf = (t) => ({ x: t.tx + t.s * B_ANCHOR.x, y: t.ty + t.s * B_ANCHOR.y });

async function loadLogoPaths() {
  const svg = await fetch('/assets/logo-fullwhite.svg').then((r) => r.text());
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const mark = new Path2D();
  const wordmark = new Path2D();
  doc.querySelectorAll('path').forEach((p) => {
    const d = p.getAttribute('d');
    const y = parseFloat(d.match(/^M\s*[-\d.]+[\s,]+([-\d.]+)/)[1]);
    (y > 190 ? wordmark : mark).addPath(new Path2D(d));
  });
  return { mark, wordmark };
}

function addHero(tl, reduceMotion) {
  const hero = document.querySelector('[data-hero]');
  const canvas = hero.querySelector('[data-hero-canvas]');
  const shade = hero.querySelector('[data-hero-shade]');
  const video = hero.querySelector('.hero__video');
  const nav = hero.querySelector('[data-hero-nav]');
  const navLogo = hero.querySelector('[data-hero-nav-logo]');
  const content = hero.querySelector('[data-hero-content]');
  const ctas = hero.querySelectorAll('[data-hero-cta]');

  const navEndTop = 8.198;
  const navStartTop = -24.17;

  if (video) {
    const play = () => video.paused && video.play().catch(() => {});
    play();
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((type) =>
      window.addEventListener(type, play, { once: true, passive: true })
    );
  }

  if (reduceMotion) {
    gsap.set(canvas, { autoAlpha: 0 });
    gsap.set([shade, navLogo], { opacity: 1 });
    gsap.set(nav, { top: navEndTop + '%', opacity: 1 });
    gsap.set(content, { y: 0, opacity: 1 });
    gsap.set(ctas, { y: 0, opacity: 1, filter: BLUR_OUT });
    return;
  }

  const ctx = canvas.getContext('2d');
  const stone =
    getComputedStyle(document.documentElement).getPropertyValue('--stone').trim() || '#b0c2c4';
  const state = { m: 0, reveal: 0, word: 1, drop: 0, intro: 0 };
  let paths = null;
  let stops = [];
  let lockupT = null;
  let dpr = 1;

  function measure() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    lockupT = fit(LOCKUP_BBOX, toPx(LOCKUP_REST));
    const t1 = fit(MARK_BBOX, toPx(K1));
    const t2 = fit(MARK_BBOX, toPx(K2));
    const s3 = (K3_B_COVER * H) / B_HEIGHT;
    const centre = { x: W / 2, y: H / 2 };
    stops = [
      { s: lockupT.s, a: anchorOf(lockupT) },
      { s: t1.s, a: anchorOf(t1) },
      { s: t2.s, a: anchorOf(t2) },
      { s: s3, a: centre },
      { s: s3 * K4_EXTRA, a: centre },
    ];
  }

  function render() {
    if (canvas.style.visibility === 'hidden') return;
    const W = window.innerWidth;
    const H = window.innerHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = stone;
    ctx.fillRect(0, 0, W, H);
    if (!paths) return;

    const i = Math.min(Math.floor(state.m), stops.length - 2);
    const f = state.m - i;
    const A = stops[i];
    const B = stops[i + 1];
    const s = A.s * Math.pow(B.s / A.s, f);
    const ax = A.a.x + (B.a.x - A.a.x) * f;
    const ay = A.a.y + (B.a.y - A.a.y) * f;
    const tx = ax - s * B_ANCHOR.x;
    const ty = ay - s * B_ANCHOR.y;

    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * tx, dpr * ty);
    if (state.reveal > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = state.reveal;
      ctx.fill(paths.mark);
      ctx.globalCompositeOperation = 'source-over';
    }
    const markAlpha = (1 - state.reveal) * state.intro;
    if (markAlpha > 0) {
      ctx.globalAlpha = markAlpha;
      ctx.fillStyle = '#fff';
      ctx.fill(paths.mark);
    }

    const wordAlpha = state.word * state.intro;
    if (wordAlpha > 0) {
      const dy = state.drop * (WORDMARK_DROP_PCT / 100) * H;
      ctx.setTransform(dpr * lockupT.s, 0, 0, dpr * lockupT.s, dpr * lockupT.tx, dpr * (lockupT.ty + dy));
      ctx.globalAlpha = wordAlpha;
      ctx.fillStyle = '#fff';
      ctx.fill(paths.wordmark);
    }
  }

  measure();
  window.addEventListener('resize', measure);
  gsap.ticker.add(render);
  loadLogoPaths().then((p) => {
    paths = p;
    gsap.to(state, { intro: 1, duration: 1.1, ease: 'power2.out' });
  });

  gsap.set([shade, navLogo], { opacity: 0 });

  /* 1-1 -> 1-2: wordmark fades + drops; mark recentres and grows, white. */
  tl.to(state, { m: 1, duration: 0.5 }, 0);
  tl.to(state, { word: 0, drop: 1, duration: 0.35, ease: 'power1.in' }, 0);

  /* 1-2 -> 1-3: keeps growing; white fill gives way to the video. */
  tl.to(state, { m: 2, duration: 0.5 }, 0.5);
  tl.to(state, { reveal: 1, duration: 0.5 }, 0.5);

  /* 1-3 -> 1-4: zoom in on the B, video through the strokes. */
  tl.to(state, { m: 3, duration: 0.7 }, 1.0);

  /* 1-4 -> 1-5: stone dissolves to the full-bleed video; nav + content in. */
  tl.to(state, { m: 4, duration: 0.4, ease: 'power2.in' }, 1.7);
  tl.to(canvas, { autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 1.75);
  tl.to(shade, { opacity: 1, duration: 0.35 }, 1.85);

  tl.fromTo(
    nav,
    { top: navStartTop + '%', opacity: 0, filter: BLUR_IN },
    { top: navEndTop + '%', opacity: 1, filter: BLUR_OUT, duration: 0.25, ease: 'power2.out' },
    2.0
  );
  tl.fromTo(
    navLogo,
    { opacity: 0, filter: BLUR_IN },
    { opacity: 1, filter: BLUR_OUT, duration: 0.25, ease: 'power2.out' },
    2.0
  );
  tl.fromTo(
    content,
    { y: () => window.innerHeight * 0.5, opacity: 0, filter: BLUR_IN },
    { y: 0, opacity: 1, filter: BLUR_OUT, duration: 0.3, ease: 'power3.out' },
    2.05
  );
  tl.fromTo(
    ctas,
    { y: 42, opacity: 0, filter: BLUR_IN },
    { y: 0, opacity: 1, filter: BLUR_OUT, duration: 0.15, stagger: 0.1, ease: 'power2.out' },
    2.25
  );
}

/* --------------------------- Segments A / B / C — "2026 in figures" -- */

// Frame 2-1 dock rect (897x878 at 1003,21 on 1920x920), scaled per axis.
function dockRect() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  return {
    left: (1003 / 1920) * W,
    top: (21 / 920) * H,
    width: (897 / 1920) * W,
    height: (878 / 920) * H,
  };
}

const DOCK_EASE = gsap.parseEase('power2.inOut');

function syncVideo(from, to) {
  if (!from || !to) return;
  try {
    to.currentTime = from.currentTime;
  } catch (e) {
    /* not seekable yet */
  }
  to.play().catch(() => {});
}

/* --- Part A: 0 -> 100vh of normal scroll as the section rises into view --- */

function addDock(hero, figures, staticDock) {
  const dock = figures.querySelector('[data-figures-dock]');
  const dockVideo = figures.querySelector('[data-figures-dockvideo]');
  const shade = figures.querySelector('[data-figures-dockshade]');
  const crop = figures.querySelector('[data-figures-crop]');
  const reveals = figures.querySelectorAll('[data-figures-reveal]');
  const heroVideo = hero.querySelector('.hero__video');

  /*
   * The rect is interpolated in screen space, then converted back to section
   * space by undoing how far the section still sits below the fold — so the
   * video shrinks in place instead of riding up with the page.
   */
  const place = (p) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const d = dockRect();
    const e = DOCK_EASE(p);
    dock.style.left = d.left * e + 'px';
    dock.style.top = d.top * e - H * (1 - p) + 'px';
    dock.style.width = W + (d.width - W) * e + 'px';
    dock.style.height = H + (d.height - H) * e + 'px';
  };

  if (staticDock) {
    place(1);
    window.addEventListener('resize', () => place(1));
    gsap.set(shade, { opacity: 0 });
    gsap.set(crop, { opacity: 1 });
    gsap.set(reveals, { opacity: 1, y: 0, filter: BLUR_OUT });
    return;
  }

  place(0);

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      id: 'dock',
      trigger: figures,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      invalidateOnRefresh: true,
      markers: MARKERS,
      onUpdate: (self) => {
        place(self.progress);
        hero.classList.toggle('is-docking', self.progress > 0);
      },
      onRefresh: (self) => place(self.progress),
      onToggle: (self) => {
        if (self.isActive && self.direction > 0) syncVideo(heroVideo, dockVideo);
        else if (!self.isActive && self.direction < 0) syncVideo(dockVideo, heroVideo);
      },
    },
  });

  tl.fromTo(hero, { opacity: 1 }, { opacity: 0, duration: 0.3 }, 0);
  tl.fromTo(shade, { opacity: 1 }, { opacity: 0, duration: 0.5 }, 0.1);
  tl.fromTo(crop, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.in' }, 0.6);
  tl.fromTo(
    reveals,
    { opacity: 0, y: 40, filter: BLUR_IN },
    { opacity: 1, y: 0, filter: BLUR_OUT, duration: 0.3, stagger: 0.1, ease: 'power2.out' },
    0.5
  );
}

/* --- Part B: pinned stat cycle (original clock 4.4 -> 6.8) --- */

/*
 * B.svg glyph placement inside the 897x878 dock per stat — frames 2-1, 3-1,
 * 4-1 (vector at 599,-907 1314x1885 / 599,-725 1314x1885 / 373,-343 1766x2533,
 * minus the dock origin 1003,21). The glyph's ink box in B.svg is
 * 2948,4321 1318x1891, so s = w / 1318, t = rect - ink * s.
 */
const B_INK = { x: 2948, y: 4321, w: 1318 };
const cropTransform = (x, y, w) => {
  const s = w / B_INK.w;
  return `translate(${(x - 1003 - B_INK.x * s).toFixed(2)} ${(y - 21 - B_INK.y * s).toFixed(2)}) scale(${s.toFixed(6)})`;
};
const CROP_PER_STAT = [
  cropTransform(599, -907, 1314),
  cropTransform(599, -725, 1314),
  cropTransform(373, -343, 1766),
];

function addFigures(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  const stats = scope.querySelectorAll('[data-figures-stat]');
  const cropPath = scope.querySelector('[data-figures-crop-path]');

  gsap.set(cropPath, { attr: { transform: CROP_PER_STAT[0] } });

  gsap.set([...stats].slice(1), { opacity: 0, y: 50, filter: BLUR_IN });
  if (reduceMotion) return;

  for (let i = 1; i < stats.length; i += 1) {
    const at = FIG_START + SEG_B + SEG_C * (i - 1);

    tl.to(
      stats[i - 1],
      { opacity: 0, y: -50, filter: BLUR_IN, duration: SEG_C * 0.5, ease: 'power2.in' },
      at
    );
    tl.fromTo(
      stats[i],
      { opacity: 0, y: 50, filter: BLUR_IN },
      { opacity: 1, y: 0, filter: BLUR_OUT, duration: SEG_C * 0.55, ease: 'power2.out' },
      at + SEG_C * 0.2
    );

    // Offset and longer than the text swap, so the crop reads as a secondary move.
    tl.to(
      cropPath,
      { attr: { transform: CROP_PER_STAT[i] }, duration: SEG_C * 0.95, ease: 'sine.inOut' },
      at + 0.12
    );
  }
}

// Glyph ink boxes inside the two mark SVGs (measured from the files).
const B_SVG = { w: 7460, h: 8854, ink: { x: 2948, y: 4321, w: 1318, h: 1891 } };
const NAUTILUS_SVG = { w: 3205, h: 3804, ink: { x: 1267, y: 1856, w: 566, h: 813 } };

// Screen rect of the B.svg glyph as cropped in frame 4-1, through the dock's
// xMidYMid-slice viewBox (373,-343 1766x2533 on the 1920x920 frame).
function cropBRect() {
  const d = dockRect();
  const sc = Math.max(d.width / 897, d.height / 878);
  const ox = d.left + (d.width - 897 * sc) / 2;
  const oy = d.top + (d.height - 878 * sc) / 2;
  return { x: ox + (373 - 1003) * sc, y: oy + (-343 - 21) * sc, w: 1766 * sc, h: 2533 * sc };
}

// Frame 5-1: the nautilus's own B at 68.67,94.23 (513.3x737.3) on 1920x920.
function nautilusBRect() {
  const s = window.innerHeight / 920;
  const w = 513.31 * s;
  return { x: 68.67 * (window.innerWidth / 1920), y: 94.23 * s, w, h: w * (813 / 566) };
}

/* ------------------- Stage 3 — achievements takeover, heading, holds -- */

function addAchievements(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  if (!scope) return;

  const sky = scope.querySelector('[data-achievements]');
  const text = scope.querySelector('[data-achievements-text]');
  const b = scope.querySelector('[data-figures-b]');
  const nautilus = scope.querySelector('[data-figures-nautilus]');
  const cream = scope.querySelector('[data-figures-cream]');
  const panel = scope.querySelector('[data-figures-panel]');
  const cropPath = scope.querySelector('[data-figures-crop-path]');

  // White at this opacity over --sky reads as frame 5-1's #a9c9d2 watermark.
  const WATERMARK_OPACITY = 0.075;
  const WATERMARK_TINT = '#a9c9d2';
  const START_FILL = '#faf9f8'; // figures background — the crop B's own colour

  /*
   * b is sized to the glyph's ink box only (mask offset in px), so it stays a
   * small layer even at its 4-1 size. The nautilus keeps its full box, based at
   * its 5-1 rest, so it ends on the identity transform Stage 4 animates from.
   */
  const placeBoxes = () => {
    const A = cropBRect();
    const s = A.w / B_SVG.ink.w;
    const maskSize = `${B_SVG.w * s}px ${B_SVG.h * s}px`;
    const maskPos = `${-B_SVG.ink.x * s}px ${-B_SVG.ink.y * s}px`;
    Object.assign(b.style, {
      left: A.x + 'px',
      top: A.y + 'px',
      width: A.w + 'px',
      height: A.h + 'px',
      webkitMaskSize: maskSize,
      maskSize,
      webkitMaskPosition: maskPos,
      maskPosition: maskPos,
    });

    const E = nautilusBRect();
    const n = E.w / NAUTILUS_SVG.ink.w;
    Object.assign(nautilus.style, {
      left: E.x - NAUTILUS_SVG.ink.x * n + 'px',
      top: E.y - NAUTILUS_SVG.ink.y * n + 'px',
      width: NAUTILUS_SVG.w * n + 'px',
      height: NAUTILUS_SVG.h * n + 'px',
    });
  };

  // One shared path: size eases geometrically, centre linearly.
  const morph = { t: 0 };
  const render = () => {
    const A = cropBRect();
    const E = nautilusBRect();
    const t = morph.t;
    const w = A.w * Math.pow(E.w / A.w, t);
    const cx = A.x + A.w / 2 + (E.x + E.w / 2 - (A.x + A.w / 2)) * t;
    const cy = A.y + A.h / 2 + (E.y + E.h / 2 - (A.y + A.h / 2)) * t;

    // b's box is centred on its glyph: plain translate + scale.
    gsap.set(b, { x: cx - (A.x + A.w / 2), y: cy - (A.y + A.h / 2), scale: w / A.w });

    // The nautilus scales about its box centre; keep its B on the same point.
    const n = E.w / NAUTILUS_SVG.ink.w;
    const c0x = E.x - NAUTILUS_SVG.ink.x * n + (NAUTILUS_SVG.w * n) / 2;
    const c0y = E.y - NAUTILUS_SVG.ink.y * n + (NAUTILUS_SVG.h * n) / 2;
    const S = w / E.w;
    gsap.set(nautilus, {
      scale: S,
      x: cx - c0x - (E.x + E.w / 2 - c0x) * S,
      y: cy - c0y - (E.y + E.h / 2 - c0y) * S,
    });
  };

  placeBoxes();
  ScrollTrigger.addEventListener('refresh', () => {
    placeBoxes();
    if (morph.t < 1) render();
  });

  if (reduceMotion) {
    gsap.set(sky, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(text, { opacity: 1, scale: 1, filter: BLUR_OUT });
    gsap.set(b, { opacity: 0 });
    gsap.set(nautilus, { scale: 1, x: 0, y: 0, opacity: WATERMARK_OPACITY });
    gsap.set([cream, panel], { opacity: 0 });
    return;
  }

  gsap.set(text, { opacity: 0, scale: 0.95, filter: BLUR_IN });
  gsap.set(b, { opacity: 0, backgroundColor: START_FILL });
  gsap.set(nautilus, { opacity: 0 });
  render();

  /* --- Segment A: 6800 -> 7300. Nothing scheduled — the final stat holds. --- */

  /* --- Segment B: 7300 -> 8500 --- */

  const takeover = STAGE2_END + S3_HOLD_A;
  const MOVE_AT = takeover + S3_TAKEOVER * 0.08;
  const MOVE = S3_TAKEOVER * 0.9;
  const WIPE = S3_TAKEOVER * 0.85;
  // The B keeps the figures background colour until the blue fully covers the
  // screen; only then does it tint, gain its rays and dissolve. That tail
  // borrows Segment D's hold, so Stage 4 still starts at 9600.
  const RECOLOR_AT = takeover + WIPE + 0.04;

  // The blue wipes in from the right and covers the video.
  tl.fromTo(
    sky,
    { clipPath: 'inset(0% 0% 0% 100%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: WIPE, ease: 'power1.inOut' },
    takeover
  );

  // Same glyph, same place, same colour: the crop B lifts off as a free B.
  tl.fromTo(b, { opacity: 0 }, { opacity: 1, duration: 0.001 }, takeover);
  tl.fromTo(cropPath, { opacity: 1 }, { opacity: 0, duration: 0.001 }, takeover);

  tl.to(morph, { t: 1, duration: MOVE, ease: 'power2.inOut', onUpdate: render }, MOVE_AT);
  tl.to(
    b,
    { backgroundColor: WATERMARK_TINT, duration: 0.4, ease: 'power1.inOut' },
    RECOLOR_AT
  );

  // Rays grow in around the B as it settles, registered to it throughout.
  tl.fromTo(
    nautilus,
    { opacity: 0 },
    { opacity: WATERMARK_OPACITY, duration: 0.6, ease: 'power1.out' },
    RECOLOR_AT - 0.01
  );
  // Once b's tint matches the watermark, it dissolves into the nautilus B.
  tl.to(b, { opacity: 0, duration: 0.25, ease: 'power1.in' }, RECOLOR_AT + 0.36);

  tl.to(
    panel,
    { opacity: 0, duration: S3_TAKEOVER * 0.35, ease: 'power1.in' },
    takeover + S3_TAKEOVER * 0.1
  );
  tl.to(cream, { opacity: 0, duration: S3_TAKEOVER * 0.2 }, takeover + S3_TAKEOVER * 0.8);

  /* --- Segment C: 8500 -> 9100 --- */

  tl.to(
    text,
    { opacity: 1, scale: 1, filter: BLUR_OUT, duration: S3_TEXT * 0.8, ease: 'power2.out' },
    RECOLOR_AT + 0.64
  );

  /* --- Segment D: 9100 -> 9600. Nothing scheduled; Stage 4 picks up at 9600. --- */
}

initScene();
initNews();
initFooter();

// Web fonts change measured heights — re-measure once they land.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}

/* -------------------- Stage 4 — tablet arrival, shift, content rows -- */

function addProduct(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  if (!scope) return;

  const bg = scope.querySelector('[data-product-bg]');
  const tablet = scope.querySelector('[data-product-tablet]');
  const panel = scope.querySelector('[data-product-panel]');
  const rows = scope.querySelectorAll('[data-prow]');
  const nautilus = scope.querySelector('[data-figures-nautilus]');
  const text = scope.querySelector('[data-achievements-text]');

  // Tablet is centred by GSAP so it owns its whole transform stack.
  gsap.set(tablet, { xPercent: -50, yPercent: -50 });

  // Not offsetHeight: it reads 0 before the image loads, parking the tablet on screen.
  const tabletStartY = () => window.innerHeight + 40;
  // Design centres the tablet at 550px on the 1055px frame — 22px below the
  // viewport's own centre line.
  const tabletRestY = () => 0.0213 * window.innerHeight;
  // Design puts the tablet's centre at 393px on the 1920 frame (20.47vw).
  const tabletShiftX = () => -0.2953 * window.innerWidth;

  /*
   * Watermark drifts in Segment A, then blows up in C until the sunburst rays
   * fall outside the viewport entirely — only the B's curve is left as a soft
   * shape on the left. Scale 3.6 puts the ray ring's inner edge beyond the
   * far corners, so nothing feathered shows on the right.
   */
  const NAUT_END_SCALE = 3.6;
  /*
   * Segment A holds the B near its Stage 3 size. Anything past ~1.22 pushes
   * the glyph's bottom edge off screen, and the tablet-centred screen needs
   * the whole B readable, so the drift stops at 1.15.
   */
  const NAUT_MID_SCALE = 1.15;
  const nautMidX = () => 0;
  const nautMidY = () => 0;
  const nautEndX = () => -0.0722 * window.innerWidth;
  const nautEndY = () => -0.786 * window.innerHeight;

  if (reduceMotion) {
    gsap.set(bg, { opacity: 1 });
    gsap.set(tablet, { x: tabletShiftX, y: tabletRestY, filter: BLUR_OUT });
    gsap.set([panel, ...rows], { opacity: 1, y: 0, filter: BLUR_OUT });
    gsap.set(nautilus, {
      scale: NAUT_END_SCALE,
      x: nautEndX,
      y: nautEndY,
      opacity: 0.16,
    });
    gsap.set(text, { opacity: 0 });
    return;
  }

  gsap.set(panel, { opacity: 0, y: 50, filter: BLUR_IN });
  gsap.set(rows, { opacity: 0, y: 40, filter: BLUR_IN });

  /* --- Segment A: 9600 -> 10600. Y axis only. --- */

  const enter = STAGE3_END;

  tl.fromTo(
    tablet,
    { y: tabletStartY, filter: BLUR_IN },
    {
      y: tabletRestY,
      filter: BLUR_OUT,
      duration: S4_ENTER,
      ease: 'power2.out',
    },
    enter
  );

  // Heading clears out as the tablet takes the centre.
  tl.to(
    text,
    { opacity: 0, filter: BLUR_IN, duration: S4_ENTER * 0.45, ease: 'power1.in' },
    enter
  );

  // Watermark starts drifting rather than snapping later.
  tl.to(
    nautilus,
    {
      scale: NAUT_MID_SCALE,
      x: nautMidX,
      y: nautMidY,
      duration: S4_ENTER,
      ease: 'power1.inOut',
    },
    enter
  );

  /* --- Segment B: 10600 -> 11000. Nothing scheduled — the arrival beat. --- */

  /* --- Segment C: 11000 -> 12200. X axis only. Strictly disjoint from the
         Segment A tween above, so X and Y never run together. --- */

  const shift = STAGE3_END + S4_ENTER + S4_HOLD_B;

  tl.to(
    tablet,
    { x: tabletShiftX, duration: S4_SHIFT, ease: 'power2.inOut' },
    shift
  );

  tl.to(bg, { opacity: 1, duration: S4_SHIFT * 0.9 }, shift);

  tl.to(
    nautilus,
    {
      scale: NAUT_END_SCALE,
      x: nautEndX,
      y: nautEndY,
      opacity: 0.16,
      duration: S4_SHIFT,
      ease: 'power2.inOut',
    },
    shift
  );

  /* --- Segment D: 11840 -> 12640, overlapping the last 30% of the shift. --- */

  const rowsStart = shift + S4_SHIFT * S4_ROWS_OFFSET;

  // Panel frame (title, intro, buttons) arrives first.
  tl.to(
    panel,
    {
      opacity: 1,
      y: 0,
      filter: BLUR_OUT,
      duration: S4_ROWS * 0.4,
      ease: 'power2.out',
    },
    rowsStart
  );

  // Chapter rows stagger in one at a time behind it.
  tl.to(
    rows,
    {
      opacity: 1,
      y: 0,
      filter: BLUR_OUT,
      duration: S4_ROWS * 0.35,
      stagger: S4_ROWS * 0.16,
      ease: 'power2.out',
    },
    rowsStart + S4_ROWS * 0.15
  );

  /* --- Segment E: 12640 -> 13140 --- */

  /* Nothing scheduled — Stage 5 picks up at 13140, so the gap is internal
     and preserved. */
}

/* ------------------------------- Stage 5 — sustainability pillars -- */

/*
 * Entry (Segment A) runs three beats:
 *   1. Stage 4's tablet and chapter panel fade away.
 *   2. The B expands, moving right.
 *   3. Colour and photos wipe in on a 110deg diagonal, starting with the B.
 *
 * Pillar-to-pillar is a different motion: colour crossfades, both photos
 * swipe up, and of the text only the pillar word swipes — "BE" and the CTA
 * are shared elements that never move.
 */
/*
 * Bottom-B placements per active pillar, as left % of the frame (frames 8-2,
 * 8-3, 8-4). Frame 8-4 only shows the large B, so the small one tucks inside it.
 */
const PILLAR_SHAPES = [
  { sm: 3.6979, lg: -18.125 }, // Be Conscious
  { sm: 34.6875, lg: 12.6042 }, // Be Caring
  { sm: 69.1146, lg: 47.2917 }, // Be Engaged
];
const PILLAR_HOVER_INTENT = 90; // ms a pointer must rest before a pillar takes over

/* --- Hover / tap state: independent of the scroll timeline --- */

function initPillarsInteraction(root, reduceMotion) {
  const imgs = root.querySelectorAll('[data-pillars-img]');
  const bigb = root.querySelector('[data-pillars-bigb]');
  const [shapeSm, shapeLg] = root.querySelectorAll('[data-pillars-shape]');
  const head = root.querySelector('[data-pillars-head]');
  const labels = root.querySelectorAll('[data-pillar-label]');
  const details = root.querySelectorAll('[data-pillar-detail]');

  const D = reduceMotion ? 0 : 0.45;
  const EASE = 'power2.inOut';
  // 8-1 -> 8-2: headline 42.5% -> 17.07%, description 55.22% -> 29.83%.
  const headLift = () => -((42.5 - 17.07) / 100) * window.innerHeight;
  // Parks the bottom Bs just below the edge (their visible band is <7vw).
  const shapeDrop = () => 0.1 * window.innerWidth;

  let active = -1;
  let pending = 0;

  gsap.set(details, { autoAlpha: 0, y: 16 });
  gsap.set([shapeSm, shapeLg], { y: shapeDrop });

  const select = (i) => {
    if (i === active) return;
    const first = active < 0;
    active = i;
    root.classList.remove('is-default');

    // overwrite:true kills every tween on the element, including a delayed one
    // that hasn't started yet ('auto' would miss it and let two pillars stack).
    const t = { duration: D, ease: EASE, overwrite: true };

    gsap.to(imgs, { ...t, opacity: (k) => (k === i + 1 ? 1 : 0) });
    labels.forEach((el, k) => gsap.to(el, { ...t, autoAlpha: k === i ? 0 : 0.3 }));
    details.forEach((el, k) =>
      gsap.to(el, {
        ...t,
        autoAlpha: k === i ? 1 : 0,
        y: k === i ? 0 : 16,
        delay: k === i ? D * 0.15 : 0,
      })
    );

    const pos = PILLAR_SHAPES[i];
    if (first) {
      gsap.to(head, { ...t, y: headLift });
      gsap.to(bigb, { ...t, opacity: 0, left: '-62%' });
      // First reveal rises from below the edge at the target position.
      gsap.set(shapeSm, { left: pos.sm + '%', y: shapeDrop });
      gsap.set(shapeLg, { left: pos.lg + '%', y: shapeDrop });
    }
    // One tween per B carries both axes, so a fast retarget never strands a rise.
    gsap.to(shapeSm, { ...t, left: pos.sm + '%', y: 0 });
    gsap.to(shapeLg, { ...t, left: pos.lg + '%', y: 0 });
  };

  // Back to the generic 8-1 state, instantly — only ever called while the
  // section is off screen or covered (see the timeline callbacks).
  const reset = () => {
    clearTimeout(pending);
    if (active < 0) return;
    active = -1;
    root.classList.add('is-default');
    const s = { overwrite: true };
    gsap.set(imgs, { ...s, opacity: (k) => (k === 0 ? 1 : 0) });
    gsap.set(labels, { ...s, autoAlpha: 0.2 });
    gsap.set(details, { ...s, autoAlpha: 0, y: 16 });
    gsap.set(head, { ...s, y: 0 });
    gsap.set(bigb, { ...s, opacity: 1, left: '-49.6354%' });
    gsap.set([shapeSm, shapeLg], { ...s, y: shapeDrop });
  };

  labels.forEach((el, i) => {
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      clearTimeout(pending);
      pending = setTimeout(() => select(i), PILLAR_HOVER_INTENT);
    });
    el.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'touch') return;
      clearTimeout(pending);
    });
    // Tap on touch, Enter/Space on keyboard. Mouse-out never reverts.
    el.addEventListener('click', () => {
      clearTimeout(pending);
      select(i);
    });
  });

  ScrollTrigger.addEventListener('refresh', () => {
    if (active >= 0) gsap.set(head, { y: headLift() });
    else gsap.set([shapeSm, shapeLg], { y: shapeDrop() });
  });

  return reset;
}

/* --- Scroll entry from Stage 4, then the hold --- */

function addPillars(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  const root = scope && scope.querySelector('[data-pillars]');
  if (!root) return;

  const imgsWrap = root.querySelector('[data-pillars-imgs]');
  const media = root.querySelector('[data-pillars-media]');
  const bigbWrap = root.querySelector('[data-pillars-bigb-wrap]');
  const intro = root.querySelector('[data-pillars-intro]');
  const pillars = root.querySelectorAll('[data-pillar]');
  const tablet = scope.querySelector('[data-product-tablet]');
  const panel = scope.querySelector('[data-product-panel]');
  const nautilus = scope.querySelector('[data-figures-nautilus]');

  const resetPillars = initPillarsInteraction(root, reduceMotion);

  if (reduceMotion) {
    gsap.set(root, { autoAlpha: 1 });
    gsap.set([tablet, panel, nautilus], { opacity: 0 });
    return;
  }

  // Reveal tweens render their hidden start state at build time. With
  // immediateRender:false a refresh or restored scroll position left the layer
  // visible over the earlier stages.

  const entry = STAGE4_END;

  // Stage 4 steps back.
  tl.to([tablet, panel, nautilus], { opacity: 0, duration: 0.35, ease: 'power1.in' }, entry);

  // The photo rises into frame from the bottom edge, settling from a slight zoom.
  tl.fromTo(
    root,
    { autoAlpha: 0 },
    { autoAlpha: 1, duration: 0.001 },
    entry + 0.1
  );
  tl.fromTo(
    media,
    { clipPath: 'inset(100% 0% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power2.inOut' },
    entry + 0.1
  );
  tl.fromTo(
    imgsWrap,
    { scale: 1.1 },
    { scale: 1, duration: 0.9, ease: 'power2.out' },
    entry + 0.1
  );

  // The cream B drifts in from the left edge.
  tl.fromTo(
    bigbWrap,
    { opacity: 0, left: '-10%' },
    { opacity: 1, left: '0%', duration: 0.5, ease: 'power2.out' },
    entry + 0.4
  );

  tl.fromTo(
    intro,
    { opacity: 0, y: 40, filter: BLUR_IN },
    { opacity: 1, y: 0, filter: BLUR_OUT, duration: 0.45, ease: 'power2.out' },
    entry + 0.45
  );

  // Labels rise via `top`, not a transform, so they keep blending over the B.
  tl.fromTo(
    pillars,
    { opacity: 0, top: '4%' },
    { opacity: 1, top: '0%', duration: 0.4, stagger: 0.08, ease: 'power2.out' },
    entry + 0.6
  );

  tl.to({}, { duration: S5_HOLD }, entry + S5_ENTRY);

  // Leaving the section either way (up past its entry, or on into Stage 6)
  // returns it to the generic state, so every visit starts from Be Responsible.
  tl.call(resetPillars, null, entry);
  tl.call(resetPillars, null, entry + S5_ENTRY + S5_HOLD);
}

/* ------------------------- Stage 6 — Our Artisans, horizontal scroll -- */

function addArtisans(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  if (!scope) return;

  const wrap = scope.querySelector('[data-artisans]');
  if (!wrap) return;

  const bg = scope.querySelector('[data-artisans-bg]');
  const track = scope.querySelector('[data-artisans-track]');
  const content = scope.querySelector('[data-artisans-content]');
  const vec1 = scope.querySelector('.artisans__vec--1');
  const vec2 = scope.querySelector('.artisans__vec--2');
  const photos = scope.querySelectorAll('.artisans__photo');
  const collage = scope.querySelector('[data-artisans-collage]');
  // Collage lives outside .artisans__content so the B can paint over it, but
  // it still arrives with the rest of the stagger.
  const pieces = [collage].concat(content ? Array.from(content.children) : []);

  /*
   * Measured from the real track width rather than the 1920 canvas constant,
   * so the hijack still ends flush when the layout reflows on tablet/mobile.
   */
  const artisansTravel = () =>
    -Math.max(0, track.scrollWidth - window.innerWidth);

  if (reduceMotion) {
    gsap.set(bg, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set([vec1, vec2, ...pieces], { opacity: 1, x: 0, y: 0 });
    gsap.set(track, { x: artisansTravel });
    return;
  }

  gsap.set(pieces, { opacity: 0, y: 28, filter: BLUR_IN });

  const entry = STAGE5_END_T;
  const beat = (from, to) => ({
    at: entry + S6_ENTRY * from,
    duration: S6_ENTRY * (to - from),
  });

  /* --- Segment A: 18940 -> 19940 --- */

  // 1. Cream swipes up over the previous stage.
  const a1 = beat(0, 0.45);
  tl.fromTo(
    bg,
    { clipPath: 'inset(100% 0% 0% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: a1.duration,
      ease: 'power2.inOut',
      immediateRender: false,
    },
    a1.at
  );

  // 2. The B slides onto the image rather than simply appearing.
  const a2 = beat(0.3, 0.68);
  tl.fromTo(
    vec1,
    { opacity: 0, x: () => -0.18 * window.innerWidth },
    {
      opacity: 1,
      x: 0,
      duration: a2.duration,
      ease: 'power2.out',
      immediateRender: false,
    },
    a2.at
  );

  // 3. Each element of this stage appears in turn.
  const a3 = beat(0.48, 1);
  tl.to(
    pieces,
    {
      opacity: 1,
      y: 0,
      filter: BLUR_OUT,
      duration: a3.duration * 0.45,
      stagger: (a3.duration * 0.55) / Math.max(pieces.length - 1, 1),
      ease: 'power2.out',
    },
    a3.at
  );

  // 4. The two figures count up as they land.
  const a4 = beat(0.62, 1);
  scope.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const proxy = { v: 0 };
    const render = () =>
      (el.textContent =
        prefix + Math.round(proxy.v).toLocaleString('en-US') + suffix);

    tl.fromTo(
      proxy,
      { v: 0 },
      {
        v: target,
        duration: a4.duration,
        ease: 'power1.out',
        immediateRender: false,
        onUpdate: render,
      },
      a4.at
    );
  });

  /* --- Segment B: 19940 -> 22440. The scene already holds the pin, so the
         hijack is a scrubbed translateX across the full-width track. --- */

  const scrollAt = entry + S6_ENTRY;

  tl.to(
    track,
    { x: artisansTravel, duration: S6_SCROLL, ease: 'none' },
    scrollAt
  );

  /*
   * Anything living to the right of the first viewport is timed off the point
   * it actually scrolls into view: progress = (left - 1920) / 2015 on the
   * 3935px canvas.
   */
  const enterAt = (leftPx) => {
    const total = Math.max(track.scrollWidth - window.innerWidth, 1);
    const px = (leftPx / 3935) * track.scrollWidth; // same fraction of canvas
    return (
      scrollAt +
      S6_SCROLL *
        Math.min(Math.max((px - window.innerWidth) / total, 0), 1)
    );
  };

  // The second B fades down from above as it comes into view.
  tl.fromTo(
    vec2,
    { opacity: 0, y: () => -0.09 * window.innerWidth },
    {
      opacity: 1,
      y: 0,
      duration: S6_SCROLL * 0.2,
      ease: 'power2.out',
      immediateRender: false,
    },
    enterAt(2915)
  );

  // Gallery photos resolve out of a soft blur as each scrolls in.
  const PHOTO_LEFTS = [2141, 2493, 2915];
  photos.forEach((el, i) => {
    tl.fromTo(
      el,
      { filter: 'blur(10px)' },
      {
        filter: BLUR_OUT,
        duration: S6_SCROLL * 0.18,
        ease: 'power2.out',
        immediateRender: false,
      },
      enterAt(PHOTO_LEFTS[i])
    );
  });
}

/* ------------------------------------------- Stage 7 — news slider -- */

function initNews() {
  const root = document.querySelector('[data-news]');
  if (!root) return;

  const viewport = root.querySelector('[data-news-viewport]');
  const track = root.querySelector('[data-news-track]');
  const cards = root.querySelectorAll('[data-news-card]');
  const prev = root.querySelector('[data-news-prev]');
  const next = root.querySelector('[data-news-next]');
  const fill = root.querySelector('[data-news-progress]');
  if (!track || cards.length < 2) return;

  let index = 0;

  /*
   * The viewport is padded on the left and bleeds off the right, so a plain
   * scrollWidth - clientWidth stops one gutter short and leaves the last card
   * clipped. Add the gutter back twice: once for the padding the track starts
   * after, once to leave a matching margin at the end.
   */
  const gutter = () =>
    parseFloat(getComputedStyle(viewport).paddingLeft) || 0;

  /*
   * One click advances a full page — everything currently on screen — rather
   * than a single card, so with four cards a single press lands on the last
   * one instead of nudging part way.
   */
  const step = () => Math.max(viewport.clientWidth - gutter(), 1);

  const maxOffset = () =>
    Math.max(0, track.scrollWidth - viewport.clientWidth + gutter() * 2);

  const maxIndex = () => {
    const s = step();
    return s > 0 ? Math.ceil(maxOffset() / s) : 0;
  };

  function paint() {
    const last = maxIndex();
    prev.disabled = index <= 0;
    next.disabled = index >= last;

    if (fill) {
      const visible = viewport.clientWidth - gutter();
      const total = track.scrollWidth || 1;
      const ratio = Math.min(visible / total, 1);
      const progress = last > 0 ? index / last : 0;
      gsap.to(fill, {
        width: ratio * 100 + '%',
        x: () => progress * (1 - ratio) * (fill.parentElement.clientWidth || 0),
        duration: 0.55,
        ease: 'power3.out',
      });
    }
  }

  function go(i) {
    index = Math.min(Math.max(i, 0), maxIndex());
    gsap.to(track, {
      x: -Math.min(index * step(), maxOffset()),
      duration: 0.55,
      ease: 'power3.out',
    });
    paint();
  }

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));

  window.addEventListener('resize', () => {
    gsap.set(track, { x: -Math.min(index * step(), maxOffset()) });
    paint();
  });

  paint();
}

/* ---------------------------------------------- Stage 8 — footer -- */

function initFooter() {
  const footer = document.querySelector('[data-footer]');
  if (!footer) return;

  const panel = footer.querySelector('[data-footer-panel]');
  const top = footer.querySelector('[data-footer-top]');

  // Reveal order: logo, mission + badge, the columns left to right, the
  // closing headline, then the legal row.
  const pieces = [
    footer.querySelector('.footer__logo'),
    footer.querySelector('.footer__mission'),
    footer.querySelector('.footer__badge'),
    footer.querySelector('.footer__col--group'),
    footer.querySelector('.footer__col--responsible'),
    footer.querySelector('.footer__col--artisans'),
    footer.querySelector('.footer__col--investors'),
    footer.querySelector('.footer__col--location'),
    footer.querySelector('.footer__col--contact'),
    footer.querySelector('.footer__col--social'),
    footer.querySelector('.footer__top'),
    footer.querySelector('.footer__closing'),
    footer.querySelector('.footer__legal--copy'),
    footer.querySelector('.footer__legal--links'),
    footer.querySelector('.footer__legal--site'),
  ].filter(Boolean);

  /*
   * Back to top plays a navy curtain: it wipes up over the page, the scroll
   * resets underneath it, then it keeps travelling up and off, uncovering
   * Stage 1 in its opening state.
   */
  const curtain = document.querySelector('[data-curtain]');
  let curtainBusy = false;

  if (top && curtain) {
    top.addEventListener('click', () => {
      if (curtainBusy) return;
      curtainBusy = true;
      lenis.stop();

      gsap
        .timeline({
          onComplete: () => {
            gsap.set(curtain, { clipPath: 'inset(100% 0% 0% 0%)' });
            lenis.start();
            curtainBusy = false;
          },
        })
        // Rises from the bottom until the page is covered.
        .fromTo(
          curtain,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power2.inOut' }
        )
        // Behind it, jump back to the very top.
        .add(() => {
          lenis.scrollTo(0, { immediate: true, force: true });
          ScrollTrigger.refresh();
        })
        // Then keeps going up and off, revealing the hero underneath.
        .to(curtain, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 0.7,
          ease: 'power2.inOut',
          delay: 0.1,
        });
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    gsap.set(panel, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(pieces, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(pieces, { opacity: 0, y: 34, filter: BLUR_IN });

  // Not pinned — this only tracks the footer's approach up the viewport.
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: footer,
      start: 'top bottom',
      end: 'top top',
      scrub: 0.6,
      invalidateOnRefresh: true,
      markers: MARKERS,
    },
  });

  // Charcoal curtain wipes up over the news slider.
  tl.fromTo(
    panel,
    { clipPath: 'inset(100% 0% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power2.inOut' },
    0
  );

  // Contents follow once the wipe is about 70% through.
  tl.to(
    pieces,
    {
      opacity: 1,
      y: 0,
      filter: BLUR_OUT,
      duration: 0.22,
      stagger: 0.06,
      ease: 'power2.out',
    },
    0.49
  );
}
