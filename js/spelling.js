/* Rechtschreib-Helfer: typische Verwechslungen erzeugen (für Auswahl-Aufgaben),
   schwierige Wörter erkennen und Unterschiede markieren – alles ohne KI. */
F.spell = {};

F.spell.VOWELS = 'aeiouäöü';

/* typische Fehlschreibungen eines Wortes (Klasse 3) */
F.spell.variants = function (word) {
  var w = word;
  var out = [];
  var add = function (v, typ) {
    if (v && v !== w && out.every(function (o) { return o.v !== v; })) out.push({ v: v, typ: typ });
  };
  var rep = function (re, by, typ) { if (re.test(w)) add(w.replace(re, by), typ); };

  rep(/ie/, 'i', 'ie');
  rep(/([^e])i([bdfgklmnprstz])(?![bdfgklmnprstz])/, '$1ie$2', 'ie');
  rep(/(ll|mm|nn|ss|tt|pp|ff|rr)/, function (m) { return m[0]; }, 'doppel');
  // Doppelkonsonant nach kurzem Vokal ergänzen (einfache Annahme)
  rep(/([aeiouäöü])([lmnprtf])([aeiouäöü])/i, '$1$2$2$3', 'doppel');
  rep(/ck/, 'k', 'ck');
  rep(/([aeiouäöü])k/, '$1ck', 'ck');
  rep(/tz/, 'z', 'tz');
  rep(/([aeiouäöü])z/, '$1tz', 'tz');
  rep(/ß/, 'ss', 'ss');
  rep(/ss/, 'ß', 'ss');
  rep(/([aeiouäöü])ß/, '$1s', 'ss');
  rep(/([aeouäöü])h([lmnr])/, '$1$2', 'h');
  rep(/äu/, 'eu', 'ae');
  rep(/eu/, 'äu', 'ae');
  rep(/ä/, 'e', 'ae');
  rep(/d$/, 't', 'end');
  rep(/t$/, 'd', 'end');
  rep(/g$/, 'k', 'end');
  rep(/b$/, 'p', 'end');
  rep(/^v/i, function (m) { return m === 'V' ? 'F' : 'f'; }, 'v');
  rep(/^f/i, function (m) { return m === 'F' ? 'V' : 'v'; }, 'v');
  rep(/ei/, 'ai', 'ei');
  rep(/sp/, 'schp', 'sp');
  rep(/st/, 'scht', 'sp');
  // Groß/klein umdrehen
  if (/^[A-ZÄÖÜ]/.test(w)) add(w.charAt(0).toLowerCase() + w.slice(1), 'gross');
  else add(w.charAt(0).toUpperCase() + w.slice(1), 'gross');
  return out;
};

/* 2 plausible falsche Varianten aussuchen (möglichst verschiedene Fehlerarten) */
F.spell.distractors = function (word, n) {
  n = n || 2;
  var vs = F.shuffle(F.spell.variants(word));
  var picked = [], types = {};
  vs.forEach(function (v) { if (picked.length < n && !types[v.typ]) { picked.push(v.v); types[v.typ] = 1; } });
  vs.forEach(function (v) { if (picked.length < n && picked.indexOf(v.v) < 0) picked.push(v.v); });
  // Notlösung: Buchstaben verdoppeln/weglassen
  var guard = 0;
  while (picked.length < n && guard++ < 10) {
    var i = F.randInt(1, Math.max(1, word.length - 1));
    var v2 = word.slice(0, i) + word.charAt(i) + word.slice(i);
    if (v2 !== word && picked.indexOf(v2) < 0) picked.push(v2);
  }
  return picked;
};

/* Ist das Wort "übenswert"? Gibt die Art der Schwierigkeit zurück oder '' */
F.spell.tricky = function (word, isSentenceStart) {
  var w = word;
  if (w.length < 3) return '';
  if (/ie/.test(w)) return 'ie';
  if (/(ll|mm|nn|ss|tt|pp|ff|rr)/.test(w)) return 'Doppelter Mitlaut';
  if (/ck|tz/.test(w)) return 'ck/tz';
  if (/ß/.test(w)) return 'ß';
  if (/[aeouäöü]h[lmnr]/.test(w)) return 'Dehnungs-h';
  if (/ä|äu/.test(w)) return 'ä/äu';
  if (/[dgb]$/.test(w)) return 'Verlängern';
  if (/^[vV]/.test(w)) return 'Merkwort mit V';
  if (!isSentenceStart && /^[A-ZÄÖÜ]/.test(w)) return 'Nomen groß';
  if (w.length >= 8) return 'langes Wort';
  return '';
};

/* aus einem Text die Übungswörter herausholen */
F.spell.wordsFromText = function (text) {
  var res = [], seen = {};
  F.splitSentences(text).forEach(function (s) {
    var words = s.split(/\s+/);
    words.forEach(function (raw, idx) {
      var w = F.spell.clean(raw);
      if (!w || seen[w]) return;
      var t = F.spell.tricky(w, idx === 0);
      if (t) { seen[w] = 1; res.push({ wort: w, art: t }); }
    });
  });
  return res;
};

F.spell.clean = function (raw) {
  return String(raw || '').replace(/^[^A-Za-zÄÖÜäöüß]+|[^A-Za-zÄÖÜäöüß]+$/g, '');
};

/* Unterschied zweier Wörter markieren (Buchstaben-Vergleich) */
F.spell.diffHtml = function (written, correct) {
  var a = written, b = correct;
  var m = a.length, n = b.length;
  var dp = [];
  for (var i = 0; i <= m; i++) { dp.push([]); for (var j = 0; j <= n; j++) dp[i].push(0); }
  for (i = m - 1; i >= 0; i--) for (j = n - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  // markiert in der richtigen Schreibweise die Buchstaben, die gefehlt haben/anders waren
  var outB = '';
  i = 0; j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { outB += F.esc(b[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { i++; }
    else { outB += '<span class="diff-right">' + F.esc(b[j]) + '</span>'; j++; }
  }
  while (j < n) { outB += '<span class="diff-right">' + F.esc(b[j]) + '</span>'; j++; }
  return outB;
};

F.spell.norm = function (s) { return String(s || '').trim().replace(/\s+/g, ' '); };

/* Emoji je Fehlerart */
F.spell.catEmoji = function (k) {
  var map = {
    'Groß/klein': '🔠', 'Doppelter Mitlaut': '👯', 'ie/i': '🎵', 'ck/tz': '🧱', 'ß/ss/s': '🐍', 'Dehnungs-h': '🫧',
    'ä/e oder äu/eu': '🌳', 'b/p, d/t, g/k am Ende': '📏', 'Buchstabe fehlt/vertauscht': '🔍', 'Wort fehlt': '🕳️',
    'Satzzeichen': '⏺️', 'Sonstiges': '✏️'
  };
  return map[k] || '✏️';
};
