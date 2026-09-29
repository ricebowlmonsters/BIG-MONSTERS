(function(global) {
  'use strict';

  var OUTLET_ID = 'central-kitchen';
  var ORDERS_PATH = 'rbm_pro/central_kitchen/orders';
  var CATALOG_PATH = 'rbm_pro/central_kitchen/catalog';

  function toItems(value) {
    if (!value) return [];
    return (Array.isArray(value) ? value : Object.keys(value).map(function(key) { return value[key]; })).map(function(item) {
      var fulfilled = item.shippedQuantity !== undefined && item.shippedQuantity !== null;
      var requested = Number(item.quantity) || 0;
      var shipped = fulfilled ? Number(item.shippedQuantity) || 0 : 0;
      return {
        name: item.name || 'Barang',
        price: Number(item.unitPrice) || 0,
        quantity: fulfilled ? shipped : requested,
        requestedQuantity: requested,
        shippedQuantity: fulfilled ? shipped : null,
        category: item.category || item.kategori || ''
      };
    });
  }

  function normalize(firebaseId, order) {
    var fulfilled = order.status === 'fulfilled';
    var items = toItems(order.items);
    var itemTotal = items.reduce(function(total, item) { return total + item.price * item.quantity; }, 0);
    var amount = fulfilled ? Number(order.actualTotal) : Number(order.requestTotal);
    if (!Number.isFinite(amount)) amount = itemTotal;
    return {
      id: order.number || firebaseId,
      firebaseId: firebaseId,
      number: order.number || firebaseId,
      centralKitchen: true,
      outletId: order.outletId || '',
      outletName: order.outletName || '',
      date: fulfilled ? Number(order.shippedAt || order.createdAt) : Number(order.createdAt),
      createdAt: Number(order.createdAt) || 0,
      shippedAt: Number(order.shippedAt) || 0,
      status: fulfilled ? 'Sudah Dibayar' : 'Menunggu',
      originalStatus: order.status || 'pending',
      source: 'Central Kitchen',
      cashier: order.processedBy || order.createdBy || '',
      createdBy: order.createdBy || '',
      processedBy: order.processedBy || '',
      note: order.note || '',
      items: items,
      payment: { total: amount, method: 'PO Central Kitchen', discount: 0, tax: 0 }
    };
  }

  function inRange(order, start, end, field) {
    var timestamp = Number(order[field]) || 0;
    return timestamp >= start && timestamp <= end;
  }

  async function readFulfilled(db, start, end) {
    var snapshot = await db.ref(ORDERS_PATH).orderByChild('shippedAt').startAt(start).endAt(end).once('value');
    var values = snapshot.val() || {};
    return Object.keys(values).filter(function(key) { return values[key] && values[key].status === 'fulfilled'; })
      .map(function(key) { return normalize(key, values[key]); })
      .sort(function(a, b) { return b.date - a.date; });
  }

  async function readTransactions(db, start, end) {
    var snapshot = await db.ref(ORDERS_PATH).orderByChild('createdAt').startAt(start).endAt(end).once('value');
    var values = snapshot.val() || {};
    return Object.keys(values).filter(function(key) { return values[key] && inRange(values[key], start, end, 'createdAt'); })
      .map(function(key) {
        var transaction = normalize(key, values[key]);
        transaction.date = transaction.createdAt;
        return transaction;
      })
      .sort(function(a, b) { return b.date - a.date; });
  }

  async function readCatalogCategories(db) {
    var snapshot = await db.ref(CATALOG_PATH).once('value');
    var catalog = snapshot.val() || {};
    var categories = {};
    Object.keys(catalog).forEach(function(id) {
      var item = catalog[id];
      if (item && item.name && (item.category || item.kategori)) {
        categories[String(item.name).trim().toLowerCase()] = item.category || item.kategori;
      }
    });
    return categories;
  }

  function addOutletOption(select, label) {
    if (!select || Array.from(select.options).some(function(option) { return option.value === OUTLET_ID; })) return;
    var option = document.createElement('option');
    option.value = OUTLET_ID;
    option.textContent = label || 'Central Kitchen';
    select.appendChild(option);
  }

  global.CentralKitchenReports = {
    outletId: OUTLET_ID,
    addOutletOption: addOutletOption,
    readFulfilled: readFulfilled,
    readTransactions: readTransactions,
    readCatalogCategories: readCatalogCategories
  };
})(window);