/* ============================================================
   Interactive India map (Leaflet) with Street / Satellite /
   Terrain base layers, state-wise markers mirroring the
   Geography page's figures. Tile layers are public map
   services and require an internet connection to load the
   underlying map imagery (the dashboard's own data/app code
   remain fully local).
   ============================================================ */
const STATE_CENTROIDS = {
  'Andhra Pradesh': [15.9129, 79.7400], 'Arunachal Pradesh': [28.2180, 94.7278],
  'Assam': [26.2006, 92.9376], 'Bihar': [25.0961, 85.3131],
  'Chhattisgarh': [21.2787, 81.8661], 'Goa': [15.2993, 74.1240],
  'Gujarat': [22.2587, 71.1924], 'Haryana': [29.0588, 76.0856],
  'Himachal Pradesh': [31.1048, 77.1734], 'Jharkhand': [23.6102, 85.2799],
  'Karnataka': [15.3173, 75.7139], 'Kerala': [10.8505, 76.2711],
  'Madhya Pradesh': [22.9734, 78.6569], 'Maharashtra': [19.7515, 75.7139],
  'Manipur': [24.6637, 93.9063], 'Meghalaya': [25.4670, 91.3662],
  'Mizoram': [23.1645, 92.9376], 'Nagaland': [26.1584, 94.5624],
  'Odisha': [20.9517, 85.0985], 'Punjab': [31.1471, 75.3412],
  'Rajasthan': [27.0238, 74.2179], 'Sikkim': [27.5330, 88.5122],
  'Tamil Nadu': [11.1271, 78.6569], 'Telangana': [18.1124, 79.0193],
  'Tripura': [23.9408, 91.9882], 'Uttar Pradesh': [26.8467, 80.9462],
  'Uttarakhand': [30.0668, 79.0193], 'West Bengal': [22.9868, 87.8550],
  'Andaman and Nicobar Islands': [11.7401, 92.6586], 'Chandigarh': [30.7333, 76.7794],
  'Dadra and Nagar Haveli and Daman and Diu': [20.1809, 73.0169],
  'Delhi': [28.7041, 77.1025], 'Jammu and Kashmir': [33.7782, 76.5762],
  'Ladakh': [34.1526, 77.5770], 'Lakshadweep': [10.5667, 72.6417],
  'Puducherry': [11.9416, 79.8083],
};

let __indiaMapInstances = {};

function destroyIndiaMap(containerId) {
  if (__indiaMapInstances[containerId]) {
    __indiaMapInstances[containerId].remove();
    delete __indiaMapInstances[containerId];
  }
}

function mapMarkerColor(k) {
  if (!k.total) return '#94a3b8';
  const riskPct = (k.critical + k.delayed) / k.total;
  if (riskPct >= 0.5) return '#dc2626';
  if (riskPct >= 0.25) return '#d97706';
  return '#16a34a';
}

function renderIndiaMap(containerId, projectsList) {
  const el = document.getElementById(containerId);
  if (!el || typeof L === 'undefined') return;
  destroyIndiaMap(containerId);

  const map = L.map(containerId, { scrollWheelZoom: false, minZoom: 3, maxZoom: 10 }).setView([22.6, 80.5], 4.6);
  __indiaMapInstances[containerId] = map;

  // NOTE: raw tile.openstreetmap.org / OpenTopoMap tile servers actively
  // block requests from third-party apps/products unless you run your own
  // tile cache (their "tile usage policy" — they return a 403 "Access
  // blocked" image AS the map tile itself when this happens), and CARTO's
  // free anonymous basemap CDN now requires a registered API key as well.
  // Esri's public ArcGIS Online basemap tile services are used for all three
  // layers instead — they're meant for exactly this kind of direct
  // embedding and need no account or key for this traffic level.
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
  });
  const terrain = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles © Esri — Source: Esri, DeLorme, HERE, Garmin, USGS, NGA, EPA, NPS'
  });
  const streets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Tiles © Esri — Source: Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, GIS User Community'
  });	
  satellite.addTo(map); // default base layer
  const baseLayers = { 'Satellite (Esri)': satellite, 'Terrain (Esri)': terrain, 'Street (Esri)': streets};
  L.control.layers(baseLayers, null, { position: 'topright', collapsed: false }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

  const india = projectsList.filter(p => p.geo_region === 'India' && STATE_CENTROIDS[p.location]);
  const byState = {};
  india.forEach(p => { (byState[p.location] = byState[p.location] || []).push(p); });

  const counts = Object.values(byState).map(l => l.length);
  const maxCount = Math.max(1, ...counts);

  Object.entries(byState).forEach(([state, plist]) => {
    const k = kpis(plist);
    const latlng = STATE_CENTROIDS[state];
    const radius = 7 + Math.sqrt(k.total / maxCount) * 26;
    const color = mapMarkerColor(k);
    const marker = L.circleMarker(latlng, {
      radius, color: '#ffffff', weight: 1.5, fillColor: color, fillOpacity: 0.78,
    }).addTo(map);
    marker.bindTooltip(`<b>${Fmt.esc(state)}</b>: ${k.total} project(s)`, { direction: 'top', offset: [0, -4] });
    marker.bindPopup(`
      <div style="font-family:inherit;min-width:190px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${Fmt.esc(state)}</div>
        <div style="font-size:12px;line-height:1.6;">
          Total projects: <b>${k.total}</b><br>
          In progress: <b>${k.inProgress}</b> &nbsp;·&nbsp; Completed: <b>${k.completed}</b><br>
          Delayed: <b style="color:#b45309">${k.delayed}</b> &nbsp;·&nbsp; Critical: <b style="color:#b91c1c">${k.critical}</b><br>
          Award value: <b>${Fmt.inr(k.totalAward)}</b>
        </div>
        <div style="margin-top:7px;"><a href="#" onclick="openStateDrawer('${state.replace(/'/g, "\\'")}'); return false;" style="color:#2563eb;font-weight:600;font-size:12px;">View full detail →</a></div>
      </div>
    `);
  });

  // unclassified / non-plottable note
  setTimeout(() => map.invalidateSize(), 150);
  return map;
}
