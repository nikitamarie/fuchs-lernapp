/* Vorlesen mit der eingebauten Stimme des Tablets (kostenlos, offline). */
F.speech = {
  voices: [],
  voice: null,
  _u: null,          // Referenz behalten, sonst feuert "onend" auf manchen Geräten nicht
  _timer: null,
  supported: typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined',

  init: function () {
    if (!this.supported) return;
    var self = this;
    var load = function () {
      self.voices = window.speechSynthesis.getVoices() || [];
      self.voice = self.pickVoice();
    };
    load();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    setTimeout(load, 800);
    // iOS gibt die Sprachausgabe erst nach der ersten Berührung frei → leise "freischalten"
    var unlock = function () {
      if (self._unlocked) return;
      self._unlocked = true;
      try {
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch (e) {}
      document.removeEventListener('touchend', unlock, true);
      document.removeEventListener('click', unlock, true);
    };
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('click', unlock, true);
  },

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

  /* liest Text vor; das Promise ist erfüllt, wenn fertig gesprochen wurde */
  speak: function (text, opts) {
    opts = opts || {};
    var self = this;
    return new Promise(function (resolve) {
      if (!self.supported || !text) { resolve(); return; }
      var synth = window.speechSynthesis;
      synth.cancel();
      clearTimeout(self._timer);
      if (!self.voice) self.voice = self.pickVoice();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      if (self.voice) u.voice = self.voice;
      u.rate = opts.rate || F.state.settings.rate || 0.85;
      u.pitch = 1;
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        clearTimeout(self._timer);
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      self._u = u;
      self.speaking = true;
      var mark = function (on) {
        F.$$('.speak-btn').forEach(function (b) { b.className = on ? 'speak-btn speaking' : 'speak-btn'; });
      };
      mark(true);
      var origFinish = finish;
      finish = function () { self.speaking = false; mark(false); origFinish(); };
      u.onend = finish;
      u.onerror = finish;
      // Sicherheitsnetz, falls das Gerät kein "onend" meldet
      var est = 1500 + text.length * 110 / (u.rate || 1);
      self._timer = setTimeout(finish, est + 4000);
      // kleine Verzögerung nach cancel() – sonst verschluckt iOS manchmal den Anfang
      setTimeout(function () { synth.speak(u); }, 60);
    });
  },

  stop: function () {
    if (!this.supported) return;
    clearTimeout(this._timer);
    try { window.speechSynthesis.cancel(); } catch (e) {}
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
