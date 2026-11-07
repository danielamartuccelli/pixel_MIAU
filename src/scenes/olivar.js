/* ===========================================================
   scenes/olivar.js — El Olivar de San Isidro: parque libre para caminar (con puffles y Lala).
   De noche hay LUNA LLENA. En las banquitas se juega "Mirada fija": se acercan las caras (zoom),
   se ven los ojos de los dos y NADIE puede pestañear: las ganas de pestañear suben solas;
   ESPACIO (tocar rápido) las aguanta, y los emoticones de la pareja distraen. Quien pestañea primero pierde.
   Red: pos{s:'olivar'} · o2_open · o2_ready · o2_go{seed} · o2_urge{u} · o2_blink · o2_res · o2_again
   Prueba: ?solo=1&me=sebas&go=olivar&oauto=1  (oauto = la pareja es un bot y tú aguantas solo)
   =========================================================== */
(function () {
  const G = window.G, A = G.art, W = G.W, H = G.H, mg = G.mg, Q = new URLSearchParams(location.search);
  const WW = 640, WH = 330, SPEED = 70, SKY = 74;
  const BENCHES = [[330, 150], [150, 250], [500, 240]];

  class OlivarScene extends Phaser.Scene {
    constructor() { super('olivar'); }
    init() { this.phase = 'walk'; this.objs = []; }
    create() {
      G.state.place = 'olivar';
      A.emoteTextures(this.game); G.refreshTextures();
      const night = this.night = G.isNight(), rng = mg.rng(77);
      this.cameras.main.setBounds(0, 0, WW, WH);
      this.drawWorld(night, rng);
      this.actors = {};
      this.actors.me = this.makeActor('me', 300, 200); this.actors.partner = this.makeActor('partner', 330, 200);
      this.keys = this.input.keyboard.addKeys({ up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D' }, false);
      this.input.keyboard.on('keydown-E', () => { if (this.phase === 'walk') this.useBench(); });
      this.input.keyboard.on('keydown-SPACE', () => { if (this.phase === 'walk') this.useBench(); else if (this.phase === 'stare') this.hold(); });
      this.cameras.main.startFollow(this.actors.me.spr, true, 0.12, 0.12); this.cameras.main.setScroll(this.actors.me.x - W / 2, this.actors.me.y - H / 2);
      this.sendT = 0; this.lastSent = '';
      this.prompt = this.add.text(W / 2, 212, '', { fontFamily: 'VT323', fontSize: '14px', color: '#fff3d6', backgroundColor: '#2b1b30', padding: { x: 6, y: 1 } }).setOrigin(0.5).setDepth(9000).setScrollFactor(0).setVisible(false);
      this.add.text(396, 222, 'Esc: salir', { fontFamily: 'VT323', fontSize: '10px', color: '#ffffff', stroke: '#2b1b30', strokeThickness: 2 }).setOrigin(1, 1).setDepth(9000).setScrollFactor(0).setAlpha(0.85);
      this.add.text(W / 2, 22, 'El Olivar · San Isidro' + (night ? ' · luna llena 🌕' : ''), { fontFamily: 'VT323', fontSize: '12px', color: '#fff', stroke: '#2b1b30', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(9000).setScrollFactor(0).setAlpha(0.9);
      this.offs = [
        G.bus.on('chat', m => this.say(this.actors[m.who], m.text)),
        G.bus.on('emote', m => this.onEmote(m)),
        G.bus.on('pos', d => this.onPos(d)),
        G.bus.on('daynight', () => { if (this.scene.isActive() && this.phase === 'walk') this.scene.restart(); }),
        G.bus.on('look', () => G.refreshTextures()),
        G.bus.on('partner', () => { G.refreshTextures(); this.actors.partner.label.setText(G.state.partner.name || ''); })
      ];
      mg.bind(this, [['o2_open', () => this.openLobby(true)], ['o2_ready', d => { this.ready.partner = !!d.r; this.refreshLobby(); this.tryStart(); }], ['o2_go', d => this.startStare(d.seed)],
        ['o2_urge', d => { this.pUrge = d.u; }], ['o2_blink', d => this.onPartnerBlink(d)], ['o2_res', d => this.showResult(d.w, true)], ['o2_again', () => this.openLobby(true)]]);
      this.events.once('shutdown', () => this.offs.forEach(f => f && f()));
      this.sendPos(true);
      if (Q.get('obench')) this.time.delayedCall(300, () => this.openLobby(false));
    }

    /* ---------- mundo ---------- */
    drawWorld(night, rng) {
      const g = this.add.graphics().setDepth(0);
      // cielo (parallax) + luna llena
      const sky = this.add.graphics().setDepth(0).setScrollFactor(0.25); A.bands(sky, 0, 0, W + 200, SKY + 40, night ? [0x050a2a, 0x0d1c58, 0x1f3a86] : [0x7fd3ff, 0xa9e3ff, 0xd9f3ff], 5);
      if (night) {
        const moon = this.add.graphics().setDepth(0.5).setScrollFactor(0.25);
        moon.fillStyle(0xfff7d6, 0.12).fillCircle(300, 34, 46).fillStyle(0xfff7d6, 0.2).fillCircle(300, 34, 34).fillStyle(0xfffbe6).fillCircle(300, 34, 22);
        moon.fillStyle(0xe9e3c0, 0.9).fillCircle(293, 28, 4).fillCircle(307, 40, 5).fillCircle(299, 44, 2.5).fillCircle(309, 27, 2);
        for (let i = 0; i < 60; i++) { const s = this.add.rectangle(rng() * (W + 200), rng() * SKY, 1.5, 1.5, 0xfff7c2, 0.9).setScrollFactor(0.25).setDepth(0.4); this.tweens.add({ targets: s, alpha: { from: 0.2, to: 1 }, duration: 500 + rng() * 900, yoyo: true, repeat: -1 }); }
      } else {
        const cl = this.add.graphics().setDepth(0.4).setScrollFactor(0.25); cl.fillStyle(0xffffff, 0.9); [[60, 24], [210, 40], [340, 20], [470, 36]].forEach(([x, y]) => cl.fillEllipse(x, y, 52, 14).fillEllipse(x + 14, y - 5, 30, 12));
        cl.fillStyle(0xfff3b0).fillCircle(330, 30, 12);
      }
      // colinas lejanas
      g.fillStyle(night ? 0x16335a : 0x7fc79a).fillEllipse(120, SKY + 6, 300, 40).fillEllipse(420, SKY + 8, 360, 46).fillEllipse(600, SKY + 4, 260, 36);
      // pasto
      A.bands(g, 0, SKY, WW, WH - SKY, night ? [0x14442f, 0x1c5a3b, 0x246e46] : [0x7fcf6a, 0x6dbe5a, 0x5aa84a], 6);
      for (let i = 0; i < 260; i++) { g.fillStyle(night ? 0x2a7a50 : 0x9be07f, 0.8).fillRect(rng() * WW, SKY + 4 + rng() * (WH - SKY - 6), 1, 3); }
      // senderos de tierra
      g.lineStyle(14, night ? 0x6b5a46 : 0xe0c9a0, 1);
      const path = [[40, 210], [150, 190], [260, 205], [330, 175], [420, 205], [540, 200], [610, 220]];
      g.beginPath(); path.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokePath();
      g.lineStyle(10, night ? 0x6b5a46 : 0xe0c9a0, 1); g.beginPath(); g.moveTo(330, 175); g.lineTo(330, 120); g.lineTo(300, 100); g.strokePath(); g.beginPath(); g.moveTo(150, 190); g.lineTo(150, 260); g.strokePath(); g.beginPath(); g.moveTo(500, 200); g.lineTo(500, 250); g.strokePath();
      // estanque con puentecito
      g.fillStyle(night ? 0x0f2a5a : 0x5fc3e8).fillEllipse(430, 120, 130, 40); g.fillStyle(0xffffff, night ? 0.25 : 0.5).fillEllipse(410, 115, 40, 6).fillEllipse(450, 124, 28, 5);
      g.fillStyle(0x8a6a44).fillRect(405, 112, 50, 10).fillStyle(0xb8955f).fillRect(405, 108, 50, 3).fillRect(405, 122, 50, 2);
      if (night) { g.fillStyle(0xfff7d6, 0.35).fillEllipse(440, 124, 30, 6); }
      // flores
      for (let i = 0; i < 40; i++) { const x = 20 + rng() * (WW - 40), y = SKY + 20 + rng() * (WH - SKY - 30); g.fillStyle([0xff7aa8, 0xffd24a, 0xffffff, 0xb07cff][i % 4]).fillRect(x, y, 2, 2); }
      // olivos (troncos retorcidos + copa gris-verdosa), ordenados por profundidad
      const trees = [[60, 120], [110, 160], [210, 130], [250, 110], [380, 100], [520, 110], [580, 150], [90, 280], [220, 300], [400, 290], [600, 290], [30, 230], [300, 300], [560, 230], [470, 170]];
      trees.forEach(([x, y]) => this.makeTree(x, y, night, rng));
      // banquitas
      BENCHES.forEach(([x, y]) => { const b = this.add.graphics().setDepth(y); b.fillStyle(0x6b4a3a).fillRect(x - 14, y - 10, 28, 3).fillRect(x - 14, y - 6, 28, 3).fillStyle(0x4a3228).fillRect(x - 13, y - 3, 3, 5).fillRect(x + 10, y - 3, 3, 5); b.fillStyle(0xffd24a, 0.0); });
      // faroles (de noche brillan)
      [[200, 185], [380, 190], [560, 205]].forEach(([x, y]) => { const l = this.add.graphics().setDepth(y); l.fillStyle(0x2b1b30).fillRect(x - 1, y - 26, 2, 26).fillStyle(night ? 0xffe9a8 : 0xd8d8e0).fillCircle(x, y - 28, 4); if (night) { const gl = this.add.circle(x, y - 28, 40, 0xffd27a, 0.22).setDepth(8000).setBlendMode(Phaser.BlendModes.ADD); this.tweens.add({ targets: gl, alpha: { from: 0.15, to: 0.3 }, duration: 1500, yoyo: true, repeat: -1 }); } });
      if (night) {
        for (let i = 0; i < 26; i++) { const f = this.add.circle(rng() * WW, SKY + 20 + rng() * (WH - SKY - 20), 1.6, 0xeaff7a, 0.9).setDepth(7000); this.tweens.add({ targets: f, x: f.x + (rng() - 0.5) * 40, y: f.y + (rng() - 0.5) * 24, alpha: { from: 0.1, to: 1 }, duration: 1400 + rng() * 1600, yoyo: true, repeat: -1 }); }
        this.add.rectangle(W / 2, H / 2, W, H, 0x0a0a50, 0.28).setDepth(8500).setScrollFactor(0);
      }
      this.bounds = { x0: 14, x1: WW - 14, y0: SKY + 24, y1: WH - 8 };
    }
    makeTree(x, y, night, rng) {
      const t = this.add.graphics().setDepth(y), trunk = night ? 0x3a2a22 : 0x6b4a3a, leaf = night ? [0x2a4a42, 0x35605a] : [0x8fae8a, 0xa8c4a0];
      t.fillStyle(0x000000, 0.18).fillEllipse(x, y, 30, 8);
      t.fillStyle(trunk).fillRect(x - 3, y - 14, 6, 14).fillRect(x - 5, y - 18, 4, 6).fillRect(x + 1, y - 20, 5, 8);
      t.fillStyle(leaf[0]).fillEllipse(x, y - 28, 34, 22).fillEllipse(x - 12, y - 22, 20, 14).fillEllipse(x + 12, y - 23, 20, 14);
      t.fillStyle(leaf[1]).fillEllipse(x - 4, y - 31, 18, 10).fillEllipse(x + 9, y - 26, 12, 7);
      for (let i = 0; i < 5; i++) t.fillStyle(0x2b3a2b).fillRect(x - 12 + rng() * 24, y - 30 + rng() * 14, 2, 2);
    }

    /* ---------- personajes (con puffle y Lala) ---------- */
    makeActor(who, x, y) {
      const p = G.state[who === 'me' ? 'me' : 'partner'];
      const a = { who, x, y, tx: x, ty: y, dir: 'd', moving: false, t: 0, px: x - 12, py: y, lx: x + 14, ly: y };
      a.shadow = this.add.ellipse(x, y, 14, 5, 0x000000, 0.25);
      a.puf = this.add.image(x - 12, y, 'puf_' + who).setOrigin(0.5, 1);
      a.lala = this.add.image(x + 14, y, 'lala_sit').setOrigin(0.5, 1).setScale(0.7).setVisible(!!(p.look && p.look.lala));
      a.spr = this.add.sprite(x, y, 'char_' + who, 'd0').setOrigin(0.5, 1);
      a.label = this.add.text(x, y - 32, p.name || '', { fontFamily: 'VT323', fontSize: '12px', color: '#ffffff', stroke: '#2b1b30', strokeThickness: 3 }).setOrigin(0.5, 1);
      return a;
    }
    render(a) {
      const flip = a.dir === 'r', dir = a.dir === 'r' ? 'l' : a.dir, fr = a.moving ? [1, 0, 2, 0][Math.floor(a.t / 130) % 4] : 0;
      a.spr.setPosition(Math.round(a.x), Math.round(a.y)).setFrame(dir + fr).setFlipX(flip).setDepth(a.y);
      a.shadow.setPosition(a.x, a.y - 1).setDepth(a.y - 0.5); a.label.setPosition(Math.round(a.x), Math.round(a.y - 29)).setDepth(a.y + 1000);
      const ox = a.dir === 'r' ? -12 : a.dir === 'l' ? 12 : 0, oy = a.dir === 'u' ? 8 : a.dir === 'd' ? -6 : 0;
      a.px += (a.x + ox - a.px) * 0.12; a.py += (a.y + oy - a.py) * 0.12; const bob = a.moving ? Math.abs(Math.sin(a.t / 90)) * 3 : Math.abs(Math.sin(a.t / 420));
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
      t.setPosition(0, -6); const c = this.add.container(a.x, a.y - 40, [g, t]); a.bub = c; this.time.delayedCall(4500, () => { if (a.bub === c) { c.destroy(); a.bub = null; } });
    }
    emoteAt(a, id) {
      if (!a) return; const im = this.add.image(a.x, a.y - 44, 'emo_' + id).setScale(2).setOrigin(0.5, 1).setDepth(6000);
      this.tweens.add({ targets: im, y: a.y - 62, scale: { from: 1, to: 2.6 }, duration: 350, ease: 'Back.easeOut' }); this.tweens.add({ targets: im, alpha: 0, duration: 500, delay: 1500, onComplete: () => im.destroy() });
    }
    onEmote(m) {
      G.audio.sfx('pop');
      if (this.phase === 'stare') {
        if (m.who === 'partner') { if (this.time.now - (this.lastDist || 0) > 900) { this.lastDist = this.time.now; this.urge = Math.min(99, this.urge + 16); this.showDistract(m.id); } }
        else this.showDistract(m.id, true);
      } else this.emoteAt(this.actors[m.who], m.id);
    }
    onPos(d) { if (d.s !== 'olivar') return; const a = this.actors.partner; a.tx = d.x; a.ty = d.y; a.dir = d.d; a.moving = d.m; }
    sendPos(force) {
      if (!G.net.connected) return; const a = this.actors.me, pk = [Math.round(a.x), Math.round(a.y), a.dir, a.moving].join(); if (pk === this.lastSent && !force) return; this.lastSent = pk;
      G.net.send('pos', { x: Math.round(a.x), y: Math.round(a.y), d: a.dir, m: a.moving, s: 'olivar' });
    }
    nearBench() { const a = this.actors.me; return BENCHES.find(([x, y]) => Math.hypot(a.x - x, a.y - y) < 30); }
    useBench() { if (G.typing || G.modalOpen) return; if (this.nearBench()) { mg.send('o2_open', {}); this.openLobby(false); } }

    /* ---------- minijuego: mirada fija ---------- */
    clear() { this.objs.forEach(o => o.destroy && o.destroy()); this.objs = []; }
    add2(o) { this.objs.push(o); return o; }
    openLobby(remote) {
      if (this.phase !== 'walk' && this.phase !== 'over' && this.phase !== 'lobby') return;
      this.phase = 'lobby'; this.ready = { me: !!G.solo && !!Q.get('oauto'), partner: !!G.solo }; this.refreshLobby();
      if (G.solo && Q.get('oauto')) this.time.delayedCall(500, () => this.tryStart());
    }
    refreshLobby() {
      if (this.phase !== 'lobby') return; this.clear(); const add = o => this.add2(o), D = 9100;
      add(this.add.rectangle(W / 2, H / 2, W, H, 0x120a22, 0.88).setScrollFactor(0).setDepth(D));
      mg.panel(this, o => { o.setScrollFactor(0); return add(o); }, 40, 18, 320, 190, D + 1);
      const T = (x, y, t, s, c) => add(this.add.text(x, y, t, { fontFamily: 'VT323', fontSize: s + 'px', color: c || '#fff3d6', align: 'center', wordWrap: { width: 296 }, lineSpacing: 0 }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 3));
      T(200, 26, '👁 MIRADA FIJA 👁', 17, '#ffd24a');
      T(200, 48, 'Se sientan en la banquita y se miran a los ojos.\n¡NADIE puede pestañear! Tus ganas de pestañear suben solas (la barra roja).\n• Toca ESPACIO rápido para aguantar.\n• Tu pareja puede distraerte con emoticones (teclas 1–9): ¡aguanta la risa!\nQuien pestañea primero PIERDE (el ganador: S/ 10).', 13);
      this.ready.me = !!this.ready.me;
      const mine = this.ready.me, part = this.ready.partner;
      T(200, 134, (mine ? '✔ Tú: listo/a' : '… Tú: no estás listo/a') + '   ' + (part ? '✔ ' + mg.nameOf(G.state.partner.id) + ': listo/a' : '… esperando a ' + mg.nameOf(G.state.partner.id)), 14);
      mg.btn(this, o => { o.setScrollFactor(0); return add(o); }, 130, 176, 110, 22, mine ? 'Cancelar' : '¡Estoy listo/a!', mine ? 0xffb38a : 0x7fd1ae, () => { this.ready.me = !this.ready.me; mg.send('o2_ready', { r: this.ready.me }); this.refreshLobby(); this.tryStart(); }, D + 3, 15);
      mg.btn(this, o => { o.setScrollFactor(0); return add(o); }, 270, 176, 110, 22, '◀ Volver al parque', 0xff7aa8, () => { this.phase = 'walk'; this.clear(); }, D + 3, 14);
    }
    tryStart() { if (this.phase !== 'lobby') return; if (this.ready.me && this.ready.partner && (G.net.role === 'host' || G.solo)) { const seed = (Math.random() * 1e9) | 0; mg.send('o2_go', { seed }); this.startStare(seed); } }
    startStare(seed) {
      if (this.phase === 'stare') return; this.clear(); this.phase = 'stare'; this.seed = seed; this.rng = mg.rng(seed);
      this.urge = 0; this.pUrge = 0; this.t = 0; this.cd = 3.2; this.over = false; this.blinkMe = 0; this.blinkPartner = 0; this.hits = 0; this.lastDist = 0; this.nextEv = 4 + this.rng() * 3; this.sendU = 0; this.botBlink = 14 + Math.random() * 16;
      const D = 9100, add = o => this.add2(o); this.dd = D;
      this.cameras.main.stopFollow(); this.cameras.main.setScroll(0, 0);
      add(this.add.rectangle(W / 2, H / 2, W, H, night2(this.night), 1).setScrollFactor(0).setDepth(D));
      // base de las dos caras (zoom)
      const mk = (who, x) => {
        const key = 'bigface_' + who, p = G.state[who === 'me' ? 'me' : 'partner']; if (!p.look) return null;
        const cv = G.faceCanvas(p.look, 9); if (this.textures.exists(key)) this.textures.remove(key); this.textures.addCanvas(key, cv);
        const im = add(this.add.image(x, 112, key).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(D + 1)); return im;
      };
      this.faceL = mk('me', 105); this.faceR = mk('partner', 295);
      this.eyesG = add(this.add.graphics().setScrollFactor(0).setDepth(D + 2));
      this.hud = add(this.add.graphics().setScrollFactor(0).setDepth(D + 4));
      this.msg = add(this.add.text(W / 2, 20, '', { fontFamily: 'VT323', fontSize: '22px', color: '#fff3d6', stroke: '#2b1b30', strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5));
      this.names = [add(this.add.text(105, 188, G.state.me.name, { fontFamily: 'VT323', fontSize: '15px', color: '#fff', stroke: '#2b1b30', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5)), add(this.add.text(295, 188, G.state.partner.name, { fontFamily: 'VT323', fontSize: '15px', color: '#fff', stroke: '#2b1b30', strokeThickness: 3 }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 5))];
      this.drawEyes();
    }
    /* ojos grandes dibujados encima de las caras ampliadas */
    eyePos(who) { const cx = who === 'me' ? 105 : 295, sx = cx - 81, sy = 112 - 67.5; return [[sx + 6 * 9 + 4.5 - 9, sy + 9 * 9 + 4.5 - 9], [sx + 11 * 9 + 4.5 - 9, sy + 9 * 9 + 4.5 - 9]].map(([x, y]) => [x, y]); }
    drawEyes() {
      const g = this.eyesG; if (!g) return; g.clear();
      [['me', this.blinkMe, this.urge], ['partner', this.blinkPartner, this.pUrge]].forEach(([who, blink, u]) => {
        const p = G.state[who === 'me' ? 'me' : 'partner']; if (!p.look) return; const look = p.look, skin = A.hex(look.skin), glasses = look.glasses && look.glasses.type !== 'none';
        const pts = this.eyePos(who), shake = u > 60 ? Math.sin(this.time.now / 30) * (u - 60) / 40 : 0;
        pts.forEach(([x, y], i) => {
          x += shake; g.fillStyle(skin).fillRect(x - 20, y - 14, 40, 28);                       // tapa los ojos pequeños del sprite
          if (blink) { g.lineStyle(3, 0x2b1b30).lineBetween(x - 13, y + 2, x + 13, y + 2); g.fillStyle(0x2b1b30).fillRect(x - 12, y + 2, 24, 1); if (look.eyeStyle === 'lash') g.lineBetween(x + (i ? 13 : -13), y + 2, x + (i ? 18 : -18), y - 4); }
          else {
            g.fillStyle(0xffffff).fillEllipse(x, y, 30, 20); g.lineStyle(2, 0x2b1b30).strokeEllipse(x, y, 30, 20);
            const red = Math.min(1, Math.max(0, (u - 40) / 60)); if (red > 0) { g.lineStyle(1, 0xe63946, red); g.lineBetween(x - 13, y - 2, x - 7, y); g.lineBetween(x + 13, y - 2, x + 7, y); g.lineBetween(x - 12, y + 3, x - 6, y + 1); }
            const dx = Math.sin(this.time.now / 700 + i) * 1.2; g.fillStyle(A.hex(look.eyes || '#2b1b30')).fillCircle(x + dx, y, 7); g.fillStyle(0x1b1230).fillCircle(x + dx, y, 3.5); g.fillStyle(0xffffff).fillRect(x + dx - 3, y - 4, 2, 2);
            if (u > 75) { g.fillStyle(0x6fd0ff, 0.9).fillRect(x - 11, y + 8 + ((this.time.now / 90) % 5), 2, 3); }
            if (look.eyeStyle === 'lash') { g.lineStyle(2, 0x2b1b30).lineBetween(x + (i ? 15 : -15), y - 3, x + (i ? 20 : -20), y - 8); }
          }
          if (glasses) { const gc = A.hex(look.glasses.color || '#1c1c24'); g.lineStyle(3, gc); if (look.glasses.type === 'round') g.strokeCircle(x, y, 19); else g.strokeRect(x - 20, y - 14, 40, 28); }
        });
        if (glasses) { const gc = A.hex(look.glasses.color || '#1c1c24'); g.lineStyle(3, gc).lineBetween(pts[0][0] + 20, pts[0][1], pts[1][0] - 20, pts[1][1]); }
      });
    }
    showDistract(id, mine) {
      const x = mine ? 295 : 105, im = this.add2(this.add.image(x, 60, 'emo_' + id).setScale(3).setScrollFactor(0).setDepth(this.dd + 6));
      this.tweens.add({ targets: im, y: 36, alpha: 0, duration: 1200, onComplete: () => im.destroy() });
    }
    hold() { if (this.phase !== 'stare' || this.over || this.cd > 0) return; this.urge = Math.max(0, this.urge - 6.5); G.audio.sfx('click'); }
    onPartnerBlink() { if (this.phase !== 'stare' || this.over) return; this.blinkPartner = 1; this.end('me'); }
    end(winner) {
      if (this.over) return; this.over = true;
      if (winner === 'tie') { this.blinkMe = 1; this.blinkPartner = 1; }
      this.drawEyes(); G.audio.sfx(winner === 'me' ? 'win' : 'hit');
      const w = winner === 'me' ? G.state.me.id : winner === 'tie' ? null : G.state.partner.id;
      this.time.delayedCall(900, () => { if (G.net.role === 'host' || G.solo) { if (w) { G.addSoles(w, 10); G.recordWin('olivar', w); } mg.send('o2_res', { w: w || 'tie' }); this.showResult(w || 'tie', false); } });
    }
    showResult(w, remote) {
      if (this.phase === 'over') return; this.phase = 'over'; this.over = true; this.clear(); const add = o => this.add2(o), D = 9100;
      add(this.add.rectangle(W / 2, H / 2, W, H, 0x120a22, 0.9).setScrollFactor(0).setDepth(D));
      mg.panel(this, o => { o.setScrollFactor(0); return add(o); }, 70, 40, 260, 140, D + 1);
      const txt = w === 'tie' ? '¡Empate! Pestañearon a la vez 😳' : '¡Gana ' + mg.nameOf(w) + '!\n(+S/ 10)';
      add(this.add.text(200, 56, '👁 RESULTADO', { fontFamily: 'VT323', fontSize: '18px', color: '#ffd24a' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 3));
      add(this.add.text(200, 92, txt, { fontFamily: 'VT323', fontSize: '22px', color: '#fff3d6', align: 'center' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D + 3));
      mg.btn(this, o => { o.setScrollFactor(0); return add(o); }, 140, 156, 100, 20, 'Revancha', 0x7fd1ae, () => { mg.send('o2_again', {}); this.openLobby(false); }, D + 3, 14);
      mg.btn(this, o => { o.setScrollFactor(0); return add(o); }, 262, 156, 100, 20, 'Al parque', 0xff7aa8, () => { this.phase = 'walk'; this.clear(); this.cameras.main.startFollow(this.actors.me.spr, true, 0.12, 0.12); }, D + 3, 14);
    }

    update(time, dt) {
      if (this.phase === 'stare') { this.updateStare(dt / 1000); return; }
      const me = this.actors.me, K = this.keys, typing = G.typing || G.modalOpen || this.phase !== 'walk';
      let vx = 0, vy = 0;
      if (!typing) { if (K.left.isDown || K.a.isDown) vx -= 1; if (K.right.isDown || K.d.isDown) vx += 1; if (K.up.isDown || K.w.isDown) vy -= 1; if (K.down.isDown || K.s.isDown) vy += 1; }
      me.moving = !!(vx || vy);
      if (me.moving) { const len = Math.hypot(vx, vy), st = SPEED * dt / 1000; me.x = Phaser.Math.Clamp(me.x + vx / len * st, this.bounds.x0, this.bounds.x1); me.y = Phaser.Math.Clamp(me.y + vy / len * st, this.bounds.y0, this.bounds.y1); me.dir = Math.abs(vx) >= Math.abs(vy) && vx ? (vx < 0 ? 'l' : 'r') : (vy < 0 ? 'u' : 'd'); me.t += dt; } else me.t += dt * 0.3;
      const pa = this.actors.partner; pa.x += (pa.tx - pa.x) * 0.25; pa.y += (pa.ty - pa.y) * 0.25; pa.t += pa.moving ? dt : dt * 0.3;
      this.render(me); this.render(pa);
      this.sendT += dt; if (this.sendT > 70) { this.sendT = 0; this.sendPos(); }
      const nb = !typing && this.nearBench(); if (nb) this.prompt.setText('E / Espacio: sentarse en la banquita (Mirada fija)').setVisible(true); else this.prompt.setVisible(false);
    }
    updateStare(dt) {
      this.hud.clear(); const D = this.dd;
      if (this.cd > 0) { this.cd -= dt; this.msg.setText(this.cd > 0 ? 'Prepárense… ' + Math.ceil(this.cd) : '¡Miren!'); this.drawEyes(); this.drawBars(); return; }
      if (this.over) { this.drawEyes(); this.drawBars(); return; }
      this.t += dt; this.msg.setText('¡No pestañees!  Toca ESPACIO');
      const rate = 5 + Math.min(10, this.t * 0.22); this.urge += rate * dt;
      this.nextEv -= dt; if (this.nextEv <= 0) { this.nextEv = 4 + this.rng() * 5; const k = Math.floor(this.rng() * 3); this.urge += 12 + this.rng() * 8; this.msg.setText(['¡Una ráfaga de viento! 💨', '¡Una pelusa! 🐛', '¡Hay luciérnagas! ✨'][k]); }
      // la pareja simulada (modo solo)
      if (G.solo) { this.pUrge = Math.min(99, (this.pUrge || 0) + (6 + Math.min(9, this.t * 0.2)) * dt - (Q.get('oauto') ? 0 : 0)); if (Math.random() < 0.03) this.pUrge = Math.max(0, this.pUrge - 9); if (this.t > this.botBlink && Q.get('oauto')) this.onPartnerBlink(); else if (this.pUrge >= 100) this.onPartnerBlink(); }
      if (Q.get('oauto') && G.solo) this.urge = Math.max(0, this.urge - 20 * dt);
      this.sendU += dt; if (this.sendU > 0.2) { this.sendU = 0; mg.send('o2_urge', { u: Math.round(this.urge) }); }
      if (this.urge >= 100) { this.blinkMe = 1; mg.send('o2_blink', {}); this.end('partner'); }
      this.drawEyes(); this.drawBars();
    }
    drawBars() {
      const g = this.hud, D = this.dd; g.fillStyle(0x2b1b30, 0.9).fillRoundedRect(25, 196, 150, 18, 4).fillRoundedRect(225, 196, 150, 18, 4);
      const u = Math.min(100, this.urge || 0); g.fillStyle(u > 70 ? 0xe63946 : u > 40 ? 0xf4a259 : 0x7fd1ae).fillRect(28, 199, 144 * u / 100, 12);
      g.fillStyle(0x6b6478).fillRect(228, 199, 144, 12); const pu = Math.min(100, this.pUrge || 0); g.fillStyle(pu > 70 ? 0xe63946 : pu > 40 ? 0xf4a259 : 0x7fd1ae).fillRect(228, 199, 144 * pu / 100, 12);
      if (!this.hudT) { this.hudT = [this.add2(this.add.text(100, 205, 'tus ganas de pestañear', { fontFamily: 'VT323', fontSize: '11px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 6)), this.add2(this.add.text(300, 205, 'las de tu pareja (se le notan)', { fontFamily: 'VT323', fontSize: '11px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(D + 6))]; }
    }
  }
  function night2(n) { return n ? 0x0a1038 : 0x3f6fb0; }
  G.OlivarScene = OlivarScene;
})();
