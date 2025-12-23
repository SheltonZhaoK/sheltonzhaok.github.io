// Application State
const state = {
    data: [],
    filteredData: [],
    currentPage: 1,
    pageSize: 50,
    sortColumn: null,
    sortDirection: 'asc',
    visibleColumns: new Set(['ct', 'tid', 'r', 'rs', 'of', 'em','epm', 'O', 'W', 'A','AA', 'F', 'M','a1', 'a2','a3']),
    columns: []
};

// Key mapping (short -> display name)
const columnLabels = {
    'ct': 'Cancer Type',
    'tid': 'Trial ID',
    'r': 'Rule Text',
    'rs': 'Rule Type',
    'cid': 'Cluster',
    'ccr': 'Cluster Center',
    'of': 'Frequency',
    'nt': '# Trials',
    'em': 'Enroll (mean)',
    'es': 'Enroll (std)',
    'sm': 'Sites (mean)',
    'ss': 'Sites (std)',
    'rm': 'Duration (mean)',
    'rms': 'Duration (std)',
    'epm': 'EPSM (mean)',
    'eps': 'EPSM (std)',
    'sd': 'Start Date',
    'sds': 'Start (std)',
    'O': 'Overall Exclusion%',
    'W': 'White %',
    'A': 'Asian %',
    'AA': 'African-American %',
    'F': 'Female %',
    'M': 'Male %',
    'a1': '18-50 %',
    'a2': '50-65 %',
    'a3': '>65 %'
};

// Column groups for toggle panel
const columnGroups = {
    'Basic Info': ['ct', 'tid', 'r', 'rs', 'cid', 'ccr'],
    'Historical Stats': ['of', 'nt', 'em', 'es', 'sm', 'ss', 'rm', 'rms', 'epm', 'eps', 'sd', 'sds'],
    'Exclusion Rates': ['O', 'W', 'A', 'AA', 'F', 'M', 'a1', 'a2', 'a3']
};

// Exclusion rate columns
const exclCols = ['O', 'W', 'A', 'AA', 'F', 'M', 'a1', 'a2', 'a3'];
const exclLabels = {'O': 'Overall', 'W': 'White', 'A': 'Asian', 'AA': 'African-American', 'F': 'Female', 'M': 'Male', 'a1': '18-50', 'a2': '50-65', 'a3': '>65'};

// DOM Elements
const el = {
    searchInput: document.getElementById('searchInput'),
    cancerFilter: document.getElementById('cancerFilter'),
    sectionFilter: document.getElementById('sectionFilter'),
    trialFilter: document.getElementById('trialFilter'),
    drugFilter: document.getElementById('drugFilter'),
    clusterToggle: document.getElementById('clusterToggle'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    tableHead: document.getElementById('tableHead'),
    tableBody: document.getElementById('tableBody'),
    rowCount: document.getElementById('rowCount'),
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose'),
    exportBtn: document.getElementById('exportBtn'),
    columnsBtn: document.getElementById('columnsBtn'),
    columnPanel: document.getElementById('columnPanel'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Initialize Application
async function init() {
    try {
        showLoading(true);
        await loadData();
        populateFilters();
        buildColumnPanel();
        updateStats();
        setupEventListeners();
        applyFilters();
        showLoading(false);
    } catch (error) {
        console.error('Error initializing app:', error);
        showLoading(false);
        alert('Error loading data. Please check that data/rules.json exists.');
    }
}

// Load Data from JSON file
async function loadData() {
    const response = await fetch('data/rules.json');
    if (!response.ok) throw new Error('Failed to load data');
    state.data = await response.json();
    state.columns = Object.keys(state.data[0] || {});
}

// Show/Hide Loading
function showLoading(show) {
    if (el.loadingOverlay) {
        el.loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    el.searchInput.addEventListener('input', debounce(applyFilters, 300));
    el.cancerFilter.addEventListener('change', applyFilters);
    el.sectionFilter.addEventListener('change', applyFilters);
    el.trialFilter.addEventListener('change', applyFilters);
    el.drugFilter.addEventListener('change', applyFilters);
    
    el.clusterToggle.addEventListener('click', () => {
        el.clusterToggle.classList.toggle('active');
        applyFilters();
    });
    
    el.pageSizeSelect.addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value);
        state.currentPage = 1;
        renderTable();
    });
    
    el.modalClose.addEventListener('click', closeModal);
    el.modalOverlay.addEventListener('click', (e) => {
        if (e.target === el.modalOverlay) closeModal();
    });
    
    el.exportBtn.addEventListener('click', exportCSV);
    
    el.columnsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        el.columnPanel.classList.toggle('active');
    });
    
    document.addEventListener('click', () => el.columnPanel.classList.remove('active'));
    el.columnPanel.addEventListener('click', (e) => e.stopPropagation());
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
    
    document.getElementById('helpBtn').addEventListener('click', showHelp);
}

// Populate Filter Dropdowns
function populateFilters() {
    const cancers = [...new Set(state.data.map(d => d.ct))].sort();
    el.cancerFilter.innerHTML = '<option value="">All Cancer Types</option>' + 
        cancers.map(c => `<option value="${c}">${c.replace(/_/g, ' ')}</option>`).join('');
    
    const trials = [...new Set(state.data.map(d => d.tid))].sort();
    el.trialFilter.innerHTML = '<option value="">All Trials</option>' + 
        trials.map(t => `<option value="${t}">${t}</option>`).join('');
}

// Build Column Toggle Panel
function buildColumnPanel() {
    let html = '';
    for (const [group, cols] of Object.entries(columnGroups)) {
        const availableCols = cols.filter(c => state.columns.includes(c));
        if (!availableCols.length) continue;
        html += `<div class="column-group-title">${group}</div>`;
        for (const col of availableCols) {
            const checked = state.visibleColumns.has(col) ? 'checked' : '';
            html += `<label class="column-toggle-item">
                <input type="checkbox" data-column="${col}" ${checked}>
                ${columnLabels[col] || col}
            </label>`;
        }
    }
    el.columnPanel.innerHTML = html;
    
    el.columnPanel.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            const col = e.target.dataset.column;
            if (e.target.checked) state.visibleColumns.add(col);
            else state.visibleColumns.delete(col);
            renderTable();
        });
    });
}

// Update Statistics Display
function updateStats() {
    document.getElementById('statRules').textContent = state.data.length.toLocaleString();
    document.getElementById('statTrials').textContent = '285';
    document.getElementById('statCancers').textContent = new Set(state.data.map(d => d.ct)).size;
    document.getElementById('statPatients').textContent = '20,126';
}

// Apply Filters
function applyFilters() {
    const search = el.searchInput.value.toLowerCase();
    const cancer = el.cancerFilter.value;
    const section = el.sectionFilter.value;
    const trial = el.trialFilter.value;
    const drug = el.drugFilter.value;
    const uniqueOnly = el.clusterToggle.classList.contains('active');

    state.filteredData = state.data.filter(row => {
        if (search && !row.r.toLowerCase().includes(search)) return false;
        if (cancer && row.ct !== cancer) return false;
        if (section && row.rs !== section) return false;
        if (trial && row.tid !== trial) return false;
        if (drug && row[drug] !== 'Yes') return false;
        if (uniqueOnly && row.r !== row.ccr) return false;
        return true;
    });

    state.currentPage = 1;
    renderTable();
}

// Render Table
function renderTable() {
    let sorted = [...state.filteredData];
    
    if (state.sortColumn) {
        sorted.sort((a, b) => {
            let aV = a[state.sortColumn], bV = b[state.sortColumn];
            const aN = parseFloat(aV), bN = parseFloat(bV);
            if (!isNaN(aN) && !isNaN(bN)) {
                return state.sortDirection === 'asc' ? aN - bN : bN - aN;
            }
            aV = String(aV).toLowerCase();
            bV = String(bV).toLowerCase();
            return state.sortDirection === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
        });
    }

    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    const pageData = sorted.slice(start, end);

    const visCols = state.columns.filter(c => state.visibleColumns.has(c));
    
    // Render Header
    el.tableHead.innerHTML = `<tr>${visCols.map(col => {
        const label = columnLabels[col] || col;
        const isSorted = state.sortColumn === col;
        const indicator = isSorted ? (state.sortDirection === 'asc' ? '↑' : '↓') : '↕';
        return `<th class="${isSorted ? 'sorted' : ''}" data-column="${col}">
            ${label}<span class="sort-indicator">${indicator}</span>
        </th>`;
    }).join('')}</tr>`;

    // Add sort listeners to headers
    el.tableHead.querySelectorAll('th').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.column;
            if (state.sortColumn === col) {
                state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortColumn = col;
                state.sortDirection = 'asc';
            }
            renderTable();
        });
    });

    // Render Body
    el.tableBody.innerHTML = pageData.map(row => {
        const isCenter = row.r === row.ccr;
        return `<tr class="${isCenter ? 'cluster-center' : ''}" data-idx="${state.data.indexOf(row)}">
            ${visCols.map(col => renderCell(row, col)).join('')}
        </tr>`;
    }).join('');

    // Add row click listeners
    el.tableBody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => openModal(state.data[parseInt(tr.dataset.idx)]));
        tr.style.cursor = 'pointer';
    });

    // Update counts and pagination
    el.rowCount.textContent = state.filteredData.length.toLocaleString();
    el.paginationInfo.textContent = `Showing ${start + 1}-${Math.min(end, state.filteredData.length)} of ${state.filteredData.length.toLocaleString()} rows`;
    renderPagination(sorted.length);
}

// Render Individual Cell
function renderCell(row, col) {
    const val = row[col];
    
    if (col === 'r') {
        return `<td><div class="rule-text" title="${escapeHtml(val)}">${escapeHtml(val)}</div></td>`;
    }
    
    if (col === 'rs') {
        return `<td><span class="badge badge-${val === 'inclusion' ? 'inclusion' : 'exclusion'}">${val}</span></td>`;
    }
    
    if (col === 'ct') {
        return `<td><span class="badge badge-cancer">${val.replace(/_/g, ' ')}</span></td>`;
    }
    
    if (col === 'of') {
        const freq = parseFloat(val) || 0;
        return `<td class="numeric">${(freq * 100).toFixed(1)}%</td>`;
    }
    
    if (exclCols.includes(col)) {
        const rate = parseFloat(val) || 0;
        const pct = rate.toFixed(1);
        const cls = rate < 30 ? 'low' : rate < 60 ? 'medium' : 'high';
        return `<td>
            <div class="exclusion-rate">
                <div class="rate-bar">
                    <div class="rate-fill ${cls}" style="width:${Math.min(rate, 100)}%"></div>
                </div>
                <span class="numeric">${pct}%</span>
            </div>
        </td>`;
    }
    
    const num = parseFloat(val);
    if (!isNaN(num)) {
        return `<td class="numeric">${Number.isInteger(num) ? num.toLocaleString() : num.toFixed(2)}</td>`;
    }
    
    return `<td>${escapeHtml(val)}</td>`;
}

// Render Pagination
function renderPagination(total) {
    const totalPages = Math.ceil(total / state.pageSize);
    let html = `<button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''} data-page="${state.currentPage - 1}">‹</button>`;
    
    const maxVis = 5;
    let startP = Math.max(1, state.currentPage - Math.floor(maxVis / 2));
    let endP = Math.min(totalPages, startP + maxVis - 1);
    if (endP - startP < maxVis - 1) startP = Math.max(1, endP - maxVis + 1);
    
    if (startP > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startP > 2) html += `<span style="color:var(--text-muted)">…</span>`;
    }
    
    for (let i = startP; i <= endP; i++) {
        html += `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    if (endP < totalPages) {
        if (endP < totalPages - 1) html += `<span style="color:var(--text-muted)">…</span>`;
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    html += `<button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''} data-page="${state.currentPage + 1}">›</button>`;
    
    el.paginationControls.innerHTML = html;
    
    el.paginationControls.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = parseInt(btn.dataset.page);
            if (p >= 1 && p <= totalPages) {
                state.currentPage = p;
                renderTable();
            }
        });
    });
}

// Open Detail Modal
function openModal(row) {
    el.modalTitle.textContent = 'Rule Details';
    
    let html = `
        <div style="margin-bottom:1.25rem">
            <div class="detail-label">Rule Text</div>
            <p style="color:var(--text-primary);line-height:1.6">${escapeHtml(row.r)}</p>
        </div>
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Cancer Type</div>
                <div class="detail-value">${row.ct.replace(/_/g, ' ')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Trial ID</div>
                <div class="detail-value">${row.tid}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Rule Type</div>
                <div class="detail-value">${row.rs}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Frequency</div>
                <div class="detail-value">${((parseFloat(row.of) || 0) * 100).toFixed(1)}%</div>
            </div>
            <div class="detail-item">
                <div class="detail-label"># Trials</div>
                <div class="detail-value">${row.nt || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Avg Enrollment</div>
                <div class="detail-value">${parseFloat(row.em)?.toFixed(0) || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Recruitment Duration (months)</div>
                <div class="detail-value">
                ${row.rm ? `${Number(row.rm).toFixed(1)} ± ${Number(row.rms).toFixed(1)}` : 'N/A'}
                </div>
            </div>

            <div class="detail-item">
                <div class="detail-label">EPSM (mean ± std)</div>
                <div class="detail-value">
                ${row.epm ? `${Number(row.epm).toFixed(2)} ± ${Number(row.eps).toFixed(2)}` : 'N/A'}
                </div>
            </div>

        <div style="margin-top:1.5rem">
  <div class="chart-title">Drug Intervention Categories</div>
  <div class="detail-grid">
    ${[
      ['dCh', 'Chemotherapy'],
      ['dTa', 'Targeted Therapy'],
      ['dIm', 'Immunotherapy / Biological Therapy'],
      ['dHo', 'Hormonal Therapy'],
      ['dPh', 'Photodynamic Therapy'],
      ['dSu', 'Supportive Care'],
      ['dPl', 'Placebo']
    ].map(([key, label]) => `
      <div class="detail-item">
        <div class="detail-label">${label}</div>
        <div class="detail-value">
          <span class="badge ${row[key] === 'Yes' ? 'badge-inclusion' : 'badge-exclusion'}">
            ${row[key] === 'Yes' ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    `).join('')}
  </div>
</div>


        </div>
        <div class="chart-container">
            <div class="chart-title">Exclusion Rates by Demographic Group</div>
            <div class="bar-chart">
                ${exclCols.map(c => {
                    const r = parseFloat(row[c]) || 0;
                    const pct = r.toFixed(1);
                    const clr = r < 30 ? 'var(--accent-primary)' : r < 60 ? 'var(--accent-orange)' : 'var(--accent-warm)';
                    return `<div class="bar-item">
                        <div class="bar-label">${exclLabels[c]}</div>
                        <div class="bar-track">
                            <div class="bar-fill" style="width:${Math.min(r, 100)}%;background:${clr}"></div>
                        </div>
                        <div class="bar-value">${pct}%</div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
    
    el.modalBody.innerHTML = html;
    el.modalOverlay.classList.add('active');
}

// Close Modal
function closeModal() {
    el.modalOverlay.classList.remove('active');
}

// Export Filtered Data as CSV
function exportCSV() {
    const visCols = state.columns.filter(c => state.visibleColumns.has(c));
    const headers = visCols.map(c => columnLabels[c] || c).join(',');
    const rows = state.filteredData.map(row => 
        visCols.map(col => {
            let v = String(row[col] ?? '');
            if (v.includes(',') || v.includes('"')) {
                v = '"' + v.replace(/"/g, '""') + '"';
            }
            return v;
        }).join(',')
    ).join('\n');
    
    const csv = headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eligibility_criteria_export.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Show Help Modal
function showHelp(e) {
    e.preventDefault();
    el.modalTitle.textContent = 'How to Use';
    el.modalBody.innerHTML = `
        <div style="line-height:1.8;color:var(--text-secondary)">
            <h3 style="color:var(--text-primary);margin-bottom:0.75rem">Features</h3>
            <ul style="padding-left:1.25rem;margin-bottom:1.25rem">
                <li><strong>Search:</strong> Find rules by text content</li>
                <li><strong>Filters:</strong> Filter by cancer type, rule type, trial ID, or drug type</li>
                <li><strong>Unique Rules Onlys:</strong> Show only representative rules from each cancer</li>
                <li><strong>Sorting:</strong> Click column headers to sort</li>
                <li><strong>Columns:</strong> Customize visible columns</li>
                <li><strong>Export:</strong> Download filtered data as CSV</li>
                <li><strong>Details:</strong> Click any row to see full information</li>
            </ul>
            <h3 style="color:var(--text-primary);margin-bottom:0.75rem">Data Columns</h3>

<p style="margin-bottom:0.4rem">
  <strong>Cancer Type:</strong>
  The cancer indication associated with the clinical trial (e.g., breast cancer, lung cancer).
</p>

<p style="margin-bottom:0.4rem">
  <strong>Trial ID:</strong>
  The ClinicalTrials.gov identifier (NCT ID) for the trial in which the eligibility rule appears.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Rule Text:</strong>
  The normalized eligibility criterion text extracted from trial protocols.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Rule Type:</strong>
  Indicates whether the criterion is an inclusion or exclusion rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Cluster:</strong>
  The numeric identifier of the semantic cluster to which this rule belongs,
  grouping highly similar eligibility criteria.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Cluster Center:</strong>
  The representative rule text for the cluster, selected as the most central
  criterion based on embedding similarity.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Frequency:</strong>
  The proportion of historical trials in which this rule appears.
</p>

<p style="margin-bottom:0.4rem">
  <strong># Trials:</strong>
  The total number of unique clinical trials containing this eligibility rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Enroll (mean):</strong>
  Mean planned or actual patient enrollment across trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Enroll (std):</strong>
  Standard deviation of patient enrollment across trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Sites (mean):</strong>
  Mean number of recruiting sites across trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Sites (std):</strong>
  Standard deviation of the number of recruiting sites across trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Duration (mean):</strong>
  Mean recruitment duration (in months) for trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Duration (std):</strong>
  Standard deviation of recruitment duration (in months) across trials.
</p>

<p style="margin-bottom:0.4rem">
  <strong>EPSM (mean):</strong>
  Mean enrollment per site per month (EPSM), a recruitment efficiency metric.
</p>

<p style="margin-bottom:0.4rem">
  <strong>EPSM (std):</strong>
  Standard deviation of EPSM across trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Start Date:</strong>
  Mean trial start date (calendar year) across trials that include this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Start (std):</strong>
  Standard deviation of trial start year, reflecting temporal variability.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Overall Exclusion %:</strong>
  Estimated percentage of the overall real-world patient cohort excluded by this rule.
</p>

<p style="margin-bottom:0.4rem">
  <strong>White %:</strong>
  Estimated exclusion rate among White patients.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Asian %:</strong>
  Estimated exclusion rate among Asian patients.
</p>

<p style="margin-bottom:0.4rem">
  <strong>African-American %:</strong>
  Estimated exclusion rate among African-American patients.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Female %:</strong>
  Estimated exclusion rate among female patients.
</p>

<p style="margin-bottom:0.4rem">
  <strong>Male %:</strong>
  Estimated exclusion rate among male patients.
</p>

<p style="margin-bottom:0.4rem">
  <strong>18–50 %:</strong>
  Estimated exclusion rate among patients aged 18 to 50 years.
</p>

<p style="margin-bottom:0.4rem">
  <strong>50–65 %:</strong>
  Estimated exclusion rate among patients aged 50 to 65 years.
</p>

<p>
  <strong>&gt;65 %:</strong>
  Estimated exclusion rate among patients older than 65 years.
</p>
        </div>
    `;
    el.modalOverlay.classList.add('active');
}

// Utility: Escape HTML
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility: Debounce
function debounce(fn, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', init);