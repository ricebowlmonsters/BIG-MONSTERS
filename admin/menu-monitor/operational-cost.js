(function () {
  'use strict';

  const storageKey = 'rbm_hpp_operational_cost_percent';
  let savedValue = null;
  let storageReadError = null;
  try {
    savedValue = localStorage.getItem(storageKey);
  } catch (error) {
    storageReadError = error;
  }
  let operationalCostPercent = savedValue === null ? 0 : Number(savedValue);
  const invalidSavedValue = savedValue !== null && (!Number.isFinite(operationalCostPercent) || operationalCostPercent < 0);
  let currentDrawerCode = null;

  if (invalidSavedValue) {
    operationalCostPercent = 0;
  }

  const baseCalc = window.calc;
  const baseRenderResto = window.renderResto;
  const baseOpenDrawer = window.openDrawer;
  const baseRenderKitchen = window.renderKitchen;
  const baseOpenKitchenRecipe = window.openKitchenRecipe;
  const baseCreateKitchenReport = window.createKitchenReport;
  const baseDatabaseRows = window.databaseRows;

  window.databaseRows = function () {
    return baseDatabaseRows().map(function (row) {
      if (row.kind !== 'materials-resto' && row.kind !== 'materials-dapur') return row;
      return { ...row, type: 'Bahan baku dapur' };
    });
  };

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

  window.renderResto = function () {
    baseRenderResto();
    document.querySelectorAll('#resto-body tr[data-code]').forEach(function (row) {
      const menu = menus.find(function (item) {
        return item.code === row.dataset.code;
      });
      const details = row.querySelector('td:nth-child(4) .small');
      if (!menu || !details) return;

      const result = window.calc(menu);
      details.textContent = `Bahan ${money(result.ingredientsTotal)} + Kemasan ${money(result.packagingCost)} + Operasional ${money(result.operationalCost)}`;
    });
  };

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
    const salePrice = kitchenPricingMode === 'bpp'
      ? (hppPerSaleUnit > 0 ? Math.ceil(hppPerSaleUnit / 1000) * 1000 : 0)
      : kitchenSalePrice(product);
    const profitPerSaleUnit = salePrice - hppPerSaleUnit;

    return {
      baseBatchCost,
      operationalCost,
      totalBatchCost,
      displaySaleUnit,
      salePrice,
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
    document.querySelector('#drawer-meta').textContent = `${result.code} · ${result.category} · HPP per porsi ${money(result.total)} (bahan ${money(result.ingredientsTotal)} + kemasan ${money(result.packagingCost)} + operasional ${money(result.operationalCost)})`;
    const target = Number(document.querySelector('#target').value) || 35;
    document.querySelector('#recommend').textContent = money(result.total / (target / 100));
  };

  window.openKitchenRecipe = function (name) {
    baseOpenKitchenRecipe(name);
    const product = kitchen.find(function (item) {
      return item.name === name;
    });
    if (!product) return;

    const cost = kitchenCostSummary(product);
    document.querySelector('#drawer-meta').textContent = `Resep dapur · Yield ${Number(product.yield || 0).toLocaleString('id-ID')} ${product.yieldUnit || 'gr'} · Bahan ${money(cost.baseBatchCost)} + Operasional ${money(cost.operationalCost)} · BPP batch ${money(cost.totalBatchCost)}`;
  };

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

  function saveSetting() {
    try {
      localStorage.setItem(storageKey, String(operationalCostPercent));
    } catch (error) {
      setStatus(`Gagal menyimpan pengaturan di perangkat: ${error.message}`);
      return;
    }

    setStatus('Pengaturan tersimpan di perangkat ini dan diterapkan ke semua menu resto & Central Kitchen.');
  }

  function initializeSetting() {
    const resto = document.querySelector('#resto');
    if (!resto) return;

    const style = document.createElement('style');
    style.textContent = '.operational-cost-setting{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 16px;margin:0 0 16px;background:#f4faf7;border:1px solid var(--line);border-radius:8px}.operational-cost-setting label{font-weight:700}.operational-cost-setting input{width:110px;padding:9px;border:1px solid var(--line);border-radius:6px;text-align:right}.operational-cost-setting .note{margin:0}.operational-cost-status{flex-basis:100%;margin:0;color:var(--muted);font-size:11px}';
    document.head.appendChild(style);

    const setting = document.createElement('div');
    setting.className = 'operational-cost-setting';
    setting.innerHTML = '<label for="operational-cost-percent">Biaya operasional global</label><input id="operational-cost-percent" type="number" min="0" step="0.1" required><span>% dari biaya bahan saja untuk Resto & Central Kitchen (kemasan tidak dihitung)</span><p class="operational-cost-status" id="operational-cost-status" role="status" aria-live="polite"></p>';

    resto.querySelector('.card-head').after(setting);
    setting.querySelector('#operational-cost-percent').value = String(operationalCostPercent);
    resto.querySelector('.card-head .note').textContent = 'HPP per porsi = bahan + kemasan + biaya operasional global yang dihitung dari biaya bahan saja.';
    const kitchenSection = document.querySelector('#kitchen');
    const kitchenSetting = setting.cloneNode(true);
    kitchenSetting.querySelector('label').htmlFor = 'kitchen-operational-cost-percent';
    kitchenSetting.querySelector('input').id = 'kitchen-operational-cost-percent';
    kitchenSetting.querySelector('p').id = 'kitchen-operational-cost-status';
    kitchenSection.querySelector('.card-head').after(kitchenSetting);
    kitchenSection.querySelector('.card-head .note').textContent = 'HPP dapur mencakup biaya bahan dan biaya operasional global yang dihitung dari biaya bahan saja.';
    if (storageReadError) {
      setStatus(`Gagal membaca pengaturan di perangkat: ${storageReadError.message}`);
    } else if (invalidSavedValue) {
      setStatus('Nilai biaya operasional lokal tidak valid; nilai 0% digunakan.');
    } else {
      setStatus('Pengaturan global aktif untuk semua menu resto & Central Kitchen.');
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
