const TIKTOK_RATING_URL = /^https:\/\/(seller-id\.tiktok\.com|seller\.tiktok\.com)\/product\/rating/;

const ui = {
  status: document.querySelector("#status"),
  start: document.querySelector("#start"),
  pause: document.querySelector("#pause"),
  stop: document.querySelector("#stop")
};

let tabId;

function setStatus(message, isError = false) {
  ui.status.textContent = message;
  ui.status.classList.toggle("error", isError);
}

function setButtons(status) {
  const collecting = Boolean(status && status.phase === "collecting");
  const paused = Boolean(status && status.phase === "paused");
  ui.start.disabled = collecting || paused;
  ui.pause.disabled = !(collecting || paused);
  ui.stop.disabled = !(collecting || paused);
  ui.pause.innerHTML = paused ? "Lanjutkan<br><small>Resume</small>" : "Jeda<br><small>Pause</small>";
}

async function send(type) { return chrome.tabs.sendMessage(tabId, { type }); }

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  if (!tab || !tab.url || !TIKTOK_RATING_URL.test(tab.url)) {
    setStatus("Buka TikTok Shop Seller Center → Rating Produk terlebih dahulu. / Open TikTok Shop Seller Center → Product Rating first.", true);
    ui.start.disabled = true;
    return;
  }
  try { renderStatus(await send("get_status")); }
  catch (_) {
    setStatus("Muat ulang halaman Rating Produk, lalu buka ekstensi ini lagi. / Reload the Product Rating page, then open this extension again.", true);
    ui.start.disabled = true;
  }
}

function renderStatus(status) {
  if (!status) return;
  if (status.phase === "collecting" || status.phase === "paused") {
    const verb = status.phase === "paused" ? "Dijeda / Paused" : "Mengumpulkan / Collecting";
    setStatus(`${verb}: ${status.reviewCount} ulasan / reviews dari ${status.pageCount} halaman / page(s).`);
  } else if (status.phase === "done") {
    setStatus(`Ekspor selesai / Export complete: ${status.reviewCount} ulasan / reviews.`);
  } else if (status.phase === "error") {
    setStatus(status.message || "Ekspor berhenti karena halaman berubah. / The export stopped because the page changed.", true);
  } else {
    setStatus("Siap. Filter TikTok saat ini akan tetap digunakan. / Ready. TikTok's current filters will be kept.");
  }
  setButtons(status);
}

ui.start.addEventListener("click", async () => {
  try { renderStatus(await send("start")); }
  catch (_) { setStatus("Tidak dapat memulai. Muat ulang halaman Rating Produk dan coba lagi. / Could not start. Reload the Product Rating page and try again.", true); }
});
ui.pause.addEventListener("click", async () => {
  try { renderStatus(await send("toggle_pause")); }
  catch (_) { setStatus("Tidak dapat memperbarui ekspor. / Could not update the export.", true); }
});
ui.stop.addEventListener("click", async () => {
  try { renderStatus(await send("stop")); }
  catch (_) { setStatus("Tidak dapat menghentikan ekspor. / Could not stop the export.", true); }
});
chrome.runtime.onMessage.addListener((message) => {
  if (message && message.type === "status_update") renderStatus(message.status);
});
refresh();
