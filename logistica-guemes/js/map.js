// Mapa de OpenStreetMap con Leaflet. Cada vista crea su controlador y lo destruye al salir.
import { BLOCK_M, TILES } from './config.js';
import { el } from './dom.js';
import { ringBounds } from './geomath.js';

const safeColor = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#4f46e5';
const BRAND = '#4f46e5';
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const inkOn = hex => { const L = lum(hex); return 1.05 / (L + 0.05) >= (L + 0.05) / 0.058 ? '#ffffff' : '#0f172a'; };   // el que más contraste da: blanco o tinta

export function createMap(container, { onClick, onDrag } = {}) {
  const map = L.map(container, { zoomControl: false }).setView([-38.0148, -57.54085], 15);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer(TILES, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">Colaboradores de OpenStreetMap</a>' }).addTo(map);
  const zoneLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const pinLayer = L.layerGroup().addTo(map);
  const liveLayer = L.layerGroup().addTo(map);
  const meLayer = L.layerGroup().addTo(map);
  const markers = new Map(), liveMarkers = new Map();
  let zoneCenter = null, zoneRadius = 0;

  map.on('click', ev => onClick && onClick(ev.latlng));
  map.on('dragstart', () => onDrag && onDrag());

  return {
    map, markers,

    drawZone({ center, radiusBlocks }) {
      zoneLayer.clearLayers();
      zoneCenter = center; zoneRadius = radiusBlocks * BLOCK_M;
      const c = [center.lat, center.lng], bounds = ringBounds(radiusBlocks);
      L.circle(c, { radius: zoneRadius, color: BRAND, weight: 2.5, fillColor: BRAND, fillOpacity: 0.05, interactive: false }).addTo(zoneLayer);
      bounds.slice(0, 2).forEach(b => L.circle(c, { radius: b * BLOCK_M, color: BRAND, weight: 1.5, dashArray: '2 7', fill: false, opacity: 0.7, interactive: false }).addTo(zoneLayer));
      L.marker(c, {
        icon: L.divIcon({ className: 'pin-wrap', html: '<div class="depot">Local</div>', iconSize: [58, 26], iconAnchor: [29, 34] }),
        keyboard: false, interactive: false, zIndexOffset: 500
      }).addTo(zoneLayer);
    },

    // routes: [{ id, color, geometry, stale, straight, selected }]
    drawRoutes(routes) {
      routeLayer.clearLayers();
      for (const r of routes) {
        if (!r.geometry?.length) continue;
        const dashed = r.stale || r.straight;
        L.polyline(r.geometry, { color: '#ffffff', weight: 9, opacity: 0.9, lineJoin: 'round', interactive: false }).addTo(routeLayer);
        L.polyline(r.geometry, { color: safeColor(r.color), weight: 5, opacity: r.stale ? 0.55 : 1, dashArray: dashed ? '9 9' : null, lineJoin: 'round', interactive: false }).addTo(routeLayer);
      }
    },

    // pins: [{ id, lat, lng, kind, label, color, title, sub, draggable, selected }]
    drawPins(pins, { onSelect, onMove } = {}) {
      pinLayer.clearLayers();
      markers.clear();
      for (const p of pins) {
        const cls = ['pin', p.kind, p.selected ? 'sel' : ''].filter(Boolean).join(' ');
        const label = String(p.label ?? '').replace(/[^0-9A-Za-z✓✕•!]/g, '');
        const m = L.marker([p.lat, p.lng], {
          icon: L.divIcon({
            className: 'pin-wrap', iconSize: [30, 30], iconAnchor: [15, 15],
            html: `<div class="${cls}" style="--c:${safeColor(p.color)};--t:${inkOn(safeColor(p.color))}"><span>${label}</span></div>`
          }),
          draggable: !!p.draggable, title: p.title, alt: p.title, riseOnHover: true, zIndexOffset: p.selected ? 900 : 100
        }).addTo(pinLayer);
        m.bindTooltip(el('div', {}, el('b', { text: p.title }), el('br'), el('small', { text: p.sub || '' })), { direction: 'top', offset: [0, -14] });
        m.on('click', () => onSelect && onSelect(p.id));
        if (p.draggable) m.on('dragend', ev => onMove && onMove(p.id, ev.target.getLatLng()));
        markers.set(p.id, m);
      }
    },

    // items: [{ id, color, name, segments: [[[lat, lng], ...], ...], last: { lat, lng }, state: 'live' | 'off', title, sub }]
    // La estela va punteada (lo que ya recorrió) para no confundirla con la ruta planeada (línea llena).
    drawLive(items, { onSelect } = {}) {
      liveLayer.clearLayers();
      liveMarkers.clear();
      for (const it of items) {
        const color = safeColor(it.color), faded = it.state === 'off';
        for (const seg of it.segments || []) {
          if (seg.length < 2) continue;
          L.polyline(seg, { color: '#ffffff', weight: 8, opacity: faded ? 0.5 : 0.85, lineJoin: 'round', interactive: false }).addTo(liveLayer);
          L.polyline(seg, { color, weight: 5, opacity: faded ? 0.6 : 1, dashArray: '1 8', lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(liveLayer);
        }
        if (!it.last) continue;
        const initial = (String(it.name || '?').trim()[0] || '?').toUpperCase().replace(/[^0-9A-ZÁÉÍÓÚÑ]/g, '•');
        const m = L.marker([it.last.lat, it.last.lng], {
          icon: L.divIcon({
            className: 'pin-wrap', iconSize: [36, 36], iconAnchor: [18, 18],
            html: `<div class="cmark ${it.state === 'off' ? 'off' : 'live'}" style="--c:${color};--t:${inkOn(color)}"><span>${initial}</span></div>`
          }),
          title: it.title, alt: it.title, zIndexOffset: 1500
        }).addTo(liveLayer);
        m.bindTooltip(el('div', {}, el('b', { text: it.title }), el('br'), el('small', { text: it.sub || '' })), { direction: 'top', offset: [0, -18] });
        m.on('click', () => onSelect && onSelect(it.id));
        liveMarkers.set(it.id, m);
      }
    },
    panToLive(id) { const m = liveMarkers.get(id); if (m) map.panTo(m.getLatLng(), { animate: true, duration: 0.6 }); return !!m; },
    focusLive(id, zoom = 16) { const m = liveMarkers.get(id); if (m) map.flyTo(m.getLatLng(), Math.max(map.getZoom(), zoom), { duration: 0.6 }); return !!m; },

    setMe(pos) {
      meLayer.clearLayers();
      if (!pos) return;
      if (pos.acc && pos.acc < 400) L.circle([pos.lat, pos.lng], { radius: pos.acc, color: '#2563eb', weight: 1, fillOpacity: 0.1, interactive: false }).addTo(meLayer);
      L.marker([pos.lat, pos.lng], { icon: L.divIcon({ className: 'pin-wrap', html: '<div class="me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 2000 }).addTo(meLayer);
    },

    fitZone(animate = true) {
      if (!zoneCenter) return;
      map.fitBounds(L.latLng(zoneCenter.lat, zoneCenter.lng).toBounds(zoneRadius * 2), { padding: [20, 20], animate });
    },
    fitPoints(points, { animate = true, maxZoom = 17 } = {}) {
      if (!points.length) return this.fitZone(animate);
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], animate, maxZoom });
    },
    focus(lat, lng, zoom = 17) { map.flyTo([lat, lng], Math.max(map.getZoom(), zoom), { duration: 0.5 }); },
    openTooltip(id) { markers.get(id)?.openTooltip(); },
    setPicking(on) { container.classList.toggle('is-picking', !!on); },
    invalidate() { map.invalidateSize(); },
    destroy() { map.remove(); }
  };
}
