/* ============================================================
   Generic client-side DataTable: search + sort + paginate
   config = {
     id, container (el), columns:[{key,label,render(row),sortVal(row),align}],
     data: [...], pageSize, onRowClick(row), searchFn(row,q), emptyMsg
   }
   ============================================================ */
function renderDataTable(config) {
  const id = config.id;
  if (!App.table[id]) App.table[id] = { page: 1, sortKey: config.defaultSortKey || null, sortDir: config.defaultSortDir || 'desc', query: '' };
  const st = App.table[id];
  const pageSize = config.pageSize || 25;

  let rows = config.data.slice();
  if (st.query) {
    const q = st.query.toLowerCase();
    rows = rows.filter(r => config.searchFn ? config.searchFn(r, q) : JSON.stringify(r).toLowerCase().includes(q));
  }
  if (st.sortKey) {
    const col = config.columns.find(c => c.key === st.sortKey);
    rows.sort((a, b) => {
      const va = col.sortVal ? col.sortVal(a) : a[st.sortKey];
      const vb = col.sortVal ? col.sortVal(b) : b[st.sortKey];
      let r;
      if (va === null || va === undefined) r = -1;
      else if (vb === null || vb === undefined) r = 1;
      else if (typeof va === 'string') r = va.localeCompare(vb);
      else r = va - vb;
      return st.sortDir === 'asc' ? r : -r;
    });
  }
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (st.page > totalPages) st.page = totalPages;
  const start = (st.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const toolbarHtml = `
    <div class="table-toolbar">
      <input type="search" placeholder="${config.searchPlaceholder || 'Search…'}" value="${Fmt.esc(st.query)}" data-dt-search="${id}">
      ${config.toolbarExtra || ''}
      <span class="table-count">${Fmt.num(total)} record${total === 1 ? '' : 's'}</span>
    </div>`;

  const theadHtml = `<thead><tr>${config.columns.map(c => {
    const arrow = st.sortKey === c.key ? (st.sortDir === 'asc' ? '▲' : '▼') : '';
    return `<th data-dt-sort="${id}" data-key="${c.key}" style="${c.align ? 'text-align:' + c.align : ''}">${Fmt.esc(c.label)} <span class="sort-arrow">${arrow}</span></th>`;
  }).join('')}</tr></thead>`;

  const tbodyHtml = pageRows.length ? `<tbody>${pageRows.map(r => `
    <tr data-dt-row="${id}" data-code="${Fmt.esc(r.__rowKey ? r.__rowKey(r) : (r.code || ''))}">
      ${config.columns.map(c => `<td class="${c.wrap ? 'wrap' : ''}" style="${c.align ? 'text-align:' + c.align : ''}">${c.render(r)}</td>`).join('')}
    </tr>`).join('')}</tbody>` : `<tbody><tr><td colspan="${config.columns.length}"><div class="empty-state">${config.emptyMsg || 'No matching records.'}</div></td></tr></tbody>`;

  const paginationHtml = `
    <div class="pagination">
      <span class="pg-info">Page ${st.page} of ${totalPages}</span>
      <button data-dt-page="${id}" data-to="1" ${st.page === 1 ? 'disabled' : ''}>«</button>
      <button data-dt-page="${id}" data-to="${st.page - 1}" ${st.page === 1 ? 'disabled' : ''}>‹</button>
      <button data-dt-page="${id}" data-to="${st.page + 1}" ${st.page === totalPages ? 'disabled' : ''}>›</button>
      <button data-dt-page="${id}" data-to="${totalPages}" ${st.page === totalPages ? 'disabled' : ''}>»</button>
    </div>`;

  config.container.innerHTML = `
    ${toolbarHtml}
    <div class="table-wrap scroll-thin" style="max-height:${config.maxHeight || '560px'}">
      <table class="dt">${theadHtml}${tbodyHtml}</table>
    </div>
    ${paginationHtml}
  `;

  config.container.querySelector('[data-dt-search]')?.addEventListener('input', debounce(e => {
    st.query = e.target.value; st.page = 1; renderDataTable(config);
  }, 220));
  config.container.querySelectorAll('[data-dt-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (st.sortKey === key) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
      else { st.sortKey = key; st.sortDir = 'desc'; }
      renderDataTable(config);
    });
  });
  config.container.querySelectorAll('[data-dt-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const to = parseInt(btn.getAttribute('data-to'), 10);
      if (to >= 1 && to <= totalPages) { st.page = to; renderDataTable(config); }
    });
  });
  if (config.onRowClick) {
    config.container.querySelectorAll('[data-dt-row]').forEach((tr, i) => {
      tr.addEventListener('click', () => config.onRowClick(pageRows[i]));
    });
  }
}
