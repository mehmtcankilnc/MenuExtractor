let RUNNING = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitFor = async (fnOrSel, { timeout = 8000, interval = 120 } = {}) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v =
      typeof fnOrSel === "function"
        ? fnOrSel()
        : document.querySelector(fnOrSel);
    if (v) return v;
    await sleep(interval);
  }
  return null;
};

function getRestaurantId() {
  try {
    const { hostname, pathname, search } = window.location;

    const params = new URLSearchParams(search);
    const qId = params.get("restaurantId");
    if (qId) return qId;

    if (
      /yemeksepeti\.com$/i.test(hostname) &&
      pathname.includes("/restaurant/")
    ) {
      const m = pathname.match(/\/restaurant\/([^/]+)/);
      if (m) return m[1];
    }

    if (
      /tgoyemek\.com$/i.test(hostname) &&
      pathname.includes("/restoranlar/")
    ) {
      const m = pathname.match(/\/restoranlar\/(\d+)/);
      if (m) return m[1];
    }

    if (/getir\.com$/i.test(hostname) && pathname.includes("/yemek/restoran")) {
      const tail = pathname.split("/yemek/restoran")[1] || "";
      const seg = tail.split("/").filter(Boolean)[0] || "";
      if (seg) return decodeURIComponent(seg);
    }

    if (/migros\.com\.tr$/i.test(hostname) && pathname.includes("/yemek/")) {
      const m = pathname.match(/-st-([a-zA-Z0-9]+)/);
      if (m) return m[1];
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

const isVisible = (el) =>
  !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
const txt = (el) => (el?.textContent || "").trim();
const attr = (el, a) => el?.getAttribute(a) || "";
const q = (root, sel) => (sel ? root.querySelector(sel) : null);
const qa = (root, sel) => (sel ? [...root.querySelectorAll(sel)] : []);

function overlaySet(msg) {
  let box = document.getElementById("__scrape_overlay");
  if (!box) {
    box = document.createElement("div");
    box.id = "__scrape_overlay";
    Object.assign(box.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: 999999,
      background: "rgba(10,10,10,.85)",
      color: "#fff",
      padding: "8px 10px",
      borderRadius: "8px",
      font: "12px/1.4 -apple-system,Segoe UI,Roboto,Arial",
    });
    document.body.appendChild(box);
  }
  box.textContent = msg;
}

async function autoScrollPage(cfg) {
  if (!cfg.pageAutoScroll) return;
  let lastH = 0;
  for (let i = 0; i < (cfg.pageAutoScrollMaxPass ?? 6); i++) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
    await sleep(cfg.pageAutoScrollPause ?? 350);
    const h = document.body.scrollHeight;
    if (h <= lastH) break;
    lastH = h;
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

async function clickAndWait(el, { afterClickDelay = 200 } = {}) {
  el.scrollIntoView({ behavior: "instant", block: "center" });
  await sleep(40);
  el.click();
  await sleep(afterClickDelay);
}

async function openModal(card, cfg) {
  const clickTarget =
    (cfg.productItemClickSelector && q(card, cfg.productItemClickSelector)) ||
    card;

  await clickAndWait(clickTarget, {
    afterClickDelay: cfg.afterProductClickDelay ?? 0,
  });
  return await waitFor(cfg.modalSelector, {
    timeout: cfg.modalWaitTimeout ?? 12000,
  });
}

async function closeModal(modal, cfg) {
  const closeBtn =
    q(modal, cfg.closeSelector) || q(document, cfg.closeSelector);
  if (closeBtn) closeBtn.click();
  else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

  const t0 = Date.now();
  const timeout = cfg.modalCloseTimeout ?? 6000;
  while (Date.now() - t0 < timeout) {
    if (!document.querySelector(cfg.modalSelector)) return true;
    await sleep(120);
  }
  return false;
}

function normPrice(s) {
  if (!s) return { text: "", value: null, currency: null };
  const text = s.replace(/\s+/g, " ").trim();
  const m = text.match(/([\d.,]+)\s*([A-Za-z₺$€£]*)/);
  return {
    text,
    value: m ? parseFloat(m[1].replace(/\./g, "").replace(",", ".")) : null,
    currency: m ? m[2] || null : null,
  };
}

function readField(root, sel) {
  if (!sel) return "";
  const el = q(root, sel);
  return txt(el);
}
function readAttr(root, sel, attribute) {
  if (!sel) return "";
  const el = q(root, sel);
  return attr(el, attribute);
}
function readList(root, sel) {
  if (!sel) return [];
  return qa(root, sel)
    .map((n) => txt(n))
    .filter(Boolean);
}

async function parseOptionGroup(groupEl, cfg) {
  const f = cfg.modalFields.optionFields;
  const containerEl = document.querySelector(cfg.modalFields.container);
  const label = txt(q(groupEl, f.optionTitle));
  const required =
    !!q(groupEl, f.isRequired) ||
    txt(groupEl, f.isRequiredYS).trim() === "Zorunlu";

  let requiredOpts = [];
  if (required) {
    const reqDdEls = [...groupEl.querySelectorAll(f.optionReqDropdowns)];
    if (reqDdEls.length) {
      requiredOpts = reqDdEls
        .map((reqDd) => {
          const parts = (txt(reqDd) || "").split("+");
          const l = (parts[0] || "").trim();
          const p = (parts[1] || "").trim() || null;

          return { label: l, price: p };
        })
        .filter((x) => x.label !== "");
    }
  }

  const showMoreBtn = q(groupEl, f.optionShowMoreBtn);
  if (showMoreBtn) {
    const beforeCnt = qa(groupEl, f.optionSelectables).length;
    showMoreBtn.click();
    await waitFor(() => qa(groupEl, f.optionSelectables).length > beforeCnt, {
      timeout: 1000,
      interval: 50,
    });
  }

  let options = [];
  const selectEls = [
    ...qa(groupEl, f.optionGroupSelect),
    ...qa(groupEl, f.optionSelectables),
    ...qa(groupEl, f.optionChoices),
  ];
  if (selectEls.length) {
    options = selectEls
      .map((s) => {
        const labelEl = q(s, f.optionButtonLabel);
        const priceEl = q(s, f.optionButtonPrice);

        let label = (txt(labelEl) || "").trim();
        let price = priceEl ? (txt(priceEl) || "").trim() : null;

        if (price && label.includes(price)) {
          label = label.replace(price, "").trim();
        }

        if (!label) return null;
        return { label, price };
      })
      .filter(Boolean);

    const seen = new Set();
    options = options.filter((o) => {
      const key = `${o.label}|${o.price ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const mgChoiceEls = qa(groupEl, f.optionChoicesMG);
  if (mgChoiceEls.length) {
    options = mgChoiceEls.map((mgEl) => {
      const label = txt(mgEl).trim();

      return { label };
    });
  }

  const dropdown = q(groupEl, f.optionDropdown);
  if (dropdown) {
    dropdown.click();
    await waitFor(() => (document.querySelectorAll(f.optionElement) || []).length > 0, { timeout: 1500, interval: 60 });

    const els = [...document.querySelectorAll(f.optionElement)];
    options = els.map((el) => {
      const labelEl = q(el, f.optionDropdownLabel);
      const priceEl = q(el, f.optionDropdownPrice);

      const label = (txt(labelEl) || "").trim();
      const price = priceEl ? (txt(priceEl) || "").trim() : null;

      return { label, price };
    });
  }

  let altOptionGroups = [];
  const altOptionEls = (() => {
    const els = [];

    (qa(groupEl, f.altOptions) || []).forEach((e) => els.push(e));

    const GROUP_ROOT_SELECTOR =
      cfg.modalFields.optionGroupsSelector || ".flex.flex-col.gap-3";
    let sib = groupEl.nextElementSibling;
    while (sib) {
      if (sib.matches(GROUP_ROOT_SELECTOR)) break;

      if (sib.matches(f.altOptions)) els.push(sib);

      sib = sib.nextElementSibling;
    }

    return Array.from(new Set(els));
  })();

  if (altOptionEls.length) {
    altOptionGroups = (
      await Promise.all(
        altOptionEls.map(async (altOption) => {
          const groupEls = Array.from(altOption.children);

          const selectablesByTitle = new Map();
          const dropdownsAcc = [];

          for (const group of groupEls) {
            const title = (txt(q(group, f.altOptionTitle)) || "").trim();

            const selArr = (qa(group, f.altOptionSelectables) || [])
              .map((el) => ({
                label: (txt(el) || "").trim(),
              }))
              .filter((x) => x.label);

            if (selArr.length) {
              const key = title || "__untitled__";
              const list = selectablesByTitle.get(key) || [];
              list.push(...selArr);
              selectablesByTitle.set(key, list);
            }

            const ddRoots = group.matches(f.altOptionDropdownGroups)
              ? [group]
              : qa(group, f.altOptionDropdownGroups) || [];

            for (const dd of ddRoots) {
              const isRequired = !!q(dd, f.altOptionIsRequired);
              const dropdownTitle = (
                txt(q(dd, f.altOptionDropdownTitle)) || ""
              ).trim();

              let options = [];

              if (isRequired) {
                options = (qa(dd, f.altOptionReqDropdowns) || [])
                  .map((opt) => {
                    const [l = "", p = ""] = (txt(opt) || "").split("+");
                    return { label: l.trim(), price: p.trim() || null };
                  })
                  .filter((o) => o.label);
              } else {
                const openBtn = q(dd, "button.group");
                if (openBtn) {
                  openBtn.click();
                  await waitFor(() => (qa(document, f.altOptionDropdowns) || []).length > 0, { timeout: 1200, interval: 60 });

                  options = (qa(document, f.altOptionDropdowns) || [])
                    .map((opt) => {
                      const labelEl = q(opt, f.altOptionDropdownLabel);
                      const priceEl = q(opt, f.altOptionDropdownPrice);
                      return {
                        label: (txt(labelEl) || "").trim(),
                        price: priceEl ? (txt(priceEl) || "").trim() : null,
                      };
                    })
                    .filter((o) => o.label);
                }
              }

              if (options.length) {
                const seen = new Set();
                options = options.filter((o) => {
                  const k = `${o.label}|${o.price ?? ""}`;
                  if (seen.has(k)) return false;
                  seen.add(k);
                  return true;
                });
              }

              if (dropdownTitle || options.length) {
                dropdownsAcc.push({ isRequired, dropdownTitle, options });
              }
            }
          }

          const out = {};
          if (selectablesByTitle.size) {
            out.selectables = [...selectablesByTitle.entries()].map(
              ([t, list]) => {
                const seen = new Set();
                const deduped = list.filter((it) => {
                  const k = `${it.label}|${it.value ?? ""}`;
                  if (seen.has(k)) return false;
                  seen.add(k);
                  return true;
                });
                return {
                  selectableTitle: t === "__untitled__" ? "" : t,
                  selectables: deduped,
                };
              }
            );
          }
          if (dropdownsAcc.length) out.dropdowns = dropdownsAcc;

          return Object.keys(out).length ? out : null;
        })
      )
    ).filter(Boolean);
  }

  return { label, required, requiredOpts, options, altOptionGroups };
}

async function parseUpsells(modal, cfg) {
  const f = cfg.modalFields;
  const listRoot = q(modal, f.upsellListContainer);
  if (!listRoot) return [];
  const showMoreEl = q(modal, f.upsellShowMoreButton);
  if (showMoreEl) {
    const before = qa(listRoot, f.upsellItemLabel).length;
    showMoreEl.click();
    await waitFor(() => qa(listRoot, f.upsellItemLabel).length > before, { timeout: 1000, interval: 50 });
  }
  const labels = qa(listRoot, f.upsellItemLabel);
  return labels
    .map((lab) => {
      const name = txt(q(lab, f.upsellItemName));
      const priceText = txt(q(lab, f.upsellItemPrice));
      const price = normPrice(priceText);
      return {
        name,
        price,
      };
    })
    .filter((x) => x.name);
}

async function parseProductModal(modal, cfg, categoryName) {
  const f = cfg.modalFields;

  const title = readField(modal, f.title);
  const description = readField(modal, f.description);
  const priceText = readField(modal, f.price);
  const price = normPrice(priceText);
  const image = readAttr(modal, f.image, "src");

  const groupBlocks = qa(modal, f.optionGroupsSelector);
  const optionGroups = (
    await Promise.all(groupBlocks.map((el) => parseOptionGroup(el, cfg)))
  ).filter(Boolean);

  const upsells = await parseUpsells(modal, cfg);

  const totalText =
    readField(modal.parentElement || document, f.footerTotalPrice) ||
    readField(document, f.footerTotalPrice);
  const total = normPrice(totalText);

  return {
    category: categoryName,
    title,
    description,
    priceText,
    priceValue: price.value,
    priceCurrency: price.currency,
    image,
    optionGroups,
    upsells,
    totalText,
    totalValue: total.value,
    totalCurrency: total.currency,
  };
}

function filterSectionsByIncludeList(sections, cfg) {
  if (!cfg.includeSectionIds || cfg.includeSectionIds.length === 0)
    return sections;
  const set = new Set(cfg.includeSectionIds.map((s) => s.trim()));
  return sections.filter((sec) => set.has("#" + (sec.id || "").trim()));
}

async function scrapeSection(section, cfg) {
  const categoryName =
    readField(section, cfg.categoryTitleSelector) ||
    (section.id ? section.id.replace(/-/g, " ") : "Kategori");

  const listRoots =
    cfg.categoryProductsWithinSection && cfg.productListSelector
      ? qa(section, cfg.productListSelector)
      : [section];

  const seen = new Set();
  const cards = [];
  for (const root of listRoots) {
    for (const el of qa(root, cfg.productItemSelector)) {
      if (isVisible(el) && !seen.has(el)) {
        seen.add(el);
        cards.push(el);
      }
    }
  }

  const items = [];

  for (let i = 0; RUNNING && i < cards.length; i++) {
    const card = cards[i];
    if (i % 2 === 0 || i === cards.length - 1) overlaySet(`[${categoryName}] ${i + 1}/${cards.length}`);

    if (cfg.productEnsureVisible) {
      card.scrollIntoView({ behavior: "instant", block: "center" });
      await sleep(cfg.productAfterScrollPause ?? 60);
    }

    if (cfg.useModal) {
      const modal = await openModal(card, cfg);
      if (!modal) {
        await sleep(cfg.betweenItemsDelay ?? 60);
        continue;
      }

      const record = await parseProductModal(modal, cfg, categoryName);
      items.push(record);

      await closeModal(modal, cfg);
      await sleep(cfg.betweenItemsDelay ?? 60);
    } else {
      const title = readField(card, cfg.fields.title);
      const description = readField(card, cfg.fields.description);
      const priceText = readField(card, cfg.fields.price);
      const price = normPrice(priceText);
      const image = readAttr(card, cfg.fields.image, "src");

      items.push({
        category: categoryName,
        title,
        description,
        priceText,
        priceValue: price.value,
        priceCurrency: price.currency,
        image,
      });

      await sleep(cfg.betweenItemsDelay ?? 60);
    }
  }

  return { name: categoryName, items };
}

async function run(cfg) {
  overlaySet("Sayfa hazırlanıyor…");
  await autoScrollPage(cfg);

  overlaySet("Kategoriler bulunuyor…");
  const allSections = qa(document, cfg.categorySectionSelector).filter(
    isVisible
  );
  const sections = filterSectionsByIncludeList(allSections, cfg);
  overlaySet(`Kategori sayısı: ${sections.length}`);

  const grouped = {};

  for (let s = 0; RUNNING && s < sections.length; s++) {
    const section = sections[s];
    const { name, items } = await scrapeSection(section, cfg);
    grouped[name] = (grouped[name] || []).concat(items);
  }

  overlaySet("Tamamlandı. İndiriliyor…");
  return grouped;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "PING") {
    sendResponse({ ok: true, ready: true, url: location.href });
    return;
  }
  if (msg?.type === "START_SCRAPE") {
    if (RUNNING) {
      overlaySet("Zaten çalışıyor…");
      return;
    }
    RUNNING = true;
    const cfg = msg.config;

    run(cfg)
      .then((grouped) => {
        RUNNING = false;
        chrome.runtime.sendMessage(
          {
            type: "SCRAPE_RESULTS",
            results: grouped,
            restaurantId: getRestaurantId(),
          },
          () =>
            overlaySet(
              "Sonuç kaydedildi (storage). Popup’tan indirebilirsiniz."
            )
        );
      })
      .catch((e) => {
        RUNNING = false;
        overlaySet("Hata: " + (e?.message || e));
      });

    sendResponse({ ok: true });
  } else if (msg?.type === "STOP_SCRAPE") {
    RUNNING = false;
    overlaySet("Durduruldu.");
    sendResponse({ ok: true });
  }
});
