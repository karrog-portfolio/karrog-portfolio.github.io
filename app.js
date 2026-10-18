(() => {
  "use strict";
  const shorts = [
    { file: 10, title: "OMG New Invisible Bug Free Divine" },
    { file: 3, title: "New Trick" },
    { file: 4, title: "High Fence vs All Guards" },
    { file: 1, title: "Rainbow Stairs vs Huge Dark Bosses!" },
    { file: 7, title: "1Qa Speed" },
    { file: 8, title: "How to Steal an Egg" },
    { file: 9, title: "Sunlion vs Aetheron" },
    { file: 2, title: "How Eggs Get Restock" },
    { file: 5, title: "This Is How Eggs Reset!" },
    { file: 6, title: "I Miss Old Roblox" }
  ].map(({ title, file }) => {
    const number = String(file).padStart(2, "0");
    return { title, src: `media/video-${number}.mp4`, poster: `media/poster-${number}.jpg` };
  });
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const validIndex = (index) => Number.isInteger(index) && index >= 0 && index < shorts.length;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function onMediaChange(query, callback) {
    if (typeof query.addEventListener === "function") query.addEventListener("change", callback);
    else if (typeof query.addListener === "function") query.addListener(callback);
  }

  // Only observed elements receive a pending state; the default document stays visible.
  const pendingReveals = new Set();
  let revealObserver = null;
  function showReveal(node) {
    node.classList.add("is-visible");
    node.classList.remove("is-pending");
    revealObserver?.unobserve(node);
    pendingReveals.delete(node);
  }
  function showAllReveals() { Array.from(pendingReveals).forEach(showReveal); }
  function initializeReveals() {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      nodes.forEach(showReveal);
      return;
    }
    try {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) showReveal(entry.target); });
      }, { threshold: 0.06, rootMargin: "0px 0px -4% 0px" });
      let row = 0;
      nodes.forEach((node) => {
        const type = node.dataset.reveal;
        const delay = type === "row" ? Math.min(row++ * 75, 375) : type === "portrait" ? 160 : type === "text" ? 80 : 0;
        node.style.setProperty("--reveal-delay", `${delay}ms`);
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.96 && rect.bottom > 0) showReveal(node);
        else {
          node.classList.add("is-pending");
          pendingReveals.add(node);
          revealObserver.observe(node);
        }
      });
    } catch {
      revealObserver?.disconnect();
      nodes.forEach(showReveal);
    }
  }

  // Native details keeps navigation usable without script.
  const menu = document.querySelector("details.mobile-menu");
  const menuSummary = menu?.querySelector("summary");
  function closeMenu(restoreFocus = false) {
    if (!menu?.open) return;
    menu.open = false;
    body.classList.remove("menu-open");
    if (restoreFocus) menuSummary?.focus({ preventScroll: true });
  }
  menu?.addEventListener("toggle", () => body.classList.toggle("menu-open", menu.open));
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => closeMenu()));
  document.addEventListener("pointerdown", (event) => {
    if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.open) { event.preventDefault(); closeMenu(true); }
  });
  onMediaChange(window.matchMedia("(min-width: 801px)"), (event) => { if (event.matches) closeMenu(); });

  const dialog = document.getElementById("player-dialog");
  const playerFrame = document.getElementById("player-frame");
  const playerTitle = document.getElementById("player-title");
  const playerDescription = document.getElementById("player-description");
  const playerSource = document.getElementById("player-youtube");
  const playerPosition = document.getElementById("player-position");
  const playerClose = document.querySelector(".player-close");
  const playerQueue = document.getElementById("player-queue");
  const queueButtons = [];
  let activeVideo = 0;
  let playingVideo = null;
  let returnFocus = null;
  let backdropPressed = false;
  if (playerQueue) {
    const fragment = document.createDocumentFragment();
    shorts.forEach((short, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "queue-item";
      button.dataset.playerIndex = String(index);
      button.setAttribute("aria-label", `Watch ${short.title}`);
      const image = document.createElement("img");
      image.src = short.poster;
      image.alt = "";
      image.width = 180;
      image.height = 240;
      image.loading = "lazy";
      image.decoding = "async";
      const copy = document.createElement("span");
      copy.className = "queue-copy";
      const title = document.createElement("span");
      title.className = "queue-title";
      title.textContent = short.title;
      const category = document.createElement("span");
      category.className = "queue-category";
      category.textContent = "Roblox Short";
      copy.append(title, category);
      button.append(image, copy);
      fragment.append(button);
      queueButtons.push(button);
    });
    playerQueue.append(fragment);
  }
  function unloadVideo() {
    if (playingVideo) {
      playingVideo.pause();
      playingVideo.removeAttribute("src");
      playingVideo.load();
      playingVideo = null;
    }
    playerFrame?.replaceChildren();
  }
  function loadVideo(index) {
    if (!Number.isInteger(index) || !playerFrame || !playerTitle || !playerSource || !dialog?.open) return;
    unloadVideo();
    activeVideo = ((index % shorts.length) + shorts.length) % shorts.length;
    const short = shorts[activeVideo];
    playerTitle.textContent = short.title;
    if (playerDescription) playerDescription.textContent = "A Roblox Short by Karrog.";
    if (playerPosition) playerPosition.textContent = `${activeVideo + 1} of ${shorts.length}`;
    playerSource.href = short.src;
    playerSource.setAttribute("aria-label", `Open ${short.title} in a new tab`);
    queueButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === activeVideo;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    // The MP4 is requested only after someone opens the player.
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = short.poster;
    video.src = short.src;
    video.title = `${short.title} — Karrog`;
    video.setAttribute("aria-label", short.title);
    video.textContent = "Your browser does not support HTML5 video. Use the link to open this video in a new tab.";
    playingVideo = video;
    playerFrame.replaceChildren(video);
    // Playback may be blocked by device settings; the native controls remain usable.
    try {
      const playback = video.play();
      if (playback && typeof playback.catch === "function") playback.catch(() => {});
    } catch { /* Native controls provide the manual playback fallback. */ }
  }
  function openVideo(index, trigger) {
    if (!validIndex(index) || !dialog || !playerFrame || typeof dialog.showModal !== "function") return false;
    if (!dialog.open) {
      try { dialog.showModal(); } catch { return false; }
      returnFocus = trigger;
      closeMenu();
      body.classList.add("player-open");
      stopScene();
      syncRefractionGeometry();
    }
    loadVideo(index);
    playerClose?.focus({ preventScroll: true });
    return true;
  }
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const trigger = event.target instanceof Element ? event.target.closest("a[data-open]") : null;
    if (!trigger || !/^\d+$/.test(trigger.dataset.open || "")) return;
    // Modified clicks and unsupported dialogs retain the native href and target.
    if (openVideo(Number(trigger.dataset.open), trigger)) event.preventDefault();
  });
  playerQueue?.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button[data-player-index]") : null;
    if (button && playerQueue.contains(button)) loadVideo(Number(button.dataset.playerIndex));
  });
  playerClose?.addEventListener("click", () => dialog?.close());
  document.getElementById("player-prev")?.addEventListener("click", () => loadVideo(activeVideo - 1));
  document.getElementById("player-next")?.addEventListener("click", () => loadVideo(activeVideo + 1));
  function isBackdrop(event) {
    if (event.target !== dialog) return false;
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  }
  dialog?.addEventListener("pointerdown", (event) => { backdropPressed = isBackdrop(event); });
  dialog?.addEventListener("pointercancel", () => { backdropPressed = false; });
  dialog?.addEventListener("click", (event) => {
    if (backdropPressed && isBackdrop(event)) dialog.close();
    backdropPressed = false;
  });
  dialog?.addEventListener("close", () => {
    unloadVideo();
    body.classList.remove("player-open");
    backdropPressed = false;
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
    returnFocus = null;
    measureScene = true;
    requestScene();
    syncRefractionGeometry();
  });

  const hero = document.querySelector(".hero");
  const heroMedia = document.querySelector(".hero-media");
  const scene = document.querySelector(".portrait-scene");
  const heroAnimations = new Set();
  let syncRefractionGeometry = () => {};

  function initializeHeroRefraction() {
    const refraction = document.querySelector(".hero-refraction");
    const spans = refraction ? Array.from(refraction.querySelectorAll(".name-mask > span")) : [];
    if (!refraction || !spans.length) return;
    const signatures = new WeakMap();
    let scheduledFrame = 0;
    let geometryFrame = 0;
    let geometryLastTime = 0;
    let masksReady = false;
    const emptyPath = "M0 0 Z";
    const mediaPanels = Array.from(heroMedia?.querySelectorAll(".avatar-panel, .hero-short-back, .hero-short-front") || []);
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;fill:#fff;stroke:none";
    const defs = document.createElementNS(svgNamespace, "defs");
    svg.append(defs);
    const glyphClips = spans.map((span, index) => {
      const mediaId = `karrog-refraction-media-${index}`;
      const glyphId = `karrog-refraction-glyph-${index}`;
      const mediaClip = document.createElementNS(svgNamespace, "clipPath");
      mediaClip.id = mediaId;
      mediaClip.setAttribute("clipPathUnits", "userSpaceOnUse");
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", emptyPath);
      path.setAttribute("clip-rule", "nonzero");
      mediaClip.append(path);
      const glyphClip = document.createElementNS(svgNamespace, "clipPath");
      glyphClip.id = glyphId;
      glyphClip.setAttribute("clipPathUnits", "userSpaceOnUse");
      const text = document.createElementNS(svgNamespace, "text");
      text.setAttribute("clip-path", `url(#${mediaId})`);
      text.setAttribute("font-kerning", "none");
      text.style.fontKerning = "none";
      glyphClip.append(text);
      defs.append(mediaClip, glyphClip);
      span.style.removeProperty("--glyph-mask");
      return { path, text, reference: `url("#${glyphId}")` };
    });
    refraction.append(svg);

    function cornerMarkers(node) {
      return [[0, 0], [100, 0], [100, 100], [0, 100]].map(([left, top]) => {
        const marker = document.createElement("i");
        marker.setAttribute("aria-hidden", "true");
        marker.style.cssText = `position:absolute;left:${left}%;top:${top}%;display:block;width:0;height:0;margin:0;padding:0;border:0;pointer-events:none;opacity:0`;
        node.append(marker);
        return marker;
      });
    }
    const mediaCorners = mediaPanels.map(cornerMarkers);
    const wordCorners = spans.map(cornerMarkers);
    function readCorners(markers) {
      return markers.map((marker) => {
        const rect = marker.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
      });
    }
    function updateClips() {
      const entering = !reducedMotion.matches && heroAnimations.size > 0;
      const quads = !entering ? mediaCorners.map(readCorners).filter((quad) => quad.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) : [];
      const pathsByWord = spans.map((span, index) => {
        if (!quads.length) return emptyPath;
        const [origin, right, , bottom] = readCorners(wordCorners[index]);
        const width = span.offsetWidth;
        const height = span.offsetHeight;
        if (!width || !height) return emptyPath;
        const ux = (right.x - origin.x) / width;
        const uy = (right.y - origin.y) / width;
        const vx = (bottom.x - origin.x) / height;
        const vy = (bottom.y - origin.y) / height;
        const determinant = ux * vy - uy * vx;
        if (!Number.isFinite(determinant) || Math.abs(determinant) < 0.00001) return emptyPath;
        const paths = quads.map((quad) => {
          const points = quad.map((point) => {
            const dx = point.x - origin.x;
            const dy = point.y - origin.y;
            return { x: (dx * vy - dy * vx) / determinant, y: (ux * dy - uy * dx) / determinant };
          });
          if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1000000 || Math.abs(point.y) > 1000000)) return "";
          return points.map((point, pointIndex) => `${pointIndex ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ") + " Z";
        }).filter(Boolean);
        return paths.length ? paths.join(" ") : emptyPath;
      });
      // Nested SVG clipping intersects the word outline and the media union once.
      glyphClips.forEach((clip, index) => {
        if (clip.path.getAttribute("d") !== pathsByWord[index]) clip.path.setAttribute("d", pathsByWord[index]);
      });
    }
    function canAnimateClips() {
      return masksReady && sceneVisible && !reducedMotion.matches && !document.hidden && !dialog?.open;
    }
    function tickClips(time) {
      geometryFrame = 0;
      if (!canAnimateClips()) { syncRefractionGeometry(); return; }
      const interval = 1000 / 30;
      if (time - geometryLastTime >= interval) {
        updateClips();
        geometryLastTime = time - ((time - geometryLastTime) % interval);
      }
      geometryFrame = window.requestAnimationFrame(tickClips);
    }
    syncRefractionGeometry = () => {
      window.cancelAnimationFrame(geometryFrame);
      geometryFrame = 0;
      if (!masksReady || !sceneVisible || document.hidden || dialog?.open) return;
      updateClips();
      geometryLastTime = performance.now();
      if (canAnimateClips()) geometryFrame = window.requestAnimationFrame(tickClips);
    };

    function renderGlyphClip(span, index) {
      const word = span.textContent || "";
      const style = window.getComputedStyle(span);
      const font = style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;
      // A zero-height inline box sits exactly on this line's alphabetic baseline.
      const probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = "display:inline-block;position:static;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline;line-height:0;font-size:0;pointer-events:none";
      span.append(probe);
      const width = span.offsetWidth;
      const height = span.offsetHeight;
      const baseline = probe.offsetTop;
      probe.remove();
      if (!word.trim() || width <= 0 || height <= 0 || !Number.isFinite(baseline)) return false;
      const signature = [word, font, letterSpacing, width, height, baseline, style.paddingLeft, style.borderLeftWidth].join("|");
      if (signatures.get(span) === signature) return true;
      const glyph = glyphClips[index];
      glyph.text.textContent = word;
      glyph.text.setAttribute("x", String((Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.borderLeftWidth) || 0)));
      glyph.text.setAttribute("y", String(baseline));
      glyph.text.setAttribute("font-family", style.fontFamily);
      glyph.text.setAttribute("font-size", style.fontSize);
      glyph.text.setAttribute("font-weight", style.fontWeight);
      glyph.text.setAttribute("font-style", style.fontStyle);
      glyph.text.setAttribute("letter-spacing", `${letterSpacing}px`);
      glyph.text.setAttribute("dominant-baseline", "alphabetic");
      span.style.clipPath = glyph.reference;
      span.style.setProperty("-webkit-clip-path", glyph.reference);
      signatures.set(span, signature);
      return true;
    }
    function updateMasks() {
      scheduledFrame = 0;
      let ready = true;
      spans.forEach((span, index) => {
        try { if (!renderGlyphClip(span, index)) ready = false; }
        catch { ready = false; }
      });
      masksReady = ready;
      refraction.classList.toggle("is-ready", ready);
      syncRefractionGeometry();
    }
    function scheduleMasks() {
      if (!scheduledFrame) scheduledFrame = window.requestAnimationFrame(updateMasks);
    }
    const fontsReady = document.fonts?.ready || Promise.resolve();
    fontsReady.then(() => {
      scheduleMasks();
      if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(scheduleMasks);
        spans.forEach((span) => observer.observe(span));
        mediaPanels.forEach((panel) => observer.observe(panel));
      }
      // Browser zoom can change the text metrics and the projected media geometry.
      window.addEventListener("resize", scheduleMasks, { passive: true });
    }, () => { /* The original glass heading stays visible if fonts are unavailable. */ });
  }

  function finishHeroEntrance() {
    heroAnimations.forEach((animation) => animation.cancel());
    heroAnimations.clear();
  }

  function playHeroEntrance() {
    if (reducedMotion.matches || document.hidden || !sceneVisible) return;
    function enter(node, keyframes, delay, duration = 900) {
      if (!node || typeof node.animate !== "function") return;
      node.style.willChange = "transform";
      const animation = node.animate(keyframes, {
        delay, duration, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards"
      });
      heroAnimations.add(animation);
      const finish = () => {
        node.style.removeProperty("will-change");
        heroAnimations.delete(animation);
      };
      animation.finished.then(finish, finish);
    }
    document.querySelectorAll(".name-start > span").forEach((node) => enter(node, [
      { transform: "perspective(900px) translate3d(0,.13em,0) rotateX(-12deg)", opacity: 0 },
      { transform: "perspective(900px) translate3d(0,0,0) rotateX(0deg)", opacity: 1 }
    ], 70, 1050));
    document.querySelectorAll(".name-end > span").forEach((node) => enter(node, [
      { transform: "perspective(900px) translate3d(0,.13em,0) rotateX(-12deg)", opacity: 0 },
      { transform: "perspective(900px) translate3d(0,0,0) rotateX(0deg)", opacity: 1 }
    ], 210, 1050));
    enter(document.querySelector(".hero-intro"), [
      { transform: "translateY(18px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }
    ], 260, 700);
  }

  let sceneVisible = Boolean(hero && hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < window.innerHeight);
  let measureScene = true;
  let pointerActive = false;
  let pointerClientX = 0;
  let pointerClientY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let progress = 0;
  let currentX = 0;
  let currentY = 0;
  let currentShift = 0;
  let frame = 0;
  let previousTime = 0;
  function canMoveScene() { return scene && !reducedMotion.matches && sceneVisible && !document.hidden && !dialog?.open; }
  function stopScene(reset = false) {
    window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    scene?.style.removeProperty("will-change");
    if (reset) {
      currentX = currentY = currentShift = pointerX = pointerY = 0;
      pointerActive = false;
      scene?.style.removeProperty("transform");
    }
  }
  function readScene() {
    if (!hero || !heroMedia) return;
    const heroRect = hero.getBoundingClientRect();
    progress = clamp(-heroRect.top / Math.max(1, heroRect.height), 0, 1);
    if (pointerActive && finePointer.matches) {
      const rect = heroMedia.getBoundingClientRect();
      pointerX = clamp((pointerClientX - rect.left) / Math.max(1, rect.width) * 2 - 1, -1, 1);
      pointerY = clamp((pointerClientY - rect.top) / Math.max(1, rect.height) * 2 - 1, -1, 1);
    } else { pointerX = pointerY = 0; }
    measureScene = false;
  }
  function tickScene(time) {
    frame = 0;
    if (!canMoveScene()) { stopScene(); return; }
    if (measureScene) readScene();
    const targetX = clamp(-pointerY * 4 + progress * 1.5, -6, 6);
    const targetY = clamp(pointerX * 5 - progress * 2, -6, 6);
    const targetShift = -progress * 4;
    const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16;
    previousTime = time;
    const ease = 1 - Math.exp(-elapsed / 95);
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    currentShift += (targetShift - currentShift) * ease;
    const settled = Math.abs(targetX - currentX) < 0.008 && Math.abs(targetY - currentY) < 0.008 && Math.abs(targetShift - currentShift) < 0.008;
    if (settled) { currentX = targetX; currentY = targetY; currentShift = targetShift; }
    // Only the scene moves. Child placement and depth remain in the stylesheet.
    scene.style.transform = `translate3d(0, ${currentShift.toFixed(3)}%, 0) rotateX(${currentX.toFixed(3)}deg) rotateY(${currentY.toFixed(3)}deg)`;
    if (settled) { scene.style.removeProperty("will-change"); previousTime = 0; }
    else frame = window.requestAnimationFrame(tickScene);
  }
  function requestScene() {
    if (!frame && canMoveScene()) {
      scene.style.willChange = "transform";
      frame = window.requestAnimationFrame(tickScene);
    }
  }
  heroMedia?.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || event.pointerType === "touch" || !canMoveScene()) return;
    pointerActive = true;
    pointerClientX = event.clientX;
    pointerClientY = event.clientY;
    measureScene = true;
    requestScene();
  }, { passive: true });
  heroMedia?.addEventListener("pointerleave", () => { pointerActive = false; measureScene = true; requestScene(); });
  function sceneGeometryChanged() {
    if (hero && !("IntersectionObserver" in window)) {
      const rect = hero.getBoundingClientRect();
      const visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (visible !== sceneVisible) {
        sceneVisible = visible;
        hero.classList.toggle("is-offscreen", !visible);
        syncRefractionGeometry();
      }
    }
    measureScene = true;
    requestScene();
  }
  window.addEventListener("scroll", sceneGeometryChanged, { passive: true });
  window.addEventListener("resize", sceneGeometryChanged, { passive: true });
  onMediaChange(finePointer, () => { pointerActive = false; sceneGeometryChanged(); });
  if (hero && "IntersectionObserver" in window) {
    const sceneObserver = new IntersectionObserver(([entry]) => {
      sceneVisible = entry.isIntersecting;
      hero.classList.toggle("is-offscreen", !sceneVisible);
      if (sceneVisible) sceneGeometryChanged();
      else { stopScene(); finishHeroEntrance(); }
      syncRefractionGeometry();
    }, { threshold: 0.01 });
    sceneObserver.observe(hero);
  }
  function syncMotion() {
    const paused = reducedMotion.matches;
    body.classList.toggle("motion-paused", paused);
    if (paused) { stopScene(true); finishHeroEntrance(); showAllReveals(); }
    else sceneGeometryChanged();
    syncRefractionGeometry();
  }
  onMediaChange(reducedMotion, syncMotion);
  document.addEventListener("visibilitychange", () => {
    body.classList.toggle("page-hidden", document.hidden);
    if (document.hidden) {
      stopScene();
      heroAnimations.forEach((animation) => animation.pause());
    } else {
      heroAnimations.forEach((animation) => animation.play());
      sceneGeometryChanged();
    }
    syncRefractionGeometry();
  });

  syncMotion();
  initializeReveals();
  initializeHeroRefraction();
  document.documentElement.classList.add("js");
  playHeroEntrance();
  const year = document.getElementById("year");
  if (year) year.textContent = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date());
})();
