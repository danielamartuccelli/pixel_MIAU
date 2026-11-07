/* ===========================================================
   net.js — multijugador peer-to-peer con PeerJS (WebRTC)
   - Uno CREA una sala (código de 5 letras), el otro se UNE con ese código.
   - Gratis, sin servidor propio ni membresías (usa el broker público de PeerJS
     solo para el "saludo" inicial; el juego va directo entre las dos laptops).
   - Si alguien se desconecta: el juego se PAUSA hasta que vuelva.
   Mensajes: {t:'tipo', d:{...}}
   =========================================================== */
(function () {
  const G = window.G;
  /* Los códigos de sala son palabras románticas de 5 letras (sin tildes ni Ñ) */
  const WORDS = ['AMADO', 'AMADA', 'BESOS', 'CIELO', 'MIMOS', 'DULCE', 'NOVIO', 'NOVIA', 'ADORO', 'ADORA', 'DESEO', 'ROSAS', 'BELLA', 'BELLO', 'LINDA', 'LINDO', 'ROMEO', 'CITAS', 'LUNAS', 'AMAME', 'FELIZ', 'ARDOR', 'CALOR', 'LATIR', 'ALMAS', 'GUAPO', 'GUAPA', 'HOGAR', 'UNIDO', 'UNIDA', 'BRISA', 'POEMA', 'CANTO', 'JOYAS', 'BESAR', 'JURAR'];
  const norm = c => String(c || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
  const PREFIX = 'limaduo-';

  function peerOpts() {
    const q = new URLSearchParams(location.search);
    // ?peerhost=localhost&peerport=9000  (solo para pruebas con servidor propio)
    if (q.get('peerhost')) return { host: q.get('peerhost'), port: +q.get('peerport') || 9000, path: q.get('peerpath') || '/', secure: false, debug: 0 };
    return Object.assign({
      debug: 1,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] }
    }, window.PEER_OPTS || {});
  }

  const net = {
    role: null, code: null, peer: null, conn: null, connected: false, ready: false,
    handlers: {}, lastRx: 0, _hb: null, _retry: null, _wasConnected: false,

    newCode() { return WORDS[Math.floor(Math.random() * WORDS.length)]; },
    on(t, f) { (this.handlers[t] = this.handlers[t] || []).push(f); },
    send(t, d) { if (this.conn && this.conn.open) { try { this.conn.send({ t, d }); } catch (e) { console.warn(e); } } },

    /* ---- anfitrión: crea la sala ---- */
    host(code, onReady, onError) {
      this.cleanup(); this.role = 'host'; this.code = code || this.newCode();
      G.state.room = { role: 'host', code: this.code }; G.save();
      const open = (tries) => {
        const p = this.peer = new Peer(PREFIX + this.code.toLowerCase(), peerOpts());
        p.on('open', () => { this.ready = true; onReady && onReady(this.code); });
        p.on('connection', c => this._setConn(c));
        p.on('disconnected', () => { try { p.reconnect(); } catch (e) { } });
        p.on('error', e => {
          if (e.type === 'unavailable-id' && tries < 8) { try { p.destroy(); } catch (x) { } setTimeout(() => open(tries + 1), 2500); return; }
          onError && onError(e);
        });
      };
      open(0);
    },

    /* ---- invitado: se une con el código ---- */
    join(code, onOpen, onError) {
      this.cleanup(); this.role = 'guest'; this.code = norm(code);
      G.state.room = { role: 'guest', code: this.code }; G.save();
      const p = this.peer = new Peer(peerOpts());
      const dial = () => {
        if (this.connected || !this.peer || this.peer.destroyed) return;
        if (this.peer.disconnected) { try { this.peer.reconnect(); } catch (e) { } }
        const c = this.peer.connect(PREFIX + this.code.toLowerCase(), { reliable: true, serialization: 'json' });
        this._setConn(c);
        clearTimeout(this._retry); this._retry = setTimeout(dial, 4000);   // reintenta hasta lograrlo
      };
      p.on('open', () => { this.ready = true; dial(); });
      p.on('disconnected', () => { try { p.reconnect(); } catch (e) { } });
      p.on('error', e => {
        if (e.type === 'peer-unavailable') { onError && onError(e); clearTimeout(this._retry); this._retry = setTimeout(dial, 3000); }
        else onError && onError(e);
      });
      this._onOpen = onOpen;
    },

    _setConn(c) {
      if (this.conn && this.conn !== c && this.conn.open) { try { this.conn.close(); } catch (e) { } }
      this.conn = c;
      c.on('open', () => {
        clearTimeout(this._retry);
        this.connected = true; this.lastRx = Date.now();
        const re = this._wasConnected; this._wasConnected = true;
        this._startHB();
        this._onOpen && this._onOpen(re);
        G.bus.emit('net', { connected: true, reconnect: re });
      });
      c.on('data', m => {
        this.lastRx = Date.now();
        if (!m || !m.t || m.t === 'ping') return;
        (this.handlers[m.t] || []).forEach(f => { try { f(m.d); } catch (e) { console.error(e); } });
      });
      const lost = () => {
        if (this.conn !== c) return;
        if (this.connected) { this.connected = false; G.bus.emit('net', { connected: false }); }
        if (this.role === 'guest') { clearTimeout(this._retry); this._retry = setTimeout(() => this._redial && this._redial(), 2500); }
      };
      c.on('close', lost); c.on('error', lost);
      if (this.role === 'guest') this._redial = () => { if (!this.connected && this.peer && !this.peer.destroyed) { try { this.peer.reconnect(); } catch (e) { } const nc = this.peer.connect(PREFIX + this.code.toLowerCase(), { reliable: true, serialization: 'json' }); this._setConn(nc); this._retry = setTimeout(() => this._redial(), 4000); } };
    },

    _startHB() {
      clearInterval(this._hb);
      this._hb = setInterval(() => {
        this.send('ping', {});
        if (this.connected && Date.now() - this.lastRx > 9000) {     // sin señales -> desconectado
          this.connected = false; G.bus.emit('net', { connected: false });
          try { this.conn.close(); } catch (e) { }
          if (this.role === 'guest' && this._redial) this._redial();
        }
      }, 2500);
    },

    cleanup() {
      clearInterval(this._hb); clearTimeout(this._retry);
      try { this.conn && this.conn.close(); } catch (e) { }
      try { this.peer && this.peer.destroy(); } catch (e) { }
      this.conn = this.peer = null; this.connected = false; this.ready = false; this._wasConnected = false;
    }
  };

  G.net = net;

  window.addEventListener('beforeunload', () => { try { net.conn && net.conn.close(); } catch (e) { } });
})();
