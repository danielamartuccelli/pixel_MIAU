/* ===========================================================
   scenes/igloo.js — la casa (hub): igloo de Daniela / igloo de Sebas
   Misma sala con dos "pieles". Aquí: clóset, espejo, cama, mesa de
   cuatro en raya y la salida al mapa. Movimiento sincronizado.
   =========================================================== */
(function () {
  const G = window.G, A = G.art, W = G.W, H = G.H;
  const SKIN = {
    dani:  { wall: 0xe9dcff, line: 0xcdb8f2, dark: 0x6a4aa8, accent: 0xb07cff, accent2: 0xff9fd0, rug: 0xffb3d9, floor: 0xd9e8ff, title: 'Igloo de Daniela' },
    sebas: { wall: 0xd9f1ff, line: 0xb5dcf2, dark: 0x2c5f8a, accent: 0x4aa6ff, accent2: 0x5fd1b0, rug: 0x9fe0cf, floor: 0xd2eaff, title: 'Casa de Sebas' },
    both:  { wall: 0xe4e0ff, line: 0xc6c0f0, dark: 0x4a3a98, accent: 0x8a7cff, accent2: 0x5fd1b0, rug: 0xffb3d9, floor: 0xd9e4ff, title: 'Igloo de Dani y Sebas' }
  };
  const BOUNDS = { x0: 22, x1: 378, y0: 114, y1: 216 };
  const SPEED = 66;

  class IglooScene extends Phaser.Scene {
    constructor() { super('igloo'); }
    init(d) { this.place = (d && d.place) || G.state.place || G.BASE; this.owner = G.PLACES[this.place].owner; }

    create() {
      G.state.place = this.place;
      A.emoteTextures(this.game); G.refreshTextures();
      this.night = G.isNight(); this.sk = SKIN[this.owner];
      this.isSebas = this.owner === 'sebas';
      this.colliders = this.isSebas ? [[296, 148, 70, 40], [88, 104, 50, 20], [24, 144, 60, 14]] : [[300, 124, 76, 28], [94, 104, 46, 30], [24, 146, 64, 40], [236, 150, 48, 26]];
      this.exSlots = [[92, 4], [116, 4], [140, 4], [164, 4], [236, 4], [260, 4], [284, 4]];
      this.exObjs = [];
      if (this.isSebas) this.drawSebasRoom(); else this.drawRoom();
      this.makeInteractions();
      this.actors = {};
      const me = G.state.me, pa = G.state.partner;
      const mx = me.id === 'sebas' ? 168 : 232, px = me.id === 'sebas' ? 232 : 168;
      this.actors.me = this.makeActor('me', mx, 186); this.actors.partner = this.makeActor('partner', px, 186);
      this.actors.me.dir = 'u';
      this.keys = this.input.keyboard.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D' }, false);
      this.input.keyboard.on('keydown-E', () => this.useNearest()); this.input.keyboard.on('keydown-SPACE', () => this.useNearest());
      this.sendT = 0; this.lastSent = '';
      if (this.isSebas && !G.state.lalaSeen) { G.state.lalaSeen = true; G.save(); this.time.delayedCall(900, () => G.ui.toast('🐱 ¡Conociste a Lala! Ahora puede acompañarte: Clóset → Lala')); }
      // red + eventos
      this.offs = [
        G.bus.on('chat', m => this.say(this.actors[m.who], m.text)),
        G.bus.on('emote', m => this.emote(this.actors[m.who], m.id)),
        G.bus.on('pos', d => this.onPos(d)),
        G.bus.on('daynight', () => { if (this.scene.isActive()) this.scene.restart({ place: this.place }); }),
        G.bus.on('look', () => { G.refreshTextures(); }), G.bus.on('album', () => this.drawAlbum()),
        G.bus.on('gallery', () => this.drawExhibit()), G.bus.on('records', () => this.drawBoard && this.drawBoard()),
        G.bus.on('house', () => this.drawDecor && this.drawDecor()),
        G.bus.on('partner', () => { G.refreshTextures(); this.actors.partner.label.setText(G.state.partner.name || ''); })
      ];
      this.events.once('shutdown', () => this.offs.forEach(f => f && f()));
      this.sendPos(true);
    }

    /* ---------- piezas comunes ---------- */
    drawDoor(g) {
      g.fillStyle(0x6b4a3a).fillRect(162, 202, 76, 12).fillStyle(0xffe9b0).fillRect(164, 204, 72, 8);
      this.add.text(200, 208, 'MAPA DE LIMA ▼', { fontFamily: 'VT323', fontSize: '11px', color: '#2b1b30' }).setOrigin(0.5).setDepth(2);
      g.fillStyle(0xcfe4f2).fillEllipse(200, 246, 76, 64).fillStyle(0x1b1240).fillEllipse(200, 248, 56, 52).fillStyle(0xffd27a, 0.3).fillEllipse(200, 254, 40, 30);
    }
    drawDayNight(titleY) {
      const night = this.night;
      if (night) {
        this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a6a, 0.34).setDepth(4000);
        [[140, 60], [200, 30], [232, 80], [300, 96]].forEach(([x, y]) => { const gl = this.add.circle(x, y, 28, 0xffd27a, 0.18).setDepth(4001).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: gl, alpha: { from: 0.12, to: 0.26 }, duration: 1400, yoyo: true, repeat: -1 }); });
      } else this.add.rectangle(W / 2, H / 2, W, H, 0xfff3d6, 0.05).setDepth(4000);
      this.add.text(W / 2, titleY, G.PLACES[this.place].name + ' · ' + G.PLACES[this.place].district, { fontFamily: 'VT323', fontSize: '12px', color: '#ffffff', stroke: '#2b1b30', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(4002).setAlpha(0.9);
      this.prompt = this.add.text(W / 2, 214, '', { fontFamily: 'VT323', fontSize: '14px', color: '#fff3d6', backgroundColor: '#2b1b30', padding: { x: 6, y: 1 } }).setOrigin(0.5).setDepth(4003).setVisible(false);
      this.add.text(396, 222, 'Esc: salir', { fontFamily: 'VT323', fontSize: '10px', color: '#ffffff', stroke: '#2b1b30', strokeThickness: 2 }).setOrigin(1, 1).setDepth(4003).setAlpha(0.8);
    }
    drawCloset() {
      const g = this.closetG, sk = this.sk; g.clear();
      g.fillStyle(0x41546a).fillRect(24, 44, 64, 62).fillStyle(0xcfe4f2).fillRect(27, 47, 58, 56).fillStyle(0xb5d0e4).fillRect(55, 47, 2, 56);
      g.fillStyle(sk.accent).fillRect(24, 40, 64, 8); g.fillStyle(0xfff3d6).fillRect(30, 41, 52, 6);
      const o = (G.state.me.look && G.state.me.look.outfit) || null;
      const cols = o ? [o.top.color, o.bottom.color, o.top.under || o.top.p1 || '#ffd24a', o.shoes.color] : ['#ff7aa8', '#4aa6ff', '#ffd24a', '#fff'];
      cols.forEach((c, i) => { g.fillStyle(A.hex(c)).fillRect(32 + i * 13, 56, 9, 18); g.fillStyle(0x2b1b30).fillRect(36 + i * 13, 53, 1, 3); });
      g.fillStyle(0xffd24a).fillRect(51, 74, 3, 6).fillRect(59, 74, 3, 6);
      this.closetLabel = this.closetLabel || this.add.text(56, 44, 'CLÓSET', { fontFamily: 'VT323', fontSize: '10px', color: '#2b1b30' }).setOrigin(0.5).setDepth(2);
    }

    /* ---------- IGLOO DE LOS DOS: sin cama ni juegos; DJ, TV, taller, cartas, récords, galería y decoración ---------- */
    drawRoom() {
      const sk = this.sk, night = this.night, g = this.add.graphics().setDepth(0);
      g.fillStyle(sk.wall).fillRect(0, 0, W, 100);
      g.lineStyle(1, sk.line);
      for (let r = 0; r < 12; r++) { const y = r * 8 + 4; g.lineBetween(0, y, W, y); for (let x = (r % 2) * 12; x < W; x += 24) g.lineBetween(x, y - 8, x, y); }
      g.fillStyle(0x1b1240).fillTriangle(0, 0, 90, 0, 0, 62).fillTriangle(W, 0, W - 90, 0, W, 62);
      g.fillStyle(sk.dark, 0.5).fillTriangle(0, 0, 70, 0, 0, 48).fillTriangle(W, 0, W - 70, 0, W, 48);
      A.bands(g, 0, 100, W, 125, [0xe6f3ff, sk.floor, 0xb9d6f2], 5);
      g.lineStyle(1, 0xffffff, 0.45); for (let i = 0; i < 9; i++) g.lineBetween(20 + i * 46, 104 + (i % 3) * 8, 36 + i * 46, 108 + (i % 3) * 8);
      g.fillStyle(0xffffff).fillRect(0, 98, W, 3); g.fillStyle(sk.line).fillRect(0, 101, W, 2);
      // alfombra con corazón
      g.fillStyle(sk.rug, 0.55).fillEllipse(200, 158, 120, 50).lineStyle(2, 0xffffff, 0.8).strokeEllipse(200, 158, 108, 42);
      A.heart(g, 200, 156, 12, 0xff5d97, 0.85);
      // corazón grande en la pared (el igloo de los dos tiene un corazón)
      A.heart(g, 200, 80, 10, 0xff5d97, 0.95); g.lineStyle(1.5, 0xffffff, 0.9).strokeCircle(200, 76, 1);
      // ventana (ojo de buey)
      g.fillStyle(0x41546a).fillCircle(140, 56, 24);
      g.fillStyle(night ? 0x0e1038 : 0x9fd8ff).fillCircle(140, 56, 20);
      if (night) { g.fillStyle(0x3a2a8a, 0.8).fillCircle(140, 66, 20); g.fillStyle(0xfff7d6).fillCircle(148, 48, 6).fillStyle(0x0e1038).fillCircle(151, 46, 5); [[128, 46], [134, 58], [150, 62], [124, 60]].forEach(([x, y]) => g.fillStyle(0xfff7c2).fillRect(x, y, 1.5, 1.5)); }
      else { g.fillStyle(0xffffff).fillEllipse(132, 50, 16, 7).fillEllipse(142, 48, 12, 6).fillEllipse(150, 62, 14, 6); g.fillStyle(0xfff3b0).fillCircle(150, 44, 5); }
      g.lineStyle(3, sk.accent).strokeCircle(140, 56, 21); g.lineStyle(1, 0xffffff, 0.6).lineBetween(140, 36, 140, 76).lineBetween(120, 56, 160, 56);
      this.closetG = this.add.graphics().setDepth(1); this.drawCloset();
      this.albumG = this.add.graphics().setDepth(1); this.drawAlbum();
      // espejo
      g.fillStyle(sk.dark).fillEllipse(268, 62, 34, 46); g.fillStyle(0xdff6ff).fillEllipse(268, 62, 28, 40); g.fillStyle(0xffffff, 0.9).fillEllipse(262, 52, 6, 14);
      // pizarra de récords (pared derecha)
      this.boardG = this.add.graphics().setDepth(1); this.boardT = this.add.text(337, 22, '', { fontFamily: 'VT323', fontSize: '10px', color: '#fff3d6', align: 'center', lineSpacing: -1 }).setOrigin(0.5, 0).setDepth(2); this.drawBoard();
      // set de DJ (mesa con 2 bandejas, mezcladora y parlantes)
      this.djG = this.add.graphics().setDepth(113); this.drawDj();
      // TV con puff
      const tv = this.add.graphics().setDepth(118);
      tv.fillStyle(0x5a3a2a).fillRect(96, 124, 42, 8).fillStyle(0x3a2418).fillRect(98, 132, 4, 4).fillRect(132, 132, 4, 4);
      tv.fillStyle(0x23232e).fillRoundedRect(98, 106, 38, 20, 3); tv.fillStyle(0x3a3a4a).fillRect(110, 126, 14, 2);
      this.tvScreen = this.add.graphics().setDepth(119); this.tvT = 0; this.drawTv();
      tv.fillStyle(0xb07cff).fillEllipse(116, 150, 28, 14).fillStyle(0xd9bfff).fillEllipse(114, 147, 18, 6);
      // taller artístico: caballete con pizarra blanca + mesa con pinturas
      const ta = this.add.graphics().setDepth(150);
      ta.fillStyle(0x6b4a3a).fillRect(34, 148, 3, 28).fillRect(56, 148, 3, 28).fillRect(45, 150, 2, 26);
      ta.fillStyle(0xffffff).fillRect(28, 112, 38, 34).lineStyle(2, 0x6b4a3a).strokeRect(28, 112, 38, 34);
      ta.fillStyle(0xe63946).fillRect(34, 120, 8, 2).fillStyle(0x2f6bd6).fillRect(34, 126, 14, 2).fillStyle(0xffd24a).fillCircle(54, 128, 4).fillStyle(0x3aa05a).fillRect(36, 134, 20, 2);
      ta.fillStyle(0xd9b48a).fillRect(66, 168, 22, 12).fillStyle(0x7a5a3a).fillRect(68, 180, 3, 8).fillRect(84, 180, 3, 8);
      [[70, 0xe63946], [75, 0xffd24a], [80, 0x2f6bd6], [85, 0x3aa05a]].forEach(([x, c]) => ta.fillStyle(c).fillRect(x, 164, 4, 4));
      this.add.text(47, 106, 'TALLER', { fontFamily: 'VT323', fontSize: '10px', color: '#2b1b30', backgroundColor: '#ffe9b0' }).setOrigin(0.5).setDepth(151);
      // escritorio de cartas
      const ca = this.add.graphics().setDepth(165);
      ca.fillStyle(0xd9b48a).fillRect(238, 156, 44, 8).fillStyle(0x7a5a3a).fillRect(240, 164, 4, 12).fillRect(276, 164, 4, 12);
      ca.fillStyle(0xfffaf0).fillRect(246, 148, 14, 10).fillStyle(0xe63946).fillRect(251, 151, 4, 3).fillStyle(0xff9fd0).fillRect(264, 150, 12, 8); A.heart(ca, 270, 153, 3, 0xe63946);
      ca.fillStyle(0x3aa05a).fillRect(240, 148, 2, 8).fillStyle(0xffd24a).fillCircle(241, 147, 3);
      this.add.text(260, 142, 'CARTAS 💌', { fontFamily: 'VT323', fontSize: '10px', color: '#2b1b30', backgroundColor: '#ffe9b0' }).setOrigin(0.5).setDepth(166);
      // baúl de decoración
      const ch = this.add.graphics().setDepth(190);
      ch.fillStyle(0x7a5a3a).fillRoundedRect(122, 178, 26, 16, 3).fillStyle(0xffd24a).fillRect(122, 184, 26, 2).fillRect(133, 183, 4, 5).lineStyle(1.5, 0x2b1b30).strokeRoundedRect(122, 178, 26, 16, 3);
      this.add.text(135, 174, 'DECORAR', { fontFamily: 'VT323', fontSize: '9px', color: '#2b1b30', backgroundColor: '#ffe9b0' }).setOrigin(0.5).setDepth(191);
      this.drawDoor(g);
      // notas flotantes
      for (let i = 0; i < 3; i++) { const n = A.text(this, 336, 120, ['♪', '♫', '♪'][i], 14, '#ff9fd0').setDepth(3); this.tweens.add({ targets: n, y: 80, x: 336 + (i - 1) * 18, alpha: { from: 1, to: 0 }, duration: 2200, delay: i * 700, repeat: -1 }); }
      this.exG = this.add.graphics().setDepth(1); this.drawExhibit();
      this.decorG = this.add.graphics().setDepth(0); this.decorObjs = []; this.drawDecor();
      this.drawDayNight(26);
    }

    drawBoard() {
      const g = this.boardG; if (!g) return; g.clear();
      g.fillStyle(0x6b4a3a).fillRect(295, 18, 84, 56).fillStyle(0x23403a).fillRect(298, 21, 78, 50).fillStyle(0xfff3d6).fillRect(298, 21, 78, 2);
      const R = G.state.records, nm = id => (G.state.me.id === id ? G.state.me.name : (G.state.partner.id === id ? G.state.partner.name : G.IDS[id].short)) || G.IDS[id].short;
      let wd = 0, ws = 0; Object.keys(R.games).forEach(k => { wd += R.games[k].dani || 0; ws += R.games[k].sebas || 0; });
      this.boardT.setText('RÉCORDS\n' + nm('dani') + ' ' + wd + ' – ' + ws + ' ' + nm('sebas') + '\nmatch: ' + R.matches.dani + '–' + R.matches.sebas + '\n(E para ver todo)');
    }
    drawDj() {
      const g = this.djG; g.clear();
      g.fillStyle(0x2b1b30).fillRect(300, 128, 74, 4).fillStyle(0x4a3a98).fillRect(300, 132, 74, 12).fillStyle(0x2b1b30).fillRect(302, 144, 4, 8).fillRect(368, 144, 4, 8);
      [[314, 0xff5d97], [358, 0x4aa6ff]].forEach(([x, c]) => { g.fillStyle(0x15151c).fillCircle(x, 134, 9).fillStyle(c).fillCircle(x, 134, 3.5).lineStyle(1, 0x3a3a4a).strokeCircle(x, 134, 6); });
      g.fillStyle(0x23232e).fillRect(330, 128, 14, 16); [0xe63946, 0xffd24a, 0x3aa05a].forEach((c, i) => g.fillStyle(c).fillRect(332, 130 + i * 4, 3, 2).fillRect(338, 130 + i * 4, 4, 2));
      g.fillStyle(0x23232e).fillRect(292, 116, 12, 22).fillRect(370, 116, 12, 22); g.fillStyle(0x4a3a98).fillCircle(298, 124, 3.5).fillCircle(298, 132, 2.5).fillCircle(376, 124, 3.5).fillCircle(376, 132, 2.5);
      this.add.text(337, 112, 'DJ', { fontFamily: 'VT323', fontSize: '11px', color: '#fff3d6', backgroundColor: '#4a3a98' }).setOrigin(0.5).setDepth(114);
      if (!this.djLights) { this.djLights = [0xff5d97, 0x4aa6ff, 0xffd24a].map((c, i) => { const l = this.add.circle(318 + i * 18, 150, 3, c, 0.8).setDepth(114); this.tweens.add({ targets: l, alpha: { from: 0.2, to: 1 }, duration: 380 + i * 110, yoyo: true, repeat: -1 }); return l; }); }
    }
    drawTv() {
      const g = this.tvScreen; if (!g) return; g.clear();
      const k = Math.floor(this.tvT / 700) % 4, bars = [0xe63946, 0xffd24a, 0x3aa05a, 0x2f6bd6, 0xb07cff, 0xff9fd0];
      g.fillStyle(0x10131f).fillRect(100, 108, 34, 16);
      if (k === 0) bars.forEach((c, i) => g.fillStyle(c).fillRect(101 + i * 5.3, 109, 5, 14));
      else if (k === 1) { g.fillStyle(0x6fd0ff).fillRect(101, 109, 32, 14).fillStyle(0xffffff).fillRect(112 + (this.tvT / 90) % 12, 114, 6, 6).fillStyle(0xffd24a).fillRect(115 + (this.tvT / 90) % 12, 117, 2, 1); }
      else if (k === 2) { g.fillStyle(0x23403a).fillRect(101, 109, 32, 14).fillStyle(0xffffff).fillRect(103, 112 + Math.abs(((this.tvT / 120) % 16) - 8) * 0.8, 2, 4).fillRect(129, 114 + Math.abs(((this.tvT / 150) % 16) - 8) * 0.6, 2, 4).fillRect(114 + (this.tvT / 100) % 6, 115 + (this.tvT / 100) % 4, 2, 2); }
      else { g.fillStyle(0x2b1b30).fillRect(101, 109, 32, 14); A.heart(g, 117, 118, 4, 0xff5d97); A.heart(g, 126, 114, 2, 0xff9fd0); }
    }

    /* ---------- galería de dibujos expuestos ---------- */
    drawExhibit() {
      if (!this.exG) return;
      this.exG.clear(); this.exObjs.forEach(o => o.destroy()); this.exObjs = [];
      const gal = G.state.gallery || [], ex = G.state.exhibit || {};
      this.exSlots.forEach(([x, y], i) => {
        const id = ex[i], it = id && gal.find(d => d.id === id);
        this.exG.fillStyle(0x6b4a3a).fillRect(x - 2, y - 2, 24, 19).fillStyle(it ? 0xffffff : 0xf3ead6).fillRect(x, y, 20, 15);
        if (it) {
          const key = 'dw_' + it.id, put = () => { if (!this.scene.isActive()) return; const im = this.add.image(x + 10, y + 7.5, key).setDisplaySize(20, 15).setDepth(1.5); this.exObjs.push(im); };
          if (this.textures.exists(key)) put(); else { this.textures.once('addtexture-' + key, put); this.textures.addBase64(key, it.img); }
        } else { const t = this.add.text(x + 10, y + 7, '+', { fontFamily: 'VT323', fontSize: '10px', color: '#b7a98a' }).setOrigin(0.5).setDepth(2); this.exObjs.push(t); }
      });
    }

    /* ---------- decoración elegida (4 lugares) ---------- */
    drawDecor() {
      if (!this.decorG) return;
      this.decorObjs.forEach(o => o.destroy()); this.decorObjs = [];
      const sel = (G.state.house && G.state.house.both) || {};
      G.DECOR_SLOTS.forEach((sl, i) => { const k = sel[i] !== undefined ? sel[i] : sl.def; if (!k || k === 'none') return; const g = this.add.graphics().setDepth(sl.y + 2); g.x = sl.x; g.y = sl.y; (G.DECOR[k] || (() => { }))(g, this); this.decorObjs.push(g); });
    }

    /* ---------- CASA DE SEBAS: paredes blancas, piso marrón, luz, pared Mondrian, Cuatro en raya y Lala ---------- */
    drawSebasRoom() {
      const night = this.night, g = this.add.graphics().setDepth(0), sk = this.sk;
      g.fillStyle(0xfafafa).fillRect(0, 0, W, 100); g.fillStyle(0xe8e8ee).fillRect(0, 94, W, 6); g.fillStyle(0xd0d0d8).fillRect(0, 99, W, 2);
      // piso de madera marrón
      g.fillStyle(0x8a5a3a).fillRect(0, 100, W, 125);
      for (let r = 0; r < 8; r++) { const y = 104 + r * 15; g.fillStyle(r % 2 ? 0x7e5034 : 0x956240).fillRect(0, y, W, 14); g.fillStyle(0x5e3a24).fillRect(0, y + 14, W, 1); for (let x = (r * 37) % 70; x < W; x += 70) g.fillRect(x, y, 1, 14); }
      // luz del techo (lámpara + haz)
      g.fillStyle(0x2b1b30).fillRect(199, 0, 2, 10).fillStyle(0xffe9a8).fillTriangle(188, 18, 212, 18, 200, 8);
      g.fillStyle(0xfff3b0, night ? 0.22 : 0.12).fillTriangle(196, 18, 204, 18, 330, 215).fillTriangle(196, 18, 204, 18, 70, 215);
      g.fillStyle(0xfff3b0, night ? 0.3 : 0.18).fillEllipse(200, 160, 150, 40);
      // pared Mondrian
      const mx = 120, my = 12, mw = 150, mh = 76, m = this.add.graphics().setDepth(1);
      m.fillStyle(0x2b1b30).fillRect(mx - 3, my - 3, mw + 6, mh + 6).fillStyle(0xfdfdfb).fillRect(mx, my, mw, mh);
      m.fillStyle(0xd9262c).fillRect(mx, my, 46, 38).fillStyle(0xffd24a).fillRect(mx + 104, my + 52, 46, 24).fillStyle(0x2f5fc8).fillRect(mx + 66, my + 52, 38, 24).fillStyle(0xffd24a).fillRect(mx + 128, my, 22, 14).fillStyle(0x2f5fc8).fillRect(mx, my + 52, 24, 24);
      m.fillStyle(0x15151c); [[46, 0, 4, mh], [0, 38, 104, 4], [104, 0, 4, mh], [0, 52, mw, 4], [66, 52, 4, 24], [128, 0, 4, 52], [104, 14, 46, 4]].forEach(([x, y, w, h]) => m.fillRect(mx + x, my + y, w, h));
      // corazón de neón (la casa de Sebas tiene un corazón)
      A.heart(g, 300, 36, 9, 0xff5d97, 1); this.add.circle(300, 36, 22, 0xff5d97, 0.12).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
      // ventana
      g.fillStyle(0x41546a).fillRect(318, 22, 56, 48).fillStyle(night ? 0x0e1038 : 0x9fd8ff).fillRect(321, 25, 50, 42);
      if (night) { g.fillStyle(0xfff7d6).fillCircle(358, 36, 5).fillStyle(0x0e1038).fillCircle(360, 35, 4); [[330, 34], [340, 52], [352, 56]].forEach(([x, y]) => g.fillStyle(0xfff7c2).fillRect(x, y, 1.5, 1.5)); } else { g.fillStyle(0xffffff).fillEllipse(335, 38, 16, 7).fillEllipse(358, 52, 18, 7); }
      g.fillStyle(0x41546a).fillRect(344, 25, 2, 42).fillRect(321, 45, 50, 2);
      this.closetG = this.add.graphics().setDepth(1); this.drawCloset();
      // repisa con tocadiscos, libros y plantas
      g.fillStyle(0x5a3a2a).fillRect(96, 100, 52, 6); g.fillStyle(0x3a2a22).fillRect(100, 88, 34, 12);
      this.disc = this.add.graphics({ x: 117, y: 88 }).setDepth(2); this.disc.fillStyle(0x15151c).fillEllipse(0, 0, 26, 7).fillStyle(0xe63946).fillEllipse(0, 0, 8, 2.4).fillStyle(0xffffff).fillRect(-11, -0.5, 3, 1);
      this.tweens.add({ targets: this.disc, scaleX: { from: 1, to: -1 }, duration: 900, yoyo: true, repeat: -1 });
      ['#c9262e', '#2c5f8a', '#ffd24a', '#5fd1b0', '#8a5cf6'].forEach((c, i) => g.fillStyle(A.hex(c)).fillRect(136 + i * 2.4, 90 + (i % 2), 2, 10 - (i % 2)));
      // mesa de Cuatro en raya
      const t = this.add.graphics().setDepth(160);
      t.fillStyle(0x5a3a2a).fillRect(302, 178, 4, 12).fillRect(358, 178, 4, 12).fillStyle(0xd9b48a).fillRect(298, 170, 68, 10);
      t.fillStyle(0x2f5fc8).fillRoundedRect(305, 150, 54, 24, 3);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) { const k = (r * 7 + c * 3) % 5; t.fillStyle(k === 0 ? 0xe63946 : k === 1 ? 0xffd23a : 0x9fc0ff).fillRect(308 + c * 7, 153 + r * 5, 4, 3); }
      this.add.text(332, 144, 'CUATRO EN RAYA', { fontFamily: 'VT323', fontSize: '9px', color: '#2b1b30', backgroundColor: '#ffe9b0' }).setOrigin(0.5).setDepth(161);
      // cojín de Lala + Lala
      g.fillStyle(0xb07cff, 0.9).fillEllipse(60, 186, 40, 17).fillStyle(0xd9bfff, 0.7).fillEllipse(58, 183, 24, 6);
      this.lalaSpr = this.add.image(60, 190, 'lala_sleep').setOrigin(0.5, 1).setDepth(191); this.lalaT = 0; this.lalaAwake = 0;
      // alfombra con corazón
      g.fillStyle(0x4aa6ff, 0.35).fillEllipse(200, 160, 110, 44); A.heart(g, 200, 158, 8, 0xff5d97, 0.85);
      this.drawDoor(g);
      this.drawDayNight(26);
    }

    drawAlbum() {
      const g = this.albumG; if (!g) return; g.clear(); const n = (G.state.album || []).length;
      [[176, 40, 14, 18], [194, 36, 18, 22], [214, 41, 14, 18]].forEach(([x, y, w, h], i) => {
        g.fillStyle(0x6b4a3a).fillRect(x - 1, y - 1, w + 2, h + 2).fillStyle(i < Math.min(3, n) ? 0xe6c48a : 0xf8f4ea).fillRect(x, y, w, h);
        if (i < Math.min(3, n)) { g.fillStyle(0x7fd6ff).fillRect(x + 1, y + 1, w - 2, h * 0.4).fillStyle(0xff9ec0).fillRect(x + 3, y + h * 0.5, w - 6, h * 0.35); }
      });
      if (!this.albumLbl) this.albumLbl = this.add.text(195, 64, 'ÁLBUM' + (n ? ' (' + n + ')' : ''), { fontFamily: 'VT323', fontSize: '10px', color: '#2b1b30' }).setOrigin(0.5).setDepth(2); else this.albumLbl.setText('ÁLBUM' + (n ? ' (' + n + ')' : ''));
    }

    makeInteractions() {
      const sebas = this.isSebas, base = [
        { id: 'closet', x: 56, y: 118, r: 28, label: 'E: abrir el clóset', fn: () => G.ui.closet() },
        { id: 'door', x: 200, y: 208, r: 24, label: 'E: salir al Mapa de Lima', fn: () => G.flow.openMap() }
      ];
      this.inter = sebas ? base.concat([
        { id: 'c4', x: 330, y: 198, r: 36, label: 'E: Cuatro en raya', fn: () => G.travel('conecta4', {}) },
        { id: 'lala', x: 62, y: 190, r: 30, label: 'E: acariciar a Lala 🐱', fn: () => this.petLala() },
        { id: 'vinilos', x: 122, y: 118, r: 26, label: 'E: poner un disco', fn: () => { this.emote(this.actors.me, 'star'); G.ui.toast('♪ Suena un disco de vinilo ♪'); } }
      ]) : base.concat([
        { id: 'mirror', x: 268, y: 118, r: 26, label: 'E: espejo (cambiarte)', fn: () => G.ui.closet() },
        { id: 'album', x: 198, y: 118, r: 26, label: 'E: ver el álbum de fotos', fn: () => G.ui.album() },
        { id: 'expo', x: 170, y: 114, r: 22, label: 'E: galería de dibujos (exponer en la pared)', fn: () => G.ui.gallery() },
        { id: 'board', x: 336, y: 118, r: 28, label: 'E: pizarra de récords', fn: () => G.ui.records() },
        { id: 'dj', x: 336, y: 160, r: 30, label: 'E: set de DJ (elegir música)', fn: () => G.ui.dj() },
        { id: 'tv', x: 116, y: 148, r: 28, label: 'E: ver la TV', fn: () => G.ui.tv() },
        { id: 'taller', x: 56, y: 198, r: 34, label: 'E: taller artístico (pizarra y crayolas)', fn: () => G.ui.drawing() },
        { id: 'cartas', x: 262, y: 184, r: 26, label: 'E: escribir una carta 💌 (' + (G.state.session.letters || 0) + '/3)', fn: () => G.ui.letter() },
        { id: 'decor', x: 134, y: 202, r: 22, label: 'E: decorar el igloo', fn: () => G.ui.decorate() }
      ]);
      this.inter.forEach(it => { const z = this.add.zone(it.x, it.y - 20, it.r * 1.6, 44).setInteractive({ useHandCursor: true }).setDepth(3000); z.on('pointerdown', () => it.fn()); });
    }
    petLala() {
      const l = this.lalaSpr; G.audio.sfx('heart'); this.emote(this.actors.me, 'heart');
      const say = ['¡Miau!', 'purrr…', 'prrr 💜', '¡Miau miau!'][Math.floor(Math.random() * 4)];
      const t = this.add.text(l.x, l.y - 26, say, { fontFamily: 'VT323', fontSize: '12px', color: '#2b1b30', backgroundColor: '#ffffff', padding: { x: 3, y: 1 } }).setOrigin(0.5).setDepth(5000);
      this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
      this.lalaSpr.setTexture('lala_sit'); this.lalaAwake = 4000;
    }
    useNearest() { if (G.typing || G.modalOpen) return; const it = this.nearest(); if (it) it.fn(); }
    nearest() { const a = this.actors.me; let best = null, bd = 1e9; this.inter.forEach(it => { const d = Math.hypot(a.x - it.x, a.y - it.y); if (d < it.r && d < bd) { best = it; bd = d; } }); return best; }

    /* ---------- personajes ---------- */
    makeActor(who, x, y) {
      const p = G.state[who === 'me' ? 'me' : 'partner'];
      const a = { who, x, y, tx: x, ty: y, dir: 'd', moving: false, t: 0, frame: 0 };
      a.shadow = this.add.ellipse(x, y, 14, 5, 0x000000, 0.25);
      a.puf = this.add.image(x - 12, y, 'puf_' + who).setOrigin(0.5, 1);
      a.lala = this.add.image(x + 14, y, 'lala_sit').setOrigin(0.5, 1).setScale(0.7).setVisible(!!(p.look && p.look.lala)); a.lx = x + 14; a.ly = y;
      a.spr = this.add.sprite(x, y, 'char_' + who, 'd0').setOrigin(0.5, 1);
      a.label = this.add.text(x, y - 32, p.name || '', { fontFamily: 'VT323', fontSize: '12px', color: '#ffffff', stroke: '#2b1b30', strokeThickness: 3 }).setOrigin(0.5, 1);
      a.px = x - 12; a.py = y;
      return a;
    }
    blocked(x, y) {
      if (x < BOUNDS.x0 || x > BOUNDS.x1 || y < BOUNDS.y0 || y > BOUNDS.y1) return true;
      return this.colliders.some(([cx, cy, cw, ch]) => x > cx - 4 && x < cx + cw + 4 && y > cy && y < cy + ch);
    }
    renderActor(a) {
      const flip = a.dir === 'r', dir = a.dir === 'r' ? 'l' : a.dir;
      const fr = a.moving ? [1, 0, 2, 0][Math.floor(a.t / 130) % 4] : 0;
      a.spr.setPosition(Math.round(a.x), Math.round(a.y)).setFrame(dir + fr).setFlipX(flip).setDepth(a.y);
      a.shadow.setPosition(a.x, a.y - 1).setDepth(a.y - 0.5);
      a.label.setPosition(Math.round(a.x), Math.round(a.y - 29)).setDepth(a.y + 1000);
      // puffle: sigue con retraso y rebota
      const ox = a.dir === 'r' ? -12 : a.dir === 'l' ? 12 : 0, oy = a.dir === 'u' ? 8 : a.dir === 'd' ? -6 : 0;
      a.px += (a.x + ox - a.px) * 0.12; a.py += (a.y + oy - a.py) * 0.12;
      const bob = a.moving ? Math.abs(Math.sin(a.t / 90)) * 3 : Math.abs(Math.sin(a.t / 420)) * 1;
      a.puf.setPosition(Math.round(a.px), Math.round(a.py - bob)).setDepth(a.py - 1);
      const lk = G.state[a.who === 'me' ? 'me' : 'partner'].look; a.lala.setVisible(!!(lk && lk.lala));
      a.lx += (a.x - ox * 1.2 + (a.dir === 'u' || a.dir === 'd' ? 14 : 0) - a.lx) * 0.09; a.ly += (a.y - oy * 0.5 - a.ly) * 0.09; a.lala.setPosition(Math.round(a.lx), Math.round(a.ly)).setDepth(a.ly - 1);
      if (a.bub) a.bub.setPosition(a.x, a.y - 40).setDepth(a.y + 2000);
    }
    say(a, text) {
      if (!a) return; if (a.bub) a.bub.destroy();
      const t = this.add.text(0, 0, text, { fontFamily: 'VT323', fontSize: '13px', color: '#2b1b30', wordWrap: { width: 120 }, align: 'center' }).setOrigin(0.5, 1);
      const w = t.width + 10, h = t.height + 6, g = this.add.graphics();
      g.fillStyle(0xffffff).fillRoundedRect(-w / 2, -h - 3, w, h, 4).fillTriangle(-3, -3, 3, -3, 0, 2).lineStyle(1.5, 0x2b1b30).strokeRoundedRect(-w / 2, -h - 3, w, h, 4);
      t.setPosition(0, -6); const c = this.add.container(a.x, a.y - 40, [g, t]); a.bub = c;
      this.time.delayedCall(4500, () => { if (a.bub === c) { c.destroy(); a.bub = null; } });
    }
    emote(a, id) {
      if (!a) return; G.audio.sfx(id === 'heart' ? 'heart' : 'pop');
      const im = this.add.image(a.x, a.y - 44, 'emo_' + id).setScale(2).setOrigin(0.5, 1).setDepth(6000);
      this.tweens.add({ targets: im, y: a.y - 62, scale: { from: 1, to: 2.6 }, duration: 350, ease: 'Back.easeOut' });
      this.tweens.add({ targets: im, alpha: 0, duration: 500, delay: 1700, onComplete: () => im.destroy() });
      this.tweens.add({ targets: im, x: im.x + 3, duration: 160, yoyo: true, repeat: 9 });
    }

    /* ---------- red ---------- */
    onPos(d) {
      if (d.s !== 'igloo:' + this.place) return;
      const a = this.actors.partner; a.tx = d.x; a.ty = d.y; a.dir = d.d; a.moving = d.m;
    }
    sendPos(force) {
      if (!G.net.connected) return;
      const a = this.actors.me, pk = [Math.round(a.x), Math.round(a.y), a.dir, a.moving].join();
      if (pk === this.lastSent && !force) return; this.lastSent = pk;
      G.net.send('pos', { x: Math.round(a.x), y: Math.round(a.y), d: a.dir, m: a.moving, s: 'igloo:' + this.place });
    }

    update(time, dt) {
      const me = this.actors.me, K = this.keys, typing = G.typing || G.modalOpen;
      let vx = 0, vy = 0;
      if (!typing) { if (K.left.isDown || K.a.isDown) vx -= 1; if (K.right.isDown || K.d.isDown) vx += 1; if (K.up.isDown || K.w.isDown) vy -= 1; if (K.down.isDown || K.s.isDown) vy += 1; }
      me.moving = !!(vx || vy);
      if (me.moving) {
        const len = Math.hypot(vx, vy), step = SPEED * dt / 1000;
        const nx = me.x + vx / len * step, ny = me.y + vy / len * step;
        if (!this.blocked(nx, me.y)) me.x = nx; if (!this.blocked(me.x, ny)) me.y = ny;
        me.dir = Math.abs(vx) >= Math.abs(vy) && vx ? (vx < 0 ? 'l' : 'r') : (vy < 0 ? 'u' : 'd');
        me.t += dt;
      } else me.t += dt * 0.3;
      const pa = this.actors.partner;
      pa.x += (pa.tx - pa.x) * 0.25; pa.y += (pa.ty - pa.y) * 0.25; pa.t += pa.moving ? dt : dt * 0.3;
      this.renderActor(me); this.renderActor(pa);
      this.sendT += dt; if (this.sendT > 70) { this.sendT = 0; this.sendPos(); }
      if (this.lalaSpr) { this.lalaT += dt; if (this.lalaAwake > 0) { this.lalaAwake -= dt; if (this.lalaAwake <= 0) this.lalaSpr.setTexture('lala_sleep'); } else if (Math.floor(this.lalaT / 7000) % 2 === 1) this.lalaSpr.setTexture('lala_sit'); else this.lalaSpr.setTexture('lala_sleep'); }
      if (this.tvScreen) { this.tvT += dt; if (Math.floor(this.tvT / 90) !== this.tvF) { this.tvF = Math.floor(this.tvT / 90); this.drawTv(); } }
      const it = typing ? null : this.nearest();
      if (it) { this.prompt.setText(it.label).setVisible(true); } else this.prompt.setVisible(false);
      G.state.pos = { x: me.x, y: me.y };
    }
  }
  G.IglooScene = IglooScene;
})();
