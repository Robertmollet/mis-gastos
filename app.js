(() => {
  'use strict';

  const STORAGE_KEY = 'mis-pagos-v1';
  const CUSTOM_CATEGORY_KEY = 'mis-pagos-custom-category-v1';
  const categories = {
    personal: { label: 'Mi cuenta', eyebrow: 'PAGOS DE MI CUENTA' },
    casa: { label: 'Cuenta Casa', eyebrow: 'PAGOS DE CUENTA CASA' },
    otros: { label: '', eyebrow: 'PAGOS DEL APARTADO' }
  };
  const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const list = document.querySelector('#payment-list');
  const modal = document.querySelector('#modal-backdrop');
  const form = document.querySelector('#payment-form');
  const dateInput = document.querySelector('#form-date');
  const amountInput = document.querySelector('#form-amount');
  const descriptionInput = document.querySelector('#form-description');
  const categoryInput = document.querySelector('#form-category');
  const frequencyInput = document.querySelector('#form-frequency');
  const dateChips = document.querySelector('#date-chips');
  let activeCategory = 'personal';
  let editingId = null;
  let selectedDates = [];
  let lastFormCategory = 'personal';
  let customCategory = readCustomCategory();
  let expenses = readExpenses();

  function readExpenses() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item && item.id && categories[item.category] && item.date && Number.isFinite(Number(item.amount)) && item.description).map(item => ({ ...item, recurrence: item.recurrence === 'monthly' ? 'monthly' : 'once' })) : [];
    } catch (_) {
      return [];
    }
  }

  function readCustomCategory() {
    try { return (localStorage.getItem(CUSTOM_CATEGORY_KEY) || '').trim().slice(0, 28); } catch (_) { return ''; }
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); return true; } catch (_) { return false; }
  }

  function saveCustomCategory(value) {
    customCategory = value.trim().slice(0, 28);
    try { localStorage.setItem(CUSTOM_CATEGORY_KEY, customCategory); } catch (_) { /* El nombre también queda en memoria. */ }
    render();
  }

  function askCustomCategory() {
    const answer = window.prompt('¿Qué nombre quieres poner al tercer apartado?', customCategory || '');
    if (answer === null) return false;
    const value = answer.trim().slice(0, 28);
    if (!value) {
      window.alert('Escribe un nombre para este apartado.');
      return false;
    }
    saveCustomCategory(value);
    return true;
  }

  function localISODate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function fromISO(isoDate) {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function daysFromToday(isoDate) {
    const due = fromISO(isoDate);
    const today = new Date();
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / 86400000);
  }

  function addDaysISO(isoDate, amount) {
    const date = fromISO(isoDate);
    date.setDate(date.getDate() + amount);
    return localISODate(date);
  }

  function adjustWeekend(isoDate) {
    const weekday = fromISO(isoDate).getDay();
    if (weekday === 6) return addDaysISO(isoDate, -1);
    if (weekday === 0) return addDaysISO(isoDate, -2);
    return isoDate;
  }

  function monthlyDueDate(anchorISO, todayISO = localISODate()) {
    const [anchorYear, anchorMonth, anchorDay] = anchorISO.split('-').map(Number);
    const [todayYear, todayMonth] = todayISO.split('-').map(Number);
    const monthDifference = (todayYear - anchorYear) * 12 + (todayMonth - anchorMonth);
    const firstOffset = Math.max(0, monthDifference - 1);
    for (let offset = firstOffset; offset < firstOffset + 36; offset++) {
      const absoluteMonth = anchorYear * 12 + (anchorMonth - 1) + offset;
      const year = Math.floor(absoluteMonth / 12);
      const monthIndex = absoluteMonth % 12;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const nominal = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(Math.min(anchorDay, lastDay)).padStart(2, '0')}`;
      const actual = adjustWeekend(nominal);
      if (actual >= todayISO) return actual;
    }
    return adjustWeekend(anchorISO);
  }

  function countdownFor(days) {
    if (days < 0) return { number: String(Math.abs(days)), label: Math.abs(days) === 1 ? 'día tarde' : 'días tarde', status: 'VENCIDO' };
    if (days === 0) return { number: 'HOY', label: 'paga hoy', status: 'HOY' };
    if (days === 1) return { number: '1', label: 'día', status: 'MAÑANA' };
    return { number: String(days), label: 'días', status: 'PENDIENTE' };
  }

  function bandFor(days) {
    if (days <= 5) return 'red';
    if (days <= 20) return 'yellow';
    if (days <= 31) return 'green';
    return 'white';
  }

  function dateText(isoDate) { return dateFormatter.format(fromISO(isoDate)); }

  function categoryName(category) {
    return category === 'otros' ? (customCategory || 'Tu apartado') : categories[category].label;
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function icon(name) {
    if (name === 'edit') return '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m11.3 4.2 4.5 4.5M4.5 15.5l3.3-.7L16.2 6.4a1.6 1.6 0 0 0-2.3-2.3l-8.4 8.4-.9 3Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (name === 'delete') return '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4.5 6h11m-9.8 0 .6 9.2c.1.6.5 1 1.1 1h5.2c.6 0 1-.4 1.1-1l.6-9.2M8 6V4.5c0-.6.4-1 1-1h2c.6 0 1 .4 1 1V6m-3.5 3v4m3-4v4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (name === 'calendar') return '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 3.75v3M17 3.75v3M4.75 9h14.5M6.5 5.5h11A1.75 1.75 0 0 1 19.25 7.25v11A1.75 1.75 0 0 1 17.5 20h-11a1.75 1.75 0 0 1-1.75-1.75v-11A1.75 1.75 0 0 1 6.5 5.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '';
  }

  function displayEntries() {
    const today = localISODate();
    return expenses.map(item => ({
      item,
      dueDate: item.recurrence === 'monthly' ? monthlyDueDate(item.date, today) : item.date,
      recurring: item.recurrence === 'monthly'
    }));
  }

  function render() {
    const selected = displayEntries().filter(entry => entry.item.category === activeCategory).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const total = selected.reduce((sum, entry) => sum + Number(entry.item.amount), 0);
    const upcoming = selected[0];
    document.querySelector('#total-amount').textContent = currency.format(total);
    document.querySelector('#payment-count').textContent = selected.length;
    document.querySelector('#payment-count-label').textContent = selected.length === 1 ? 'pago' : 'pagos';
    if (upcoming) {
      const nextDays = daysFromToday(upcoming.dueDate);
      const nextLabel = nextDays === 0 ? 'Hoy' : nextDays === 1 ? 'Mañana' : nextDays < 0 ? `Vencido · hace ${Math.abs(nextDays)} ${Math.abs(nextDays) === 1 ? 'día' : 'días'}` : `En ${nextDays} días`;
      document.querySelector('#next-payment').textContent = `${nextLabel} · ${upcoming.item.description}`;
    } else {
      document.querySelector('#next-payment').textContent = 'Aún no tienes pagos';
    }
    document.querySelector('#list-eyebrow').textContent = activeCategory === 'otros' && !customCategory ? 'TU TERCER APARTADO' : categories[activeCategory].eyebrow;
    document.querySelector('#payment-list').setAttribute('aria-labelledby', `tab-${activeCategory === 'personal' ? 'personal' : activeCategory === 'casa' ? 'home' : 'others'}`);
    document.querySelector('#custom-category-label').textContent = customCategory || '+ Otro';
    document.querySelector('#edit-category').hidden = !customCategory;
    document.querySelector('#form-category option[value="otros"]').textContent = customCategory || 'Añadir apartado';
    document.querySelectorAll('.category-tab').forEach(tab => {
      const active = tab.dataset.category === activeCategory;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    if (!selected.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon('calendar')}</span><strong>Aún no hay pagos aquí</strong><p>Añade un gasto a «${escapeHTML(categoryName(activeCategory))}» y verás cuánto falta.</p><button type="button" data-action="add">+ Añadir el primer pago</button></div>`;
      return;
    }

    list.innerHTML = selected.map(({ item, dueDate, recurring }) => {
      const days = daysFromToday(dueDate);
      const countdown = countdownFor(days);
      const band = bandFor(days);
      return `<article class="payment-card band-${band}">
        <div class="count-box" aria-label="${countdown.number} ${countdown.label}"><strong>${countdown.number}</strong><span>${countdown.label}</span></div>
        <div class="payment-info">
          <div class="payment-topline"><div class="description-wrap"><span class="payment-dot" data-category="${item.category}" aria-hidden="true"></span><p class="payment-description">${escapeHTML(item.description)}</p></div><strong class="payment-amount">${currency.format(Number(item.amount))}</strong></div>
          <div class="payment-bottomline"><p class="payment-date">${dateText(dueDate)}${recurring ? '<span class="monthly-badge">Cada mes</span>' : ''}</p><div class="card-actions"><button class="card-action" type="button" aria-label="Editar ${escapeHTML(item.description)}" title="Editar" data-action="edit" data-id="${escapeHTML(item.id)}">${icon('edit')}</button><button class="card-action" type="button" aria-label="Eliminar ${escapeHTML(item.description)}" title="Eliminar" data-action="delete" data-id="${escapeHTML(item.id)}">${icon('delete')}</button></div></div>
        </div>
      </article>`;
    }).join('');
  }

  function updateFrequencyFields() {
    const isMultiple = frequencyInput.value === 'multiple';
    const isMonthly = frequencyInput.value === 'monthly';
    document.querySelector('#multi-date-tools').hidden = !isMultiple;
    document.querySelector('#date-hint').hidden = !isMonthly;
    document.querySelector('#date-label').textContent = isMonthly ? 'Primera fecha de pago' : isMultiple ? 'Elige una fecha cada vez' : 'Fecha de pago';
    dateInput.required = !isMultiple;
    renderDateChips();
  }

  function renderDateChips() {
    dateChips.innerHTML = selectedDates.map(date => `<span class="date-chip">${dateText(date)}<button type="button" aria-label="Quitar ${dateText(date)}" data-remove-date="${date}">×</button></span>`).join('');
  }

  function openModal(item = null) {
    editingId = item ? item.id : null;
    selectedDates = [];
    form.reset();
    document.querySelector('#modal-title').textContent = item ? 'Editar pago' : 'Añadir pago';
    document.querySelector('.modal-heading .eyebrow').textContent = item ? 'ACTUALIZA EL RECORDATORIO' : 'NUEVO RECORDATORIO';
    document.querySelector('.save-button').textContent = item ? 'Guardar cambios' : 'Guardar pago';
    categoryInput.value = item ? item.category : activeCategory;
    lastFormCategory = categoryInput.value;
    frequencyInput.value = item ? item.recurrence : 'once';
    dateInput.value = item ? item.date : localISODate();
    amountInput.value = item ? Number(item.amount).toFixed(2) : '';
    descriptionInput.value = item ? item.description : '';
    document.querySelector('#form-error').hidden = true;
    updateFrequencyFields();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    window.setTimeout(() => (item ? descriptionInput : dateInput).focus(), 60);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    editingId = null;
    selectedDates = [];
  }

  function newId() { return window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }

  document.querySelector('#open-form').addEventListener('click', () => openModal());
  document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click', closeModal));
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });

  document.querySelectorAll('.category-tab').forEach(tab => tab.addEventListener('click', () => {
    if (tab.dataset.category === 'otros' && !customCategory && !askCustomCategory()) return;
    activeCategory = tab.dataset.category;
    render();
  }));
  document.querySelector('#edit-category').addEventListener('click', event => { event.stopPropagation(); askCustomCategory(); });

  document.querySelector('.category-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const tabs = [...document.querySelectorAll('.category-tab')];
    const index = tabs.findIndex(tab => tab.dataset.category === activeCategory);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    event.preventDefault();
    next.focus();
    next.click();
  });

  categoryInput.addEventListener('change', () => {
    const newCategory = categoryInput.value;
    if (newCategory === 'otros' && !customCategory && !askCustomCategory()) categoryInput.value = lastFormCategory;
    else lastFormCategory = categoryInput.value;
  });
  frequencyInput.addEventListener('change', updateFrequencyFields);
  document.querySelector('#add-date').addEventListener('click', () => {
    if (!dateInput.value) {
      dateInput.focus();
      return;
    }
    if (!selectedDates.includes(dateInput.value)) selectedDates.push(dateInput.value);
    selectedDates.sort();
    dateInput.value = '';
    renderDateChips();
  });
  dateChips.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-date]');
    if (!button) return;
    selectedDates = selectedDates.filter(date => date !== button.dataset.removeDate);
    renderDateChips();
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
      const label = item && item.recurrence === 'monthly' ? 'el pago mensual' : 'este pago';
      if (item && window.confirm(`¿Eliminar ${label} «${item.description}»?`)) {
        expenses = expenses.filter(expense => expense.id !== id);
        const saved = persist();
        render();
        if (!saved) window.alert('No se han podido guardar los cambios en el dispositivo.');
      }
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const amount = Number(amountInput.value.replace(',', '.'));
    const description = descriptionInput.value.trim();
    const frequency = frequencyInput.value;
    const dates = frequency === 'multiple' ? [...selectedDates] : [dateInput.value];
    const error = document.querySelector('#form-error');
    if (frequency === 'multiple' && dateInput.value && !dates.includes(dateInput.value)) dates.push(dateInput.value);
    if (!dates.length || dates.some(date => !date) || !description || !Number.isFinite(amount) || amount <= 0) {
      error.textContent = frequency === 'multiple' && !dates.length ? 'Añade al menos una fecha y revisa el importe y la descripción.' : 'Revisa la fecha, el importe y la descripción.';
      error.hidden = false;
      return;
    }

    if (editingId) {
      const existing = expenses.find(item => item.id === editingId);
      if (existing) {
        const recurrence = frequency === 'monthly' ? 'monthly' : 'once';
        Object.assign(existing, { category: categoryInput.value, date: dates[0], amount, description, recurrence });
        if (frequency === 'multiple') dates.slice(1).forEach(date => expenses.push({ id: newId(), category: categoryInput.value, date, amount, description, recurrence: 'once' }));
      }
    } else {
      const recurrence = frequency === 'monthly' ? 'monthly' : 'once';
      dates.forEach(date => expenses.push({ id: newId(), category: categoryInput.value, date, amount, description, recurrence }));
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
