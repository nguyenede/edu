/* ============================================================================
   KIYOEDU INTERACTIVE & SIGNATURE MOVE ENGINE
   100% Tiếng Việt · Điều hướng quang học & Màn trập tỉ lệ điện ảnh chuẩn xác
   ========================================================================== */

(function () {
  'use strict';

  // 1. Mã thời gian sản xuất SMPTE 24.00 FPS thời gian thực
  function initTimecode() {
    const tcEl = document.getElementById('smpte-tc');
    if (!tcEl) return;

    let frames = 0;
    let seconds = 14;
    let minutes = 24;
    let hours = 1;

    setInterval(() => {
      frames++;
      if (frames >= 24) {
        frames = 0;
        seconds++;
        if (seconds >= 60) {
          seconds = 0;
          minutes++;
          if (minutes >= 60) {
            minutes = 0;
            hours++;
          }
        }
      }

      const pad = (n) => String(n).padStart(2, '0');
      tcEl.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
    }, 1000 / 24);
  }

  // 2. Kính Ngắm Đạo Diễn & Màn Trập Tỉ Lệ Điện Ảnh (Act 3 Signature Move)
  function initAspectGate() {
    const actSection = document.getElementById('kinh-ngam');
    const shutterLeft = document.getElementById('shutter-left');
    const shutterRight = document.getElementById('shutter-right');
    const shutterTop = document.getElementById('shutter-top');
    const shutterBottom = document.getElementById('shutter-bottom');

    const ratioSubtitle = document.getElementById('ratio-stage-subtitle');
    const ratioHeadline = document.getElementById('ratio-stage-headline');
    const ratioProse = document.getElementById('ratio-stage-prose');

    const readoutRatioBadge = document.getElementById('readout-ratio-badge');
    const readoutFocalBadge = document.getElementById('readout-focal-badge');
    const choiceBtns = document.querySelectorAll('.aspect-choice-btn');

    if (!actSection) return;

    let userManualSelect = false;

    // Hỗ trợ click trực tiếp nút tỉ lệ trên thanh HUD
    choiceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetRatio = btn.getAttribute('data-ratio');
        userManualSelect = true;
        setActiveBtn(targetRatio);
        applyRatioContent(targetRatio);
      });
    });

    function setActiveBtn(r) {
      choiceBtns.forEach(btn => {
        btn.classList.toggle('is-active', btn.getAttribute('data-ratio') === r);
      });
    }

    function applyRatioContent(r) {
      if (r === '1.37') {
        if (shutterLeft) shutterLeft.style.width = '15%';
        if (shutterRight) shutterRight.style.width = '15%';
        if (shutterTop) shutterTop.style.height = '0%';
        if (shutterBottom) shutterBottom.style.height = '0%';

        if (ratioSubtitle) ratioSubtitle.textContent = 'TỈ LỆ 1.37:1 · CHUẨN VIỆN HÀN LÂM';
        if (ratioHeadline) ratioHeadline.textContent = 'Điểm hội tụ tâm lý: Tỉ lệ 1.37:1';
        if (ratioProse) ratioProse.textContent = 'Tỉ lệ cổ điển nén chặt mọi sự chú ý vào ánh mắt và nội tâm giằng xé của nhân vật, triệt tiêu hoàn toàn sự xao nhãng ngoại vi của bối cảnh.';

        if (readoutRatioBadge) readoutRatioBadge.textContent = '1.37:1 CHUẨN VIỆN HÀN LÂM';
        if (readoutFocalBadge) readoutFocalBadge.textContent = '50MM MASTER PRIME · T2.8 NÉN TÂM LÝ';
      } else if (r === '1.85') {
        if (shutterLeft) shutterLeft.style.width = '0%';
        if (shutterRight) shutterRight.style.width = '0%';
        if (shutterTop) shutterTop.style.height = '0%';
        if (shutterBottom) shutterBottom.style.height = '0%';

        if (ratioSubtitle) ratioSubtitle.textContent = 'TỈ LỆ 1.85:1 · CHUẨN CHIẾU RẠP FLAT';
        if (ratioHeadline) ratioHeadline.textContent = 'Mặt phẳng đương đại: Tỉ lệ 1.85:1';
        if (ratioProse) ratioProse.textContent = 'Cân bằng hoàn hảo giữa chiều cao không gian kiến trúc và nhịp di chuyển tự nhiên của con người. Khung hình đối thoại lý tưởng giữa nhân vật và xã hội.';

        if (readoutRatioBadge) readoutRatioBadge.textContent = '1.85:1 CHUẨN CHIẾU RẠP FLAT';
        if (readoutFocalBadge) readoutFocalBadge.textContent = '35MM MASTER PRIME · T1.8 CÂN BẰNG';
      } else if (r === '2.39') {
        if (shutterLeft) shutterLeft.style.width = '0%';
        if (shutterRight) shutterRight.style.width = '0%';
        if (shutterTop) shutterTop.style.height = '12%';
        if (shutterBottom) shutterBottom.style.height = '12%';

        if (ratioSubtitle) ratioSubtitle.textContent = 'TỈ LỆ 2.39:1 · ĐẠI CẢNH ANAMORPHIC SCOPE';
        if (ratioHeadline) ratioHeadline.textContent = 'Đại cảnh Anamorphic Scope: 2.39:1';
        if (ratioProse) ratioProse.textContent = 'Thấu kính quang học nén biên độ thị trường hai bên, mở rộng toàn cảnh xung đột và nhiều tầng lớp bối cảnh trong cùng một trường đoạn kịch tính.';

        if (readoutRatioBadge) readoutRatioBadge.textContent = '2.39:1 ĐẠI CẢNH ANAMORPHIC';
        if (readoutFocalBadge) readoutFocalBadge.textContent = '24MM ANAMORPHIC · T1.3 ĐẠI CẢNH';
      }
    }

    // Tự động đồng bộ theo tiến trình cuộn trang ScrollCraft (--sc-p)
    function updateAspectOnScroll() {
      if (!userManualSelect) {
        const computed = window.getComputedStyle(actSection);
        const rawP = parseFloat(computed.getPropertyValue('--sc-p')) || 0;
        const p = Math.max(0, Math.min(1, rawP));

        if (p < 0.36) {
          setActiveBtn('1.37');
          applyRatioContent('1.37');
        } else if (p < 0.70) {
          setActiveBtn('1.85');
          applyRatioContent('1.85');
        } else {
          setActiveBtn('2.39');
          applyRatioContent('2.39');
        }
      }

      requestAnimationFrame(updateAspectOnScroll);
    }

    // Thiết lập mặc định ban đầu
    applyRatioContent('1.37');
    requestAnimationFrame(updateAspectOnScroll);
  }

  // 3. Bộ Giả Lập Tiêu Cự Quang Học (Lens Focal Switcher ở Hero)
  function initLensCalibrator() {
    const heroLensBtns = document.querySelectorAll('.hero-lens-btn');
    const heroPhoto = document.getElementById('hero-photo');
    const heroLensReadout = document.getElementById('hero-lens-readout');

    heroLensBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        heroLensBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const focal = btn.getAttribute('data-focal');
        if (heroPhoto) {
          if (focal === '24mm') {
            heroPhoto.style.transform = 'scale(1.0)';
            if (heroLensReadout) heroLensReadout.textContent = 'ỐNG KÍNH ĐANG CHỌN: COOKE S4/I 24MM T2.0 GÓC RỘNG';
          } else if (focal === '50mm') {
            heroPhoto.style.transform = 'scale(1.08)';
            if (heroLensReadout) heroLensReadout.textContent = 'ỐNG KÍNH ĐANG CHỌN: COOKE S4/I 50MM T2.0 TIÊU CHUẨN';
          } else if (focal === '85mm') {
            heroPhoto.style.transform = 'scale(1.18)';
            if (heroLensReadout) heroLensReadout.textContent = 'ỐNG KÍNH ĐANG CHỌN: COOKE S4/I 85MM T2.0 CHÂN DUNG CINE';
          }
        }
      });
    });
  }

  // 4. Modal Đăng Ký Tuyển Sinh (Admissions Modal)
  function initAdmissionsModal() {
    const modal = document.getElementById('apply-modal');
    const openBtns = document.querySelectorAll('a[href="#apply"], .open-apply-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    const form = document.getElementById('admissions-form');
    const successMsg = document.getElementById('form-success-msg');

    if (!modal) return;

    openBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeModal() {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (successMsg) {
          successMsg.style.display = 'block';
          form.reset();
        }
      });
    }
  }

  // Khởi động khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTimecode();
      initAspectGate();
      initLensCalibrator();
      initAdmissionsModal();
    });
  } else {
    initTimecode();
    initAspectGate();
    initLensCalibrator();
    initAdmissionsModal();
  }
})();
