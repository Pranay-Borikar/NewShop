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
});
