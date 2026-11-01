/* ===== Types ===== */
interface Point { x: number; y: number; }

/* ===== DOM refs ===== */
const el = {
    rocket: document.querySelector<HTMLElement>('#rocket')!,
    progressFill: document.querySelector<HTMLElement>('#progressFill')!,
    header: document.querySelector<HTMLElement>('#header')!,
    scene: document.querySelector<HTMLElement>('#scene')!,
    moon: document.querySelector<HTMLElement>('#moon')!,
    starsDeep: document.querySelector<HTMLElement>('#starsDeep')!,
    starsNear: document.querySelector<HTMLElement>('#starsNear')!,
    dusk: document.querySelector<HTMLElement>('#dusk')!,
    clouds: document.querySelector<HTMLElement>('#clouds')!,
    ground: document.querySelector<HTMLElement>('#ground')!,
    pad: document.querySelector<HTMLElement>('#pad')!,
    gantry: document.querySelector<HTMLElement>('#gantry')!,
    trajectoryFull: document.querySelector<HTMLElement>('#trajectoryFull')!,
    trajectoryTravelled: document.querySelector<HTMLElement>('#trajectoryTravelled')!,
    trajectory: document.querySelector<HTMLElement>('#trajectory')!,
    flame: document.querySelector<HTMLElement>('#rocketFlame')!,
    telemetry: document.querySelector<HTMLElement>('#telemetry')!,
    phaseVal: document.querySelector<HTMLElement>('#phaseVal')!,
    altVal: document.querySelector<HTMLElement>('#altVal')!,
    velVal: document.querySelector<HTMLElement>('#velVal')!,
    navLinks: document.querySelectorAll<HTMLAnchorElement>('.header__link[data-section]'),
    sections: document.querySelectorAll<HTMLElement>('section[id]'),
    footerBack: document.querySelector<HTMLAnchorElement>('.footer__back'),
};
const sections = Array.from(el.sections);

/* ===== Prevent flash of invisible content ===== */
document.documentElement.classList.remove('js');

/* ===== Feature detection ===== */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = (): boolean => window.innerWidth < 720;

/* ===== Anchor measurement ===== */
interface AnchorPoints {
    start: Point;
    end: Point;
    /** Control point 1 (start tangent) */
    c1: Point;
    /** Control point 2 (end tangent) */
    c2: Point;
}

function measureAnchors(): AnchorPoints {
    const sceneRect = el.scene.getBoundingClientRect();
    const sceneW = sceneRect.width;
    const sceneH = sceneRect.height;

    // Pad: measure the pad element's position in viewport
    const padRect = el.pad.getBoundingClientRect();
    // Rocket nozzle is at bottom-center of the pad's SVG content
    const startX = padRect.left + padRect.width / 2 - sceneRect.left;
    const startY = padRect.top - sceneRect.top; // nozzle at top of pad rect

    // Moon: measure the moon element position
    const moonRect = el.moon.getBoundingClientRect();
    const endX = moonRect.left + moonRect.width / 2 - sceneRect.left;
    const endY = moonRect.top + moonRect.height / 2 - sceneRect.top;

    // On narrow screens, end point is in the right-hand gutter
    let ex = endX, ey = endY;
    if (isNarrow()) {
        ex = sceneW - 40; // right gutter (roughly 30px rocket + margin)
        ey = sceneH * 0.25; // upper third of scene
    }

    // Control points: near-vertical start, gentle curve to end
    const cp1x = startX + 4;
    const cp1y = startY - sceneH * 0.4;
    const cp2x = ex + (startX - ex) * 0.6;
    const cp2y = ey - sceneH * 0.15;

    return {
        start: { x: startX, y: startY },
        end: { x: ex, y: ey },
        c1: { x: cp1x, y: cp1y },
        c2: { x: cp2x, y: cp2y },
    };
}

/* ===== Cubic Bézier ===== */
function cubicBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;
    return {
        x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
        y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
    };
}

function bezierTangent(t: number, p0: Point, p1: Point, p2: Point, p3: Point): number {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const dx = -3 * uu * p0.x + 3 * (uu - 2 * u * t) * p1.x + 3 * (2 * u * t - tt) * p2.x + 3 * tt * p3.x;
    const dy = -3 * uu * p0.y + 3 * (uu - 2 * u * t) * p1.y + 3 * (2 * u * t - tt) * p2.y + 3 * tt * p3.y;
    return Math.atan2(dy, dx);
}

/* ===== Smoothstep easing ===== */
function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
}

/* ===== State ===== */
let anchors = measureAnchors();
let currentProgress = 0;
let targetProgress = 0;
let animating = false;
let prevScrollY = 0;
let scrollVelocity = 0;

/* ===== Progress calculation ===== */
function calcScrollProgress(): number {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.min(1, Math.max(0, scrollTop / docHeight));
}

/* ===== Telemetry ===== */
const PHASES: { threshold: number; name: string }[] = [
    { threshold: 0, name: 'PRE-LAUNCH' },
    { threshold: 0.05, name: 'IGNITION' },
    { threshold: 0.15, name: 'ASCENT' },
    { threshold: 0.40, name: 'STAGE SEPARATION' },
    { threshold: 0.60, name: 'LUNAR TRANSFER' },
    { threshold: 0.85, name: 'LUNAR ORBIT' },
    { threshold: 1.0, name: 'MOON' },
];

function getPhase(progress: number): string {
    for (let i = PHASES.length - 1; i >= 0; i--) {
        if (progress >= PHASES[i].threshold) return PHASES[i].name;
    }
    return PHASES[0].name;
}

function getAltitude(progress: number): string {
    const alt = Math.round(progress * 384400); // km to moon
    return `${alt.toLocaleString()} km`;
}

function getVelocity(progress: number): string {
    // Velocity peaks mid-flight
    const vel = Math.round(Math.sin(progress * Math.PI) * 11200);
    return `${vel.toLocaleString()} m/s`;
}

function updateTelemetry(progress: number): void {
    if (el.phaseVal) el.phaseVal.textContent = getPhase(progress);
    if (el.altVal) el.altVal.textContent = getAltitude(progress);
    if (el.velVal) el.velVal.textContent = getVelocity(progress);
}

/* ===== Header switching ===== */
function updateHeader(progress: number): void {
    // Switch to solid after ~72% of first viewport
    const switchPoint = window.innerHeight * 0.72;
    const isSolid = window.scrollY > switchPoint;
    el.header.classList.toggle('header--solid', isSolid);
}

/* ===== Scroll-spy ===== */
function updateScrollSpy(): void {
    const scrollY = window.scrollY;
    const headerHeight = 80;

    let activeId = '';

    for (const section of sections) {
        const top = section.getBoundingClientRect().top + window.scrollY - headerHeight;
        const bottom = top + section.offsetHeight;

        if (scrollY >= top && scrollY < bottom) {
            activeId = section.id;
            break;
        }
    }

    el.navLinks.forEach(link => {
        link.classList.toggle('header__link--active', link.dataset.section === activeId);
    });
}

/* ===== Update scene ===== */
function updateScene(progress: number): void {
    const eased = smoothstep(progress);
    const p0 = anchors.start;
    const p3 = anchors.end;
    const pos = cubicBezier(eased, p0, anchors.c1, anchors.c2, p3);
    const angle = bezierTangent(eased, p0, anchors.c1, anchors.c2, p3);

    // Rocket position and rotation
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const rx = pos.x;
    const ry = pos.y;
    el.rocket.style.transform = `translate(${rx}px, ${ry}px) rotate(${angle + Math.PI / 2}rad)`;

    // Rocket visibility & flame
    const flameVisible = progress > 0.03 && progress < 0.95;
    if (el.flame) {
        el.flame.style.opacity = flameVisible ? '1' : '0';
    }

    // Progress bar
    if (el.progressFill) {
        el.progressFill.style.width = `${progress * 100}%`;
    }

    // Trajectory trail
    if (!isNarrow()) {
        const pathLen = 2000;
        const offset = pathLen * (1 - progress);
        el.trajectoryTravelled.setAttribute('stroke-dashoffset', String(offset));
    }

    // Parallax layers
    const p = progress;
    // Deep stars: subtle movement
    el.starsDeep.style.transform = `translateY(${-p * 30}px)`;
    // Near stars: more movement + brighten
    const nearBright = 0.3 + p * 0.7;
    el.starsNear.style.transform = `translateY(${-p * 60}px)`;
    el.starsNear.style.opacity = String(nearBright);

    // Dusk fades out
    el.dusk.style.opacity = String(Math.max(0, 1 - p * 1.5));

    // Clouds move down slowly
    el.clouds.style.transform = `translateY(${p * 80}px)`;
    el.clouds.style.opacity = String(Math.max(0, 1 - p * 1.2));

    // Ground
    el.ground.style.transform = `translateY(${p * 40}px)`;
    el.ground.style.opacity = String(Math.max(0, 1 - p * 1.8));

    // Pad
    el.pad.style.transform = `translateY(${p * 60}px)`;
    el.pad.style.opacity = String(Math.max(0, 1 - p * 2));

    // Gantry
    if (!isNarrow()) {
        el.gantry.style.transform = `translateY(${p * 60}px)`;
        el.gantry.style.opacity = String(Math.max(0, 1 - p * 1.5));
    }

    // Telemetry
    updateTelemetry(progress);
}

/* ===== RAF loop ===== */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function tick(): void {
    scrollVelocity = window.scrollY - prevScrollY;
    prevScrollY = window.scrollY;

    targetProgress = calcScrollProgress();
    currentProgress = lerp(currentProgress, targetProgress, 0.08);

    // Stop loop when close enough
    if (Math.abs(currentProgress - targetProgress) < 0.0001) {
        currentProgress = targetProgress;
        animating = false;
    }

    updateScene(currentProgress);
    updateHeader(currentProgress);
    updateScrollSpy();

    if (animating) {
        requestAnimationFrame(tick);
    }
}

function startAnimation(): void {
    if (!animating) {
        animating = true;
        requestAnimationFrame(tick);
    }
}

/* ===== Event handlers ===== */
function onScroll(): void {
    startAnimation();
}

function onResize(): void {
    anchors = measureAnchors();
    // Rebuild trajectory path
    buildTrajectoryPath();
    // Jump to current progress
    currentProgress = calcScrollProgress();
    updateScene(currentProgress);
}

/* ===== Trajectory path ===== */
function buildTrajectoryPath(): void {
    if (isNarrow()) {
        el.trajectory.style.display = 'none';
        return;
    }
    el.trajectory.style.display = '';
    const p0 = anchors.start;
    const p3 = anchors.end;
    const steps = 60;
    let d = `M ${p0.x} ${p0.y} C ${anchors.c1.x} ${anchors.c1.y}, ${anchors.c2.x} ${anchors.c2.y}, ${p3.x} ${p3.y}`;
    el.trajectoryFull.setAttribute('d', d);
    el.trajectoryTravelled.setAttribute('d', d);
}

/* ===== Navigation click handling ===== */
function setupNavigation(): void {
    el.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const id = link.getAttribute('href')?.slice(1);
            if (!id) return;
            const target = document.getElementById(id);
            if (!target) return;
            const headerHeight = el.header.offsetHeight;
            const top = target.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });
}

/* ===== Init ===== */
function init(): void {
    // Reduced motion: static scene at 55% progress, no scroll listeners
    if (prefersReduced) {
        currentProgress = 0.55;
        updateScene(0.55);
        el.progressFill.style.display = 'none';
        return;
    }

    buildTrajectoryPath();

    // Set initial progress
    currentProgress = calcScrollProgress();
    updateScene(currentProgress);
    updateHeader(currentProgress);
    updateScrollSpy();

    // Attach listeners
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    // Navigation
    setupNavigation();

    // Footer back link
    if (el.footerBack) {
        el.footerBack.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Start RAF loop
    startAnimation();
}

// Wait for fonts and initial layout
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}