/* ════════════════════════════════════════════════════════════
   Portfolio Script — Nour Eldin Waleed
   Sections:
     1. Hero Slideshow (crossfade + Ken Burns)
     2. Counter Animation (4-phase QTO counter)
     3. Typewriter
     4. Scroll Animations (IntersectionObserver)
     5. Stat Counters (about section)
     6. Nav Active State
     7. Filter Tabs (work section)
     8. Mobile Menu
════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════
   1. HERO SLIDESHOW
   Cycles 3 slides every 4500ms with 1.4s
   crossfade and Ken Burns zoom per slide.
   Pauses when tab is hidden.
══════════════════════════════════════════ */
(function initSlideshow() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  if (!slides.length) return;

  let currentIdx = 0;
  let timerId    = null;
  let isRunning  = false;

  function goToSlide(idx) {
    slides[currentIdx].classList.remove('active');
    dots[currentIdx].classList.remove('active');
    dots[currentIdx].setAttribute('aria-label', `Slide ${currentIdx + 1}`);

    currentIdx = (idx + slides.length) % slides.length;

    slides[currentIdx].classList.add('active');
    dots[currentIdx].classList.add('active');
    dots[currentIdx].setAttribute('aria-label', `Slide ${currentIdx + 1}, current`);
  }

  function nextSlide() {
    goToSlide(currentIdx + 1);
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    timerId = setInterval(nextSlide, 4500);
  }

  function stopTimer() {
    clearInterval(timerId);
    isRunning = false;
  }

  // Dot click handlers
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.dot, 10);
      goToSlide(idx);
      // Restart timer from this point
      stopTimer();
      startTimer();
    });
  });

  // Pause when tab hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  // Start
  startTimer();
})();


/* ══════════════════════════════════════════
   2. COUNTER ANIMATION — 5-PROJECT CYCLE
   Cycles through all 5 projects, each with
   its own before/after values, accent color,
   and label. DrawTrack uses text-morph mode.

   Per project: 4 phases
   Phase 0 (2000ms): Hold "before", red bar 100%
   Phase 1 (5000ms): Count/morph to "after",
                     bar shrinks + recolors
   Phase 2 (2500ms): Hold "after", accent bar
   Phase 3 (800ms):  Fade out → advance → fade in
══════════════════════════════════════════ */
(function initCounter() {

  const COUNTER_PROJECTS = [
    {
      // ── Countdown: hours → minutes (smart unit) ──
      project:    '01 — Architectural QTO',
      labelTop:   'QTO COMPLETION TIME',
      before:     { display: '4 hrs' },
      after:      { display: '8 min' },
      label:      'QTO that used to take a full workday',
      color:      '#7f77dd',
      colorStart: '#e24b4a',
      animType:   'countdown',
      countFrom:  240,   // internal minutes
      countTo:    8,
      unit:       'smart',  // shows Xh above 60, X min below
    },
    {
      // ── Countdown: live numeric time reduction ──
      project:    '02 — IPC Excel System',
      labelTop:   'PAYMENT CYCLE TIME',
      before:     { display: '72 hrs' },
      after:      { display: '4 hrs'  },
      label:      'Payment cycle from data to approved IPC',
      color:      '#ef9f27',
      colorStart: '#e24b4a',
      animType:   'countdown',
      countFrom:  72,
      countTo:    4,
      unit:       'hrs',
    },
    {
      // ── Consolidation: 200 scattered files → 1 system ──
      project:    '03 — DrawTrack',
      labelTop:   'DRAWING REGISTRATION',
      before:     { display: '200 files' },
      after:      { display: '1 system'  },
      label:      '200+ drawings from chaos to one tracked system',
      color:      '#1d9e75',
      colorStart: '#e24b4a',
      animType:   'consolidation',
      countFrom:  200,
      countTo:    1,
    },
    {
      // ── Live-flip: weekly manual cycle → real-time dashboard ──
      project:    '04 — Power BI BOQ',
      labelTop:   'COST REPORTING CYCLE',
      before:     { display: 'WEEKLY' },
      after:      { display: '● LIVE' },
      label:      'Weekly manual Excel reports → live Power BI dashboard',
      color:      '#ef9f27',
      colorStart: '#e24b4a',
      animType:   'live',
      countFrom:  7,   // days in the manual report cycle
    },
    {
      // ── Countdown: hours → minutes (smart unit) ──
      project:    '05 — Revit Flat Slab Plugin',
      labelTop:   'STRUCTURAL DETAILING TIME',
      before:     { display: '8 hrs' },
      after:      { display: '10 min' },
      label:      'Flat slab rebar detailing from manual to automated',
      color:      '#7f77dd',
      colorStart: '#e24b4a',
      animType:   'countdown',
      countFrom:  480,
      countTo:    10,
      unit:       'smart',
    },
  ];

  // DOM refs
  const valueEl      = document.getElementById('counter-value');
  const barFill      = document.getElementById('counter-bar-fill');
  const labelTop     = document.getElementById('counter-label-top');
  const labelBottom  = document.getElementById('counter-label-bottom');
  const block        = document.getElementById('counterBlock');
  const badgeRed     = document.getElementById('badge-manual');
  const badgeAuto    = document.getElementById('badge-auto');
  const projectLabel = document.getElementById('counter-project-label');
  const dotsWrap     = document.getElementById('counterDots');

  if (!valueEl || !barFill) return;

  const dots = dotsWrap ? dotsWrap.querySelectorAll('.counter-dot') : [];

  // State
  let projectIdx          = 0;
  let phase               = 0;
  let phaseStart          = null;
  let rafId               = null;
  let paused              = false;
  let phase3ContentLoaded = false;  // prevents content flash during fade-out

  // Phase durations
  const DUR_HOLD_START = 2000;
  const DUR_COUNTDOWN  = 5000;
  const DUR_HOLD_END   = 2500;
  const DUR_RESET      = 800;

  // ── Helpers ──
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  }

  // Smart time format: >= 60 min → "Xh", < 60 min → "X min"
  function smartTime(min) {
    if (min >= 60) {
      const h = Math.round(min / 60 * 10) / 10;
      return (Number.isInteger(h) ? h : h.toFixed(1)) + ' hrs';
    }
    return Math.round(min) + ' min';
  }

  // Hex color to rgb array
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r,g,b];
  }

  function lerpColor(hexA, hexB, t) {
    const [r1,g1,b1] = hexToRgb(hexA);
    const [r2,g2,b2] = hexToRgb(hexB);
    return `rgb(${Math.round(lerp(r1,r2,t))},${Math.round(lerp(g1,g2,t))},${Math.round(lerp(b1,b2,t))})`;
  }

  function setBadge(red, auto, proj) {
    if (red)  badgeRed.classList.add('is-visible');
    else      badgeRed.classList.remove('is-visible');
    if (auto) {
      badgeAuto.classList.add('is-visible');
      if (proj) badgeAuto.style.color = proj.color;
    } else {
      badgeAuto.classList.remove('is-visible');
    }
  }

  function updateDots(idx) {
    dots.forEach((dot, i) => {
      const proj = COUNTER_PROJECTS[i];
      dot.classList.toggle('is-active', i === idx);
      if (i === idx) {
        dot.style.setProperty('--dot-color', proj.color);
        dot.style.background   = proj.color;
        dot.style.borderColor  = proj.color;
      } else {
        dot.style.background  = 'transparent';
        dot.style.borderColor = '';
      }
    });
  }

  // Per-project background palettes (subtle gradient, each unique)
  const PROJECT_BG = [
    // 01 QTO — purple tint
    'linear-gradient(135deg, rgba(42,36,72,0.82) 0%, rgba(22,18,40,0.88) 100%)',
    // 02 IPC — amber/warm tint
    'linear-gradient(135deg, rgba(60,44,18,0.82) 0%, rgba(24,18,10,0.88) 100%)',
    // 03 DrawTrack — teal tint
    'linear-gradient(135deg, rgba(18,46,38,0.82) 0%, rgba(10,22,20,0.88) 100%)',
    // 04 Power BI — amber tint (slightly cooler)
    'linear-gradient(135deg, rgba(52,40,14,0.82) 0%, rgba(22,16,8,0.88) 100%)',
    // 05 Revit Plugin — purple/blue tint
    'linear-gradient(135deg, rgba(36,32,68,0.82) 0%, rgba(18,14,36,0.88) 100%)',
  ];

  function setProjectLabel(proj) {
    if (!projectLabel) return;
    projectLabel.textContent = proj.project;
    projectLabel.style.color = proj.color;
  }

  function setProjectBackground(idx) {
    block.style.background  = PROJECT_BG[idx];
    block.style.borderColor = hexToRgba(COUNTER_PROJECTS[idx].color, 0.22);
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Main animation tick ──
  function tick(timestamp) {
    if (paused) return;
    if (phaseStart === null) phaseStart = timestamp;
    const elapsed = timestamp - phaseStart;
    const proj = COUNTER_PROJECTS[projectIdx];

    // ── Phase 0: Hold "before" ──
    if (phase === 0) {
      // Only write on first frame of phase (elapsed very small) to avoid per-frame DOM thrash
      if (elapsed < 50) {
        const isLiveType = proj.animType === 'live';
        valueEl.textContent      = proj.before.display;
        valueEl.style.opacity    = '1';
        barFill.style.width      = '100%';
        barFill.style.background = proj.colorStart;
        labelTop.textContent     = isLiveType
          ? proj.labelTop + ' — MANUAL PROCESS'
          : proj.labelTop + ' — WITHOUT AUTOMATION';
        if (labelBottom) labelBottom.textContent = proj.label;
        block.style.opacity      = '1';
        block.style.transition   = '';
      }

      if (elapsed > 400) setBadge(true, false, proj);

      if (elapsed >= DUR_HOLD_START) {
        phase      = 1;
        phaseStart = null;
      }
    }

    // ── Phase 1: Three distinct animation types ──
    else if (phase === 1) {
      const t    = Math.min(1, elapsed / DUR_COUNTDOWN);
      const type = proj.animType || 'fade';

      // ─ COUNTDOWN: smooth numeric count-down (01, 02, 05) ─
      if (type === 'countdown') {
        const eased = easeInOutCubic(t);
        const cur   = lerp(proj.countFrom, proj.countTo, eased);
        const label = proj.unit === 'smart'
          ? smartTime(cur)
          : Math.round(cur) + ' ' + proj.unit;

        valueEl.textContent      = label;
        valueEl.style.opacity    = '1';
        barFill.style.width      = lerp(100, 3, eased) + '%';
        barFill.style.background = lerpColor(proj.colorStart, proj.color, eased);
        labelTop.textContent     = proj.labelTop;

        if (t > 0.45) setBadge(false, false, proj);
        if (t > 0.75) setBadge(false, true, proj);

        if (t >= 1) {
          valueEl.textContent = proj.after.display;
          barFill.style.width = '3%';
          phase = 2; phaseStart = null;
        }

      // ─ CONSOLIDATION: 200 files → 1 system (03 DrawTrack) ─
      } else if (type === 'consolidation') {
        // Use t directly mapped into [0,1] for count phase, clamped strictly
        const tCount = Math.min(1, t / 0.8);           // [0,0.8] → [0,1], no overflow
        const eased  = easeInOutCubic(tCount);
        const cur    = Math.round(lerp(proj.countFrom, proj.countTo, eased));

        if (t < 0.8) {
          const unit = cur <= 1 ? 'system' : cur <= 10 ? 'left' : 'files';
          valueEl.textContent   = cur + ' ' + unit;
          valueEl.style.opacity = '1';
          barFill.style.width   = lerp(100, 3, easeInOutCubic(t)) + '%';
        } else {
          valueEl.textContent   = '1 system';
          valueEl.style.opacity = '1';
          barFill.style.width   = '3%';
        }

        barFill.style.background = lerpColor(proj.colorStart, proj.color, easeInOutCubic(t));
        labelTop.textContent     = proj.labelTop;

        if (t > 0.45) setBadge(false, false, proj);
        if (t > 0.82) setBadge(false, true, proj);

        if (t >= 1) { phase = 2; phaseStart = null; }

      // ─ LIVE-FLIP: weekly manual cycle → real-time dashboard (04 Power BI) ─
      } else if (type === 'live') {

        if (t < 0.22) {
          // Stage A: fade out "WEEKLY"
          const fo = t / 0.22;
          valueEl.textContent      = 'WEEKLY';
          valueEl.style.opacity    = String(1 - fo);
          barFill.style.width      = '100%';
          barFill.style.background = proj.colorStart;
          labelTop.textContent     = proj.labelTop + ' — MANUAL PROCESS';

        } else if (t < 0.62) {
          // Stage B: count 7-day cycle → 0 days (report lag drains away)
          const tB    = (t - 0.22) / 0.40;
          const eased = easeInOutCubic(tB);
          const cur   = Math.round(lerp(proj.countFrom, 0, eased));
          // Fade in quickly at the start of this stage
          const fi    = Math.min(1, tB * 4);
          valueEl.textContent      = cur === 0 ? '0 days' : cur + (cur === 1 ? ' day' : ' days');
          valueEl.style.opacity    = String(fi);
          // Bar drains to 0 representing lag eliminated
          barFill.style.width      = lerp(100, 0, eased) + '%';
          barFill.style.background = lerpColor(proj.colorStart, '#3a3a50', eased);
          labelTop.textContent     = 'ELIMINATING REPORT LAG';
          if (t > 0.42) setBadge(false, false, proj);

        } else if (t < 0.74) {
          // Stage C: fade out "0 days"
          const fo = (t - 0.62) / 0.12;
          valueEl.textContent      = '0 days';
          valueEl.style.opacity    = String(1 - fo);
          barFill.style.width      = '0%';
          barFill.style.background = '#3a3a50';
          labelTop.textContent     = proj.labelTop;

        } else {
          // Stage D: bar FILLS BACK UP in accent color, "● LIVE" fades in
          const fi    = (t - 0.74) / 0.26;
          const eased = easeInOutCubic(fi);
          valueEl.textContent      = '● LIVE';
          valueEl.style.opacity    = String(fi);
          barFill.style.width      = lerp(0, 100, eased) + '%';
          barFill.style.background = lerpColor('#3a3a50', proj.color, eased);
          labelTop.textContent     = proj.labelTop + ' — REAL-TIME';
          if (fi > 0.5) setBadge(false, true, proj);
        }

        if (t >= 1) {
          valueEl.textContent   = '● LIVE';
          valueEl.style.opacity = '1';
          barFill.style.width   = '100%';
          barFill.style.background = proj.color;
          phase = 2; phaseStart = null;
        }

      // ─ FALLBACK: simple fade-swap ─
      } else {
        if (t < 0.4) {
          valueEl.style.opacity = String(1 - t / 0.4);
          valueEl.textContent   = proj.before.display;
          barFill.style.width   = '100%';
          barFill.style.background = proj.colorStart;
        } else if (t < 0.6) {
          valueEl.style.opacity = '0';
          valueEl.textContent   = proj.after.display;
          if (t > 0.48) setBadge(false, false, proj);
        } else {
          const fi = (t - 0.6) / 0.4;
          valueEl.style.opacity    = String(fi);
          valueEl.textContent      = proj.after.display;
          barFill.style.width      = lerp(100, 3, fi * fi) + '%';
          barFill.style.background = lerpColor(proj.colorStart, proj.color, fi);
          if (fi > 0.5) setBadge(false, true, proj);
        }
        if (t >= 1) {
          valueEl.style.opacity = '1';
          barFill.style.width   = '3%';
          phase = 2; phaseStart = null;
        }
      }
    }

    // ── Phase 2: Hold "after" state ──
    else if (phase === 2) {
      const isLive = proj.animType === 'live';

      const displayEl = valueEl.closest('.counter-display') || valueEl.parentElement;
      if (displayEl) displayEl.classList.toggle('counter-display--live', isLive);

      if (elapsed < 50) {
        // Write only on first frame to avoid per-frame DOM thrash
        valueEl.textContent      = proj.after.display;
        valueEl.style.opacity    = '1';
        barFill.style.width      = isLive ? '100%' : '3%';
        barFill.style.background = proj.color;
        labelTop.textContent     = isLive
          ? proj.labelTop + ' — REAL-TIME'
          : proj.labelTop + ' — WITH AUTOMATION';
      }
      setBadge(false, true, proj);

      if (elapsed >= DUR_HOLD_END) {
        // Clear live pulse
        if (displayEl) displayEl.classList.remove('counter-display--live');
        setBadge(false, false, proj);

        // Fade out block FIRST — content stays unchanged during the fade
        phase               = 3;
        phaseStart          = null;
        phase3ContentLoaded = false;
        block.style.transition = 'opacity 0.28s ease';
        block.style.opacity    = '0';
      }
    }

    // ── Phase 3: Swap content while invisible, then fade back in ──
    else if (phase === 3) {
      // After the 280ms fade-out completes (~300ms), advance project + load content
      if (!phase3ContentLoaded && elapsed >= 320) {
        phase3ContentLoaded = true;

        projectIdx = (projectIdx + 1) % COUNTER_PROJECTS.length;
        const nextProj = COUNTER_PROJECTS[projectIdx];

        setProjectLabel(nextProj);
        updateDots(projectIdx);
        setProjectBackground(projectIdx);

        // Write next project's "before" state while block is invisible
        valueEl.textContent      = nextProj.before.display;
        valueEl.style.opacity    = '1';
        barFill.style.width      = '100%';
        barFill.style.background = nextProj.colorStart;
        labelTop.textContent     = nextProj.labelTop + ' — WITHOUT AUTOMATION';
        if (labelBottom) labelBottom.textContent = nextProj.label;
      }

      // Fade back in after full swap delay
      if (elapsed >= DUR_RESET) {
        block.style.transition = 'opacity 0.35s ease';
        block.style.opacity    = '1';
        phase      = 0;
        phaseStart = null;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  // Pause / resume with tab visibility
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(rafId);
    } else {
      paused     = false;
      phaseStart = null;
      rafId = requestAnimationFrame(tick);
    }
  });

  // Initialise labels, dots, and background to project 0
  setProjectLabel(COUNTER_PROJECTS[0]);
  updateDots(0);
  setProjectBackground(0);

  // Kick off
  setTimeout(() => {
    rafId = requestAnimationFrame(tick);
  }, 600);
})();


/* ══════════════════════════════════════════
   3. TYPEWRITER
   Cycles through role titles:
   - Type: 55ms/char
   - Hold: 2200ms
   - Delete: 30ms/char
   - Pause: 400ms
   Cursor blinks only when idle (not typing/deleting).
══════════════════════════════════════════ */
(function initTypewriter() {
  const textEl   = document.getElementById('typewriter-text');
  const cursorEl = document.querySelector('.typewriter-cursor');
  if (!textEl) return;

  const ROLES = [
    'Technical Office Engineer',
    'BIM Automation Developer',
    'Revit API Developer',
    'Construction Data Engineer',
  ];

  const SPEED_TYPE   = 55;   // ms per char while typing
  const SPEED_DELETE = 30;   // ms per char while deleting
  const HOLD_TIME    = 2200; // ms to hold full word
  const PAUSE_TIME   = 400;  // ms pause between delete → next word

  let roleIdx    = 0;
  let charIdx    = 0;
  let isDeleting = false;

  function setCursorBlink(shouldBlink) {
    if (shouldBlink) cursorEl.classList.add('cursor-blink');
    else             cursorEl.classList.remove('cursor-blink');
  }

  function tick() {
    const role = ROLES[roleIdx];

    if (!isDeleting) {
      // Typing forward
      charIdx++;
      textEl.textContent = role.slice(0, charIdx);
      setCursorBlink(false);

      if (charIdx === role.length) {
        // Finished typing — hold
        setCursorBlink(true);
        setTimeout(() => {
          isDeleting = true;
          setCursorBlink(false);
          tick();
        }, HOLD_TIME);
        return;
      }

      setTimeout(tick, SPEED_TYPE);

    } else {
      // Deleting
      charIdx--;
      textEl.textContent = role.slice(0, charIdx);

      if (charIdx === 0) {
        // Finished deleting — move to next role
        isDeleting = false;
        roleIdx    = (roleIdx + 1) % ROLES.length;
        setCursorBlink(true);
        setTimeout(tick, PAUSE_TIME);
        return;
      }

      setTimeout(tick, SPEED_DELETE);
    }
  }

  // Initial delay before starting
  setTimeout(tick, 1200);
})();


/* ══════════════════════════════════════════
   4. SCROLL ANIMATIONS
   IntersectionObserver adds .is-animated
   to all [data-animate] elements.
   Children with .stagger-N get sequential delays.
══════════════════════════════════════════ */
(function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  // Add stagger delays from element attributes
  elements.forEach(el => {
    // Read stagger from attribute (stagger-1, stagger-2, etc.)
    for (let i = 1; i <= 5; i++) {
      if (el.hasAttribute(`stagger-${i}`)) {
        el.classList.add(`stagger-${i}`);
      }
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-animated');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px',
  });

  elements.forEach(el => observer.observe(el));
})();


/* ══════════════════════════════════════════
   5. STAT COUNTERS (About section)
   Count up from 0 on scroll into view.
   Uses easeOutQuad, duration 2000ms.
   Supports decimal places and custom suffixes.
══════════════════════════════════════════ */
(function initStatCounters() {
  const counters = document.querySelectorAll('.stat-counter');
  if (!counters.length) return;

  function easeOutQuad(t) { return t * (2 - t); }

  function animateCounter(el) {
    const target   = parseFloat(el.dataset.target);
    const suffix   = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 2000;
    let   startTs  = null;

    function step(timestamp) {
      if (!startTs) startTs = timestamp;
      const elapsed = timestamp - startTs;
      const t       = Math.min(1, elapsed / duration);
      const eased   = easeOutQuad(t);
      const value   = target * eased;

      el.textContent = value.toFixed(decimals) + suffix;

      if (t < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
})();


/* ══════════════════════════════════════════
   6. NAV ACTIVE STATE
   Highlights the nav link matching the
   section currently in view.
══════════════════════════════════════════ */
(function initNavActive() {
  const navLinks = document.querySelectorAll('.nav-links a[data-nav]');
  const sections = document.querySelectorAll('section[id]');
  if (!navLinks.length || !sections.length) return;

  function setActive(id) {
    navLinks.forEach(link => {
      const matches = link.dataset.nav === id;
      link.classList.toggle('is-active', matches);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActive(entry.target.id);
    });
  }, {
    threshold: 0.3,
    rootMargin: '-64px 0px 0px 0px', // account for fixed nav height
  });

  sections.forEach(section => observer.observe(section));
})();


/* ══════════════════════════════════════════
   7. FILTER TABS
   Animated sliding underline + card filtering.
   Active cards: opacity 1, scale 1
   Filtered-out: opacity 0.3, scale 0.97
══════════════════════════════════════════ */
(function initFilterTabs() {
  const tabsWrap    = document.getElementById('filterTabs');
  const underline   = document.getElementById('filterUnderline');
  const cards       = document.querySelectorAll('.project-card');
  if (!tabsWrap || !underline || !cards.length) return;

  const tabs = tabsWrap.querySelectorAll('.filter-tab');

  // Position underline under a given tab element
  function positionUnderline(tab) {
    const wrapRect = tabsWrap.getBoundingClientRect();
    const tabRect  = tab.getBoundingClientRect();
    underline.style.left  = (tabRect.left - wrapRect.left) + 'px';
    underline.style.width = tabRect.width + 'px';
  }

  // Initialize underline position under the active tab
  const activeTab = tabsWrap.querySelector('.filter-tab.active');
  if (activeTab) {
    // Wait a frame for layout to settle
    requestAnimationFrame(() => positionUnderline(activeTab));
  }

  // Reposition on window resize
  window.addEventListener('resize', () => {
    const current = tabsWrap.querySelector('.filter-tab.active');
    if (current) positionUnderline(current);
  });

  function filterCards(filter) {
    cards.forEach(card => {
      const cat = card.dataset.category;
      if (filter === 'all' || cat === filter) {
        card.classList.remove('is-filtered-out');
        card.classList.add('is-filtered-in');
        card.style.opacity  = '1';
        card.style.transform = '';
        card.style.pointerEvents = '';
      } else {
        card.classList.remove('is-filtered-in');
        card.classList.add('is-filtered-out');
        card.style.opacity       = '0.3';
        card.style.transform     = 'scale(0.97)';
        card.style.pointerEvents = 'none';
      }
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      positionUnderline(tab);
      filterCards(tab.dataset.filter);
    });
  });
})();


/* ══════════════════════════════════════════
   8. MOBILE MENU
   Hamburger opens full-screen overlay.
   Links inside close the menu.
   Body scroll locked when menu is open.
══════════════════════════════════════════ */
(function initMobileMenu() {
  const hamburger = document.getElementById('navHamburger');
  const overlay   = document.getElementById('mobileOverlay');
  const closeBtn  = document.getElementById('mobileOverlayClose');
  if (!hamburger || !overlay) return;

  function openMenu() {
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);

  // Close when clicking a nav link inside overlay
  overlay.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on backdrop click (click outside the nav list)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeMenu();
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeMenu();
    }
  });
})();


/* ══════════════════════════════════════════
   9. PROJECT DATA
   Single source of truth for all modals.
══════════════════════════════════════════ */
const PROJECTS = [
  {
    id: '01',
    title: 'IPC Excel System',
    category: 'Project Control · Automation Workflow',
    stat: '3 days → 4 hours',
    statColor: '#ef9f27',
    desc: 'Automated the full IPC workflow for subcontractor payment tracking across a 9.8B EGP project portfolio. Built a hub-and-spoke Excel architecture with Power Query aggregation — individual subcontractor workbooks feed into a master dashboard that flags disputed line items, calculates certified vs. claimed amounts, and generates summary tables automatically.',
    tags: ['Excel', 'VBA', 'Power Query', 'IPC Preparation'],
    outcomes: [
      'Payment cycle time reduced from 3 days to 4 hours',
      'Invoice dispute resolution time cut by 40%',
      '9.8B EGP tracked across all payment cycles',
      'Zero manual aggregation errors on certified amounts',
    ],
    meta: [
      { key: 'Timeline', val: 'Q3 2023' },
      { key: 'Category', val: 'Automation' },
      { key: 'Status',   val: 'Deployed', active: true },
    ],
    images: [
      'https://files.catbox.moe/spla7d.png ',
      'https://files.catbox.moe/vg6amo.png' ,
      'https://files.catbox.moe/lwccbk.png' ,
      'https://files.catbox.moe/d40wnp.png' ,
      'https://files.catbox.moe/s37cw2.png' ,
      'https://files.catbox.moe/0986f7.png' , 
      'https://files.catbox.moe/u0m9ri.png' ,

    ],
    accentColor: '#ef9f27',
  },
  {
    id: '02',
    title: 'Power BI BOQ Dashboard',
    category: 'Project Control · Cost Analytics',
    stat: '2 days → live dashboard',
    statColor: '#ef9f27',
    desc: 'Multi-page Power BI report breaking construction costs down by element category — structural, MEP, and architectural finishes. Built on a star schema data model with DAX measures. Budget vs. actual variance with drill-down to individual work packages and decomposition tree analysis.',
    tags: ['Power BI', 'DAX', 'Power Query', 'BOQ Analytics', 'Cost Reporting'],
    outcomes: [
      'Cost reporting reduced from 2-day manual process to live',
      'Drill-down from project total to individual work package',
      'Structural, MEP, and architectural costs in one view',
      'Variance alerts flag budget overruns automatically',
    ],
    meta: [
      { key: 'Timeline', val: 'Q1 2024' },
      { key: 'Category', val: 'Analytics' },
      { key: 'Status',   val: 'Live', active: true },
    ],
    images: [
      'https://res.cloudinary.com/dinbcadad/image/upload/f_auto,q_auto/str-dashboard_i7tndu',
      'https://res.cloudinary.com/dinbcadad/image/upload/f_auto,q_auto/dashbaord_w6lopm'
    ],
    accentColor: '#ef9f27',
  },
  {
    id: '03',
    title: 'DrawTrack',
    category: 'Shop Drawing · Drawing Management',
    stat: 'Scattered files → 1 system',
    statColor: '#1d9e75',
    desc: 'WPF desktop application for complete drawing control — discipline-specific hierarchy, automated PDF folder scanning, conflict detection before registration, and full status tracking per drawing. Replaced a scattered file system of 200+ shop drawings with a single controlled workflow covering revision history, approval status, and submission tracking.',
    tags: ['C#', 'WPF', '.NET', 'SQLite', 'Drawing Management'],
    outcomes: [
      '200+ drawings moved from scattered files to one system',
      'Conflict detection catches duplicates before submission',
      'Full revision history tracked automatically',
      'Status visible across all disciplines in real time',
    ],
    meta: [
      { key: 'Timeline', val: 'Q2 2024' },
      { key: 'Category', val: 'Desktop App' },
      { key: 'Status',   val: 'Operational', active: true },
    ],
    images: [
      'https://files.catbox.moe/tejn1l.png',
      'https://files.catbox.moe/uh5qfb.png' ,
      'https://files.catbox.moe/m69fkn.png' ,
      'https://files.catbox.moe/jc7js3.png' , 
      'https://files.catbox.moe/a1bur5.png' , 
      'https://files.catbox.moe/na9uq6.png',

    ],
    accentColor: '#1d9e75',
  },
  {
    id: '04',
    title: 'Architectural QTO & Finish Automation',
    category: 'BIM Automation · Revit API',
    stat: '4 hours → 8 minutes',
    statColor: '#7f77dd',
    desc: 'Dynamo + PyRevit toolkit that reads room function parameters and auto-assigns floor, wall, and ceiling finish types across 200+ rooms. Also extracts full quantity takeoffs directly from the Revit model — floor areas, wall areas by type, ceiling areas — and exports to structured Excel sheets ready for BOQ preparation.',
    tags: ['Python', 'PyRevit', 'Dynamo', 'Revit API', 'Excel Automation'],
    outcomes: [
      'QTO completion time from 4 hours to 8 minutes',
      '2,840 m² of finishes assigned automatically',
      'Zero manual room-by-room data entry',
      'Excel output ready for BOQ without reformatting',
    ],
    meta: [
      { key: 'Timeline', val: 'Q4 2023' },
      { key: 'Category', val: 'BIM Automation' },
      { key: 'Status',   val: 'Deployed', active: true },
    ],
    images: [
      'https://files.catbox.moe/qpymls.png',
      'https://files.catbox.moe/or7l6q.png' ,
      'https://files.catbox.moe/sksgcy.png' ,
      'https://files.catbox.moe/qyyne6.png' ,
      'https://files.catbox.moe/agp24n.png' ,
      'https://files.catbox.moe/hyydwy.png', 
      'https://files.catbox.moe/9u0gh9.png' , 
      'https://files.catbox.moe/mz7qy4.png' , 
      'https://files.catbox.moe/fyq5eq.png' ,
      'https://files.catbox.moe/8at3k4.png' ,
    ],
    accentColor: '#7f77dd',
  },
  {
    id: '05',
    title: 'Revit Flat Slab Plugin',
    category: 'Structural BIM · Revit API',
    stat: '1 full day → 10 minutes',
    statColor: '#7f77dd',
    desc: 'Custom C# Revit add-in that generates complete flat slab reinforcement details directly from model parameters. Handles X/Y bar placement with correct spacing and cover, drop panel face termination with hook rules, punching shear stirrup cage generation, and auto-generates a fully formatted bar schedule with mark, diameter, spacing, length, count, and total weight.',
    tags: ['C#', '.NET', 'Revit API', 'WPF', 'Rebar API', 'Structural BIM'],
    outcomes: [
      'Structural detailing time from 1 full day to 10 minutes',
      'Bar schedule auto-generated with zero manual input',
      'Drop panel detection and hook rules applied automatically',
      'Punching shear stirrup cage placed to code requirements',
    ],
    meta: [
      { key: 'Timeline', val: 'Q2 2025' },
      { key: 'Category', val: 'Structural BIM' },
      { key: 'Status',   val: 'Operational', active: true },
    ],
    images: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBAfYCZadruWsXIHgPoCpiphlQYE0NVfGUXMIbN0z3aAT5dxdP1rGfgZILjVyQEgDKJXPAvSyIX6dsOU-b24aEGsHMKWfF3qGXfBi6Wp6aYEnKFJZ_Op2mxWdQIgIvRn0kh4gaFAy-bmRFVjKajfFsNVXDgNlF9Ij1zJGZ6fbLUwZ4jTpCP7U9neSAbz2AeKI2JmPwX-m3SfmHrCWAk_6Y1UejC-FGHfBeaeutTLHNAYGcY3yoWT_Cu43dM9lnekN7DWHvmjRTYeSeA',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA_xE_8MO5hhmWROvM8e8C81D2ipj-F9BxQ0foxom2aJPtzVgN2H9tV-BzpFIedyc4fa6GREOfd6OU6vLN8doDD6tI_PUrVuOmZ82RYzZxh3riA5UqI9doNpZotICzVt-DwbSSkzH0iktOJ2xO1lsc4JyOMoQtpUjQVHzTeG6bFpeqpdO_UQ8gX557gGLqY-i3qmIsYLNii1tE1Mw4u2g2Pc2WdCldwpIdUWM0XjLFckPzc51tUa_xqYbiPvDhVCgHDEKvOSLxLgswO',
    ],
    accentColor: '#7f77dd',
  },
];


/* ══════════════════════════════════════════
   10. PROJECT MODAL
   Expands from card origin → centred final
   state. Card click → openModal(id).
══════════════════════════════════════════ */
(function initModal() {

  const modal    = document.getElementById('projectModal');
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalClose');
  if (!modal || !backdrop) return;

  let activeImageIdx = 0;
  let activeImages   = [];

  // ── Gallery helpers ──
  function setImage(idx) {
    activeImageIdx = (idx + activeImages.length) % activeImages.length;
    const mainImg = document.getElementById('modalMainImg');
    if (mainImg) mainImg.src = activeImages[activeImageIdx];

    const counter = document.getElementById('galleryCounter');
    if (counter) counter.textContent = `${activeImageIdx + 1} / ${activeImages.length}`;

    document.querySelectorAll('.modal-thumb').forEach((t, i) => {
      t.classList.toggle('is-active', i === activeImageIdx);
    });

    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    if (prevBtn) prevBtn.disabled = activeImages.length <= 1;
    if (nextBtn) nextBtn.disabled = activeImages.length <= 1;
  }

  // ── Populate modal content ──
  function populate(project) {
    // Number badge
    const numEl = document.getElementById('modalNumber');
    if (numEl) numEl.textContent = `Project No. ${project.id}`;

    // Title + category
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = project.title;

    const catEl = document.getElementById('modalCategory');
    if (catEl) catEl.textContent = project.category || '';

    // Efficiency stat
    const statEl = document.getElementById('modalStat');
    if (statEl) {
      statEl.textContent = project.stat;
      statEl.style.color = project.statColor || project.accentColor;
    }

    // Description
    const descEl = document.getElementById('modalDesc');
    if (descEl) descEl.textContent = project.desc;

    // Tags
    const tagsEl = document.getElementById('modalTags');
    if (tagsEl) {
      tagsEl.innerHTML = project.tags
        .map(t => `<span class="tag tag--outline">${t}</span>`)
        .join('');
    }

    // Outcomes
    const outEl = document.getElementById('modalOutcomes');
    if (outEl) {
      outEl.innerHTML = project.outcomes
        .map(o => `<li>
          <span class="outcome-check" style="color:${project.accentColor}">✓</span>
          <span>${o}</span>
        </li>`).join('');
    }

    // Metadata
    const metaEl = document.getElementById('modalMeta');
    if (metaEl && project.meta) {
      metaEl.innerHTML = project.meta
        .map(row => `<div class="modal-meta-row">
          <span class="modal-meta-key">${row.key}</span>
          <span class="modal-meta-val${row.active ? ' modal-meta-val--active' : ''}">${row.val}</span>
        </div>`).join('');
    }

    // Gallery
    activeImages   = project.images || [];
    activeImageIdx = 0;

    const thumbsEl = document.getElementById('modalThumbnails');
    if (thumbsEl) {
      thumbsEl.innerHTML = activeImages
        .map((src, i) => `<img class="modal-thumb${i === 0 ? ' is-active' : ''}"
          src="${src}" alt="Project image ${i + 1}" data-idx="${i}" />`)
        .join('');

      thumbsEl.querySelectorAll('.modal-thumb').forEach(thumb => {
        thumb.addEventListener('click', () =>
          setImage(parseInt(thumb.dataset.idx, 10)));
      });
    }

    const prevBtn = document.getElementById('galleryPrev');
    const nextBtn = document.getElementById('galleryNext');
    if (prevBtn) prevBtn.onclick = () => setImage(activeImageIdx - 1);
    if (nextBtn) nextBtn.onclick = () => setImage(activeImageIdx + 1);

    setImage(0);
  }

  // ── Open modal ──
  window.openModal = function openModal(projectId) {
    const project = PROJECTS.find(p => p.id === projectId);
    if (!project) return;

    populate(project);

    // Find origin card for expand animation
    const slot = document.querySelector(`.card-animation-slot[data-project="${projectId}"]`);
    const card = slot ? slot.closest('.project-card') : null;

    // Final (centred) dimensions
    const finalTop    = '5vh';
    const finalLeft   = '50%';
    const finalW      = 'min(880px, 92vw)';
    const finalH      = '90vh';
    const finalRadius = '14px';
    const finalTx     = 'translateX(-50%)';

    // Snap to card origin — no transition yet
    modal.style.transition   = 'none';
    modal.style.opacity      = '0';

    if (card) {
      const r = card.getBoundingClientRect();
      modal.style.top          = r.top    + 'px';
      modal.style.left         = r.left   + 'px';
      modal.style.width        = r.width  + 'px';
      modal.style.height       = r.height + 'px';
      modal.style.transform    = 'none';
      modal.style.borderRadius = getComputedStyle(card).borderRadius;
    } else {
      // No card found — start already at final position
      modal.style.top       = finalTop;
      modal.style.left      = finalLeft;
      modal.style.width     = finalW;
      modal.style.height    = finalH;
      modal.style.transform = finalTx;
    }

    // Show backdrop + modal (still transparent)
    backdrop.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Force reflow then transition to centred final state
    modal.offsetHeight;
    modal.style.transition   = 'all 0.45s cubic-bezier(0.34, 1.1, 0.64, 1)';
    modal.style.top          = finalTop;
    modal.style.left         = finalLeft;
    modal.style.width        = finalW;
    modal.style.height       = finalH;
    modal.style.transform    = finalTx;
    modal.style.borderRadius = finalRadius;
    modal.style.opacity      = '1';
    modal.classList.add('is-open');

    // Fade in content after expansion completes
    setTimeout(() => {
      const inner = document.getElementById('modalInner');
      if (inner) inner.classList.add('content-visible');
    }, 320);
  };

  // ── Close modal ──
  window.closeModal = function closeModal() {
    const inner = document.getElementById('modalInner');
    if (inner) inner.classList.remove('content-visible');

    modal.style.transition = 'opacity 0.25s ease';
    modal.style.opacity    = '0';
    modal.classList.remove('is-open');

    setTimeout(() => {
      modal.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('is-visible');
      document.body.style.overflow = '';
      // Clear inline positioning so the shell is invisible at rest
      modal.style.transition = 'none';
      modal.style.top        = '';
      modal.style.left       = '';
      modal.style.width      = '';
      modal.style.height     = '';
      modal.style.transform  = '';
    }, 260);
  };

  // ── Event wiring ──
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' &&
        modal.getAttribute('aria-hidden') === 'false') {
      closeModal();
    }
  });

  // Wire all project cards
  document.querySelectorAll('.project-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const slot = card.querySelector('[data-project]');
      if (slot) openModal(slot.dataset.project);
    });
  });

})();
