/**
 * Main Application JavaScript
 * Mengelola logika aplikasi input point dan klaim VCR
 */

// Konfigurasi
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzhhEssVNQBCRip4OVNh2rIOB9ToRiTad7tmZgjUTsmxgN4gT9x2LCINvvD2YD4tK5K/exec',
  STORAGE_KEYS: {
    USER: 'rbm_user',
    POINTS_HISTORY: 'rbm_points_history',
    VOUCHERS: 'rbm_vouchers'
  }
};

// Simple hardcoded credentials (for on-device auth only)
const AUTH = {
  USERS: [
    { username: 'RBMPONTI', password: '131024', nama: 'RBM PONTI', phone: '0000000001', points: 0 },
    { username: 'RBMDARMO', password: '211224', nama: 'RBM DARMO', phone: '0000000002', points: 0 }
  ],
  login(username, password) {
    const found = this.USERS.find(u => u.username === username && u.password === password);
    if (!found) return null;
    const sessionUser = { username: found.username, nama: found.nama, phone: found.phone, points: found.points };
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(sessionUser));
    return sessionUser;
  },
  logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  }
};

// State management
class AppState {
  constructor() {
    this.user = this.loadUser();
    this.pointsHistory = this.loadPointsHistory();
    this.vouchers = this.loadVouchers();
  }
  loadUser() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  }
  loadPointsHistory() {
    const history = localStorage.getItem(CONFIG.STORAGE_KEYS.POINTS_HISTORY);
    return history ? JSON.parse(history) : [];
  }
  loadVouchers() {
    const vouchers = localStorage.getItem(CONFIG.STORAGE_KEYS.VOUCHERS);
    return vouchers ? JSON.parse(vouchers) : [];
  }
  saveUser(user) {
    this.user = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
  }
  savePointsHistory(history) {
    this.pointsHistory = history;
    localStorage.setItem(CONFIG.STORAGE_KEYS.POINTS_HISTORY, JSON.stringify(history));
  }
  saveVouchers(vouchers) {
    this.vouchers = vouchers;
    localStorage.setItem(CONFIG.STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers));
  }
  addPoints(amount, source = 'manual') {
    if (!this.user) return false;
    const pointsEntry = {
      id: Date.now(),
      amount: amount,
      source: source,
      timestamp: new Date().toISOString(),
      userId: this.user.phone
    };
    this.pointsHistory.unshift(pointsEntry);
    this.user.points = (this.user.points || 0) + amount;
    this.saveUser(this.user);
    this.savePointsHistory(this.pointsHistory);
    return true;
  }
  addVoucher(voucherData) {
    const voucher = {
      id: Date.now(),
      ...voucherData,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    this.vouchers.unshift(voucher);
    this.saveVouchers(this.vouchers);
    return voucher;
  }
}

// API Service
class APIService {
  static async findUserByPhone(phone) {
    try {
      const response = await fetch(`${CONFIG.SCRIPT_URL}?phone=${encodeURIComponent(phone)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }

  // ===== FUNGSI YANG DIPERBAIKI #1 =====
static async addPoints(phone, nominal, points, source, operator, customerName) { // Tambahkan 'customerName'
  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'addPoints',
        phone: phone,
        nominal: nominal,
        points: points,
        source: source,     // 'source' sekarang dinamis
        operator: operator, // Kirim nama operator
        nama: customerName  // Kirim nama customer
      })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API Error:', error);
    return { status: 'error', message: 'Koneksi gagal' };
  }
}

  static async claimVoucher(phone, voucherCode) {
    try {
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'claimVoucher',
          phone: phone,
          voucherCode: voucherCode
        })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }
  
  static async getUserData(phone) {
    try {
      const response = await fetch(`${CONFIG.SCRIPT_URL}?phone=${phone}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }

  static async validateClaimVoucher(claimData, operator) {
    try {
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'validateClaimVoucher',
          claimData: claimData,
          operator: operator
        })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal', code: 'CONNECTION_ERROR' };
    }
  }

  static async generateClaimCode(phone, itemId, itemName) {
    try {
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'generateClaimCode',
          phone: phone,
          itemId: itemId,
          itemName: itemName
        })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal' };
    }
  }

  static async validateClaimCode(code, operator) {
    try {
      const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'validateClaimCode',
          code: code,
          operator: operator
        })
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error:', error);
      return { status: 'error', message: 'Koneksi gagal', code: 'CONNECTION_ERROR' };
    }
  }
}

// UI Helper
class UIHelper {
  static showMessage(message, type = 'info', duration = 3000) {
    const messageEl = document.createElement('div');
    messageEl.className = `status-${type} fade-in`;
    messageEl.textContent = message;
    const content = document.querySelector('.content');
    content.insertBefore(messageEl, content.firstChild);
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, duration);
  }
  static showModal(title, content, actions = []) {
    const modalHtml = `
      <div class="modal-overlay show" id="custom-modal">
        <div class="modal">
          <h3 class="modal-title">${title}</h3>
          <div class="modal-content">${content}</div>
          <div class="modal-actions">
            ${actions.map(action => 
              `<button class="btn ${action.class || 'btn-primary'}" data-action="${action.action}">${action.text}</button>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) { existingModal.remove(); }
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('custom-modal');
    const actionButtons = modal.querySelectorAll('[data-action]');
    return new Promise((resolve) => {
      actionButtons.forEach(button => {
        button.addEventListener('click', () => {
          modal.remove();
          resolve(button.dataset.action);
        });
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve('close');
        }
      });
    });
  }
  static formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
  static formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
  }
}

// Widget Status Online & Notifikasi
class OnlineWidget {
  static init(user) {
    if (document.getElementById('rbm-online-widget')) return;

    let registeredUsers = [];
    try { registeredUsers = JSON.parse(localStorage.getItem('rbm_users') || '[]'); } catch (e) {}
    const currentUsername = String(user.username || '').toLowerCase();
    const isDeveloperUser = currentUsername === 'burhan';
    const isRegisteredUser = isDeveloperUser || registeredUsers.some(item => String(item && item.username || '').toLowerCase() === currentUsername);
    if (!isRegisteredUser) return;
    
    // Aktifkan tracking Firebase jika tersedia
    if (localStorage.getItem('rbm_session_id') && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.trackPresence) {
      FirebaseStorage.trackPresence(user.username, user.nama, user.role, localStorage.getItem('rbm_session_id'));
    }

    const style = document.createElement('style');
    style.innerHTML = `
      #rbm-online-widget { position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px; z-index: 9999; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .rbm-widget-box { background: white; border-radius: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 10px 16px; display: flex; align-items: center; gap: 8px; cursor: pointer; border: 1px solid #e5e7eb; transition: all 0.2s; position: relative; }
      .rbm-widget-box:hover { background: #f9fafb; transform: translateY(-2px); }
      .rbm-notif-badge { background: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; position: absolute; top: -5px; right: -5px; display: none; }
      .rbm-chat-badge { background: #ef4444; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; position: absolute; top: -5px; right: -5px; display: none; }
      .rbm-online-dot { width: 10px; height: 10px; background: #10b981; border-radius: 50%; box-shadow: 0 0 4px #10b981; }
      #rbm-online-dropdown { position: absolute; bottom: 50px; right: 0; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 220px; padding: 12px; display: none; border: 1px solid #e5e7eb; flex-direction: column; gap: 5px; max-height: 300px; overflow-y: auto; cursor: default; }
      .rbm-online-user { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 8px 4px; border-bottom: 1px solid #f3f4f6; color: #374151; font-weight: 500; }
      .rbm-online-user:last-child { border-bottom: none; }
      #rbm-chat-modal { position: fixed; right: 20px; bottom: 75px; width: min(340px, calc(100vw - 32px)); background: white; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; z-index: 10000; }
      #rbm-chat-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #4C2A85; color: white; font-weight: 700; font-size: 13px; }
      #rbm-chat-pinned { display: none; max-height: 96px; overflow-y: auto; padding: 8px 10px; background: #fffbeb; border-bottom: 1px solid #fcd34d; flex-direction: column; gap: 6px; }
      #rbm-chat-users { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 11px; }
      #rbm-chat-messages { height: 220px; overflow-y: auto; padding: 10px; background: #f8fafc; display: flex; flex-direction: column; gap: 6px; }
      .rbm-chat-message-wrap { max-width: 88%; display: flex; flex-direction: column; gap: 2px; }
      .rbm-chat-message { padding: 7px 9px; border-radius: 10px; font-size: 12px; line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; }
      .rbm-chat-message.mine { align-self: flex-end; background: #4C2A85; color: white; border-bottom-right-radius: 3px; }
      .rbm-chat-message.theirs { align-self: flex-start; background: white; color: #374151; border: 1px solid #e5e7eb; border-bottom-left-radius: 3px; }
      #rbm-chat-form { display: flex; gap: 6px; padding: 8px; border-top: 1px solid #e5e7eb; }
      #rbm-chat-input { min-width: 0; flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px; font: inherit; font-size: 12px; }
      #rbm-chat-send { border: 0; border-radius: 8px; padding: 0 12px; background: #4C2A85; color: white; cursor: pointer; font-weight: 700; }
      
      #rbm-notif-dropdown { position: absolute; bottom: 50px; right: 120px; background: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 280px; padding: 12px; display: none; border: 1px solid #e5e7eb; flex-direction: column; gap: 5px; max-height: 350px; overflow-y: auto; cursor: default; }
      .rbm-notif-item { padding: 10px; border-radius: 6px; background: #f9fafb; border: 1px solid #e5e7eb; font-size: 12px; cursor: pointer; transition: background 0.2s; line-height: 1.4; }
      .rbm-notif-item:hover { background: #f3f4f6; }
    `;
    document.head.appendChild(style);

    const widget = document.createElement('div');
    widget.id = 'rbm-online-widget';
    widget.innerHTML = 
      '<div class="rbm-widget-box" id="rbm-notif-btn" onclick="document.getElementById(\'rbm-notif-dropdown\').style.display = document.getElementById(\'rbm-notif-dropdown\').style.display === \'flex\' ? \'none\' : \'flex\'">' +
        '<span style="font-size: 16px;">🔔</span>' +
        '<span style="font-size: 13px; font-weight: 600; color: #374151;">Notifikasi</span>' +
        '<div class="rbm-notif-badge" id="rbm-notif-badge">0</div>' +
        '<div id="rbm-notif-dropdown" onclick="event.stopPropagation()">' +
          '<div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Pemberitahuan</div>' +
          '<div id="rbm-notif-list">Memuat...</div>' +
        '</div>' +
      '</div>' +
      '<div class="rbm-widget-box" id="rbm-online-btn" onclick="document.getElementById(\'rbm-online-dropdown\').style.display = document.getElementById(\'rbm-online-dropdown\').style.display === \'flex\' ? \'none\' : \'flex\'">' +
        '<div class="rbm-online-dot"></div>' +
        '<span style="font-size: 13px; font-weight: 600; color: #374151;" id="rbm-online-count">1 Online</span>' +
        '<div id="rbm-online-dropdown" onclick="event.stopPropagation()">' +
          '<div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">Aktivitas Pengguna</div>' +
          '<div id="rbm-online-list">Memuat...</div>' +
        '</div>' +
      '</div>' +
      '<div class="rbm-widget-box" id="rbm-chat-btn">' +
        '<span style="font-size: 16px;">💬</span><span style="font-size: 13px; font-weight: 600; color: #374151;">Chat</span><span class="rbm-chat-badge" id="rbm-chat-badge">0</span>' +
      '</div>' +
      '<div id="rbm-chat-modal">' +
        '<div id="rbm-chat-header"><span id="rbm-chat-title">Chat Monsters</span><button id="rbm-chat-close" type="button" style="border:0;background:none;color:white;font-size:18px;cursor:pointer;">×</button></div>' +
        '<div id="rbm-chat-pinned"></div>' +
        '<div id="rbm-chat-messages"><div style="color:#9ca3af;text-align:center;font-size:12px;margin:auto;">Belum ada pesan.</div></div>' +
        '<form id="rbm-chat-form"><input id="rbm-chat-input" autocomplete="off" placeholder="Tulis pesan..."><button id="rbm-chat-send" type="submit">Kirim</button></form>' +
      '</div>';
    document.body.appendChild(widget);

    document.addEventListener('click', function(event) {
      const btn = document.getElementById('rbm-online-btn');
      const btnNotif = document.getElementById('rbm-notif-btn');
      const dropdown = document.getElementById('rbm-online-dropdown');
      const dropdownNotif = document.getElementById('rbm-notif-dropdown');
      if (btn && dropdown && !btn.contains(event.target)) { dropdown.style.display = 'none'; }
      if (btnNotif && dropdownNotif && !btnNotif.contains(event.target)) { dropdownNotif.style.display = 'none'; }
    });

    if (typeof firebase !== 'undefined' && firebase.database) {
      setTimeout(() => {
        const db = firebase.database();
        const currentUsername = String(user.username || '');
        const isDeveloper = currentUsername.toLowerCase() === 'burhan';
        const registeredUsernames = new Set(registeredUsers.map(item => String(item && item.username || '').toLowerCase()));
        const globalChatRoot = db.ref('registered_user_chat');
        const globalChatRef = globalChatRoot.limitToLast(100);
        const chatModal = document.getElementById('rbm-chat-modal');
        const chatPinned = document.getElementById('rbm-chat-pinned');
        const chatMessages = document.getElementById('rbm-chat-messages');
        const chatInput = document.getElementById('rbm-chat-input');
        const chatBadge = document.getElementById('rbm-chat-badge');
        const chatReadKey = 'rbm_chat_last_read_' + currentUsername.toLowerCase();
        let lastChatReadAt = Number(localStorage.getItem(chatReadKey) || 0);
        const updateChatBadge = count => {
          if (!chatBadge) return;
          chatBadge.textContent = count > 99 ? '99+' : String(count);
          chatBadge.style.display = count > 0 ? 'inline-block' : 'none';
        };
        const markChatRead = () => {
          lastChatReadAt = Date.now();
          localStorage.setItem(chatReadKey, String(lastChatReadAt));
          updateChatBadge(0);
        };
        const renderChatMessages = snapshot => {
          chatMessages.innerHTML = '';
          chatPinned.innerHTML = '';
          chatPinned.style.display = 'none';
          const messages = snapshot.val() || {};
          let unreadCount = 0;
          Object.entries(messages).sort((a, b) => {
            if (!!b[1].pinned !== !!a[1].pinned) return b[1].pinned ? 1 : -1;
            return (a[1].timestamp || 0) - (b[1].timestamp || 0);
          }).forEach(([key, message]) => {
            const senderUsername = String(message.username || '').toLowerCase();
            const isAllowedChatSender = senderUsername === 'burhan' || registeredUsernames.has(senderUsername);
            if (!isDeveloper && !isAllowedChatSender) return;
            if (senderUsername !== currentUsername && Number(message.timestamp || 0) > lastChatReadAt) unreadCount++;
            const wrap = document.createElement('div');
            wrap.className = 'rbm-chat-message-wrap';
            wrap.style.alignSelf = message.username === currentUsername ? 'flex-end' : 'flex-start';
            const sender = document.createElement('small');
            sender.textContent = message.senderName || message.sender || 'User';
            sender.style.cssText = 'color:#6b7280;font-size:10px;';
            const item = document.createElement('div');
            item.className = 'rbm-chat-message ' + (message.username === currentUsername ? 'mine' : 'theirs');
            item.textContent = message.text || '';
            wrap.appendChild(sender);
            wrap.appendChild(item);
            if (isDeveloper) {
              const actions = document.createElement('div');
              actions.style.cssText = 'display:flex;gap:8px;align-self:flex-start;';
              const pinButton = document.createElement('button');
              pinButton.type = 'button';
              pinButton.textContent = message.pinned ? 'Lepas Sematan' : 'Sematkan';
              pinButton.style.cssText = 'border:0;background:none;color:#b45309;font-size:10px;cursor:pointer;padding:0;';
              pinButton.addEventListener('click', () => globalChatRoot.child(key).update({ pinned: !message.pinned }));
              const deleteButton = document.createElement('button');
              deleteButton.type = 'button';
              deleteButton.textContent = 'Hapus';
              deleteButton.style.cssText = 'border:0;background:none;color:#dc2626;font-size:10px;cursor:pointer;padding:0;';
              deleteButton.addEventListener('click', () => globalChatRoot.child(key).remove());
              actions.appendChild(pinButton);
              actions.appendChild(deleteButton);
              wrap.appendChild(actions);
            }
            if (message.pinned) {
              chatPinned.style.display = 'flex';
              chatPinned.appendChild(wrap);
            } else {
              chatMessages.appendChild(wrap);
            }
          });
          updateChatBadge(unreadCount);
          chatMessages.scrollTop = chatMessages.scrollHeight;
        };
        document.getElementById('rbm-chat-btn').addEventListener('click', event => {
          event.stopPropagation();
          markChatRead();
          chatModal.style.display = chatModal.style.display === 'flex' ? 'none' : 'flex';
          chatInput.focus();
        });
        document.getElementById('rbm-chat-close').addEventListener('click', () => { chatModal.style.display = 'none'; });
        document.getElementById('rbm-chat-form').addEventListener('submit', event => {
          event.preventDefault();
          const text = chatInput.value.trim();
          if (!text) return;
          globalChatRoot.push({ username: currentUsername, senderName: user.nama || currentUsername, text: text, timestamp: firebase.database.ServerValue.TIMESTAMP }).then(() => { chatInput.value = ''; });
        });
        globalChatRef.on('value', renderChatMessages);
        
        // --- Logika Notifikasi Cerdas ---
        const isOwner = user.role === 'owner' || (user.username || '').toLowerCase() === 'burhan';
        const isManager = user.role === 'manager';
        
        const processNotifs = () => {
            let unreadCount = 0; let notifHtml = '';
            
            const checkData = (dataMap, typeStr) => {
                if (!dataMap) return;
                Object.keys(dataMap).forEach(key => {
                    const item = dataMap[key];
                    if (isOwner) {
                        if ((!item.status || item.status === 'pending') && !item.viewedByOwner) {
                            unreadCount++;
                            notifHtml += `<div class="rbm-notif-item" onclick="window.location.href='rbm-pengajuan.html'"><b>Pengajuan Baru Masuk</b><br>Outlet: ${item.outlet || 'Umum'}</div>`;
                        }
                    } else if (isManager) {
                        if (item.outlet === user.outlet && item.status === 'approved' && !item.viewedByManager) {
                            unreadCount++;
                            notifHtml += `<div class="rbm-notif-item" onclick="window.markManagerNotifRead('${typeStr}', '${key}')"><b style="color:#059669;">✅ Pengajuan Disetujui!</b><br>Silakan klik pesan ini.</div>`;
                        }
                    }
                });
            };

            const render = () => {
                unreadCount = 0; notifHtml = '';
                checkData(window._notifTf, 'tf');
                checkData(window._notifPc, 'pc');
                
                const badge = document.getElementById('rbm-notif-badge');
                const list = document.getElementById('rbm-notif-list');
                if (badge) { badge.textContent = unreadCount; badge.style.display = unreadCount > 0 ? 'block' : 'none'; }
                if (list) { list.innerHTML = notifHtml || '<div style="color:#9ca3af; text-align:center; padding:10px;">Tidak ada notifikasi</div>'; }
            };

            db.ref('rbm_pro/pengajuan_tf').on('value', snap => { window._notifTf = snap.val(); render(); });
            db.ref('rbm_pro/petty_cash/pengajuan').on('value', snap => { window._notifPc = snap.val(); render(); });
            
            window.markManagerNotifRead = (type, key) => {
                const path = type === 'tf' ? `rbm_pro/pengajuan_tf/${key}` : `rbm_pro/petty_cash/pengajuan/${key}`;
                db.ref(path).update({ viewedByManager: true });
                
                if (typeof CustomUI !== 'undefined') {
                    CustomUI.alert("Tunggu pemrosesan dana dan kelola dana dengan sebaik-baiknya.", "Pesan dari Owner");
                } else if (typeof UIHelper !== 'undefined') {
                    UIHelper.showModal(
                        'Pesan dari Owner',
                        'Tunggu pemrosesan dana dan kelola dana dengan sebaik-baiknya.',
                        [{ text: 'Tutup', action: 'close', class: 'btn-primary' }]
                    );
                } else {
                    alert("Pesan dari Owner:\n\nTunggu pemrosesan dana dan kelola dana dengan sebaik-baiknya.");
                }
            };
        };
        processNotifs();

        db.ref('app_state/presence').on('value', snap => {
          const val = snap.val() || {};
          const now = Date.now();
          let count = 0; let html = '';
          Object.keys(val).forEach(uid => {
            const u = val[uid];
            const lastSeen = u.info && Number(u.info.lastSeen);
            const isRecentlyActive = lastSeen && now - lastSeen <= 90000;
            if (u.connections && Object.keys(u.connections).length > 0 && isRecentlyActive) {
              count++;
              const n = u.info ? (u.info.nama || u.info.username) : uid;
              html += '<div class="rbm-online-user"><div class="rbm-online-dot"></div> ' + n + '</div>';
            } else if (u.connections || u.info) {
              db.ref('app_state/presence/' + uid).remove();
            }
          });
          const cEl = document.getElementById('rbm-online-count');
          const lEl = document.getElementById('rbm-online-list');
          if (cEl) cEl.textContent = count + ' Online';
          if (lEl) lEl.innerHTML = html || '<div style="font-size:12px; color:#9ca3af;">Tidak ada</div>';
        });
      }, 1500);
    }
  }
}

// Initialize app
let appState;

function generatePhoneVariants(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D+/g, '');
  if (!digits) return [];
  const variants = new Set();
  variants.add(String(rawPhone).trim());
  variants.add(digits);
  const with0 = digits.startsWith('0') ? digits : (digits.startsWith('62') ? '0' + digits.slice(2) : (digits.startsWith('8') ? '0' + digits : '0' + digits));
  variants.add(with0);
  const no0 = with0.startsWith('0') ? with0.slice(1) : with0;
  variants.add('62' + no0);
  variants.add('+62' + no0);
  return Array.from(variants);
}

document.addEventListener('DOMContentLoaded', () => {
  appState = new AppState();
  const here = window.location.pathname.split('/').pop();
  if (!appState.user) {
    if (here !== 'login.html') {
      window.location.href = 'login.html';
      return;
    }
    return;
  }
  if (!localStorage.getItem('rbm_session_id')) {
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('rbm_session_id', sessionId);
    if (typeof FirebaseStorage !== 'undefined' && FirebaseStorage.setActiveSession) {
      FirebaseStorage.setActiveSession(appState.user.username, sessionId);
    }
  }
  // Satu akun satu perangkat: jika akun yang sama login di perangkat lain, sesi ini tidak valid
  if (here !== 'login.html' && typeof FirebaseStorage !== 'undefined' && FirebaseStorage.getActiveSession) {
    FirebaseStorage.getActiveSession(appState.user.username).then(function(active) {
      if (!active || !active.sessionId) return;
      var mySessionId = localStorage.getItem('rbm_session_id');
      if (mySessionId && active.sessionId !== mySessionId) {
        if (typeof FirebaseStorage.clearPresence === 'function') {
          FirebaseStorage.clearPresence(appState.user.username);
        }
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem('rbm_session_id');
        window.location.href = 'login.html';
      }
    }).catch(function() {});
  }

  OnlineWidget.init(appState.user);

  const currentPage = window.location.pathname.split('/').pop();
  initializePage(currentPage);
});

function initializePage(page) {
  switch (page) {
    case 'input-point.html':
      initializeInputPoint();
      break;
    case 'claim-vcr.html':
      initializeClaimVCR();
      break;
    case 'index.html':
    case 'login.html':
    case 'orders.html':
    case 'manage-menu.html':
    case 'revenue-report.html':
    case 'qr_generator.html':
    case 'settings.html':
      // Halaman ini tidak memerlukan inisialisasi khusus di app.js
      break;
    default:
      // console.log('Unknown page:', page);
  }
}

function initializeInputPoint() {
  updatePointsDisplay();
  const lookupBtn = document.getElementById('btn-lookup-customer');
  const phoneInput = document.getElementById('customer-phone');
  const infoBox = document.getElementById('customer-info');
  const formCard = document.getElementById('nominal-form-card');
  const selName = document.getElementById('sel-cust-name');
  const selPhone = document.getElementById('sel-cust-phone');
  const selPoints = document.getElementById('sel-cust-points');
  const custNameInput = document.getElementById('input-cust-name');
  const nominalInput = document.getElementById('input-nominal');
  const pointsInput = document.getElementById('input-points');
  const submitBtn = document.getElementById('btn-submit-points');

  if (lookupBtn && phoneInput) {
    const doLookup = async () => {
      const phone = (phoneInput.value || '').trim();
      if (!phone) {
        UIHelper.showMessage('Masukkan nomor telepon customer', 'error');
        return;
      }
      infoBox.style.display = 'block';
      infoBox.className = 'status-info';
      infoBox.textContent = 'Mencari customer...';
      if (custNameInput) custNameInput.value = 'Mencari...'; // [BARU] Indikator visual di kolom nama
      const variants = generatePhoneVariants(phone);
      
      // [PERBAIKAN] Gunakan Promise.all untuk pencarian paralel (lebih cepat)
      const searchPromises = variants.map(v => APIService.findUserByPhone(v).then(res => ({ v, res })));
      const results = await Promise.all(searchPromises);
      
      // Cari hasil yang sukses dari semua request
      const match = results.find(item => item.res && item.res.status === 'success' && item.res.data);
      
      let found = null;
      if (match) {
        found = { result: match.res, usedPhone: match.v };
      }

      if (found) {
        const user = found.result.data;
        // [PERBAIKAN] Ambil nama dengan lebih robust (handle nama/name/Name/username)
        // Hapus default 'Pelanggan' dan validasi username agar tidak mengambil angka 0
        let userName = user.nama || user.name || user.Name || '';
        if (!userName && user.username && user.username !== '0' && user.username !== 0) {
            userName = user.username;
        }

        infoBox.className = 'status-success';
        infoBox.textContent = `Ditemukan: ${userName || '-'} • Poin: ${UIHelper.formatNumber(user.points_sisa ?? user.points ?? 0)}`;
        selName.textContent = userName || '-';
        selPhone.textContent = user.phone || found.usedPhone;
        selPoints.textContent = UIHelper.formatNumber(user.points_sisa ?? user.points ?? 0);
        
        if (custNameInput) {
            custNameInput.value = userName;
            // Jika nama kosong, buka kunci input agar bisa diisi manual
            if (!userName) {
                custNameInput.removeAttribute('readonly');
                custNameInput.style.backgroundColor = '#ffffff';
                custNameInput.style.cursor = 'text';
                custNameInput.placeholder = 'Nama tidak ditemukan (Isi Manual)';
            } else {
                custNameInput.setAttribute('readonly', 'true');
                custNameInput.style.backgroundColor = '#f3f4f6';
                custNameInput.style.cursor = 'default';
            }
        }
        
        formCard.style.display = 'block';
        formCard.dataset.targetPhone = user.phone || found.usedPhone;
      } else {
        infoBox.className = 'status-error';
        infoBox.textContent = 'Customer tidak ditemukan';
        formCard.style.display = 'none';
        formCard.dataset.targetPhone = '';
        if (custNameInput) custNameInput.value = ''; // [BARU] Reset jika tidak ketemu
      }
    };
    lookupBtn.addEventListener('click', doLookup);
    phoneInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') doLookup(); });
  }

  if (nominalInput && pointsInput) {
    const recalc = () => {
      const nominal = parseInt(nominalInput.value || '0', 10) || 0;
      // Perhitungan poin baru: 25 poin untuk setiap kelipatan Rp 25.000
      pointsInput.value = String(Math.floor(nominal / 25000) * 25);
    };
    nominalInput.addEventListener('input', recalc);
  }

  // ===== BAGIAN YANG DIPERBAIKI #2 =====
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const targetPhone = formCard?.dataset?.targetPhone || '';
      if (!targetPhone) {
        UIHelper.showMessage('Cari customer terlebih dahulu', 'error');
        return;
      }
      const nominal = parseInt(nominalInput.value || '0', 10) || 0;
      const points = parseInt(pointsInput.value || '0', 10) || 0;
      if (nominal <= 0 || points <= 0) {
        UIHelper.showMessage('Nominal dan point harus lebih dari 0', 'error');
        return;
      }
      const confirm = await UIHelper.showModal(
        'Konfirmasi',
        `Tambah ${UIHelper.formatNumber(points)} point (dari nominal Rp ${UIHelper.formatNumber(nominal)}) untuk ${custNameInput && custNameInput.value ? custNameInput.value : selName.textContent}?`,
        [
          { text: 'Batal', action: 'cancel', class: 'btn-secondary' },
          { text: 'Ya, Tambahkan', action: 'confirm', class: 'btn-primary' }
        ]
      );
      if (confirm !== 'confirm') return;

      UIHelper.showMessage('Memproses input point...', 'info');
      const loggedInUser = appState.user.username || 'unknown_kasir'; // Dapatkan nama kasir
       const result = await APIService.addPoints(targetPhone, nominal, points, `Nominal: ${nominal}`, loggedInUser, custNameInput && custNameInput.value ? custNameInput.value : selName.textContent);

      if (result.status === 'success') {
        const currentSelPts = parseInt(String(selPoints.textContent || '0').replace(/\D+/g, ''), 10) || 0;
        const newSelPts = currentSelPts + points;
        selPoints.textContent = UIHelper.formatNumber(newSelPts);
        UIHelper.showMessage('Berhasil menambahkan point', 'success');
        nominalInput.value = '';
        pointsInput.value = '';
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      } else {
        UIHelper.showMessage(result.message || 'Gagal menambahkan point', 'error');
      }
    });
  }
}

// Fungsi lainnya tidak diubah...
function initializeClaimVCR() {
  updatePointsDisplay();

  if (typeof QRScanner !== 'undefined') {
    const scanner = new QRScanner('qr-scanner', {
      onSuccess: handleVoucherCodeScanned,
      onError: (error) => { UIHelper.showMessage(`Error: ${error}`, 'error'); }
    });
    const startScanBtn = document.getElementById('start-scan-btn');
    if (startScanBtn) { startScanBtn.addEventListener('click', () => { scanner.start(); }); }
  }

  const manualInput = document.getElementById('manual-voucher-input');
  const manualSubmit = document.getElementById('manual-voucher-submit');
  if (manualSubmit) {
    manualSubmit.addEventListener('click', () => {
      const code = manualInput.value.trim();
      if (code) { handleVoucherCodeScanned(code); }
    });
  }
  loadVouchersHistory();
}
async function handleVoucherCodeScanned(code) { /* ...Fungsi ini tidak diubah... */ }
function updatePointsDisplay() {
  const pointsElement = document.getElementById('user-points');
  if (pointsElement && appState.user) {
    pointsElement.textContent = UIHelper.formatNumber(appState.user.points || 0);
  }
}
function loadVouchersHistory() { /* ...Fungsi ini tidak diubah... */ }

// Export
window.AppState = AppState;
window.APIService = APIService;
window.UIHelper = UIHelper;
window.AUTH = AUTH;