/**
 * Vani Railway Track & Store Management Portal
 * Client Application Logic
 */

const app = {
  data: {},
  activeTab: 'dashboard',

  async init() {
    this.setupEventListeners();
    await this.loadDatabase();
    this.renderAll();
  },

  async loadDatabase() {
    try {
      const res = await fetch('/api/database');
      this.data = await res.json();
      console.log('Vani database loaded:', this.data);
    } catch (err) {
      console.error('Failed to load database:', err);
      alert('Could not load portal database. Make sure server is running.');
    }
  },

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = item.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      document.getElementById('themeIcon').textContent = next === 'dark' ? '🌓' : '☀️';
    });

    // Refresh Data
    const refreshBtn = document.getElementById('refreshDataBtn');
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<span>⏳ Refreshing...</span>';
      try {
        const res = await fetch('/api/refresh', { method: 'POST' });
        const result = await res.json();
        if (result.status === 'success') {
          await this.loadDatabase();
          this.renderAll();
          alert('Database refreshed successfully!');
        } else {
          alert('Refresh failed: ' + result.message);
        }
      } catch (err) {
        alert('Refresh error: ' + err.message);
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<span>🔄 Refresh</span>';
      }
    });

    // Global Search
    const searchInput = document.getElementById('globalSearchInput');
    const searchDropdown = document.getElementById('searchResultsDropdown');
    
    let searchDebounce = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      const q = searchInput.value.trim();
      if (!q) {
        searchDropdown.classList.remove('show');
        return;
      }
      searchDebounce = setTimeout(async () => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        this.renderSearchResults(data.results);
      }, 200);
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.classList.remove('show');
      }
    });

    // Keyboard shortcut '/'
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Chainage inspector
    const chainageBtn = document.getElementById('chainageLookupBtn');
    const chainageIn = document.getElementById('chainageInput');
    chainageBtn.addEventListener('click', () => {
      this.lookupChainage(chainageIn.value);
    });
    chainageIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.lookupChainage(chainageIn.value);
    });

    // Table filters
    document.getElementById('bridgeSearch')?.addEventListener('input', () => this.filterBridges());
    document.getElementById('bridgeTypeFilter')?.addEventListener('change', () => this.filterBridges());
    document.getElementById('bridgeSectionFilter')?.addEventListener('change', () => this.filterBridges());

    document.getElementById('curveSearch')?.addEventListener('input', () => this.filterCurves());
    document.getElementById('curveRadiusFilter')?.addEventListener('change', () => this.filterCurves());

    document.getElementById('pncSearch')?.addEventListener('input', () => this.filterPnc());
    document.getElementById('pncStationFilter')?.addEventListener('change', () => this.filterPnc());
    document.getElementById('pncAngleFilter')?.addEventListener('change', () => this.filterPnc());

    document.getElementById('loopLineSearch')?.addEventListener('input', () => this.filterLoopLines());
    document.getElementById('loopStationFilter')?.addEventListener('change', () => this.filterLoopLines());

    document.getElementById('staffSearch')?.addEventListener('input', () => this.filterStaff());
    document.getElementById('staffRoleFilter')?.addEventListener('change', () => this.filterStaff());

    document.getElementById('drawingSearch')?.addEventListener('input', () => this.filterDrawings());
    document.getElementById('drawingKmFilter')?.addEventListener('change', () => this.filterDrawings());
    document.getElementById('drawingCategoryFilter')?.addEventListener('change', () => this.filterDrawings());

    document.getElementById('storeSearch')?.addEventListener('input', () => this.filterStore());
    document.getElementById('lwrSearch')?.addEventListener('input', () => this.filterLwr());
    document.getElementById('dfwoSearch')?.addEventListener('input', () => this.filterDfwo());
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.style.display = pane.id === `tab-${tabId}` ? 'block' : 'none';
    });
    if (tabId === 'linear-diagram') {
      setTimeout(() => {
        linearViewer.resize();
        linearViewer.render();
      }, 50);
    }
  },

  renderAll() {
    this.renderKPIs();
    this.renderSectionSummary();
    this.populateFilterOptions();
    this.renderBridges();
    this.renderCurves();
    this.renderPnc();
    this.renderLoopLines();
    this.renderLwr();
    this.renderDefects();
    this.renderStaff();
    this.renderDrawings();
    this.renderStore();
    this.renderTrc();
    linearViewer.init();
  },

  renderKPIs() {
    const s = this.data.summary || {};
    document.getElementById('kpiBridges').textContent = s.total_bridges || 0;
    document.getElementById('kpiCurves').textContent = s.total_curves || 0;
    document.getElementById('kpiPoints').textContent = s.total_points || 0;
    document.getElementById('kpiStaff').textContent = s.total_master_staff || 0;
    document.getElementById('kpiDrawings').textContent = s.total_drawings || 0;
    document.getElementById('kpiStore').textContent = s.total_pway_stock_items || 0;

    document.getElementById('badgeBridges').textContent = s.total_bridges || 0;
    document.getElementById('badgeCurves').textContent = s.total_curves || 0;
    document.getElementById('badgePnc').textContent = s.total_points || 0;
    document.getElementById('badgeLoopLines').textContent = s.total_loop_lines || 0;
    document.getElementById('badgeLwr').textContent = s.total_lwr || 0;
    document.getElementById('badgeDefects').textContent = (s.total_turnout_defects || 0) + (s.total_dfwo || 0);
    document.getElementById('badgeStaff').textContent = s.total_master_staff || 0;
    document.getElementById('badgeDrawings').textContent = s.total_drawings || 0;
    document.getElementById('badgeStore').textContent = s.total_pway_stock_items || 0;
  },

  renderSectionSummary() {
    const tbody = document.querySelector('#sectionSummaryTable tbody');
    if (!tbody) return;
    const sections = this.data.sections || [];
    tbody.innerHTML = sections.map(s => {
      const len = (s.km_to - s.km_from).toFixed(3);
      return `
        <tr>
          <td><strong>${s.section}</strong></td>
          <td>${s.line}</td>
          <td>${s.km_from}</td>
          <td>${s.km_to}</td>
          <td><strong>${len}</strong></td>
          <td>${s.mjb ? `<span class="badge-pill badge-bridge">${s.mjb}</span>` : '0'}</td>
          <td>${s.mib || 0}</td>
          <td>${s.rub || 0}</td>
          <td>${s.rob || 0}</td>
          <td>${s.fob || 0}</td>
          <td>${s.owg || 0}</td>
          <td>${s.lc || 0}</td>
        </tr>
      `;
    }).join('');
  },

  populateFilterOptions() {
    // Bridge Sections
    const bSections = [...new Set((this.data.bridges || []).map(b => b.section).filter(Boolean))];
    const bSelect = document.getElementById('bridgeSectionFilter');
    if (bSelect) {
      bSelect.innerHTML = '<option value="">All Sections</option>' + bSections.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // PNC Stations
    const pStations = [...new Set((this.data.points_and_crossings || []).map(p => p.station).filter(Boolean))];
    const pSelect = document.getElementById('pncStationFilter');
    if (pSelect) {
      pSelect.innerHTML = '<option value="">All Stations</option>' + pStations.map(s => `<option value="${s}">${s}</option>`).join('');
    }

    // Loop Line Stations
    const lStations = [...new Set((this.data.loop_lines || []).map(l => l.station).filter(Boolean))];
    const lSelect = document.getElementById('loopStationFilter');
    if (lSelect) {
      lSelect.innerHTML = '<option value="">All Stations</option>' + lStations.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  },

  renderBridges(filteredList) {
    const list = filteredList || this.data.bridges || [];
    document.getElementById('bridgesCount').textContent = list.length;
    const tbody = document.querySelector('#bridgesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(b => `
      <tr>
        <td>${b.s_no}</td>
        <td><strong>${b.bridge_no}</strong></td>
        <td>${b.section}</td>
        <td>${b.km_from}</td>
        <td>${b.km_to}</td>
        <td><span class="badge-pill badge-bridge">${b.bridge_type || b.category}</span></td>
        <td>${b.span_config || '-'}</td>
        <td>${b.length || '-'}</td>
        <td>${b.linear_waterway || '-'}</td>
        <td>${b.old_bridge_no || '-'}</td>
        <td><small>${b.remarks || '-'}</small></td>
      </tr>
    `).join('');
  },

  filterBridges() {
    const q = document.getElementById('bridgeSearch').value.toLowerCase();
    const type = document.getElementById('bridgeTypeFilter').value;
    const sec = document.getElementById('bridgeSectionFilter').value;

    const filtered = (this.data.bridges || []).filter(b => {
      const matchQ = !q || `${b.bridge_no} ${b.section} ${b.remarks}`.toLowerCase().includes(q);
      const matchType = !type || (b.bridge_type && b.bridge_type.includes(type)) || (b.category && b.category.includes(type));
      const matchSec = !sec || b.section === sec;
      return matchQ && matchType && matchSec;
    });

    this.renderBridges(filtered);
  },

  renderCurves(filteredList) {
    const list = filteredList || this.data.curves || [];
    document.getElementById('curvesCount').textContent = list.length;
    const tbody = document.querySelector('#curvesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(c => `
      <tr>
        <td>${c.s_no}</td>
        <td><strong>Curve ${c.curve_no}</strong></td>
        <td>${c.km_from}</td>
        <td>${c.km_to}</td>
        <td>${c.length}</td>
        <td><strong>${c.degree}°</strong></td>
        <td>${c.radius}</td>
        <td>${c.speed || '-'}</td>
        <td>${c.transition_length || '-'}</td>
        <td>${c.circular_length || '-'}</td>
        <td><span class="badge-pill badge-curve">${c.cant_se ? c.cant_se + ' mm' : '-'}</span></td>
        <td><small>${c.remarks || ''}</small></td>
      </tr>
    `).join('');
  },

  filterCurves() {
    const q = document.getElementById('curveSearch').value.toLowerCase();
    const radFilter = document.getElementById('curveRadiusFilter').value;

    const filtered = (this.data.curves || []).filter(c => {
      const matchQ = !q || `curve ${c.curve_no} ${c.km_from} ${c.remarks}`.toLowerCase().includes(q);
      let matchRad = true;
      const r = c.radius || 0;
      if (radFilter === 'sharp') matchRad = r > 0 && r < 2000;
      else if (radFilter === 'medium') matchRad = r >= 2000 && r <= 4000;
      else if (radFilter === 'gentle') matchRad = r > 4000;
      return matchQ && matchRad;
    });

    this.renderCurves(filtered);
  },

  renderPnc(filteredList) {
    const list = filteredList || this.data.points_and_crossings || [];
    document.getElementById('pncCount').textContent = list.length;
    const tbody = document.querySelector('#pncTable tbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(p => `
      <tr>
        <td>${p.s_no}</td>
        <td><strong>${p.station}</strong></td>
        <td><strong>${p.point_no}</strong></td>
        <td>${p.line}</td>
        <td><span class="badge-pill badge-point">${p.angle}</span></td>
        <td>${p.srj_chainage}</td>
        <td>${p.laid_on}</td>
        <td>${p.turnout}</td>
        <td>${p.traffic}</td>
        <td>${p.se || '-'}</td>
      </tr>
    `).join('');
  },

  filterPnc() {
    const q = document.getElementById('pncSearch').value.toLowerCase();
    const stn = document.getElementById('pncStationFilter').value;
    const angle = document.getElementById('pncAngleFilter').value;

    const filtered = (this.data.points_and_crossings || []).filter(p => {
      const matchQ = !q || `${p.point_no} ${p.station} ${p.line}`.toLowerCase().includes(q);
      const matchStn = !stn || p.station === stn;
      const matchAngle = !angle || p.angle === angle;
      return matchQ && matchStn && matchAngle;
    });

    this.renderPnc(filtered);
  },

  renderLoopLines(filteredList) {
    const list = filteredList || this.data.loop_lines || [];
    document.getElementById('loopLinesCount').textContent = list.length;
    const tbody = document.querySelector('#loopLinesTable tbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(l => `
      <tr>
        <td><strong>${l.station}</strong></td>
        <td>${l.line}</td>
        <td>${l.xover || '-'}</td>
        <td>${l.km_from}</td>
        <td>${l.met_from}</td>
        <td><strong>${l.ch_from}</strong></td>
        <td>${l.km_to}</td>
        <td>${l.met_to}</td>
        <td><strong>${l.ch_to}</strong></td>
        <td><span class="badge-pill badge-bridge">${l.length_km} km</span></td>
      </tr>
    `).join('');
  },

  filterLoopLines() {
    const q = document.getElementById('loopLineSearch').value.toLowerCase();
    const stn = document.getElementById('loopStationFilter').value;

    const filtered = (this.data.loop_lines || []).filter(l => {
      const matchQ = !q || `${l.station} ${l.line}`.toLowerCase().includes(q);
      const matchStn = !stn || l.station === stn;
      return matchQ && matchStn;
    });

    this.renderLoopLines(filtered);
  },

  renderLwr(filteredList) {
    const list = filteredList || this.data.lwr_sej || [];
    const tbody = document.querySelector('#lwrTable tbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(l => `
      <tr>
        <td>${l.s_no}</td>
        <td><strong>LWR-${l.lwr_no}</strong></td>
        <td>${l.section}</td>
        <td>${l.km_from}</td>
        <td>${l.km_to}</td>
        <td><strong>${l.length} km</strong></td>
        <td>${l.gap_measured_on || '-'}</td>
      </tr>
    `).join('');
  },

  filterLwr() {
    const q = document.getElementById('lwrSearch').value.toLowerCase();
    const filtered = (this.data.lwr_sej || []).filter(l => {
      return !q || `${l.lwr_no} ${l.section}`.toLowerCase().includes(q);
    });
    this.renderLwr(filtered);
  },

  renderDefects() {
    // DFWO
    const dfwoTbody = document.querySelector('#dfwoTable tbody');
    if (dfwoTbody) {
      dfwoTbody.innerHTML = (this.data.dfwo || []).map(d => `
        <tr>
          <td>${d.s_no}</td>
          <td>${d.km}</td>
          <td>${d.meter}</td>
          <td><strong>${d.chainage}</strong></td>
          <td><span class="badge-pill badge-defect">${d.defect_no}</span></td>
          <td>${d.line_type}</td>
          <td>${d.remark}</td>
        </tr>
      `).join('');
    }

    // Turnout Defects
    const tTbody = document.querySelector('#turnoutDefectsTable tbody');
    if (tTbody) {
      tTbody.innerHTML = (this.data.turnout_defects || []).map(t => `
        <tr>
          <td><strong>${t.station}</strong></td>
          <td>${t.point_no}</td>
          <td>${t.line}</td>
          <td>${t.angle}</td>
          <td>${t.srj_chainage}</td>
          <td>${t.wear_nose_lh} / <strong>${t.wear_nose_center}</strong> / ${t.wear_nose_rh} mm</td>
          <td>${t.wear_269_lh} / <strong>${t.wear_269_center}</strong> / ${t.wear_269_rh} mm</td>
          <td>${t.remark || '-'}</td>
        </tr>
      `).join('');
    }
  },

  filterDfwo() {
    const q = document.getElementById('dfwoSearch').value.toLowerCase();
    const filtered = (this.data.dfwo || []).filter(d => {
      return !q || `${d.defect_no} ${d.chainage} ${d.line_type} ${d.remark}`.toLowerCase().includes(q);
    });
    const dfwoTbody = document.querySelector('#dfwoTable tbody');
    if (dfwoTbody) {
      dfwoTbody.innerHTML = filtered.map(d => `
        <tr>
          <td>${d.s_no}</td>
          <td>${d.km}</td>
          <td>${d.meter}</td>
          <td><strong>${d.chainage}</strong></td>
          <td><span class="badge-pill badge-defect">${d.defect_no}</span></td>
          <td>${d.line_type}</td>
          <td>${d.remark}</td>
        </tr>
      `).join('');
    }
  },

  renderStaff(filteredList) {
    const list = filteredList || this.data.master_staff || [];
    const container = document.getElementById('staffCardsGrid');
    if (!container) return;

    container.innerHTML = list.map(s => {
      const avatarHtml = s.photo_url 
        ? `<img src="${s.photo_url}" alt="${s.name}" onclick="app.showStaffModal('${s.awpo_id}')">`
        : `<div class="staff-avatar-placeholder" onclick="app.showStaffModal('${s.awpo_id}')">👤</div>`;

      const qrBtnHtml = s.qr_url
        ? `<button class="btn-qr" onclick="app.showStaffModal('${s.awpo_id}')">📱 QR Code</button>`
        : '';

      const callBtnHtml = s.mobile
        ? `<a href="tel:${s.mobile}" class="btn-call">📞 ${s.mobile}</a>`
        : '';

      return `
        <div class="staff-card">
          <div class="staff-avatar-box">
            ${avatarHtml}
          </div>
          <div class="staff-info">
            <div class="staff-name">${s.name}</div>
            <div class="staff-role">${s.designation || 'Staff'} ${s.beat_no ? `• ${s.beat_no}` : ''}</div>
            <div class="staff-detail-line"><strong>ID:</strong> ${s.awpo_id}</div>
            ${s.km_range ? `<div class="staff-detail-line"><strong>Beat:</strong> Km ${s.km_range}</div>` : ''}
            ${s.residence ? `<div class="staff-detail-line"><strong>Res:</strong> ${s.residence.replace('\n', ', ')}</div>` : ''}
            <div class="staff-actions">
              ${callBtnHtml}
              ${qrBtnHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterStaff() {
    const q = document.getElementById('staffSearch').value.toLowerCase();
    const role = document.getElementById('staffRoleFilter').value;

    const filtered = (this.data.master_staff || []).filter(s => {
      const matchQ = !q || `${s.name} ${s.awpo_id} ${s.beat_no} ${s.mobile} ${s.residence}`.toLowerCase().includes(q);
      let matchRole = true;
      if (role === 'KEYMAN') matchRole = (s.designation || '').toUpperCase().includes('KEYMAN');
      else if (role === 'GATEMAN') matchRole = (s.designation || '').toUpperCase().includes('GATE');
      else if (role === 'PATROLMAN') matchRole = (s.designation || '').toUpperCase().includes('PATROL');
      else if (role === 'APM') matchRole = (s.designation || '').toUpperCase().includes('APM') || (s.designation || '').toUpperCase().includes('MANAGER');
      return matchQ && matchRole;
    });

    this.renderStaff(filtered);
  },

  showStaffModal(awpoId) {
    const staff = (this.data.master_staff || []).find(s => String(s.awpo_id) === String(awpoId));
    if (!staff) return;

    document.getElementById('staffModalTitle').textContent = `${staff.name} (${staff.designation || 'Staff'})`;
    const body = document.getElementById('staffModalBody');

    body.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: center; justify-content: center; flex-wrap: wrap;">
        ${staff.photo_url ? `
          <div>
            <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.25rem;">Photo</p>
            <img src="${staff.photo_url}" style="width: 140px; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
        ` : ''}

        ${staff.qr_url ? `
          <div>
            <p style="font-size: 0.75rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.25rem;">Staff QR Code</p>
            <img src="${staff.qr_url}" style="width: 140px; height: 160px; object-fit: contain; background: #fff; padding: 6px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
        ` : ''}
      </div>

      <div style="width: 100%; text-align: left; background: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
        <div><strong>AWPO ID:</strong> ${staff.awpo_id}</div>
        <div><strong>Father's Name:</strong> ${staff.father_name || '-'}</div>
        <div><strong>Beat No:</strong> ${staff.beat_no || '-'}</div>
        <div><strong>Chainage Range:</strong> Km ${staff.km_range || '-'}</div>
        <div><strong>Mobile Number:</strong> <a href="tel:${staff.mobile}" style="color: var(--accent); text-decoration: none;">${staff.mobile}</a> ${staff.other_contact ? ` / ${staff.other_contact}` : ''}</div>
        <div><strong>Residence:</strong> ${staff.residence || '-'} (${staff.district || ''})</div>
        ${staff.email ? `<div><strong>Email:</strong> ${staff.email}</div>` : ''}
      </div>
    `;

    document.getElementById('staffModal').classList.add('open');
  },

  closeStaffModal() {
    document.getElementById('staffModal').classList.remove('open');
  },

  renderDrawings(filteredList) {
    const list = filteredList || this.data.drawings || [];
    document.getElementById('drawingsCount').textContent = list.length;
    const container = document.getElementById('drawingsGrid');
    if (!container) return;

    container.innerHTML = list.map(d => {
      const isPdf = d.filename.toLowerCase().endsWith('.pdf');
      const isDwg = d.filename.toLowerCase().endsWith('.dwg');
      let actionBtn = '';
      if (isPdf) {
        actionBtn = `<button class="btn btn-primary" onclick="app.openPdfModal('${d.url}', '${d.filename.replace(/'/g, "\\'")}')">View PDF ↗</button>`;
      } else if (isDwg) {
        const stnCode = d.station || (d.filename.includes('SHAMBHU') ? 'SMUN' : (d.filename.includes('BANJARA') ? 'SBJN' : (d.filename.includes('GOBINDGARH') ? 'GVGN' : (d.filename.includes('KHANNA') ? 'KNNN' : (d.filename.includes('CHAWA') ? 'CHAN' : '')))));
        actionBtn = `<button class="btn btn-primary" onclick="app.openStationEsp('${stnCode}')">View CAD 📐</button>`;
      } else {
        actionBtn = `<a href="${d.url}" class="btn" download>Download ⬇</a>`;
      }

      return `
        <div class="drawing-card">
          <div>
            <div class="badge-pill ${isPdf ? 'badge-bridge' : 'badge-curve'}" style="margin-bottom: 0.4rem;">${d.category}</div>
            <div class="drawing-title">${d.filename}</div>
          </div>
          <div>
            <div class="drawing-meta">
              ${d.km_from !== null ? `<span>📍 Km ${d.km_from} - ${d.km_to}</span>` : ''}
              ${d.sheet_no ? `<span>📄 Sheet ${d.sheet_no}</span>` : ''}
              <span>💾 ${d.size_kb} KB</span>
            </div>
            <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
              ${actionBtn}
              <a href="${d.url}" target="_blank" class="btn" title="Download directly">⬇</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterDrawings() {
    const q = document.getElementById('drawingSearch').value.toLowerCase();
    const km = document.getElementById('drawingKmFilter').value;
    const cat = document.getElementById('drawingCategoryFilter').value;

    const filtered = (this.data.drawings || []).filter(d => {
      const matchQ = !q || `${d.filename} ${d.category} ${d.sheet_no}`.toLowerCase().includes(q);
      let matchKm = true;
      if (km === 'ESP') {
        matchKm = d.category.includes('ESP');
      } else if (km) {
        const kmTarget = parseFloat(km);
        matchKm = d.km_from !== null && (
          (d.km_from >= kmTarget - 0.5 && d.km_from <= kmTarget + 14) ||
          (d.km_to !== null && d.km_to >= kmTarget - 0.5 && d.km_to <= kmTarget + 14)
        );
      }

      let matchCat = true;
      if (cat) {
        matchCat = d.category.toLowerCase().includes(cat.toLowerCase());
      }

      return matchQ && matchKm && matchCat;
    });

    this.renderDrawings(filtered);
  },

  openPdfModal(url, title) {
    document.getElementById('pdfModalTitle').textContent = title;
    document.getElementById('pdfDownloadLink').href = url;
    document.getElementById('pdfFrame').src = url;
    document.getElementById('pdfModal').classList.add('open');
  },

  closePdfModal() {
    document.getElementById('pdfFrame').src = '';
    document.getElementById('pdfModal').classList.remove('open');
  },

  renderStore(filteredList) {
    const list = filteredList || (this.data.store && this.data.store.pway_material) || [];
    const tbody = document.querySelector('#storePwayTable tbody');
    if (!tbody) return;

    tbody.innerHTML = list.map(item => {
      const bal = item.balance || 0;
      let statusBadge = `<span class="badge-pill badge-bridge">Normal Stock</span>`;
      if (bal <= 5 && bal > 0) {
        statusBadge = `<span class="badge-pill badge-curve">Low Stock</span>`;
      } else if (bal <= 0) {
        statusBadge = `<span class="badge-pill badge-defect">Out of Stock</span>`;
      }

      return `
        <tr>
          <td>${item.s_no}</td>
          <td><strong>${item.particular}</strong></td>
          <td>${item.page_no}</td>
          <td>${item.receipt}</td>
          <td>${item.transfer}</td>
          <td>${item.issues}</td>
          <td><strong>${item.balance}</strong></td>
          <td>${item.unit}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  },

  filterStore() {
    const q = document.getElementById('storeSearch').value.toLowerCase();
    const filtered = ((this.data.store && this.data.store.pway_material) || []).filter(item => {
      return !q || `${item.particular} ${item.page_no}`.toLowerCase().includes(q);
    });
    this.renderStore(filtered);
  },

  renderTrc() {
    const trc = this.data.trc || {};
    const tbody = document.querySelector('#trcFasteningTable tbody');
    if (!tbody || !trc.fastening_sample) return;

    tbody.innerHTML = trc.fastening_sample.map(r => `
      <tr>
        <td>${r[1] || '-'}</td>
        <td>${r[2] || '-'}</td>
        <td><span class="badge-pill badge-defect">${r[3] || 'Fastening Defect'}</span></td>
        <td>${r[4] || 'LH/RH'}</td>
        <td>${r[5] || 'High'}</td>
        <td>${r[6] || 'Main Line'}</td>
        <td>${r[7] || 'Replace fastener / ERC'}</td>
      </tr>
    `).join('');
  },

  async lookupChainage(km) {
    if (!km) return;
    this.switchTab('chainage-locator');
    document.getElementById('chainageInput').value = km;

    const container = document.getElementById('chainageResultsContainer');
    container.style.display = 'grid';
    container.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center;">Scanning chainage assets...</div>';

    try {
      const res = await fetch(`/api/chainage?km=${km}`);
      const data = await res.json();

      let html = '';

      // Section Box
      html += `
        <div class="chainage-box">
          <h4>📍 Block Section</h4>
          ${data.section ? `
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${data.section.section} (${data.section.line})</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Km ${data.section.km_from} to ${data.section.km_to}</div>
          ` : '<div style="color: var(--text-muted);">No section mapped for this exact KM.</div>'}
        </div>
      `;

      // Keyman Beat Box
      html += `
        <div class="chainage-box">
          <h4>👷 Active Keyman Beat</h4>
          ${data.keyman ? `
            <div style="display: flex; gap: 0.75rem; align-items: center;">
              ${data.keyman.photo_url ? `<img src="${data.keyman.photo_url}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover;">` : ''}
              <div>
                <div style="font-weight: 700;">${data.keyman.name}</div>
                <div style="font-size: 0.75rem; color: var(--accent);">${data.keyman.beat_no} (AWPO: ${data.keyman.awpo_id})</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);"><a href="tel:${data.keyman.mobile}" style="color: var(--success); text-decoration: none;">📞 ${data.keyman.mobile}</a></div>
              </div>
            </div>
          ` : '<div style="color: var(--text-muted);">No beat mapped at this KM.</div>'}
        </div>
      `;

      // Bridges Box
      html += `
        <div class="chainage-box">
          <h4>🌉 Bridges (Within ±1.0 km)</h4>
          ${data.bridges && data.bridges.length ? data.bridges.map(b => `
            <div style="border-bottom: 1px solid var(--border-color); padding: 0.35rem 0;">
              <strong>${b.bridge_no}</strong> (${b.bridge_type}) - Km ${b.km_from}
              <div style="font-size: 0.75rem; color: var(--text-muted);">${b.span_config || ''} ${b.length ? b.length + 'm' : ''}</div>
            </div>
          `).join('') : '<div style="color: var(--text-muted);">No bridges near this chainage.</div>'}
        </div>
      `;

      // Curves Box
      html += `
        <div class="chainage-box">
          <h4>🔄 Curves (Within ±0.8 km)</h4>
          ${data.curves && data.curves.length ? data.curves.map(c => `
            <div style="border-bottom: 1px solid var(--border-color); padding: 0.35rem 0;">
              <strong>Curve ${c.curve_no}</strong>: Km ${c.km_from} - ${c.km_to}
              <div style="font-size: 0.75rem; color: var(--text-muted);">Radius: ${c.radius}m | Deg: ${c.degree}° | SE: ${c.cant_se || 0}mm</div>
            </div>
          `).join('') : '<div style="color: var(--text-muted);">No curves near this chainage.</div>'}
        </div>
      `;

      // Points & Crossings
      html += `
        <div class="chainage-box">
          <h4>🔀 Points / Turnouts</h4>
          ${data.points && data.points.length ? data.points.map(p => `
            <div style="border-bottom: 1px solid var(--border-color); padding: 0.35rem 0;">
              <strong>Point ${p.point_no}</strong> (${p.station}) - Ch. ${p.srj_chainage}
              <div style="font-size: 0.75rem; color: var(--text-muted);">${p.line} (${p.angle}) ${p.traffic}</div>
            </div>
          `).join('') : '<div style="color: var(--text-muted);">No turnouts at this chainage.</div>'}
        </div>
      `;

      // Drawings Box
      html += `
        <div class="chainage-box">
          <h4>📜 P&P Drawings Covering KM</h4>
          ${data.drawings && data.drawings.length ? data.drawings.slice(0, 4).map(d => `
            <div style="border-bottom: 1px solid var(--border-color); padding: 0.35rem 0; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; font-size: 0.8rem;">${d.filename}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Sheet ${d.sheet_no} | ${d.size_kb} KB</div>
              </div>
              <button class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="app.openPdfModal('${d.url}', '${d.filename.replace(/'/g, "\\'")}')">View</button>
            </div>
          `).join('') : '<div style="color: var(--text-muted);">No specific drawing indexed.</div>'}
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div style="color: var(--danger); padding: 1rem;">Lookup error: ${err.message}</div>`;
    }
  },

  showStationYard(stationCode) {
    this.switchTab('loop-lines');
    const select = document.getElementById('loopStationFilter');
    if (select) {
      select.value = stationCode;
      this.filterLoopLines();
    }
  },

  // Official Keyplan stations metadata
  keyplanStations: {
    'SMUN': {
      code: 'SMUN',
      name: 'New Shambhu (SMUN)',
      type: 'Junction Station',
      dfcKm: '1170.435',
      irKm: '281.027',
      lines: 'UP Main, DN Main, Loop Line 1, 2, 3, 4 (CAL 750M), IR Chord Connection',
      points: 'Point Nos. 201A to 297',
      file: 'SMUN_keyplan.png'
    },
    'SBJN': {
      code: 'SBJN',
      name: 'New Sarai Banjara (SBJN)',
      type: 'Junction Station',
      dfcKm: '1188.575',
      irKm: '-',
      lines: 'UP Main, DN Main, Loop Lines 1, 2, 3, IR Connecting Track',
      points: 'Point Nos. 201A to 289B',
      file: 'SBJN_keyplan.png'
    },
    'NSIR': {
      code: 'NSIR',
      name: 'New Sirhind (NSIR)',
      type: 'Junction Station',
      dfcKm: '1202.015',
      irKm: '-',
      lines: 'UP Main, DN Main, Multi-track Yard, Northern Railway Sirhind Chord',
      points: 'Point Nos. 201 to 299',
      file: 'NSIR_keyplan.png'
    },
    'GVGN': {
      code: 'GVGN',
      name: 'New Mandi Gobindgarh (GVGN)',
      type: 'Crossing Station',
      dfcKm: '1213.186',
      irKm: '-',
      lines: 'UP Main, DN Main, UP Loop (750M CAL), DN Loop (750M CAL), Sand Humps, Crossover',
      points: 'Point Nos. 201 to 230',
      file: 'GVGN_keyplan.png'
    },
    'KNNN': {
      code: 'KNNN',
      name: 'New Khanna (KNNN)',
      type: 'Crossing Station',
      dfcKm: '1229.086',
      irKm: '-',
      lines: 'UP Main, DN Main, UP Loop (750M CAL), DN Loop (750M CAL), Overruns',
      points: 'Point Nos. 201 to 232',
      file: 'KNNN_keyplan.png'
    },
    'CHAN': {
      code: 'CHAN',
      name: 'New Chawa Pail (CHAN)',
      type: 'Junction Station',
      dfcKm: '1237.576',
      irKm: '-',
      lines: 'UP Main, DN Main, Loop Lines 1-3 (750M CAL), Overrun Tracks, Goomty A & B',
      points: 'Point Nos. 201A to 260B',
      file: 'CHAN_keyplan.png'
    }
  },
  keyplanCache: {},

  openStationEsp(stationCode) {
    if (stationCode === 'SNL') stationCode = 'CHAN'; // Fallback to nearest DFCC junction
    const stnInfo = this.keyplanStations[stationCode] || this.keyplanStations['SMUN'];
    const actualCode = stnInfo.code;

    const drawings = this.data.drawings || [];
    const esp = drawings.find(d => 
      d.category && d.category.includes('ESP') && 
      ((d.station && d.station === actualCode) || (d.filename && d.filename.toUpperCase().includes(actualCode)))
    );

    const modalTitle = document.getElementById('espModalTitle');
    const modalBody = document.getElementById('espModalBody');
    const downloadBtn = document.getElementById('espDownloadBtn');
    const modal = document.getElementById('espModal');

    modalTitle.innerHTML = `⚡ <b>Official X-Ray Keyplan</b>: ${stnInfo.name} <span style="font-size:0.75rem; color:#38bdf8; font-weight:normal; margin-left:8px;">[SIP Signaling Interlocking]</span>`;

    const keyplanUrl = `/static/keyplans/${stnInfo.file}`;
    downloadBtn.href = keyplanUrl;
    downloadBtn.download = `${actualCode}_Official_X-Ray_Keyplan.png`;
    downloadBtn.style.display = 'inline-flex';
    downloadBtn.innerHTML = `📥 Download Keyplan HD`;

    // Station Pills
    const stationTabsHtml = Object.keys(this.keyplanStations).map(code => `
      <button class="cad-btn ${code === actualCode ? 'active' : ''}" style="${code === actualCode ? 'background:#0284c7; color:#fff; border-color:#38bdf8; font-weight:800;' : ''}" onclick="app.openStationEsp('${code}')">
        ⚡ ${code}
      </button>
    `).join('');

    const origin = (window.location.origin && window.location.origin.startsWith('http')) 
      ? window.location.origin 
      : (window.location.protocol + '//' + window.location.host);
    const espUrl = esp ? (esp.url || `/static/esp/${esp.filename}`) : '';
    const absoluteEspUrl = esp ? (espUrl.startsWith('http') ? espUrl : `${origin}${espUrl}`) : '';
    const encodedUrl = esp ? encodeURIComponent(absoluteEspUrl) : '';
    const shareCadUrl = esp ? `https://sharecad.org/cadframe/load?url=${encodedUrl}` : '';

    modalBody.innerHTML = `
      <div class="cad-viewer-container">
        <!-- Station switcher bar -->
        <div class="cad-toolbar" style="background:#090f1d; border-bottom:1px solid #1e293b; padding:0.35rem 0.8rem; gap:0.4rem; justify-content:flex-start;">
          <span style="font-size:0.72rem; color:#94a3b8; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">Stations:</span>
          ${stationTabsHtml}
        </div>

        <!-- Mode & Tool Toolbar -->
        <div class="cad-toolbar" style="padding:0.4rem 0.8rem;">
          <div class="cad-toolbar-group">
            <button class="cad-btn active" id="btnCadModeKeyplan" onclick="app.setCadViewMode('keyplan', '${actualCode}')">⚡ Official X-Ray Plan (HD)</button>
            ${esp ? `<button class="cad-btn" id="btnCadModeWeb" onclick="app.setCadViewMode('web', '${actualCode}', '${shareCadUrl}')">🌐 Cloud CAD (.DWG)</button>` : ''}
            <button class="cad-btn" id="btnCadModeFile" onclick="app.setCadViewMode('info', '${actualCode}')">ℹ️ Station SIP Details</button>
          </div>
          <div class="cad-toolbar-group" id="cadZoomControls">
            <span id="cadZoomPctBadge" style="font-size:0.72rem; font-family:monospace; background:#0f172a; border:1px solid #334155; padding:0.25rem 0.5rem; border-radius:4px; color:#38bdf8;">100%</span>
            <button class="cad-btn" onclick="app.zoomCadCanvas(1.35)" title="Zoom In">🔍+</button>
            <button class="cad-btn" onclick="app.zoomCadCanvas(0.74)" title="Zoom Out">🔍-</button>
            <button class="cad-btn" onclick="app.resetCadCanvas('${actualCode}')" title="Fit Yard to Screen">↔ Fit Yard</button>
            <button class="cad-btn" onclick="app.setCadZoomNative('${actualCode}')" title="100% Native Resolution">1:1 Native</button>
            <a href="${keyplanUrl}" target="_blank" class="cad-btn" style="color:#38bdf8;" title="Open in New Tab">↗️ Full Tab</a>
          </div>
        </div>

        <!-- Viewports Container -->
        <div style="flex:1; position:relative; overflow:hidden; display:flex; flex-direction:column;">
          <!-- 1. High-Res Interactive X-Ray Keyplan Canvas -->
          <div id="cadInteractiveContainer" style="flex:1; width:100%; height:100%; position:relative; background:#060a12; overflow:hidden;">
            <canvas id="cadCanvas" style="display:block; width:100%; height:100%; cursor:grab;"></canvas>
            <div style="position:absolute; top:10px; left:12px; pointer-events:none; background:rgba(15,23,42,0.9); border:1px solid #334155; padding:0.4rem 0.75rem; border-radius:6px; font-size:0.75rem; color:#cbd5e1; box-shadow:0 4px 12px rgba(0,0,0,0.5);">
              <div style="font-weight:800; color:#38bdf8; font-size:0.82rem;">⚡ ${stnInfo.name} Official Signaling Keyplan</div>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px;">DFC Km: <b style="color:#fff;">${stnInfo.dfcKm}</b> ${stnInfo.irKm !== '-' ? `| IR Km: <b style="color:#fff;">${stnInfo.irKm}</b>` : ''} | Drag to Pan • Wheel/Pinch to Zoom</div>
            </div>
          </div>

          <!-- 2. Web Iframe CAD Viewer (ShareCAD) -->
          <div id="cadWebContainer" style="display:none; flex:1; width:100%; height:100%; flex-direction:column; background:#111;">
            <iframe id="cadIframe" src="" style="width:100%; height:100%; border:none; background:#1e293b;"></iframe>
            <div style="padding:0.4rem 0.8rem; background:#0f172a; border-top:1px solid #334155; font-size:0.75rem; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
              <span>Requires internet access to reach ShareCAD.org server.</span>
              ${esp ? `<a href="${esp.url}" download class="cad-btn" style="color:#38bdf8;">📥 Download .DWG (${esp.size_kb} KB)</a>` : ''}
            </div>
          </div>

          <!-- 3. Station SIP Info View -->
          <div id="cadInfoContainer" style="display:none; padding:1.25rem; overflow-y:auto; background:var(--bg-primary);">
            <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:1.25rem; display:flex; flex-direction:column; gap:0.8rem;">
              <h4 style="color:#38bdf8; margin:0; font-size:1.1rem;">⚡ ${stnInfo.name} Signaling Interlocking Plan (SIP)</h4>
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.75rem; font-size:0.85rem;">
                <div style="background:#090d16; padding:0.65rem; border-radius:6px; border:1px solid #1e293b;">
                  <span style="color:#94a3b8;">Station Classification:</span><br><b>${stnInfo.type}</b>
                </div>
                <div style="background:#090d16; padding:0.65rem; border-radius:6px; border:1px solid #1e293b;">
                  <span style="color:#94a3b8;">DFC Chainage:</span><br><b style="color:#38bdf8;">Km ${stnInfo.dfcKm}</b>
                </div>
                ${stnInfo.irKm !== '-' ? `
                <div style="background:#090d16; padding:0.65rem; border-radius:6px; border:1px solid #1e293b;">
                  <span style="color:#94a3b8;">Indian Railways Chainage:</span><br><b style="color:#10b981;">Km ${stnInfo.irKm}</b>
                </div>` : ''}
                <div style="background:#090d16; padding:0.65rem; border-radius:6px; border:1px solid #1e293b;">
                  <span style="color:#94a3b8;">Points & Turnouts:</span><br><b>${stnInfo.points}</b>
                </div>
              </div>

              <div style="background:#090d16; padding:0.75rem; border-radius:6px; border:1px solid #1e293b; font-size:0.82rem;">
                <span style="color:#94a3b8;">Tracks & Loops:</span><br>
                <div style="color:#f8fafc; font-weight:600; margin-top:3px;">${stnInfo.lines}</div>
              </div>

              ${esp ? `
              <div style="background:#090d16; border:1px solid #1e293b; border-radius:6px; padding:0.75rem; font-size:0.82rem;">
                <b style="color:#38bdf8;">📐 Related AutoCAD (.DWG) File:</b><br>
                <div style="margin-top:4px;"><code>${esp.filename}</code> (${esp.size_kb} KB)</div>
                <a href="${esp.url}" download class="btn btn-primary" style="margin-top:8px; font-size:0.75rem; display:inline-flex;">📥 Download DWG File</a>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- Bottom Status Strip -->
        <div class="cad-meta-strip" style="background:#090f1d; border-top:1px solid #1e293b; padding:0.35rem 0.8rem; display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:#94a3b8;">
          <span>⚡ <b>${stnInfo.name}</b> | DFC Km: ${stnInfo.dfcKm} | Turnouts: ${stnInfo.points}</span>
          <span>Tip: 1-Finger / Mouse Drag to Pan • Mouse Wheel / 2-Finger Pinch to Zoom</span>
        </div>
      </div>
    `;

    modal.classList.add('open');
    setTimeout(() => this.initCadCanvas(actualCode), 50);
  },

  setCadViewMode(mode, stationCode, iframeUrl) {
    const interBox = document.getElementById('cadInteractiveContainer');
    const webBox = document.getElementById('cadWebContainer');
    const infoBox = document.getElementById('cadInfoContainer');
    const zoomGroup = document.getElementById('cadZoomControls');

    const btnKeyplan = document.getElementById('btnCadModeKeyplan');
    const btnWeb = document.getElementById('btnCadModeWeb');
    const btnInfo = document.getElementById('btnCadModeFile');

    if (btnKeyplan) btnKeyplan.classList.toggle('active', mode === 'keyplan');
    if (btnWeb) btnWeb.classList.toggle('active', mode === 'web');
    if (btnInfo) btnInfo.classList.toggle('active', mode === 'info');

    if (zoomGroup) zoomGroup.style.display = mode === 'keyplan' ? 'flex' : 'none';

    if (mode === 'keyplan') {
      interBox.style.display = 'block';
      webBox.style.display = 'none';
      infoBox.style.display = 'none';
      this.renderCadCanvas();
    } else if (mode === 'web') {
      interBox.style.display = 'none';
      webBox.style.display = 'flex';
      infoBox.style.display = 'none';
      const ifr = document.getElementById('cadIframe');
      if (ifr && (!ifr.src || ifr.src === 'about:blank' || ifr.src.endsWith('/'))) {
        ifr.src = iframeUrl;
      }
    } else if (mode === 'info') {
      interBox.style.display = 'none';
      webBox.style.display = 'none';
      infoBox.style.display = 'block';
    }
  },

  initCadCanvas(stationCode) {
    const canvas = document.getElementById('cadCanvas');
    if (!canvas) return;
    this.cadCanvas = canvas;
    this.cadCtx = canvas.getContext('2d');
    this.cadStation = stationCode;

    this.cadTransform = {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      startX: 0,
      startY: 0
    };

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    this.cadCtx.scale(dpr, dpr);
    this.cadW = rect.width;
    this.cadH = rect.height;

    // Load High-Res Keyplan Image
    const stnInfo = this.keyplanStations[stationCode] || this.keyplanStations['SMUN'];
    const keyplanSrc = `/static/keyplans/${stnInfo.file}`;

    if (this.keyplanCache[stationCode] && this.keyplanCache[stationCode].complete) {
      this.currentKeyplanImg = this.keyplanCache[stationCode];
      this.resetCadCanvas(stationCode);
    } else {
      const img = new Image();
      img.src = keyplanSrc;
      img.onload = () => {
        this.keyplanCache[stationCode] = img;
        this.currentKeyplanImg = img;
        this.resetCadCanvas(stationCode);
      };
      img.onerror = () => {
        console.error('Failed to load keyplan:', keyplanSrc);
        this.currentKeyplanImg = null;
        this.renderCadCanvas();
      };
    }

    // Mouse Drag Pan
    canvas.onmousedown = (e) => {
      this.cadTransform.isDragging = true;
      this.cadTransform.startX = e.clientX - this.cadTransform.offsetX;
      this.cadTransform.startY = e.clientY - this.cadTransform.offsetY;
      canvas.style.cursor = 'grabbing';
    };

    window.onmousemove = (e) => {
      if (this.cadTransform && this.cadTransform.isDragging) {
        this.cadTransform.offsetX = e.clientX - this.cadTransform.startX;
        this.cadTransform.offsetY = e.clientY - this.cadTransform.startY;
        this.renderCadCanvas();
      }
    };

    window.onmouseup = () => {
      if (this.cadTransform && this.cadTransform.isDragging) {
        this.cadTransform.isDragging = false;
        canvas.style.cursor = 'grab';
      }
    };

    // Wheel Zoom centered at pointer
    canvas.onwheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.cadTransform.offsetX = mouseX - (mouseX - this.cadTransform.offsetX) * zoomFactor;
      this.cadTransform.offsetY = mouseY - (mouseY - this.cadTransform.offsetY) * zoomFactor;
      this.cadTransform.scale = Math.max(0.04, Math.min(8.0, this.cadTransform.scale * zoomFactor));
      this.renderCadCanvas();
    };

    // Touch Support (1-finger pan, 2-finger pinch)
    let touchDist = 0;
    let touchScale = 1;
    let touchMidX = 0, touchMidY = 0;

    canvas.ontouchstart = (e) => {
      if (e.touches.length === 1) {
        this.cadTransform.isDragging = true;
        this.cadTransform.startX = e.touches[0].clientX - this.cadTransform.offsetX;
        this.cadTransform.startY = e.touches[0].clientY - this.cadTransform.offsetY;
      } else if (e.touches.length === 2) {
        this.cadTransform.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDist = Math.hypot(dx, dy);
        touchScale = this.cadTransform.scale;
        touchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    canvas.ontouchmove = (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches.length === 1 && this.cadTransform.isDragging) {
        this.cadTransform.offsetX = e.touches[0].clientX - this.cadTransform.startX;
        this.cadTransform.offsetY = e.touches[0].clientY - this.cadTransform.startY;
        this.renderCadCanvas();
      } else if (e.touches.length === 2 && touchDist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / touchDist;
        const rect = canvas.getBoundingClientRect();
        const midX = touchMidX - rect.left;
        const midY = touchMidY - rect.top;

        const newScale = Math.max(0.04, Math.min(8.0, touchScale * factor));
        const scaleChange = newScale / this.cadTransform.scale;
        this.cadTransform.offsetX = midX - (midX - this.cadTransform.offsetX) * scaleChange;
        this.cadTransform.offsetY = midY - (midY - this.cadTransform.offsetY) * scaleChange;
        this.cadTransform.scale = newScale;
        this.renderCadCanvas();
      }
    };

    canvas.ontouchend = () => {
      if (this.cadTransform) this.cadTransform.isDragging = false;
    };

    this.renderCadCanvas();
  },

  zoomCadCanvas(factor) {
    if (!this.cadTransform) return;
    const cx = this.cadW / 2;
    const cy = this.cadH / 2;
    this.cadTransform.offsetX = cx - (cx - this.cadTransform.offsetX) * factor;
    this.cadTransform.offsetY = cy - (cy - this.cadTransform.offsetY) * factor;
    this.cadTransform.scale = Math.max(0.04, Math.min(8.0, this.cadTransform.scale * factor));
    this.renderCadCanvas();
  },

  setCadZoomNative(stationCode) {
    if (!this.cadTransform || !this.currentKeyplanImg) return;
    this.cadTransform.scale = 1.0;
    this.cadTransform.offsetX = (this.cadW - this.currentKeyplanImg.naturalWidth) / 2;
    this.cadTransform.offsetY = (this.cadH - this.currentKeyplanImg.naturalHeight) / 2;
    this.renderCadCanvas();
  },

  resetCadCanvas(stationCode) {
    if (!this.cadCanvas || !this.cadTransform) return;
    if (this.currentKeyplanImg && this.currentKeyplanImg.complete) {
      const imgW = this.currentKeyplanImg.naturalWidth || 3573;
      const imgH = this.currentKeyplanImg.naturalHeight || 2526;
      const fitScale = Math.min((this.cadW - 30) / imgW, (this.cadH - 30) / imgH);
      this.cadTransform.scale = fitScale;
      this.cadTransform.offsetX = (this.cadW - imgW * fitScale) / 2;
      this.cadTransform.offsetY = (this.cadH - imgH * fitScale) / 2;
    } else {
      this.cadTransform.scale = 0.3;
      this.cadTransform.offsetX = 20;
      this.cadTransform.offsetY = 20;
    }
    this.renderCadCanvas();
  },

  renderCadCanvas() {
    if (!this.cadCtx || !this.cadCanvas) return;
    const ctx = this.cadCtx;
    const W = this.cadW;
    const H = this.cadH;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Deep Blueprint Dark background
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, W, H);

    if (!this.currentKeyplanImg || !this.currentKeyplanImg.complete) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏳ Loading High-Definition X-Ray Keyplan...', W / 2, H / 2);
      ctx.restore();
      return;
    }

    // Apply pan & zoom
    ctx.translate(this.cadTransform.offsetX, this.cadTransform.offsetY);
    ctx.scale(this.cadTransform.scale, this.cadTransform.scale);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.currentKeyplanImg, 0, 0);

    ctx.restore();

    // Update zoom indicator
    const zoomPctEl = document.getElementById('cadZoomPctBadge');
    if (zoomPctEl && this.cadTransform) {
      zoomPctEl.textContent = `${Math.round(this.cadTransform.scale * 100)}%`;
    }
  },

  closeEspModal() {
    const modal = document.getElementById('espModal');
    if (modal) modal.classList.remove('open');
    const ifr = document.getElementById('cadIframe');
    if (ifr) ifr.src = '';
  },

  renderSearchResults(results) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!results || !results.length) {
      dropdown.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No matching assets found.</div>';
      dropdown.classList.add('show');
      return;
    }

    dropdown.innerHTML = results.map(r => `
      <div class="search-result-item" onclick="app.handleSearchResultClick('${r.category}', '${r.type}', ${encodeURIComponent(JSON.stringify(r.data))})">
        <div class="search-result-title">
          <span>${r.title}</span>
          <span class="badge-pill badge-bridge">${r.type}</span>
        </div>
        <div class="search-result-sub">${r.subtitle}</div>
      </div>
    `).join('');
    dropdown.classList.add('show');
  },

  handleSearchResultClick(category, type, encodedData) {
    document.getElementById('searchResultsDropdown').classList.remove('show');
    const data = JSON.parse(decodeURIComponent(encodedData));

    if (category === 'bridges') {
      this.switchTab('bridges');
      document.getElementById('bridgeSearch').value = data.bridge_no;
      this.filterBridges();
    } else if (category === 'curves') {
      this.switchTab('curves');
      document.getElementById('curveSearch').value = data.curve_no;
      this.filterCurves();
    } else if (category === 'pnc') {
      this.switchTab('pnc');
      document.getElementById('pncSearch').value = data.point_no;
      this.filterPnc();
    } else if (category === 'staff') {
      this.switchTab('staff');
      document.getElementById('staffSearch').value = data.name;
      this.filterStaff();
    } else if (category === 'drawings') {
      if (data.url && data.url.endsWith('.pdf')) {
        this.openPdfModal(data.url, data.filename);
      } else {
        this.switchTab('drawings');
        document.getElementById('drawingSearch').value = data.filename;
        this.filterDrawings();
      }
    } else if (category === 'store') {
      this.switchTab('store');
      document.getElementById('storeSearch').value = data.particular;
      this.filterStore();
    }
  },

  exportTableCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
      let row = [], cols = rows[i].querySelectorAll('td, th');
      for (let j = 0; j < cols.length; j++) {
        let cleanText = cols[j].innerText.replace(/"/g, '""').trim();
        row.push(`"${cleanText}"`);
      }
      csv.push(row.join(','));
    }

    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
};

window.addEventListener('DOMContentLoaded', () => app.init());


/**
 * Interactive Linear Track & Gradient Profile Engine (Google Maps-Style)
 */
const linearViewer = {
  canvas: null,
  ctx: null,
  minimapCanvas: null,
  minimapCtx: null,
  viewportBox: null,
  width: 0,
  height: 0,
  dpr: 1,

  // Line selection: 'main' (DFCC Main Line) or 'link' (SMUN-RPJ Link Line)
  lineMode: 'main',

  // Jurisdiction KM ranges
  mainMinKm: 1167.2,
  mainMaxKm: 1250.0,
  linkMinKm: 1171.6606,
  linkMaxKm: 1178.4476,

  minKm: 1167.2,
  maxKm: 1250.0,

  // Viewport state
  viewKmStart: 1167.2,
  viewKmSpan: 82.8,

  // Elevation range for L-section
  minElev: 252.0,
  maxElev: 278.0,

  // Layers visibility
  layers: {
    bridges: true,
    curves: true,
    pnc: true,
    gradients: true,
    loop_lines: true,
    high_banks: true,
    defects: true,
    beats: true,
    patrolmen: true
  },

  // Mouse & Touch interaction state
  isDragging: false,
  dragStartX: 0,
  dragStartKm: 0,
  mouseX: -1,
  mouseY: -1,
  renderRequested: false,

  // Strict 2-finger zoom tracking
  initialTouchDist: 0,
  initialTouchSpan: 2.8,

  // Active Staff Mobiles for Calling
  currentKeymanMobile: '',
  currentPatrolmanMobile: '',

  initialized: false,

  init() {
    this.canvas = document.getElementById('linearTrackCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.minimapCanvas = document.getElementById('minimapCanvas');
    if (this.minimapCanvas) this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.viewportBox = document.getElementById('minimapViewportBox');

    this.setupListeners();
    this.resize();
    this.fitEntireSection();
    this.initialized = true;
  },

  setLineMode(mode) {
    this.lineMode = mode;
    const btnMain = document.getElementById('btnSwitchMainLine');
    const btnLink = document.getElementById('btnSwitchLinkLine');
    const badge = document.getElementById('hudLineBadge');
    const yardPills = document.getElementById('yardPillsGroup');

    if (mode === 'link') {
      btnMain.classList.remove('active');
      btnLink.classList.add('active', 'link-active');
      if (badge) {
        badge.textContent = 'LINK LINE (SMUN-RPJ)';
        badge.className = 'line-badge link';
      }
      if (yardPills) yardPills.style.opacity = '0.4';

      this.minKm = this.linkMinKm;
      this.maxKm = this.linkMaxKm;
      this.minElev = 258.0;
      this.maxElev = 276.0;
      this.viewKmStart = this.linkMinKm;
      this.viewKmSpan = this.linkMaxKm - this.linkMinKm;
    } else {
      btnLink.classList.remove('active', 'link-active');
      btnMain.classList.add('active');
      if (badge) {
        badge.textContent = 'MAIN LINE (DFC)';
        badge.className = 'line-badge';
      }
      if (yardPills) yardPills.style.opacity = '1';

      this.minKm = this.mainMinKm;
      this.maxKm = this.mainMaxKm;
      this.minElev = 252.0;
      this.maxElev = 278.0;
      this.viewKmStart = this.mainMinKm;
      this.viewKmSpan = this.mainMaxKm - this.mainMinKm;
    }

    this.requestRender();
  },

  setupListeners() {
    const vp = document.getElementById('canvasViewport');
    if (!vp) return;

    window.addEventListener('resize', () => {
      if (app.activeTab === 'linear-diagram') {
        this.resize();
        this.requestRender();
      }
    });

    // 1. Mouse Drag Pan
    vp.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartKm = this.viewKmStart;
      vp.style.cursor = 'grabbing';
    });

    vp.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dKm = -(dx / this.width) * this.viewKmSpan;
        this.viewKmStart = Math.max(this.minKm - 2, Math.min(this.maxKm - this.viewKmSpan + 2, this.dragStartKm + dKm));
      }

      if (this.mouseX >= 0 && this.mouseX <= this.width && this.mouseY >= 0 && this.mouseY <= this.height) {
        this.updateHUD(this.screenXToKm(this.mouseX));
      }

      this.requestRender();
    });

    vp.addEventListener('mouseleave', () => {
      this.mouseX = -1;
      this.mouseY = -1;
      this.requestRender();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        vp.style.cursor = 'grab';
        this.requestRender();
      }
    });

    // 2. Mouse Wheel Zoom (PC only)
    vp.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorKm = this.screenXToKm(cursorX);
      const zoomFactor = e.deltaY < 0 ? 0.72 : 1.38;
      this.zoomAtKm(cursorKm, zoomFactor);
    }, { passive: false });

    // 3. Strict Mobile Touch Gestures:
    // 1 finger = PAN ONLY (NO zoom at all)
    // 2 fingers = PINCH ZOOM ONLY
    vp.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
        this.dragStartKm = this.viewKmStart;
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        if (this.mouseX >= 0 && this.mouseX <= this.width) {
          this.updateHUD(this.screenXToKm(this.mouseX));
        }
        this.requestRender();
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialTouchDist = Math.hypot(dx, dy);
        this.initialTouchSpan = this.viewKmSpan;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        // Pure Pan, strictly NO zoom
        const dx = e.touches[0].clientX - this.dragStartX;
        const dKm = -(dx / this.width) * this.viewKmSpan;
        this.viewKmStart = Math.max(this.minKm - 1.5, Math.min(this.maxKm - this.viewKmSpan + 1.5, this.dragStartKm + dKm));

        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        if (this.mouseX >= 0 && this.mouseX <= this.width) {
          this.updateHUD(this.screenXToKm(this.mouseX));
        }
        this.requestRender();
      } else if (e.touches.length === 2) {
        // Strict 2-Finger Pinch Zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (this.initialTouchDist > 0 && dist > 10) {
          const factor = this.initialTouchDist / dist;
          const newSpan = Math.max(0.12, Math.min(this.maxKm - this.minKm, this.initialTouchSpan * factor));
          const midScreenX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const rect = this.canvas.getBoundingClientRect();
          const midX = midScreenX - rect.left;
          const centerKm = this.screenXToKm(midX);
          const ratio = (centerKm - this.viewKmStart) / this.viewKmSpan;
          this.viewKmSpan = newSpan;
          this.viewKmStart = centerKm - ratio * newSpan;
          this.requestRender();
        }
      }
    }, { passive: true });

    vp.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isDragging = false;
        this.initialTouchDist = 0;
      } else if (e.touches.length === 1) {
        // Switched from 2 fingers to 1 finger
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
        this.dragStartKm = this.viewKmStart;
        this.initialTouchDist = 0;
      }
    }, { passive: true });

    // 4. Minimap Click & Drag
    const mmBar = document.getElementById('linearMinimapBar');
    if (mmBar) {
      let isMmDragging = false;
      const handleMm = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const rect = mmBar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const centerKm = this.minKm + ratio * (this.maxKm - this.minKm);
        this.viewKmStart = Math.max(this.minKm, Math.min(this.maxKm - this.viewKmSpan, centerKm - this.viewKmSpan / 2));
        this.requestRender();
      };

      mmBar.addEventListener('mousedown', (e) => {
        isMmDragging = true;
        handleMm(e);
      });
      window.addEventListener('mousemove', (e) => {
        if (isMmDragging) handleMm(e);
      });
      window.addEventListener('mouseup', () => {
        isMmDragging = false;
      });

      mmBar.addEventListener('touchstart', (e) => {
        isMmDragging = true;
        handleMm(e);
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (isMmDragging && e.touches.length === 1) handleMm(e);
      }, { passive: true });
      window.addEventListener('touchend', () => {
        isMmDragging = false;
      }, { passive: true });
    }

    // 5. Canvas click for asset inspection
    this.canvas.addEventListener('click', (e) => {
      if (this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.handleCanvasClick(clickX, clickY);
    });
  },

  callKeyman(e) {
    if (e) e.preventDefault();
    if (this.currentKeymanMobile) {
      window.location.href = `tel:${this.currentKeymanMobile}`;
    } else {
      alert("Mobile number not available for active Keyman.");
    }
  },

  callPatrolman(e) {
    if (e) e.preventDefault();
    if (this.currentPatrolmanMobile) {
      window.location.href = `tel:${this.currentPatrolmanMobile}`;
    } else {
      alert("Mobile number not available for active Patrolman.");
    }
  },

  requestRender() {
    if (!this.renderRequested) {
      this.renderRequested = true;
      requestAnimationFrame(() => {
        this.renderRequested = false;
        this.render();
      });
    }
  },

  resize() {
    const vp = document.getElementById('canvasViewport');
    if (!vp || !this.canvas) return;

    this.dpr = window.devicePixelRatio || 1;
    const rect = vp.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    if (this.minimapCanvas) {
      const mmRect = this.minimapCanvas.getBoundingClientRect();
      this.minimapCanvas.width = Math.floor(mmRect.width * this.dpr);
      this.minimapCanvas.height = Math.floor(mmRect.height * this.dpr);
      if (this.minimapCtx) {
        this.minimapCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.minimapCtx.scale(this.dpr, this.dpr);
      }
    }
  },

  kmToScreenX(km) {
    return ((km - this.viewKmStart) / this.viewKmSpan) * this.width;
  },

  screenXToKm(x) {
    return this.viewKmStart + (x / this.width) * this.viewKmSpan;
  },

  elevToScreenY(elev, topY, bottomY) {
    const norm = (elev - this.minElev) / (this.maxElev - this.minElev);
    return bottomY - norm * (bottomY - topY);
  },

  zoomAtKm(centerKm, factor) {
    const oldSpan = this.viewKmSpan;
    const newSpan = Math.max(0.15, Math.min(this.maxKm - this.minKm, oldSpan * factor));
    const ratio = (centerKm - this.viewKmStart) / oldSpan;
    this.viewKmSpan = newSpan;
    this.viewKmStart = centerKm - ratio * newSpan;
    this.requestRender();
  },

  zoomBy(factor) {
    const centerKm = this.viewKmStart + this.viewKmSpan / 2;
    this.zoomAtKm(centerKm, 1 / factor);
  },

  fitEntireSection() {
    this.viewKmStart = this.minKm;
    this.viewKmSpan = this.maxKm - this.minKm;
    this.requestRender();
  },

  flyToKm(targetKm) {
    this.viewKmSpan = 2.8; // Yard inspection scale
    this.viewKmStart = targetKm - this.viewKmSpan / 2;
    this.requestRender();
  },

  searchKm() {
    const val = parseFloat(document.getElementById('linearKmSearch').value);
    if (!isNaN(val) && val >= this.minKm && val <= this.maxKm) {
      this.flyToKm(val);
    } else {
      alert(`Please enter a valid chainage between ${this.minKm} and ${this.maxKm}`);
    }
  },

  toggleLayer(layerName, isVisible) {
    this.layers[layerName] = isVisible;
    this.requestRender();
  },

  getLOD() {
    if (this.viewKmSpan > 25.0) return 1; // Level 1: Macro Corridor (Stations only)
    if (this.viewKmSpan > 5.0) return 2;  // Level 2: District / Yard Scale (Major assets & gradients)
    return 3;                             // Level 3: Engineering Scale (Turnouts, Culverts, 100m ticks)
  },

  render() {
    if (!this.ctx || !this.width || !this.height) return;

    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    const lod = this.getLOD();

    // Update LOD Badge
    const badge = document.getElementById('lodIndicatorBadge');
    if (badge) {
      if (lod === 1) {
        badge.textContent = 'Level 1: Macro Overview (Stations only)';
        badge.style.color = '#94a3b8';
      } else if (lod === 2) {
        badge.textContent = 'Level 2: Yard & Gradient Scale';
        badge.style.color = '#f59e0b';
      } else {
        badge.textContent = 'Level 3: Detailed Engineering Scale';
        badge.style.color = '#38bdf8';
      }
    }

    // ALWAYS CLEAN THE ENTIRE CANVAS FIRST (No trailing lines!)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    // Layout Split
    const planHeight = Math.floor(H * 0.50);
    const dividerY = planHeight;
    const profileTopY = dividerY + 34;
    const profileBottomY = H - 42;
    const gradientBandY = H - 36;

    // 1. Plan View Layers
    if (this.lineMode === 'main') {
      this.renderSectionBackgrounds(ctx, W, dividerY);
      this.renderKeymanBeats(ctx, W, dividerY, lod);
      this.renderPatrolmenBeats(ctx, W, dividerY, lod);
      this.renderChainageRuler(ctx, W, dividerY, lod);
      this.renderStationYards(ctx, W, dividerY, lod);
      this.renderCurves(ctx, W, dividerY, lod);
      this.renderLoopLines(ctx, W, dividerY, lod);
      this.renderMainTrack(ctx, W, dividerY, lod);
      this.renderBridges(ctx, W, dividerY, lod);
      this.renderTurnouts(ctx, W, dividerY, lod);
      this.renderDefects(ctx, W, dividerY, lod);
    } else {
      // LINK LINE PLAN VIEW (SMUN - Rajpura Linking Alignment)
      this.renderLinkLinePlan(ctx, W, dividerY, lod);
    }

    // 2. Middle Divider
    this.renderDivider(ctx, W, dividerY);

    // 3. Longitudinal Profile View Layers
    this.renderElevationGrid(ctx, W, profileTopY, profileBottomY);
    this.renderLongitudinalProfile(ctx, W, profileTopY, profileBottomY, lod);
    this.renderGradientBand(ctx, W, gradientBandY, H, lod);

    // 4. Single Synchronized Crosshair (drawn ONLY once per frame!)
    if (this.mouseX >= 0 && this.mouseX <= W && !this.isDragging) {
      this.renderCrosshairLine(ctx, this.mouseX, H);
    }

    // 5. Minimap Scrubber
    this.renderMinimap();
  },

  renderLinkLinePlan(ctx, W, dividerY, lod) {
    // Shaded link corridor background
    ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
    ctx.fillRect(0, 26, W, dividerY - 26);

    // Chainage Ruler for Link Line
    this.renderChainageRuler(ctx, W, dividerY, lod);

    const trackY = Math.floor(dividerY * 0.58);

    // Ballast bed
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, trackY - 5, W, 10);

    // Link Line Track (Amber/Gold line to clearly distinguish from Main Track)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, trackY);
    ctx.lineTo(W, trackY);
    ctx.stroke();

    // Secondary line representation
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, trackY - 2);
    ctx.lineTo(W, trackY - 2);
    ctx.moveTo(0, trackY + 2);
    ctx.lineTo(W, trackY + 2);
    ctx.stroke();

    // End points: SMUN Yard Takeoff & Rajpura Connection
    const smunX = this.kmToScreenX(1171.661);
    const rpjX = this.kmToScreenX(1178.448);

    if (smunX >= -80 && smunX <= W + 80) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(smunX, trackY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔗 SMUN Yard Takeoff (KM 1171.661)', smunX, trackY - 14);
    }

    if (rpjX >= -80 && rpjX <= W + 80) {
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(rpjX, trackY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔗 Rajpura IR Junction (KM 1178.448)', rpjX, trackY - 14);
    }

    // Link line connection note
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SMUN - RPJ DEDICATED LINK LINE CORRIDOR (6.787 KM)', 14, 48);
  },

  renderSectionBackgrounds(ctx, W, dividerY) {
    const sections = app.data.sections || [];
    sections.forEach((sec, idx) => {
      const x1 = this.kmToScreenX(sec.km_from);
      const x2 = this.kmToScreenX(sec.km_to);
      if (x2 < 0 || x1 > W) return;

      const drawX1 = Math.max(0, x1);
      const drawX2 = Math.min(W, x2);
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(30, 41, 59, 0.22)' : 'rgba(15, 23, 42, 0.1)';
      ctx.fillRect(drawX1, 26, drawX2 - drawX1, dividerY - 26);

      // Section boundary line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x1, 26);
      ctx.lineTo(x1, dividerY);
      ctx.stroke();

      if (x2 - x1 > 90) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sec.section, (drawX1 + drawX2) / 2, 42);
      }
    });
  },

  renderKeymanBeats(ctx, W, dividerY, lod) {
    if (!this.layers.beats || lod < 2) return;
    const staff = (app.data.master_staff || []).filter(s => 
      (s.designation || '').toUpperCase().includes('KEYMAN')
    );

    staff.forEach(s => {
      if (!s.km_from || !s.km_to) return;
      const x1 = this.kmToScreenX(s.km_from);
      const x2 = this.kmToScreenX(s.km_to);
      if (x2 < 0 || x1 > W) return;

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, 48);
      ctx.lineTo(x1, dividerY - 8);
      ctx.stroke();
      ctx.setLineDash([]);

      if (x2 - x1 > 90) {
        ctx.fillStyle = 'rgba(129, 140, 248, 0.9)';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`👷 ${s.beat_no}: ${s.name.split(' ')[0]}`, Math.max(8, x1 + 6), dividerY - 22);
      }
    });
  },

  renderPatrolmenBeats(ctx, W, dividerY, lod) {
    if (!this.layers.patrolmen || lod < 2) return;
    const staff = (app.data.master_staff || []).filter(s => 
      (s.designation || '').toLowerCase().includes('patrol')
    );

    // Group patrolmen by beat or draw beats
    staff.forEach((s, idx) => {
      if (!s.km_from || !s.km_to) return;
      const x1 = this.kmToScreenX(s.km_from);
      const x2 = this.kmToScreenX(s.km_to);
      if (x2 < 0 || x1 > W) return;

      // Draw dashed boundary line for patrol beat
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, 52);
      ctx.lineTo(x1, dividerY - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      if (x2 - x1 > 110) {
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'left';
        // Alternate Y slightly if two patrolmen share beat
        const labelY = (idx % 2 === 0) ? (dividerY - 10) : (dividerY - 2);
        ctx.fillText(`🛡️ ${s.beat_no}: ${s.name.split(' ')[0]}`, Math.max(8, x1 + 6), labelY);
      }
    });
  },

  renderChainageRuler(ctx, W, dividerY, lod) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, 26);
    ctx.strokeStyle = 'var(--border-color)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(W, 26);
    ctx.stroke();

    const startKmInt = Math.floor(this.viewKmStart);
    const endKmInt = Math.ceil(this.viewKmStart + this.viewKmSpan);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (let km = startKmInt; km <= endKmInt; km++) {
      const x = this.kmToScreenX(km);
      if (x < -60 || x > W + 60) continue;

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 14);
      ctx.lineTo(x, 26);
      ctx.stroke();

      if (this.viewKmSpan <= 35 || km % 5 === 0) {
        ctx.fillText(`KM ${km}`, x, 11);
      }

      // 100m ticks only when zoomed in (LOD 3)
      if (lod >= 3) {
        ctx.strokeStyle = '#334155';
        for (let m = 100; m < 1000; m += 100) {
          const subX = this.kmToScreenX(km + m / 1000.0);
          if (subX >= 0 && subX <= W) {
            ctx.beginPath();
            ctx.moveTo(subX, m === 500 ? 18 : 22);
            ctx.lineTo(subX, 26);
            ctx.stroke();
            if (this.viewKmSpan <= 1.5 && (m === 200 || m === 400 || m === 600 || m === 800)) {
              ctx.font = '8px system-ui, sans-serif';
              ctx.fillText(`+${m}`, subX, 16);
              ctx.font = '10px system-ui, sans-serif';
            }
          }
        }
      }
    }
  },

  renderStationYards(ctx, W, dividerY, lod) {
    const stations = [
      { code: 'SMUN', name: 'New Shambhu', km: 1169.5, start: 1168.0, end: 1171.0 },
      { code: 'SBJN', name: 'Sarai Banjara', km: 1188.5, start: 1187.0, end: 1190.0 },
      { code: 'NSIR', name: 'New Sirhind', km: 1202.0, start: 1200.5, end: 1203.5 },
      { code: 'GVGN', name: 'Mandi Gobindgarh', km: 1213.2, start: 1211.5, end: 1215.0 },
      { code: 'KNNN', name: 'New Khanna', km: 1229.0, start: 1227.5, end: 1230.5 },
      { code: 'CHAN', name: 'New Chawa Pail', km: 1237.5, start: 1236.0, end: 1239.0 },
      { code: 'SNL', name: 'Sanehwal', km: 1249.7, start: 1248.0, end: 1250.0 }
    ];

    const trackY = Math.floor(dividerY * 0.58);

    stations.forEach(stn => {
      const x = this.kmToScreenX(stn.km);
      const xStart = this.kmToScreenX(stn.start);
      const xEnd = this.kmToScreenX(stn.end);
      if (xEnd < 0 || xStart > W) return;

      // Yard shaded box at LOD 2 and 3
      if (lod >= 2) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.fillRect(Math.max(0, xStart), 26, Math.min(W, xEnd) - Math.max(0, xStart), dividerY - 26);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.strokeRect(Math.max(0, xStart), 26, Math.min(W, xEnd) - Math.max(0, xStart), dividerY - 26);
      }

      if (x >= -70 && x <= W + 70) {
        // Station node circle
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(x, trackY, lod >= 2 ? 10 : 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, trackY, lod >= 2 ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();

        // Prominent Station Header
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        const txt = `🚉 ${stn.code}`;
        ctx.font = 'bold 11px system-ui, sans-serif';
        const tw = ctx.measureText(txt).width;

        ctx.beginPath();
        ctx.roundRect(x - tw/2 - 6, trackY - 28, tw + 12, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(txt, x, trackY - 15);

        if (lod >= 2) {
          ctx.font = '9px system-ui, sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(stn.name, x, trackY + 22);
          ctx.fillText(`Km ${stn.km}`, x, trackY + 33);
        }
      }
    });
  },

  renderMainTrack(ctx, W, dividerY, lod) {
    const trackY = Math.floor(dividerY * 0.58);

    // Ballast Base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, trackY - 4, W, 8);

    // Dual Rails
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, trackY - 2);
    ctx.lineTo(W, trackY - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, trackY + 2);
    ctx.lineTo(W, trackY + 2);
    ctx.stroke();

    // Sleepers (only in deep zoom)
    if (lod >= 3 && this.viewKmSpan <= 1.0) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      const stepPx = Math.max(8, this.kmToScreenX(1167.201) - this.kmToScreenX(1167.200));
      for (let x = 0; x < W; x += stepPx) {
        ctx.beginPath();
        ctx.moveTo(x, trackY - 5);
        ctx.lineTo(x, trackY + 5);
        ctx.stroke();
      }
    }
  },

  renderLoopLines(ctx, W, dividerY, lod) {
    // Only render loop lines when zoomed in to yard scale (LOD 2.5 or 3)
    if (!this.layers.loop_lines || lod < 2 || this.viewKmSpan > 15.0) return;
    const lines = app.data.loop_lines || [];
    const trackY = Math.floor(dividerY * 0.58);

    lines.forEach((line) => {
      const x1 = this.kmToScreenX(line.ch_from);
      const x2 = this.kmToScreenX(line.ch_to);
      if (x2 < 0 || x1 > W) return;

      const txt = (line.line || '').toUpperCase();
      let offset = -22;
      let color = '#38bdf8'; // Sky blue for Up loops
      let labelColor = '#7dd3fc';

      if (txt.includes('HOT AXLE')) {
        offset = -36;
        color = '#f87171'; // Red for Hot Axle Siding
        labelColor = '#fca5a5';
      } else if (txt.includes('MACHINE')) {
        offset = -48;
        color = '#fbbf24'; // Amber for Machine Siding
        labelColor = '#fde68a';
      } else if (txt.includes('TOWER')) {
        offset = -48;
        color = '#a78bfa'; // Purple for Tower Wagon
        labelColor = '#ddd6fe';
      } else if (txt.includes('BALLAST')) {
        offset = 48;
        color = '#a3e635'; // Lime for Ballast Siding
        labelColor = '#d9f99d';
      } else if (txt.includes('SHUNTING')) {
        offset = 48;
        color = '#38bdf8';
        labelColor = '#7dd3fc';
      } else if (txt.includes('CONNECTING') || txt.includes('TO IR')) {
        offset = 64;
        color = '#fb923c'; // Orange for IR Connector
        labelColor = '#fdba74';
      } else if (txt.includes('GOODS LINE NO 1')) {
        offset = 38;
        color = '#34d399';
        labelColor = '#a7f3d0';
      } else if (txt.includes('GOODS LINE NO 2')) {
        offset = 54;
        color = '#34d399';
        labelColor = '#a7f3d0';
      } else if (txt.includes('LINE NO 7') || txt.includes('LOOP LINE NO 7')) {
        offset = -38;
        color = '#38bdf8';
        labelColor = '#7dd3fc';
      } else if (txt.includes('LINE NO 6') || txt.includes('LOOP LINE NO 6')) {
        offset = 64;
        color = '#34d399';
        labelColor = '#a7f3d0';
      } else if (txt.includes('LINE NO 5') || txt.includes('LINE 5') || txt.includes('5A')) {
        offset = 54;
        color = '#34d399';
        labelColor = '#a7f3d0';
      } else if (txt.includes('LINE NO 4') || txt.includes('LINE 4') || txt.includes('4A')) {
        offset = 38;
        color = '#34d399'; // Emerald for Down Goods loops
        labelColor = '#a7f3d0';
      } else if (txt.includes('LINE NO 3') || txt.includes('LINE 3') || txt.includes('3A')) {
        offset = 22;
        color = '#34d399'; // Down loop 3/3A
        labelColor = '#a7f3d0';
      } else if (txt.includes('LINE NO 2') || txt.includes('LINE 2')) {
        offset = -22;
        color = '#38bdf8';
        labelColor = '#7dd3fc';
      } else if (txt.includes('LINE NO 1') || txt.includes('LINE 1') || txt.includes('1A')) {
        offset = -22;
        color = '#38bdf8'; // Up loop 1/1A
        labelColor = '#7dd3fc';
      }

      const lineY = trackY + offset;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      // Turnout takeoff connection ramp from main/parent track
      const takeoffLen = Math.min(14, Math.max(4, Math.abs(offset) * 0.45));
      ctx.moveTo(x1 - takeoffLen, trackY);
      ctx.lineTo(x1, lineY);
      ctx.lineTo(x2, lineY);
      ctx.lineTo(x2 + takeoffLen, trackY);
      ctx.stroke();

      // Track label in engineering zoom
      if (lod >= 2.5 && x2 - x1 > 45) {
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        const shortName = line.line
          .replace('Common Loop Line', 'Loop')
          .replace('Over Run of Common Loop Line', 'Overrun')
          .replace('Over Run OF Loop Line', 'Overrun')
          .replace('Line Between Common Loop Line', 'X-Over')
          .replace('Line between Loop Line', 'X-Over');
        ctx.fillText(shortName, (x1 + x2) / 2, offset < 0 ? lineY - 4 : lineY + 11);
      }
    });
  },

  renderCurves(ctx, W, dividerY, lod) {
    if (!this.layers.curves || lod < 2) return;
    const curves = app.data.curves || [];
    const curveY = 50;

    curves.forEach(c => {
      const x1 = this.kmToScreenX(c.km_from);
      const x2 = this.kmToScreenX(c.km_to);
      if (x2 < 0 || x1 > W) return;

      const cw = Math.max(10, x2 - x1);
      const r = c.radius || 3000;

      let color = 'rgba(16, 185, 129, 0.85)';
      if (r < 2000) color = 'rgba(239, 68, 68, 0.85)';
      else if (r <= 3500) color = 'rgba(245, 158, 11, 0.85)';

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x1, curveY, cw, 14, 3);
      ctx.fill();

      if (cw > 40) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`C-${c.curve_no} (R${c.radius}m)`, x1 + cw/2, curveY + 10);
      }
    });
  },

  renderBridges(ctx, W, dividerY, lod) {
    if (!this.layers.bridges) return;
    const bridges = app.data.bridges || [];
    const trackY = Math.floor(dividerY * 0.58);

    bridges.forEach(b => {
      const x = this.kmToScreenX((b.km_from + b.km_to) / 2 || b.km_from);
      if (x < -30 || x > W + 30) return;

      const type = (b.bridge_type || b.category || '').toUpperCase();
      const isMajor = type.includes('MJB') || type.includes('ROB') || type.includes('RUB') || type.includes('FOB') || type.includes('OWG');

      if (lod === 1 && !isMajor) return;

      let bColor = '#38bdf8';
      if (type.includes('ROB') || type.includes('FOB')) bColor = '#f59e0b';
      else if (!isMajor) bColor = '#94a3b8';

      // Pier uprights
      ctx.strokeStyle = bColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, trackY - 14);
      ctx.lineTo(x, trackY + 14);
      ctx.stroke();

      // Wingwalls
      ctx.beginPath();
      ctx.moveTo(x - 3, trackY - 14);
      ctx.lineTo(x + 3, trackY - 14);
      ctx.moveTo(x - 3, trackY + 14);
      ctx.lineTo(x + 3, trackY + 14);
      ctx.stroke();

      if (lod >= 2 && isMajor) {
        ctx.fillStyle = bColor;
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.bridge_no, x, trackY - 17);
      } else if (lod >= 3) {
        ctx.fillStyle = bColor;
        ctx.font = '7px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.bridge_no, x, trackY + 20);
      }
    });
  },

  renderTurnouts(ctx, W, dividerY, lod) {
    if (!this.layers.pnc || lod < 3) return;
    const pncList = app.data.points_and_crossings || [];
    const trackY = Math.floor(dividerY * 0.58);

    pncList.forEach(p => {
      const x = this.kmToScreenX(p.srj_chainage);
      if (x < -20 || x > W + 20) return;

      const isLH = p.turnout === 'LH';
      const switchY = isLH ? trackY - 8 : trackY + 8;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, trackY);
      ctx.lineTo(x + (p.traffic === 'Facing' ? 12 : -12), switchY);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = '7px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Pt ${p.point_no}`, x, switchY + (isLH ? -4 : 10));
    });
  },

  renderDefects(ctx, W, dividerY, lod) {
    if (!this.layers.defects || lod < 2) return;
    const dfwo = app.data.dfwo || [];
    const trackY = Math.floor(dividerY * 0.58);

    dfwo.forEach(d => {
      const x = this.kmToScreenX(d.chainage);
      if (x < -10 || x > W + 10) return;

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(x, trackY - 2);
      ctx.lineTo(x - 4, trackY - 9);
      ctx.lineTo(x + 4, trackY - 9);
      ctx.closePath();
      ctx.fill();

      if (lod >= 3) {
        ctx.font = '7px system-ui, sans-serif';
        ctx.fillText(d.defect_no, x, trackY - 11);
      }
    });
  },

  renderDivider(ctx, W, dividerY) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, dividerY);
    ctx.lineTo(W, dividerY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('▲ TRACK PLAN VIEW', 12, dividerY - 6);
    ctx.fillText('▼ LONGITUDINAL SECTION (ELEVATION & GRADIENT PROFILE)', 12, dividerY + 16);

    // Legend inline labels
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('── PFL (Rail Level)', W - 230, dividerY + 16);
    ctx.fillStyle = '#d97706';
    ctx.fillText('-- GL (Ground Level)', W - 115, dividerY + 16);
  },

  renderElevationGrid(ctx, W, topY, bottomY) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = '8px system-ui, sans-serif';
    ctx.textAlign = 'right';

    for (let elev = this.minElev; elev <= this.maxElev; elev += 5) {
      const y = this.elevToScreenY(elev, topY, bottomY);
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      ctx.fillText(`${elev}m`, 30, y + 3);
    }
  },

  renderLongitudinalProfile(ctx, W, topY, bottomY, lod) {
    const isLink = this.lineMode === 'link';
    const profile = isLink ? 
      ((app.data.profile && app.data.profile.link_line) || []) : 
      ((app.data.profile && app.data.profile.points) || []);

    if (!profile.length) return;

    const startIndex = Math.max(0, profile.findIndex(p => p.km >= this.viewKmStart - 0.2));
    if (startIndex === -1) return;

    const visiblePoints = [];
    for (let i = startIndex; i < profile.length; i++) {
      visiblePoints.push(profile[i]);
      if (profile[i].km > this.viewKmStart + this.viewKmSpan + 0.2) break;
    }

    if (visiblePoints.length < 2) return;

    // 1. Embankment Fill/Cut polygon
    ctx.beginPath();
    for (let i = 0; i < visiblePoints.length; i++) {
      const p = visiblePoints[i];
      const x = this.kmToScreenX(p.km);
      const y = this.elevToScreenY(p.pfl, topY, bottomY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = visiblePoints.length - 1; i >= 0; i--) {
      const p = visiblePoints[i];
      const x = this.kmToScreenX(p.km);
      const y = this.elevToScreenY(p.gl, topY, bottomY);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = isLink ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.1)';
    ctx.fill();

    // 2. High Bank Alerts (>6m) - only on main line
    if (!isLink && this.layers.high_banks) {
      const highBanks = (app.data.profile && app.data.profile.high_banks) || [];
      highBanks.forEach(hb => {
        const x = this.kmToScreenX(hb.km);
        if (x >= 0 && x <= W) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.fillRect(x - 2, topY, 4, bottomY - topY);
        }
      });
    }

    // 3. Ground Level (GL) Line - Brown
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    for (let i = 0; i < visiblePoints.length; i++) {
      const p = visiblePoints[i];
      const x = this.kmToScreenX(p.km);
      const y = this.elevToScreenY(p.gl, topY, bottomY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Proposed Formation Level (PFL) Line - Cyan for Main, Amber for Link
    ctx.strokeStyle = isLink ? '#f59e0b' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < visiblePoints.length; i++) {
      const p = visiblePoints[i];
      const x = this.kmToScreenX(p.km);
      const y = this.elevToScreenY(p.pfl, topY, bottomY);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 5. Point elevation dots at high LOD
    if (lod >= 3 && this.viewKmSpan <= 1.0) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '8px system-ui, sans-serif';
      visiblePoints.forEach(p => {
        const x = this.kmToScreenX(p.km);
        const yPfl = this.elevToScreenY(p.pfl, topY, bottomY);
        ctx.beginPath();
        ctx.arc(x, yPfl, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText(`${p.pfl}m`, x, yPfl - 6);
      });
    }
  },

  renderGradientBand(ctx, W, bandTopY, H, lod) {
    if (!this.layers.gradients) return;
    const isLink = this.lineMode === 'link';
    const gradients = isLink ? 
      ((app.data.profile && app.data.profile.link_gradients) || []) : 
      ((app.data.profile && app.data.profile.gradients) || []);

    if (!gradients.length) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, bandTopY, W, H - bandTopY);
    ctx.strokeStyle = 'var(--border-color)';
    ctx.beginPath();
    ctx.moveTo(0, bandTopY);
    ctx.lineTo(W, bandTopY);
    ctx.stroke();

    gradients.forEach(g => {
      const x1 = this.kmToScreenX(g.km_from);
      const x2 = this.kmToScreenX(g.km_to);
      if (x2 < 0 || x1 > W) return;

      const gw = Math.max(1, x2 - x1);

      // PVI Vertical boundary
      ctx.strokeStyle = '#475569';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x1, bandTopY);
      ctx.lineTo(x1, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Gradient text and arrow
      if (gw > 40 && lod >= 2) {
        let arrow = '──';
        let color = '#94a3b8';
        if (g.direction === 'RISING') {
          arrow = '▲';
          color = '#10b981';
        } else if (g.direction === 'FALLING') {
          arrow = '▼';
          color = '#f59e0b';
        }

        ctx.fillStyle = color;
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${arrow} ${g.label}`, (Math.max(0, x1) + Math.min(W, x2)) / 2, bandTopY + 16);

        if (gw > 75) {
          ctx.fillStyle = '#64748b';
          ctx.font = '7px system-ui, sans-serif';
          ctx.fillText(`L=${g.length_m}m`, (Math.max(0, x1) + Math.min(W, x2)) / 2, bandTopY + 28);
        }
      }
    });
  },

  // SINGLE Crosshair line drawn cleanly per frame
  renderCrosshairLine(ctx, x, H) {
    ctx.save();
    ctx.strokeStyle = this.lineMode === 'link' ? 'rgba(245, 158, 11, 0.85)' : 'rgba(56, 189, 248, 0.75)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 26);
    ctx.lineTo(x, H);
    ctx.stroke();
    ctx.restore();
  },

  updateHUD(km) {
    const detailsPanel = document.getElementById('linearDetailsPanel');
    if (!detailsPanel) return;

    km = Math.max(this.minKm, Math.min(this.maxKm, km));
    const kmInt = Math.floor(km);
    const mInt = Math.round((km - kmInt) * 1000);

    const isLink = this.lineMode === 'link';
    const chainageElem = document.getElementById('hudChainageText');
    if (chainageElem) {
      chainageElem.textContent = `${isLink ? 'LINK ' : ''}KM ${kmInt} + ${mInt.toString().padStart(3, '0')} m (${km.toFixed(3)})`;
    }

    // Interpolate Elevation from appropriate profile (Main vs Link)
    const profile = isLink ? 
      ((app.data.profile && app.data.profile.link_line) || []) : 
      ((app.data.profile && app.data.profile.points) || []);

    let pflVal = '-';
    let glVal = '-';
    let bankVal = '-';

    if (profile.length) {
      let idx = profile.findIndex(p => p.km >= km);
      if (idx === -1) idx = profile.length - 1;
      const pt = profile[idx];
      if (pt) {
        pflVal = `${pt.pfl.toFixed(2)} m`;
        glVal = `${pt.gl.toFixed(2)} m`;
        const b = pt.bank;
        bankVal = `${b >= 0 ? '+' : ''}${b.toFixed(2)} m (${b >= 0 ? 'Fill' : 'Cut'})`;
      }
    }

    const pflElem = document.getElementById('hudPflVal');
    const glElem = document.getElementById('hudGlVal');
    const bankElem = document.getElementById('hudBankVal');
    if (pflElem) pflElem.textContent = pflVal;
    if (glElem) glElem.textContent = glVal;
    if (bankElem) bankElem.textContent = bankVal;

    // Gradient at this KM
    const gradients = isLink ? 
      ((app.data.profile && app.data.profile.link_gradients) || []) : 
      ((app.data.profile && app.data.profile.gradients) || []);

    const grad = gradients.find(g => g.km_from <= km && km <= g.km_to);
    const gradElem = document.getElementById('hudGradientText');
    if (gradElem) {
      gradElem.textContent = grad ? `Gradient: ${grad.label} (${grad.length_m}m)` : 'Gradient: LEVEL';
    }

    // Section at this KM
    const secElem = document.getElementById('hudSectionText');
    if (secElem) {
      if (isLink) {
        secElem.textContent = 'SMUN-RPJ Link Line';
      } else {
        const sections = app.data.sections || [];
        const sec = sections.find(s => s.km_from <= km && km <= s.km_to);
        secElem.textContent = sec ? sec.section : 'Main Line';
      }
    }

    // Active Keyman & Patrolman at this chainage
    const staff = app.data.master_staff || [];
    const kmStaff = staff.find(s => 
      (s.designation || '').toUpperCase().includes('KEYMAN') && 
      s.km_from <= km && km <= s.km_to
    );

    const kmNameElem = document.getElementById('hudKeymanName');
    const kmCallBtn = document.getElementById('hudKeymanCallBtn');
    if (kmStaff) {
      this.currentKeymanMobile = kmStaff.mobile || '';
      if (kmNameElem) kmNameElem.textContent = `${kmStaff.name} (${kmStaff.beat_no || 'Beat'})`;
      if (kmCallBtn) {
        kmCallBtn.style.display = 'inline-flex';
        kmCallBtn.title = `Call ${kmStaff.name}: ${kmStaff.mobile || 'N/A'}`;
      }
    } else {
      this.currentKeymanMobile = '';
      if (kmNameElem) kmNameElem.textContent = 'Section Keyman Staff';
      if (kmCallBtn) kmCallBtn.style.display = 'none';
    }

    const patrolmen = staff.filter(s => 
      (s.designation || '').toLowerCase().includes('patrol') && 
      s.km_from <= km && km <= s.km_to
    );

    const patNameElem = document.getElementById('hudPatrolmanName');
    const patCallBtn = document.getElementById('hudPatrolmanCallBtn');
    if (patrolmen.length > 0) {
      const activePatrol = patrolmen[0];
      this.currentPatrolmanMobile = activePatrol.mobile || '';
      if (patNameElem) patNameElem.textContent = `${activePatrol.name} (${activePatrol.beat_no || 'Beat'})`;
      if (patCallBtn) {
        patCallBtn.style.display = 'inline-flex';
        patCallBtn.title = `Call ${activePatrol.name}: ${activePatrol.mobile || 'N/A'}`;
      }
    } else {
      this.currentPatrolmanMobile = '';
      if (patNameElem) patNameElem.textContent = 'Section Patrol Staff';
      if (patCallBtn) patCallBtn.style.display = 'none';
    }

    // Nearest Assets
    const assetElem = document.getElementById('hudAssetText');
    if (assetElem) {
      if (isLink) {
        assetElem.textContent = '🔗 SMUN to Rajpura Link Line (Single BG Electric Track, DFCCIL)';
      } else {
        const nearby = [];
        (app.data.bridges || []).forEach(b => {
          if (Math.abs(b.km_from - km) <= 0.15) nearby.push(`Br ${b.bridge_no} (${b.bridge_type})`);
        });
        (app.data.curves || []).forEach(c => {
          if (c.km_from <= km && km <= c.km_to) nearby.push(`Curve ${c.curve_no} (R${c.radius}m)`);
        });
        (app.data.points_and_crossings || []).forEach(p => {
          if (Math.abs(p.srj_chainage - km) <= 0.15) nearby.push(`Point ${p.point_no} (${p.station})`);
        });
        assetElem.textContent = nearby.length ? `Assets: ${nearby.join(', ')}` : 'Main Line Open Track';
      }
    }

    // Google Maps GPS Coordinates
    const gpsElem = document.getElementById('hudGpsText');
    const gpsLink = document.getElementById('hudGpsLink');
    const gpsCoords = this.getGoogleCoords(km);
    if (gpsCoords) {
      if (gpsElem) gpsElem.textContent = `📍 GPS: ${gpsCoords.lat.toFixed(5)}°N, ${gpsCoords.lon.toFixed(5)}°E (KM ${km.toFixed(3)})`;
      if (gpsLink) {
        gpsLink.href = `https://www.google.com/maps?q=${gpsCoords.lat.toFixed(5)},${gpsCoords.lon.toFixed(5)}`;
        gpsLink.style.display = 'inline-flex';
      }
    } else {
      if (gpsElem) gpsElem.textContent = `📍 GPS: KM ${km.toFixed(3)}`;
      if (gpsLink) gpsLink.style.display = 'none';
    }
  },

  getGoogleCoords(km) {
    const coords = app.data.km_coordinates || [];
    if (!coords.length) return null;

    const k1 = Math.floor(km);
    const k2 = k1 + 1;
    const p1 = coords.find(c => Math.abs(c.km - k1) < 0.05);
    const p2 = coords.find(c => Math.abs(c.km - k2) < 0.05);

    if (p1 && p2) {
      const frac = km - k1;
      const lat = p1.lat + (p2.lat - p1.lat) * frac;
      const lon = p1.lon + (p2.lon - p1.lon) * frac;
      return { lat, lon };
    } else if (p1) {
      return { lat: p1.lat, lon: p1.lon };
    } else {
      let closest = coords[0];
      let minD = 9999;
      for (const c of coords) {
        const d = Math.abs(c.km - km);
        if (d < minD) { minD = d; closest = c; }
      }
      return closest ? { lat: closest.lat, lon: closest.lon } : null;
    }
  },

  toggleFullscreen() {
    const elem = document.getElementById('tab-linear-diagram');
    if (!document.fullscreenElement) {
      if (elem && elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  },

  renderMinimap() {
    if (!this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width / this.dpr;
    const h = this.minimapCanvas.height / this.dpr;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Track baseline
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Station dots
    const stations = [1169.5, 1188.5, 1202.0, 1213.2, 1229.0, 1237.5, 1249.7];
    stations.forEach(km => {
      const norm = (km - this.minKm) / (this.maxKm - this.minKm);
      const x = norm * w;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Viewport box
    if (this.viewportBox) {
      const normStart = (this.viewKmStart - this.minKm) / (this.maxKm - this.minKm);
      const normSpan = this.viewKmSpan / (this.maxKm - this.minKm);
      const left = Math.max(0, Math.min(w, normStart * w));
      const boxW = Math.max(8, Math.min(w - left, normSpan * w));
      this.viewportBox.style.left = `${left}px`;
      this.viewportBox.style.width = `${boxW}px`;
    }
  },

  handleCanvasClick(x, y) {
    const km = this.screenXToKm(x);
    const hitRadiusKm = 0.06 * (this.viewKmSpan / 5.0);

    // Check if clicked on a station
    const stations = [
      { code: 'SMUN', km: 1169.5 },
      { code: 'SBJN', km: 1188.5 },
      { code: 'NSIR', km: 1202.0 },
      { code: 'GVGN', km: 1213.2 },
      { code: 'KNNN', km: 1229.0 },
      { code: 'CHAN', km: 1237.5 },
      { code: 'SNL',  km: 1249.7 }
    ];
    const stnHit = stations.find(s => Math.abs(s.km - km) <= Math.max(0.15, hitRadiusKm * 1.5));
    if (stnHit) {
      app.openStationEsp(stnHit.code);
      return;
    }

    const bridge = (app.data.bridges || []).find(b => Math.abs(b.km_from - km) <= hitRadiusKm);
    if (bridge) {
      alert(`🌉 Bridge Details:
Bridge No: ${bridge.bridge_no} (${bridge.bridge_type})
Section: ${bridge.section}
Chainage: Km ${bridge.km_from} - ${bridge.km_to}
Span: ${bridge.span_config || 'N/A'}
Length: ${bridge.length}m`);
      return;
    }

    const curve = (app.data.curves || []).find(c => c.km_from <= km && km <= c.km_to);
    if (curve) {
      alert(`🔄 Curve Details:
Curve No: ${curve.curve_no}
Chainage: Km ${curve.km_from} to ${curve.km_to}
Radius: ${curve.radius}m
Degree: ${curve.degree}°
Cant / SE: ${curve.cant_se || 0}mm
Transition: ${curve.transition_length}m`);
      return;
    }

    const pnc = (app.data.points_and_crossings || []).find(p => Math.abs(p.srj_chainage - km) <= hitRadiusKm);
    if (pnc) {
      alert(`🔀 Point / Turnout Details:
Station: ${pnc.station}
Point No: ${pnc.point_no}
Line: ${pnc.line}
Angle: ${pnc.angle}
SRJ Chainage: Km ${pnc.srj_chainage}
Turnout: ${pnc.turnout} (${pnc.traffic})`);
      return;
    }
  }
};
