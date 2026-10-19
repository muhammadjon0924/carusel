/**
 * ============================================================================
 * Zamonaviy va Interaktiv Karusel (Slider) Dasturi
 * HTML5, CSS3 va toza JavaScript (ES6+) yordamida yaratilgan
 * ============================================================================
 */

class PremiumCarousel {
  constructor() {
    // Asosiy elementlarni tanlab olish
    this.wrapper = document.getElementById('carouselWrapper');
    this.slidesContainer = document.getElementById('carouselSlides');
    this.slides = Array.from(document.querySelectorAll('.slide'));
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.indicatorDots = Array.from(document.querySelectorAll('.indicator-dot'));
    this.thumbnails = Array.from(document.querySelectorAll('.thumbnail-card'));
    this.currentSlideNum = document.getElementById('currentSlideNum');
    this.totalSlidesNum = document.getElementById('totalSlidesNum');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.pauseIcon = this.playPauseBtn?.querySelector('.pause-icon');
    this.playIcon = this.playPauseBtn?.querySelector('.play-icon');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.progressBar = document.getElementById('progressBar');
    this.backgroundGlow = document.getElementById('backgroundGlow');
    this.hoverStatusBadge = document.getElementById('hoverStatusBadge');
    this.thumbnailsContainer = document.getElementById('thumbnailsContainer');
    this.animBadge = document.getElementById('animBadge');
    this.animName = document.getElementById('animName');
    this.slideFlash = document.getElementById('slideFlash');
    this.soundBtn = document.getElementById('soundBtn');
    this.soundOnIcon = this.soundBtn?.querySelector('.sound-on-icon');
    this.soundOffIcon = this.soundBtn?.querySelector('.sound-off-icon');
    this.isMuted = false;
    this.audioContext = null;

    // Holat (State) o'zgaruvchilari
    this.currentIndex = 0;
    this.totalSlides = this.slides.length;
    this.isPlaying = true;
    this.slideDuration = 5000; // Har bir slayd ko'rinish vaqti (5 soniya)
    this.progressStartTime = 0;
    this.progressAnimationId = null;
    this.isHovered = false;

    // Surish (Swipe / Drag) holatlari - Vertikal va Gorizontal
    this.touchStartY = 0;
    this.touchEndY = 0;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.isDragging = false;
    this.swipeThreshold = 40; // Surish masofasi chegarasi (pikselda)
    this.isWheelThrottled = false;

    // Dasturni ishga tushirish
    this.init();
  }

  initAudio() {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!this.audioContext) {
      this.audioContext = new AudioCtor();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  triggerSlideEffect() {
    if (!this.slideFlash) return;
    this.slideFlash.classList.remove('active');
    void this.slideFlash.offsetWidth;
    this.slideFlash.classList.add('active');
    window.setTimeout(() => {
      this.slideFlash.classList.remove('active');
    }, 500);
  }

  /**
   * Slayd o'zgarganda billurdek jarangdor "Ching" (Crystal Chime) ovozini hosil qilish
   */
  playSlideSound() {
    if (this.isMuted) return;

    const audioContext = this.initAudio();
    if (!audioContext) return;

    const now = audioContext.currentTime;

    // Har bir slayd uchun billurdek toza "Ching" asosiy chastotasi (A6, B6, D7, E7, G7)
    const chimeScales = [1760, 1975.5, 2349.3, 2637, 3136];
    const baseFreq = chimeScales[this.currentIndex % chimeScales.length];

    // Haqiqiy billur/chime jaranglashi uchun metall akustik garmonikalar
    const partials = [
      { freq: baseFreq, gain: 0.14, decay: 1.3 },          // Asosiy billur "Ching" tovushi
      { freq: baseFreq * 1.503, gain: 0.08, decay: 1.0 },  // Mayin kvinta garmonikasi
      { freq: baseFreq * 2.756, gain: 0.05, decay: 0.65 }, // Kumushrang metall jaranglash
      { freq: baseFreq * 5.404, gain: 0.02, decay: 0.35 }  // Yulduzsimon uchqun (Sparkle)
    ];

    partials.forEach(({ freq, gain, decay }) => {
      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Chertilgan lahzada o'tkir, qisqa "ching" zarbasi (Attack: 0.002s)
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.003);

      // Sekin, mayin va jiringlab so'nish (Decay: Chiiiiing~~~~)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);

      osc.start(now);
      osc.stop(now + decay + 0.05);
    });
  }

  /**
   * Ovozni yoqish / o'chirish
   */
  toggleSound() {
    this.isMuted = !this.isMuted;
    if (this.soundOnIcon && this.soundOffIcon) {
      this.soundOnIcon.style.display = this.isMuted ? 'none' : 'block';
      this.soundOffIcon.style.display = this.isMuted ? 'block' : 'none';
      this.soundBtn?.setAttribute('title', this.isMuted ? "Ching ovozini yoqish" : "Ching ovozini o'chirish");
    }
    if (!this.isMuted) {
      this.playSlideSound();
    }
  }

  /**
   * Karuselni boshlang'ich sozlash
   */
  init() {
    if (!this.slides.length) return;

    // Jami slaydlar sonini ko'rsatish
    if (this.totalSlidesNum) {
      this.totalSlidesNum.textContent = this.formatNumber(this.totalSlides);
    }

    // Boshlang'ich slaydni faollashtirish
    this.goToSlide(0);

    // Hodisalarni (Events) tinglash
    this.bindEvents();

    // Avtomatik o'tishni boshlash
    this.startAutoPlay();
  }

  /**
   * Raqamni ikki xonali formatga o'tkazish (masalan: 1 -> "01")
   */
  formatNumber(num) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  /**
   * Berilgan indeksdagi slaydga o'tish
   */
  goToSlide(index) {
    // Chegaralarni tekshirish (aylana bo'ylab o'tish)
    if (index < 0) {
      index = this.totalSlides - 1;
    } else if (index >= this.totalSlides) {
      index = 0;
    }

    const previousIndex = this.currentIndex;
    this.currentIndex = index;

    // 1. Slaydlarni har xil animatsiya bilan almashtirish
    this.slides.forEach((slide, i) => {
      if (i === index) {
        // Yangi faol slayd
        slide.classList.remove('anim-exit');
        slide.classList.add('active');
        slide.setAttribute('aria-hidden', 'false');
      } else if (i === previousIndex && previousIndex !== index) {
        // Chiqib ketayotgan oldingi slayd (chiqish animatsiyasi)
        slide.classList.remove('active');
        slide.classList.add('anim-exit');
        slide.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
          slide.classList.remove('anim-exit');
        }, 750);
      } else {
        // Qolgan slaydlar
        slide.classList.remove('active', 'anim-exit');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    // 2. Animatsiya nishonini yangilash
    const currentSlide = this.slides[index];
    const animName = currentSlide.getAttribute('data-anim-name') || "✨ Animatsiya";
    if (this.animName) {
      this.animName.textContent = animName;
    }
    if (this.animBadge) {
      this.animBadge.classList.remove('pop');
      void this.animBadge.offsetWidth; // Qayta animatsiya boshlanishi uchun reflow
      this.animBadge.classList.add('pop');
    }

    // 3. Indikator nuqtalarini yangilash
    this.indicatorDots.forEach((dot, i) => {
      const isActive = i === index;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive);
    });

    // 4. Mini rasmlar (Thumbnails) holatini yangilash
    this.thumbnails.forEach((thumb, i) => {
      const isActive = i === index;
      thumb.classList.toggle('active', isActive);
      if (isActive) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });

    // 5. Hisoblagich raqamini yangilash
    if (this.currentSlideNum) {
      this.currentSlideNum.textContent = this.formatNumber(index + 1);
    }

    // 6. Orqa fon nuri rangini joriy slayd mavzusiga moslash
    const themeColor = currentSlide.getAttribute('data-theme') || '#6366f1';
    if (this.backgroundGlow) {
      this.backgroundGlow.style.background = `radial-gradient(circle, ${themeColor}38 0%, ${themeColor}12 40%, transparent 70%)`;
    }

    this.triggerSlideEffect();
    this.playSlideSound();

    // 7. Progress chizig'ini qayta boshlash
    if (this.isPlaying) {
      this.resetProgressBar();
    }
  }

  /**
   * Keyingi slaydga o'tish
   */
  nextSlide() {
    this.goToSlide(this.currentIndex + 1);
  }

  /**
   * Oldingi slaydga o'tish
   */
  prevSlide() {
    this.goToSlide(this.currentIndex - 1);
  }

  /**
   * Avtomatik slayd o'tish jarayonini boshlash (Progress Bar bilan)
   */
  startAutoPlay() {
    this.isPlaying = true;
    this.updatePlayPauseUI();
    this.resetProgressBar();
  }

  /**
   * Avtomatik slayd o'tishni to'xtatish
   */
  pauseAutoPlay() {
    this.isPlaying = false;
    this.updatePlayPauseUI();
    if (this.progressAnimationId) {
      cancelAnimationFrame(this.progressAnimationId);
    }
  }

  /**
   * Avtomatik o'tish holatini yoqish/o'chirish
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pauseAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  /**
   * Play / Pause tugmasi piktogrammalarini yangilash
   */
  updatePlayPauseUI() {
    if (!this.pauseIcon || !this.playIcon) return;
    if (this.isPlaying) {
      this.pauseIcon.style.display = 'block';
      this.playIcon.style.display = 'none';
      this.playPauseBtn.setAttribute('title', "Avtomatik o'tishni to'xtatish (Space)");
    } else {
      this.pauseIcon.style.display = 'none';
      this.playIcon.style.display = 'block';
      this.playPauseBtn.setAttribute('title', "Avtomatik o'tishni yoqish (Space)");
    }
  }

  /**
   * Progress chizig'ini 0 dan boshlab animatsiya qilish
   */
  resetProgressBar() {
    if (this.progressAnimationId) {
      cancelAnimationFrame(this.progressAnimationId);
    }
    if (!this.progressBar) return;

    this.progressStartTime = performance.now();
    this.progressBar.style.width = '0%';

    const animateProgress = (currentTime) => {
      if (!this.isPlaying || this.isHovered) {
        // Agar to'xtatilgan yoki sichqoncha ustida tursa, animatsiyani davom ettirish kutib turadi
        this.progressStartTime = currentTime - (this.pausedProgressRatio || 0) * this.slideDuration;
        this.progressAnimationId = requestAnimationFrame(animateProgress);
        return;
      }

      const elapsed = currentTime - this.progressStartTime;
      const progressRatio = Math.min(elapsed / this.slideDuration, 1);
      this.pausedProgressRatio = progressRatio;
      this.progressBar.style.width = `${progressRatio * 100}%`;

      if (progressRatio >= 1) {
        this.pausedProgressRatio = 0;
        this.nextSlide();
      } else {
        this.progressAnimationId = requestAnimationFrame(animateProgress);
      }
    };

    this.progressAnimationId = requestAnimationFrame(animateProgress);
  }

  /**
   * To'liq ekran rejimini yoqish/o'chirish
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (this.wrapper.requestFullscreen) {
        this.wrapper.requestFullscreen().catch(err => console.error(err));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /**
   * Sichqoncha slayd ustiga borganda: avtomatik o'tish to'xtaydi (Pause)
   */
  onHoverEnter() {
    this.isHovered = true;
    if (this.hoverStatusBadge) {
      this.hoverStatusBadge.classList.add('active');
    }
  }

  /**
   * Sichqoncha slayd ustidan olinganda: avtomatik o'tish davom etadi (Resume)
   */
  onHoverLeave() {
    this.isHovered = false;
    if (this.hoverStatusBadge) {
      this.hoverStatusBadge.classList.remove('active');
    }
  }

  /**
   * Barcha hodisalar va tinglovchilarni bog'lash
   */
  bindEvents() {
    // Oldingi va keyingi tugmalar
    this.prevBtn?.addEventListener('click', () => {
      this.prevSlide();
    });

    this.nextBtn?.addEventListener('click', () => {
      this.nextSlide();
    });

    // Indikator nuqtalarini bosish
    this.indicatorDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.goToSlide(index);
      });
    });

    // Mini rasmlarni (Thumbnails) bosish
    this.thumbnails.forEach((thumb, index) => {
      thumb.addEventListener('click', () => {
        this.goToSlide(index);
      });
    });

    // Play/Pause tugmasi
    this.playPauseBtn?.addEventListener('click', () => {
      this.togglePlayPause();
    });

    // Ovoz (Ching) tugmasi
    this.soundBtn?.addEventListener('click', () => {
      this.toggleSound();
    });

    // Fullscreen tugmasi
    this.fullscreenBtn?.addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Sichqoncha slayd ustiga borganda to'xtatish (Pause on Hover)
    this.wrapper?.addEventListener('mouseenter', () => this.onHoverEnter());
    this.wrapper?.addEventListener('mouseleave', () => this.onHoverLeave());

    // Mini rasmlar paneli ustiga kelganda ham to'xtatib turish
    this.thumbnailsContainer?.addEventListener('mouseenter', () => this.onHoverEnter());
    this.thumbnailsContainer?.addEventListener('mouseleave', () => this.onHoverLeave());

    // Brauzer siyosati bo'yicha ovozni birinchi foydalanuvchi harakatida faollashtirish
    const unlockAudio = () => {
      this.initAudio();
    };
    ['click', 'keydown', 'wheel', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, unlockAudio, { once: true, passive: true });
    });

    // Klaviatura tugmalari orqali boshqarish (Tepaga / Pastga va Chapga / O'ngga)
    window.addEventListener('keydown', (e) => {
      // Agar foydalanuvchi biror input maydoniga yozayotgan bo'lsa, xalaqit bermaslik
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          this.prevSlide();
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          this.nextSlide();
          break;
        case ' ': // Bo'sh joy tugmasi (Space)
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
      }
    });

    // Sichqoncha g'ildiragi (Mouse Wheel) orqali vertikal o'tish
    this.wrapper?.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.isWheelThrottled) return;

      this.isWheelThrottled = true;
      setTimeout(() => {
        this.isWheelThrottled = false;
      }, 650);

      if (e.deltaY > 0) {
        // G'ildirak pastga aylantirildi -> Keyingi slayd
        this.nextSlide();
      } else if (e.deltaY < 0) {
        // G'ildirak tepaga aylantirildi -> Oldingi slayd
        this.prevSlide();
      }
    }, { passive: false });

    // Mobil qurilmalarda barmoq bilan vertikal surish (Touch Events)
    this.wrapper?.addEventListener('touchstart', (e) => {
      this.touchStartY = e.changedTouches[0].screenY;
      this.touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    this.wrapper?.addEventListener('touchend', (e) => {
      this.touchEndY = e.changedTouches[0].screenY;
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleVerticalSwipe();
    }, { passive: true });

    // Kompyuter sichqonchasi orqali vertikal sudrab o'tish (Mouse Drag Events)
    this.wrapper?.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.touchStartY = e.clientY;
      this.touchStartX = e.clientX;
      this.wrapper.style.cursor = 'grabbing';
    });

    this.wrapper?.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.touchEndY = e.clientY;
      this.touchEndX = e.clientX;
      if (this.wrapper) this.wrapper.style.cursor = 'grab';
      this.handleVerticalSwipe();
    });
  }

  /**
   * Vertikal va gorizontal surish yo'nalishini aniqlash va slaydni almashtirish
   */
  handleVerticalSwipe() {
    const diffY = this.touchEndY - this.touchStartY;
    const diffX = this.touchEndX - this.touchStartX;

    // Asosiy e'tibor vertikal surishga (Tepaga / Pastga)
    if (Math.abs(diffY) > this.swipeThreshold && Math.abs(diffY) >= Math.abs(diffX)) {
      if (diffY > 0) {
        // Pastga tortildi -> Tepadagi slayd (Oldingi)
        this.prevSlide();
      } else {
        // Tepaga tortildi -> Pastdagi slayd (Keyingi)
        this.nextSlide();
      }
    } else if (Math.abs(diffX) > this.swipeThreshold) {
      // Gorizontal ham ishlayveradi (zaxira sifatida)
      if (diffX > 0) {
        this.prevSlide();
      } else {
        this.nextSlide();
      }
    }
  }
}

// Sahifa to'liq yuklangandan so'ng karuselni ishga tushirish
document.addEventListener('DOMContentLoaded', () => {
  const carousel = new PremiumCarousel();
  // Global murojaat qilish imkoniyati uchun window obyektiga biriktirish (ixtiyoriy)
  window.appCarousel = carousel;
});
