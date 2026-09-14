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
const S5_PILLAR = 1.2; // per pillar block
const PILLAR_COLORS = ['#a2c088', '#8fb8a8', '#c2a482', '#7e9bb5'];

const STAGE5_END = STAGE4_END + S5_ENTRY + S5_PILLAR * 4;

const STAGE5_END_T = STAGE5_END;

const S6_ENTRY = 1.0;
const S6_SCROLL = 2.5;
// 3935px canvas against a 1920px viewport.
const ARTISANS_TRAVEL_VW = -104.9479; // -2015px @ 1920

const STAGE6_END = STAGE5_END_T + S6_ENTRY + S6_SCROLL;

const SCENE_SCROLL = STAGE6_END * 1000; // 22440px

const FIGURE_STEP_VW = 15.2604; // 293px on the 1920 canvas

// Every fade-in resolves out of a soft blur rather than plain opacity.
const BLUR_IN = 'blur(8px)';
const BLUR_OUT = 'blur(0px)';

function initScene() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=' + SCENE_SCROLL,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      markers: MARKERS,
    },
  });

  addHero(tl, reduceMotion);
  addFigures(tl, reduceMotion);
  addAchievements(tl, reduceMotion);
  addProduct(tl, reduceMotion);
  addPillars(tl, reduceMotion);
  addArtisans(tl, reduceMotion);
}

/*
 * Contain-fits rawBBox (raw artwork units) into targetPx (a px rect on
 * screen), preserving aspect and centring on whichever axis has slack —
 * same semantics as SVG's own default preserveAspectRatio="xMidYMid meet".
 * Returns an SVG transform-attribute string (translate + scale), applied
 * directly via GSAP's attr config rather than CSS transform/transform-
 * origin — CSS transform-origin on a <g> inside a hidden, viewBox-less
 * <svg> resolved against the wrong reference box when this was tried
 * earlier this session (verified in-browser: the shape landed ~1300px
 * off-screen); the raw attribute form has no such ambiguity.
 */
/*
 * Contain-fits rawBBox (raw artwork units) into targetPx (a px rect on
 * screen), preserving aspect and centring on whichever axis has slack —
 * same semantics as SVG's own default preserveAspectRatio="xMidYMid meet".
 * Returns an SVG transform-attribute string (translate + scale), applied
 * directly via GSAP's attr config rather than CSS transform/transform-
 * origin — CSS transform-origin on a <g> inside a hidden, viewBox-less
 * <svg> resolved against the wrong reference box when this was tried
 * earlier this session (verified in-browser: the shape landed ~1300px
 * off-screen); the raw attribute form has no such ambiguity.
 */
function transformFor(rawBBox, targetPx) {
  const scale = Math.min(targetPx.w / rawBBox.w, targetPx.h / rawBBox.h);
  const renderedW = rawBBox.w * scale;
  const renderedH = rawBBox.h * scale;
  const offsetX = targetPx.x + (targetPx.w - renderedW) / 2;
  const offsetY = targetPx.y + (targetPx.h - renderedH) / 2;
  const tx = offsetX - rawBBox.x * scale;
  const ty = offsetY - rawBBox.y * scale;
  return `translate(${tx} ${ty}) scale(${scale})`;
}

function scaleRectAroundCenter(rect, factor) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const w = rect.w * factor;
  const h = rect.h * factor;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function addHero(tl, reduceMotion) {
  const hero = document.querySelector('[data-hero]');
  const bg = hero.querySelector('[data-hero-bg]');
  const maskGroup = hero.querySelector('[data-hero-mask-group]');
  const videoWrap = hero.querySelector('[data-hero-video-wrap]');
  const video = hero.querySelector('.hero__video');
  const markGroup = hero.querySelector('[data-hero-mark-group]');
  const mark = hero.querySelector('[data-hero-mark]');
  const wordmarkGroup = hero.querySelector('[data-hero-wordmark-group]');
  const wordmark = hero.querySelector('[data-hero-wordmark]');
  const nav = hero.querySelector('[data-hero-nav]');
  const content = hero.querySelector('[data-hero-content]');
  const ctas = hero.querySelectorAll('[data-hero-cta]');

  /*
   * Raw geometry measured from logo-fullwhite.svg (viewBox 0 0 488 296) via
   * getBBox() in-browser — a clean gap in the paths' y-midpoints (162 to
   * 225) splits its 62 flat, ungrouped paths into 37 (the mark) + 25 (the
   * wordmark), confirmed against frame 1-1's own sub-frame bboxes:
   *   whole lockup:      0, 0, 487.57, 295.53
   *   mark alone:        166.14, 0, 155.19, 185.09
   *   wordmark alone:    0, 194.78, 487.57, 100.75
   */
  const MARK_BBOX = { x: 166.14, y: 0, w: 155.19, h: 185.09 };
  const LOCKUP_BBOX = { x: 0, y: 0, w: 487.57, h: 295.53 };
  const LOCKUP_REST = { left: 37.318, top: 33.985, width: 25.394, height: 32.088 }; // 1-1

  /*
   * Five keyframe rects (all %, measured directly from Figma frames 1-1
   * through 1-5, node ids 977:237 / 980:436 / 998:849 / 980:511 / 931:4633
   * — a 1920x921 canvas) rather than formula-derived: the design doesn't
   * scale the mark uniformly around one fixed centre the whole way through
   * — 1-1 sits off-centre (within the lockup), 1-2/1-3 recentre and grow,
   * so each stop is taken from its own frame instead of extrapolated.
   */
  const K0 = { left: 45.97, top: 33.985, width: 8.083, height: 20.097 }; // 1-1, rest
  const K1 = { left: 42.72, top: 31.95, width: 14.52, height: 36.11 }; // 1-2
  const K2 = { left: 35.74, top: 14.6, width: 28.48, height: 70.81 }; // 1-3

  // K3 (~1-4's magnitude) is computed, not copied from the frame: 1-4's own
  // numbers drift off-centre (likely a corner-drag scale in Figma, not
  // deliberate — 1-1/1-2/1-3 are all cleanly centred). Recentred here, and
  // sized to guarantee real coverage on any viewport rather than baking in
  // one screenshot's aspect ratio, with 1-4's own ~18x growth as a floor.
  const K3_FACTOR_FLOOR = 18;
  const toPx = (pct) => ({
    x: (pct.left / 100) * window.innerWidth,
    y: (pct.top / 100) * window.innerHeight,
    w: (pct.width / 100) * window.innerWidth,
    h: (pct.height / 100) * window.innerHeight,
  });

  const k3RectPx = () => {
    const restPx = toPx(K0);
    const restReach = 0.5 * Math.hypot(restPx.w, restPx.h);
    const viewportHalfDiag =
      0.5 * Math.hypot(window.innerWidth, window.innerHeight);
    const coverageFactor = (viewportHalfDiag / restReach) * 1.2;
    const factor = Math.max(coverageFactor, K3_FACTOR_FLOOR);
    return scaleRectAroundCenter(restPx, factor);
  };

  // K5 — the nav-logo slot, measured from frame 1-5's Calque_1: 828,41 /
  // 264,161 on the 1920x921 canvas.
  const K5 = { left: 43.125, top: 4.451, width: 13.75, height: 17.48 };
  const k5RectPx = () => toPx(K5);

  const navEndTop = 8.198; // % — avg of menu (76.5px) and search (74.5px)
  const navStartTop = -24.17; // % — off-screen above; not design-specified
  const contentEndTop = 45.96; // % — frame 1-5's content group
  const contentStartTop = 124.79; // % — below the fold; not design-specified

  if (reduceMotion) {
    const endRect = k5RectPx();
    gsap.set(markGroup, { attr: { transform: () => transformFor(MARK_BBOX, endRect) } });
    gsap.set(maskGroup, { attr: { transform: () => transformFor(MARK_BBOX, endRect) } });
    gsap.set([mark, wordmark], { y: 0 });
    gsap.set(mark, { opacity: 1 });
    gsap.set(wordmark, { opacity: 0 });
    gsap.set(bg, { opacity: 0 });
    gsap.set(videoWrap, { opacity: 0 });
    gsap.set(nav, { top: navEndTop + '%', opacity: 1 });
    gsap.set(content, { top: contentEndTop + '%', opacity: 1 });
    gsap.set(ctas, { y: 0, opacity: 1, filter: BLUR_OUT });
    if (video) video.play().catch(() => {});
    return;
  }

  /*
   * Load-in: the logo (mark + wordmark together, at rest) slides down from
   * above and fades in, once, independent of scroll — styled like nav's own
   * entrance elsewhere in the sequence. This is a separate CSS transform on
   * each outer <svg>, layered on top of the inner <g>'s own scroll-scrubbed
   * attr transform, so the two never fight.
   */
  const lockupRestRectPx = () => toPx(LOCKUP_REST);
  const WORDMARK_DROP_PCT = 11.378; // % of viewport height — 104.79px @ 921, frame 1-2
  const lockupDroppedRectPx = () => {
    const r = lockupRestRectPx();
    return { ...r, y: r.y + (WORDMARK_DROP_PCT / 100) * window.innerHeight };
  };

  tl.set(wordmarkGroup, {
    attr: { transform: () => transformFor(LOCKUP_BBOX, lockupRestRectPx()) },
  });
  tl.set([markGroup, maskGroup], {
    attr: { transform: () => transformFor(MARK_BBOX, toPx(K0)) },
  });

  gsap.fromTo(
    [mark, wordmark],
    { y: -60, opacity: 0 },
    { y: 0, opacity: 1, duration: 1.1, ease: 'power2.out', stagger: 0.08 }
  );

  /* --- K0 -> K1: 0 -> 0.5 — wordmark fades + drops; mark recentres and
         grows to ~1.8x (frame 1-2). --- */

  const K1_END = 0.5;

  tl.fromTo(
    wordmarkGroup,
    { attr: { transform: () => transformFor(LOCKUP_BBOX, lockupRestRectPx()) } },
    { attr: { transform: () => transformFor(LOCKUP_BBOX, lockupDroppedRectPx()) }, duration: K1_END, ease: 'power1.in' },
    0
  );
  tl.fromTo(wordmark, { opacity: 1 }, { opacity: 0, duration: K1_END * 0.7 }, 0);

  tl.fromTo(
    [markGroup, maskGroup],
    { attr: { transform: () => transformFor(MARK_BBOX, toPx(K0)) } },
    { attr: { transform: () => transformFor(MARK_BBOX, toPx(K1)) }, duration: K1_END },
    0
  );

  /* --- K1 -> K2: 0.5 -> 1.0 — mark keeps growing (frame 1-3); solid fill
         starts crossfading to the masked video. --- */

  const K2_END = 1.0;
  const k1k2Dur = K2_END - K1_END;

  tl.fromTo(
    [markGroup, maskGroup],
    { attr: { transform: () => transformFor(MARK_BBOX, toPx(K1)) } },
    { attr: { transform: () => transformFor(MARK_BBOX, toPx(K2)) }, duration: k1k2Dur },
    K1_END
  );

  tl.fromTo(mark, { opacity: 1 }, { opacity: 0, duration: k1k2Dur }, K1_END);
  tl.to(videoWrap, { opacity: 1, duration: k1k2Dur }, K1_END);

  /* --- K2 -> K3: 1.0 -> 1.7 — Phase 3: mark grows to full coverage;
         video-via-mask expands; background stays solid #B0C2C4 outside the
         shape's silhouette. Once the mask extends past the viewport edges,
         the masked layer is frozen as the permanent hero backdrop. --- */

  const K3_END = 1.7;
  const k2k3Dur = K3_END - K2_END;

  tl.fromTo(
    [markGroup, maskGroup],
    { attr: { transform: () => transformFor(MARK_BBOX, toPx(K2)) } },
    { attr: { transform: () => transformFor(MARK_BBOX, k3RectPx()) }, duration: k2k3Dur },
    K2_END
  );

  /* Background stays solid #B0C2C4 throughout Phase 3 — fade removed from
     this segment and rescheduled to Phase 4 (K3->K5). */

  /* --- K3 -> K5: 1.7 -> 2.5 — Phase 4: B+sunburst (now frozen/invisible)
         fades out completely; background crossfades from solid #B0C2C4 to
         the full-bleed video. Nav (with its own small logo) and content
         slide in and fade. Mark stays at opacity 0 (not visible; nav has
         its own separate small logo). --- */

  /* Mark is already at opacity 0 from K1->K2, keep it there — don't fade
     back in. Nav has its own separate logo, not the giant mark shrinking. */

  /* Background crossfades from #B0C2C4 to transparent, revealing the frozen
     video backdrop that now fills the entire viewport. */
  tl.to(bg, { opacity: 0, duration: 0.35, ease: 'power2.in' }, K3_END + 0.15);

  tl.fromTo(
    nav,
    { top: navStartTop + '%', opacity: 0, filter: BLUR_IN },
    {
      top: navEndTop + '%',
      opacity: 1,
      filter: BLUR_OUT,
      duration: 0.25,
      ease: 'power2.out',
    },
    2.0
  );

  tl.fromTo(
    content,
    { top: contentStartTop + '%', opacity: 0, filter: BLUR_IN },
    {
      top: contentEndTop + '%',
      opacity: 1,
      filter: BLUR_OUT,
      duration: 0.3,
      ease: 'power3.out',
    },
    2.05
  );

  // CTAs stagger in last, landing exactly at 2.5 — end of the scrubbed range.
  tl.fromTo(
    ctas,
    { y: 42, opacity: 0, filter: BLUR_IN },
    {
      y: 0,
      opacity: 1,
      filter: BLUR_OUT,
      duration: 0.15,
      stagger: 0.1,
      ease: 'power2.out',
    },
    2.25
  );

  // Nothing is scheduled between 2.5 and HOLD_END (3.2) — the 700px hold.

  if (video) video.play().catch(() => {});
}

/* --------------------------- Segments A / B / C — "2026 in figures" -- */

function addFigures(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  if (!scope) return;

  const cream = scope.querySelector('[data-figures-cream]');
  const bwrap = scope.querySelector('[data-figures-bwrap]');
  const media = scope.querySelector('[data-figures-media]');
  const panel = scope.querySelector('[data-figures-panel]');
  const track = scope.querySelector('[data-figures-track]');
  const photoTrack = scope.querySelector('[data-figures-phototrack]');
  const photos = scope.querySelectorAll('[data-figures-photo]');

  const step = () => (FIGURE_STEP_VW / 100) * window.innerWidth;
  const photoStep = () => window.innerHeight;

  if (reduceMotion) {
    gsap.set([cream, bwrap], { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set([media, panel], { opacity: 1, y: 0, filter: BLUR_OUT });
    gsap.set(photoTrack, { y: () => -photoStep() * (photos.length - 1) });
    gsap.set(track, { y: () => -step() * (photos.length - 1) });
    return;
  }

  gsap.set(panel, { opacity: 0, y: 60, filter: BLUR_IN });

  /* --- Segment A: 3200 -> 4400 --- */

  // Cream wipes in from the left, straight over the hero.
  tl.fromTo(
    cream,
    { clipPath: 'inset(0% 100% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: SEG_A },
    HOLD_END
  );

  // The B — and only the B — wipes in from the right, over the same range.
  tl.fromTo(
    bwrap,
    { clipPath: 'inset(0% 0% 0% 100%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: SEG_A },
    HOLD_END
  );

  // Right-hand photo panel resolves out of the hero footage as the wipe
  // crosses the midpoint, so no second edge travels across the screen.
  tl.fromTo(
    media,
    { opacity: 0, filter: BLUR_IN },
    { opacity: 1, filter: BLUR_OUT, duration: SEG_A * 0.35 },
    HOLD_END + SEG_A * 0.4
  );

  /* --- Segment B: 4400 -> 5200 --- */

  const bStart = HOLD_END + SEG_A;

  tl.to(
    panel,
    {
      opacity: 1,
      y: 0,
      filter: BLUR_OUT,
      duration: SEG_B * 0.75,
      ease: 'power2.out',
    },
    bStart
  );

  /* --- Segment C: 800px per swap. Track slide and photo crossfade overlap
         so each swap reads as one coordinated motion. --- */

  for (let i = 1; i < photos.length; i += 1) {
    const cStart = HOLD_END + SEG_A + SEG_B + SEG_C * (i - 1);

    tl.to(
      track,
      { y: () => -step() * i, duration: SEG_C * 0.55, ease: 'power2.inOut' },
      cStart
    );

    // Photo panel swipes up in lockstep with the figure track.
    tl.to(
      photoTrack,
      { y: () => -photoStep() * i, duration: SEG_C * 0.55, ease: 'power2.inOut' },
      cStart
    );
  }
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
  const media = scope.querySelector('[data-figures-media]');
  const panel = scope.querySelector('[data-figures-panel]');

  /*
   * The two marks are registered on their own B glyphs, measured from the SVGs:
   * B.svg's ink sits at 2948,4321 (1318x1891) in a 7460x8854 box; b-nautilus's
   * at 1267,1856 (566x813) in 3205x3804. Solving both onto the design rect
   * (112,150 -> 637,900 @ 1920x1055) gives these transforms. B.svg ends where
   * the nautilus's B rests, and the nautilus starts where B.svg's B is now, so
   * the glyphs coincide at both ends and stay aligned through the crossfade.
   */
  const B_END_SCALE = 0.3975;
  const bEndX = () => -0.3439 * window.innerWidth;
  const bEndY = () => 0.4797 * window.innerHeight;

  const NAUTILUS_START_SCALE = 2.51;
  const nautilusStartX = () => 0.3427 * window.innerWidth;
  const nautilusStartY = () => -0.4794 * window.innerHeight;

  const WATERMARK_OPACITY = 0.18;

  if (reduceMotion) {
    gsap.set(sky, { clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(text, { opacity: 1, scale: 1, filter: BLUR_OUT });
    gsap.set(b, { opacity: 0 });
    gsap.set(nautilus, { scale: 1, x: 0, y: 0, opacity: WATERMARK_OPACITY });
    gsap.set([cream, media, panel], { opacity: 0 });
    return;
  }

  gsap.set(text, { opacity: 0, scale: 0.95, filter: BLUR_IN });

  /* --- Segment A: 6800 -> 7300. Nothing is scheduled — the final stat
         holds static so it can actually be read. --- */

  /* --- Segment B: 7300 -> 8500 --- */

  const takeover = STAGE2_END + S3_HOLD_A;

  const markMove = {
    duration: S3_TAKEOVER * 0.85,
    ease: 'power1.inOut',
  };

  // The blue wipes in from the right edge and expands left across the screen.
  tl.fromTo(
    sky,
    { clipPath: 'inset(0% 0% 0% 100%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', ...markMove },
    takeover
  );

  // B.svg travels to the nautilus's B and hands over to it.
  tl.to(
    b,
    {
      scale: B_END_SCALE,
      x: bEndX,
      y: bEndY,
      backgroundColor: '#ffffff',
      ...markMove,
    },
    takeover
  );

  tl.fromTo(
    nautilus,
    {
      scale: NAUTILUS_START_SCALE,
      x: nautilusStartX,
      y: nautilusStartY,
      opacity: 0,
    },
    { scale: 1, x: 0, y: 0, opacity: WATERMARK_OPACITY, ...markMove },
    takeover
  );

  // Crossfade sits inside the move, so the two marks swap while overlapped.
  tl.to(
    b,
    { opacity: 0, duration: S3_TAKEOVER * 0.5, ease: 'power1.inOut' },
    takeover + S3_TAKEOVER * 0.25
  );

  // Figures and photo fade as the expansion swallows them.
  tl.to(
    [panel, media],
    { opacity: 0, duration: S3_TAKEOVER * 0.5, ease: 'power1.in' },
    takeover + S3_TAKEOVER * 0.18
  );

  // The cream goes last — it is the backstop that keeps the Stage 1 hero from
  // showing through the corners the circle has not reached yet.
  tl.to(
    cream,
    { opacity: 0, duration: S3_TAKEOVER * 0.2 },
    takeover + S3_TAKEOVER * 0.8
  );

  /* --- Segment C: 8500 -> 9100, only once the takeover has finished --- */

  tl.to(
    text,
    {
      opacity: 1,
      scale: 1,
      filter: BLUR_OUT,
      duration: S3_TEXT * 0.8,
      ease: 'power2.out',
    },
    takeover + S3_TAKEOVER
  );

  /* --- Segment D: 9100 -> 9600. Nothing scheduled; Stage 4 picks up at
         9600, so the gap is internal and preserved. --- */
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

  const tabletStartY = () =>
    window.innerHeight / 2 + tablet.offsetHeight / 2 + 40;
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
function addPillars(tl, reduceMotion) {
  const scope = document.querySelector('[data-figures]');
  if (!scope) return;

  const bgs = scope.querySelectorAll('[data-pillar-bg]');
  const lgs = scope.querySelectorAll('[data-pillar-lg]');
  const smls = scope.querySelectorAll('[data-pillar-sml]');
  const words = scope.querySelectorAll('[data-pillar-word]');
  const bodies = scope.querySelectorAll('[data-pillar-body]');
  if (!bgs.length) return;

  const shape = scope.querySelector('[data-pillars-shape]');
  const be = scope.querySelector('[data-pillars-be]');
  const cta = scope.querySelector('[data-pillars-cta]');
  const tablet = scope.querySelector('[data-product-tablet]');
  const panel = scope.querySelector('[data-product-panel]');
  const nautilus = scope.querySelector('[data-figures-nautilus]');

  const HIDDEN = { '--wipe': '0%' };
  const SHOWN = { '--wipe': '100%' };
  const inner = (w) => w.firstElementChild;
  const SML_TRAVEL = 55; // percent of the photo's own height
  const SML_BLUR = 'blur(6px)';

  const SHAPE_START_SCALE = 0.705;
  const shapeStartX = () => -0.4193 * window.innerWidth;
  const shapeStartY = () => -0.1115 * window.innerWidth;

  if (reduceMotion) {
    gsap.set([...bgs, ...lgs, ...smls], SHOWN);
    gsap.set([...bodies, ...lgs], { opacity: 0 });
    gsap.set(
      [bodies[bodies.length - 1], lgs[lgs.length - 1], be, cta],
      { opacity: 1 }
    );
    gsap.set(shape, { opacity: 1, scale: 1, x: 0, y: 0 });
    gsap.set([tablet, panel], { opacity: 0 });
    return;
  }

  gsap.set([...bgs, ...lgs, ...smls], HIDDEN);
  gsap.set(bodies, { opacity: 0 });
  gsap.set([be, cta], { opacity: 0, filter: BLUR_IN });
  words.forEach((w, i) => gsap.set(inner(w), { yPercent: i === 0 ? 100 : 100 }));

  const entry = STAGE4_END;
  const beat = (from, to) => ({
    at: entry + S5_ENTRY * from,
    duration: S5_ENTRY * (to - from),
  });

  /* --- 1. Stage 4 fades away --- */

  const b1 = beat(0, 0.3);
  tl.to([tablet, panel], { opacity: 0, duration: b1.duration }, b1.at);
  tl.to(nautilus, { opacity: 0, duration: b1.duration }, b1.at);

  /* --- 2. The B expands, moving right --- */

  const b2 = beat(0.28, 0.62);
  tl.fromTo(
    shape,
    {
      opacity: 0,
      scale: SHAPE_START_SCALE,
      x: shapeStartX,
      y: shapeStartY,
    },
    {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      duration: b2.duration,
      ease: 'power2.inOut',
      // Otherwise GSAP applies the from-values at build time, putting the B
      // on screen from the very start of Stage 1.
      immediateRender: false,
    },
    b2.at
  );

  /* --- 3. Colour and photos wipe at 110deg, starting with the B --- */

  const b3 = beat(0.28, 0.72);
  tl.to(
    [bgs[0], lgs[0], smls[0]],
    { ...SHOWN, duration: b3.duration, ease: 'power2.inOut' },
    b3.at
  );
  tl.to(lgs[0], { opacity: 1, duration: b3.duration * 0.4 }, b3.at);

  // The small photo resolves out of the same soft blur it uses on the swaps.
  tl.fromTo(
    inner(smls[0]),
    { filter: SML_BLUR },
    {
      filter: BLUR_OUT,
      duration: b3.duration * 0.8,
      ease: 'power2.out',
      immediateRender: false,
    },
    b3.at
  );

  const b4 = beat(0.68, 1);
  tl.to(
    inner(words[0]),
    { yPercent: 0, duration: b4.duration * 0.8, ease: 'power2.out' },
    b4.at
  );
  tl.to(bodies[0], { opacity: 1, duration: b4.duration * 0.8 }, b4.at);
  tl.to(
    [be, cta],
    {
      opacity: 1,
      filter: BLUR_OUT,
      duration: b4.duration * 0.8,
      stagger: b4.duration * 0.2,
      ease: 'power2.out',
    },
    b4.at
  );

  /* --- Pillar to pillar: colour crossfades, photos swipe up, word swipes. --- */

  for (let i = 1; i < bgs.length; i += 1) {
    const at = STAGE4_END + S5_ENTRY + S5_PILLAR * i;
    const swap = S5_PILLAR * 0.5;

    // These panels are already fully wiped; they arrive by fading/sliding.
    gsap.set([bgs[i], lgs[i], smls[i]], SHOWN);
    gsap.set(bgs[i], { opacity: 0 });
    gsap.set(inner(smls[i]), { yPercent: SML_TRAVEL, opacity: 0 });

    // Colour fades to the next colour.
    tl.to(bgs[i], { opacity: 1, duration: swap, ease: 'power1.inOut' }, at);

    // Left photo simply crossfades.
    tl.to(lgs[i - 1], { opacity: 0, duration: swap, ease: 'power1.inOut' }, at);
    tl.fromTo(
      lgs[i],
      { opacity: 0 },
      {
        opacity: 1,
        duration: swap,
        ease: 'power1.inOut',
        immediateRender: false,
      },
      at
    );

    // Small photo drifts up a short distance and softens through the change.
    tl.to(
      inner(smls[i - 1]),
      {
        yPercent: -SML_TRAVEL,
        opacity: 0,
        filter: SML_BLUR,
        duration: swap * 0.75,
        ease: 'power2.in',
      },
      at
    );
    tl.fromTo(
      inner(smls[i]),
      { yPercent: SML_TRAVEL, opacity: 0, filter: SML_BLUR },
      {
        yPercent: 0,
        opacity: 1,
        filter: BLUR_OUT,
        duration: swap * 0.85,
        ease: 'power2.out',
        immediateRender: false,
      },
      at + swap * 0.25
    );

    // Of the text, only the word moves.
    tl.to(
      inner(words[i - 1]),
      { yPercent: -100, duration: swap * 0.8, ease: 'power2.inOut' },
      at + swap * 0.1
    );
    tl.to(
      inner(words[i]),
      { yPercent: 0, duration: swap * 0.8, ease: 'power2.inOut' },
      at + swap * 0.1
    );

    // Body crossfades, since only its bold prefix differs.
    tl.to(bodies[i - 1], { opacity: 0, duration: swap * 0.5 }, at + swap * 0.1);
    tl.to(bodies[i], { opacity: 1, duration: swap * 0.5 }, at + swap * 0.5);
  }

  // Explicit trailing spacer so the last pillar's hold keeps its length.
  tl.to({}, { duration: S5_PILLAR }, STAGE4_END + S5_ENTRY + S5_PILLAR * 3);
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
