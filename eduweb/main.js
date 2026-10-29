/* ============================================================================
   KIYOEDU SCROLLYTELLING RUNTIME · MASTER CONTROLLER (WEBEDU V2.0)
   Native IntersectionObserver + requestAnimationFrame 60FPS Orchestration
   Zero Scroll Hijacking · Micro-Parallax · Sticky Cross-Fade · Live Count-Up
   ============================================================================ */

import { ScrollytellingEngine } from './webgpu-story-engine.js';

const HEADER_HEIGHT = 70;

async function initScrollytelling() {
  // ── 1. Subtle Canvas Dot Grid ─────────────────────────────────────────────
  const canvas = document.getElementById('scrolly-canvas');
  let engine = null;
  if (canvas) {
    try {
      engine = new ScrollytellingEngine(canvas);
      await engine.init();

      function renderLoop(t) {
        engine.render(t);
        requestAnimationFrame(renderLoop);
      }
      requestAnimationFrame(renderLoop);
    } catch (err) {
      console.warn('Canvas engine fallback:', err);
    }
  }

  // ── 2. DOM Elements Cache ─────────────────────────────────────────────────
  const stages = Array.from(document.querySelectorAll('.stage-section'));
  const headerProgress = document.getElementById('header-progress');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));

  // Chặng 1: Hero
  const heroTarget = document.getElementById('hero-parallax-target');
  const heroScrollCue = document.getElementById('hero-scroll-cue');

  // Chặng 2: KiyoEdu Studio (Dark Cinematic Stage)
  const stepCards = Array.from(document.querySelectorAll('.narrative-chapter'));
  const displayLayers = Array.from(document.querySelectorAll('.studio-layer'));
  const modeTabs = Array.from(document.querySelectorAll('.studio-tab'));

  // Chặng 3: Quy trình tinh gọn
  const processPanels = Array.from(document.querySelectorAll('.process-step-panel'));

  // Chặng 4: Năng lực hệ thống & Bento
  const statsStrip = document.getElementById('stats-counter-strip');
  const statValues = Array.from(document.querySelectorAll('.stat-value'));
  const levelTabs = Array.from(document.querySelectorAll('.segment-tab'));
  const examPreviewTitle = document.getElementById('exam-preview-title');
  const examPreviewBadge = document.getElementById('exam-preview-badge');
  const examPreviewItems = document.getElementById('exam-preview-items');
  let statsCounted = false;

  // ── 3. Chặng 1: Hero Parallax (KHÔNG can thiệp opacity, luôn rõ nét 100%) ──
  function updateHeroParallax(scrollY) {
    if (!heroTarget) return;
    const heroH = window.innerHeight;
    if (scrollY <= heroH) {
      const progress = scrollY / heroH;
      const translateY = -(progress * 20);
      heroTarget.style.transform = `translate3d(0, ${translateY}px, 0)`;
      heroTarget.style.opacity = '1';

      if (heroScrollCue) {
        heroScrollCue.style.opacity = progress > 0.05 ? '0' : '1';
      }
    } else {
      heroTarget.style.transform = 'none';
      heroTarget.style.opacity = '1';
    }
  }

  // ── 4. Chặng 2: Studio Cross-Fade & Mode Switcher ─────────────────────────
  function activateStudioStep(activeIndex) {
    // Cập nhật narrative chapters
    stepCards.forEach((card, idx) => {
      card.classList.toggle('is-active', idx === activeIndex);
    });

    // Cập nhật studio visual layers
    displayLayers.forEach((layer, idx) => {
      layer.classList.toggle('is-active', idx === activeIndex);
    });

    // Cập nhật top bar tabs
    modeTabs.forEach((tab, idx) => {
      const isCurrent = idx === activeIndex;
      tab.classList.toggle('is-active', isCurrent);
      tab.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });
  }

  if (stepCards.length > 0) {
    const chapterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const activeIndex = parseInt(entry.target.dataset.step, 10);
            if (!isNaN(activeIndex)) {
              activateStudioStep(activeIndex);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: '-30% 0px -30% 0px',
        threshold: 0.1
      }
    );

    stepCards.forEach((card) => chapterObserver.observe(card));
  }

  // Click tab trực tiếp trên Studio Top Bar
  modeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetStep = parseInt(tab.dataset.tab, 10);
      if (!isNaN(targetStep)) {
        if (stepCards[targetStep]) {
          stepCards[targetStep].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        activateStudioStep(targetStep);
      }
    });
  });

  // ── 5. Chặng 4: Smooth Count-Up Animation ──────────────────────────────────
  function runCountUp(el, target, duration = 1400) {
    let startTimestamp = null;
    const startVal = 0;

    function step(timestamp) {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(startVal + (target - startVal) * easeProgress);

      el.textContent = currentVal.toLocaleString('en-US');

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString('en-US');
      }
    }
    requestAnimationFrame(step);
  }

  if (statsStrip) {
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !statsCounted) {
            statsCounted = true;
            statValues.forEach((valEl) => {
              const target = parseFloat(valEl.dataset.count || '0');
              runCountUp(valEl, target, 1400);
            });
          }
        });
      },
      { threshold: 0.2 }
    );
    statsObserver.observe(statsStrip);
  }

  // ── 6. Chặng 4: Bento Interactive Difficulty Level Switcher ──────────────
  const levelData = {
    '1': {
      title: 'Đề kiểm tra 15 phút · Đại số 9',
      badge: 'Mức 1 · Tỷ lệ giải đúng 94%',
      items: [
        { text: '<strong>Câu 1:</strong> Cho phương trình <em>ax² + bx + c = 0 (a ≠ 0)</em>. Biệt thức <em>Δ</em> được tính theo công thức:', tag: 'Δ = b² − 4ac' },
        { text: '<strong>Câu 2:</strong> Căn bậc hai số học của 25 là số nào?', tag: '5' }
      ]
    },
    '2': {
      title: 'Đề kiểm tra 15 phút · Đại số 9',
      badge: 'Mức 2 · Tỷ lệ giải đúng 78%',
      items: [
        { text: '<strong>Câu 1:</strong> Điều kiện của <em>m</em> để phương trình <em>x² − 2x + m = 0</em> có 2 nghiệm phân biệt:', tag: 'm < 1' },
        { text: '<strong>Câu 2:</strong> Hàm số <em>y = (m − 1)x + 2</em> đồng biến trên R khi nào?', tag: 'm > 1' }
      ]
    },
    '3': {
      title: 'Đề kiểm tra 1 tiết · Đại số 9',
      badge: 'Mức 3 · Tỷ lệ giải đúng 52%',
      items: [
        { text: '<strong>Câu 1:</strong> Cho phương trình <em>x² − 2(m−1)x + m² − 3 = 0</em>. Tìm <em>m</em> để <em>x₁² + x₂² = 10</em>:', tag: 'm = 2 hoặc m = −1' },
        { text: '<strong>Câu 2:</strong> Mảnh đất hình chữ nhật có diện tích 360m², tăng chiều rộng thêm 2m...', tag: 'Dài 24m, Rộng 15m' }
      ]
    },
    '4': {
      title: 'Đề thi thử vào lớp 10 Chuyên',
      badge: 'Mức 4 · Phân hóa điểm 9 - 10',
      items: [
        { text: '<strong>Câu 1:</strong> Tìm GTNN của <em>P = (x² + y²)/(xy)</em> với <em>x, y > 0</em> và <em>x + y = 4</em>:', tag: 'Min P = 2 khi x = y = 2' },
        { text: '<strong>Câu 2:</strong> Giải hệ phương trình đối xứng: <em>{ x³ − 3x = y³ − 3y, x² + y² = 4 }</em>:', tag: '(x,y) = (√2, √2), (−√2, −√2)' }
      ]
    }
  };

  levelTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const level = tab.dataset.level;
      if (!levelData[level]) return;

      levelTabs.forEach((t) => t.classList.toggle('is-active', t === tab));

      const data = levelData[level];
      if (examPreviewTitle) examPreviewTitle.textContent = data.title;
      if (examPreviewBadge) examPreviewBadge.textContent = data.badge;

      if (examPreviewItems) {
        examPreviewItems.style.opacity = '0';
        setTimeout(() => {
          examPreviewItems.innerHTML = data.items.map(it => `
            <div class="sample-item">
              <span class="sample-q">${it.text}</span>
              <span class="sample-ans">${it.tag}</span>
            </div>
          `).join('');
          examPreviewItems.style.opacity = '1';
        }, 120);
      }
    });
  });

  // ── 7. Global Scroll Loop (RAF Passive Sync) ──────────────────────────────
  let rafPending = false;

  function onScroll() {
    if (rafPending) return;
    rafPending = true;

    requestAnimationFrame(() => {
      rafPending = false;
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const globalProgress = docH > 0 ? Math.max(0, Math.min(1, scrollY / docH)) : 0;

      // Cập nhật thanh tiến trình header
      if (headerProgress) {
        headerProgress.style.width = `${globalProgress * 100}%`;
      }

      updateHeroParallax(scrollY);

      // Đồng bộ trạng thái active cho Top Nav Links
      let activeStage = 0;
      stages.forEach((stage, idx) => {
        const r = stage.getBoundingClientRect();
        if (r.top <= window.innerHeight * 0.45 && r.bottom >= window.innerHeight * 0.45) {
          activeStage = idx;
        }
      });

      navLinks.forEach((link, idx) => {
        link.classList.toggle('is-active', idx === activeStage);
      });

      if (engine) {
        engine.setStoryPos(activeStage, globalProgress);
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (engine) engine.resize();
    onScroll();
  }, { passive: true });

  onScroll();

  // ── 8. Smooth Anchor Navigation ───────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const targetId = href.slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        const targetY = targetId === 'chang-1-hero' ? 0 : targetEl.offsetTop - HEADER_HEIGHT;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      }
    });
  });
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollytelling);
} else {
  initScrollytelling();
}
