(() => {
  'use strict';

  const STORAGE_KEY = 'mis-pagos-v1';
  const categories = {
    personal: { label: 'Lo pago yo', eyebrow: 'TUS GASTOS PERSONALES' },
    casa: { label: 'Casa a medias', eyebrow: 'GASTOS DE CASA' },
    otros: { label: 'Con otras personas', eyebrow: 'GASTOS COMPARTIDOS' }
  };
  const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const list = document.querySelector('#payment-list');
  const modal = document.querySelector('#modal-backdrop');
  const form = document.querySelector('#payment-form');
  const dateInput = document.querySelector('#form-date');
  const amountInput = document.querySelector('#form-amount');
  const descriptionInput = document.querySelector('#form-description');
  const categoryInput = document.querySelector('#form-category');
  let activeCategory = 'personal';
  let editingId = null;
  let expenses = readExpenses();

  function readExpenses() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && item.id && categories[item.category] && item.date && Number.isFinite(Number(item.amount)) && item.description) : [];
    } catch (_) {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      return true;
    } catch (_) {
      return false;
    }
  }

  function localISODate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function daysFromToday(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    const due = Date.UTC(year, month - 1, day);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due - today) / 86400000);
  }

  function countdownText(days) {
    if (days < 0) return `Hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}`;
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    return `En ${days} días`;
  }

  function dateText(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return dateFormatter.format(new Date(year, month - 1, day));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function icon(name) {
    if (name === 'edit') return '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m11.3 4.2 4.5 4.5M4.5 15.5l3.3-.7L16.2 6.4a1.6 1.6 0 0 0-2.3-2.3l-8.4 8.4-.9 3Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (name === 'delete') return '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 6h11m-9.8 0 .6 9.2c.1.6.5 1 1.1 1h5.2c.6 0 1-.4 1.1-1l.6-9.2M8 6V4.5c0-.6.4-1 1-1h2c.6 0 1 .4 1 1V6m-3.5 3v4m3-4v4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3.75v3M17 3.75v3M4.75 9h14.5M6.5 5.5h11A1.75 1.75 0 0 1 19.25 7.25v11A1.75 1.75 0 0 1 17.5 20h-11a1.75 1.75 0 0 1-1.75-1.75v-11A1.75 1.75 0 0 1 6.5 5.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function render() {
    const selected = expenses.filter(item => item.category === activeCategory).sort((a, b) => daysFromToday(a.date) - daysFromToday(b.date));
    const total = selected.reduce((sum, item) => sum + Number(item.amount), 0);
    const upcoming = selected[0];
    document.querySelector('#total-amount').textContent = currency.format(total);
    document.querySelector('#payment-count').textContent = selected.length;
    document.querySelector('#payment-count-label').textContent = selected.length === 1 ? 'pago' : 'pagos';
    document.querySelector('#next-payment').textContent = upcoming ? `${countdownText(daysFromToday(upcoming.date))} · ${upcoming.description}` : 'Aún no tienes pagos';
    document.querySelector('#list-eyebrow').textContent = categories[activeCategory].eyebrow;
    document.querySelector('#payment-list').setAttribute('aria-labelledby', `tab-${activeCategory === 'personal' ? 'personal' : activeCategory === 'casa' ? 'home' : 'others'}`);
    document.querySelectorAll('.category-tab').forEach(tab => {
      const active = tab.dataset.category === activeCategory;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    if (!selected.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon('calendar')}</span><strong>Aún no hay pagos aquí</strong><p>Añade un gasto a «${categories[activeCategory].label}» y verás cuánto falta para pagarlo.</p><button type="button" data-action="add">+ Añadir el primer pago</button></div>`;
      return;
    }

    list.innerHTML = selected.map(item => {
      const days = daysFromToday(item.date);
      const countdown = days < 0 ? 'overdue' : '';
      return `<article class="payment-card">
        <div class="payment-info"><span class="payment-dot" data-category="${item.category}" aria-hidden="true"></span><div><p class="payment-description">${escapeHTML(item.description)}</p><p class="payment-date">${dateText(item.date)}</p></div></div>
        <strong class="payment-amount">${currency.format(Number(item.amount))}</strong>
        <div class="countdown ${countdown}"><strong>${countdownText(days)}</strong><span>${days < 0 ? 'Fecha de pago pasada' : days === 0 ? 'Fecha de pago' : 'para pagar'}</span></div>
        <div class="card-actions"><button class="card-action" type="button" aria-label="Editar ${escapeHTML(item.description)}" title="Editar" data-action="edit" data-id="${escapeHTML(item.id)}">${icon('edit')}</button><button class="card-action" type="button" aria-label="Eliminar ${escapeHTML(item.description)}" title="Eliminar" data-action="delete" data-id="${escapeHTML(item.id)}">${icon('delete')}</button></div>
      </article>`;
    }).join('');
  }

  function openModal(item = null) {
    editingId = item ? item.id : null;
    form.reset();
    document.querySelector('#modal-title').textContent = item ? 'Editar pago' : 'Añadir pago';
    document.querySelector('.modal-heading .eyebrow').textContent = item ? 'ACTUALIZA EL RECORDATORIO' : 'NUEVO RECORDATORIO';
    document.querySelector('.save-button').textContent = item ? 'Guardar cambios' : 'Guardar pago';
    categoryInput.value = item ? item.category : activeCategory;
    dateInput.value = item ? item.date : localISODate();
    amountInput.value = item ? Number(item.amount).toFixed(2) : '';
    descriptionInput.value = item ? item.description : '';
    document.querySelector('#form-error').hidden = true;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    window.setTimeout(() => (item ? descriptionInput : dateInput).focus(), 60);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    editingId = null;
  }

  document.querySelector('#open-form').addEventListener('click', () => openModal());
  document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click', closeModal));
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });

  document.querySelectorAll('.category-tab').forEach(tab => tab.addEventListener('click', () => {
    activeCategory = tab.dataset.category;
    render();
  }));

  document.querySelector('.category-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const tabs = [...document.querySelectorAll('.category-tab')];
    const index = tabs.findIndex(tab => tab.dataset.category === activeCategory);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    event.preventDefault();
    next.focus();
    next.click();
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'add') openModal();
    if (action === 'edit') {
      const item = expenses.find(expense => expense.id === id);
      if (item) openModal(item);
    }
    if (action === 'delete') {
      const item = expenses.find(expense => expense.id === id);
      if (item && window.confirm(`¿Eliminar el pago «${item.description}»?`)) {
        expenses = expenses.filter(expense => expense.id !== id);
        persist();
        render();
      }
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(amountInput.value.replace(',', '.'));
    const description = descriptionInput.value.trim();
    if (!dateInput.value || !description || !Number.isFinite(amount) || amount <= 0) {
      const error = document.querySelector('#form-error');
      error.textContent = 'Revisa la fecha, el importe y la descripción.';
      error.hidden = false;
      return;
    }
    if (editingId) {
      const existing = expenses.find(item => item.id === editingId);
      if (existing) Object.assign(existing, { category: categoryInput.value, date: dateInput.value, amount, description });
    } else {
      const id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      expenses.push({ id, category: categoryInput.value, date: dateInput.value, amount, description });
    }
    const saved = persist();
    activeCategory = categoryInput.value;
    closeModal();
    render();
    if (!saved) window.alert('No se han podido guardar los datos en el dispositivo. Revisa el espacio disponible del navegador.');
  });

  render();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }
})();
