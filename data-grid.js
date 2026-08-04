document.addEventListener('DOMContentLoaded', function() {
    const gridTable = document.getElementById('data-grid');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');
    const addRowBtn = document.getElementById('add-row-btn');
    const addColBtn = document.getElementById('add-col-btn');
    const statusEl = document.getElementById('grid-status');
    const lockSettingsBtn = document.getElementById('lock-settings-btn'); // [BARU] Tombol pengaturan kunci
    const toggleDevModeBtn = document.getElementById('toggle-dev-mode-btn');
    const sheetsBar = document.getElementById('grid-sheets-bar');
    const addSheetBtn = document.getElementById('add-sheet-btn');
    const outletSelector = document.getElementById('outlet-selector');

    const lockSettingsModal = document.getElementById('lock-settings-modal'); // [BARU] Modal pengaturan kunci
    const STORAGE_KEY_PREFIX = 'RBM_DATA_GRID_';
    const GLOBAL_LOCKS_KEY = 'RBM_DATA_GRID_LOCKS';
    let developerMode = false; // [BARU] State untuk mode developer
    let globalLockConfig = { sheets: [] };
    
    // [DIUBAH] Struktur data utama untuk mendukung multi-sheet
    let appData = {
        activeSheetIndex: 0,
        sheets: [],
        selectedColumnIndex: null
    };
    // Clipboard buffer for copy/paste support (single-cell)
    let clipboardBuffer = null;

    // Inject minimal CSS for drag handle visuals if not already present
    (function injectGridHandlesStyle() {
        if (document.getElementById('rbm-data-grid-styles')) return;
        const style = document.createElement('style');
        style.id = 'rbm-data-grid-styles';
        style.textContent = "\
            /* Positioning for header and handle */\n\
            #data-grid th { position: relative; }\n\
            .col-drag-handle { position: absolute; right: 6px; top: 6px; width: 10px; height: 10px; background: #6b7280; border-radius: 50%; cursor: grab; opacity: 0; transition: opacity 0.12s; z-index: 3; }\n\
            .col-delete-handle { position: absolute; left: 6px; top: 6px; width: 14px; height: 14px; background: #ef4444; color: white; border-radius: 50%; font-size:11px; line-height:14px; text-align:center; cursor: pointer; opacity: 0; transition: opacity 0.12s; z-index: 4; }\n\
            #data-grid th:hover .col-drag-handle, #data-grid th.selected .col-drag-handle { opacity: 1; }\n\
            #data-grid th:hover .col-delete-handle, #data-grid th.selected .col-delete-handle { opacity: 1; }\n\
            #data-grid th.drag-over { outline: 2px dashed rgba(99,102,241,0.35); }\n\
            .formula-cell { font-style: normal; }\n\
            .sheet-tab { position: relative; display:inline-flex; align-items:center; padding-right:18px; }\n\
            .sheet-tab-delete { position: absolute; right:4px; top:4px; width:16px; height:16px; border-radius:8px; background:#ef4444; color:white; border:none; font-size:12px; line-height:14px; cursor:pointer; display:none; }\n\
            .sheet-tab:hover .sheet-tab-delete { display:inline-block; }\n\
        ";
        document.head.appendChild(style);
    })();

    function userCanConfigureLocks() {
        if (typeof rbmOnlyOwnerCanEditDelete === 'function' && rbmOnlyOwnerCanEditDelete()) return true;
        if (typeof rbmIsDeveloper === 'function' && rbmIsDeveloper()) return true;
        try {
            const user = JSON.parse(localStorage.getItem('rbm_user') || '{}');
            const role = (user.role || '').toString().toLowerCase();
            return role === 'owner' || role === 'developer';
        } catch (e) {
            return false;
        }
    }

    function userIsOwner() {
        if (typeof rbmOnlyOwnerCanEditDelete === 'function' && rbmOnlyOwnerCanEditDelete()) return true;
        try {
            const user = JSON.parse(localStorage.getItem('rbm_user') || '{}');
            const role = (user.role || '').toString().toLowerCase();
            return role === 'owner';
        } catch (e) {
            return false;
        }
    }

    function userIsDeveloper() {
        if (typeof rbmIsDeveloper === 'function' && rbmIsDeveloper()) return true;
        try {
            const user = JSON.parse(localStorage.getItem('rbm_user') || '{}');
            const role = (user.role || '').toString().toLowerCase();
            return role === 'developer';
        } catch (e) {
            return false;
        }
    }

    function updateToolbarButtonsVisibility() {
        lockSettingsBtn.style.display = userCanConfigureLocks() ? '' : 'none';
        toggleDevModeBtn.style.display = userIsDeveloper() ? '' : 'none';
    }

    if (typeof RBMStorage !== 'undefined') {
        RBMStorage._requireFirebase = true;
    }

    function getFirebasePathFromKey(key) {
        return key.replace(/^RBM_/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    async function getStorageData(key) {
        if (typeof RBMStorage !== 'undefined' && typeof RBMStorage.isUsingFirebase === 'function' && RBMStorage.isUsingFirebase() && RBMStorage._db) {
            var cached = RBMStorage.getItem(key);
            if (cached !== null) return cached;
            try {
                var path = getFirebasePathFromKey(key);
                var snap = await RBMStorage._db.ref('rbm_pro/' + path).once('value');
                if (snap.exists()) {
                    return JSON.stringify(snap.val());
                }
            } catch (error) {
                console.warn('Gagal membaca data Firebase langsung untuk', key, error);
            }
            return null;
        }
        if (typeof RBMStorage !== 'undefined') {
            return RBMStorage.getItem(key);
        }
        return localStorage.getItem(key);
    }

    async function loadGlobalLocks() {
        try {
            const raw = await getStorageData(GLOBAL_LOCKS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.sheets)) {
                globalLockConfig = parsed;
            }
        } catch (e) {
            console.warn('Gagal memuat pengaturan kunci global:', e);
        }
    }

    async function saveGlobalLocks() {
        try {
            await RBMStorage.ready();
            await RBMStorage.setItem(GLOBAL_LOCKS_KEY, JSON.stringify(globalLockConfig));
            showStatus('Pengaturan kunci berhasil disimpan.', 'success');
        } catch (e) {
            console.error('Gagal menyimpan pengaturan kunci global:', e);
            showStatus('Gagal menyimpan pengaturan kunci. Pastikan halaman dibuka melalui HTTP/HTTPS dan Firebase tersedia.', 'error');
        }
    }

    // Note: saveGlobalLocksToAllOutlets is defined later in the file after saveLockSettings.

    function applyGlobalLocks() {
        appData.sheets.forEach((sheet, index) => {
            const found = globalLockConfig.sheets.find(item => item.name === sheet.name) || globalLockConfig.sheets[index];
            if (found) {
                sheet.lockedColumns = Array.isArray(found.lockedColumns) ? found.lockedColumns.slice() : [];
                sheet.lockedRows = Array.isArray(found.lockedRows) ? found.lockedRows.slice() : [];
                sheet.dropdownColumns = Array.isArray(found.dropdownColumns) ? found.dropdownColumns.slice() : [];
            } else {
                sheet.lockedColumns = sheet.lockedColumns || [];
                sheet.lockedRows = sheet.lockedRows || [];
                sheet.dropdownColumns = sheet.dropdownColumns || [];
            }
        });
    }

    function parseColumnIndexes(value) {
        const columns = String(value || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        const indexes = [];
        columns.forEach(col => {
            if (/^[A-Z]+$/.test(col)) {
                let idx = 0;
                for (let i = 0; i < col.length; i++) {
                    idx = idx * 26 + (col.charCodeAt(i) - 65 + 1);
                }
                indexes.push(idx - 1);
            }
        });
        return Array.from(new Set(indexes)).filter(i => i >= 0);
    }

    function parseRowIndexes(value) {
        return Array.from(new Set(String(value || '').split(',').map(r => parseInt(r, 10) - 1).filter(i => Number.isInteger(i) && i >= 0)));
    }

    // Parse dropdown selector tokens. Supported tokens:
    // - Column letters: "B,C" -> whole columns
    // - Cell refs: "B2" -> single cell
    // - Ranges: "A1:B3" or column ranges "B:C"
    // Returns array of configs: { colStart, colEnd, rowStart, rowEnd, options: [] }
    function parseDropdownColumns(value) {
        const raw = String(value || '').split(',').map(s => s.trim()).filter(Boolean);
        const configs = [];

        raw.forEach(token => {
            // Column range like B:C
            const colRangeMatch = token.match(/^([A-Z]+)\s*:\s*([A-Z]+)$/i);
            if (colRangeMatch) {
                const startCols = parseColumnIndexes(colRangeMatch[1]);
                const endCols = parseColumnIndexes(colRangeMatch[2]);
                if (startCols.length && endCols.length) {
                    const cs = Math.min(startCols[0], endCols[0]);
                    const ce = Math.max(startCols[0], endCols[0]);
                    configs.push({ colStart: cs, colEnd: ce, rowStart: null, rowEnd: null, options: [] });
                    return;
                }
            }

            // A1 range like A1:B3
            const a1RangeMatch = token.match(/^([A-Z]+\d+)\s*:\s*([A-Z]+\d+)$/i);
            if (a1RangeMatch) {
                const start = parseA1Reference(a1RangeMatch[1]);
                const end = parseA1Reference(a1RangeMatch[2]);
                if (start && end) {
                    configs.push({ colStart: Math.min(start.col, end.col), colEnd: Math.max(start.col, end.col), rowStart: Math.min(start.row, end.row), rowEnd: Math.max(start.row, end.row), options: [] });
                    return;
                }
            }

            // Single cell A1 like B2
            const a1Match = parseA1Reference(token);
            if (a1Match) {
                configs.push({ colStart: a1Match.col, colEnd: a1Match.col, rowStart: a1Match.row, rowEnd: a1Match.row, options: [] });
                return;
            }

            // Single column letter like B
            const colMatch = token.match(/^([A-Z]+)$/i);
            if (colMatch) {
                const cols = parseColumnIndexes(colMatch[1]);
                if (cols.length) configs.push({ colStart: cols[0], colEnd: cols[0], rowStart: null, rowEnd: null, options: [] });
            }
        });

        return configs;
    }

    function parseDropdownOptions(value) {
        return String(value || '').split(',').map(function(option) { return option.trim(); }).filter(function(option) { return option.length > 0; });
    }

    function isFormulaValue(value) {
        return typeof value === 'string' && value.trim().startsWith('=');
    }

    function columnIndexToLetters(index) {
        let letters = '';
        while (index >= 0) {
            letters = String.fromCharCode(65 + (index % 26)) + letters;
            index = Math.floor(index / 26) - 1;
        }
        return letters;
    }

    function parseA1Reference(reference) {
        const match = String(reference || '').trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
        if (!match) return null;
        const columnIndexes = parseColumnIndexes(match[1]);
        if (!columnIndexes.length) return null;
        return {
            row: parseInt(match[2], 10) - 1,
            col: columnIndexes[0]
        };
    }

    function getSheetCellRawValue(sheetData, row, col) {
        if (!Array.isArray(sheetData) || !Array.isArray(sheetData[row]) || typeof sheetData[row][col] === 'undefined') {
            return '';
        }
        return sheetData[row][col];
    }

    function getCellValueForFormula(ref, sheetData, visited) {
        const parsed = parseA1Reference(ref);
        if (!parsed) return 0;
        const raw = getSheetCellRawValue(sheetData, parsed.row, parsed.col);
        if (isFormulaValue(raw)) {
            if (visited.has(`${parsed.row}:${parsed.col}`)) return 0;
            const value = evaluateFormula(raw, sheetData, parsed.row, parsed.col, visited);
            const parsedNumber = parseFloat(String(value).replace(/,/g, '.'));
            return Number.isFinite(parsedNumber) ? parsedNumber : 0;
        }
        const parsedNumber = parseFloat(String(raw).replace(/,/g, '.'));
        return Number.isFinite(parsedNumber) ? parsedNumber : 0;
    }

    function evaluateFormula(value, sheetData, currentRowIndex, currentColIndex, visited) {
        visited = visited || new Set();
        const referenceKey = `${currentRowIndex}:${currentColIndex}`;
        if (visited.has(referenceKey)) return '#CYCLE';
        visited.add(referenceKey);
        let expression = String(value || '').trim().slice(1);

        // If the formula is a single A1 reference like "=A2", return the raw value (text) of that cell.
        // This ensures formulas like "=A2" will copy dropdown/text contents rather than coerce to 0.
        if (/^[A-Z]+\d+$/i.test(expression)) {
            const parsedRef = parseA1Reference(expression);
            if (parsedRef) {
                const raw = getSheetCellRawValue(sheetData, parsedRef.row, parsedRef.col);
                if (isFormulaValue(raw)) {
                    return evaluateFormula(raw, sheetData, parsedRef.row, parsedRef.col, visited);
                }
                return raw === null || typeof raw === 'undefined' ? '' : raw;
            }
        }

        expression = expression.replace(/SUM\(\s*([A-Z]+\d+):([A-Z]+\d+)\s*\)/gi, function(_, startRef, endRef) {
            const start = parseA1Reference(startRef);
            const end = parseA1Reference(endRef);
            if (!start || !end) return '0';

            const rowStart = Math.min(start.row, end.row);
            const rowEnd = Math.max(start.row, end.row);
            const colStart = Math.min(start.col, end.col);
            const colEnd = Math.max(start.col, end.col);
            const values = [];

            for (let r = rowStart; r <= rowEnd; r++) {
                for (let c = colStart; c <= colEnd; c++) {
                    values.push(getCellValueForFormula(columnIndexToLetters(c) + (r + 1), sheetData, new Set(visited)));
                }
            }
            return values.join('+') || '0';
        });

        expression = expression.replace(/([A-Z]+)(\d+)/g, function(_, colLetters, rowNumber) {
            const ref = colLetters + rowNumber;
            const value = getCellValueForFormula(ref, sheetData, visited);
            return Number(value) || 0;
        });

        expression = expression.replace(/[^0-9+\-*/()., ]/g, '');

        try {
            const result = Function('"use strict"; return (' + expression + ')')();
            if (result === null || result === undefined || Number.isNaN(result)) {
                return '#ERROR';
            }
            return result;
        } catch (e) {
            return '#ERROR';
        }
    }

    function openLockSettingsModal() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        document.getElementById('locked-columns-input').value = (activeSheet.lockedColumns || []).map(idx => String.fromCharCode(65 + idx)).join(', ');
        document.getElementById('locked-rows-input').value = (activeSheet.lockedRows || []).map(idx => idx + 1).join(', ');

        const dropdownCols = activeSheet.dropdownColumns || [];
        // Convert configs back to readable tokens
        const tokenStrings = dropdownCols.map(cfg => {
            if (typeof cfg.rowStart === 'number' && typeof cfg.rowEnd === 'number') {
                if (cfg.colStart === cfg.colEnd && cfg.rowStart === cfg.rowEnd) {
                    return columnIndexToLetters(cfg.colStart) + (cfg.rowStart + 1);
                }
                return columnIndexToLetters(cfg.colStart) + (cfg.rowStart + 1) + ':' + columnIndexToLetters(cfg.colEnd) + (cfg.rowEnd + 1);
            }
            if (cfg.rowStart === null && cfg.rowEnd === null && typeof cfg.colStart === 'number' && typeof cfg.colEnd === 'number') {
                if (cfg.colStart === cfg.colEnd) return columnIndexToLetters(cfg.colStart);
                return columnIndexToLetters(cfg.colStart) + ':' + columnIndexToLetters(cfg.colEnd);
            }
            return '';
        }).filter(Boolean);

        document.getElementById('dropdown-columns-input').value = tokenStrings.join(', ');
        document.getElementById('dropdown-options-input').value = dropdownCols.length > 0 ? (dropdownCols[0].options || []).join(', ') : '';

        lockSettingsModal.style.display = 'flex';
        lockSettingsModal.classList.add('show');
    }

    async function saveLockSettings() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        const columnsValue = document.getElementById('locked-columns-input').value;
        const rowsValue = document.getElementById('locked-rows-input').value;
        const dropdownColumnsValue = document.getElementById('dropdown-columns-input').value;
        const dropdownOptionsValue = document.getElementById('dropdown-options-input').value;

        activeSheet.lockedColumns = parseColumnIndexes(columnsValue);
        activeSheet.lockedRows = parseRowIndexes(rowsValue);

        const dropdownColumns = parseDropdownColumns(dropdownColumnsValue);
        const dropdownOptions = parseDropdownOptions(dropdownOptionsValue);
        if (dropdownColumns.length > 0 && dropdownOptions.length > 0) {
            // If user selected specific rows (lockedRows), and dropdown tokens were column-only (rowStart null),
            // expand those column configs into per-row configs so dropdown applies only to chosen rows.
            const expanded = [];
            dropdownColumns.forEach(function(columnConfig) {
                // If config has no explicit row range, but we have locked rows selected, apply to those rows only
                const hasExplicitRow = typeof columnConfig.rowStart === 'number' && typeof columnConfig.rowEnd === 'number';
                if (!hasExplicitRow && Array.isArray(activeSheet.lockedRows) && activeSheet.lockedRows.length > 0) {
                    activeSheet.lockedRows.forEach(function(r) {
                        expanded.push({
                            colStart: columnConfig.colStart,
                            colEnd: columnConfig.colEnd,
                            rowStart: r,
                            rowEnd: r,
                            options: dropdownOptions.slice()
                        });
                    });
                } else {
                    columnConfig.options = dropdownOptions.slice();
                    expanded.push(columnConfig);
                }
            });
            activeSheet.dropdownColumns = expanded;
        } else {
            activeSheet.dropdownColumns = [];
        }

        const sheetName = activeSheet.name || `Sheet${appData.activeSheetIndex + 1}`;
        const existing = globalLockConfig.sheets.find(item => item.name === sheetName);
        if (existing) {
            existing.lockedColumns = activeSheet.lockedColumns.slice();
            existing.lockedRows = activeSheet.lockedRows.slice();
            existing.dropdownColumns = activeSheet.dropdownColumns.slice();
        } else {
            globalLockConfig.sheets.push({
                name: sheetName,
                lockedColumns: activeSheet.lockedColumns.slice(),
                lockedRows: activeSheet.lockedRows.slice(),
                dropdownColumns: activeSheet.dropdownColumns.slice()
            });
        }

        await saveGrid();
        await saveGlobalLocks();
        await saveGlobalLocksToAllOutlets();
        renderGrid();
        closeLockSettingsModal();
    }

    async function saveGlobalLocksToAllOutlets() {
        if (!userIsOwner()) return;
        let outlets = [];
        try {
            outlets = JSON.parse(localStorage.getItem('rbm_outlets') || '[]');
        } catch (e) {
            outlets = [];
        }
        if (!Array.isArray(outlets) || outlets.length === 0) return;

        const savePromises = outlets.map(async function(outletId) {
            if (!outletId) return Promise.resolve();
            const storageKey = `${STORAGE_KEY_PREFIX}${outletId}`;
            try {
                const raw = await getStorageData(storageKey);
                const data = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
                const targetData = data && Array.isArray(data.sheets) ? data : {
                    activeSheetIndex: 0,
                    sheets: appData.sheets.map(function(sheet) {
                        return {
                            name: sheet.name || `Sheet${appData.sheets.indexOf(sheet) + 1}`,
                            data: sheet.data || Array(10).fill(null).map(() => Array(5).fill('')),
                            headers: sheet.headers || [],
                            lockedColumns: [],
                            lockedRows: []
                        };
                    })
                };

                let updated = false;
                targetData.sheets.forEach(function(sheet, index) {
                    const globalSheet = globalLockConfig.sheets.find(item => item.name === sheet.name) || globalLockConfig.sheets[index];
                    if (globalSheet) {
                        sheet.lockedColumns = Array.isArray(globalSheet.lockedColumns) ? globalSheet.lockedColumns.slice() : [];
                        sheet.lockedRows = Array.isArray(globalSheet.lockedRows) ? globalSheet.lockedRows.slice() : [];
                        sheet.dropdownColumns = Array.isArray(globalSheet.dropdownColumns) ? globalSheet.dropdownColumns.slice() : [];
                        updated = true;
                    }
                });

                if (updated) {
                    return RBMStorage.setItem(storageKey, JSON.stringify(targetData));
                }
            } catch (e) {
                console.warn('Gagal menyalin pengaturan kunci ke outlet:', outletId, e);
            }
            return Promise.resolve();
        });

        await Promise.all(savePromises);
    }

    // Reorder columns in the active sheet and remap related metadata (headers, lockedColumns, dropdownColumns)
    function reorderColumns(fromIndex, toIndex) {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        const numCols = activeSheet.data && activeSheet.data[0] ? activeSheet.data[0].length : 0;
        if (fromIndex < 0 || fromIndex >= numCols || toIndex < 0 || toIndex >= numCols) return;

        const indices = Array.from({ length: numCols }, (_, i) => i);
        const removed = indices.splice(fromIndex, 1)[0];
        indices.splice(toIndex, 0, removed);

        const mapping = {};
        indices.forEach((oldIndex, newIndex) => {
            mapping[oldIndex] = newIndex;
        });

        // Reorder headers
        const newHeaders = [];
        for (let j = 0; j < numCols; j++) {
            newHeaders[j] = activeSheet.headers && typeof activeSheet.headers[indices[j]] !== 'undefined' ? activeSheet.headers[indices[j]] : '';
        }
        activeSheet.headers = newHeaders;

        // Reorder each row
        activeSheet.data = activeSheet.data.map(row => {
            const newRow = [];
            for (let j = 0; j < numCols; j++) {
                newRow[j] = typeof row[indices[j]] !== 'undefined' ? row[indices[j]] : '';
            }
            return newRow;
        });

        // Remap lockedColumns
        const oldLocked = Array.isArray(activeSheet.lockedColumns) ? activeSheet.lockedColumns : [];
        const newLocked = [];
        oldLocked.forEach(oldIdx => {
            if (mapping.hasOwnProperty(oldIdx)) newLocked.push(mapping[oldIdx]);
        });
        activeSheet.lockedColumns = Array.from(new Set(newLocked)).sort((a, b) => a - b);

        // Remap dropdownColumns
        if (Array.isArray(activeSheet.dropdownColumns)) {
            activeSheet.dropdownColumns = activeSheet.dropdownColumns.map(dc => ({ column: mapping[dc.column], options: Array.isArray(dc.options) ? dc.options.slice() : [] })).filter(dc => typeof dc.column === 'number' && dc.column >= 0);
        }

        renderGrid();
        saveGrid();
    }

    // Keyboard copy/paste (single-cell)
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'c') {
            const active = document.activeElement;
            const td = active && typeof active.closest === 'function' ? active.closest('td') : null;
            if (td) {
                const select = td.querySelector('select');
                let val = '';
                if (select) val = select.value;
                else if (typeof td.dataset.rawValue !== 'undefined' && td.dataset.rawValue !== '') val = td.dataset.rawValue;
                else val = td.textContent || '';
                clipboardBuffer = String(val);
                showStatus('Tersalin ke clipboard internal', 'success');
                e.preventDefault();
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'v') {
            if (clipboardBuffer === null) return;
            const active = document.activeElement;
            const td = active && typeof active.closest === 'function' ? active.closest('td') : null;
            if (td) {
                const row = td.parentElement;
                const rowHead = row.querySelector('th[data-row-index]');
                const rowIndex = rowHead ? parseInt(rowHead.dataset.rowIndex, 10) : Array.from(row.parentElement.children).indexOf(row);
                const cellIndex = Array.from(row.children).indexOf(td) - 1;

                const activeSheet = appData.sheets[appData.activeSheetIndex];
                if (!activeSheet) return;
                // If dropdown cell
                const select = td.querySelector('select');
                if (select) {
                    select.value = clipboardBuffer;
                    activeSheet.data[rowIndex][cellIndex] = clipboardBuffer;
                } else {
                    // Preserve formula raw when user pastes starting with '='
                    if (String(clipboardBuffer).startsWith('=')) {
                        td.dataset.rawValue = clipboardBuffer;
                        activeSheet.data[rowIndex][cellIndex] = clipboardBuffer;
                        td.textContent = evaluateFormula(clipboardBuffer, activeSheet.data, rowIndex, cellIndex);
                        td.classList.add('formula-cell');
                    } else {
                        delete td.dataset.rawValue;
                        activeSheet.data[rowIndex][cellIndex] = clipboardBuffer;
                        td.textContent = clipboardBuffer;
                        td.classList.remove('formula-cell');
                    }
                }

                saveGrid();
                showStatus('Terpaste', 'success');
                e.preventDefault();
            }
        }
    });

    window.openLockSettingsModal = openLockSettingsModal;
    window.closeLockSettingsModal = closeLockSettingsModal;
    window.saveLockSettings = saveLockSettings;

    /**
     * [BARU] Mendapatkan ID outlet yang sedang aktif.
     * Fallback ke 'default' jika tidak ada outlet.
     */
    function getActiveOutletId() {
        if (userIsOwner()) {
            return 'GLOBAL';
        }
        if (typeof getRbmOutlet === 'function') {
            return getRbmOutlet() || 'default';
        }
        // Fallback jika fungsi global tidak ada
        return localStorage.getItem('rbm_last_selected_outlet') || 'default';
    }

    function showStatus(message, type = 'info') {
        statusEl.textContent = message;
        statusEl.className = `status-${type}`;
        statusEl.style.display = 'block';
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }

    /**
     * [BARU] Mengisi dropdown outlet dan mengatur event listener.
     */
    function initializeOutletSelector() {
        if (userIsOwner()) {
            outletSelector.innerHTML = '<option value="GLOBAL">GLOBAL (Owner)</option>';
            outletSelector.disabled = true;
            return;
        }

        const outlets = JSON.parse(localStorage.getItem('rbm_outlets') || '[]');
        const outletNames = JSON.parse(localStorage.getItem('rbm_outlet_names') || '{}');
        const activeOutlet = getActiveOutletId();

        outletSelector.innerHTML = ''; // Kosongkan pilihan

        if (outlets.length === 0) {
            outletSelector.innerHTML = '<option value="default">Tidak ada outlet</option>';
            return;
        }

        outletSelector.disabled = false;
        outlets.forEach(outletId => {
            const option = document.createElement('option');
            option.value = outletId;
            option.textContent = outletNames[outletId] || outletId;
            if (outletId === activeOutlet) {
                option.selected = true;
            }
            outletSelector.appendChild(option);
        });

        outletSelector.addEventListener('change', () => {
            localStorage.setItem('rbm_last_selected_outlet', outletSelector.value);
            loadGrid(); // Muat ulang data untuk outlet yang baru dipilih
        });
    }

    /**
     * [BARU] Merender tab-tab sheet di bagian bawah
     */
    function renderTabs() {
        // Hapus semua tab lama kecuali tombol '+'
        sheetsBar.querySelectorAll('.sheet-tab').forEach(tab => tab.remove());

        appData.sheets.forEach((sheet, index) => {
            const tab = document.createElement('div');
            tab.className = 'sheet-tab';
            tab.textContent = sheet.name;
            tab.dataset.index = index;
            if (index === appData.activeSheetIndex) {
                tab.classList.add('active');
            }

            tab.addEventListener('click', () => {
                appData.activeSheetIndex = index;
                renderTabs();
                renderGrid();
            });

            tab.addEventListener('dblclick', () => {
                const newName = prompt(`Masukkan nama baru untuk sheet "${sheet.name}":`, sheet.name);
                if (newName && newName.trim()) {
                    appData.sheets[index].name = newName.trim();
                    renderTabs();
                    saveGrid(); // Langsung simpan perubahan nama
                }
            });

            // delete button for the tab
            const tabDeleteBtn = document.createElement('button');
            tabDeleteBtn.className = 'sheet-tab-delete';
            tabDeleteBtn.title = 'Hapus sheet ini';
            tabDeleteBtn.textContent = '×';
            if (userCanConfigureLocks()) {
                tabDeleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSheet(index);
                });
            } else {
                tabDeleteBtn.style.display = 'none';
            }
            tab.appendChild(tabDeleteBtn);

            sheetsBar.insertBefore(tab, addSheetBtn);
        });
    }

    function closeLockSettingsModal() {
        lockSettingsModal.style.display = 'none';
        lockSettingsModal.classList.remove('show');
    }

    /**
     * Merender tabel berdasarkan data yang ada
     */
    function renderGrid() {
        gridTable.innerHTML = ''; // Kosongkan tabel
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet || activeSheet.data.length === 0) return;

        const lockedColumns = activeSheet.lockedColumns || []; // [BARU] Ambil pengaturan kunci kolom
        const lockedRows = activeSheet.lockedRows || [];     // [BARU] Ambil pengaturan kunci baris

        const gridData = activeSheet.data;
        const dropdownColumns = Array.isArray(activeSheet.dropdownColumns) ? activeSheet.dropdownColumns : [];

        function findDropdownConfigForCell(r, c) {
            for (let i = 0; i < dropdownColumns.length; i++) {
                const cfg = dropdownColumns[i];
                const rowStart = typeof cfg.rowStart === 'number' ? cfg.rowStart : 0;
                const rowEnd = typeof cfg.rowEnd === 'number' ? cfg.rowEnd : (gridData.length - 1);
                const colStart = typeof cfg.colStart === 'number' ? cfg.colStart : 0;
                const colEnd = typeof cfg.colEnd === 'number' ? cfg.colEnd : (gridData[0].length - 1);
                if (r >= rowStart && r <= rowEnd && c >= colStart && c <= colEnd) return cfg;
            }
            return null;
        }

        // Buat Header (A, B, C, ...)
        const thead = gridTable.createTHead();
        const headerRow = thead.insertRow();
        const cornerCell = document.createElement('th');
        cornerCell.textContent = '#'; // Label untuk nomor baris
        headerRow.appendChild(cornerCell); // Pojok kiri atas
        for (let i = 0; i < gridData[0].length; i++) { // [DIUBAH] Gunakan gridData[0].length untuk jumlah kolom
            const th = document.createElement('th');
            th.textContent = activeSheet.headers[i] || String.fromCharCode(65 + i); // [DIUBAH] Ambil dari headers atau default A, B, C...
            th.setAttribute('contenteditable', developerMode ? 'true' : 'false'); // [BARU] Editable di mode developer
            th.style.cursor = developerMode ? 'text' : 'default'; // [BARU] Kursor teks di mode developer
            // Make header draggable to allow column reorder
            th.draggable = true;
            th.dataset.colIndex = i;

            // Select header on click to show handle
            th.addEventListener('click', () => {
                appData.selectedColumnIndex = i;
                renderGrid();
            });

            th.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', String(i));
                th.classList.add('dragging');
            });
            th.addEventListener('dragover', (e) => {
                e.preventDefault();
                th.classList.add('drag-over');
            });
            th.addEventListener('dragleave', () => {
                th.classList.remove('drag-over');
            });
            th.addEventListener('drop', (e) => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                const to = parseInt(th.dataset.colIndex, 10);
                th.classList.remove('drag-over');
                if (!Number.isNaN(from) && !Number.isNaN(to) && from !== to) {
                    reorderColumns(from, to);
                }
            });

            // Drag handle visual (small dot) for easier grabbing
            // Delete handle visual (small red dot) for easier delete
            const delHandle = document.createElement('div');
            delHandle.className = 'col-delete-handle';
            delHandle.textContent = '×';
            delHandle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!confirm(`Hapus kolom ${String.fromCharCode(65 + i)} ?`)) return;
                appData.selectedColumnIndex = i;
                deleteColumn();
            });
            const handle = document.createElement('div');
            handle.className = 'col-drag-handle';
            handle.draggable = true;
            handle.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', String(i));
                th.classList.add('dragging');
            });
            handle.addEventListener('dragend', () => {
                th.classList.remove('dragging');
            });
            handle.addEventListener('click', (e) => {
                e.stopPropagation();
                appData.selectedColumnIndex = i;
                renderGrid();
            });

            if (i === appData.selectedColumnIndex) th.classList.add('selected');
            headerRow.appendChild(th);
            th.appendChild(delHandle);
            th.appendChild(handle);
        }
        // Buat Body
        const tbody = gridTable.createTBody();
        gridData.forEach((rowData, rowIndex) => {
            const row = tbody.insertRow();
            const rowNumCell = row.insertCell();
            rowNumCell.outerHTML = `<th data-row-index="${rowIndex}">${rowIndex + 1}</th>`; // Nomor baris

            // [BARU] Tambahkan event listener untuk Enter
            row.addEventListener('keydown', (e) => { // [DIUBAH] Hapus e.preventDefault() untuk multiline
                if (e.key === 'Enter' && !e.shiftKey) { // Hanya Enter, bukan Shift+Enter
                    e.preventDefault(); // Mencegah baris baru di dalam sel
                    const currentCell = e.target;
                    if (currentCell.tagName === 'TD') {
                        const currentRow = currentCell.parentElement;
                        const currentCellIndex = Array.from(currentRow.children).indexOf(currentCell);
                        
                        const nextRow = currentRow.nextElementSibling;
                        if (nextRow) {
                            const nextCell = nextRow.children[currentCellIndex];
                            if (nextCell && nextCell.tagName === 'TD') {
                                nextCell.focus();
                            } else if (nextRow.children.length > 1) { // Jika tidak ada sel di kolom yang sama, pindah ke sel pertama di baris berikutnya
                                nextRow.children[1].focus();
                            }
                        }
                    }
                }
            });

            rowData.forEach(cellData => {
                const cell = row.insertCell();
                const cellIndex = Array.from(row.children).indexOf(cell) - 1; // -1 karena ada kolom nomor baris
                const isColumnLocked = lockedColumns.includes(cellIndex);
                const isRowLocked = lockedRows.includes(rowIndex);
                const dropdownConfig = findDropdownConfigForCell(rowIndex, cellIndex) || { options: [] };
                const isDropdownColumn = !!dropdownConfig && Array.isArray(dropdownConfig.options) && dropdownConfig.options.length > 0;
                const canEdit = (typeof rbmIsDeveloper === 'function' && rbmIsDeveloper()) || (!isColumnLocked && !isRowLocked);

                if (isDropdownColumn) {
                    const select = document.createElement('select');
                    select.className = 'dropdown-cell';
                    dropdownConfig.options.forEach(function(option) {
                        const opt = document.createElement('option');
                        opt.value = option;
                        opt.textContent = option;
                        select.appendChild(opt);
                    });
                    select.value = cellData || '';
                    select.disabled = !canEdit;
                    select.addEventListener('change', function() {
                        const activeSheet = appData.sheets[appData.activeSheetIndex];
                        if (!activeSheet) return;
                        const row = rowIndex;
                        const col = cellIndex;
                        activeSheet.data[row][col] = select.value;
                        // re-render formulas that may depend on this cell
                        renderGrid();
                    });
                    cell.appendChild(select);
                } else {
                    const isFormula = isFormulaValue(cellData);
                    const displayValue = isFormula ? evaluateFormula(cellData, activeSheet.data, rowIndex, cellIndex) : cellData;
                    cell.textContent = typeof displayValue === 'undefined' || displayValue === null ? '' : displayValue;
                    cell.setAttribute('contenteditable', canEdit ? 'true' : 'false');
                    if (isFormula) {
                        cell.dataset.rawValue = cellData;
                        cell.classList.add('formula-cell');
                    } else {
                        delete cell.dataset.rawValue;
                    }

                    cell.addEventListener('focus', function() {
                        if (cell.dataset.rawValue) {
                            cell.textContent = cell.dataset.rawValue;
                        }
                    });

                    cell.addEventListener('input', function() {
                        const currentValue = String(cell.textContent || '').trim();
                        if (currentValue.startsWith('=')) {
                            // keep raw formula while editing
                            cell.dataset.rawValue = currentValue;
                        } else {
                            delete cell.dataset.rawValue;
                            const activeSheet = appData.sheets[appData.activeSheetIndex];
                            if (activeSheet && activeSheet.data && Array.isArray(activeSheet.data[rowIndex])) {
                                activeSheet.data[rowIndex][cellIndex] = currentValue;
                            }
                        }
                    });

                    cell.addEventListener('blur', function() {
                        const currentValue = String(cell.textContent || '').trim();
                        if (currentValue.startsWith('=')) {
                            cell.dataset.rawValue = currentValue;
                            const activeSheet = appData.sheets[appData.activeSheetIndex];
                            if (activeSheet && activeSheet.data && Array.isArray(activeSheet.data[rowIndex])) {
                                activeSheet.data[rowIndex][cellIndex] = currentValue;
                            }
                            const evaluated = evaluateFormula(currentValue, activeSheet.data, rowIndex, cellIndex);
                            cell.textContent = evaluated;
                        } else {
                            delete cell.dataset.rawValue;
                            const activeSheet = appData.sheets[appData.activeSheetIndex];
                            if (activeSheet && activeSheet.data && Array.isArray(activeSheet.data[rowIndex])) {
                                activeSheet.data[rowIndex][cellIndex] = currentValue;
                            }
                            cell.textContent = currentValue;
                        }
                    });

                    // Enter to move focus to next cell and trigger blur/save
                    cell.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            cell.blur();
                            // move focus to next row same column if exists
                            const nextRow = cell.parentElement.nextElementSibling;
                            if (nextRow) {
                                const nextCell = nextRow.children[cellIndex + 1];
                                if (nextCell) {
                                    const target = nextCell.querySelector('select') || nextCell;
                                    if (target) target.focus();
                                }
                            }
                        }
                    });
                }

                if (isColumnLocked || isRowLocked) cell.classList.add('locked-cell');
            });
        });
    }

    /**
     * Memuat data dari RBMStorage (Firebase/localStorage)
     */
    async function loadGrid() {
        const outletId = getActiveOutletId();
        const storageKey = `${STORAGE_KEY_PREFIX}${outletId}`;
        showStatus(`Memuat data untuk outlet: ${outletId}...`, 'info');
        try {
            await RBMStorage.ready(); // Pastikan storage siap
        } catch (error) {
            console.error('RBM Storage tidak tersedia saat memuat grid:', error);
            showStatus('Tidak bisa memuat data. Jalankan halaman ini melalui HTTP/HTTPS agar Firebase dapat dipakai.', 'error');
            return;
        }

        try {
            const storedData = await getStorageData(storageKey);
            const parsedData = storedData ? JSON.parse(storedData) : null;

            if (parsedData && Array.isArray(parsedData.sheets) && parsedData.sheets.length > 0) {
                // [BARU] Pastikan setiap sheet memiliki properti headers
                parsedData.sheets.forEach(sheet => {
                    if (!sheet.headers) sheet.headers = [];
                });
                // [BARU] Pastikan properti lockedColumns, lockedRows, dan dropdownColumns ada
                parsedData.sheets.forEach(sheet => {
                    if (!sheet.lockedColumns) sheet.lockedColumns = [];
                    if (!sheet.lockedRows) sheet.lockedRows = [];
                    if (!sheet.dropdownColumns) sheet.dropdownColumns = [];
                });
                appData = parsedData;
                showStatus('Data berhasil dimuat.', 'success');
            } else {
                appData = {
                    activeSheetIndex: 0,
                    sheets: [{
                        name: 'Sheet1',
                        data: Array(10).fill(null).map(() => Array(5).fill('')),
                        headers: [],
                        lockedColumns: [], // [BARU] Inisialisasi
                        lockedRows: [],    // [BARU] Inisialisasi
                        dropdownColumns: []
                    }]
                };
                showStatus('Membuat grid baru. Jangan lupa simpan.', 'info');
            }
        } catch (error) {
            console.error('Gagal memuat atau parse data:', error);
            appData = {
                activeSheetIndex: 0,
                sheets: [{
                    name: 'Sheet1',
                    data: Array(10).fill(null).map(() => Array(5).fill('')),
                    headers: [],
                    lockedColumns: [],
                    lockedRows: []
                }]
            };
            showStatus('Gagal memuat data, grid baru dibuat.', 'error');
        }

        loadGlobalLocks();
        applyGlobalLocks();
        renderTabs();
        renderGrid();
        updateToolbarButtonsVisibility();
    }

    /**
     * Menyimpan data ke RBMStorage (Firebase/localStorage)
     */
    async function saveGrid() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];

        // [BARU] Simpan header jika dalam mode developer
        if (developerMode) {
            const headerCells = gridTable.querySelectorAll('thead th:not(:first-child)');
            activeSheet.headers = Array.from(headerCells).map(th => th.textContent);
        }

        const newData = [];
        const rows = gridTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const rowData = [];
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                const select = cell.querySelector('select');
                if (select) {
                    rowData.push(select.value);
                } else if (typeof cell.dataset.rawValue !== 'undefined' && cell.dataset.rawValue !== '') {
                    rowData.push(cell.dataset.rawValue);
                } else {
                    rowData.push(cell.textContent);
                }
            });
            newData.push(rowData);
        });

        if (activeSheet) activeSheet.data = newData;
        const outletId = getActiveOutletId();
        const storageKey = `${STORAGE_KEY_PREFIX}${outletId}`;
        showStatus(`Menyimpan data untuk outlet: ${outletId}...`, 'info');

        try {
            await RBMStorage.ready();
            await RBMStorage.setItem(storageKey, JSON.stringify(appData));
            if (userIsOwner() && outletId === 'GLOBAL') {
                await saveGlobalDataToAllOutlets(appData);
            }
            showStatus('Data berhasil disimpan di cloud!', 'success');
        } catch (error) {
            console.error('Gagal menyimpan data:', error);
            showStatus('Gagal menyimpan data. Pastikan halaman dibuka melalui HTTP/HTTPS agar Firebase bisa dipakai.', 'error');
        }
    }

    async function saveGlobalDataToAllOutlets(dataToSave) {
        let outlets = [];
        try {
            outlets = JSON.parse(localStorage.getItem('rbm_outlets') || '[]');
        } catch (e) {
            outlets = [];
        }
        if (!Array.isArray(outlets) || outlets.length === 0) {
            return;
        }

        const savePromises = outlets.map(async function(outletId) {
            if (!outletId) return Promise.resolve();
            const storageKey = `${STORAGE_KEY_PREFIX}${outletId}`;
            try {
                await RBMStorage.setItem(storageKey, JSON.stringify(dataToSave));
            } catch (e) {
                console.warn('Gagal menyalin global sheet ke outlet:', outletId, e);
            }
        });
        await Promise.all(savePromises);
    }

    /**
     * Mengekspor data ke file Excel (.xlsx)
     */
    function exportToExcel() {
        if (typeof XLSX === 'undefined') {
            showStatus('Library Excel belum siap. Coba lagi.', 'error');
            return;
        }

        const workbook = XLSX.utils.book_new();
        appData.sheets.forEach((sheet, sheetIndex) => {
            // [BARU] Gabungkan header dengan data untuk ekspor
            const exportData = [];
            if (sheet.headers && sheet.headers.length > 0) exportData.push(sheet.headers);
            exportData.push(...sheet.data);

            const worksheet = XLSX.utils.aoa_to_sheet(exportData);
            // Nama sheet tidak boleh lebih dari 31 karakter dan tidak boleh mengandung karakter tertentu
            const safeSheetName = sheet.name.substring(0, 31).replace(/[*?:\\/\[\]]/g, '');
            XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
        });

        // Buat nama file dengan tanggal
        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `DataGrid_Export_${getActiveOutletId()}_${today}.xlsx`);
        showStatus('File Excel sedang diunduh.', 'success');
    }

    /**
     * [BARU] Memicu dialog file dan memproses file Excel yang dipilih.
     */
    function handleImport() {
        importFileInput.click();
    }

    importFileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // [DIUBAH] Import semua sheet dari file Excel
                const newSheets = [];
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Ambil semua baris
                    // Treat first row as header if present
                    const headers = sheetData.length > 0 ? sheetData.shift() : [];
                    newSheets.push({
                        name: sheetName,
                        data: sheetData,
                        headers: headers
                    });
                });
                // Normalize rows/columns: ensure consistent column counts and basic padding
                appData.sheets = newSheets.map(sheet => {
                    const data = Array.isArray(sheet.data) ? sheet.data.map(r => Array.isArray(r) ? r.slice() : []) : [];
                    // Compute max columns in this sheet (consider headers too)
                    const headerCols = Array.isArray(sheet.headers) ? sheet.headers.length : 0;
                    const maxDataCols = data.reduce((m, r) => Math.max(m, r.length), 0);
                    const maxCols = Math.max(5, headerCols, maxDataCols);
                    // Pad rows
                    for (let ri = 0; ri < data.length; ri++) {
                        for (let ci = 0; ci < maxCols; ci++) {
                            if (typeof data[ri][ci] === 'undefined') data[ri][ci] = '';
                        }
                    }
                    // If there are no rows, create empty rows
                    if (data.length === 0) {
                        for (let r = 0; r < 10; r++) {
                            const row = [];
                            for (let c = 0; c < maxCols; c++) row.push('');
                            data.push(row);
                        }
                    }

                    return {
                        name: sheet.name,
                        data: data,
                        headers: sheet.headers || [],
                        lockedColumns: sheet.lockedColumns || [],
                        lockedRows: sheet.lockedRows || [],
                        dropdownColumns: sheet.dropdownColumns || []
                    };
                });
                // [BARU] Set sheet pertama sebagai aktif setelah import
                appData.activeSheetIndex = 0;

                renderTabs();
                renderGrid();
                // Provide more informative status and console debug
                try {
                    const info = appData.sheets.map(s => ({ name: s.name, rows: s.data.length, cols: s.data[0] ? s.data[0].length : 0 }));
                    console.log('Imported workbook:', workbook, 'Parsed sheets info:', info);
                    showStatus('Data dari Excel berhasil diimpor. Periksa grid. (' + info.map(i => i.name + ': ' + i.rows + 'x' + i.cols).join(' | ') + ')', 'success');
                } catch (err) {
                    showStatus('Data dari Excel berhasil diimpor. Jangan lupa simpan.', 'success');
                }
            } catch (error) {
                console.error('Gagal memproses file Excel:', error);
                showStatus('Gagal memproses file. Pastikan format file benar.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; // Reset input agar bisa import file yang sama lagi
    });

    /**
     * [BARU] Menambah sheet baru
     */
    function addSheet() {
        const newSheetName = `Sheet${appData.sheets.length + 1}`;
        appData.sheets.push({
            name: newSheetName,
            data: Array(10).fill(null).map(() => Array(5).fill('')), // Grid default
            headers: [], // [BARU] Inisialisasi headers untuk sheet baru
            lockedColumns: [],
            lockedRows: [],
            dropdownColumns: []
        });
        appData.activeSheetIndex = appData.sheets.length - 1;
        renderTabs();
        renderGrid();
    }

    function addRow() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        const numCols = activeSheet.data.length > 0 ? activeSheet.data[0].length : 5;
        activeSheet.data.push(Array(numCols).fill(''));
        renderGrid();
    }

    function addColumn() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        if (activeSheet.data.length === 0) {
            addRow(); // Jika grid kosong, buat baris pertama dulu
        }
        activeSheet.data.forEach(row => row.push(''));
        renderGrid();
    }

    // Delete the row at the active/focused position or the last row
    function deleteRow() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        // try to get focused cell's row
        let rowIndex = null;
        const active = document.activeElement;
        if (active) {
            const td = typeof active.closest === 'function' ? active.closest('td') : null;
            if (td) {
                const tr = td.parentElement;
                const th = tr.querySelector('th[data-row-index]');
                if (th) rowIndex = parseInt(th.dataset.rowIndex, 10);
            }
        }
        if (rowIndex === null) {
            rowIndex = activeSheet.data.length - 1;
        }
        if (rowIndex < 0 || rowIndex >= activeSheet.data.length) return;
        activeSheet.data.splice(rowIndex, 1);
        // ensure at least one row
        if (activeSheet.data.length === 0) activeSheet.data.push(Array(activeSheet.data[0] ? activeSheet.data[0].length : 5).fill(''));

        // adjust lockedRows
        if (Array.isArray(activeSheet.lockedRows)) {
            activeSheet.lockedRows = activeSheet.lockedRows.map(r => (r > rowIndex ? r - 1 : r)).filter(r => r >= 0);
        }

        // adjust dropdown configs row ranges
        if (Array.isArray(activeSheet.dropdownColumns)) {
            activeSheet.dropdownColumns = activeSheet.dropdownColumns.map(cfg => {
                const newCfg = Object.assign({}, cfg);
                if (typeof newCfg.rowStart === 'number' && typeof newCfg.rowEnd === 'number') {
                    if (newCfg.rowStart > rowIndex) newCfg.rowStart--;
                    if (newCfg.rowEnd > rowIndex) newCfg.rowEnd--;
                }
                return newCfg;
            }).filter(cfg => !(typeof cfg.rowStart === 'number' && typeof cfg.rowEnd === 'number' && cfg.rowEnd < cfg.rowStart));
        }

        renderGrid();
        saveGrid();
        showStatus('Baris dihapus.', 'success');
    }

    // Delete the selected column (by header selection or focused cell) or last column
    function deleteColumn() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        let colIndex = null;
        if (typeof appData.selectedColumnIndex === 'number') colIndex = appData.selectedColumnIndex;
        const active = document.activeElement;
        if (colIndex === null && active) {
            const td = typeof active.closest === 'function' ? active.closest('td') : null;
            if (td) {
                const tr = td.parentElement;
                const cells = Array.from(tr.children);
                colIndex = cells.indexOf(td) - 1;
            }
        }
        if (colIndex === null) {
            colIndex = activeSheet.data[0] ? activeSheet.data[0].length - 1 : 0;
        }
        if (colIndex < 0) colIndex = 0;

        // Remove column from each row
        activeSheet.data.forEach(row => {
            if (row && row.length > colIndex) row.splice(colIndex, 1);
        });

        // remove header
        if (Array.isArray(activeSheet.headers)) {
            activeSheet.headers.splice(colIndex, 1);
        }

        // adjust lockedColumns
        if (Array.isArray(activeSheet.lockedColumns)) {
            activeSheet.lockedColumns = activeSheet.lockedColumns.map(c => (c > colIndex ? c - 1 : c)).filter(c => c >= 0);
        }

        // adjust dropdown configs columns
        if (Array.isArray(activeSheet.dropdownColumns)) {
            activeSheet.dropdownColumns = activeSheet.dropdownColumns.map(cfg => {
                const newCfg = Object.assign({}, cfg);
                if (typeof newCfg.colStart === 'number' && typeof newCfg.colEnd === 'number') {
                    if (newCfg.colStart > colIndex) newCfg.colStart--;
                    if (newCfg.colEnd > colIndex) newCfg.colEnd--;
                }
                return newCfg;
            }).filter(cfg => !(typeof cfg.colStart === 'number' && typeof cfg.colEnd === 'number' && cfg.colEnd < cfg.colStart));
        }

        // reset selectedColumnIndex if out of range
        const maxCols = activeSheet.data[0] ? activeSheet.data[0].length : 0;
        if (appData.selectedColumnIndex >= maxCols) appData.selectedColumnIndex = null;

        renderGrid();
        saveGrid();
        showStatus('Kolom dihapus.', 'success');
    }

    // Delete active sheet with index or current active
    let _sheetToDeleteIndex = null;
    function openDeleteSheetModal(index) {
        if (!userCanConfigureLocks()) return;
        const modal = document.getElementById('delete-sheet-modal');
        const span = document.getElementById('sheet-to-delete-name');
        if (typeof index === 'number') _sheetToDeleteIndex = index; else _sheetToDeleteIndex = appData.activeSheetIndex;
        const name = (appData.sheets && appData.sheets[_sheetToDeleteIndex] && appData.sheets[_sheetToDeleteIndex].name) || (`Sheet${_sheetToDeleteIndex + 1}`);
        span.textContent = name;
        modal.style.display = 'flex';
    }

    function closeDeleteSheetModal() {
        const modal = document.getElementById('delete-sheet-modal');
        modal.style.display = 'none';
        _sheetToDeleteIndex = null;
    }

    function deleteSheet(index) {
        if (!userCanConfigureLocks()) return;
        if (!Array.isArray(appData.sheets) || typeof index !== 'number' || index < 0 || index >= appData.sheets.length) return;
        const sheetName = appData.sheets[index].name || `Sheet${index + 1}`;
        if (!confirm(`Hapus sheet "${sheetName}"?`)) return;
        if (appData.sheets.length <= 1) {
            appData.sheets = [{ name: 'Sheet1', data: Array(10).fill(null).map(() => Array(5).fill('')), headers: [], lockedColumns: [], lockedRows: [], dropdownColumns: [] }];
            appData.activeSheetIndex = 0;
        } else {
            appData.sheets.splice(index, 1);
            if (appData.activeSheetIndex >= appData.sheets.length) appData.activeSheetIndex = appData.sheets.length - 1;
        }
        closeDeleteSheetModal();
        renderTabs();
        renderGrid();
        saveGrid();
        showStatus('Sheet dihapus.', 'success');
    }

    function confirmDeleteSheet() {
        if (_sheetToDeleteIndex === null) return closeDeleteSheetModal();
        deleteSheet(_sheetToDeleteIndex);
    }

    function toggleDeveloperMode() {
        developerMode = !developerMode;
        toggleDevModeBtn.textContent = developerMode ? '⚙️ Mode Developer: AKTIF' : '⚙️ Edit Struktur';
        renderGrid();
    }

    // Event Listeners
    saveBtn.addEventListener('click', saveGrid);
    exportBtn.addEventListener('click', exportToExcel);
    importBtn.addEventListener('click', handleImport);
    addRowBtn.addEventListener('click', addRow);
    // delete row button
    const deleteRowBtn = document.getElementById('delete-row-btn');
    if (deleteRowBtn) deleteRowBtn.addEventListener('click', deleteRow);
    addColBtn.addEventListener('click', addColumn);
    // delete column button
    const deleteColBtn = document.getElementById('delete-col-btn');
    if (deleteColBtn) deleteColBtn.addEventListener('click', deleteColumn);
    addSheetBtn.addEventListener('click', addSheet);
    // delete sheet button in toolbar
    const deleteSheetToolbarBtn = document.getElementById('delete-sheet-toolbar-btn');
    if (deleteSheetToolbarBtn) {
        if (userCanConfigureLocks()) {
            deleteSheetToolbarBtn.addEventListener('click', () => deleteSheet(appData.activeSheetIndex));
        } else {
            deleteSheetToolbarBtn.style.display = 'none';
        }
    }
    lockSettingsBtn.addEventListener('click', openLockSettingsModal);
    toggleDevModeBtn.addEventListener('click', toggleDeveloperMode);

    // Inisialisasi
    initializeOutletSelector();
    updateToolbarButtonsVisibility();
    loadGrid();
    // Wire confirm delete button (modal)
    const confirmDeleteBtn = document.getElementById('confirm-delete-sheet-btn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteSheet);
});