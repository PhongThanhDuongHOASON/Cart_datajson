const CART_KEY = "fandy_cart_v1";

let CATALOG = [];

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function loadCatalog() {
  const inline = document.getElementById("catalog-json");
  if (inline?.textContent) {
    const parsed = safeParseJSON(inline.textContent);
    if (Array.isArray(parsed)) return parsed;
  }

  try {
    const res = await fetch("./data/products.json", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatVND(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
// Tranh loi JSON
function getProductById(id) {
  const targetId = String(id);
  return CATALOG.find((p) => String(p.id) === targetId) || null;
}

function clampQty(qty) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(99, Math.round(n)));
}

function addToCart(productId, qty = 1) {
  const product = getProductById(productId);
  if (!product) return;

  const cart = loadCart();
  const currentRaw = Number(cart[productId]?.qty ?? 0);
  const current = Number.isFinite(currentRaw) ? currentRaw : 0;
  const next = clampQty(current + qty);
  cart[productId] = { qty: next };
  saveCart(cart);
  renderAll();
}

function setQty(productId, qty) {
  const cart = loadCart();
  if (!cart[productId]) return;
  cart[productId].qty = clampQty(qty);
  saveCart(cart);
  renderAll();
}

function removeItem(productId) {
  const cart = loadCart();
  if (!cart[productId]) return;
  delete cart[productId];
  saveCart(cart);
  renderAll();
}
//xoa du lieu
function clearCart() {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
  }
  saveCart({});
  renderAll();
}

function computeTotals(cart) {
  let subtotal = 0;
  const items = [];

  for (const [id, row] of Object.entries(cart)) {
    const product = getProductById(id);
    if (!product) continue;
    const qty = clampQty(row.qty);
    const lineTotal = qty * product.price;
    subtotal += lineTotal;
    items.push({ product, qty, lineTotal });
  }

  const shipping = 0;
  const total = subtotal + shipping;

  return { items, subtotal, shipping, total };
}

function renderCart() {
  const cartTable = document.getElementById("cart-table");
  const cartEmpty = document.getElementById("cart-empty");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const totalEl = document.getElementById("total");

  
  if (!cartTable || !cartEmpty || !subtotalEl || !shippingEl || !totalEl) {// khai thac DOM
    return;
  }

  const cart = loadCart();
  const { items, subtotal, shipping, total } = computeTotals(cart);

  subtotalEl.textContent = formatVND(subtotal);
  shippingEl.textContent = formatVND(shipping);
  totalEl.textContent = formatVND(total);

  if (items.length === 0) {
    cartEmpty.hidden = false;
    cartEmpty.style.display = "flex";
    cartTable.innerHTML = "";
    return;
  }

  // Gio hang trong
  cartEmpty.hidden = true;
  cartEmpty.style.display = "none";

  // hien thi 1 gia
  cartTable.innerHTML = items
    .map(({ product, qty, lineTotal }) => {
      return `
        <div class="cart-row" data-id="${product.id}">
          <div class="cell-img"><img src="${product.image}" alt="${product.name}"></div>
          <div class="cell-title">
            <p class="item-title">${product.name}</p>
            <p class="item-meta">${product.desc}</p>
          </div>
          <div class="cell-qty">
            <div class="qty" role="group" aria-label="Số lượng">
              <button type="button" class="qty-btn" data-action="dec" aria-label="Giảm">−</button>
              <input type="text" inputmode="numeric" pattern="[0-9]*" value="${qty}" data-action="input" aria-label="Số lượng">
              <button type="button" class="qty-btn" data-action="inc" aria-label="Tăng">+</button>
            </div>
          </div>
          <div class="cell-total line-total">${formatVND(lineTotal)}</div>
          <div class="cell-remove">
            <button type="button" class="remove" data-action="remove" title="Xóa">✕</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSuggest() {
  const grid = document.getElementById("suggest-grid");
  if (!grid) return;

  grid.innerHTML = CATALOG.map((p) => {
    return `
      <div class="card">
        <img class="thumb" src="${p.image}" alt="${p.name}">
        <div class="body">
          <h3>${p.name}</h3>
          <p class="muted">${p.desc}</p>
          <div class="card-row">
            <span class="badge-price">${formatVND(p.price)}</span>
            <button class="btn" type="button" data-add="${p.id}">Thêm</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function bindEvents() {
  document.addEventListener("click", (e) => {
    const target = e.target instanceof Element ? e.target : e.target?.parentElement;
    if (!target) return;

    //Khac phuc cac nut ko hoat dong
    const clearBtn = target.closest("#clear-cart-btn");
    if (clearBtn) {
      if (confirm("Xóa tất cả sản phẩm trong giỏ hàng?")) clearCart();
      return;
    }

    const checkoutBtn = target.closest("#checkout-btn");
    if (checkoutBtn) {
      const cart = loadCart();
      const { items, total } = computeTotals(cart);
      if (items.length === 0) {
        alert("Giỏ hàng đang trống.");
        return;
      }
      alert(`Đặt hàng thành công (demo).\nTổng tiền: ${formatVND(total)}`);
      return;
    }

    const addBtn = target.closest("[data-add]");
    if (addBtn) {
      addToCart(addBtn.getAttribute("data-add"), 1);
      return;
    }

    const row = target.closest(".cart-row");
    if (!row) return;

    const id = row.getAttribute("data-id");
    const action = target.getAttribute("data-action");

    if (action === "remove") {
      removeItem(id);
      return;
    }

    if (action === "inc" || action === "dec") {
      const input = row.querySelector('input[data-action="input"]');
      const current = clampQty(input?.value ?? 1);
      setQty(id, current + (action === "inc" ? 1 : -1));
      return;
    }
  });

  document.addEventListener("input", (e) => {
    const input = e.target.closest?.('input[data-action="input"]');
    if (!input) return;
    const row = input.closest(".cart-row");
    if (!row) return;
    const id = row.getAttribute("data-id");
    const cleaned = String(input.value).replace(/[^\d]/g, "");
    input.value = cleaned;
    const next = cleaned === "" ? 1 : clampQty(Number(cleaned));
    setQty(id, next);
  });
}

function renderAll() {
  renderCart();
}

async function init() {
  CATALOG = await loadCatalog();
  renderSuggest();
  bindEvents();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);

