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
  const themeButtons = document.querySelectorAll('.theme-btn');
  const welcomeMsg = document.getElementById('welcome-msg');

  // --- State ---
  let controlsTimeout = null;
  let controlsVisible = false;
  let docHeight = 0;
  let progressTicking = false;
  let messageTimeout = null;

  const FX_STAGGER_COUNT = 20;

  // --- Init ---
  applyTheme(localStorage.getItem('marquis-theme') || 'light');

  // --- Welcome messages (errors, warnings) ---
  function showMessage(text) {
    welcomeMsg.textContent = text;
    welcomeMsg.classList.add('visible');
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(function () {
      welcomeMsg.classList.remove('visible');
    }, 4500);
  }

  // Heuristic: treat content as binary if it has null bytes or a high ratio
  // of non-printable chars in the first 1KB. Guards against users dropping
  // an image/PDF renamed to .md.
  function looksBinary(text) {
    const sample = text.slice(0, 1024);
    if (!sample.length) return false;
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const c = sample.charCodeAt(i);
      if (c === 0) return true;
      if (c < 9 || (c > 13 && c < 32)) nonPrintable++;
    }
    return nonPrintable / sample.length > 0.1;
  }

  // --- Markdown rendering ---
  function renderMarkdown(text) {
    if (looksBinary(text)) {
      showMessage('Este ficheiro não parece ser texto.');
      return;
    }
    const rawHtml = marked.parse(text);
    content.innerHTML = DOMPurify.sanitize(rawHtml);
    welcome.classList.add('hidden');
    reader.classList.remove('hidden');
    // Instant scroll — bypass the global `scroll-behavior: smooth` so the
    // fade-up animation isn't fighting a smooth scroll when switching docs.
    window.scrollTo({ top: 0, behavior: 'instant' });
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

  // On touch devices the whole welcome is the hit target — tapping anywhere
  // opens the picker. We skip taps that already land on the button so the
  // native button handler fires exactly once.
  const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
  welcome.addEventListener('click', function (e) {
    if (!touchQuery.matches) return;
    if (e.target.closest('#open-btn')) return;
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
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      showMessage('Só abro um ficheiro de cada vez — vou usar o primeiro.');
    }
    readFile(files[0]);
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

  // --- Themes ---
  function applyTheme(theme) {
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

  // --- Service worker (offline + installable) ---
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* no-op */ });
    });
  }
})();
