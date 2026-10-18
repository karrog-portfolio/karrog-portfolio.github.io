(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("layout") !== "edit") return;
  const stage = document.querySelector(".hero-stage");
  const panel = document.getElementById("layout-editor");
  if (!stage || !panel) return;
  const definitions = [
    ["kar", "KAR", ".hero-name .name-start"],
    ["rog", "ROG", ".hero-name .name-end"],
    ["avatar", "Avatar", ".avatar-panel"],
    ["restock", "Video Restock", ".hero-short-back"],
    ["rainbow", "Video Rainbow", ".hero-short-front"],
    ["intro", "Mô tả và nút", ".hero-intro"]
  ];
  const items = definitions.map(([id, label, selector]) => ({ id, label, node: stage.querySelector(selector) })).filter(item => item.node);
  const select = document.getElementById("layout-target");
  const output = document.getElementById("layout-output");
  const status = document.getElementById("layout-status");
  const toggle = document.getElementById("layout-edit-toggle");
  const key = "karrog-hero-layout-draft-v2";
  const profile = () => innerWidth >= 781 ? "desktop" : innerWidth >= 581 ? "tablet" : "mobile";
  let drafts = {};
  try { drafts = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* Local drafts are optional. */ }
  if (!drafts || typeof drafts !== "object" || Array.isArray(drafts)) drafts = {};
  let activeProfile = profile();
  let selected = items[0];
  let editing = true;
  let drag = null;
  let storageAvailable = true;
  const clean = value => Number.isFinite(Number(value)) ? Math.max(-200, Math.min(200, Number(value))) : 0;
  const round = value => Math.round(value * 10000) / 10000;
  const offset = item => {
    const entry = drafts[activeProfile]?.[item.id];
    return { x: clean(entry?.x), y: clean(entry?.y) };
  };
  function apply(item, value = offset(item)) {
    item.node.style.setProperty("--layout-x", `${stage.clientWidth * value.x / 100}px`);
    item.node.style.setProperty("--layout-y", `${stage.clientHeight * value.y / 100}px`);
    const duplicate = item.id === "kar" ? stage.querySelector(".hero-refraction .name-start") : item.id === "rog" ? stage.querySelector(".hero-refraction .name-end") : null;
    if (duplicate) {
      duplicate.classList.add("layout-refraction-movable");
      duplicate.style.setProperty("--layout-x", `${stage.clientWidth * value.x / 100}px`);
      duplicate.style.setProperty("--layout-y", `${stage.clientHeight * value.y / 100}px`);
    }
  }
  function applyAll() { items.forEach(item => apply(item)); }
  function announce(message) { status.textContent = message; }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(drafts)); }
    catch { storageAvailable = false; }
  }
  function save(item, x, y) {
    drafts[activeProfile] ||= {};
    drafts[activeProfile][item.id] = { x: round(clean(x)), y: round(clean(y)) };
    apply(item);
    output.hidden = true;
  }
  function choose(item) {
    selected = item;
    select.value = item.id;
    items.forEach(candidate => candidate.node.classList.toggle("layout-selected", editing && candidate === item));
  }
  function selectedPosition() {
    const value = offset(selected);
    return `${selected.label}: ngang ${value.x.toFixed(2)}%, dọc ${value.y.toFixed(2)}%. ${storageAvailable ? "Đã lưu nháp trên trình duyệt." : "Hãy xuất mã để giữ bố cục."}`;
  }
  function setEditing(value) {
    editing = value;
    document.body.classList.toggle("layout-editing", value);
    toggle.textContent = value ? "Xem thử" : "Tiếp tục chỉnh";
    toggle.setAttribute("aria-pressed", String(value));
    items.forEach(item => {
      item.node.classList.toggle("layout-selected", value && item === selected);
      if (value) item.node.setAttribute("tabindex", "0");
      else if (item.originalTab === null) item.node.removeAttribute("tabindex");
      else item.node.setAttribute("tabindex", item.originalTab);
    });
    announce(value ? "Kéo phần tử hoặc chọn rồi dùng phím mũi tên. Shift để di chuyển nhanh." : "Đang xem bản nháp. Bấm Tiếp tục chỉnh để kéo lại.");
  }
  function exportText() {
    const bounds = stage.getBoundingClientRect();
    return JSON.stringify({
      schema: "karrog-hero-layout/v1",
      base: "creator-pixel-layout-31",
      profile: activeProfile,
      viewport: { width: innerWidth, height: innerHeight },
      stage: { width: stage.clientWidth, height: stage.clientHeight },
      elements: Object.fromEntries(items.map(item => {
        const rect = item.node.getBoundingClientRect();
        return [item.id, {
          offsetPercent: offset(item),
          centerPercent: { x: round((rect.left + rect.width / 2 - bounds.left) / bounds.width * 100), y: round((rect.top + rect.height / 2 - bounds.top) / bounds.height * 100) }
        }];
      }))
    }, null, 2);
  }
  function showOutput(text) {
    output.value = text;
    output.hidden = false;
    output.focus();
    output.select();
  }
  items.forEach(item => {
    item.originalTab = item.node.getAttribute("tabindex");
    item.node.classList.add("layout-movable");
    item.node.dataset.layoutLabel = item.label;
    item.node.addEventListener("focus", () => { if (editing) choose(item); });
    item.node.addEventListener("dragstart", event => event.preventDefault());
    item.node.addEventListener("pointerdown", event => {
      if (!editing || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      choose(item);
      item.node.focus({ preventScroll: true });
      const value = offset(item);
      const rect = item.node.getBoundingClientRect();
      // Measure the actual projected axes so dragging preserves the cards' 3D tilt.
      apply(item, { x: value.x + 100 / stage.clientWidth, y: value.y });
      const xRect = item.node.getBoundingClientRect();
      apply(item, { x: value.x, y: value.y + 100 / stage.clientHeight });
      const yRect = item.node.getBoundingClientRect();
      apply(item, value);
      const a = xRect.left + xRect.width / 2 - rect.left - rect.width / 2;
      const b = xRect.top + xRect.height / 2 - rect.top - rect.height / 2;
      const c = yRect.left + yRect.width / 2 - rect.left - rect.width / 2;
      const d = yRect.top + yRect.height / 2 - rect.top - rect.height / 2;
      const determinant = a * d - b * c;
      drag = { item, id: event.pointerId, x: event.clientX, y: event.clientY, value, a, b, c, d, determinant };
      item.node.setPointerCapture(event.pointerId);
    });
    item.node.addEventListener("pointermove", event => {
      if (!drag || drag.item !== item || drag.id !== event.pointerId) return;
      event.preventDefault();
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      const valid = Number.isFinite(drag.determinant) && Math.abs(drag.determinant) > 0.01;
      const localX = valid ? (dx * drag.d - dy * drag.c) / drag.determinant : dx;
      const localY = valid ? (drag.a * dy - drag.b * dx) / drag.determinant : dy;
      save(item, drag.value.x + localX / stage.clientWidth * 100, drag.value.y + localY / stage.clientHeight * 100);
    });
    const finishDrag = event => {
      if (!drag || drag.item !== item || drag.id !== event.pointerId) return;
      drag = null;
      persist();
      announce(selectedPosition());
    };
    item.node.addEventListener("pointerup", finishDrag);
    item.node.addEventListener("pointercancel", finishDrag);
    item.node.addEventListener("lostpointercapture", finishDrag);
  });
  // Prevent the portfolio's links/player handler from firing during layout editing.
  window.addEventListener("click", event => {
    if (!editing || !items.some(item => item.node.contains(event.target))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  select.addEventListener("change", () => {
    const item = items.find(candidate => candidate.id === select.value);
    if (item) { choose(item); item.node.focus({ preventScroll: true }); announce(selectedPosition()); }
  });
  window.addEventListener("keydown", event => {
    if (!editing || event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    if (!stage.contains(event.target) && !panel.contains(event.target)) return;
    event.preventDefault();
    const value = offset(selected);
    const step = event.shiftKey ? 10 : 1;
    save(selected, value.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0) / stage.clientWidth * 100,
      value.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) / stage.clientHeight * 100);
    persist();
    announce(selectedPosition());
  });
  toggle.addEventListener("click", () => setEditing(!editing));
  document.getElementById("layout-reset").addEventListener("click", () => { save(selected, 0, 0); persist(); announce(`Đã đặt lại ${selected.label}.`); });
  document.getElementById("layout-reset-all").addEventListener("click", () => { drafts[activeProfile] = {}; applyAll(); persist(); output.hidden = true; announce("Đã đặt lại bố cục ở kích thước màn hình này."); });
  document.getElementById("layout-copy").addEventListener("click", async () => {
    const text = exportText();
    try { await navigator.clipboard.writeText(text); announce("Đã sao chép. Dán mã này vào cuộc trò chuyện để mình áp dụng."); }
    catch { showOutput(text); announce("Mã đã được chọn bên dưới. Nhấn Ctrl+C để sao chép rồi gửi vào cuộc trò chuyện."); }
  });
  document.getElementById("layout-download").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([exportText()], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `karrog-layout-${activeProfile}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Đã tải bố cục. Bạn có thể gửi file JSON cho mình.");
  });
  document.getElementById("layout-close").addEventListener("click", () => {
    const url = new URL(location.href);
    url.searchParams.delete("layout");
    location.assign(url.href);
  });
  const collapse = document.createElement("button");
  collapse.id = "layout-collapse";
  collapse.type = "button";
  collapse.textContent = "−";
  collapse.setAttribute("aria-label", "Thu gọn bảng chỉnh bố cục");
  collapse.setAttribute("aria-expanded", "true");
  panel.querySelector(".layout-editor-header").insertBefore(collapse, document.getElementById("layout-close"));
  collapse.addEventListener("click", () => {
    const collapsed = panel.classList.toggle("is-collapsed");
    collapse.textContent = collapsed ? "+" : "−";
    collapse.setAttribute("aria-expanded", String(!collapsed));
    collapse.setAttribute("aria-label", collapsed ? "Mở bảng chỉnh bố cục" : "Thu gọn bảng chỉnh bố cục");
  });
  window.addEventListener("resize", () => {
    if (drag) persist();
    drag = null;
    activeProfile = profile();
    applyAll();
    output.hidden = true;
    announce("Đã chuyển bản nháp theo kích thước màn hình hiện tại.");
  });
  document.body.classList.add("layout-editor-open");
  panel.hidden = false;
  applyAll();
  setEditing(true);
  choose(selected);
})();
