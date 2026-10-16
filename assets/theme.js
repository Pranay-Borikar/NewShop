document.addEventListener('DOMContentLoaded', () => {
  const searchHeading = document.getElementById('SearchHeading');
  if (searchHeading) searchHeading.textContent = 'What are you looking for?';
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    const updateStickyHeader = () => {
      const isStuck = window.scrollY > 0;
      siteHeader.classList.toggle('is-stuck', isStuck);
      document.body.classList.toggle('header-is-stuck', isStuck);
    };
    updateStickyHeader();
    window.addEventListener('scroll', updateStickyHeader, { passive: true });
  }
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

  document.querySelectorAll('.product-gallery').forEach((gallery) => {
    const mainImage = gallery.querySelector('.product-main-image');
    const thumbnails = [...gallery.querySelectorAll('.product-thumb')];
    thumbnails.forEach((thumbnail) => thumbnail.addEventListener('click', () => {
      const image = thumbnail.querySelector('img');
      if (!image || !mainImage) return;
      mainImage.removeAttribute('srcset');
      mainImage.src = image.currentSrc || image.src;
      thumbnails.forEach((item) => item.classList.toggle('is-selected', item === thumbnail));
    }));
  });

  document.querySelectorAll('.mobile-product-carousel').forEach((carousel) => {
    const track = carousel.querySelector('.mobile-carousel-track');
    const originalSlides = [...carousel.querySelectorAll('.mobile-carousel-slide')];
    const dots = [...carousel.querySelectorAll('.mobile-carousel-dots i')];
    if (!track || originalSlides.length < 2) return;
    const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);
    const firstClone = originalSlides[0].cloneNode(true);
    lastClone.setAttribute('aria-hidden', 'true');
    firstClone.setAttribute('aria-hidden', 'true');
    track.insertBefore(lastClone, originalSlides[0]);
    track.appendChild(firstClone);
    const slides = [...track.querySelectorAll('.mobile-carousel-slide')];
    let current = 1;
    let startX = 0;
    let dragging = false;
    let moved = false;

    const sideInset = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return Math.max(0, (carousel.clientWidth - slides[0].getBoundingClientRect().width - gap) / 2);
    };

    const render = (animate = true, dragOffset = 0) => {
      const offset = -(slides[current].offsetLeft - sideInset()) + dragOffset;
      track.style.transition = animate ? 'transform 280ms ease' : 'none';
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      const dotIndex = (current - 1 + originalSlides.length) % originalSlides.length;
      dots.forEach((dot, index) => dot.classList.toggle('is-active', index === dotIndex));
    };
    const moveTo = (index) => {
      current = index;
      render(true);
    };
    const normalize = () => {
      if (current === 0) {
        current = originalSlides.length;
        render(false);
      } else if (current === slides.length - 1) {
        current = 1;
        render(false);
      }
    };
    track.style.overflow = 'visible';
    track.style.touchAction = 'pan-y';
    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      track.setPointerCapture?.(event.pointerId);
      track.style.transition = 'none';
    });
    track.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 4) moved = true;
      if (moved) {
        event.preventDefault();
        render(false, distance);
      }
    });
    track.addEventListener('pointerup', (event) => {
      if (!dragging) return;
      const distance = event.clientX - startX;
      dragging = false;
      track.releasePointerCapture?.(event.pointerId);
      const threshold = Math.max(36, carousel.clientWidth * 0.12);
      moveTo(Math.abs(distance) >= threshold ? current + (distance < 0 ? 1 : -1) : current);
    });
    track.addEventListener('pointercancel', () => { dragging = false; render(true); });
    track.addEventListener('transitionend', (event) => {
      if (event.propertyName === 'transform') normalize();
    });
    dots.forEach((dot, index) => dot.addEventListener('click', () => moveTo(index + 1)));
    window.addEventListener('resize', () => render(false));
    render(false);
  });

  const searchOverlay = document.querySelector('#SearchOverlay');
  const searchInput = searchOverlay?.querySelector('[data-search-input]');
  const searchForm = searchOverlay?.querySelector('[data-search-form]');
  const searchResults = searchOverlay?.querySelector('[data-search-results]');
  let searchTimer;
  let searchRequest;
  let searchVersion = 0;
  let searchScrollY = 0;
  let searchOriginUrl = window.location.href;
  let bodyLockStyles;
  const showSearchMessage = (message) => {
    if (!searchResults) return;
    const node = document.createElement('p');
    node.className = 'search-message';
    node.textContent = message;
    searchResults.replaceChildren(node);
  };
  const showSuggestions = () => {
    if (!searchResults) return;
    searchResults.replaceChildren();
    const heading = document.createElement('p');
    heading.className = 'search-results-heading';
    heading.textContent = 'From our collection';
    const message = document.createElement('p');
    message.className = 'search-message';
    message.textContent = 'Loading products...';
    searchResults.append(heading, message);
  };
  const closeSearch = () => {
    if (!searchOverlay?.classList.contains('is-open')) return;
    clearTimeout(searchTimer);
    searchVersion += 1;
    searchRequest?.abort();
    searchInput.value = '';
    searchForm?.classList.remove('has-query');
    showSuggestions();
    searchOverlay.classList.remove('is-open');
    searchOverlay.setAttribute('aria-hidden', 'true');
    if (window.location.href !== searchOriginUrl) history.replaceState(history.state, '', searchOriginUrl);
    document.documentElement.classList.remove('search-is-open');
    document.body.classList.remove('search-is-open');
    if (bodyLockStyles) {
      document.body.style.position = bodyLockStyles.position;
      document.body.style.top = bodyLockStyles.top;
      document.body.style.width = bodyLockStyles.width;
      document.body.style.left = bodyLockStyles.left;
      document.body.style.right = bodyLockStyles.right;
      bodyLockStyles = null;
      window.scrollTo(0, searchScrollY);
    }
  };
  const openSearch = () => {
    if (!searchOverlay) return;
    searchOriginUrl = window.location.href;
    if (!bodyLockStyles) {
      searchScrollY = window.scrollY;
      bodyLockStyles = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, left: document.body.style.left, right: document.body.style.right };
      document.body.style.position = 'fixed';
      document.body.style.top = `-${searchScrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    searchOverlay.classList.add('is-open');
    searchOverlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('search-is-open');
    document.body.classList.add('search-is-open');
    loadCatalogSuggestions();
    requestAnimationFrame(() => searchInput?.focus());
  };
  const renderSearchResults = (products, query, version, catalogSuggestions = false) => {
    if (!searchResults || version !== searchVersion || !searchOverlay.classList.contains('is-open')) return;
    searchResults.replaceChildren();
    if (!products.length) { showSearchMessage(catalogSuggestions ? 'No products are available right now.' : `No products found for “${query}”.`); return; }
    const heading = document.createElement('p');
    heading.className = 'search-results-heading';
    heading.textContent = catalogSuggestions ? 'From our collection' : 'Matching products';
    const grid = document.createElement('div');
    grid.className = 'search-results-grid';
    products.forEach((product) => {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = product.url;
      const image = document.createElement('img');
      const imageUrl = product.featured_image?.url || product.featured_image;
      if (imageUrl) { image.src = imageUrl; image.alt = product.title || ''; image.loading = 'lazy'; }
      const info = document.createElement('span');
      info.className = 'search-result-info';
      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = product.title || 'Product';
      const price = document.createElement('span');
      price.className = 'search-result-price';
      price.textContent = product.price || product.price_min || '';
      info.append(title, price); link.append(image, info); grid.appendChild(link);
    });
    const viewAll = document.createElement('a');
    viewAll.className = 'search-view-all';
    if (query) {
      viewAll.href = `/search?q=${encodeURIComponent(query)}`;
      viewAll.textContent = 'View all results';
      searchResults.append(heading, grid, viewAll);
    } else searchResults.append(heading, grid);
  };
  const loadCatalogSuggestions = async () => {
    const version = ++searchVersion;
    searchRequest?.abort();
    searchRequest = new AbortController();
    showSuggestions();
    try {
      const response = await fetch('/collections/all/products.json?limit=4', { signal: searchRequest.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalog request failed');
      const data = await response.json();
      const products = (data.products || []).map((product) => ({ title: product.title, url: `/products/${product.handle}`, featured_image: product.images?.[0]?.src, price: product.variants?.[0]?.price ? `₹${product.variants[0].price}` : '' }));
      renderSearchResults(products, '', version, true);
    } catch (error) {
      if (error.name !== 'AbortError' && version === searchVersion) showSearchMessage('Start typing to search our collection.');
    }
  };
  const searchProducts = async (query) => {
    const version = ++searchVersion;
    searchRequest?.abort();
    if (!query) { loadCatalogSuggestions(); return; }
    searchRequest = new AbortController();
    showSearchMessage('Searching...');
    try {
      const params = new URLSearchParams({ q: query, 'resources[type]': 'product', 'resources[limit]': '8', 'resources[options][unavailable_products]': 'hide' });
      const response = await fetch(`/search/suggest.json?${params}`, { signal: searchRequest.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Predictive search failed');
      const data = await response.json();
      renderSearchResults(data.resources?.results?.products || [], query, version);
    } catch (error) {
      if (error.name !== 'AbortError' && version === searchVersion) showSearchMessage('Search is temporarily unavailable. Please try again.');
    }
  };
  document.querySelectorAll('[data-search-open]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); openSearch(); }));
  searchOverlay?.querySelectorAll('[data-search-close]').forEach((button) => button.addEventListener('click', closeSearch));
  searchOverlay?.querySelectorAll('[data-search-home]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); closeSearch(); }));
  searchOverlay?.querySelector('[data-search-clear]')?.addEventListener('click', () => { searchInput.value = ''; searchForm?.classList.remove('has-query'); searchProducts(''); searchInput.focus(); });
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim();
    searchForm?.classList.toggle('has-query', Boolean(query));
    clearTimeout(searchTimer);
    searchVersion += 1;
    searchRequest?.abort();
    const nextUrl = query ? `/search?q=${encodeURIComponent(query)}` : searchOriginUrl;
    if (window.location.href !== new URL(nextUrl, window.location.origin).href) history.replaceState(history.state, '', nextUrl);
    searchTimer = setTimeout(() => searchProducts(query), 80);
  });
  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    searchInput?.dispatchEvent(new Event('input', { bubbles: true }));
  });
  let fullSearchTimer;
  let fullSearchRequest;
  let fullSearchVersion = 0;
  const focusSearchInputEnd = (input) => {
    if (!input) return;
    input.focus({ preventScroll: true });
    const end = input.value.length;
    input.setSelectionRange(end, end);
  };
  const bindFullSearchInput = (input) => {
    if (!input || input.dataset.ajaxBound === 'true') return;
    input.dataset.ajaxBound = 'true';
    input.addEventListener('input', () => {
      const query = input.value.trim();
      clearTimeout(fullSearchTimer);
      fullSearchVersion += 1;
      fullSearchRequest?.abort();
      fullSearchTimer = setTimeout(async () => {
        const version = fullSearchVersion;
        const page = input.closest('.search-results-page');
        if (!page) return;
        fullSearchRequest = new AbortController();
        page.classList.add('is-search-loading');
        try {
          const response = await fetch(query ? `/search?q=${encodeURIComponent(query)}` : '/search', { signal: fullSearchRequest.signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
          if (!response.ok) throw new Error('Search page request failed');
          const html = await response.text();
          if (version !== fullSearchVersion) return;
          const parsed = new DOMParser().parseFromString(html, 'text/html');
          const nextPage = parsed.querySelector('.search-results-page');
          if (!nextPage) return;
          page.replaceChildren(...nextPage.children);
          const nextInput = page.querySelector('.search-results-form input[name="q"]');
          history.replaceState({}, '', query ? `/search?q=${encodeURIComponent(query)}` : '/search');
          page.classList.remove('is-search-loading');
          bindFullSearchInput(nextInput);
          focusSearchInputEnd(nextInput);
        } catch (error) {
          if (error.name !== 'AbortError') page.classList.remove('is-search-loading');
        }
      }, 180);
    });
  };
  document.querySelectorAll('.search-results-form input[name="q"]').forEach(bindFullSearchInput);
  const initialResultsInput = document.querySelector('.search-results-page .search-results-form input[name="q"]');
  if (initialResultsInput?.value) requestAnimationFrame(() => focusSearchInputEnd(initialResultsInput));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && searchOverlay?.classList.contains('is-open')) closeSearch(); });

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
