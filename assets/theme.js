document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mobile-menu-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const header = toggle.closest('.site-header');
      const open = header.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const dots = [...carousel.querySelectorAll('[data-slide]')];
    let current = 0;
    const show = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === current));
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
    };
    dots.forEach((dot) => dot.addEventListener('click', () => show(Number(dot.dataset.slide))));
    show(0);
    let timer = setInterval(() => show(current + 1), Number(carousel.dataset.interval) || 5000);
    carousel.addEventListener('mouseenter', () => clearInterval(timer));
    carousel.addEventListener('mouseleave', () => { timer = setInterval(() => show(current + 1), Number(carousel.dataset.interval) || 5000); });
  });
  const countdown = document.querySelector('[data-ready-countdown]');
  const readyCard = document.querySelector('[data-ready-deadline]');
  if (countdown && readyCard) {
    const deadline = new Date(readyCard.dataset.readyDeadline).getTime();
    const update = () => {
      const remaining = Math.max(0, deadline - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      countdown.textContent = `${days ? `${days}d ` : ''}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
    };
    update();
    setInterval(update, 1000);
  }

  const wishlistKey = 'markavenue-wishlist';
  const readWishlist = () => { try { return JSON.parse(localStorage.getItem(wishlistKey) || '[]'); } catch (_) { return []; } };
  const saveWishlist = (items) => localStorage.setItem(wishlistKey, JSON.stringify(items));
  const getProduct = (button) => {
    const card = button.closest('[data-wishlist-handle]');
    if (card) return { handle: card.dataset.wishlistHandle, title: card.dataset.wishlistTitle, url: card.dataset.wishlistUrl };
    const detail = button.closest('.product-detail-page');
    if (detail) return { handle: location.pathname.split('/').filter(Boolean).pop(), title: detail.querySelector('h1')?.textContent.trim() || 'Product', url: location.pathname };
    return null;
  };
  const syncWishlistButtons = () => {
    const items = readWishlist();
    document.querySelectorAll('.wishlist,.wishlist-detail').forEach((button) => {
      const product = getProduct(button); const active = product && items.some((item) => item.handle === product.handle);
      button.classList.toggle('is-wishlisted', Boolean(active));
      button.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
      if (button.classList.contains('wishlist')) button.textContent = active ? '♥' : '♡';
    });
  };
  const showWishlistNotice = (added, product) => {
    let notice = document.querySelector('.wishlist-notice');
    if (!notice) { notice = document.createElement('aside'); notice.className = 'wishlist-notice'; document.body.appendChild(notice); }
    notice.innerHTML = `<button type="button" aria-label="Close">×</button><p>${added ? 'Product has been added to your wishlist' : 'Product has been removed from your wishlist'}.</p><small>Please <a href="/account/login">login</a> to save it permanently.</small>`;
    notice.querySelector('button').onclick = () => notice.classList.remove('is-visible');
    notice.classList.add('is-visible');
    clearTimeout(notice._timer); notice._timer = setTimeout(() => notice.classList.remove('is-visible'), 5000);
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.wishlist,.wishlist-detail');
    if (!button) return;
    event.preventDefault(); event.stopPropagation();
    const product = getProduct(button); if (!product) return;
    const items = readWishlist(); const index = items.findIndex((item) => item.handle === product.handle);
    const added = index === -1;
    if (added) items.push(product); else items.splice(index, 1);
    saveWishlist(items); syncWishlistButtons(); showWishlistNotice(added, product);
  });
  syncWishlistButtons();

  const drawer = document.querySelector('[data-cart-drawer]');
  const money = (cents) => `₹${(Number(cents || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const cartState = { data: { items: [], total_price: 0 }, coupon: null };
  const cartOpen = () => { if (!drawer) return; drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('cart-is-open'); loadCart(); };
  const cartClose = () => { drawer?.classList.remove('is-open'); drawer?.setAttribute('aria-hidden', 'true'); document.body.classList.remove('cart-is-open'); };
  const loadCart = async () => { if (!drawer) return; const response = await fetch('/cart.js'); cartState.data = await response.json(); renderCart(); };
  const renderCart = () => {
    const list = drawer.querySelector('[data-cart-items]');
    list.innerHTML = cartState.data.items.length ? cartState.data.items.map((item) => `<article class="drawer-cart-item"><a href="${item.url}">${item.image ? `<img src="${item.image}" alt="${item.product_title}">` : ''}</a><div><a href="${item.url}">${item.product_title}</a><strong>${money(item.final_line_price)}</strong><div class="drawer-actions"><div class="drawer-quantity"><button data-cart-change="${item.key}" data-quantity="${item.quantity - 1}">−</button><b>${item.quantity}</b><button data-cart-change="${item.key}" data-quantity="${item.quantity + 1}">+</button></div><button class="drawer-remove" data-cart-change="${item.key}" data-quantity="0" aria-label="Remove ${item.product_title}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14l-1 14H6L5 7zM9 3h6l1 4H8l1-4zM3 7h18v2H3z"/><path fill="#fff" d="M9 11h2v7H9zm4 0h2v7h-2z"/></svg></button></div></div></article>`).join('') : '<p class="empty-cart">Your cart is empty.</p>';
    const discount = cartState.coupon ? Math.round(cartState.data.total_price * cartState.coupon.percent / 100) : 0;
    drawer.querySelector('[data-cart-total]').textContent = money(cartState.data.total_price - discount);
    drawer.querySelector('[data-coupon-saving]').textContent = discount ? `You save ${money(discount)}` : '';
    drawer.querySelector('[data-coupon-code]').textContent = cartState.coupon ? cartState.coupon.code : 'PRE5';
    document.querySelectorAll('.cart-count').forEach((node) => { node.textContent = cartState.data.item_count; node.hidden = cartState.data.item_count === 0; });
  };
  const updateCart = async (key, quantity) => { await fetch('/cart/change.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key, quantity }) }); await loadCart(); };
  document.querySelectorAll('.product-form').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const variant = form.querySelector('input[name="id"]:checked, select[name="id"]');
    const button = form.querySelector('.add-button');
    if (!variant) return;
    button?.setAttribute('disabled', 'disabled');
    if (button) button.textContent = 'ADDING...';
    try {
      const response = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ items: [{ id: Number(variant.value), quantity: 1 }] }) });
      if (!response.ok) throw new Error('Unable to add product');
      cartOpen();
    } catch (error) {
      window.alert('This product could not be added to the cart. Please try again.');
    } finally {
      button?.removeAttribute('disabled');
      if (button) button.textContent = 'ADD TO CART';
    }
  }));
  document.querySelectorAll('.cart-icon').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); cartOpen(); }));
  drawer?.querySelectorAll('[data-cart-close]').forEach((button) => button.addEventListener('click', cartClose));
  const variantModal = drawer?.querySelector('[data-variant-modal]');
  const closeVariantModal = () => { variantModal?.classList.remove('is-open'); variantModal?.setAttribute('aria-hidden', 'true'); };
  drawer?.addEventListener('click', async (event) => {
    const change = event.target.closest('[data-cart-change]'); if (change) await updateCart(change.dataset.cartChange, Number(change.dataset.quantity));
    const add = event.target.closest('[data-upsell-add]');
    if (add) {
      const card = add.closest('.upsell-product');
      const variants = [...card.querySelectorAll('.upsell-variants [data-variant-id]')];
      const content = variantModal.querySelector('[data-variant-modal-content]');
      content.innerHTML = variants.map((variant) => `<article class="variant-modal-row"><img src="${add.dataset.productImage}" alt=""><div class="variant-row-info"><strong>${add.dataset.productTitle}</strong><span class="variant-modal-size">${variant.dataset.variantTitle}</span></div><div class="variant-row-actions"><div class="variant-row-price">${add.dataset.productCompare ? `<s>${add.dataset.productCompare}</s>` : ''}<b>${add.dataset.productPrice}</b>${add.dataset.productCompare ? '<small>(50% OFF)</small>' : ''}</div><div class="variant-row-quantity"><button type="button" data-variant-qty="-1">−</button><input type="number" value="1" min="1" max="${variant.dataset.maxQuantity}"><button type="button" data-variant-qty="1">+</button></div><button type="button" class="variant-row-add" data-modal-variant="${variant.dataset.variantId}" data-max-quantity="${variant.dataset.maxQuantity}" ${variant.disabled ? 'disabled' : ''}>${variant.disabled ? 'Sold out' : 'Add to cart'}</button></div></article>`).join('');
      variantModal.classList.add('is-open'); variantModal.setAttribute('aria-hidden', 'false');
    }
    const quantityButton = event.target.closest('[data-variant-qty]');
    if (quantityButton) { const input = quantityButton.parentElement.querySelector('input'); const next = Number(input.value) + Number(quantityButton.dataset.variantQty); input.value = Math.max(1, Math.min(Number(input.max || 99), next)); }
    const selected = event.target.closest('[data-modal-variant]');
    if (selected && !selected.disabled) {
      const row = selected.closest('.variant-modal-row'); const input = row.querySelector('input'); const quantity = Number(input.value || 1);
      selected.disabled = true; selected.textContent = 'Adding...';
      try { const response = await fetch('/cart/add.js', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ items: [{ id: Number(selected.dataset.modalVariant), quantity }] }) }); if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.description || 'Unable to add this variant'); } closeVariantModal(); await loadCart(); }
      catch (error) { selected.disabled = false; selected.textContent = 'Try again'; window.setTimeout(() => { if (!selected.disabled) selected.textContent = 'Add to cart'; }, 1800); }
    }
  });
  variantModal?.querySelector('[data-variant-close]')?.addEventListener('click', closeVariantModal);
  drawer?.querySelector('[data-coupon-input]')?.addEventListener('input', (event) => { drawer.querySelector('[data-coupon-submit]').disabled = !event.target.value.trim(); });
  drawer?.querySelector('[data-coupon-toggle]')?.addEventListener('click', () => drawer.querySelector('[data-coupon-entry]').classList.toggle('is-open'));
  drawer?.querySelector('[data-coupon-submit]')?.addEventListener('click', () => { const input = drawer.querySelector('[data-coupon-input]'); const code = input.value.trim().toUpperCase(); const valid = { PRE5: 5, SAVE10: 10, FLAT50: 50 }; if (valid[code]) { cartState.coupon = { code, percent: valid[code] }; drawer.querySelector('[data-coupon-message]').textContent = `${valid[code]}% discount applied`; renderCart(); } else drawer.querySelector('[data-coupon-message]').textContent = 'Coupon code not found'; });
  drawer?.querySelector('[data-coupon-apply]')?.addEventListener('click', () => drawer.querySelector('[data-coupon-entry]').classList.add('is-open'));
  drawer?.querySelector('[data-checkout]')?.addEventListener('click', (event) => { if (cartState.coupon) event.currentTarget.href = `/discount/${encodeURIComponent(cartState.coupon.code)}?redirect=/checkout`; });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { if (variantModal?.classList.contains('is-open')) closeVariantModal(); else if (drawer?.classList.contains('is-open')) cartClose(); } });
  if (drawer) loadCart();
});
