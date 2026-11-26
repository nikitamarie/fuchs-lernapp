/* Großes Übungspaket aus vielen Fotos (oder einer Checkliste):
   1) Fotos in kleinen Gruppen genau abschreiben lassen
   2) Themenplan mit Erklärungen
   3) pro Thema viele neue, abwechslungsreiche Aufgaben (leicht / mittel / schwer)
   Nach jedem Schritt wird gespeichert – bricht etwas ab, kann man später weitermachen.
   Außerdem: Aufgabenauswahl ohne ständige Wiederholungen. */
F.bp = {};

/* ---------------- eine Aufgabe aus der KI-Antwort prüfen und aufbereiten ---------------- */
F.normAufgabe = function (a) {
  if (!a) return null;
  var out;
  if (F.mtask.isMath(a)) out = F.mtask.normalize(a);
  else {
    if (!a.frage || a.antwort == null || String(a.antwort).trim() === '') return null;
    var typ = a.typ === 'auswahl' && a.optionen && a.optionen.length >= 2 ? 'auswahl' : 'eingabe';
    var opts = typ === 'auswahl' ? a.optionen.map(String) : [];
    if (typ === 'auswahl' && opts.indexOf(String(a.antwort)) < 0) opts.push(String(a.antwort));
    out = { typ: typ, frage: String(a.frage), optionen: opts, antwort: String(a.antwort), hilfe: String(a.hilfe || ''),
      erklaerung: String(a.erklaerung || ''), loesungsweg: F.mtask.steps(a), thema: String(a.thema || '') };
  }
  if (!out) return null;
  out.id = out.id || F.uid();
  out.stufe = /leicht|schwer/.test(a.stufe) ? a.stufe : 'mittel';
  if (!out.thema) out.thema = String(a.thema || '');
  return out;
};
/* kurze Beschreibung einer Aufgabe (für "nicht wiederholen" und zum Doppelt-Erkennen) */
F.taskShort = function (a) {
  if (a.typ === 'rechnung') return a.aufgabe;
  if (a.typ === 'paeckchen') return (a.zeilen || []).map(function (z) { return z.aufgabe; }).join(' | ');
  if (a.typ === 'schriftlich') return 'schriftlich ' + a.zahlen.join(' ' + a.operator + ' ');
  return String(a.frage || '').slice(0, 110);
};
F.taskKey = function (a) { return F.taskShort(a).toLowerCase().replace(/\s+/g, ' ').trim(); };

/* ---------------- Fortschritts-Anzeige ---------------- */
F.bp.show = function (title, steps, note) {
  var start = F.bp._start || Date.now();
  F.bp._start = start;
  clearInterval(F._loadTimer);
  F._loadTimer = setInterval(function () {
    var el = document.getElementById('loadSec');
    if (!el) { clearInterval(F._loadTimer); return; }
    var s = Math.round((Date.now() - start) / 1000);
    el.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }, 1000);
  document.getElementById('app').innerHTML = F.topbar(title, { noBack: true, home: false }) +
    '<div class="card center"><div style="font-size:3.5rem">🦊</div><div class="spinner"></div>' +
    '<h2>' + F.esc(F.fox()) + ' baut dein Übungspaket</h2>' +
    '<p class="muted">Läuft seit <span id="loadSec">0:00</span> · kostenlos mit Gemini<br>' +
    '<b>Bitte die App offen lassen und den Bildschirm nicht sperren.</b> Das kann ein paar Minuten dauern.</p></div>' +
    '<div class="card">' + steps.map(function (st) {
      var icon = st.s === 'ok' ? '✅' : st.s === 'now' ? '⏳' : st.s === 'err' ? '⚠️' : '⚪';
      return '<div class="bp-step ' + st.s + '">' + icon + ' ' + F.esc(st.t) + '</div>';
    }).join('') + (note ? '<p class="small muted mt">' + F.esc(note) + '</p>' : '') + '</div>';
};

/* mehrere Aufgaben gleichzeitig (höchstens "max" auf einmal) */
F.bp.pool = function (jobs, max) {
  var i = 0, active = 0, results = new Array(jobs.length), firstErr = null;
  return new Promise(function (resolve) {
    var next = function () {
      if (i >= jobs.length && active === 0) { resolve({ results: results, err: firstErr }); return; }
      while (active < max && i < jobs.length) {
        (function (k) {
          active++;
          jobs[k]().then(function (r) { results[k] = r; }, function (e) { results[k] = null; if (!firstErr) firstErr = e; })
            .then(function () { active--; next(); });
        })(i++);
      }
    };
    next();
  });
};

/* ---------------- Material-Text für ein Thema ---------------- */
F.bp.materialText = function (pack, fotos, max) {
  max = max || 14000;
  var pages = pack.material || [];
  var pick = fotos && fotos.length ? pages.filter(function (p) { return fotos.indexOf(p.foto) >= 0; }) : pages;
  if (!pick.length) pick = pages;
  var t = pick.map(function (p) { return (p.foto ? '[Foto ' + p.foto + '] ' : '') + (p.thema ? p.thema + ': ' : '') + p.inhalt; }).join('\n\n');
  return t.length > max ? t.slice(0, max) + ' …' : t;
};

/* ---------------- Hauptablauf ---------------- */
/* opts: {fach, imgs, ziel, examId, ckText, festeThemen, titel} */
F.bp.create = function (opts) {
  var pack = { id: F.uid(), fach: opts.fach, titel: opts.titel || 'Neues Übungspaket', aufgaben: [], themen: [], created: Date.now(), best: null,
    checkliste: [], quelle: opts.ckText || (opts.festeThemen && opts.festeThemen.length) ? 'checkliste' : 'fotos', fuer: F.prompts.kind(),
    stats: {}, examId: opts.examId || '', material: [], plan: null,
    build: { phase: 'lesen', ziel: opts.ziel || 80, festeThemen: opts.festeThemen || null, fotosGesamt: (opts.imgs || []).length } };
  if (opts.ckText) pack.material.push({ foto: 0, thema: 'Checkliste / Themen', inhalt: opts.ckText, formate: [] });
  F.state.packs.push(pack);
  F.save();
  F.bp._start = Date.now();
  return F.bp.run(pack, opts.imgs || []);
};

F.bp.steps = function (pack, nowLabel) {
  var b = pack.build || {}, n = b.fotosGesamt || 0;
  var steps = [];
  if (n) steps.push({ t: n + ' Fotos genau lesen' + (b.gelesen ? ' (' + b.gelesen + ' von ' + n + ')' : ''), s: b.phase === 'lesen' ? 'now' : 'ok' });
  steps.push({ t: 'Themen ordnen und erklären', s: b.phase === 'plan' ? 'now' : (b.phase === 'lesen' ? 'todo' : 'ok') });
  var plan = pack.plan || [];
  if (plan.length) plan.forEach(function (t) {
    var have = pack.aufgaben.filter(function (a) { return a.thema === t.name; }).length;
    steps.push({ t: t.name + ': ' + have + ' von ' + t.anzahl + ' Aufgaben', s: have >= t.anzahl ? 'ok' : (b.phase === 'aufgaben' ? 'now' : 'todo') });
  });
  else steps.push({ t: 'Aufgaben erstellen (etwa ' + (b.ziel || 80) + ')', s: 'todo' });
  return steps;
};

F.bp.run = function (pack, imgs) {
  var b = pack.build;
  // danach dorthin zurück, wo man herkam (z. B. die Seite der Klassenarbeit)
  var backTo = F.history.slice();
  if (F.current && F.current.name !== 'packNew' && F.current.name !== 'packDetail') backTo.push(F.current);
  if (!backTo.length) backTo = [{ name: 'home', params: {} }];
  var refresh = function (note) { F.bp.show('Übungspaket', F.bp.steps(pack), note); };
  refresh();
  var chain = Promise.resolve();

  // 1) Fotos in Gruppen zu 8 lesen – nacheinander (schont das kostenlose Minutenlimit)
  if (b.phase === 'lesen' && imgs.length) {
    chain = chain.then(function () {
      var groups = [];
      for (var i = 0; i < imgs.length; i += 8) groups.push({ start: i + 1, imgs: imgs.slice(i, i + 8) });
      b.gelesen = 0;
      var jobs = groups.map(function (g) {
        return function () {
          return F.ai.generateJSON(F.prompts.materialLesen(F.subject(pack.fach).name, g.start, g.imgs.length), g.imgs, { maxTokens: 24000, effort: 'low' })
            .then(function (j) {
              (j.seiten || []).forEach(function (sd, k) {
                if (!sd || !sd.inhalt) return;
                pack.material.push({ foto: parseInt(sd.foto, 10) || (g.start + k), thema: String(sd.thema || ''), inhalt: String(sd.inhalt), formate: sd.formate || [] });
              });
              b.gelesen += g.imgs.length;
              F.save();
              refresh();
            });
        };
      });
      return F.bp.pool(jobs, 1).then(function (r) {
        pack.material.sort(function (x, y) { return x.foto - y.foto; });
        if (!pack.material.length) throw r.err || new Error('Auf den Fotos konnte nichts gelesen werden.');
        if (r.err) b.lesefehler = true;     // ein Teil fehlt – trotzdem weitermachen
        b.phase = 'plan';
        F.save();
      });
    });
  } else if (b.phase === 'lesen') {
    b.phase = 'plan';
  }

  // 2) Themenplan
  chain = chain.then(function () {
    if (b.phase !== 'plan') return;
    refresh();
    var mat = F.bp.materialText(pack, null, 30000);
    return F.ai.generateJSON(F.prompts.themenplan(F.subject(pack.fach).name, mat, b.ziel, b.festeThemen), [], { maxTokens: 24000 }).then(function (j) {
      var themen = (j.themen || []).filter(function (t) { return t && t.name; });
      if (!themen.length) throw new Error('Die Themen konnten nicht geordnet werden. Bitte nochmal versuchen.');
      if (b.festeThemen && b.festeThemen.length) themen.forEach(function (t, i) { if (b.festeThemen[i]) t.name = b.festeThemen[i]; });
      var sum = themen.reduce(function (n, t) { return n + (parseInt(t.anzahl, 10) || 0); }, 0) || themen.length;
      pack.plan = themen.map(function (t) {
        var n = Math.round((parseInt(t.anzahl, 10) || (b.ziel / themen.length)) * b.ziel / sum);
        return { name: String(t.name), fotos: (t.fotos || []).map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; }),
          formate: t.formate || [], anzahl: Math.max(6, Math.min(40, n)) };
      });
      if (j.titel && pack.titel === 'Neues Übungspaket') pack.titel = String(j.titel).slice(0, 60);
      pack.checkliste = pack.plan.map(function (t) { return t.name; });
      pack.themen = themen.filter(function (t) { return t.schritte || t.erklaerung; }).map(function (t) {
        return { titel: String(t.name), text: String(t.erklaerung || ''), schritte: F.mtask.steps({ schritte: t.schritte || [] }),
          beispiel: String(t.beispiel || ''), beispielSchritte: F.mtask.steps({ schritte: t.beispielSchritte || [] }) };
      });
      pack.themen.forEach(function (t) {
        F.state.notes.push({ id: F.uid(), fach: pack.fach, titel: t.titel, text: t.text, schritte: t.schritte, beispiel: t.beispiel, beispielSchritte: t.beispielSchritte, created: Date.now(), quelle: pack.titel });
      });
      b.phase = 'aufgaben';
      F.save();
    });
  });

  // 3) Aufgaben pro Thema
  chain = chain.then(function () {
    if (b.phase !== 'aufgaben') return;
    return F.bp.fillTopics(pack, refresh).then(function (err) {
      if (!pack.aufgaben.length) throw err || new Error('Es konnten keine Aufgaben erstellt werden.');
      if (err) { b.phase = 'aufgaben'; b.unvollstaendig = true; F.save(); throw err; }
      pack.build = null;
      F.save();
    });
  });

  return chain.then(function () {
    F.pendingImages.pack = [];
    F.bp._start = 0;
    F.history = backTo;
    F.current = null;
    F.go('packDetail', { id: pack.id, neu: true });
    return pack;
  }, function (err) {
    F.bp._start = 0;
    F.save();
    // Teile, die schon fertig sind, bleiben. Auf der Seite des Pakets kann man weitermachen.
    F.history = backTo;
    F.current = null;
    if (err && err.quotaMsg) err.message += ' Alles Fertige ist gespeichert – tippe dann auf „Weiter erstellen“.';
    F.lastAiError = err;
    F.go('packDetail', { id: pack.id });
    throw err;
  });
};

/* fehlende Aufgaben je Thema erzeugen (in Portionen zu höchstens 30 – so braucht es wenige Anfragen) */
F.bp.fillTopics = function (pack, refresh) {
  var jobs = [];
  (pack.plan || []).forEach(function (t) {
    var have = pack.aufgaben.filter(function (a) { return a.thema === t.name; }).length;
    var missing = t.anzahl - have;
    while (missing > 0) {
      var n = Math.min(30, missing);
      missing -= n;
      jobs.push((function (thema, count) {
        return function () { return F.bp.topicBatch(pack, thema, count).then(function () { if (refresh) refresh(); }); };
      })(t, n));
    }
  });
  return F.bp.pool(jobs, 1).then(function (r) { return r.err; });
};

F.bp.topicBatch = function (pack, thema, count) {
  var existing = pack.aufgaben.filter(function (a) { return a.thema === thema.name; });
  var vorhandene = existing.slice(-70).map(function (a) { return F.taskShort(a).slice(0, 90); });
  var mat = F.bp.materialText(pack, thema.fotos, 14000);
  if (!mat && pack.themen) {
    // ältere Pakete ohne Material: Erklärung + Beispielaufgaben als Grundlage
    var ex = (pack.themen || []).filter(function (t) { return F.sameThema(t.titel, thema.name); })[0];
    mat = (ex ? ex.titel + ': ' + ex.text + ' ' + (ex.schritte || []).join(' ') + ' Beispiel: ' + ex.beispiel : '') +
      '\nBisherige Aufgaben: ' + vorhandene.slice(0, 15).join(' | ');
  }
  return F.ai.generateJSON(F.prompts.themaAufgaben(F.subject(pack.fach).name, thema, mat, count, vorhandene), [], { maxTokens: 32000 })
    .then(function (j) {
      var keys = {};
      pack.aufgaben.forEach(function (a) { keys[F.taskKey(a)] = 1; });
      (j.aufgaben || []).forEach(function (raw) {
        if (raw) raw.thema = thema.name;
        var a = F.normAufgabe(raw);
        if (!a) return;
        a.thema = thema.name;
        var k = F.taskKey(a);
        if (keys[k]) return;          // doppelt → weglassen
        keys[k] = 1;
        pack.aufgaben.push(a);
      });
      F.save();
    });
};

/* ---------------- weitermachen / mehr Aufgaben ---------------- */
F.actions.resumePack = function (el) {
  var pack = F.getPack(el.getAttribute('data-id'));
  if (!pack || !pack.build) return;
  if (pack.build.phase === 'lesen') pack.build.phase = 'plan';   // Fotos sind nicht mehr da – mit dem Gelesenen weitermachen
  F.bp._start = Date.now();
  F.bp.run(pack, []).catch(function () {});
};
F.actions.morePack = function (el) {
  var pack = F.getPack(el.getAttribute('data-id'));
  var mehr = parseInt(el.getAttribute('data-n'), 10) || 30;
  if (!pack) return;
  if (!pack.plan || !pack.plan.length) {
    // ältere Pakete: Themen aus Checkliste oder Aufgaben ableiten
    var names = (pack.checkliste && pack.checkliste.length ? pack.checkliste : []).slice();
    pack.aufgaben.forEach(function (a) { if (a.thema && names.indexOf(a.thema) < 0) names.push(a.thema); });
    if (!names.length) names = [pack.titel];
    pack.aufgaben.forEach(function (a) { if (!a.thema) a.thema = names[0]; if (!a.id) a.id = F.uid(); });
    pack.plan = names.map(function (n) { return { name: n, fotos: [], formate: [], anzahl: 0 }; });
    if (!pack.checkliste || !pack.checkliste.length) pack.checkliste = names.slice();
  }
  var per = Math.ceil(mehr / pack.plan.length);
  pack.plan.forEach(function (t) {
    var have = pack.aufgaben.filter(function (a) { return a.thema === t.name; }).length;
    t.anzahl = have + per;
  });
  pack.build = { phase: 'aufgaben', ziel: mehr, fotosGesamt: 0 };
  F.save();
  F.bp._start = Date.now();
  F.bp.run(pack, []).catch(function () {});
};

/* ---------------- Aufgaben auswählen: Neues und Fehler zuerst ---------------- */
F.STUFE_RANG = { leicht: 0, mittel: 1, schwer: 2 };
F.pickTasks = function (pool, n, opts) {
  opts = opts || {};
  var now = Date.now();
  var score = function (a) {
    var st = a.st;
    var s;
    if (!st || !st.n) s = 0;                                   // noch nie gesehen
    else if (st.lastOk === false) s = 1;                       // zuletzt falsch
    else s = 2 + Math.min(3, st.streak || 0);                  // schon gekonnt
    if (st && st.last && now - st.last < 12 * 3600000) s += 1.5; // heute schon dran gewesen
    return s + Math.random() * 0.9;
  };
  var scored = pool.map(function (a) { return { a: a, s: score(a) }; }).sort(function (x, y) { return x.s - y.s; });
  var out = [];
  if (!opts.spread) out = scored.slice(0, n).map(function (x) { return x.a; });
  else {
    // über alle Themen verteilen
    var groups = {}, order = [];
    scored.forEach(function (x) { var k = x.a.thema || ''; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(x.a); });
    var any = true;
    while (out.length < n && any) {
      any = false;
      order.forEach(function (k) { if (out.length < n && groups[k].length) { out.push(groups[k].shift()); any = true; } });
    }
  }
  var rang = function (a) { var r = F.STUFE_RANG[a.stufe]; return r == null ? 1 : r; };
  if (opts.byStufe) out.sort(function (a, b) { return rang(a) - rang(b); });
  return out;
};
/* Ergebnis einer Aufgabe merken (nur der erste Versuch zählt) */
F.taskStat = function (a, ok) {
  var st = a.st = a.st || { n: 0, ok: 0, streak: 0 };
  st.n++;
  st.last = Date.now();
  st.lastOk = !!ok;
  if (ok) { st.ok++; st.streak = (st.streak || 0) + 1; } else st.streak = 0;
};
F.packCounts = function (x) {
  var neu = 0, fehler = 0;
  x.aufgaben.forEach(function (a) { if (!a.st || !a.st.n) neu++; else if (a.st.lastOk === false) fehler++; });
  return { neu: neu, fehler: fehler, gesamt: x.aufgaben.length };
};
/* ungefähre Note (Grundschul-Maßstab, je nach Schule etwas anders) */
F.noteFor = function (pct) { return pct >= 92 ? '1' : pct >= 81 ? '2' : pct >= 67 ? '3' : pct >= 50 ? '4' : pct >= 30 ? '5' : '6'; };
