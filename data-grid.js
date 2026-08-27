document.addEventListener('DOMContentLoaded', function() {
    const gridTable = document.getElementById('data-grid');
    const saveBtn = document.getElementById('save-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');
    const addRowBtn = document.getElementById('add-row-btn');
    const addColBtn = document.getElementById('add-col-btn');
    const columnColorInput = document.getElementById('column-color-input');
    const applyColumnColorBtn = document.getElementById('apply-column-color-btn');
    const textColorInput = document.getElementById('text-color-input');
    const applyTextColorBtn = document.getElementById('apply-text-color-btn');
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
        selectedColumnIndex: null,
        selectedRange: null
    };
    // Clipboard buffer for copy/paste support (single-cell)
    let clipboardBuffer = null;
    let rangeAnchor = null;
    let isSelectingRange = false;
    let fillDrag = null;
    let resizeState = null;
    const undoStack = [];
    let lastFocusedCell = null;
    let editingCell = null;

    function getSelectedRange() {
        if (appData.selectedRange) return appData.selectedRange;
        if (Number.isInteger(appData.selectedColumnIndex)) {
            const sheet = appData.sheets[appData.activeSheetIndex];
            return sheet ? { rowStart: 0, rowEnd: sheet.data.length - 1, colStart: appData.selectedColumnIndex, colEnd: appData.selectedColumnIndex } : null;
        }
        return null;
    }

    function applyCellFormat(formatName, value) {
        const sheet = appData.sheets[appData.activeSheetIndex];
        const range = getSelectedRange();
        if (!sheet || !range) return;
        pushUndoState();
        sheet.cellFormats = sheet.cellFormats && typeof sheet.cellFormats === 'object' ? sheet.cellFormats : {};
        for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
            for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
                const key = `${rowIndex}:${colIndex}`;
                sheet.cellFormats[key] = Object.assign({}, sheet.cellFormats[key], { [formatName]: value });
            }
        }
        renderGrid();
        saveGrid();
    }

    function createSelectionPopup() {
        if (document.getElementById('grid-selection-popup')) return document.getElementById('grid-selection-popup');
        const popup = document.createElement('div');
        popup.id = 'grid-selection-popup';
        popup.className = 'grid-selection-popup';
        popup.addEventListener('pointerdown', event => event.stopPropagation());
        popup.innerHTML = `
            <label title="Warna sel">Sel <input class="popup-cell-color" type="color" value="#ffffff"></label>
            <label title="Warna teks">Teks <input class="popup-text-color" type="color" value="#1f2937"></label>
            <button type="button" data-format="bold" title="Tebal"><strong>B</strong></button>
            <button type="button" data-format="italic" title="Miring"><em>I</em></button>
            <button type="button" data-format="align" data-value="left" title="Rata kiri">Kiri</button>
            <button type="button" data-format="align" data-value="center" title="Rata tengah">Tengah</button>
            <button type="button" data-format="align" data-value="right" title="Rata kanan">Kanan</button>
            <button type="button" class="popup-delete" title="Hapus isi sel">Hapus</button>
        `;
        popup.querySelector('.popup-cell-color').addEventListener('input', event => applyCellColor(event.target.value));
        popup.querySelector('.popup-text-color').addEventListener('input', event => applyTextColorValue(event.target.value));
        popup.querySelectorAll('[data-format]').forEach(button => button.addEventListener('click', () => {
            const range = getSelectedRange();
            const sheet = appData.sheets[appData.activeSheetIndex];
            const current = sheet?.cellFormats?.[`${range?.rowStart}:${range?.colStart}`]?.[button.dataset.format];
            applyCellFormat(button.dataset.format, button.dataset.value || !current);
        }));
        popup.querySelector('.popup-delete').addEventListener('click', clearSelectedCells);
        document.body.appendChild(popup);
        return popup;
    }

    function showSelectionPopup() {
        const range = getSelectedRange();
        if (!range) {
            const oldPopup = document.getElementById('grid-selection-popup');
            if (oldPopup) oldPopup.style.display = 'none';
            return;
        }
        const popup = createSelectionPopup();
        const sheet = appData.sheets[appData.activeSheetIndex];
        const firstFormat = sheet?.cellFormats?.[`${range.rowStart}:${range.colStart}`] || {};
        popup.querySelector('.popup-cell-color').value = sheet?.cellColors?.[`${range.rowStart}:${range.colStart}`] || '#ffffff';
        popup.querySelector('.popup-text-color').value = sheet?.textColors?.[`${range.rowStart}:${range.colStart}`] || '#1f2937';
        popup.style.display = 'flex';
        const targetRow = gridTable.querySelectorAll('tbody tr')[range.rowEnd];
        const targetCell = targetRow?.children[range.colEnd + 1];
        if (targetCell) {
            const rect = targetCell.getBoundingClientRect();
            popup.style.left = `${Math.max(8, Math.min(window.innerWidth - popup.offsetWidth - 8, rect.left))}px`;
            popup.style.top = `${Math.max(8, rect.top - popup.offsetHeight - 6)}px`;
        }
        popup.querySelectorAll('[data-format="bold"], [data-format="italic"]').forEach(button => button.classList.toggle('active', !!firstFormat[button.dataset.format]));
    }

    function hideSelectionPopup() {
        const popup = document.getElementById('grid-selection-popup');
        if (popup) popup.style.display = 'none';
    }

    function cloneGridState() {
        return JSON.parse(JSON.stringify(appData));
    }

    function pushUndoState() {
        const snapshot = cloneGridState();
        const previous = undoStack[undoStack.length - 1];
        if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
        undoStack.push(snapshot);
        if (undoStack.length > 50) undoStack.shift();
    }

    function undoLastChange() {
        if (undoStack.length === 0) {
            showStatus('Tidak ada perubahan yang bisa dibatalkan.', 'info');
            return;
        }
        appData = undoStack.pop();
        lastFocusedCell = null;
        renderTabs();
        renderGrid();
        saveGrid();
        showStatus('Perubahan dibatalkan.', 'success');
    }

    // Inject minimal CSS for drag handle visuals if not already present
    (function injectGridHandlesStyle() {
        if (document.getElementById('rbm-data-grid-styles')) return;
        const style = document.createElement('style');
        style.id = 'rbm-data-grid-styles';
        style.textContent = "\
            /* Positioning for header and handle */\n\
            #data-grid th { position: sticky; top: 0; }\n\
            .col-drag-handle { position: absolute; right: 6px; top: 6px; width: 10px; height: 10px; background: #6b7280; border-radius: 50%; cursor: grab; opacity: 0; transition: opacity 0.12s; z-index: 3; }\n\
            .col-delete-handle { position: absolute; left: 6px; top: 6px; width: 14px; height: 14px; background: #ef4444; color: white; border-radius: 50%; font-size:11px; line-height:14px; text-align:center; cursor: pointer; opacity: 0; transition: opacity 0.12s; z-index: 4; }\n\
            #data-grid th:hover .col-drag-handle, #data-grid th.selected .col-drag-handle { opacity: 1; }\n\
            #data-grid th:hover .col-delete-handle, #data-grid th.selected .col-delete-handle { opacity: 1; }\n\
            #data-grid th.drag-over { outline: 2px dashed rgba(99,102,241,0.35); }\n\
            #data-grid th.selected, #data-grid td.column-selected, #data-grid td.range-selected { background-color: #e0e7ff; }\n\
            #data-grid td { user-select: none; touch-action: none; }\n\
            #data-grid td[contenteditable=true] { user-select: text; }\n\
            .grid-selection-popup { position: fixed; display: none; align-items: center; gap: 4px; padding: 6px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 5px 18px rgba(15,23,42,.18); z-index: 10000; flex-wrap: wrap; }\n\
            .grid-selection-popup label, .grid-selection-popup button { font: inherit; font-size: 12px; }\n\
            .grid-selection-popup button { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 4px; padding: 4px 7px; cursor: pointer; }\n\
            .grid-selection-popup button.active { background: #e0e7ff; border-color: #6366f1; }\n\
            .fill-handle { position: absolute; right: -8px; bottom: -8px; width: 24px; height: 24px; border: 0; background: transparent; cursor: crosshair; z-index: 5; line-height: 0; touch-action: none; }\n\
            .fill-handle::after { content: ''; position: absolute; right: 7px; bottom: 7px; width: 8px; height: 8px; border-radius: 50%; background: #4C2A85; border: 2px solid #fff; }\n\
            .column-resize-handle { position: absolute; right: -3px; top: 0; bottom: 0; width: 7px; cursor: col-resize; z-index: 6; }\n\
            .row-resize-handle { position: absolute; left: 0; right: 0; bottom: -3px; height: 7px; cursor: row-resize; z-index: 6; }\n\
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

    function applyCellColor(color) {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        const range = getSelectedRange();
        if (!activeSheet || !range) {
            return false;
        }
        pushUndoState();
        activeSheet.cellColors = activeSheet.cellColors && typeof activeSheet.cellColors === 'object' ? activeSheet.cellColors : {};
        for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
            for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
                activeSheet.cellColors[`${rowIndex}:${colIndex}`] = color;
            }
        }
        renderGrid();
        saveGrid();
        return true;
    }

    function applyColumnColor() {
        if (!applyCellColor(columnColorInput.value)) {
            showStatus('Pilih sel atau blok sel terlebih dahulu.', 'error');
            return;
        }
        showStatus('Warna sel diterapkan.', 'success');
    }

    function applyTextColorValue(color) {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        const range = getSelectedRange();
        if (!activeSheet || !range) return false;
        pushUndoState();
        activeSheet.textColors = activeSheet.textColors && typeof activeSheet.textColors === 'object' ? activeSheet.textColors : {};
        for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
            for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
                activeSheet.textColors[`${rowIndex}:${colIndex}`] = color;
            }
        }
        renderGrid();
        saveGrid();
        return true;
    }

    function applyTextColor() {
        if (!applyTextColorValue(textColorInput.value)) {
            showStatus('Pilih sel atau blok sel terlebih dahulu.', 'error');
            return;
        }
        showStatus('Warna teks diterapkan.', 'success');
    }

    function applyColumnWidth(sheet, colIndex, width) {
        if (!resizeState) pushUndoState();
        const safeWidth = Math.min(600, Math.max(50, Math.round(width)));
        sheet.columnWidths = Array.isArray(sheet.columnWidths) ? sheet.columnWidths : [];
        sheet.columnWidths[colIndex] = safeWidth;
        gridTable.querySelectorAll('tr').forEach(row => {
            const cell = row.children[colIndex + 1];
            if (cell) cell.style.width = `${safeWidth}px`;
        });
    }

    function autoFitColumn(sheet, colIndex) {
        pushUndoState();
        const header = gridTable.querySelector(`thead th[data-col-index="${colIndex}"]`);
        const cells = Array.from(gridTable.querySelectorAll('tbody tr'))
            .map(row => row.children[colIndex + 1])
            .filter(Boolean);
        const values = [header ? header.textContent : columnIndexToLetters(colIndex)]
            .concat(cells.map(cell => cell.textContent || ''));
        const measure = document.createElement('span');
        const source = header || cells[0] || gridTable;
        const style = window.getComputedStyle(source);
        measure.style.cssText = `position:absolute; visibility:hidden; white-space:nowrap; font:${style.font}; font-size:${style.fontSize}; font-family:${style.fontFamily}; font-weight:${style.fontWeight};`;
        document.body.appendChild(measure);
        const longestWidth = values.reduce((width, value) => {
            const valueWidth = String(value).split('\n').reduce((longest, line) => {
                measure.textContent = line;
                return Math.max(longest, measure.getBoundingClientRect().width);
            }, 0);
            return Math.max(width, valueWidth);
        }, 0);
        measure.remove();
        applyColumnWidth(sheet, colIndex, longestWidth + 28);
        saveGrid();
    }

    function applyRowHeight(sheet, rowIndex, height) {
        if (!resizeState) pushUndoState();
        const safeHeight = Math.max(24, Math.round(height));
        sheet.rowHeights = Array.isArray(sheet.rowHeights) ? sheet.rowHeights : [];
        sheet.rowHeights[rowIndex] = safeHeight;
        const row = gridTable.querySelectorAll('tbody tr')[rowIndex];
        if (row) row.style.height = `${safeHeight}px`;
    }

    document.addEventListener('mousemove', (event) => {
        if (!resizeState) return;
        const amount = resizeState.axis === 'column'
            ? event.clientX - resizeState.startPointer
            : event.clientY - resizeState.startPointer;
        if (resizeState.axis === 'column') {
            applyColumnWidth(resizeState.sheet, resizeState.index, resizeState.startSize + amount);
        } else {
            applyRowHeight(resizeState.sheet, resizeState.index, resizeState.startSize + amount);
        }
    });

    document.addEventListener('mouseup', () => {
        if (!resizeState) return;
        resizeState = null;
        saveGrid();
    });

    function getExportCellValue(cellValue, sheetData, rowIndex, colIndex) {
        if (!isFormulaValue(cellValue)) return cellValue;
        return evaluateFormula(cellValue, sheetData, rowIndex, colIndex);
    }

    function getExportData(sheet) {
        return (Array.isArray(sheet.data) ? sheet.data : []).map((row, rowIndex) =>
            (Array.isArray(row) ? row : []).map((cellValue, colIndex) =>
                getExportCellValue(cellValue, sheet.data, rowIndex, colIndex)
            )
        );
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
        document.getElementById('locked-columns-input').value = (activeSheet.lockedColumns || []).map(columnIndexToLetters).join(', ');
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
        pushUndoState();
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

    function focusGridCell(cell) {
        if (!cell) return;
        const target = cell.querySelector('select') || cell;
        target.focus();
        if (target.isContentEditable) {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(target);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    function getCaretOffset(element) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || !element.contains(selection.anchorNode)) return null;
        const range = selection.getRangeAt(0);
        const beforeCaret = range.cloneRange();
        beforeCaret.selectNodeContents(element);
        beforeCaret.setEnd(range.startContainer, range.startOffset);
        return beforeCaret.toString().length;
    }

    function moveToGridCell(cell, rowOffset, colOffset) {
        const row = cell.parentElement;
        const rows = Array.from(gridTable.querySelectorAll('tbody tr'));
        const rowIndex = rows.indexOf(row);
        const cellIndex = Array.from(row.children).indexOf(cell) - 1;
        const targetRow = rows[rowIndex + rowOffset];
        const targetCell = targetRow && targetRow.children[cellIndex + colOffset + 1];
        if (targetCell) {
            cell.blur();
            focusGridCell(targetCell);
            return true;
        }
        return false;
    }

    function getCellRawValue(td) {
        const select = td.querySelector('select');
        if (select) return select.value;
        if (typeof td.dataset.rawValue !== 'undefined' && td.dataset.rawValue !== '') return td.dataset.rawValue;
        return td.textContent || '';
    }

    function commitCellValue(cell, sheet, rowIndex, cellIndex) {
        if (!cell || !sheet || !Array.isArray(sheet.data[rowIndex])) return;
        const value = String(getCellRawValue(cell)).trim();
        if (value.startsWith('=')) {
            cell.dataset.rawValue = value;
            sheet.data[rowIndex][cellIndex] = value;
        } else {
            delete cell.dataset.rawValue;
            sheet.data[rowIndex][cellIndex] = value;
        }
    }

    function pasteValueIntoCell(td, value, sheet, rowIndex, cellIndex) {
        if (!td || !sheet || !Array.isArray(sheet.data[rowIndex])) return;
        if (td.classList.contains('locked-cell') || td.querySelector('select')?.disabled) return;
        const stringValue = String(value ?? '');
        const select = td.querySelector('select');
        if (select) {
            select.value = stringValue;
            sheet.data[rowIndex][cellIndex] = select.value;
            return;
        }
        sheet.data[rowIndex][cellIndex] = stringValue;
        if (stringValue.startsWith('=')) {
            td.dataset.rawValue = stringValue;
            td.textContent = evaluateFormula(stringValue, sheet.data, rowIndex, cellIndex);
            td.classList.add('formula-cell');
        } else {
            delete td.dataset.rawValue;
            td.textContent = stringValue;
            td.classList.remove('formula-cell');
        }
    }

    function getCellCoordinates(td) {
        if (!td || td.tagName !== 'TD') return null;
        const row = td.parentElement;
        const rowHead = row.querySelector('th[data-row-index]');
        const rowIndex = rowHead ? parseInt(rowHead.dataset.rowIndex, 10) : -1;
        const colIndex = Array.from(row.children).indexOf(td) - 1;
        return rowIndex >= 0 && colIndex >= 0 ? { rowIndex, colIndex } : null;
    }

    function normalizeRange(start, end) {
        return {
            rowStart: Math.min(start.rowIndex, end.rowIndex),
            rowEnd: Math.max(start.rowIndex, end.rowIndex),
            colStart: Math.min(start.colIndex, end.colIndex),
            colEnd: Math.max(start.colIndex, end.colIndex)
        };
    }

    function getFillValue(sheet, range, rowIndex, colIndex) {
        const isHorizontal = colIndex > range.colEnd;
        const sourceWidth = range.colEnd - range.colStart + 1;
        const sourceHeight = range.rowEnd - range.rowStart + 1;
        const sourceRowIndex = range.rowStart + ((rowIndex - range.rowStart) % sourceHeight);
        const sourceColIndex = range.colStart + ((colIndex - range.colStart) % sourceWidth);
        const sourceValue = sheet.data[sourceRowIndex]?.[sourceColIndex] ?? '';
        const sourceValues = [];
        if (isHorizontal) {
            for (let sourceCol = range.colStart; sourceCol <= range.colEnd; sourceCol++) {
                sourceValues.push(sheet.data[rowIndex]?.[sourceCol] ?? '');
            }
        } else {
            for (let sourceRow = range.rowStart; sourceRow <= range.rowEnd; sourceRow++) {
                sourceValues.push(sheet.data[sourceRow]?.[colIndex] ?? '');
            }
        }

        const numericValues = sourceValues.map(Number);
        if (sourceValues.every(value => String(value).trim() !== '' && Number.isFinite(Number(value)))) {
            const step = numericValues.length > 1 ? numericValues[1] - numericValues[0] : 1;
            const distance = isHorizontal ? colIndex - range.colStart : rowIndex - range.rowStart;
            return numericValues[0] + step * distance;
        }
        if (isFormulaValue(sourceValue)) {
            return adjustFormulaForPaste(sourceValue, rowIndex - sourceRowIndex, colIndex - sourceColIndex);
        }
        return sourceValue;
    }

    function updateFillHandle() {
        document.querySelectorAll('#data-grid .fill-handle').forEach(handle => handle.remove());
        if (fillDrag) return;
        const range = appData.selectedRange;
        if (!range) return;
        const row = gridTable.querySelectorAll('tbody tr')[range.rowEnd];
        const cell = row && row.children[range.colEnd + 1];
        if (!cell) return;
        const handle = document.createElement('div');
        handle.className = 'fill-handle';
        handle.title = 'Tarik untuk memilih blok sel';
        handle.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (handle.setPointerCapture) handle.setPointerCapture(event.pointerId);
            fillDrag = { range: Object.assign({}, range), pointerId: event.pointerId };
        });
        cell.appendChild(handle);
    }

    function updateRangeSelection(range, showPopup = false) {
        document.querySelectorAll('#data-grid td.range-selected').forEach(cell => cell.classList.remove('range-selected'));
        document.querySelectorAll('#data-grid td.column-selected').forEach(cell => cell.classList.remove('column-selected'));
        if (!range) return;
        document.querySelectorAll('#data-grid tbody tr').forEach((row, rowIndex) => {
            if (rowIndex < range.rowStart || rowIndex > range.rowEnd) return;
            for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
                const cell = row.children[colIndex + 1];
                if (cell) cell.classList.add('range-selected');
            }
        });
        updateFillHandle();
        if (showPopup) showSelectionPopup();
    }

    function getRangeData(sheet, range) {
        const values = [];
        for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
            const row = [];
            for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
                row.push(sheet.data[rowIndex]?.[colIndex] ?? '');
            }
            values.push(row);
        }
        return values;
    }

    function adjustFormulaForPaste(value, rowOffset, colOffset) {
        if (!isFormulaValue(value)) return value;
        return value.replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (match, absoluteCol, letters, absoluteRow, number) => {
            const parsed = parseA1Reference(letters + number);
            if (!parsed) return match;
            const nextCol = absoluteCol ? parsed.col : Math.max(0, parsed.col + colOffset);
            const nextRow = absoluteRow ? parsed.row : Math.max(0, parsed.row + rowOffset);
            return `${absoluteCol ? '$' : ''}${columnIndexToLetters(nextCol)}${absoluteRow ? '$' : ''}${nextRow + 1}`;
        });
    }

    function pasteRangeIntoGrid(values, sheet, startRow, startCol, rowDelta, colDelta) {
        values.forEach((sourceRow, rowOffset) => {
            sourceRow.forEach((value, colOffset) => {
                const rowIndex = startRow + rowOffset;
                const colIndex = startCol + colOffset;
                const row = gridTable.querySelectorAll('tbody tr')[rowIndex];
                const td = row && row.children[colIndex + 1];
                const adjustedValue = adjustFormulaForPaste(value, rowDelta, colDelta);
                if (td) pasteValueIntoCell(td, adjustedValue, sheet, rowIndex, colIndex);
            });
        });
    }

    function clearSelectedCells() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return false;
        let range = appData.selectedRange;
        if (!range && typeof appData.selectedColumnIndex === 'number') {
            range = {
                rowStart: 0,
                rowEnd: activeSheet.data.length - 1,
                colStart: appData.selectedColumnIndex,
                colEnd: appData.selectedColumnIndex
            };
        }
        if (!range) return false;
        pushUndoState();

        for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
            for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
                const row = gridTable.querySelectorAll('tbody tr')[rowIndex];
                const td = row && row.children[colIndex + 1];
                if (td) pasteValueIntoCell(td, '', activeSheet, rowIndex, colIndex);
            }
        }
        renderGrid();
        saveGrid();
        showStatus('Isi blok terhapus.', 'success');
        return true;
    }

    document.addEventListener('pointerup', () => {
        if (fillDrag) {
            fillDrag = null;
            renderGrid();
        }
        isSelectingRange = false;
    });

    document.addEventListener('pointermove', (event) => {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const td = element && element.closest ? element.closest('td') : null;
        const coordinates = getCellCoordinates(td);
        if (!coordinates) return;
        if (!fillDrag) {
            if (!isSelectingRange || !rangeAnchor) return;
            appData.selectedRange = normalizeRange(rangeAnchor, coordinates);
            updateRangeSelection(appData.selectedRange);
            return;
        }
        appData.selectedRange = normalizeRange(
            { rowIndex: fillDrag.range.rowStart, colIndex: fillDrag.range.colStart },
            coordinates
        );
        updateRangeSelection(appData.selectedRange);
    });

    // Keyboard copy/paste for cells and selected ranges.
    document.addEventListener('keydown', function (e) {
        const activeCell = e.target && e.target.closest ? e.target.closest('td') : null;
        const isFormControl = e.target && e.target.closest ? e.target.closest('input, textarea, select') : null;
        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'z' && !isFormControl && (activeCell || appData.selectedRange || typeof appData.selectedColumnIndex === 'number')) {
            e.preventDefault();
            undoLastChange();
            return;
        }
        if (e.key === 'Delete' && (activeCell || !isFormControl) && clearSelectedCells()) {
            e.preventDefault();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'c') {
            const active = document.activeElement;
            const td = active && typeof active.closest === 'function' ? active.closest('td') : null;
            if (appData.selectedRange) {
                const activeSheet = appData.sheets[appData.activeSheetIndex];
                if (activeSheet) {
                    clipboardBuffer = {
                        type: 'range',
                        values: getRangeData(activeSheet, appData.selectedRange),
                        sourceRow: appData.selectedRange.rowStart,
                        sourceCol: appData.selectedRange.colStart
                    };
                    showStatus('Blok sel tersalin ke clipboard internal', 'success');
                    e.preventDefault();
                }
            } else if (td) {
                clipboardBuffer = { type: 'cell', value: String(getCellRawValue(td)) };
                showStatus('Tersalin ke clipboard internal', 'success');
                e.preventDefault();
            } else if (typeof appData.selectedColumnIndex === 'number') {
                const activeSheet = appData.sheets[appData.activeSheetIndex];
                if (activeSheet) {
                    clipboardBuffer = {
                        type: 'column',
                        values: activeSheet.data.map(row => row[appData.selectedColumnIndex] ?? '')
                    };
                    showStatus('Kolom tersalin ke clipboard internal', 'success');
                    e.preventDefault();
                }
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'v') {
            if (clipboardBuffer === null) return;
            const active = document.activeElement;
            const td = active && typeof active.closest === 'function' ? active.closest('td') : null;
            const activeSheet = appData.sheets[appData.activeSheetIndex];
            if (appData.selectedRange && activeSheet) {
                pushUndoState();
                const pastedValue = clipboardBuffer.type === 'cell'
                    ? clipboardBuffer.value
                    : clipboardBuffer.values?.[0]?.[0] ?? clipboardBuffer.values?.[0] ?? '';
                for (let rowIndex = appData.selectedRange.rowStart; rowIndex <= appData.selectedRange.rowEnd; rowIndex++) {
                    for (let colIndex = appData.selectedRange.colStart; colIndex <= appData.selectedRange.colEnd; colIndex++) {
                        const row = gridTable.querySelectorAll('tbody tr')[rowIndex];
                        const targetCell = row && row.children[colIndex + 1];
                        if (targetCell) pasteValueIntoCell(targetCell, pastedValue, activeSheet, rowIndex, colIndex);
                    }
                }
                renderGrid();
                saveGrid();
                showStatus('Data ditempel ke semua sel yang dipilih.', 'success');
                e.preventDefault();
                return;
            }
            if (td) {
                const coordinates = getCellCoordinates(td);
                if (!coordinates) return;
                const { rowIndex, colIndex: cellIndex } = coordinates;

                if (!activeSheet) return;
                if (clipboardBuffer.type === 'range') {
                    pushUndoState();
                    pasteRangeIntoGrid(
                        clipboardBuffer.values,
                        activeSheet,
                        rowIndex,
                        cellIndex,
                        rowIndex - clipboardBuffer.sourceRow,
                        cellIndex - clipboardBuffer.sourceCol
                    );
                    renderGrid();
                } else {
                    pushUndoState();
                    const value = clipboardBuffer.type === 'cell' ? clipboardBuffer.value : clipboardBuffer.values[rowIndex];
                    pasteValueIntoCell(td, value, activeSheet, rowIndex, cellIndex);
                }

                saveGrid();
                showStatus('Terpaste', 'success');
                e.preventDefault();
            } else if (clipboardBuffer.type === 'column' && typeof appData.selectedColumnIndex === 'number') {
                const activeSheet = appData.sheets[appData.activeSheetIndex];
                if (!activeSheet) return;
                pushUndoState();
                const rows = gridTable.querySelectorAll('tbody tr');
                rows.forEach((row, rowIndex) => {
                    const td = row.children[appData.selectedColumnIndex + 1];
                    if (td) pasteValueIntoCell(td, clipboardBuffer.values[rowIndex], activeSheet, rowIndex, appData.selectedColumnIndex);
                });
                renderGrid();
                saveGrid();
                showStatus('Kolom terpaste', 'success');
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
            if (outletSelector && outletSelector.value) return outletSelector.value;
            return localStorage.getItem('rbm_last_selected_outlet') || 'GLOBAL';
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
        const outlets = JSON.parse(localStorage.getItem('rbm_outlets') || '[]');
        const outletNames = JSON.parse(localStorage.getItem('rbm_outlet_names') || '{}');
        const activeOutlet = getActiveOutletId();

        outletSelector.innerHTML = ''; // Kosongkan pilihan

        if (outlets.length === 0) {
            outletSelector.innerHTML = userIsOwner()
                ? '<option value="GLOBAL">GLOBAL (Template Owner)</option>'
                : '<option value="default">Tidak ada outlet</option>';
            return;
        }

        outletSelector.disabled = false;
        if (userIsOwner()) {
            const globalOption = document.createElement('option');
            globalOption.value = 'GLOBAL';
            globalOption.textContent = 'GLOBAL (Template Owner)';
            globalOption.selected = activeOutlet === 'GLOBAL';
            outletSelector.appendChild(globalOption);
        }

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
            th.textContent = activeSheet.headers[i] || columnIndexToLetters(i); // [DIUBAH] Ambil dari headers atau default A, B, C...
            if (Array.isArray(activeSheet.columnWidths) && activeSheet.columnWidths[i]) {
                th.style.width = `${activeSheet.columnWidths[i]}px`;
            }
            th.setAttribute('contenteditable', developerMode ? 'true' : 'false'); // [BARU] Editable di mode developer
            th.style.cursor = developerMode ? 'text' : 'default'; // [BARU] Kursor teks di mode developer
            // Make header draggable to allow column reorder
            th.draggable = true;
            th.dataset.colIndex = i;

            // Select header on click to show handle
            th.addEventListener('click', () => {
                appData.selectedColumnIndex = i;
                appData.selectedRange = null;
                rangeAnchor = null;
                showSelectionPopup();
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
                if (!confirm(`Hapus kolom ${columnIndexToLetters(i)} ?`)) return;
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
                appData.selectedRange = null;
                rangeAnchor = null;
                renderGrid();
            });

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'column-resize-handle';
            resizeHandle.title = 'Seret untuk mengatur lebar kolom';
            resizeHandle.addEventListener('dblclick', (event) => {
                event.preventDefault();
                event.stopPropagation();
                autoFitColumn(activeSheet, i);
            });
            resizeHandle.addEventListener('mousedown', (event) => {
                event.preventDefault();
                event.stopPropagation();
                pushUndoState();
                resizeState = {
                    axis: 'column',
                    sheet: activeSheet,
                    index: i,
                    startPointer: event.clientX,
                    startSize: th.getBoundingClientRect().width
                };
            });

            if (i === appData.selectedColumnIndex) th.classList.add('selected');
            headerRow.appendChild(th);
            th.appendChild(delHandle);
            th.appendChild(handle);
            th.appendChild(resizeHandle);
        }
        // Buat Body
        const tbody = gridTable.createTBody();
        gridData.forEach((rowData, rowIndex) => {
            const row = tbody.insertRow();
            const rowNumCell = row.insertCell();
            rowNumCell.outerHTML = `<th data-row-index="${rowIndex}">${rowIndex + 1}</th>`; // Nomor baris
            const renderedRowHeader = row.querySelector('th[data-row-index]');
            if (Array.isArray(activeSheet.rowHeights) && activeSheet.rowHeights[rowIndex]) {
                row.style.height = `${activeSheet.rowHeights[rowIndex]}px`;
            }
            if (renderedRowHeader) {
                renderedRowHeader.style.position = 'sticky';
                renderedRowHeader.style.left = '0';
                const rowResizeHandle = document.createElement('div');
                rowResizeHandle.className = 'row-resize-handle';
                rowResizeHandle.title = 'Seret untuk mengatur tinggi baris';
                rowResizeHandle.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    pushUndoState();
                    resizeState = {
                        axis: 'row',
                        sheet: activeSheet,
                        index: rowIndex,
                        startPointer: event.clientY,
                        startSize: row.getBoundingClientRect().height
                    };
                });
                renderedRowHeader.appendChild(rowResizeHandle);
            }

            rowData.forEach(cellData => {
                const cell = row.insertCell();
                const cellIndex = Array.from(row.children).indexOf(cell) - 1; // -1 karena ada kolom nomor baris
                const cellColor = activeSheet.cellColors?.[`${rowIndex}:${cellIndex}`];
                if (cellColor) cell.style.backgroundColor = cellColor;
                const textColor = activeSheet.textColors?.[`${rowIndex}:${cellIndex}`];
                if (textColor) cell.style.color = textColor;
                const cellFormat = activeSheet.cellFormats?.[`${rowIndex}:${cellIndex}`] || {};
                if (cellFormat.bold) cell.style.fontWeight = '700';
                if (cellFormat.italic) cell.style.fontStyle = 'italic';
                if (cellFormat.align) cell.style.textAlign = cellFormat.align;
                if (cellIndex === appData.selectedColumnIndex) cell.classList.add('column-selected');
                if (appData.selectedRange && rowIndex >= appData.selectedRange.rowStart && rowIndex <= appData.selectedRange.rowEnd && cellIndex >= appData.selectedRange.colStart && cellIndex <= appData.selectedRange.colEnd) {
                    cell.classList.add('range-selected');
                }
                cell.addEventListener('pointerdown', (event) => {
                    if (event.button !== 0) return;
                    hideSelectionPopup();
                    if (cell.setPointerCapture) cell.setPointerCapture(event.pointerId);
                    const coordinates = getCellCoordinates(cell);
                    if (!coordinates) return;
                    const oldCell = editingCell || document.activeElement?.closest?.('td');
                    if (oldCell && oldCell !== cell) {
                        const oldCoordinates = getCellCoordinates(oldCell);
                        if (oldCoordinates) commitCellValue(oldCell, activeSheet, oldCoordinates.rowIndex, oldCoordinates.colIndex);
                    }
                    if (!event.shiftKey) rangeAnchor = coordinates;
                    if (!rangeAnchor) rangeAnchor = coordinates;
                    appData.selectedColumnIndex = null;
                    appData.selectedRange = normalizeRange(rangeAnchor, coordinates);
                    isSelectingRange = true;
                    updateRangeSelection(appData.selectedRange, false);
                });
                cell.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    const coordinates = getCellCoordinates(cell);
                    if (!coordinates) return;
                    const oldCell = editingCell || document.activeElement?.closest?.('td');
                    if (oldCell && oldCell !== cell) {
                        const oldCoordinates = getCellCoordinates(oldCell);
                        if (oldCoordinates) commitCellValue(oldCell, activeSheet, oldCoordinates.rowIndex, oldCoordinates.colIndex);
                    }
                    rangeAnchor = coordinates;
                    appData.selectedColumnIndex = null;
                    appData.selectedRange = coordinates && normalizeRange(coordinates, coordinates);
                    isSelectingRange = false;
                    updateRangeSelection(appData.selectedRange, true);
                });
                cell.addEventListener('pointerover', () => {
                    if (!isSelectingRange || !rangeAnchor) return;
                    const coordinates = getCellCoordinates(cell);
                    if (!coordinates) return;
                    appData.selectedRange = normalizeRange(rangeAnchor, coordinates);
                    updateRangeSelection(appData.selectedRange);
                });
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
                    cell.draggable = false;
                    cell.addEventListener('dragstart', event => event.preventDefault());
                    if (isFormula) {
                        cell.dataset.rawValue = cellData;
                        cell.classList.add('formula-cell');
                    } else {
                        delete cell.dataset.rawValue;
                    }

                    cell.addEventListener('focus', function() {
                        editingCell = cell;
                        if (lastFocusedCell !== cell) {
                            pushUndoState();
                            lastFocusedCell = cell;
                        }
                        if (cell.dataset.rawValue) {
                            cell.textContent = cell.dataset.rawValue;
                            updateFillHandle();
                        }
                    });

                    cell.addEventListener('input', function() {
                        commitCellValue(cell, activeSheet, rowIndex, cellIndex);
                    });

                    cell.addEventListener('blur', function() {
                        const currentValue = String(cell.textContent || '').trim();
                        commitCellValue(cell, activeSheet, rowIndex, cellIndex);
                        if (editingCell === cell) editingCell = null;
                        if (currentValue.startsWith('=')) {
                            cell.dataset.rawValue = currentValue;
                            const activeSheet = appData.sheets[appData.activeSheetIndex];
                            if (activeSheet && activeSheet.data && Array.isArray(activeSheet.data[rowIndex])) {
                                activeSheet.data[rowIndex][cellIndex] = currentValue;
                            }
                            const evaluated = evaluateFormula(currentValue, activeSheet.data, rowIndex, cellIndex);
                            cell.textContent = evaluated;
                            updateFillHandle();
                        } else {
                            delete cell.dataset.rawValue;
                            const activeSheet = appData.sheets[appData.activeSheetIndex];
                            if (activeSheet && activeSheet.data && Array.isArray(activeSheet.data[rowIndex])) {
                                activeSheet.data[rowIndex][cellIndex] = currentValue;
                            }
                            cell.textContent = currentValue;
                            updateFillHandle();
                        }
                    });

                    cell.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            cell.blur();
                            moveToGridCell(cell, 1, 0);
                            return;
                        }

                        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            moveToGridCell(cell, 1, 0);
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            moveToGridCell(cell, -1, 0);
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                            const caretOffset = getCaretOffset(cell);
                            const textLength = cell.textContent.length;
                            const atBoundary = e.key === 'ArrowLeft' ? caretOffset === 0 : caretOffset === textLength;
                            if (atBoundary) {
                                e.preventDefault();
                                moveToGridCell(cell, 0, e.key === 'ArrowLeft' ? -1 : 1);
                            }
                        }
                    });
                }

                if (isColumnLocked || isRowLocked) cell.classList.add('locked-cell');
            });
        });
        updateFillHandle();
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
                    if (!Array.isArray(sheet.columnWidths)) sheet.columnWidths = [];
                    if (!Array.isArray(sheet.rowHeights)) sheet.rowHeights = [];
                    if (!sheet.cellColors || typeof sheet.cellColors !== 'object') sheet.cellColors = {};
                    if (!sheet.textColors || typeof sheet.textColors !== 'object') sheet.textColors = {};
                    if (!sheet.cellFormats || typeof sheet.cellFormats !== 'object') sheet.cellFormats = {};
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
                        dropdownColumns: [],
                        columnWidths: [],
                        rowHeights: [],
                        cellColors: {},
                        textColors: {},
                        cellFormats: {}
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
                    lockedRows: [],
                    columnWidths: [],
                    rowHeights: [],
                    cellColors: {},
                    textColors: {},
                    cellFormats: {}
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
    function exportToExcel(selectedSheetIndexes) {
        if (typeof XLSX === 'undefined') {
            showStatus('Library Excel belum siap. Coba lagi.', 'error');
            return;
        }

        const workbook = XLSX.utils.book_new();
        const sheetsToExport = Array.isArray(selectedSheetIndexes) && selectedSheetIndexes.length > 0
            ? appData.sheets.filter((_, index) => selectedSheetIndexes.includes(index))
            : appData.sheets;

        sheetsToExport.forEach((sheet) => {
            const exportData = getExportData(sheet);

            const worksheet = XLSX.utils.aoa_to_sheet(exportData);
            const safeSheetName = sheet.name.substring(0, 31).replace(/[*?:\\/\[\]]/g, '');
            XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'Sheet');
        });

        const today = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `DataGrid_Export_${getActiveOutletId()}_${today}.xlsx`);
        showStatus('File Excel sedang diunduh.', 'success');
    }

    function openExportSheetModal() {
        const modal = document.getElementById('export-sheet-modal');
        const sheetList = document.getElementById('export-sheet-list');
        if (!Array.isArray(appData.sheets) || appData.sheets.length === 0) {
            showStatus('Tidak ada sheet yang tersedia untuk diekspor.', 'error');
            return;
        }

        if (!modal || !sheetList) {
            openExportSheetPrompt();
            return;
        }

        sheetList.innerHTML = '';
        appData.sheets.forEach((sheet, index) => {
            const label = document.createElement('label');
            label.style.display = 'block';
            label.style.marginBottom = '8px';
            label.style.cursor = 'pointer';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = index;
            checkbox.checked = index === appData.activeSheetIndex;
            checkbox.style.marginRight = '8px';

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(sheet.name || `Sheet${index + 1}`));
            sheetList.appendChild(label);
        });

        modal.style.display = 'flex';
        modal.classList.add('show');
    }

    function closeExportSheetModal() {
        const modal = document.getElementById('export-sheet-modal');
        if (!modal) return;
        modal.style.display = 'none';
        modal.classList.remove('show');
    }

    function openExportSheetPrompt() {
        const sheetLabels = appData.sheets.map((sheet, index) => `${index + 1}. ${sheet.name || `Sheet${index + 1}`}`).join('\n');
        const defaultSelection = appData.activeSheetIndex + 1;
        const answer = window.prompt(`Pilih sheet untuk diekspor (masukkan nomor terpisah koma):\n${sheetLabels}`, `${defaultSelection}`);
        if (answer === null) return;

        const selectedIndexes = answer.split(',').map(part => Number(part.trim()) - 1).filter(i => Number.isInteger(i) && i >= 0 && i < appData.sheets.length);
        if (selectedIndexes.length === 0) {
            showStatus('Masukkan minimal satu nomor sheet yang valid.', 'error');
            return;
        }
        exportToExcel(selectedIndexes);
    }

    function confirmExportSheets() {
        const sheetList = document.getElementById('export-sheet-list');
        if (!sheetList) return;
        const checkboxes = sheetList.querySelectorAll('input[type="checkbox"]');
        const selectedSheetIndexes = [];
        checkboxes.forEach(input => {
            if (input.checked) selectedSheetIndexes.push(Number(input.value));
        });
        if (selectedSheetIndexes.length === 0) {
            showStatus('Pilih minimal satu sheet untuk diekspor.', 'error');
            return;
        }
        closeExportSheetModal();
        exportToExcel(selectedSheetIndexes);
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
                pushUndoState();
                
                // [DIUBAH] Import semua sheet dari file Excel
                const newSheets = [];
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Ambil semua baris
                    newSheets.push({
                        name: sheetName,
                        data: sheetData,
                        headers: []
                    });
                });
                // Normalize rows/columns: ensure consistent column counts and basic padding
                appData.sheets = newSheets.map(sheet => {
                    const data = Array.isArray(sheet.data) ? sheet.data.map(r => Array.isArray(r) ? r.slice() : []) : [];
                    const maxDataCols = data.reduce((m, r) => Math.max(m, r.length), 0);
                    const maxCols = Math.max(5, maxDataCols);
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
                        dropdownColumns: sheet.dropdownColumns || [],
                        columnWidths: sheet.columnWidths || [],
                        rowHeights: sheet.rowHeights || [],
                        cellColors: sheet.cellColors || {},
                        textColors: sheet.textColors || {},
                        cellFormats: sheet.cellFormats || {}
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
        pushUndoState();
        const newSheetName = `Sheet${appData.sheets.length + 1}`;
        appData.sheets.push({
            name: newSheetName,
            data: Array(10).fill(null).map(() => Array(5).fill('')), // Grid default
            headers: [], // [BARU] Inisialisasi headers untuk sheet baru
            lockedColumns: [],
            lockedRows: [],
            dropdownColumns: [],
            columnWidths: [],
            rowHeights: [],
            cellColors: {},
            textColors: {},
            cellFormats: {}
        });
        appData.activeSheetIndex = appData.sheets.length - 1;
        renderTabs();
        renderGrid();
    }

    function addRow() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        pushUndoState();
        const numCols = activeSheet.data.length > 0 ? activeSheet.data[0].length : 5;
        activeSheet.data.push(Array(numCols).fill(''));
        renderGrid();
    }

    function addColumn() {
        const activeSheet = appData.sheets[appData.activeSheetIndex];
        if (!activeSheet) return;
        pushUndoState();
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
        pushUndoState();
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
        pushUndoState();
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
        pushUndoState();
        if (appData.sheets.length <= 1) {
            appData.sheets = [{ name: 'Sheet1', data: Array(10).fill(null).map(() => Array(5).fill('')), headers: [], lockedColumns: [], lockedRows: [], dropdownColumns: [], columnWidths: [], rowHeights: [], cellColors: {}, textColors: {}, cellFormats: {} }];
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
    exportBtn.addEventListener('click', function(event) {
        event.preventDefault();
        openExportSheetModal();
    });
    importBtn.addEventListener('click', handleImport);
    addRowBtn.addEventListener('click', addRow);
    // delete row button
    const deleteRowBtn = document.getElementById('delete-row-btn');
    if (deleteRowBtn) deleteRowBtn.addEventListener('click', deleteRow);
    addColBtn.addEventListener('click', addColumn);
    applyColumnColorBtn.addEventListener('click', applyColumnColor);
    applyTextColorBtn.addEventListener('click', applyTextColor);
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
    const confirmExportBtn = document.getElementById('confirm-export-sheets-btn');
    if (confirmExportBtn) confirmExportBtn.addEventListener('click', confirmExportSheets);
});