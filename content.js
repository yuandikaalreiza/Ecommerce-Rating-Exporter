(() => {
  const COLUMNS = [
    "product_name", "product_variation", "buyer_id", "star",
    "review_date", "order_id", "review_message", "seller_response"
  ];
  const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/;
  const ORDER_ID_PATTERN = /^[A-Za-z0-9]{10,}$/;
  const state = { phase: "idle", reviewCount: 0, pageCount: 0, message: "" };
  let cancelRequested = false;
  let pauseResolver = null;

  function snapshot() { return { ...state }; }
  function publish() {
    chrome.runtime.sendMessage({ type: "status_update", status: snapshot() }).catch(() => {});
  }
  function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function exactText(element, text) { return clean(element.textContent) === text; }

  function getOrderNodes(scope = document) {
    return [...scope.querySelectorAll("div[id]")].filter((element) => ORDER_ID_PATTERN.test(clean(element.textContent)) && element.id === clean(element.textContent));
  }

  function getCard(orderNode) {
    let node = orderNode.parentElement;
    while (node && node !== document.body) {
      if (getOrderNodes(node).length === 1 && node.querySelector(".eds-react-rate")) return node;
      node = node.parentElement;
    }
    return null;
  }

  function directTextBefore(node) {
    let sibling = node.previousElementSibling;
    while (sibling) {
      const text = clean(sibling.textContent);
      if (text && text !== "Order ID") return text;
      sibling = sibling.previousElementSibling;
    }
    return "";
  }

  function getBuyerId(card, orderNode) {
    const orderGroup = orderNode.parentElement;
    const header = orderGroup && orderGroup.parentElement;
    const preceding = header && directTextBefore(orderGroup);
    if (preceding) return preceding;

    const candidates = [...(header || card).querySelectorAll("span, div")]
      .map((element) => clean(element.textContent))
      .filter((text) => text && text !== "Order ID" && text !== clean(orderNode.textContent) && !text.includes("Order ID"));
    return candidates.sort((a, b) => a.length - b.length)[0] || "";
  }

  function firstByText(scope, predicate) {
    return [...scope.querySelectorAll("div, p, span")].find((element) => predicate(clean(element.textContent)));
  }

  function getProduct(card) {
    const variationNode = firstByText(card, (text) => /^(Variation|Variasi):/i.test(text));
    const variation = variationNode ? clean(variationNode.textContent).replace(/^(Variation|Variasi):\s*/i, "") : "";
    const productRoot = variationNode
      ? variationNode.parentElement
      : card.querySelector("div.flex.divide-x")?.firstElementChild || card.querySelector("img[alt='product']")?.parentElement;
    const nameNode = productRoot && ([...productRoot.querySelectorAll("div")].find((element) => element.classList.contains("font-medium") && clean(element.textContent)) || productRoot.querySelector("[class*='font-medium']"));
    return { product_name: nameNode ? clean(nameNode.textContent) : "", product_variation: variation };
  }

  function getStar(card) {
    const fronts = [...card.querySelectorAll(".eds-react-rate-star__front")];
    if (!fronts.length) return "";
    const total = fronts.reduce((sum, element) => sum + (parseFloat(element.style.width) || 0), 0);
    return Math.max(0, Math.min(5, Math.round(total / 100)));
  }

  function getDateNode(card) {
    return firstByText(card, (text) => DATE_PATTERN.test(text));
  }

  function getReviewMessage(card, dateNode) {
    if (!dateNode || !dateNode.parentElement) return "";
    const block = dateNode.parentElement;
    const parts = [];
    for (const child of block.children) {
      if (child === dateNode) break;
      if (child.matches(".eds-react-rate, ul, img, video")) continue;
      const text = clean(child.textContent).replace(/\s*More$/, "");
      if (text && text !== "Seller Response:") parts.push(text);
    }
    const message = parts.join("\n");
    // Shopee Indonesia may expose only a visual truncation such as
    // "Bagus...Lainnya" instead of the full review. Do not export that
    // incomplete placeholder as though it were a real review message.
    if (/(?:\.{3}|…)\s*Lainnya$/i.test(message) || /^Lainnya$/i.test(message)) return "";
    return message;
  }

  function getSellerResponse(card) {
    const label = firstByText(card, (text) => ["Seller Response:", "Tanggapan Penjual:", "Balasan Penjual:"].includes(text));
    if (!label) return "";
    return label.nextElementSibling ? clean(label.nextElementSibling.textContent) : "";
  }

  function extractCurrentPage() {
    const records = [];
    const seen = new Set();
    getOrderNodes().forEach((orderNode) => {
      const card = getCard(orderNode);
      const order_id = clean(orderNode.textContent);
      if (!card || seen.has(order_id)) return;
      seen.add(order_id);
      const dateNode = getDateNode(card);
      const product = getProduct(card);
      records.push({
        ...product,
        buyer_id: getBuyerId(card, orderNode),
        star: getStar(card),
        review_date: dateNode ? clean(dateNode.textContent) : "",
        order_id,
        review_message: getReviewMessage(card, dateNode),
        seller_response: getSellerResponse(card)
      });
    });
    return records;
  }

  async function expandReviewMessages() {
    let expanded = 0;
    while (expanded < 60) {
      const control = [...document.querySelectorAll("button, a, span")]
        .find((element) => /^(More|Lainnya)$/i.test(clean(element.textContent)) && (() => {
          let node = element.parentElement;
          while (node && node !== document.body) {
            if (getOrderNodes(node).length === 1 && node.querySelector(".eds-react-rate")) return true;
            node = node.parentElement;
          }
          return false;
        })());
      if (!control) break;
      let node = control.parentElement;
      while (node && node !== document.body) {
        if (getOrderNodes(node).length === 1 && node.querySelector(".eds-react-rate")) {
          control.click();
          expanded += 1;
          break;
        }
        node = node.parentElement;
      }
      await sleep(120);
      // Clicking did not expand this review, so leave its truncated value blank
      // rather than repeatedly activating the same control.
      if (control.isConnected && /^(More|Lainnya)$/i.test(clean(control.textContent))) break;
    }
  }

  function pageSignature() {
    return getOrderNodes().map((element) => clean(element.textContent)).join("|");
  }

  function nextButton() {
    const button = document.querySelector("[data-testid='pagination'] .eds-react-pagination-pager__button-next");
    if (!button || button.disabled || button.classList.contains("disabled") || button.getAttribute("aria-disabled") === "true") return null;
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
      if (pageSignature() && pageSignature() !== previous) return true;
      await sleep(250);
    }
    return false;
  }
  function collectionFilename() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `shopee_shop_rating_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;
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
        await expandReviewMessages();
        const pageRecords = extractCurrentPage();
        if (!pageRecords.length) throw new Error("No review cards found. Reload the Shop Rating page and try again.");
        pageRecords.forEach((record) => records.set(record.order_id, record));
        state.reviewCount = records.size;
        state.pageCount += 1;
        publish();

        const previous = pageSignature();
        const next = nextButton();
        if (!next) break;
        next.click();
        const changed = await waitForNewPage(previous);
        if (!changed) throw new Error("The next review page did not load. Please retry from the Shop Rating page.");
      }
      if (cancelRequested) {
        state.phase = "idle";
        state.message = "Export stopped.";
      } else {
        const fileUrl = ShopeeXlsx.createUrl(COLUMNS, [...records.values()]);
        const result = await chrome.runtime.sendMessage({ type: "download_xlsx", url: fileUrl, filename: collectionFilename() });
        setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
        if (!result || result.error) throw new Error(result?.error || "Chrome could not start the XLSX download.");
        state.phase = "done";
      }
    } catch (error) {
      state.phase = "error";
      state.message = error.message || "The export stopped unexpectedly.";
    }
    publish();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;
    if (message.type === "get_status") sendResponse(snapshot());
    if (message.type === "start") {
      if (state.phase === "idle" || state.phase === "done" || state.phase === "error") collect();
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
