/**
 * UaHomePlugin — головна сторінка:
 * скрол-ефекти, слайдер, пагінація, плавна навігація, ScrollSpy
 */
class UaHomePlugin {
  constructor(options = {}) {
    this.config = Object.assign({
      headerSelector: '#main-header',
      scrolledClass: 'is-scrolled',
      activeNavLinkClass: 'is-active',
      scrollThreshold: 50,

      navLinkSelector: '[data-scroll-to]',
      sectionSelector: 'section[id]',

      sliderSelector: '.ua-slider',
      trackSelector: '.ua-slider-track',
      slideSelector: '.ua-slide',
      bulletsContainerSelector: '.ua-slider-bullets',
      autoPlay: true,
      autoPlayInterval: 5000,

      onScroll: null
    }, options);

    this.state = {
      currentSlide: 0,
      isTicking: false,
      sections: [],
      navLinks: []
    };

    this._onScrollHandler = this._onScroll.bind(this);
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._setup());
    } else {
      this._setup();
    }
  }

  _setup() {
    this.header = document.querySelector(this.config.headerSelector);

    this._initScrollSpy();
    this._initSmoothNav();
    this._initSlider();
    this._bindEvents();
  }

  // --- 1. Плавна навігація ---
  _initSmoothNav() {
    this.state.navLinks = Array.from(document.querySelectorAll(this.config.navLinkSelector));

    this.state.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();

        const targetId = link.getAttribute('href') || link.dataset.scrollTo;
        if (!targetId) return;

        const targetElement = document.querySelector(targetId);
        if (!targetElement) return;

        const headerHeight = this.header ? this.header.offsetHeight : 0;
        const targetPos = targetElement.getBoundingClientRect().top + window.scrollY - headerHeight;

        window.scrollTo({ top: targetPos, behavior: 'smooth' });
      });
    });
  }

  // --- 2. ScrollSpy ---
  _initScrollSpy() {
    this.state.sections = Array.from(document.querySelectorAll(this.config.sectionSelector));
  }

  _updateScrollSpy(currentScrollY) {
    if (!this.state.sections.length) return;

    const headerHeight = this.header ? this.header.offsetHeight : 0;
    let activeSectionId = '';

    this.state.sections.forEach(section => {
      const sectionTop = section.offsetTop - headerHeight - 80;
      if (currentScrollY >= sectionTop) {
        activeSectionId = `#${section.id}`;
      }
    });

    this.state.navLinks.forEach(link => {
      link.classList.remove(this.config.activeNavLinkClass);
      const href = link.getAttribute('href');
      if (href === activeSectionId) {
        link.classList.add(this.config.activeNavLinkClass);
      }
    });
  }

  // --- 3. Слайдер ---
  _initSlider() {
    this.slider = document.querySelector(this.config.sliderSelector);
    if (!this.slider) return;

    this.track = this.slider.querySelector(this.config.trackSelector);
    this.slides = this.slider.querySelectorAll(this.config.slideSelector);
    this.bulletsContainer = this.slider.querySelector(this.config.bulletsContainerSelector);

    if (!this.slides.length) return;

    // Булети
    if (this.bulletsContainer) {
      this.bulletsContainer.innerHTML = '';
      this.slides.forEach((_, i) => {
        const bullet = document.createElement('button');
        bullet.type = 'button';
        bullet.classList.add('ua-bullet');
        if (i === 0) bullet.classList.add('is-active');
        bullet.addEventListener('click', () => this.goToSlide(i));
        this.bulletsContainer.appendChild(bullet);
      });
      this.bullets = this.bulletsContainer.querySelectorAll('.ua-bullet');
    }

    // Пауза автоплею при наведенні
    this.slider.addEventListener('mouseenter', () => this._stopAutoPlay());
    this.slider.addEventListener('mouseleave', () => {
      if (this.config.autoPlay) this._startAutoPlay();
    });

    if (this.config.autoPlay) this._startAutoPlay();
    this.goToSlide(0);
  }

  goToSlide(index) {
    if (!this.slides || !this.slides.length) return;

    this.state.currentSlide = (index + this.slides.length) % this.slides.length;
    const offset = -this.state.currentSlide * 100;

    if (this.track) {
      this.track.style.transform = `translateX(${offset}%)`;
    }

    if (this.bullets) {
      this.bullets.forEach((b, i) => {
        b.classList.toggle('is-active', i === this.state.currentSlide);
      });
    }
  }

  _startAutoPlay() {
    this._stopAutoPlay();
    this.sliderTimer = setInterval(
      () => this.goToSlide(this.state.currentSlide + 1),
      this.config.autoPlayInterval
    );
  }

  _stopAutoPlay() {
    if (this.sliderTimer) {
      clearInterval(this.sliderTimer);
      this.sliderTimer = null;
    }
  }

  // --- 4. Події ---
  _bindEvents() {
    window.addEventListener('scroll', this._onScrollHandler, { passive: true });
  }

  _onScroll() {
    if (this.state.isTicking) return;

    this.state.isTicking = true;
    window.requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;

      if (this.header) {
        this.header.classList.toggle(
          this.config.scrolledClass,
          currentScrollY > this.config.scrollThreshold
        );
      }

      this._updateScrollSpy(currentScrollY);

      if (typeof this.config.onScroll === 'function') {
        this.config.onScroll(currentScrollY);
      }

      this.state.isTicking = false;
    });
  }

  // --- Публічні методи ---
  destroy() {
    window.removeEventListener('scroll', this._onScrollHandler);
    this._stopAutoPlay();
  }
}

// Автоініціалізація (можна закоментувати і викликати вручну)
const uaHome = new UaHomePlugin({
  autoPlay: true,
  autoPlayInterval: 5000
});
