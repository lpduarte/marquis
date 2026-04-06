(function () {
  'use strict';

  // --- Elements ---
  const welcome = document.getElementById('welcome');
  const reader = document.getElementById('reader');
  const content = document.getElementById('content');
  const controls = document.getElementById('controls');
  const progressTrack = document.querySelector('.progress-track');
  const progressBar = document.getElementById('progress-bar');
  const openBtn = document.getElementById('open-btn');
  const fileInput = document.getElementById('file-input');
  const btnBack = document.getElementById('btn-back');
  const themeButtons = document.querySelectorAll('.theme-btn');
  const welcomeMsg = document.getElementById('welcome-msg');
  const msgText = welcomeMsg.querySelector('.msg-text');
  const msgCode = welcomeMsg.querySelector('.msg-code');

  // --- State ---
  let controlsTimeout = null;
  let controlsVisible = false;
  let docHeight = 0;
  let progressTicking = false;
  let messageTimeout = null;

  const FX_STAGGER_COUNT = 20;

  // --- Init ---
  applyTheme(localStorage.getItem('marquis-theme') || 'light');

  // --- Welcome messages (errors, warnings, loading) ---
  function showMessage(text, code) {
    msgText.textContent = text;
    msgCode.textContent = code || '';
    welcomeMsg.classList.remove('loading');
    welcomeMsg.classList.add('visible');
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(hideMessage, 4500);
  }

  function showLoading(text) {
    msgText.textContent = text;
    msgCode.textContent = '';
    welcomeMsg.classList.add('loading', 'visible');
    clearTimeout(messageTimeout);
  }

  function hideMessage() {
    welcomeMsg.classList.remove('visible', 'loading');
    clearTimeout(messageTimeout);
  }

  // --- Error mappers ---
  function friendlyFileError(error) {
    if (!error) return { text: 'Não foi possível ler o ficheiro. Tenta com outro.', code: 'MQ-F00' };
    switch (error.name) {
      case 'NotFoundError':
        return { text: 'O ficheiro parece ter sido movido ou apagado. Escolhe outro.', code: 'MQ-F01' };
      case 'NotReadableError':
        return { text: 'Não foi possível ler este ficheiro. Pode ser uma questão de permissões.', code: 'MQ-F02' };
      case 'SecurityError':
        return { text: 'O browser bloqueou o acesso a este ficheiro por segurança.', code: 'MQ-F03' };
      case 'AbortError':
        return { text: 'A leitura foi interrompida. Tenta outra vez.', code: 'MQ-F04' };
      default:
        return { text: 'Não foi possível ler o ficheiro. Tenta com outro.', code: 'MQ-F00' };
    }
  }

  function friendlyRenderError(error) {
    var msg = 'Não foi possível processar este ficheiro. Tenta com outro.';
    var code = 'MQ-R00';
    if (error && error.message) {
      if (error.message.toLowerCase().indexOf('purify') !== -1 ||
          error.message.toLowerCase().indexOf('sanitize') !== -1) {
        msg = 'Houve um problema ao preparar o conteúdo. Tenta com outro ficheiro.';
        code = 'MQ-S01';
      } else {
        msg = 'O conteúdo não pôde ser processado. O ficheiro pode não ser markdown válido.';
        code = 'MQ-P01';
      }
    }
    return { text: msg, code: code };
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
      showMessage('Este ficheiro não parece ser texto.', 'MQ-F00');
      return;
    }

    // Show a "processing" hint with animated dots. For fast files the
    // browser paints it for one frame and immediately switches to reader.
    // For slow files the user sees it until the sync parse completes.
    showLoading('A processar');

    // Yield to the browser so the loading message can paint before the
    // synchronous marked.parse potentially blocks the thread.
    requestAnimationFrame(function () {
      try {
        var rawHtml = marked.parse(text);
        var cleanHtml = DOMPurify.sanitize(rawHtml);
      } catch (err) {
        var mapped = friendlyRenderError(err);
        console.error(mapped.code + ':', err);
        showMessage(mapped.text, mapped.code);
        return;
      }

      content.innerHTML = cleanHtml;

      // Make external links open in a new tab so the reader isn't lost.
      var externalLinks = content.querySelectorAll('a[href^="http"]');
      for (var i = 0; i < externalLinks.length; i++) {
        externalLinks[i].target = '_blank';
        externalLinks[i].rel = 'noopener';
      }

      hideMessage();
      welcome.classList.add('hidden');
      reader.classList.remove('hidden');
      document.body.classList.add('reading');
      window.scrollTo({ top: 0, behavior: 'instant' });
      applyLoadEffect();
      recalcDocHeight();
      updateProgress();
      content.focus({ preventScroll: true });
      showControls();
    });
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
    fr.onerror = function () {
      var mapped = friendlyFileError(fr.error);
      console.error(mapped.code + ':', fr.error);
      showMessage(mapped.text, mapped.code);
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
    if (e.target.closest('#open-btn, a')) return;
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
    controls.inert = false;
    controlsVisible = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(hideControls, 3000);
  }

  function hideControls() {
    controls.classList.remove('visible');
    controls.inert = true;
    controlsVisible = false;
  }

  // Show controls on click/tap in reader view — but ignore the click when
  // the user is just ending a text selection (mouseup after drag-select).
  reader.addEventListener('click', function (e) {
    if (e.target.closest('a, pre, code')) return;
    const selection = window.getSelection && window.getSelection();
    if (selection && selection.toString().length > 0) return;
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
    document.body.classList.remove('reading');
    content.innerHTML = '';
    hideControls();
    fileInput.value = '';
    // Return focus to the welcome open button so keyboard users land
    // back where they were before opening the document.
    openBtn.focus({ preventScroll: true });
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
    progressTrack.setAttribute('aria-valuenow', String(Math.round(progress)));
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
