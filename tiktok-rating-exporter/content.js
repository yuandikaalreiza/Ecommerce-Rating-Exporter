(() => {
  const COLUMNS = [
    "product_name", "product_variation", "buyer_id", "star",
    "review_date", "order_id", "review_message", "seller_response"
  ];
  const state = { phase: "idle", reviewCount: 0, pageCount: 0, message: "" };
  let cancelRequested = false;
  let pauseResolver = null;

  function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function snapshot() { return { ...state }; }
  function publish() { chrome.runtime.sendMessage({ type: "status_update", status: snapshot() }).catch(() => {}); }
  function text(card, selector) { return clean(card.querySelector(selector)?.textContent); }

  function reviewDateFromCard(card) {
    const value = text(card, "[class*='_reviewTime_']");
    // TikTok may append an edit indicator, for example:
    // "24 Juli 2026|Diubah 5 hari yang lalu". The report's review_date
    // column contains only the original review date.
    return value.replace(/\s*\|?\s*(Diubah|Edited)\s+.*$/i, "").trim();
  }

  function orderIdFromCard(card) {
    const value = text(card, "[class*='_productItemInfoOrderIdText_']");
    return value.replace(/^(ID Pesanan|Order ID)\s*:\s*/i, "");
  }

  function extractCurrentPage() {
    const records = [];
    const seen = new Set();
    document.querySelectorAll("[class*='_ratingListItem_']").forEach((card) => {
      const order_id = orderIdFromCard(card);
      if (!/^\d{10,}$/.test(order_id) || seen.has(order_id)) return;
      seen.add(order_id);
      records.push({
        product_name: text(card, "[class*='_productItemInfoName_']"),
        product_variation: text(card, "[class*='_productItemInfoSku_']"),
        buyer_id: text(card, "[class*='_userNameText_']"),
        star: card.querySelectorAll("svg[class*='_activeStar_']").length,
        review_date: reviewDateFromCard(card),
        // XLSX writer uses inline strings for every value; never coerce this
        // 18-digit TikTok order ID to a JavaScript or Excel number.
        order_id,
        review_message: text(card, "[class*='_reviewText_']"),
        seller_response: text(card, "[class*='_replyText_']")
      });
    });
    return records;
  }

  function pageSignature() {
    return [...document.querySelectorAll("[class*='_productItemInfoOrderIdText_']")]
      .map((element) => clean(element.textContent)).join("|");
  }
  function nextButton() {
    const button = document.querySelector("[data-tid='m4b_pagination'] .core-pagination-item-next");
    if (!button || button.classList.contains("core-pagination-item-disabled") || button.getAttribute("aria-disabled") === "true") return null;
    return button;
  }
  function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
  async function waitWhilePaused() {
    while (state.phase === "paused" && !cancelRequested) {
      await new Promise((resolve) => { pauseResolver = resolve; });
      pauseResolver = null;
    }
  }
  async function waitForNewPage(previous) {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      if (cancelRequested) return false;
      const current = pageSignature();
      if (current && current !== previous) return true;
      await sleep(250);
    }
    return false;
  }
  function filename() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `tiktok_product_rating_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
  }

  async function collect() {
    const records = new Map();
    state.phase = "collecting";
    state.reviewCount = 0;
    state.pageCount = 0;
    state.message = "";
    cancelRequested = false;
    publish();
    try {
      while (!cancelRequested) {
        await waitWhilePaused();
        if (cancelRequested) break;
        const pageRecords = extractCurrentPage();
        if (!pageRecords.length) throw new Error("Rating tidak ditemukan. Muat ulang halaman Rating Produk dan coba lagi. / No rating cards found. Reload the Product Rating page and try again.");
        pageRecords.forEach((record) => records.set(record.order_id, record));
        state.reviewCount = records.size;
        state.pageCount += 1;
        publish();
        const previous = pageSignature();
        const next = nextButton();
        if (!next) break;
        next.click();
        if (!await waitForNewPage(previous)) throw new Error("Halaman rating berikutnya tidak dimuat. Silakan coba lagi dari halaman Rating Produk. / The next rating page did not load. Please retry from the Product Rating page.");
      }
      if (cancelRequested) {
        state.phase = "idle";
        state.message = "Ekspor dihentikan. / Export stopped.";
      } else {
        const fileUrl = RatingXlsx.createUrl(COLUMNS, [...records.values()]);
        const result = await chrome.runtime.sendMessage({ type: "download_xlsx", url: fileUrl, filename: filename() });
        setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
        if (!result || result.error) throw new Error(result?.error || "Chrome tidak dapat memulai unduhan XLSX. / Chrome could not start the XLSX download.");
        state.phase = "done";
      }
    } catch (error) {
      state.phase = "error";
      state.message = error.message || "Ekspor berhenti tanpa diduga. / The export stopped unexpectedly.";
    }
    publish();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message?.type) return;
    if (message.type === "get_status") sendResponse(snapshot());
    if (message.type === "start") {
      if (["idle", "done", "error"].includes(state.phase)) collect();
      sendResponse(snapshot());
    }
    if (message.type === "toggle_pause") {
      if (state.phase === "collecting") state.phase = "paused";
      else if (state.phase === "paused") { state.phase = "collecting"; if (pauseResolver) pauseResolver(); }
      publish();
      sendResponse(snapshot());
    }
    if (message.type === "stop") {
      cancelRequested = true;
      if (pauseResolver) pauseResolver();
      sendResponse(snapshot());
    }
  });
})();
