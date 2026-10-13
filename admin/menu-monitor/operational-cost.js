(function () {
  'use strict';

  const storageKey = 'rbm_hpp_operational_cost_percent';
  const markupStorageKey = 'rbm_hpp_global_markup_percent';
  const itemNotesStorageKey = 'rbm_hpp_item_notes';
  let savedValue = null;
  let savedMarkupValue = null;
  let savedItemNotes = null;
  let storageReadError = null;
  let markupStorageReadError = null;
  let itemNotesReadError = null;
  try {
    savedValue = localStorage.getItem(storageKey);
  } catch (error) {
    storageReadError = error;
  }
  try {
    savedMarkupValue = localStorage.getItem(markupStorageKey);
  } catch (error) {
    markupStorageReadError = error;
  }
  try {
    savedItemNotes = localStorage.getItem(itemNotesStorageKey);
  } catch (error) {
    itemNotesReadError = error;
  }
  let operationalCostPercent = savedValue === null ? 0 : Number(savedValue);
  let markupPercent = savedMarkupValue === null ? 0 : Number(savedMarkupValue);
  const invalidSavedValue = savedValue !== null && (!Number.isFinite(operationalCostPercent) || operationalCostPercent < 0);
  const invalidSavedMarkup = savedMarkupValue !== null && (!Number.isFinite(markupPercent) || markupPercent < 0);
  let itemNotes = {};
  if (savedItemNotes !== null) {
    try {
      const parsedNotes = JSON.parse(savedItemNotes);
      if (!parsedNotes || typeof parsedNotes !== 'object' || Array.isArray(parsedNotes)) {
        throw new Error('Format catatan tersimpan tidak valid.');
      }
      itemNotes = parsedNotes;
    } catch (error) {
      itemNotesReadError = error;
    }
  }
  let currentDrawerCode = null;

  if (invalidSavedValue) {
    operationalCostPercent = 0;
  }
  if (invalidSavedMarkup) {
    markupPercent = 0;
  }

  const baseCalc = window.calc;
  const baseRenderResto = window.renderResto;
  const baseOpenDrawer = window.openDrawer;
  const baseRenderKitchen = window.renderKitchen;
  const baseOpenKitchenRecipe = window.openKitchenRecipe;
  const baseOpenKitchenMenus = window.openKitchenMenus;
  const baseCreateKitchenReport = window.createKitchenReport;
  const baseRenderPackagingDetails = window.renderPackagingDetails;
  const baseDatabaseRows = window.databaseRows;

  window.databaseRows = function () {
    return baseDatabaseRows().map(function (row) {
      if (row.kind !== 'materials-resto' && row.kind !== 'materials-dapur') return row;
      return { ...row, type: 'Bahan baku dapur' };
    });
  };

  function noteKey(kind, identifier) {
    return JSON.stringify([kind, String(identifier || '').trim()]);
  }

  function addPackagingUnitPrices() {
    document.querySelectorAll('.packaging-item').forEach(function (row) {
      const action = row.querySelector('[data-edit-packaging], [data-delete-packaging]');
      const item = action ? packaging.items[Number(action.dataset.editPackaging || action.dataset.deletePackaging)] : null;
      if (!item) return;

      const description = row.querySelector('span');
      const quantity = Number(item.qty);
      const unit = String(item.unit || 'pcs');
      const detail = description?.querySelector('small');
      if (!description || !detail) return;

      let unitCost = item.unitCost;
      if (unitCost === null || unitCost === undefined || !Number.isFinite(Number(unitCost))) {
        const material = packagingMasterForItem(item);
        const source = item.source || (material && isKitchenMaterial(material) ? 'dapur' : 'resto');
        const hasPrice = material && [material.new, material.old, material.price].some(function (value) {
          return value !== undefined && value !== null && Number.isFinite(Number(value));
        });
        unitCost = hasPrice ? priceUnit(material.code, material.name, unit, source) : null;
      }

      detail.textContent = `Qty: ${quantity.toLocaleString('id-ID')} ${unit}`;
      let price = description.querySelector('.packaging-unit-price');
      if (!price) {
        price = document.createElement('small');
        price.className = 'packaging-unit-price';
        description.appendChild(price);
      }
      const hasUnitCost = unitCost !== null && unitCost !== undefined && Number.isFinite(Number(unitCost));
      price.textContent = hasUnitCost ? `SHS: ${money(Number(unitCost))} / ${unit}` : 'SHS: Harga belum tersedia';

      const subtotal = row.querySelector(':scope > strong');
      if (subtotal) {
        const subtotalAmount = Number.isFinite(Number(item.cost)) ? Number(item.cost) : hasUnitCost ? Number(unitCost) * quantity : null;
        subtotal.textContent = subtotalAmount === null ? 'Subtotal: Harga belum tersedia' : `Subtotal: ${money(subtotalAmount)}`;
      }
    });
  }

  if (baseRenderPackagingDetails) {
    window.renderPackagingDetails = function () {
      baseRenderPackagingDetails();
      addPackagingUnitPrices();
    };
    window.renderPackagingDetails();
  }

  function appendNoteControl(cell, kind, identifier) {
    const key = noteKey(kind, identifier);
    const details = document.createElement('details');
    details.className = 'item-note';
    const summary = document.createElement('summary');
    summary.textContent = 'Catatan';
    const content = document.createElement('div');
    content.className = 'item-note-content';
    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.maxLength = 2000;
    textarea.placeholder = 'Tulis catatan untuk item ini...';
    textarea.value = typeof itemNotes[key] === 'string' ? itemNotes[key] : '';
    const status = document.createElement('small');
    status.className = 'item-note-status';
    status.setAttribute('role', 'status');
    status.textContent = itemNotesReadError
      ? `Catatan tersimpan tidak dapat dibaca: ${itemNotesReadError.message}`
      : 'Catatan disimpan di perangkat ini.';
    textarea.addEventListener('change', function () {
      itemNotes[key] = textarea.value;
      try {
        localStorage.setItem(itemNotesStorageKey, JSON.stringify(itemNotes));
        status.textContent = 'Catatan tersimpan di perangkat ini.';
      } catch (error) {
        status.textContent = `Gagal menyimpan catatan: ${error.message}`;
      }
    });
    content.append(textarea, status);
    details.append(summary, content);
    cell.replaceChildren(details);
  }

  function addItemNotes(rows, kind, identifierForRow, nameCellIndex) {
    rows.forEach(function (row) {
      const identifier = identifierForRow(row);
      const nameCell = row.cells[nameCellIndex];
      if (!identifier || !nameCell) return;
      nameCell.querySelector('.item-note')?.remove();
      const noteContainer = document.createElement('div');
      noteContainer.className = 'item-note-inline';
      appendNoteControl(noteContainer, kind, identifier);
      nameCell.appendChild(noteContainer);
    });
  }

  function markupPrice(total, roundToThousands) {
    const price = Number(total || 0) * (1 + markupPercent / 100);
    return roundToThousands && price > 0 ? Math.ceil(price / 1000) * 1000 : price;
  }

  window.calculateGlobalMarkupPrice = markupPrice;

  function addMarkupColumn(table, rows, getMarkupValue) {
    const header = table.querySelector('thead tr');
    if (!header) return;
    header.querySelector('.global-markup-heading')?.remove();
    const heading = document.createElement('th');
    heading.className = 'global-markup-heading';
    heading.textContent = 'Harga + Markup';
    header.appendChild(heading);

    rows.forEach(function (row) {
      row.querySelector('.global-markup-cell')?.remove();
      const cell = document.createElement('td');
      cell.className = 'global-markup-cell money';
      cell.innerHTML = getMarkupValue(row);
      row.appendChild(cell);
    });
  }

  window.calc = function (menu) {
    const result = baseCalc(menu);
    const ingredientsTotal = Number(result.ingredientsTotal || 0);
    const packagingCost = Number(result.packagingCost || 0);
    const operationalCost = ingredientsTotal * operationalCostPercent / 100;
    const total = ingredientsTotal + packagingCost + operationalCost;
    const price = Number(result.price) || 0;
    const food = price ? total / price * 100 : 0;
    const profit = price - total;
    const margin = price ? profit / price * 100 : 0;

    return {
      ...result,
      operationalCost,
      total,
      food,
      profit,
      margin,
      old: total,
      fresh: total,
      oldPct: food,
      newPct: food,
      oldProfit: profit,
      newProfit: profit,
      oldMargin: margin,
      newMargin: margin
    };
  };

  function updateRestoCostDetails() {
    document.querySelectorAll('#resto-body tr[data-code]').forEach(function (row) {
      const menu = menus.find(function (item) {
        return item.code === row.dataset.code;
      });
      const details = row.querySelector('td:nth-child(4) .small');
      if (!menu || !details) return;

      const result = window.calc(menu);
      details.textContent = `Bahan ${money(result.ingredientsTotal)} + Kemasan ${money(result.packagingCost)} + Operasional ${money(result.operationalCost)}`;
    });
  }

  window.renderResto = function () {
    baseRenderResto();
    addMarkupColumn(document.querySelector('#resto table'), document.querySelectorAll('#resto-body tr[data-code]'), function (row) {
      const menu = menus.find(function (item) {
        return item.code === row.dataset.code;
      });
      return menu ? `${money(markupPrice(window.calc(menu).total, false))}<br><small class="small">${markupPercent}% markup</small>` : money(0);
    });
    addItemNotes(document.querySelectorAll('#resto-body tr[data-code]'), 'resto', function (row) {
      return row.dataset.code;
    }, 1);
    updateRestoCostDetails();
  };

  ['search', 'category', 'health', 'ice', 'pack'].forEach(function (id) {
    const control = document.querySelector('#' + id);
    control.addEventListener(id === 'search' ? 'input' : 'change', function () {
      window.renderResto();
    });
  });

  function kitchenCostSummary(product) {
    const yieldAmount = Number(product.yield || 0);
    const baseBatchCost = kitchenRecipeCost(product) * yieldAmount;
    const operationalCost = baseBatchCost * operationalCostPercent / 100;
    const totalBatchCost = baseBatchCost + operationalCost;
    const batchUnit = normalizeUnit(product.yieldUnit || 'gr');
    const saleUnit = normalizeUnit(product.saleUnit || product.yieldUnit || 'gr');
    const saleQuantity = yieldAmount * (unitFactor[batchUnit] || 1) / (unitFactor[saleUnit] || 1);
    const hppPerSaleUnit = saleQuantity > 0 ? totalBatchCost / saleQuantity : 0;
    const displaySaleUnit = product.saleUnit || product.yieldUnit || 'gr';
    const markupSalePrice = markupPrice(hppPerSaleUnit, true);
    const salePrice = kitchenPricingMode === 'bpp'
      ? markupSalePrice
      : kitchenSalePrice(product);
    const profitPerSaleUnit = salePrice - hppPerSaleUnit;

    return {
      baseBatchCost,
      operationalCost,
      totalBatchCost,
      displaySaleUnit,
      salePrice,
      markupSalePrice,
      hppPerSaleUnit,
      hppPercent: salePrice ? hppPerSaleUnit / salePrice * 100 : 0,
      profitPerSaleUnit,
      profitMargin: salePrice ? profitPerSaleUnit / salePrice * 100 : 0
    };
  }

  function updateKitchenRows(rows) {
    rows.forEach(function (row) {
      const product = kitchen.find(function (item) {
        return item.name === row.cells[0]?.textContent.trim();
      });
      if (!product) return;

      const cost = kitchenCostSummary(product);
      row.cells[1].innerHTML = `${Number(product.yield || 0).toLocaleString('id-ID')} ${product.yieldUnit || 'gr'}<br><span class="small">Bahan ${money(cost.baseBatchCost)} + Operasional ${money(cost.operationalCost)}<br>BPP Batch ${money(cost.totalBatchCost)}</span>`;
      row.cells[2].innerHTML = `${money(cost.hppPerSaleUnit)} / ${cost.displaySaleUnit}<br><span class="small">${cost.hppPercent.toFixed(1)}%</span>`;

      const salePrice = row.cells[3].querySelector('strong');
      if (salePrice) salePrice.textContent = `${money(cost.salePrice)} / ${cost.displaySaleUnit}`;

      row.cells[4].innerHTML = `${money(cost.profitPerSaleUnit)} / ${cost.displaySaleUnit}<br><span class="small">${cost.profitMargin.toFixed(1)}%</span>`;
    });
  }

  window.renderKitchen = function () {
    baseRenderKitchen();
    updateKitchenRows(document.querySelectorAll('#kitchen-body tr'));
    addMarkupColumn(document.querySelector('#kitchen table'), document.querySelectorAll('#kitchen-body tr'), function (row) {
      const product = kitchen.find(function (item) {
        return item.name === row.cells[0]?.textContent.trim();
      });
      if (!product) return money(0);
      const cost = kitchenCostSummary(product);
      return `${money(cost.markupSalePrice)} / ${cost.displaySaleUnit}<br><span class="small">${markupPercent}% markup</span>`;
    });
    addItemNotes(document.querySelectorAll('#kitchen-body tr'), 'kitchen', function (row) {
      return row.cells[0]?.textContent.trim();
    }, 0);
  };

  window.createKitchenReport = function (now) {
    const report = baseCreateKitchenReport(now);
    updateKitchenRows(report.querySelectorAll('.jpg-report-table tbody tr'));
    report.querySelectorAll('.jpg-recipe-card').forEach(function (card) {
      const name = card.querySelector('.jpg-recipe-name')?.textContent.trim();
      const product = kitchen.find(function (item) {
        return item.name === name;
      });
      const meta = card.querySelector('.jpg-recipe-meta');
      if (!product || !meta) return;

      const cost = kitchenCostSummary(product);
      meta.textContent = `Yield ${Number(product.yield || 0).toLocaleString('id-ID')} ${product.yieldUnit || 'gr'} · Bahan ${money(cost.baseBatchCost)} + Operasional ${money(cost.operationalCost)} · BPP batch ${money(cost.totalBatchCost)} · Harga jual ${money(cost.salePrice)} / ${cost.displaySaleUnit}`;
    });
    return report;
  };

  window.openDrawer = function (code) {
    baseOpenDrawer(code);
    currentDrawerCode = code;
    document.querySelectorAll('#recipe-lines .recipe-line .small').forEach(function (label) {
      label.textContent = 'Bahan baku dapur';
    });
    refreshDrawerCostDetails();
  };

  function refreshDrawerCostDetails() {
    if (!currentDrawerCode) return;
    const menu = menus.find(function (item) {
      return item.code === currentDrawerCode;
    });
    if (!menu) return;

    const result = window.calc(menu);
    document.querySelector('#drawer-meta').textContent = `${result.code} · ${result.category}`;
    setDrawerHpp(`Total HPP / porsi`, result.total, `Bahan ${money(result.ingredientsTotal)} + Kemasan ${money(result.packagingCost)} + Operasional ${money(result.operationalCost)}`);
  };

  function setDrawerHpp(label, total, detail) {
    const drawer = document.querySelector('#drawer');
    let summary = drawer.querySelector('#drawer-total-hpp');
    if (!summary) {
      summary = document.createElement('div');
      summary.id = 'drawer-total-hpp';
      summary.className = 'drawer-total-hpp';
      drawer.querySelector('#recipe-lines').insertAdjacentElement('afterend', summary);
    }
    const description = document.createElement('span');
    const heading = document.createElement('strong');
    heading.textContent = label;
    const breakdown = document.createElement('small');
    breakdown.textContent = detail;
    description.append(heading, breakdown);
    const amount = document.createElement('strong');
    amount.textContent = money(total);
    summary.replaceChildren(description, amount);
  }

  function clearDrawerHpp() {
    document.querySelector('#drawer-total-hpp')?.remove();
  }

  window.openKitchenRecipe = function (name) {
    clearDrawerHpp();
    baseOpenKitchenRecipe(name);
    const product = kitchen.find(function (item) {
      return item.name === name;
    });
    if (!product) return;

    document.querySelector('#drawer-meta').textContent = `Resep dapur · Yield ${Number(product.yield || 0).toLocaleString('id-ID')} ${product.yieldUnit || 'gr'}`;
  };

  if (baseOpenKitchenMenus) {
    window.openKitchenMenus = function (name) {
      clearDrawerHpp();
      baseOpenKitchenMenus(name);
    };
  }

  function renderCosts() {
    window.renderStats();
    window.renderResto();
    window.renderKitchen();

    if (currentDrawerCode && document.querySelector('#drawer').classList.contains('open')) {
      refreshDrawerCostDetails();
    }
  }

  function setStatus(message) {
    document.querySelectorAll('#operational-cost-status, #kitchen-operational-cost-status').forEach(function (status) {
      status.textContent = message;
    });
  }

  function setMarkupStatus(message) {
    document.querySelectorAll('#markup-cost-status, #kitchen-markup-cost-status').forEach(function (status) {
      status.textContent = message;
    });
  }

  function saveSetting() {
    try {
      localStorage.setItem(storageKey, String(operationalCostPercent));
    } catch (error) {
      setStatus(`Gagal menyimpan pengaturan di perangkat: ${error.message}`);
      return;
    }

    setStatus('Pengaturan tersimpan di perangkat ini dan diterapkan ke semua menu resto & Central Kitchen.');
  }

  function saveMarkupSetting() {
    try {
      localStorage.setItem(markupStorageKey, String(markupPercent));
    } catch (error) {
      setMarkupStatus(`Gagal menyimpan persentase markup di perangkat: ${error.message}`);
      return;
    }

    setMarkupStatus('Persentase markup tersimpan dan menjadi rekomendasi harga untuk Resto & Central Kitchen.');
  }

  function initializeSetting() {
    const resto = document.querySelector('#resto');
    if (!resto) return;

    const style = document.createElement('style');
    style.textContent = '.operational-cost-setting{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 16px;margin:0 0 16px;background:#f4faf7;border:1px solid var(--line);border-radius:8px}.operational-cost-setting label{font-weight:700}.operational-cost-setting input{width:110px;padding:9px;border:1px solid var(--line);border-radius:6px;text-align:right}.operational-cost-notes{flex-basis:100%;color:var(--muted);font-size:11px}.operational-cost-notes summary{width:max-content;cursor:pointer;font-weight:700;color:var(--teal-dark)}.operational-cost-notes-content{display:grid;gap:6px;padding:10px 12px;margin-top:7px;background:#fff;border:1px solid var(--line);border-radius:6px}.operational-cost-notes-content p{margin:0}.operational-cost-status{color:var(--muted);font-size:11px}.item-note-inline{margin-top:5px}.item-note{min-width:120px;max-width:210px}.item-note summary{cursor:pointer;color:var(--teal-dark);font-size:11px;font-weight:700}.item-note-content{display:grid;gap:5px;min-width:180px;padding:7px;background:#f4faf7;border:1px solid var(--line);border-radius:6px}.item-note textarea{box-sizing:border-box;width:100%;min-height:64px;resize:vertical;padding:7px;border:1px solid var(--line);border-radius:5px;font:inherit;font-size:12px}.item-note-status{color:var(--muted);font-size:10px}.drawer-total-hpp{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 0;border-top:1px solid var(--line);font-size:14px}.drawer-total-hpp>span{display:grid;gap:4px}.drawer-total-hpp small{color:var(--muted);font-size:11px}.drawer>.calc{display:none!important}';
    document.head.appendChild(style);

    const setting = document.createElement('div');
    setting.className = 'operational-cost-setting';
    setting.innerHTML = '<label for="operational-cost-percent">Biaya operasional global</label><input id="operational-cost-percent" type="number" min="0" step="0.1" required><label for="markup-cost-percent">Persentase markup harga</label><input id="markup-cost-percent" type="number" min="0" step="0.1" required><details class="operational-cost-notes"><summary>Catatan pengaturan</summary><div class="operational-cost-notes-content"><p>% biaya operasional dihitung dari biaya bahan saja (kemasan tidak dihitung).</p><p>% markup dihitung dari total HPP untuk rekomendasi harga jual Resto & Central Kitchen.</p><p>Harga rekomendasi = total HPP + markup global; harga jual menu resto tidak diubah otomatis.</p><p class="operational-cost-status" id="operational-cost-status" role="status" aria-live="polite"></p><p class="operational-cost-status" id="markup-cost-status" role="status" aria-live="polite"></p></div></details>';

    resto.querySelector('.card-head').after(setting);
    setting.querySelector('#operational-cost-percent').value = String(operationalCostPercent);
    resto.querySelector('.card-head .note').textContent = 'HPP per porsi = bahan + kemasan + biaya operasional global yang dihitung dari biaya bahan saja.';
    const kitchenSection = document.querySelector('#kitchen');
    const kitchenSetting = setting.cloneNode(true);
    kitchenSetting.querySelector('label').htmlFor = 'kitchen-operational-cost-percent';
    kitchenSetting.querySelector('input').id = 'kitchen-operational-cost-percent';
    kitchenSetting.querySelector('#operational-cost-status').id = 'kitchen-operational-cost-status';
    kitchenSetting.querySelector('#markup-cost-percent').id = 'kitchen-markup-cost-percent';
    kitchenSetting.querySelector('label[for="markup-cost-percent"]').htmlFor = 'kitchen-markup-cost-percent';
    kitchenSetting.querySelector('#markup-cost-status').id = 'kitchen-markup-cost-status';
    kitchenSection.querySelector('.card-head').after(kitchenSetting);
    kitchenSection.querySelector('.card-head .note').textContent = 'HPP dapur mencakup biaya bahan dan biaya operasional global yang dihitung dari biaya bahan saja.';
    if (storageReadError) {
      setStatus(`Gagal membaca pengaturan di perangkat: ${storageReadError.message}`);
    } else if (invalidSavedValue) {
      setStatus('Nilai biaya operasional lokal tidak valid; nilai 0% digunakan.');
    } else {
      setStatus('Pengaturan global aktif untuk semua menu resto & Central Kitchen.');
    }
    if (markupStorageReadError) {
      setMarkupStatus(`Gagal membaca persentase markup dari perangkat: ${markupStorageReadError.message}`);
    } else if (invalidSavedMarkup) {
      setMarkupStatus('Nilai markup lokal tidak valid; nilai 0% digunakan.');
    } else {
      setMarkupStatus('Persentase markup global aktif untuk rekomendasi harga Resto & Central Kitchen.');
    }

    const inputs = [
      setting.querySelector('#operational-cost-percent'),
      kitchenSetting.querySelector('#kitchen-operational-cost-percent')
    ];
    inputs.forEach(function (input) {
      input.value = String(operationalCostPercent);
    });
    document.querySelector('#resto-body').addEventListener('click', function (event) {
      const button = event.target.closest('.detail, .recommend-link');
      if (!button) return;
      currentDrawerCode = button.dataset.code;
      refreshDrawerCostDetails();
    });
    document.querySelector('#target').addEventListener('input', refreshDrawerCostDetails);
    const markupInputs = [
      setting.querySelector('#markup-cost-percent'),
      kitchenSetting.querySelector('#kitchen-markup-cost-percent')
    ];
    markupInputs.forEach(function (input) {
      input.value = String(markupPercent);
      input.addEventListener('input', function () {
        input.setCustomValidity('');
      });
      input.addEventListener('change', function () {
        const value = Number(input.value);
        if (!input.value.trim() || !Number.isFinite(value) || value < 0) {
          input.setCustomValidity('Masukkan persentase markup yang valid (0 atau lebih).');
          input.reportValidity();
          input.value = String(markupPercent);
          return;
        }

        input.setCustomValidity('');
        markupPercent = value;
        markupInputs.forEach(function (otherInput) {
          otherInput.value = String(value);
        });
        renderCosts();
        saveMarkupSetting();
      });
    });
    inputs.forEach(function (input) {
      input.addEventListener('input', function () {
        input.setCustomValidity('');
      });
      input.addEventListener('change', function () {
        const value = Number(input.value);
        if (!input.value.trim() || !Number.isFinite(value) || value < 0) {
          input.setCustomValidity('Masukkan persentase biaya operasional yang valid (0 atau lebih).');
          input.reportValidity();
          input.value = String(operationalCostPercent);
          return;
        }

        input.setCustomValidity('');
        operationalCostPercent = value;
        inputs.forEach(function (otherInput) {
          otherInput.value = String(value);
        });
        renderCosts();
        saveSetting();
      });
    });

    renderCosts();
    window.renderDatabase();
  }

  document.addEventListener('DOMContentLoaded', initializeSetting);
})();
