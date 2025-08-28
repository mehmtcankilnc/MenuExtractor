const API = typeof browser !== "undefined" ? browser : chrome;

const KEY = "payloads";

async function loadPayloads() {
  const res = await new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get({ [KEY]: [] }, (out) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(out);
      });
    } catch (e) {
      reject(e);
    }
  });

  const arr = res?.[KEY] ?? [];
  return Array.isArray(arr) ? arr : [];
}

async function savePayloads(arr) {
  const toSave = Array.isArray(arr) ? arr : [];
  await new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ [KEY]: toSave }, () => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
}

const urlById = new Map();

API.downloads.onChanged.addListener((d) => {
  if (d.state?.current === "complete" || d.error?.current) {
    const url = urlById.get(d.id);
    if (url) {
      URL.revokeObjectURL(url);
      urlById.delete(d.id);
    }
  }
});

API.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SCRAPE_RESULTS") {
    (async () => {
      try {
        const now = new Date();
        const record = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: now.toISOString(),
          site: guessSiteFromUrl(sender?.tab?.url || ""),
          restaurantId: msg.restaurantId || "unknown",
          json: msg.results,
          sourceUrl: sender?.tab?.url || "",
        };

        const list = await loadPayloads();
        list.unshift(record);
        if (list.length > 10) list.length = 10;
        await savePayloads(list);

        try {
          await API.runtime.sendMessage({ type: "NEW_PAYLOAD", id: record.id });
        } catch {}

        sendResponse({ ok: true, id: record.id });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg?.type === "LIST_PAYLOADS") {
    (async () => {
      try {
        const list = await loadPayloads();
        sendResponse({
          ok: true,
          items: list.map((x) => ({
            id: x.id,
            createdAt: x.createdAt,
            site: x.site,
            restaurantId: x.restaurantId,
            sourceUrl: x.sourceUrl,
          })),
        });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg?.type === "GET_PAYLOAD") {
    (async () => {
      try {
        const list = await loadPayloads();
        const item = list.find((x) => x.id === msg.id);
        if (!item) {
          sendResponse({ ok: false, error: "not_found" });
          return;
        }
        sendResponse({ ok: true, item });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg?.type === "DOWNLOAD_STORED") {
    (async () => {
      try {
        const list = await loadPayloads();
        const item = list.find((x) => x.id === msg.id);
        if (!item) {
          sendResponse({ ok: false, error: "not_found" });
          return;
        }

        const filename = buildFilename(item.site, item.restaurantId);

        const dataUrl =
          "data:application/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(item.json, null, 2));

        const id = await API.downloads.download({
          url: dataUrl,
          filename,
          saveAs: true,
        });

        sendResponse({ ok: true, id });
      } catch (e) {
        sendResponse({ ok: false, error: e?.message || String(e) });
      }
    })();
    return true;
  }

  if (msg?.type === "DELETE_PAYLOAD") {
    (async () => {
      try {
        const list = await loadPayloads();
        const next = list.filter((x) => x.id !== msg.id);
        await savePayloads(next);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg?.type === "CLEAR_PAYLOADS") {
    (async () => {
      try {
        await savePayloads([]);
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
});

function guessSiteFromUrl(u) {
  try {
    const url = new URL(u);
    if (/getir\.com\/yemek\/restoran/i.test(u)) return "getir";
    if (/tgoyemek\.com\/restoranlar/i.test(u)) return "trendyol";
    if (/yemeksepeti\.com\/restaurant|tr\.fd-api\.com/i.test(u))
      return "yemeksepeti";
    if (/migros\.com\.tr/i.test(u)) return "migros";
    return url.hostname;
  } catch {
    return "unknown";
  }
}

function buildFilename(site, restaurantId) {
  const safe = (s) =>
    (s || "unknown")
      .toString()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
      .slice(0, 80);
  return `menu-${safe(site)}-${safe(restaurantId)}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
}
