/* Kern: Speicher, Navigation, Hilfsfunktionen, Belohnungen.
   Bewusst einfaches JavaScript (ohne ?. und ??), damit ältere iPads mitkommen. */
var F = window.F = {};
F.VERSION = '9';  /* bei jedem Update hochzählen (auch in index.html und sw.js) */

/* ---------------- Speicher ---------------- */
F.STORE_KEY = 'fuchsapp_v1';

F.defaultState = function () {
  return {
    version: 1,
    profile: { foxName: '', kidName: '', bundesland: 'Niedersachsen', alter: 8, klasse: 3, schulform: 'Grundschule' },
    settings: {
      apiKey: '',
      model: '',
      pin: '',
      rate: 0.85,
      voiceName: '',
      showText: false,
      speakPunct: false,
      sound: true
    },
    tore: 0,
    diktate: [],     // {id, titel, art, text, woerter[], created}
    checks: [],      // {id, diktatId, date, erkannt, woerterGesamt, fehler[], lob, muster}
    trainWords: [],  // {wort, tipp, kategorie, added, richtigInFolge, gesehen}
    notes: [],       // {id, fach, titel, text, beispiel, created, quelle}
    packs: [],       // {id, fach, titel, aufgaben[], created}
    exams: [],       // {id, fach, titel, datum}
    arbeiten: [],    // echte, korrigierte Klassenarbeiten
    awards: {},      // Auszeichnungen {id: {n, last}}
    mathe: { geloest: 0 },
    stats: { runden: 0 }
  };
};

F.load = function () {
  var s = null;
  try { s = JSON.parse(localStorage.getItem(F.STORE_KEY) || 'null'); } catch (e) { s = null; }
  var d = F.defaultState();
  if (!s) return d;
  // fehlende Felder ergänzen (für spätere Versionen)
  for (var k in d) { if (!(k in s)) s[k] = d[k]; }
  for (var k2 in d.settings) { if (!(k2 in s.settings)) s.settings[k2] = d.settings[k2]; }
  for (var k3 in d.profile) { if (!(k3 in s.profile)) s.profile[k3] = d.profile[k3]; }
  return s;
};

F.save = function () {
  try {
    localStorage.setItem(F.STORE_KEY, JSON.stringify(F.state));
    return true;
  } catch (e) {
    F.toast('Speichern hat nicht geklappt – ist der Speicher voll?');
    return false;
  }
};

F.state = F.load();

/* ---------------- Hilfsfunktionen ---------------- */
F.esc = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
F.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
F.rand = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
F.randInt = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
F.shuffle = function (arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
F.$ = function (sel, root) { return (root || document).querySelector(sel); };
F.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
F.today = function () {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
};
F.daysUntil = function (iso) {
  var p = iso.split('-');
  var target = new Date(+p[0], +p[1] - 1, +p[2]);
  var now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
};
F.formatDate = function (iso) {
  if (!iso) return '';
  var p = iso.slice(0, 10).split('-');
  var tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var d = new Date(+p[0], +p[1] - 1, +p[2]);
  return tage[d.getDay()] + ', ' + (+p[2]) + '.' + (+p[1]) + '.';
};

F.hideToast = function () {
  clearTimeout(F._toastTimer);
  var t = document.getElementById('toast');
  if (t) t.className = 'toast';
};
F.toast = function (msg, ms) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show';
  clearTimeout(F._toastTimer);
  F._toastTimer = setTimeout(function () { t.className = 'toast'; }, ms || 2800);
};

F.fox = function () { return F.state.profile.foxName || 'Fuchs'; };

F.SUBJECTS = [
  { id: 'deutsch', name: 'Deutsch', emoji: '📖' },
  { id: 'mathe', name: 'Mathe', emoji: '🔢' },
  { id: 'sachunterricht', name: 'Sachunterricht', emoji: '🌱' },
  { id: 'englisch', name: 'Englisch', emoji: '🇬🇧' },
  { id: 'religion', name: 'Religion', emoji: '🕊️' }
];
F.subject = function (id) {
  for (var i = 0; i < F.SUBJECTS.length; i++) if (F.SUBJECTS[i].id === id) return F.SUBJECTS[i];
  return { id: id, name: id, emoji: '📚' };
};

/* ---------------- Navigation ---------------- */
F.views = {};
F.history = [];
F.current = null;

F.go = function (name, params, opts) {
  opts = opts || {};
  if (F.speech) F.speech.stop();
  F.hideToast();
  if (F.current && !opts.replace) F.history.push(F.current);
  F.current = { name: name, params: params || {} };
  F.render();
  window.scrollTo(0, 0);
};
F.back = function () {
  if (F.speech) F.speech.stop();
  var prev = F.history.pop();
  F.current = prev || { name: 'home', params: {} };
  F.render();
  window.scrollTo(0, 0);
};
F.home = function () {
  F.history = [];
  F.current = null;
  F.go('home');
};

F.render = function () {
  var v = F.views[F.current.name];
  var app = document.getElementById('app');
  if (!v) { app.innerHTML = '<p>Seite nicht gefunden.</p>'; return; }
  F.afterRender = null;
  var out = v(F.current.params);
  if (typeof out === 'string') app.innerHTML = out;
  // z. B. automatisches Vorlesen – direkt im selben Antippen, sonst bleibt iOS stumm
  var after = F.afterRender;
  F.afterRender = null;
  if (after) after();
};

/* Kopfzeile mit Zurück-Knopf */
F.topbar = function (title, opts) {
  opts = opts || {};
  var back = opts.noBack ? '<span class="spacer"></span>' :
    '<button class="back-btn" data-action="back" aria-label="Zurück">‹</button>';
  var right = opts.home !== false ? '<button class="back-btn" data-action="home" aria-label="Startseite">🏠</button>' : '<span class="spacer"></span>';
  return '<div class="topbar">' + back + '<div class="title">' + F.esc(title) + '</div>' + right + '</div>';
};

/* Ereignisse: alle Klicks auf [data-action] laufen hier zusammen */
F.actions = {
  back: function () { F.back(); },
  home: function () { F.home(); },
  go: function (el) {
    var p = {};
    if (el.getAttribute('data-params')) { try { p = JSON.parse(el.getAttribute('data-params')); } catch (e) {} }
    F.go(el.getAttribute('data-view'), p);
  },
  goReplace: function (el) {
    var p = {};
    if (el.getAttribute('data-params')) { try { p = JSON.parse(el.getAttribute('data-params')); } catch (e) {} }
    F.go(el.getAttribute('data-view'), p, { replace: true });
  }
};
document.addEventListener('click', function (ev) {
  var el = ev.target;
  while (el && el !== document) {
    if (el.getAttribute && el.getAttribute('data-action')) {
      var name = el.getAttribute('data-action');
      var fn = F.actions[name];
      if (fn) { ev.preventDefault(); fn(el, ev); }
      return;
    }
    el = el.parentNode;
  }
});

F.goBtn = function (view, params, inner, cls, replace) {
  return '<button class="' + (cls || 'btn') + '" data-action="' + (replace ? 'goReplace' : 'go') + '" data-view="' + view + '" data-params="' +
    F.esc(JSON.stringify(params || {})) + '">' + inner + '</button>';
};
/* wie goBtn, ersetzt aber die aktuelle Seite (z. B. nach einer Runde) */
F.goBtnR = function (view, params, inner, cls) { return F.goBtn(view, params, inner, cls, true); };

/* ---------------- Belohnungen: Tore & Kickbox-Gürtel ---------------- */
F.BELTS = [
  { min: 0, name: 'Weißer Gürtel', color: '#ffffff', text: '#3f2270' },
  { min: 25, name: 'Gelber Gürtel', color: '#ffe066', text: '#4a3b00' },
  { min: 70, name: 'Orangener Gürtel', color: '#ffa94d', text: '#4a2400' },
  { min: 140, name: 'Grüner Gürtel', color: '#69db7c', text: '#0f3d1a' },
  { min: 240, name: 'Blauer Gürtel', color: '#74c0fc', text: '#06304d' },
  { min: 380, name: 'Lila Gürtel', color: '#b197fc', text: '#2a1060' },
  { min: 560, name: 'Brauner Gürtel', color: '#c08457', text: '#ffffff' },
  { min: 800, name: 'Schwarzer Gürtel', color: '#222222', text: '#ffffff' }
];
F.beltFor = function (tore) {
  var b = F.BELTS[0];
  for (var i = 0; i < F.BELTS.length; i++) if (tore >= F.BELTS[i].min) b = F.BELTS[i];
  return b;
};
F.nextBelt = function (tore) {
  for (var i = 0; i < F.BELTS.length; i++) if (tore < F.BELTS[i].min) return F.BELTS[i];
  return null;
};
F.beltHtml = function (tore) {
  var b = F.beltFor(tore);
  return '<span class="belt" style="background:' + b.color + ';color:' + b.text + '">🥋 ' + F.esc(b.name) + '</span>';
};
/* gibt den neuen Gürtel zurück, falls einer erreicht wurde */
F.addTore = function (n) {
  var before = F.beltFor(F.state.tore);
  F.state.tore += n;
  F.save();
  var after = F.beltFor(F.state.tore);
  return after.name !== before.name ? after : null;
};

/* sanfte, ermutigende Sätze */
F.LOB = ['Super gemacht!', 'Klasse!', 'Tor! ⚽', 'Stark!', 'Genau richtig!', 'Wow, toll!', 'Volltreffer!', 'Prima!'];
F.FAST = ['Fast geschafft – lass uns kurz schauen!', 'Knapp daneben – schau mal genau:', 'Fast! So geht es:', 'Gute Idee – nur ein kleines Stück fehlt:'];

/* Bewegungspausen zwischen den Runden */
F.PAUSEN = [
  { e: '🥊', t: 'Mach 3 schnelle Kickbox-Schläge in die Luft!' },
  { e: '🦵', t: 'Mach 2 Kicks nach vorne – erst rechts, dann links!' },
  { e: '🤾‍♀️', t: 'Wirf 3 unsichtbare Handbälle ins Tor!' },
  { e: '🦊', t: 'Streck dich ganz lang wie ein Fuchs nach dem Aufwachen!' },
  { e: '🐶', t: 'Schüttel dich wie ein nasser Hund!' },
  { e: '🐸', t: 'Mach 5 Froschsprünge!' },
  { e: '🌬️', t: 'Atme 3-mal tief ein und ganz langsam aus.' },
  { e: '🙆‍♀️', t: 'Kreise 5-mal mit den Schultern nach hinten.' }
];

/* Abschluss-Bildschirm einer Runde: Tore, Gürtel, Bewegungspause */
F.finishRound = function (opts) {
  var newBelt = F.addTore(opts.tore || 0);
  F.state.stats.runden = (F.state.stats.runden || 0) + 1;
  F.save();
  F.go('roundDone', {
    titel: opts.titel || 'Runde geschafft!',
    text: opts.text || '',
    tore: opts.tore || 0,
    belt: newBelt ? newBelt.name : '',
    again: opts.again || null,
    extraHtml: opts.extraHtml || ''
  }, { replace: true });
};

F.views.roundDone = function (p) {
  var pause = F.rand(F.PAUSEN);
  var next = F.nextBelt(F.state.tore);
  var html = '<div class="celebrate">' +
    '<div class="big pop">' + (p.belt ? '🥋' : '🏆') + '</div>' +
    '<h1>' + F.esc(p.titel) + '</h1>' +
    (p.text ? '<p>' + F.esc(p.text) + '</p>' : '') +
    (p.tore ? '<p class="tore" style="font-size:1.3rem">+' + p.tore + ' Tore ⚽ &nbsp; (zusammen: ' + F.state.tore + ')</p>' : '') +
    (p.belt ? '<div class="card fuchs"><h2>Neuer Gürtel!</h2><p style="font-size:1.3rem">Du hast jetzt den <b>' + F.esc(p.belt) + '</b>! ' + F.esc(F.fox()) + ' ist sooo stolz auf dich! 🦊</p></div>' : '') +
    (next && !p.belt ? '<p class="muted">Noch ' + (next.min - F.state.tore) + ' Tore bis zum ' + F.esc(F.beltDativ(next.name)) + '.</p>' : '') +
    '</div>' + (p.extraHtml || '') +
    '<div class="card soft center"><div style="font-size:3rem">' + pause.e + '</div>' +
    '<h3>Bewegungspause</h3><p style="font-size:1.2rem">' + F.esc(pause.t) + '</p></div>' +
    '<div class="btn-row">' +
    (p.again ? F.goBtnR(p.again.view, p.again.params, 'Noch eine Runde 💪', 'btn big fuchs') : '') +
    '<button class="btn big light" data-action="back">Fertig</button>' +
    '</div>';
  return F.topbar('', { noBack: true, home: true }) + html;
};

/* ---------------- Fotos auswählen & verkleinern ---------------- */
/* Liest Bild-Dateien, verkleinert sie (spart Daten und KI-Kontingent) und gibt
   [{data: base64 ohne Präfix, url: dataURL}] zurück. */
F.readImages = function (fileList, maxSide) {
  maxSide = maxSide || 1400;
  var files = Array.prototype.slice.call(fileList || []);
  return Promise.all(files.map(function (file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Foto konnte nicht gelesen werden.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('Dieses Bildformat geht leider nicht.')); };
        img.onload = function () {
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          var scale = Math.min(1, maxSide / Math.max(w, h));
          var c = document.createElement('canvas');
          c.width = Math.round(w * scale); c.height = Math.round(h * scale);
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var url = c.toDataURL('image/jpeg', 0.75);
          if (url.length < 2000) { reject(new Error('Das Foto konnte nicht verarbeitet werden. Bitte nochmal fotografieren.')); return; }
          resolve({ url: url, data: url.split(',')[1] });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }));
};

/* Alle Fotos zusammen klein genug halten (ältere iPads/WLAN brechen große Uploads gern ab) */
F.shrinkImage = function (im, maxSide, q) {
  return new Promise(function (resolve) {
    var img = new Image();
    img.onerror = function () { resolve(im); };
    img.onload = function () {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      var scale = Math.min(1, maxSide / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      var url = c.toDataURL('image/jpeg', q);
      resolve(url.length > 2000 ? { url: url, data: url.split(',')[1] } : im);
    };
    img.src = im.url;
  });
};
F.fitImages = function (imgs) {
  var total = function (list) { return list.reduce(function (n, im) { return n + im.data.length; }, 0); };
  if (!imgs.length || total(imgs) < 2500000) return Promise.resolve(imgs);
  var side = imgs.length > 3 ? 1000 : 1200;
  return Promise.all(imgs.map(function (im) { return F.shrinkImage(im, side, 0.65); }));
};

/* Fehler der KI auf der Foto-Seite sichtbar anzeigen (statt nur kurz als Meldung) */
F.lastAiError = null;
F.showAiError = function (e) {
  F.lastAiError = e;
  F.render();
  window.scrollTo(0, 0);
};
F.aiErrorHtml = function () {
  var e = F.lastAiError;
  if (!e) return '';
  F.lastAiError = null;
  return '<div class="card hinweis"><p><b>😕 ' + F.esc(e.message) + '</b></p>' +
    (e.timeout ? '<p>Tipp: Weniger Fotos auf einmal hochladen (z. B. eine Seite nach der anderen) und die App währenddessen offen lassen.</p>' : '') +
    (e.network ? '<p>Tipp: Bitte die App beim Warten offen lassen und den Bildschirm nicht sperren. Dann einfach nochmal auf den Knopf tippen.</p>' : '') +
    '<p class="small muted">Für Eltern: ' + F.esc([e.status || '', e.detail || '', F.state.settings.model || ''].join(' ').trim()) + ' · Version ' + F.VERSION + '</p></div>';
};

/* Wiederverwendbarer Foto-Baustein: Knopf + Vorschau. Fotos landen in F.pendingImages[key]. */
F.pendingImages = {};
F.photoPicker = function (key, label) {
  var imgs = F.pendingImages[key] || [];
 var thumbs = imgs.map(function (im) { return '<img src="' + im.url + '" alt="Foto">'; }).join('');
  return F.aiErrorHtml() + '<div class="thumbs" id="thumbs-' + key + '">' + thumbs + '</div>' +
    '<div class="btn-row">' +
    '<label class="btn big fuchs file-btn">📷 ' + F.esc(label || 'Foto machen oder auswählen') +
    '<input type="file" accept="image/*" multiple data-photo-key="' + key + '"></label>' +
    (imgs.length ? '<button class="btn big light" data-action="clearPhotos" data-key="' + key + '">Fotos löschen</button>' : '') +
    '</div>' +
    '<p class="muted small">Tipp: Seite gerade und hell fotografieren. Mehrere Seiten gehen auch. ' +
    'Bitte keine Namen oder Gesichter mit aufs Foto.</p>';
};
document.addEventListener('change', function (ev) {
  var el = ev.target;
  var key = el.getAttribute && el.getAttribute('data-photo-key');
  if (!key) return;
  if (!el.files || !el.files.length) return;
  F.toast('Fotos werden vorbereitet …', 1500);
  F.readImages(el.files).then(function (imgs) {
    F.pendingImages[key] = (F.pendingImages[key] || []).concat(imgs);
    F.render();
  }).catch(function (e) { F.toast(e.message); });
});
F.actions.clearPhotos = function (el) {
  F.pendingImages[el.getAttribute('data-key')] = [];
  F.render();
};

/* Lade-Bildschirm während die KI arbeitet */
F.loadingHtml = function (title, text) {
  var start = Date.now();
  clearInterval(F._loadTimer);
  F._loadTimer = setInterval(function () {
    var el = document.getElementById('loadSec');
    if (!el) { clearInterval(F._loadTimer); return; }
    el.textContent = Math.round((Date.now() - start) / 1000);
  }, 1000);
  return F.topbar(title, { noBack: true, home: false }) +
    '<div class="card center"><div class="big-emoji" style="font-size:4rem">🦊</div>' +
    '<div class="spinner"></div><h2>' + F.esc(text || (F.fox() + ' schaut sich die Fotos an …')) + '</h2>' +
    '<p class="muted">Das kann bis zu einer Minute dauern (<span id="loadSec">0</span> s).<br>' +
    '<b>Bitte die App offen lassen und den Bildschirm nicht sperren.</b></p></div>';
};

/* "Gelber Gürtel" → "zum Gelben Gürtel" */
F.beltDativ = function (name) { return name.replace(/er Gürtel$/, 'en Gürtel'); };

/* Angaben zur Schule – für passende Aufgaben (Bundesland, Alter, Klasse) */
F.BUNDESLAENDER = ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
  'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'];
F.SCHULFORMEN = ['Grundschule', 'Oberschule', 'Gesamtschule', 'Realschule', 'Hauptschule', 'Gymnasium', 'Förderschule'];
F.schoolLine = function () {
  var p = F.state.profile;
  return F.esc((p.bundesland || 'Niedersachsen') + ' · ' + (p.alter || 8) + ' Jahre · Klasse ' + (p.klasse || 3) + ' · ' + (p.schulform || 'Grundschule'));
};
F.schoolFormHtml = function () {
  var p = F.state.profile;
  var opt = function (list, cur) { return list.map(function (x) { return '<option ' + (String(x) === String(cur) ? 'selected' : '') + '>' + F.esc(x) + '</option>'; }).join(''); };
  var nums = function (a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; };
  return '<label class="field"><span>Bundesland</span><select id="scLand">' + opt(F.BUNDESLAENDER, p.bundesland || 'Niedersachsen') + '</select></label>' +
    '<div class="btn-row"><label class="field" style="flex:1 1 140px;margin-right:10px"><span>Alter</span><select id="scAlter">' + opt(nums(5, 16), p.alter || 8) + '</select></label>' +
    '<label class="field" style="flex:1 1 140px;margin-right:10px"><span>Klasse</span><select id="scKlasse">' + opt(nums(1, 10), p.klasse || 3) + '</select></label>' +
    '<label class="field" style="flex:2 1 200px"><span>Schulform</span><select id="scForm">' + opt(F.SCHULFORMEN, p.schulform || 'Grundschule') + '</select></label></div>';
};
F.readSchoolForm = function () {
  var p = F.state.profile;
  if (!F.$('#scLand')) return;
  p.bundesland = F.$('#scLand').value;
  p.alter = parseInt(F.$('#scAlter').value, 10);
  p.klasse = parseInt(F.$('#scKlasse').value, 10);
  p.schulform = F.$('#scForm').value;
  F.save();
};
