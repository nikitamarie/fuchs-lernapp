/* Vorlesen: zuerst mit der eingebauten Stimme des Tablets (kostenlos, offline).
   Bleibt die stumm (passiert auf manchen älteren iPads / Home-Bildschirm-Apps),
   wird automatisch eine Online-Stimme genommen. */
F.speech = {
  voices: [],
  voice: null,
  _u: null,          // Referenz behalten, sonst feuert "onend" auf manchen Geräten nicht
  _timer: null,
  _token: 0,
  status: '',
  supported: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',
  audio: null,

  init: function () {
    var self = this;
    try { this.audio = new Audio(); this.audio.preload = 'auto'; } catch (e) { this.audio = null; }
    if (this.supported) {
      var load = function () {
        try { self.voices = window.speechSynthesis.getVoices() || []; } catch (e) { self.voices = []; }
        self.voice = self.pickVoice();
      };
      load();
      if ('onvoiceschanged' in window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
      setTimeout(load, 800);
      setTimeout(load, 3000);
    }
    // iOS gibt Ton erst nach der ersten Berührung frei → bei der ersten Berührung leise "freischalten"
    var unlock = function () {
      if (self._unlocked) return;
      self._unlocked = true;
      if (self.supported) {
        try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) {}
      }
      if (self.audio) {
        try {
          self.audio.src = F.speech.SILENT;
          var pr = self.audio.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (e) {}
      }
      document.removeEventListener('touchend', unlock, true);
      document.removeEventListener('click', unlock, true);
    };
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('click', unlock, true);
  },

  /* sehr kurze stille WAV-Datei zum Freischalten */
  SILENT: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',

  germanVoices: function () {
    return this.voices.filter(function (v) { return /^de([-_]|$)/i.test(v.lang); });
  },

  pickVoice: function () {
    var de = this.germanVoices();
    if (!de.length) return null;
    var wanted = F.state.settings.voiceName;
    var i;
    if (wanted) for (i = 0; i < de.length; i++) if (de[i].name === wanted) return de[i];
    var prefer = ['Anna', 'Helena', 'Petra', 'Markus', 'Google Deutsch', 'Katja'];
    for (var p = 0; p < prefer.length; p++) {
      for (i = 0; i < de.length; i++) if (de[i].name.indexOf(prefer[p]) >= 0 && /de-DE/i.test(de[i].lang)) return de[i];
    }
    for (i = 0; i < de.length; i++) if (/de-DE/i.test(de[i].lang)) return de[i];
    return de[0];
  },

  /* 'auto' (Gerät, bei Stille online), 'geraet' oder 'online' */
  mode: function () { return F.state.settings.ttsMode || 'auto'; },
  useOnline: function () {
    var m = this.mode();
    if (m === 'online') return true;
    if (m === 'geraet') return false;
    return !this.supported || !!F.state.settings.ttsDeviceFailed;
  },

  mark: function (on) {
    F.$$('.speak-btn').forEach(function (b) { b.className = on ? 'speak-btn speaking' : 'speak-btn'; });
  },

  /* liest Text vor; das Promise ist erfüllt, wenn fertig gesprochen wurde */
  speak: function (text, opts) {
    opts = opts || {};
    if (!text) return Promise.resolve();
    this.stop();
    var token = ++this._token;
    if (this.useOnline()) return this.speakOnline(text, opts, token);
    return this.speakDevice(text, opts, token, false);
  },

  speakDevice: function (text, opts, token, noVoice) {
    var self = this;
    return new Promise(function (resolve) {
      var synth = window.speechSynthesis;
      if (!self.voice) self.voice = self.pickVoice();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      if (self.voice && !noVoice && !F.state.settings.ttsNoVoiceSel) u.voice = self.voice;
      u.rate = opts.rate || F.state.settings.rate || 0.85;
      u.pitch = 1;
      u.volume = 1;
      var done = false, started = false;
      var finish = function () {
        if (done) return;
        done = true;
        clearTimeout(self._timer);
        clearTimeout(checkTimer);
        if (token === self._token) self.mark(false);
        resolve();
      };
      u.onend = finish;
      u.onerror = function (ev) { self.status = 'Gerätestimme Fehler: ' + ((ev && ev.error) || '?'); finish(); };
      self._u = u;
      self.mark(true);
      var est = 1500 + text.length * 110 / (u.rate || 1);
      self._timer = setTimeout(finish, est + 4000);

      // Prüfen, ob wirklich gesprochen wird – sonst Plan B
      var withVoice = !!u.voice;
      self._pending = { at: Date.now(), started: false, withVoice: withVoice };
      var pend = self._pending;
      u.onstart = function () { started = true; pend.started = true; self.status = 'Gerätestimme spricht ✓'; };
      var checkTimer = setTimeout(function () {
        if (done || token !== self._token) return;
        if (started || synth.speaking) return;
        done = true;
        clearTimeout(self._timer);
        try { synth.cancel(); } catch (e) {}
        var plan = self.registerFailure(withVoice);
        if (plan === 'novoice') {
          self.speakDevice(text, opts, token, true).then(resolve);
        } else if (plan === 'online') {
          self.speakOnline(text, opts, token).then(resolve);
        } else {
          if (token === self._token) self.mark(false);
          resolve();
        }
      }, 2000);

      try {
        if (synth.paused) synth.resume();
        synth.speak(u);
      } catch (e) { finish(); }
    });
  },

  /* Online-Stimme (braucht Internet): spielt Text in kurzen Stücken als Audio ab */
  speakOnline: function (text, opts, token) {
    var self = this;
    var parts = this.splitForOnline(String(text));
    var rate = opts.rate || F.state.settings.rate || 0.85;
    self.mark(true);
    var i = 0;
    return new Promise(function (resolve) {
      var finishAll = function () { if (token === self._token) self.mark(false); resolve(); };
      var playNext = function () {
        if (token !== self._token || i >= parts.length) { finishAll(); return; }
        var a = self.audio || new Audio();
        var ended = false;
        var safety = setTimeout(function () { done(); }, 15000 + parts[i].length * 150);
        var done = function () {
          if (ended) return;
          ended = true;
          clearTimeout(safety);
          a.onended = a.onerror = null;
          i++;
          playNext();
        };
        a.onended = done;
        a.onerror = function () { self.status = 'Online-Stimme: kein Ton (Internet?)'; done(); };
        a.src = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=de&q=' + encodeURIComponent(parts[i]);
        try { a.playbackRate = Math.max(0.6, Math.min(1.2, rate + 0.05)); } catch (e) {}
        var pr = a.play();
        if (pr && pr.then) {
          pr.then(function () {
            self.status = 'Online-Stimme spricht ✓';
            try { a.playbackRate = Math.max(0.6, Math.min(1.2, rate + 0.05)); } catch (e) {}
          }, function (err) {
            self.status = 'Online-Stimme blockiert: ' + ((err && err.name) || '') + ' – bitte nochmal auf 🔊 tippen';
            ended = true; clearTimeout(safety); finishAll();
          });
        }
      };
      playNext();
    });
  },

  splitForOnline: function (text) {
    var out = [];
    F.splitSentences(text).forEach(function (s) {
      while (s.length > 180) {
        var cut = s.lastIndexOf(',', 180);
        if (cut < 40) cut = s.lastIndexOf(' ', 180);
        if (cut < 1) cut = 180;
        out.push(s.slice(0, cut + 1).trim());
        s = s.slice(cut + 1).trim();
      }
      if (s) out.push(s);
    });
    return out.length ? out : [text];
  },

  /* Gerätestimme blieb stumm → merken, was als Nächstes probiert wird */
  registerFailure: function (withVoice) {
    var st = F.state.settings;
    if (withVoice && !st.ttsNoVoiceSel) {
      st.ttsNoVoiceSel = true; F.save();
      this.status = 'Gerätestimme stumm – versuche Standardstimme';
      return 'novoice';
    }
    if (this.mode() === 'auto') {
      st.ttsDeviceFailed = true; F.save();
      this.status = 'Gerätestimme stumm – nutze Online-Stimme';
      return 'online';
    }
    this.status = 'Gerätestimme bleibt stumm';
    return '';
  },

  stop: function () {
    var p = this._pending;
    this._pending = null;
    if (p && !p.started && Date.now() - p.at > 1800 && !this.useOnline()) {
      try { if (!window.speechSynthesis.speaking) this.registerFailure(p.withVoice); } catch (e) {}
    }
    this._token++;
    clearTimeout(this._timer);
    if (this.supported) {
      try {
        var synth = window.speechSynthesis;
        if (synth.speaking || synth.pending) synth.cancel();
      } catch (e) {}
    }
    if (this.audio) { try { this.audio.pause(); } catch (e) {} }
    this.mark(false);
  },

  /* Satzzeichen für die Ansage in Worte fassen */
  punctWord: function (ch) {
    return { ',': 'Komma', '.': 'Punkt', '?': 'Fragezeichen', '!': 'Ausrufezeichen', ':': 'Doppelpunkt' }[ch] || '';
  }
};

/* Text in Sätze teilen (ohne Lookbehind-Regex, wegen alter Safari-Versionen) */
F.splitSentences = function (text) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  var parts = t.match(/[^.!?]+[.!?]+["“”»«']?|[^.!?]+$/g) || [t];
  return parts.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
};

/* Satz in kurze Diktat-Abschnitte teilen: an Kommas und nach ca. 3–4 Wörtern */
F.chunkSentence = function (sentence) {
  var words = sentence.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return [sentence];
  var chunks = [];
  var cur = [];
  for (var i = 0; i < words.length; i++) {
    cur.push(words[i]);
    var endsComma = /[,;:]["“”»«']?$/.test(words[i]);
    var remaining = words.length - i - 1;
    if ((endsComma && cur.length >= 2) || (cur.length >= 4 && remaining !== 1) || (cur.length >= 5)) {
      chunks.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) {
    if (cur.length === 1 && chunks.length) chunks[chunks.length - 1] += ' ' + cur[0];
    else chunks.push(cur.join(' '));
  }
  return chunks;
};

/* Text zum Sprechen vorbereiten: Anführungszeichen weg, optional Satzzeichen ansagen */
F.speakable = function (text, sayPunct) {
  var t = String(text).replace(/["“”„»«]/g, '');
  if (!sayPunct) return t;
  return t.replace(/\s*([,.?!:])/g, function (m, p) { return ', ' + F.speech.punctWord(p) + '. '; });
};
