document.addEventListener('DOMContentLoaded', () => {
  const sizeGuide = document.querySelector('#size-guide');
  const sizeChartLink = document.querySelector('a[href="#size-guide"]');
  if (sizeGuide && sizeChartLink) {
    sizeGuide.setAttribute('role', 'dialog');
    sizeGuide.setAttribute('aria-modal', 'true');
    sizeGuide.setAttribute('aria-labelledby', 'size-guide-title');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'size-guide-close';
    close.setAttribute('aria-label', 'Close size guide');
    close.textContent = '×';
    sizeGuide.prepend(close);
    const closeSizeGuide = () => {
      sizeGuide.classList.remove('is-open');
      document.body.classList.remove('size-guide-open');
    };
    sizeChartLink.addEventListener('click', (event) => {
      event.preventDefault();
      sizeGuide.classList.add('is-open');
      document.body.classList.add('size-guide-open');
      close.focus();
    });
    close.addEventListener('click', closeSizeGuide);
    sizeGuide.addEventListener('click', (event) => {
      if (event.target === sizeGuide) closeSizeGuide();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && sizeGuide.classList.contains('is-open')) closeSizeGuide();
    });
  }

  document.querySelectorAll('.product-gallery').forEach((gallery) => {
    const rail = gallery.querySelector('.product-thumbnails');
    if (!rail || rail.parentElement.classList.contains('gallery-thumbnail-carousel')) return;
    const carousel = document.createElement('div');
    carousel.className = 'gallery-thumbnail-carousel';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'gallery-arrow prev';
    previous.setAttribute('aria-label', 'Previous product images');
    previous.textContent = '‹';
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'gallery-arrow next';
    next.setAttribute('aria-label', 'Next product images');
    next.textContent = '›';
    rail.parentNode.insertBefore(carousel, rail);
    carousel.append(previous, rail, next);
    previous.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' }));

    const thumbnails = [...rail.querySelectorAll('.product-thumb')];
    const mainPrevious = gallery.querySelector('.gallery-main-arrow-prev');
    const mainNext = gallery.querySelector('.gallery-main-arrow-next');
    const selectImage = (direction) => {
      const current = thumbnails.findIndex((thumb) => thumb.classList.contains('is-selected'));
      const nextIndex = (current + direction + thumbnails.length) % thumbnails.length;
      const target = thumbnails[nextIndex];
      if (target) {
        const pageY = window.scrollY;
        target.click();
        window.scrollTo(0, pageY);
        requestAnimationFrame(() => window.scrollTo(0, pageY));
        rail.scrollTo({ left: Math.max(0, target.offsetLeft - (rail.clientWidth - target.offsetWidth) / 2), behavior: 'smooth' });
      }
    };
    mainPrevious?.addEventListener('click', (event) => { event.preventDefault(); selectImage(-1); });
    mainNext?.addEventListener('click', (event) => { event.preventDefault(); selectImage(1); });
  });

  document.querySelectorAll('.product-details details').forEach((details) => {
    const summary = details.querySelector('summary');
    if (summary?.textContent.trim() === 'SHIPPING INFORMATION') {
      const content = details.querySelector('div');
      if (content) content.innerHTML = '<p>Products are shipped within 1–2 days and delivered within 5–7 days.</p><p>Some products are made on order and may require 10–12 days for delivery. In such cases, you will be informed.</p>';
    }
  });

  document.querySelectorAll('.product-form').forEach((form) => {
    const addButton = form.querySelector('.add-button');
    if (addButton && !form.querySelector('.product-quantity')) {
      const quantity = document.createElement('div');
      quantity.className = 'product-quantity';
      quantity.innerHTML = '<button type="button" data-quantity-minus aria-label="Decrease quantity">−</button><input type="number" name="quantity" value="1" min="1" aria-label="Quantity"><button type="button" data-quantity-plus aria-label="Increase quantity">+</button>';
      addButton.parentElement.insertBefore(quantity, addButton);
      const input = quantity.querySelector('input');
      quantity.querySelector('[data-quantity-minus]').addEventListener('click', () => { input.value = Math.max(1, Number(input.value || 1) - 1); });
      quantity.querySelector('[data-quantity-plus]').addEventListener('click', () => { input.value = Number(input.value || 1) + 1; });
    }
    if (addButton && !form.querySelector('.buy-now-button')) {
      const buyNow = document.createElement('button');
      buyNow.type = 'submit';
      buyNow.className = 'buy-now-button';
      buyNow.textContent = 'BUY NOW';
      buyNow.dataset.buyNow = 'true';
      addButton.insertAdjacentElement('afterend', buyNow);
      form.addEventListener('submit', async (event) => {
        if (event.submitter !== buyNow) return;
        event.preventDefault();
        buyNow.disabled = true;
        buyNow.textContent = 'PROCESSING...';
        try {
          const response = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form)
          });
          if (!response.ok) throw new Error('Unable to add product');
          window.location.href = '/checkout';
        } catch (error) {
          buyNow.disabled = false;
          buyNow.textContent = 'BUY NOW';
          form.dispatchEvent(new CustomEvent('product:buy-now-error', { detail: error }));
        }
      });
    }
    const legacy = form.querySelector('.variant-options');
    const choices = [...(legacy?.querySelectorAll('.variant-choice') || [])];
    if (!legacy || choices.length === 0) return;

    const variants = choices.map((choice) => {
      const text = choice.querySelector('span')?.textContent.trim().split(/\s*\/\s*/).map((value) => value.trim()) || [];
      return { choice, input: choice.querySelector('input[name="id"]'), values: text.slice(0, 2) };
    }).filter((variant) => variant.input && variant.values.length === 2);
    if (!variants.length) return;

    const names = ['Size', 'Color'];
    const selected = { 0: variants[0].values[0], 1: variants[0].values[1] };
    const groups = document.createElement('div');
    groups.className = 'product-option-groups';

    names.forEach((name, position) => {
      const group = document.createElement('div');
      group.className = 'product-option-group';
      const label = document.createElement('span');
      label.className = 'option-label';
      label.textContent = name;
      const values = document.createElement('div');
      values.className = 'option-values';
      values.setAttribute('role', 'radiogroup');
      values.setAttribute('aria-label', name);
      [...new Set(variants.map((variant) => variant.values[position]))].forEach((value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'option-value';
        button.textContent = value;
        button.dataset.position = String(position);
        button.dataset.value = value;
        button.setAttribute('aria-pressed', String(selected[position] === value));
        button.addEventListener('click', () => {
          selected[position] = value;
          groups.querySelectorAll('.option-value').forEach((item) => {
            const active = selected[item.dataset.position] === item.dataset.value;
            item.classList.toggle('is-selected', active);
            item.setAttribute('aria-pressed', String(active));
          });
          const match = variants.find((variant) => variant.values[0] === selected[0] && variant.values[1] === selected[1]);
          if (match) {
            match.input.checked = true;
            match.input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        values.appendChild(button);
      });
      group.append(label, values);
      groups.appendChild(group);
    });

    legacy.hidden = true;
    legacy.setAttribute('aria-hidden', 'true');
    legacy.parentElement.insertBefore(groups, legacy);
    groups.querySelectorAll('.option-value').forEach((button) => {
      const active = selected[button.dataset.position] === button.dataset.value;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-pressed', String(active));
    });
  });

  document.querySelectorAll('.cart-page-quantity').forEach((quantity) => {
    const input = quantity.querySelector('input');
    const form = quantity.closest('form');
    const update = (delta) => { input.value = Math.max(0, Number(input.value || 0) + delta); form?.requestSubmit(); };
    quantity.querySelector('[data-cart-page-minus]')?.addEventListener('click', () => update(-1));
    quantity.querySelector('[data-cart-page-plus]')?.addEventListener('click', () => update(1));
  });
});
