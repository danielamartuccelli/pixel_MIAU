/* ===========================================================
   ui2.js — paneles del igloo: récords, DJ, TV, taller (dibujo), galería,
   cartas románticas, buzón y decoración. Todo en HTML (como el clóset).
   Los dibujos y las cartas se guardan para siempre y se sincronizan.
   =========================================================== */
(function () {
  const G = window.G, ui = G.ui;
  const $ = s => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nm = id => (G.state.me.id === id ? G.state.me.name : G.state.partner.name) || G.IDS[id].short;
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  G.state.session.letters = 0;

  function modal(title, wide) {
    if (G.modalOpen) return null; G.modalOpen = true;
    const root = el('div', 'modal'), panel = el('div', 'panel'); root.appendChild(panel); if (wide) panel.style.width = 'min(1000px,97vw)';
    const m = { root, panel, onClose: null, close() { if (m.onClose) m.onClose(); root.remove(); G.modalOpen = false; G.save(); } };
    const x = el('button', 'btn small xbtn', '✖ Cerrar (Esc)'); x.onclick = () => m.close(); panel.appendChild(x);
    panel.appendChild(el('h2', '', title));
    m.body = el('div', ''); panel.appendChild(m.body); $('#ui').appendChild(root); return m;
  }
  const chips = (list, cur, fn) => { const c = el('div', 'chips'); list.forEach(([v, l]) => { const b = el('button', 'btn' + (v === cur ? ' on' : ''), l); b.onclick = () => fn(v); c.appendChild(b); }); return c; };

  /* ------------------------------------------------------------------ RÉCORDS */
  const GAME_NAMES = { connect4: 'Cuatro en raya', kennedy: 'Parque Kennedy', pucp: 'PUCP (escondidas)', pollos: 'El Pollo Pier', cocina: 'Los Ccellis (ramen)', salsa: 'Academia Saoco (dupla)', carjitsu: 'Card-jitsu', callao: 'Callao', yuyos: 'Los Yuyos', olivar: 'Olivar (mirada fija)' };
  ui.records = function () {
    const m = modal('🏆 Pizarra de récords'); if (!m) return;
    const R = G.state.records;
    let h = `<div class="rec"><table><tr><th>Juego</th><th>${esc(nm('sebas'))}</th><th>${esc(nm('dani'))}</th></tr>`;
    Object.keys(GAME_NAMES).forEach(k => { const g = R.games[k] || { dani: 0, sebas: 0 }; h += `<tr><td>${GAME_NAMES[k]}</td><td>${g.sebas}</td><td>${g.dani}</td></tr>`; });
    h += `<tr><th colspan="3">Mejores puntajes</th></tr>`;
    [['salsa_facil', 'Saoco VS yo · Fácil'], ['salsa_normal', 'Saoco VS yo · Normal'], ['salsa_dificil', 'Saoco VS yo · Difícil'], ['kennedy', 'Kennedy (metros)']].forEach(([k, t]) => { const b = (R.best && R.best[k]) || { dani: 0, sebas: 0 }; h += `<tr><td>${t}</td><td>${b.sebas}</td><td>${b.dani}</td></tr>`; });
    const se = (R.stats && R.stats.salsaErr) || { dani: 0, sebas: 0 };
    h += `<tr><td>💃 Errores en salsa (en total)</td><td>${se.sebas}</td><td>${se.dani}</td></tr>`;
    h += `<tr><td><b>Partidas de 50 soles ganadas</b></td><td>${R.matches.sebas}</td><td>${R.matches.dani}</td></tr>`;
    h += `<tr><td>🖼 Fotos en el álbum</td><td colspan="2">${(G.state.album || []).length}</td></tr><tr><td>🎨 Dibujos en la galería</td><td colspan="2">${(G.state.gallery || []).length}</td></tr><tr><td>💌 Cartas guardadas</td><td colspan="2">${(G.state.letters || []).length}</td></tr></table></div>`;
    m.body.innerHTML = h;
  };

  /* ------------------------------------------------------------------ DJ */
  const DJ_STYLES = [['lofi', '🎧 Lofi (Nujabes)'], ['reggaeton', '🔥 Reggaetón'], ['hiphop', '🎤 Hip-hop tranquilo'], ['rock', '🎸 Rock / pop-punk'], ['urbano', '🌃 Urbano'], ['salsa', '💃 Salsa'], ['salsaRomantica', '🌹 Salsa romántica'], ['timba', '🥁 Timba'], ['electro', '⚡ Electrónica'], ['latinpop', '🌴 Latin pop'], ['habanera', '🪘 Habanera'], ['oriental', '🏮 Oriental (dojo)'], ['rapido', '⚡ Cocina acelerada']];
  ui.dj = function () {
    const m = modal('🎧 Set de DJ del igloo'); if (!m) return;
    function render() {
      m.body.innerHTML = ''; m.body.appendChild(el('div', 'small-note', 'Elige la música de fondo. Suena en el igloo (al salir, cada lugar pone la suya).'));
      m.body.appendChild(chips(DJ_STYLES, G.audio.style, v => { G.audio.start(); G.audio.setStyle(v); G.djStyle = v; G.bus.emit('dj'); render(); }));
    } render();
  };

  /* ------------------------------------------------------------------ TV */
  ui.tv = function () {
    const m = modal('📺 La TV del igloo'); if (!m) return;
    const cv = el('canvas'); cv.width = 320; cv.height = 200; cv.style.cssText = 'width:min(640px,90%);image-rendering:pixelated;border:6px solid #2b1b30;border-radius:10px;display:block;margin:8px auto;background:#000';
    const names = ['Canal Pingüino', 'Telenovela de Lima', 'Retro Pong', 'Noticias de la garúa'];
    let ch = 0, t = 0; const cx = cv.getContext('2d'); cx.imageSmoothingEnabled = false;
    const lbl = el('div', 'px', ''); lbl.style.cssText = 'text-align:center;font-size:12px;margin:4px'; m.body.append(cv, lbl);
    const row = el('div', 'row'); const pv = el('button', 'btn small', '◀ Canal'), nx = el('button', 'btn small', 'Canal ▶'); pv.onclick = () => { ch = (ch + 3) % 4; }; nx.onclick = () => { ch = (ch + 1) % 4; }; row.append(pv, nx); m.body.appendChild(row);
    const lines = ['—¿Me amas?   —Más que al ceviche.', '—Tengo algo que confesarte…   —¿Sobre el pollo a la brasa?', '—¡Tú no eres mi hermano!   —Soy tu pingüino.', '—Te esperé en el Parque Kennedy.   —Había garúa, amor.'];
    function frame() {
      t += 40; cx.fillStyle = '#10131f'; cx.fillRect(0, 0, 320, 200);
      if (ch === 0) { cx.fillStyle = '#6fd0ff'; cx.fillRect(0, 0, 320, 200); cx.fillStyle = '#fff'; cx.fillRect(0, 150, 320, 50); const x = (t / 12) % 360 - 20, y = 120 + Math.abs(Math.sin(t / 150)) * -8; cx.fillStyle = '#23232e'; cx.fillRect(x, y - 30, 26, 34); cx.fillStyle = '#fff'; cx.fillRect(x + 5, y - 20, 16, 22); cx.fillStyle = '#ff9d2e'; cx.fillRect(x + 22, y - 24, 8, 4); cx.fillStyle = '#23232e'; cx.fillRect(x + 12, y - 27, 3, 3); cx.fillRect(x + 18, y - 27, 3, 3); }
      else if (ch === 1) { cx.fillStyle = '#4a1f4a'; cx.fillRect(0, 0, 320, 200); [[80, '#c9a77a'], [220, '#8a5a3a']].forEach(([x, c]) => { cx.fillStyle = c; cx.fillRect(x - 20, 50, 40, 50); cx.fillStyle = '#2b1b30'; cx.fillRect(x - 10, 66, 5, 5); cx.fillRect(x + 6, 66, 5, 5); cx.fillRect(x - 6, 86, 12, 3); }); const s = 1 + Math.abs(Math.sin(t / 300)) * 0.5; cx.fillStyle = '#ff5d97'; cx.fillRect(150, 50, 6 * s, 6 * s); cx.fillRect(164, 50, 6 * s, 6 * s); cx.fillRect(148, 58, 24 * s / 1.2, 6 * s); cx.fillStyle = '#000a'; cx.fillRect(0, 150, 320, 50); cx.fillStyle = '#fff'; cx.font = '14px monospace'; cx.fillText(lines[Math.floor(t / 4000) % 4], 10, 180); }
      else if (ch === 2) { cx.fillStyle = '#000'; cx.fillRect(0, 0, 320, 200); const bx = 160 + Math.sin(t / 400) * 140, by = 100 + Math.sin(t / 230) * 85; cx.fillStyle = '#fff'; cx.fillRect(bx - 4, by - 4, 8, 8); cx.fillRect(8, by - 20, 6, 40); cx.fillRect(306, 200 - by - 20, 6, 40); for (let y = 0; y < 200; y += 14) cx.fillRect(158, y, 4, 8); }
      else { cx.fillStyle = '#e63946'; cx.fillRect(0, 0, 320, 30); cx.fillStyle = '#fff'; cx.font = 'bold 16px monospace'; cx.fillText('NOTICIAS DE LA GARÚA', 12, 21); cx.fillStyle = '#9fb0c4'; cx.fillRect(0, 30, 320, 120); cx.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { const x = (i * 53 + t / 8) % 340, y = (i * 31 + t / 5) % 120 + 30; cx.fillRect(x, y, 2, 8); } cx.fillStyle = '#2b1b30'; cx.fillRect(0, 160, 320, 40); cx.fillStyle = '#ffd24a'; cx.font = '14px monospace'; const tx = 'HOY: garúa con 100% de probabilidad · el tráfico en la Vía Expresa sigue igual · Daniela y Sebas sonríen   '; cx.fillText(tx + tx, -((t / 14) % (tx.length * 8.4)), 186); }
      lbl.textContent = '📺 ' + names[ch];
    }
    const iv = setInterval(frame, 40); frame(); m.onClose = () => clearInterval(iv);
  };

  /* ------------------------------------------------------------------ TALLER: DIBUJO */
  G.addDrawing = function (item, fromRemote) {
    const s = G.state; s.gallery = s.gallery || [];
    if (s.gallery.some(d => d.id === item.id)) return false;
    s.gallery.push(item); G.save(); G.bus.emit('gallery');
    if (!fromRemote && G.net && G.net.connected) G.net.send('draw', { item });
    return true;
  };
  const PAL = ['#1b1b1f', '#d9262c', '#f4a259', '#ffd24a', '#7fae5a', '#2fb8a6', '#4aa6ff', '#2f4fd0', '#8a5cf6', '#ff7aa8', '#8a5a3a', '#ffffff'];
  ui.drawing = function () {
    const m = modal('🎨 Taller artístico · pizarra', true); if (!m) return;
    const W0 = 480, H0 = 360;
    const cv = el('canvas'); cv.width = W0; cv.height = H0; cv.style.cssText = 'width:min(560px,100%);aspect-ratio:4/3;background:#fff;border:5px solid #6b4a3a;border-radius:4px;touch-action:none;cursor:crosshair;display:block;margin:0 auto';
    const cx = cv.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W0, H0); cx.lineCap = 'round'; cx.lineJoin = 'round';
    let tool = 'plumon', col = '#d9262c', size = 8, down = false, lx = 0, ly = 0;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W0 / r.width, (e.clientY - r.top) * H0 / r.height]; };
    function seg(x0, y0, x1, y1) {
      if (tool === 'borrador') { cx.strokeStyle = '#fff'; cx.lineWidth = size * 2.2; cx.globalAlpha = 1; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); }
      else if (tool === 'plumon') { cx.strokeStyle = col; cx.lineWidth = size; cx.globalAlpha = 0.92; cx.beginPath(); cx.moveTo(x0, y0); cx.lineTo(x1, y1); cx.stroke(); cx.globalAlpha = 1; }
      else {                      // crayola: puntitos de cera con grano
        cx.fillStyle = col; const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 2));
        for (let i = 0; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; for (let k = 0; k < 7; k++) { const a = Math.random() * 6.283, r = Math.random() * size * 1.1; cx.globalAlpha = 0.55 + Math.random() * 0.4; cx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 2); } }
        cx.globalAlpha = 1;
      }
    }
    cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); [lx, ly] = pos(e); seg(lx, ly, lx + 0.1, ly + 0.1); });
    cv.addEventListener('pointermove', e => { if (!down) return; const [x, y] = pos(e); seg(lx, ly, x, y); lx = x; ly = y; });
    ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { down = false; }));
    const tools = el('div', 'row'); m.body.appendChild(cv); m.body.appendChild(tools);
    function drawTools() {
      tools.innerHTML = '';
      tools.appendChild(chips([['plumon', '🖊 Plumón'], ['crayola', '🖍 Crayola'], ['borrador', '🩹 Borrador']], tool, v => { tool = v; drawTools(); }));
      const sw = el('div', 'sw'); PAL.forEach(c => { const b = el('button', c === col ? 'on' : ''); b.style.background = c; b.onclick = () => { col = c; if (tool === 'borrador') tool = 'plumon'; drawTools(); }; sw.appendChild(b); });
      const ci = el('input'); ci.type = 'color'; ci.value = col; ci.oninput = () => { col = ci.value; }; sw.appendChild(ci); tools.appendChild(sw);
      const rg = el('input'); rg.type = 'range'; rg.min = 2; rg.max = 30; rg.value = size; rg.oninput = () => { size = +rg.value; }; tools.append(el('span', '', 'Grosor'), rg);
    } drawTools();
    const act = el('div', 'row'); const title = el('input'); title.type = 'text'; title.maxLength = 24; title.placeholder = 'Título del dibujo'; title.style.cssText = 'width:230px;font-size:22px';
    const clr = el('button', 'btn small alt', '🗑 Limpiar'); clr.onclick = () => { cx.fillStyle = '#fff'; cx.fillRect(0, 0, W0, H0); };
    const sv = el('button', 'btn small go', '💾 Guardar en la galería'); sv.onclick = () => {
      const o = document.createElement('canvas'); o.width = 240; o.height = 180; const oc = o.getContext('2d'); oc.imageSmoothingEnabled = true; oc.drawImage(cv, 0, 0, 240, 180);
      const item = { id: uid(), img: o.toDataURL('image/jpeg', 0.82), by: G.state.me.id, title: title.value.trim() || 'Sin título', ts: Date.now() };
      G.addDrawing(item); G.audio.sfx('win'); ui.toast('Dibujo guardado en la galería 🎨'); title.value = '';
    };
    const gl = el('button', 'btn small gold', '🖼 Ver galería'); gl.onclick = () => { m.close(); setTimeout(ui.gallery, 30); };
    act.append(title, clr, sv, gl); m.body.appendChild(act);
  };

  /* ------------------------------------------------------------------ GALERÍA + EXPONER */
  G.syncExhibit = function () { if (G.net && G.net.connected) G.net.send('exhibit', { exhibit: G.state.exhibit, ts: G.state.decTs || 0 }); };
  ui.gallery = function () {
    const m = modal('🖼 Galería de dibujos', true); if (!m) return;
    function render() {
      m.body.innerHTML = ''; const gal = (G.state.gallery || []).slice().reverse(), ex = G.state.exhibit || {};
      m.body.appendChild(el('div', 'small-note', 'Los dibujos se guardan para siempre. Elige en qué marco del igloo (1 al 7, en la pared de arriba) exponerlos.'));
      if (!gal.length) m.body.appendChild(el('div', 'small-note', 'Aún no hay dibujos. Ve al taller artístico y haz el primero 🎨'));
      const grid = el('div', ''); grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-height:60vh;overflow:auto'; m.body.appendChild(grid);
      gal.forEach(it => {
        const c = el('div', 'panel'); c.style.cssText = 'width:200px;padding:6px;text-align:center'; const im = el('img'); im.src = it.img; im.style.cssText = 'width:100%;image-rendering:auto;border:3px solid #2b1b30'; c.appendChild(im);
        c.appendChild(el('div', '', '<b>' + esc(it.title) + '</b><br><small>por ' + esc(nm(it.by)) + '</small>'));
        const slot = Object.keys(ex).find(k => ex[k] === it.id);
        const sel = el('select'); sel.style.cssText = 'font:inherit;font-size:19px'; sel.innerHTML = '<option value="">— no expuesto —</option>' + [0, 1, 2, 3, 4, 5, 6].map(i => `<option value="${i}"${String(slot) === String(i) ? ' selected' : ''}>Marco ${i + 1}</option>`).join('');
        sel.onchange = () => { Object.keys(ex).forEach(k => { if (ex[k] === it.id) delete ex[k]; }); if (sel.value !== '') ex[sel.value] = it.id; G.state.exhibit = ex; G.state.decTs = Date.now(); G.save(); G.bus.emit('gallery'); G.syncExhibit(); render(); };
        c.appendChild(sel);
        const del = el('button', 'btn small alt', '🗑'); del.onclick = () => { if (!confirm('¿Borrar este dibujo para los dos?')) return; G.state.gallery = G.state.gallery.filter(d => d.id !== it.id); Object.keys(ex).forEach(k => { if (ex[k] === it.id) delete ex[k]; }); G.save(); G.bus.emit('gallery'); if (G.net.connected) G.net.send('drawdel', { id: it.id }); render(); };
        c.appendChild(del); grid.appendChild(c);
      });
    } render();
  };

  /* ------------------------------------------------------------------ CARTAS ROMÁNTICAS */
  const STAMPS = ['heart', 'star', 'penguin', 'laugh', 'wave', 'dance'];
  const EMOJIS = ['❤️', '😘', '🥰', '💜', '🌸', '✨', '🐧', '🌙', '🍜', '🎶', '🐱', '🌊', '🍗', '💌', '🫶', '😍'];
  const PAPERS = [['#fff3d6', 'Crema'], ['#ffd9e8', 'Rosa'], ['#d9ecff', 'Celeste'], ['#e6dcff', 'Lila'], ['#dff5df', 'Menta']];
  G.addLetter = function (item, dir) {
    const s = G.state; s.letters = s.letters || []; if (s.letters.some(l => l.id === item.id)) return false;
    s.letters.push(Object.assign({ dir, unread: dir === 'in' }, item)); if (s.letters.length > 60) s.letters.shift(); G.save(); G.bus.emit('letters'); return true;
  };
  ui.letter = function () {
    if ((G.state.session.letters || 0) >= 3) { ui.toast('Ya enviaste tus 3 cartas de esta sesión 💌'); return; }
    if (!G.net.connected && !G.solo) { ui.toast('Tu pareja no está conectada todavía'); return; }
    const m = modal('💌 Escribir una carta (' + (3 - (G.state.session.letters || 0)) + ' restantes en esta sesión)', true); if (!m) return;
    let paper = '#fff3d6', stamp = 'heart', withDraw = false;
    const letter = el('div', 'panel'); letter.style.cssText = 'max-width:640px;margin:0 auto;background:' + paper;
    const para = el('div', '', '<b>Para: ' + esc(G.state.partner.name || 'mi amor') + '</b>');
    const ta = el('textarea'); ta.maxLength = 320; ta.rows = 6; ta.placeholder = 'Escribe aquí tu carta…'; ta.style.cssText = 'width:100%;font:inherit;font-size:24px;border:3px solid #2b1b30;background:transparent;resize:vertical;padding:6px';
    const stRow = el('div', 'row'), emRow = el('div', 'row'), ppRow = el('div', 'row');
    const stampCv = () => { const w = el('div', 'row'); STAMPS.forEach(s => { const b = el('button', 'btn small' + (s === stamp ? ' on' : '')); b.style.padding = '2px 4px'; const c = G.emoteCanvas(s, 4); c.style.cssText = 'width:36px;height:36px;image-rendering:pixelated'; b.appendChild(c); b.onclick = () => { stamp = s; render(); }; w.appendChild(b); }); return w; };
    EMOJIS.forEach(e => { const b = el('button', 'btn small', e); b.style.cssText = 'padding:0 6px;font-size:22px'; b.onclick = () => { const p = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, p) + e + ta.value.slice(p); ta.focus(); }; emRow.appendChild(b); });
    PAPERS.forEach(([c, n]) => { const b = el('button', 'btn small', n); b.style.background = c; b.onclick = () => { paper = c; letter.style.background = c; }; ppRow.appendChild(b); });
    const dc = el('canvas'); dc.width = 320; dc.height = 140; dc.style.cssText = 'width:100%;max-width:320px;background:#fff;border:3px solid #2b1b30;touch-action:none;display:none;margin:6px auto'; const dx = dc.getContext('2d'); dx.fillStyle = '#fff'; dx.fillRect(0, 0, 320, 140); dx.lineCap = 'round'; dx.lineWidth = 4;
    let dcol = '#d9262c', dn = false, lx = 0, ly = 0; const dp = e => { const r = dc.getBoundingClientRect(); return [(e.clientX - r.left) * 320 / r.width, (e.clientY - r.top) * 140 / r.height]; };
    dc.onpointerdown = e => { dn = true; dc.setPointerCapture(e.pointerId); [lx, ly] = dp(e); }; dc.onpointermove = e => { if (!dn) return; const [x, y] = dp(e); dx.strokeStyle = dcol; dx.beginPath(); dx.moveTo(lx, ly); dx.lineTo(x, y); dx.stroke(); lx = x; ly = y; }; dc.onpointerup = () => { dn = false; };
    const dsw = el('div', 'sw'); dsw.style.display = 'none'; ['#d9262c', '#ff7aa8', '#8a5cf6', '#2f4fd0', '#3aa05a', '#ffd24a', '#1b1b1f'].forEach(c => { const b = el('button'); b.style.background = c; b.onclick = () => { dcol = c; }; dsw.appendChild(b); });
    const tg = el('button', 'btn small', '✏️ Añadir un dibujito'); tg.onclick = () => { withDraw = !withDraw; dc.style.display = withDraw ? 'block' : 'none'; dsw.style.display = withDraw ? 'flex' : 'none'; tg.textContent = withDraw ? '✏️ Quitar el dibujito' : '✏️ Añadir un dibujito'; };
    const send = el('button', 'btn go', '💌 Enviar carta');
    send.onclick = () => {
      const text = ta.value.trim(); if (!text && !withDraw) { ui.toast('Escribe algo primero 💜'); return; }
      const item = { id: uid(), from: G.state.me.id, name: G.state.me.name, to: G.state.partner.id, text, stamp, paper, draw: withDraw ? dc.toDataURL('image/png') : null, ts: Date.now() };
      G.addLetter(item, 'out'); G.net.send('letter', { item }); G.state.session.letters = (G.state.session.letters || 0) + 1; G.audio.sfx('heart'); ui.toast('¡Carta enviada! 💌'); m.close();
    };
    function render() { stRow.innerHTML = ''; stRow.appendChild(el('span', '', 'Sello:')); stRow.appendChild(stampCv()); } render();
    letter.append(para, ta, el('div', 'small-note', 'Emoticones:'), emRow, stRow, el('div', 'small-note', 'Papel:'), ppRow, tg, dsw, dc);
    m.body.append(letter, send);
  };

  /* ------------------------------------------------------------------ BUZÓN */
  ui.unread = () => (G.state.letters || []).filter(l => l.dir === 'in' && l.unread).length;
  ui.mailbox = function () {
    const m = modal('📬 Buzón de cartas', true); if (!m) return;
    function render() {
      m.body.innerHTML = ''; const list = (G.state.letters || []).slice().reverse();
      if (!list.length) m.body.appendChild(el('div', 'small-note', 'Todavía no hay cartas. En el igloo hay un escritorio para escribirlas (hasta 3 por sesión).'));
      const grid = el('div', ''); grid.style.cssText = 'display:flex;flex-direction:column;gap:10px;max-height:64vh;overflow:auto'; m.body.appendChild(grid);
      list.forEach(l => {
        const c = el('div', 'panel'); c.style.background = l.paper || '#fff3d6'; const cv = G.emoteCanvas(l.stamp || 'heart', 4); cv.style.cssText = 'width:36px;height:36px;float:right;image-rendering:pixelated';
        c.appendChild(cv); c.appendChild(el('div', '', `<b>${l.dir === 'in' ? 'De ' + esc(l.name || '') + (l.unread ? ' 🆕' : '') : 'Para ' + esc(nm(l.to || '') || '')}</b> <small>${new Date(l.ts).toLocaleString('es-PE')}</small>`));
        c.appendChild(el('div', '', esc(l.text || '').replace(/\n/g, '<br>'))); if (l.draw) { const im = el('img'); im.src = l.draw; im.style.cssText = 'width:100%;max-width:320px;border:3px solid #2b1b30;display:block;margin-top:6px'; c.appendChild(im); }
        grid.appendChild(c); if (l.dir === 'in' && l.unread) l.unread = false;
      });
      G.save(); G.bus.emit('letters');
    } render();
  };

  /* ------------------------------------------------------------------ DECORAR EL IGLOO */
  G.DECOR_SLOTS = [{ x: 158, y: 134, def: 'planta', name: 'Rincón de la ventana' }, { x: 238, y: 138, def: 'globo', name: 'Junto al escritorio' }, { x: 362, y: 202, def: 'arcade', name: 'Esquina derecha' }, { x: 92, y: 206, def: 'puff', name: 'Esquina izquierda' }];
  const D = (g, f) => f(g);
  G.DECOR = {
    planta: g => { g.fillStyle(0x8a5a3a).fillRect(-6, -9, 12, 9); g.fillStyle(0x2f9a56); [[-7, -16], [0, -21], [7, -16], [-3, -12], [4, -12]].forEach(([x, y]) => g.fillEllipse(x, y, 9, 13)); g.fillStyle(0x58c27a).fillEllipse(0, -19, 5, 8); },
    lava: g => { g.fillStyle(0x2b1b30).fillRect(-5, -4, 10, 4).fillRect(-3, -26, 6, 3); g.fillStyle(0xff5d97, 0.9).fillTriangle(-6, -4, 6, -4, 3, -26).fillTriangle(-6, -4, 6, -4, -3, -26); g.fillStyle(0xffd24a).fillCircle(0, -14, 3).fillCircle(-1, -8, 2); },
    globo: g => { g.fillStyle(0x5a3a2a).fillRect(-1, -8, 2, 8).fillRect(-6, -2, 12, 2); g.fillStyle(0x2f6bd6).fillCircle(0, -17, 9); g.fillStyle(0x3aa05a).fillEllipse(-3, -19, 5, 4).fillEllipse(3, -14, 4, 5); g.lineStyle(1, 0xffd24a).strokeCircle(0, -17, 10); },
    arcade: g => { g.fillStyle(0x2f3a9a).fillRect(-9, -34, 18, 34); g.fillStyle(0x10131f).fillRect(-6, -30, 12, 11); g.fillStyle(0xe63946).fillRect(-4, -28, 3, 3); g.fillStyle(0xffd24a).fillRect(1, -25, 3, 3); g.fillStyle(0x23232e).fillRect(-7, -16, 14, 5); g.fillStyle(0xe63946).fillCircle(-3, -14, 1.5); g.fillStyle(0xffd24a).fillCircle(3, -14, 1.5); g.fillStyle(0xff5d97).fillRect(-9, -36, 18, 3); },
    puff: g => { g.fillStyle(0xff7aa8).fillEllipse(0, -6, 26, 14); g.fillStyle(0xffb0c8).fillEllipse(-3, -9, 14, 5); },
    telescopio: g => { g.lineStyle(2, 0x5a3a2a).lineBetween(0, -14, -7, 0).lineBetween(0, -14, 7, 0).lineBetween(0, -14, 0, 0); g.fillStyle(0xd9b48a).fillRect(-12, -26, 22, 6); g.fillStyle(0x2b1b30).fillRect(-14, -27, 3, 8); g.fillStyle(0xffd24a).fillRect(-2, -26, 3, 6); },
    guitarra: g => { g.fillStyle(0xd9792b).fillEllipse(0, -8, 14, 14).fillEllipse(0, -18, 10, 10); g.fillStyle(0x2b1b30).fillCircle(0, -10, 3); g.fillStyle(0x6b4a3a).fillRect(-1, -38, 3, 20); g.fillStyle(0x2b1b30).fillRect(-2, -40, 5, 4); },
    libros: g => { [['#c9262e', 20, 6], ['#2c5f8a', 24, 6], ['#ffd24a', 18, 6], ['#5fd1b0', 22, 6], ['#8a5cf6', 20, 6]].forEach(([c, w, h], i) => { g.fillStyle(A_hex(c)).fillRect(-w / 2 + (i % 2) * 2, -(i + 1) * h, w, h - 1); }); g.fillStyle(0xffffff).fillRect(-6, -34, 8, 2); },
    pecera: g => { g.fillStyle(0x7a5a3a).fillRect(-12, -6, 24, 6); g.fillStyle(0x9fd8ff, 0.8).fillRect(-11, -22, 22, 16); g.lineStyle(2, 0xdff6ff).strokeRect(-11, -22, 22, 16); g.fillStyle(0xff9d2e).fillEllipse(-3, -14, 6, 4).fillTriangle(0, -14, 4, -17, 4, -11); g.fillStyle(0x3aa05a).fillRect(7, -12, 2, 6); },
    cubo: g => { g.fillStyle(0x2b1b30).fillRect(-7, -16, 14, 14); const c = [0xe63946, 0xffffff, 0x2f6bd6, 0xffd24a, 0x3aa05a, 0xff9d2e, 0xe63946, 0xffffff, 0x2f6bd6]; c.forEach((k, i) => g.fillStyle(k).fillRect(-6 + (i % 3) * 4, -15 + Math.floor(i / 3) * 4, 3, 3)); g.fillStyle(0x7a5a3a).fillRect(-8, -2, 16, 2); },
    ajedrez: g => { g.fillStyle(0x7a5a3a).fillRect(-2, -12, 4, 12).fillRect(-8, -2, 16, 2); g.fillStyle(0x7a5a3a).fillRect(-10, -16, 20, 4); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillStyle((i + j) % 2 ? 0x15151c : 0xfffaf0).fillRect(-8 + i * 4, -16 + j * 2, 4, 2); g.fillStyle(0xffd24a).fillRect(-3, -22, 2, 6); g.fillStyle(0x15151c).fillRect(3, -20, 2, 4); },
    consola: g => { g.fillStyle(0x5a3a2a).fillRect(-10, -8, 20, 8); g.fillStyle(0xdedede).fillRect(-8, -13, 16, 5); g.fillStyle(0xe63946).fillRect(-6, -11, 3, 2); g.fillStyle(0x23232e).fillRect(2, -11, 5, 2); g.fillStyle(0x4aa6ff).fillRect(-12, -17, 4, 8).fillStyle(0xff5d97).fillRect(8, -17, 4, 8); },
    estanteria: g => { g.fillStyle(0x6b4a3a).fillRect(-12, -34, 24, 34); g.fillStyle(0x4a3228).fillRect(-10, -32, 20, 30); [[-30, ['#c9262e', '#ffd24a', '#2c5f8a']], [-18, ['#8a5cf6', '#5fd1b0', '#ff7aa8']], [-6, ['#d9792b', '#2c5f8a', '#fffaf0']]].forEach(([y, cs]) => cs.forEach((c, i) => g.fillStyle(A_hex(c)).fillRect(-9 + i * 6, y, 5, 10))); }
  };
  const A_hex = c => parseInt(c.slice(1), 16);
  G.DECOR_NAMES = [['none', 'Nada'], ['planta', '🪴 Planta'], ['lava', '🔮 Lámpara de lava'], ['globo', '🌍 Globo terráqueo'], ['arcade', '🕹 Arcade retro'], ['puff', '🛋 Puff'], ['telescopio', '🔭 Telescopio'], ['guitarra', '🎸 Guitarra'], ['libros', '📚 Pila de libros'], ['pecera', '🐠 Pecera'], ['cubo', '🧊 Cubo Rubik'], ['ajedrez', '♟ Ajedrez'], ['consola', '🎮 Consola con 2 mandos'], ['estanteria', '📖 Biblioteca (sociología y arte)']];
  ui.decorate = function () {
    const m = modal('🛋 Decorar el igloo (lo ven los dos)', true); if (!m) return;
    function render() {
      m.body.innerHTML = ''; const sel = G.state.house.both = G.state.house.both || {};
      G.DECOR_SLOTS.forEach((sl, i) => {
        const cur = sel[i] !== undefined ? sel[i] : sl.def; const g = el('div', 'grp'); g.appendChild(el('label', '', 'Lugar ' + (i + 1) + ': ' + sl.name));
        g.appendChild(chips(G.DECOR_NAMES, cur, v => { sel[i] = v; G.state.decTs = Date.now(); G.save(); G.bus.emit('house'); if (G.net.connected) G.net.send('house', { house: G.state.house.both, ts: G.state.decTs }); render(); })); m.body.appendChild(g);
      });
    } render();
  };

  /* ------------------------------------------------------------------ red y HUD */
  G.net.on('draw', d => { if (d && d.item) G.addDrawing(d.item, true); });
  G.net.on('drawdel', d => { G.state.gallery = (G.state.gallery || []).filter(x => x.id !== d.id); Object.keys(G.state.exhibit || {}).forEach(k => { if (G.state.exhibit[k] === d.id) delete G.state.exhibit[k]; }); G.save(); G.bus.emit('gallery'); });
  G.net.on('exhibit', d => { if ((d.ts || 0) >= (G.state.decTs || 0)) { G.state.exhibit = d.exhibit || {}; G.state.decTs = d.ts || 0; G.save(); G.bus.emit('gallery'); } });
  G.net.on('house', d => { if ((d.ts || 0) >= (G.state.decTs || 0)) { G.state.house.both = d.house || {}; G.state.decTs = d.ts || 0; G.save(); G.bus.emit('house'); } });
  G.net.on('letter', d => { if (d && d.item && G.addLetter(d.item, 'in')) { G.audio.sfx('heart'); ui.toast('💌 ¡Te llegó una carta de ' + (d.item.name || 'tu pareja') + '!'); } });
  G.net.on('galids', d => { const have = d.ids || []; (G.state.gallery || []).filter(x => !have.includes(x.id)).forEach((it, i) => setTimeout(() => G.net.send('draw', { item: it }), 150 * i)); const hl = d.lids || []; (G.state.letters || []).filter(l => l.dir === 'out' && !hl.includes(l.id)).forEach((l, i) => setTimeout(() => G.net.send('letter', { item: { id: l.id, from: l.from, name: l.name, to: l.to, text: l.text, stamp: l.stamp, paper: l.paper, draw: l.draw, ts: l.ts } }), 200 * i + 50)); });
  G.bus.on('net', e => { if (e.connected) setTimeout(() => G.net.send('galids', { ids: (G.state.gallery || []).map(x => x.id), lids: (G.state.letters || []).filter(l => l.dir === 'in').map(l => l.id) }), 1500); });
  G.bus.on('letters', () => { const b = $('#mailbadge'); if (b) { const n = ui.unread(); b.textContent = n ? '💌 ' + n : '💌'; b.classList.toggle('gold', n > 0); } });
})();
