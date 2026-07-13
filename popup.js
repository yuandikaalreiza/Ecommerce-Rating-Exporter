const TARGET_PREFIX = "https://seller.shopee.co.id/portal/settings/shop/rating";

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

async function send(type) {
  return chrome.tabs.sendMessage(tabId, { type });
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab && tab.id;
  if (!tab || !tab.url || !tab.url.startsWith(TARGET_PREFIX)) {
    setStatus("Buka Shopee Seller Centre → Penilaian Toko terlebih dahulu. / Open Shopee Seller Centre → Shop Rating first.", true);
    ui.start.disabled = true;
    return;
  }

  try {
    const status = await send("get_status");
    renderStatus(status);
  } catch (_) {
    setStatus("Muat ulang halaman Penilaian Toko, lalu buka ekstensi ini lagi. / Reload the Shop Rating page, then open this extension again.", true);
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
    setStatus("Siap. Filter Shopee saat ini akan tetap digunakan. / Ready. Shopee's current filters will be kept.");
  }
  setButtons(status);
}

ui.start.addEventListener("click", async () => {
  try { renderStatus(await send("start")); }
  catch (_) { setStatus("Tidak dapat memulai. Muat ulang halaman Penilaian Toko dan coba lagi. / Could not start. Reload the Shop Rating page and try again.", true); }
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
