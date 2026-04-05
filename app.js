(function () {
  'use strict';

  // --- Elements ---
  const welcome = document.getElementById('welcome');
  const reader = document.getElementById('reader');
  const content = document.getElementById('content');
  const controls = document.getElementById('controls');
  const progressBar = document.getElementById('progress-bar');
  const openBtn = document.getElementById('open-btn');
  const fileInput = document.getElementById('file-input');
  const btnBack = document.getElementById('btn-back');
  const btnFontDown = document.getElementById('btn-font-down');
  const btnFontUp = document.getElementById('btn-font-up');
  const themeButtons = document.querySelectorAll('.theme-btn');

  // --- State ---
  const FONT_STEP = 0.05;
  const FONT_MIN = 0.85;
  const FONT_MAX = 1.6;
  let fontSize = parseFloat(localStorage.getItem('marquis-font-size')) || 1.15;
  let currentTheme = localStorage.getItem('marquis-theme') || 'light';
  let controlsTimeout = null;
  let controlsVisible = false;
  let docHeight = 0;
  let progressTicking = false;

  const FX_STAGGER_COUNT = 20;

  // --- Init ---
  applyTheme(currentTheme);
  applyFontSize(fontSize);

  // --- Markdown rendering ---
  function renderMarkdown(text) {
    const rawHtml = marked.parse(text);
    content.innerHTML = DOMPurify.sanitize(rawHtml);
    welcome.classList.add('hidden');
    reader.classList.remove('hidden');
    window.scrollTo(0, 0);
    applyLoadEffect();
    recalcDocHeight();
    updateProgress();
  }

  // --- Load effect ---
  function applyLoadEffect() {
    content.classList.remove('fx-load');
    // Force reflow so the animation restarts cleanly on re-render
    void content.offsetWidth;
    content.classList.add('fx-load');

    const children = content.children;
    const n = Math.min(children.length, FX_STAGGER_COUNT);
    for (let i = 0; i < n; i++) {
      children[i].classList.add('fx-item');
      children[i].style.setProperty('--i', i);
    }
  }

  function readFile(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = function (e) {
      renderMarkdown(e.target.result);
    };
    fr.readAsText(file);
  }

  // --- File open ---
  openBtn.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files.length > 0) {
      readFile(fileInput.files[0]);
    }
  });

  // --- Drag & Drop ---
  document.addEventListener('dragover', function (e) {
    e.preventDefault();
    welcome.classList.add('drag-over');
  });

  document.addEventListener('dragleave', function (e) {
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      welcome.classList.remove('drag-over');
    }
  });

  document.addEventListener('drop', function (e) {
    e.preventDefault();
    welcome.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      readFile(files[0]);
    }
  });

  // --- Controls visibility ---
  function showControls() {
    controls.classList.add('visible');
    controlsVisible = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3000);
  }

  function hideControls() {
    controls.classList.remove('visible');
    controlsVisible = false;
  }

  // Show controls on click/tap in reader view
  reader.addEventListener('click', function (e) {
    if (e.target.closest('a')) return; // don't interfere with links
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  });

  // Keep controls open while hovering/interacting
  controls.addEventListener('mouseenter', function () {
    clearTimeout(controlsTimeout);
  });

  controls.addEventListener('mouseleave', function () {
    controlsTimeout = setTimeout(hideControls, 2000);
  });

  // Prevent reader click from firing when clicking controls
  controls.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  // --- Back button ---
  btnBack.addEventListener('click', function () {
    reader.classList.add('hidden');
    welcome.classList.remove('hidden');
    content.innerHTML = '';
    hideControls();
    fileInput.value = '';
  });

  // --- Font size ---
  function applyFontSize(size) {
    fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, size));
    document.documentElement.style.setProperty('--font-size', fontSize + 'rem');
    localStorage.setItem('marquis-font-size', fontSize);
  }

  btnFontDown.addEventListener('click', function () {
    applyFontSize(fontSize - FONT_STEP);
  });

  btnFontUp.addEventListener('click', function () {
    applyFontSize(fontSize + FONT_STEP);
  });

  // --- Themes ---
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('marquis-theme', theme);
    themeButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
  }

  themeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyTheme(btn.getAttribute('data-theme'));
    });
  });

  // --- Scroll progress ---
  function recalcDocHeight() {
    docHeight = document.documentElement.scrollHeight - window.innerHeight;
  }

  function updateProgress() {
    const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
    progressTicking = false;
  }

  function onScroll() {
    if (!progressTicking) {
      progressTicking = true;
      requestAnimationFrame(updateProgress);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    recalcDocHeight();
    onScroll();
  }, { passive: true });

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', function (e) {
    // Escape: go back
    if (e.key === 'Escape' && !reader.classList.contains('hidden')) {
      btnBack.click();
    }
  });
})();
