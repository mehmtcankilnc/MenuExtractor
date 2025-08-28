const API = typeof browser !== "undefined" ? browser : chrome;

let CURRENT_TAB;
let CURRENT_SITE = "unknown";
let LAST_JSON = null;
let LAST_RESTAURANT_ID = "unknown";
let LAST_STORED_ID = null;

const TRENDYOL_CONFIG = {
  pageAutoScroll: false,

  categorySectionSelector: "section[id]",
  includeSectionIds: [],
  categoryTitleSelector: "h3.title-1-semibold",
  categoryProductsWithinSection: true,

  productListSelector: ".grid.grid-cols-1, .grid.md\\:grid-cols-2",
  productItemSelector: "div[role='button'][tabindex='0']",
  productEnsureVisible: true,
  productAfterScrollPause: 120,

  useModal: true,
  modalSelector: "div[role='dialog'][data-state='open']",

  closeSelector:
    "div[role='dialog'][data-state='open'] button.absolute.right-0.top-0",
  afterProductClickDelay: 500,
  modalWaitTimeout: 12000,
  modalCloseTimeout: 6000,

  fields: {
    title: "h6.title-3-medium",
    description: "p.body-3-regular, p.body-2-regular",
    price: "span.title-3-semibold.text-primary",
    image: "img[alt='menu']",
  },

  modalFields: {
    container: "#pdp-dialog-scroll-container",
    title: "h3.heading-3-medium",
    description: "p",
    price: "div.title-3-medium.gap-2 span",
    image: "#pdp-dialog-scroll-container > .flex.gap-4.mb-5 img[alt]",

    optionGroupsSelector: "form > div.gap-3",
    optionFields: {
      isRequired: "div.title-4-medium",
      optionTitle: "label.title-2-semibold",
      optionReqDropdowns: "form > div.gap-3 > div.gap-1 > select > option",
      optionDropdown: "button.group",
      optionElement: "div[data-radix-popper-content-wrapper=''] div.gap-2",
      optionDropdownLabel: "span.truncate",
      optionDropdownPrice: "span.text-primary.ml-1",

      altOptions: "form > div.gap-5", //
      altOptionTitle: "h5.title-2-semibold", //
      altOptionSelectables: "button[data-state='off']", //
      altOptionDropdownGroups: "div.gap-3", //
      altOptionIsRequired: "div.title-4-medium", //
      altOptionDropdownTitle: "label.title-2-semibold", //
      altOptionReqDropdowns: "option", //
      altOptionDropdowns: "div[data-radix-popper-content-wrapper=''] div.gap-2", //
      altOptionDropdownLabel: "span.truncate", //
      altOptionDropdownPrice: "span.text-primary.ml-1", //
    },

    upsellTitleSelector:
      "#pdp-dialog-scroll-container h2.title-2-semibold:has(img[alt='Yanında İyi Gider'])",

    upsellListContainer: "div.flex.flex-col.gap-3.mt-5 div.flex.flex-col.gap-4",

    upsellItemLabel:
      "div.flex.flex-col.gap-3.mt-5 div.flex.flex-col.gap-4 label",
    upsellItemName: "h3.title-3-medium.truncate.leading-normal",
    upsellItemPrice: "span.text-primary",

    footerTotalPrice: ".title-2-semibold.text-primary",
  },

  betweenItemsDelay: 120,
};

const GETIR_CONFIG = {
  pageAutoScroll: false,

  categorySectionSelector: ".sc-11a64cc4-1",
  includeSectionIds: [],
  categoryTitleSelector: "h3[data-testid='title']",
  categoryProductsWithinSection: true,

  productListSelector: ".sc-be09943-7",
  productItemSelector: "div[data-testid='card']",
  productItemClickSelector:
    "div[data-testid='card'] div.hNPAnT button[data-testid='button']",

  productEnsureVisible: true,
  productAfterScrollPause: 150,

  useModal: true,
  modalSelector: "div[data-testid='modal']",
  closeSelector:
    "div[data-testid='modal'] .style__Close-sc-__sc-vk2nyz-5 button",

  afterProductClickDelay: 600,
  modalWaitTimeout: 12000,
  modalCloseTimeout: 6000,

  fields: {
    title: "div[data-testid='title'] h4[data-testid='title']",
    description: "div[data-testid='paragraph'] p",
    price: ".sc-be09943-4 span[data-testid='text']",
    image: "img[data-testid='main-image']",
  },

  modalFields: {
    container:
      "div[data-testid='modal'] .style__ModalContent-sc-__sc-vk2nyz-10",

    title: "#food-detail span.sc-986b737c-8",
    description: "#food-detail div[data-testid='paragraph'] p",
    image: "#food-detail img[data-testid='main-image']",
    price:
      ".style__Footer-sc-__sc-vk2nyz-4 .style__AddonAfter-sc-__sc-6ivys6-4",

    optionGroupsSelector: "div.ftpNug > div.kaNpmH",
    optionFields: {
      optionTitle: "h5",
      isRequired: "select[required]",
      optionReqDropdowns: "select > option[value]:not([value=''])",
      optionGroupSelect: "div.jVuFnR div[kind='basic']",
      optionButtonLabel: "span.bXMwEt",
      optionButtonPrice: "span.iccEVs",
      optionSelectables: "div.jVuFnR div[kind='chip']",
      optionChoices: "div.jVuFnR div.bwofea",
    },

    removeIngredientsTitle: "h5:contains('Çıkarılacak Malzeme')",
    removeIngredientsItems: "label[kind='chip'], label[data-testid='checkbox']",

    upsellTitleSelector:
      "h2.title-2-semibold:has(img[alt='Yanında İyi Gider'])",
    upsellListContainer:
      "h2.title-2-semibold:has(img[alt='Yanında İyi Gider']) + div",
    upsellItemLabel: "label",
    upsellItemName: "h3.title-3-medium",
    upsellItemPrice: "span.text-primary",
    upsellItemImage: "img[alt]",

    footerTotalPrice:
      ".style__Footer-sc-__sc-vk2nyz-4 .style__AddonAfter-sc-__sc-6ivys6-4",
  },

  betweenItemsDelay: 140,
};

const YEMEKSEPETI_CONFIG = {
  pageAutoScroll: false,

  categorySectionSelector: ".dish-category-section",
  includeSectionIds: [],
  categoryTitleSelector: "h2.dish-category-title",
  categoryProductsWithinSection: true,

  productListSelector: "ul.dish-list-grid",
  productItemSelector: "li[data-testid='menu-product']",
  productItemClickSelector:
    "li[data-testid='menu-product'] button[data-testid='menu-product-button-overlay-id']",

  productEnsureVisible: true,
  productAfterScrollPause: 150,

  useModal: true,
  modalSelector: ".bds-c-modal__content",
  closeSelector: "button.bds-c-modal__close-button",

  afterProductClickDelay: 500,
  modalWaitTimeout: 12000,
  modalCloseTimeout: 6000,

  fields: {
    title: "span[data-testid='menu-product-name']",
    description: "p[data-testid='menu-product-description']",
    price: "p[data-testid='menu-product-price']",
    image: "img[data-testid='menu-product-image']",
  },

  modalFields: {
    container: ".bds-c-modal__content",
    title: "h2#item-modifier-product-name",
    description: "p[data-testid='item-modifier-product-description']",
    image: "img.product-information-image",
    price: "span[data-testid='item-modifier-product-price']",

    optionGroupsSelector: "div.item-modifier-selection-section",
    optionFields: {
      optionTitle: "h3 > span",
      isRequiredYS: "h3 > div#section-tag > span",
      optionShowMoreBtn:
        "div.mt-sm button[data-testid='item-modifier-show-more-collapsed']",
      optionGroupSelect: "div[data-testid='item-modifier-topping']",
      optionSelectables: "div[data-testid='item-modifier-bundle-product']",
      optionButtonLabel: "span[data-testid='item-modifier-item-name']",
      optionButtonPrice: "span[data-testid='item-modifier-item-price']",
    },

    removeIngredientsTitle: "#product-special-instructions-title",
    removeIngredientsItems:
      "[data-testid='item-modifier-special-instructions']",

    upsellListContainer: "[data-testid='cross-sell-as-topping-item-modifier']",
    upsellShowMoreButton:
      "[data-testid='item-modifier-cross-sell-toppings-show-more']",
    upsellItemLabel: "div.option-row",
    upsellItemName: "p.product-name",
    upsellItemPrice: "p[data-testid='Cross-sell topping price']",

    footerTotalPrice: "[data-testid='item-modifier-product-price']",
  },
};

const MIGROS_CONFIG = {
  pageAutoScroll: false,

  categorySectionSelector: ".menu-info-wrapper.ng-star-inserted",
  includeSectionIds: [],
  categoryTitleSelector: "h3.menu-item-header.ng-star-inserted",
  categoryProductsWithinSection: true,

  productListSelector: "div.menu-items-wrapper",
  productItemSelector: "div.menu-item.cursor-pointer.ng-star-inserted",
  productItemClickSelector: "div.menu-item.cursor-pointer.ng-star-inserted",

  productEnsureVisible: true,
  productAfterScrollPause: 150,

  useModal: true,
  modalSelector: ".modal-container",
  closeSelector:
    ".modal-container button.mdc-icon-button.mat-mdc-icon-button.mat-accent.mat-mdc-button-base",

  afterProductClickDelay: 800,
  modalWaitTimeout: 12000,
  modalCloseTimeout: 6000,

  fields: {
    title: "div.subtitle-2 name",
    description: "div.mat-caption-normal description",
    price: "div.menu-item.cursor-pointer.ng-star-inserted div.price-wrapper h3",
    image: "img.menu-item-image ng-star-inserted loaded",
  },

  modalFields: {
    container: "div.modal-container",
    title: ".product-info-wrapper .subtitle-1",
    description: ".product-info-wrapper .product-description",
    image: "img[alt='product-image']",
    price:
      ".product-info-wrapper .product-price h3, .product-info-wrapper .product-price > span",

    optionGroupsSelector: ".options-wrapper .option-item-wrapper",
    optionFields: {
      optionTitle: "div.option-header",
      optionGroupSelect: "mat-radio-button",
      optionSelectables: "mat-checkbox",
      optionButtonLabel: ".mat-caption-normal",
      optionButtonPrice: ".mat-caption-normal > .mat-caption-bold",
      optionShowMoreBtn: ".more-button",
      optionChoicesMG: ".options-wrapper > .mat-caption-normal",
    },

    removeIngredientsTitle: "",
    removeIngredientsItems: "",

    upsellTitleSelector: "",
    upsellListContainer: "",
    upsellItemLabel: "",
    upsellItemName: "",
    upsellItemPrice: "",
    upsellItemImage: "",

    footerTotalPrice: ".footer-wrapper .total-price h3",
    addToCartButton: ".footer-wrapper fe-button button",

    closeButton: "#close-icon button",
  },
};

const elStart = document.getElementById("startBtn");
const elStop = document.getElementById("stopBtn");
const elList = document.getElementById("payloadSelect");
const elDownloadSel = document.getElementById("downloadSelectedBtn");
const elDeleteSel = document.getElementById("deleteSelectedBtn");
const elClearAll = document.getElementById("clearAllBtn");
const elMeta = document.getElementById("meta");
const elLog = document.getElementById("log");
const elSite = document.getElementById("site");

const safe = (s) => (s || "unknown").toString();
const fmtDT = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

function renderMeta(item) {
  if (!item) {
    elMeta.textContent = "";
    return;
  }
  elMeta.textContent = `[${item.site}] ${item.restaurantId} — ${fmtDT(
    item.createdAt
  )}  ${item.sourceUrl || ""}`;
}

function setListDisabled(disabled) {
  elDownloadSel.disabled = disabled;
  elDeleteSel.disabled = disabled;
  elClearAll.disabled = disabled;
}

async function refreshList(selectId = null) {
  try {
    const res = await chrome.runtime.sendMessage({ type: "LIST_PAYLOADS" });
    const items = res?.ok && Array.isArray(res.items) ? res.items : [];

    while (elList.firstChild) elList.removeChild(elList.firstChild);

    items.forEach((it) => {
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = `[${it.site}] ${safe(it.restaurantId)} — ${fmtDT(
        it.createdAt
      )}`;
      elList.appendChild(opt);
    });

    if (!items.length) {
      setListDisabled(true);
      renderMeta(null);
      return;
    }

    let idx = 0;
    if (selectId) {
      const i = items.findIndex((x) => x.id === selectId);
      if (i >= 0) idx = i;
    }
    elList.selectedIndex = idx;
    setListDisabled(false);
    renderMeta(items[idx]);
  } catch (e) {
    log("Storage listesi okunamadı: " + (e?.message || e));
    setListDisabled(true);
    renderMeta(null);
  }
}

const log = (m) => {
  elLog.textContent += m + "\n";
  elLog.scrollTop = elLog.scrollHeight;
};

const detectSite = (url) => {
  if (!url) return "unknown";
  if (/getir\.com\/yemek\/restoran/i.test(url)) return "getir";
  if (/tgoyemek\.com\/restoranlar/i.test(url)) return "trendyol";
  if (/yemeksepeti\.com\/restaurant/i.test(url) || /tr\.fd-api\.com/i.test(url))
    return "yemeksepeti";
  if (/migros\.com\.tr/i.test(url)) return "migros";
  return "unknown";
};

(async function init() {
  const [tab] = await API.tabs.query({ active: true, currentWindow: true });
  CURRENT_TAB = tab;
  CURRENT_SITE = detectSite(tab?.url || "");

  elSite.textContent = CURRENT_SITE + " (" + (tab?.url || "-") + ")";
  log("Hazır.");
  await refreshList();

  try {
    const res = await API.runtime.sendMessage({ type: "LIST_PAYLOADS" });
    if (res?.ok && res.items?.length) {
      const latest = res.items[0];
      LAST_STORED_ID = latest.id;
      LAST_RESTAURANT_ID = latest.restaurantId || "unknown";
      log(
        `Storage'da kayıt var: ${latest.site}/${latest.restaurantId} (${latest.createdAt}).`
      );
    } else {
      log("Storage boş görünüyor.");
    }
  } catch (e) {
    log("Storage okunamadı: " + (e?.message || e));
  }

  API.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "NEW_PAYLOAD") {
      refreshList(msg.id);
      log("Yeni kayıt alındı.");
    }
  });

  API.runtime.sendMessage({ type: "POPUP_OPENED" }, (res) => {
    if (res?.payload) {
      LAST_JSON = JSON.stringify(res.payload, null, 2);
      LAST_RESTAURANT_ID = "unknown";
      log("Önceki payload (response-copy) alındı.");
    }
  });
})();

elStart.addEventListener("click", async () => {
  if (!CURRENT_TAB?.id) {
    log("Aktif sekme yok.");
    return;
  }

  LAST_JSON = null;

  const cfg =
    CURRENT_SITE === "getir"
      ? GETIR_CONFIG
      : CURRENT_SITE === "trendyol"
      ? TRENDYOL_CONFIG
      : CURRENT_SITE === "migros"
      ? MIGROS_CONFIG
      : YEMEKSEPETI_CONFIG;
  log(`Scraping başlatılıyor (${CURRENT_SITE})…`);
  await API.tabs.sendMessage(CURRENT_TAB.id, {
    type: "START_SCRAPE",
    config: cfg,
  });
});

elStop.addEventListener("click", async () => {
  if (!CURRENT_TAB?.id) return;
  await API.tabs.sendMessage(CURRENT_TAB.id, { type: "STOP_SCRAPE" });
  log("Durdur komutu gönderildi.");
});

elList.addEventListener("change", async () => {
  const id = elList.value;
  if (!id) {
    renderMeta(null);
    return;
  }
  try {
    const res = await API.runtime.sendMessage({ type: "GET_PAYLOAD", id });
    renderMeta(res?.ok ? res.item : null);
  } catch {
    renderMeta(null);
  }
});

elDownloadSel.addEventListener("click", async () => {
  const id = elList.value;
  if (!id) return;
  try {
    const res = await API.runtime.sendMessage({ type: "DOWNLOAD_STORED", id });
    if (res?.ok) log("İndirme başlatıldı.");
    else log("İndirme hatası: " + (res?.error || "bilinmiyor"));
  } catch (e) {
    log("İndirme hatası: " + (e?.message || e));
  }
});

elDeleteSel.addEventListener("click", async () => {
  const id = elList.value;
  if (!id) return;
  try {
    const ok = confirm("Seçili kaydı silmek istiyor musunuz?");
    if (!ok) return;
    const res = await API.runtime.sendMessage({ type: "DELETE_PAYLOAD", id });
    if (res?.ok) {
      log("Kayıt silindi.");
      await refreshList();
    } else {
      log("Silme hatası.");
    }
  } catch (e) {
    log("Silme hatası: " + (e?.message || e));
  }
});

elClearAll.addEventListener("click", async () => {
  try {
    const ok = confirm("Tüm kayıtları silmek istiyor musunuz?");
    if (!ok) return;
    const res = await API.runtime.sendMessage({ type: "CLEAR_PAYLOADS" });
    if (res?.ok) {
      log("Tüm kayıtlar temizlendi.");
      await refreshList();
    } else {
      log("Temizleme hatası.");
    }
  } catch (e) {
    log("Temizleme hatası: " + (e?.message || e));
  }
});

API.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SCRAPE_RESULTS") {
    const grouped = msg.results || {};
    const catKeys = Object.keys(grouped).filter((k) => k !== "meta");
    const hasAnyItem = catKeys.some(
      (k) => Array.isArray(grouped[k]) && grouped[k].length > 0
    );

    if (!hasAnyItem) {
      log("SCRAPE_RESULTS boş görünüyor.");
      sendResponse?.({ ok: false, empty: true });
      return;
    }

    LAST_JSON = JSON.stringify(grouped, null, 2);
    LAST_RESTAURANT_ID = msg.restaurantId || "unknown";
    log(`Scraping tamam: ${catKeys.length} kategori. İndirebilirsiniz.`);
    sendResponse?.({ ok: true, categories: catKeys.length });
    return;
  }
});
