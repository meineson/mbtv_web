/* Add future releases here. Upload the MP4 to /demo/ and put its cover in assets/showcase/. */
const showcaseVideos = [
  {title:'枕上仙墟 · EP01', detail:'古装短剧 · 2分52秒', src:'https://file.mbtv.me/demo/zhenshang-ep01-1080p.mp4', poster:'assets/showcase/zhenshang-ep01-cover.jpg'},
  {title:'枕上仙墟 · EP02', detail:'古装短剧 · 3分40秒', src:'https://file.mbtv.me/demo/zhenshang-ep02-1080p.mp4', poster:'assets/showcase/zhenshang-ep02-cover.jpg'},
  {title:'枕上仙墟 · EP03', detail:'古装短剧 · 3分钟', src:'https://file.mbtv.me/demo/zhenshang-ep03-1080p.mp4', poster:'assets/showcase/zhenshang-ep03-cover.jpg'},
  {title:'枕上仙墟 · 真人版', detail:'真人短剧 · 5分20秒', src:'https://file.mbtv.me/demo/zhenshang-live-action-1080p.mp4', poster:'assets/showcase/zhenshang-live-action-cover.jpg'},
  {title:'AI教我当县令 · 预告片', detail:'短剧预告 · 58秒', src:'https://file.mbtv.me/demo/ai-county-magistrate-trailer-1080p.mp4', poster:'assets/showcase/ai-county-magistrate-trailer-cover.jpg'}
];

(() => {
  const background = document.querySelector('.theater-video');
  const stage = document.querySelector('.theater-stage');
  const inline = document.querySelector('.showcase-video');
  const screen = document.querySelector('.showcase-screen');
  const section = document.querySelector('#showcase');
  const desktop = matchMedia('(min-width:801px)');
  const failed = new Set();
  let current = Math.floor(Math.random() * showcaseVideos.length);
  let queue = [];
  let inlineMode = null;
  let galleryVisible = false;
  let userPaused = !desktop.matches;
  let userEnabledSound = false;
  let playbackStarted = false;
  let pausedForModal = false;
  let pausedForVisibility = false;

  const entry = () => showcaseVideos[current];
  const active = () => inlineMode ? inline : background;
  const play = media => media.play().catch(() => {
    // Browser autoplay policy can require a visitor gesture; the play buttons remain available.
  });

  function setSource(media, index, time = 0, autoplay = false) {
    const item = showcaseVideos[index];
    const same = media.dataset.index === String(index) && media.getAttribute('src') === item.src;
    media.dataset.index = String(index);
    media.poster = item.poster;
    if (!same) {
      media.src = item.src;
      media.load();
    }
    const start = () => {
      if (media.dataset.index !== String(index)) return;
      if (time > 0 && Number.isFinite(media.duration)) media.currentTime = Math.min(time, Math.max(0, media.duration - .2));
      if (autoplay) play(media);
    };
    if (media.readyState >= 1) start();
    else media.onloadedmetadata = start;
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function randomNext() {
    queue = queue.filter(i => !failed.has(i) && i !== current);
    if (!queue.length) queue = shuffle(showcaseVideos.map((_, i) => i).filter(i => !failed.has(i) && i !== current));
    return queue.shift() ?? (failed.has(current) ? -1 : current);
  }

  function updateDisplay() {
    const item = entry();
    stage.style.backgroundImage = `url("${item.poster}")`;
    screen.style.backgroundImage = `url("${item.poster}")`;
    screen.classList.remove('has-frame', 'is-playing');
    document.querySelector('.theater-now strong').textContent = item.title;
    document.querySelector('.showcase-current-title').textContent = item.title;
    document.querySelector('.showcase-current-detail').textContent = item.detail;
    document.querySelector('.showcase-unavailable').hidden = true;
  }

  function select(index, autoplay = true) {
    if (index < 0 || index >= showcaseVideos.length) return;
    const previous = active();
    previous.pause();
    current = index;
    queue = queue.filter(i => i !== index);
    userPaused = !autoplay;
    updateDisplay();
    if (failed.has(index)) {
      document.querySelector('.showcase-unavailable').hidden = false;
      return;
    }
    if (inlineMode) {
      inline.muted = !userEnabledSound;
      setSource(inline, index, 0, autoplay);
    } else {
      setSource(background, index, 0, autoplay);
    }
    updateControls();
  }

  function updateControls() {
    const toggle = document.querySelector('.theater-toggle');
    const sound = document.querySelector('.theater-sound');
    document.querySelector('.theater-now span').textContent = background.paused ? '准备放映' : '正在放映';
    toggle.textContent = background.paused ? '▶' : 'Ⅱ';
    toggle.setAttribute('aria-label', background.paused ? '播放背景视频' : '暂停背景视频');
    sound.dataset.muted = String(background.muted);
    sound.setAttribute('aria-label', background.muted ? '开启背景视频声音' : '关闭背景视频声音');
  }

  function syncMode() {
    const nextInline = !desktop.matches || galleryVisible;
    document.body.classList.toggle('theater-on', desktop.matches);
    document.body.classList.toggle('showcase-active', desktop.matches && galleryVisible);
    if (inlineMode === nextInline) return;
    const wasInline = inlineMode;
    const old = active();
    const time = old?.currentTime || 0;
    const shouldPlay = !userPaused && !document.hidden && !document.querySelector('.modal.open');
    old?.pause();
    inlineMode = nextInline;
    if (nextInline) {
      if (desktop.matches || wasInline === false) {
        inline.muted = !userEnabledSound;
        setSource(inline, current, time, desktop.matches && shouldPlay);
      }
    } else {
      background.muted = !userEnabledSound;
      setSource(background, current, time, shouldPlay);
    }
    updateControls();
  }


  for (const media of [background, inline]) {
    media.addEventListener('ended', () => {
      if (media !== active()) return;
      const next = randomNext();
      if (next >= 0) select(next);
    });
    media.addEventListener('error', () => {
      if (media !== active() || media.dataset.index !== String(current)) return;
      failed.add(current);
      const next = randomNext();
      if (next >= 0) select(next);
      else {
        document.querySelector('.showcase-unavailable').hidden = false;
        userPaused = true;
        updateControls();
      }
    });
    media.addEventListener('play', updateControls);
    media.addEventListener('pause', updateControls);
  }
  background.addEventListener('playing', () => document.body.classList.add('theater-playing'));
  for (const event of ['pause', 'waiting', 'stalled', 'seeking', 'emptied', 'ended']) {
    background.addEventListener(event, () => document.body.classList.remove('theater-playing'));
  }
  inline.addEventListener('loadeddata', () => screen.classList.add('has-frame'));
  inline.addEventListener('play', () => {
    if (!playbackStarted) {
      playbackStarted = true;
      userEnabledSound = true;
      inline.muted = false;
    }
    userPaused = false;
    screen.classList.add('is-playing');
  });
  inline.addEventListener('pause', () => screen.classList.remove('is-playing'));
  inline.addEventListener('volumechange', () => {
    if (inlineMode) userEnabledSound = !inline.muted && inline.volume > 0;
  });
  document.querySelector('.showcase-play').addEventListener('click', () => {
    userPaused = false;
    userEnabledSound = true;
    inline.muted = false;
    if (!inline.getAttribute('src') || inline.dataset.index !== String(current)) select(current);
    else play(inline);
  });
  document.querySelector('.showcase-next').addEventListener('click', () => {
    userEnabledSound = true;
    select(randomNext());
  });
  document.querySelector('.theater-next').addEventListener('click', () => select(randomNext()));
  document.querySelector('.theater-toggle').addEventListener('click', () => {
    userPaused = !background.paused;
    if (background.paused) {
      userEnabledSound = true;
      background.muted = false;
      play(background);
    }
    else background.pause();
    updateControls();
  });
  document.querySelector('.theater-sound').addEventListener('click', () => {
    background.muted = !background.muted;
    userEnabledSound = !background.muted;
    updateControls();
  });
  const unlockSound = event => {
    if (!desktop.matches || event.target instanceof Element && event.target.closest('.theater-sound')) return;
    userEnabledSound = true;
    const media = active();
    media.muted = false;
    if (media.paused && !userPaused) play(media);
    updateControls();
    document.removeEventListener('pointerdown', unlockSound, true);
    document.removeEventListener('keydown', unlockSound, true);
  };
  document.addEventListener('pointerdown', unlockSound, true);
  document.addEventListener('keydown', unlockSound, true);
  new IntersectionObserver(entries => {
    galleryVisible = entries[0].intersectionRatio >= .5;
    syncMode();
  }, {threshold:[0, .5, 1]}).observe(section);
  new IntersectionObserver(entries => {
    if (!desktop.matches && !entries[0].isIntersecting && !inline.paused) {
      inline.pause();
      userPaused = true;
    }
  }, {threshold:0}).observe(screen);
  desktop.addEventListener('change', syncMode);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pausedForVisibility = !active().paused;
      active().pause();
    } else if (pausedForVisibility && !userPaused && !document.querySelector('.modal.open')) {
      pausedForVisibility = false;
      play(active());
    }
  });
  new MutationObserver(() => {
    const modalOpen = Boolean(document.querySelector('.modal.open'));
    if (modalOpen) {
      pausedForModal = !active().paused;
      active().pause();
    } else if (pausedForModal && !userPaused && !document.hidden) {
      pausedForModal = false;
      play(active());
    }
  }).observe(document.querySelector('.modal'), {attributes:true, attributeFilter:['class']});

  updateDisplay();
  syncMode();
})();
