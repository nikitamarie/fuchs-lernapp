/* Begrüßung (Fuchs benennen) und Startseite */

F.views.welcome = function (p) {
  var step = p.step || 1;
  if (step === 1) {
    return '<div class="celebrate"><div class="big pop">🦊</div>' +
      '<h1>Hallo! Ich bin dein Lern-Fuchs.</h1>' +
      '<p style="font-size:1.2rem">Ich helfe dir beim Üben – für Diktate, Mathe und alles andere aus der Fuchsklasse.</p>' +
      '<p style="font-size:1.2rem"><b>Aber ich habe noch keinen Namen!</b> Wie soll ich heißen?</p></div>' +
      '<div class="card"><label class="field"><span>Name für deinen Fuchs</span>' +
      '<input type="text" id="foxName" maxlength="20" autocomplete="off" placeholder="z. B. Flitzi"></label>' +
      '<label class="field"><span>Und wie heißt du? <span class="muted small">(darfst du auch leer lassen)</span></span>' +
      '<input type="text" id="kidName" maxlength="20" autocomplete="off"></label>' +
      '<button class="btn big block fuchs" data-action="saveNames">Los geht’s! 🐾</button></div>';
  }
  return '';
};

F.actions.saveNames = function () {
  var fox = F.$('#foxName').value.trim();
  if (!fox) { F.toast('Gib deinem Fuchs einen Namen 🦊'); return; }
  F.state.profile.foxName = fox;
  F.state.profile.kidName = F.$('#kidName').value.trim();
  F.save();
  F.speech.speak('Juhu! Ich heiße jetzt ' + fox + '!');
  F.home();
};

F.nextExams = function () {
  return F.state.exams
    .filter(function (e) { return F.daysUntil(e.datum) >= 0; })
    .sort(function (a, b) { return a.datum < b.datum ? -1 : 1; });
};

F.countdownHtml = function () {
  var ex = F.nextExams().slice(0, 2);
  return ex.map(function (e) {
    var d = F.daysUntil(e.datum);
    var when = d === 0 ? 'heute' : d === 1 ? 'morgen' : 'in ' + d + ' Tagen';
    var subj = F.subject(e.fach);
    var n = (e.themen || []).length;
    return '<button class="countdown" style="width:100%;border:none;font:inherit;text-align:left;cursor:pointer" data-action="go" data-view="examDetail" data-params="' +
      F.esc(JSON.stringify({ id: e.id })) + '"><span class="cd-emoji">' + subj.emoji + '</span><span style="flex:1">' +
      F.esc(e.titel || subj.name) + ' ist <b>' + when + '</b> (' + F.formatDate(e.datum) + ').' +
      (d <= 1 ? ' Du schaffst das! 💪' : ' Jeden Tag ein bisschen üben!') +
      (n ? '' : ' <span style="font-weight:600">→ Themen eintragen</span>') + '</span><span class="li-arrow">›</span></button>';
  }).join('');
};

F.views.home = function () {
  if (!F.state.profile.foxName) return F.views.welcome({ step: 1 });
  var s = F.state;
  var kid = s.profile.kidName;
  var gruss = (function () {
    var h = new Date().getHours();
    return h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : 'Guten Abend';
  })();
  var trainCount = s.trainWords.length;
  var html = '<div class="hero">' +
    '<div class="fox">🦊</div>' +
    '<div><span class="hi">' + gruss + (kid ? ', ' + F.esc(kid) : '') + '!</span>' +
    '<span class="hi-sub">' + F.esc(F.fox()) + ' freut sich aufs Training.</span></div>' +
    '<div class="stats">' + F.beltHtml(s.tore) + '<br><span class="tore">⚽ ' + s.tore + ' Tore</span></div>' +
    '</div>' +
    F.countdownHtml() +
    '<div class="tiles">' +
    '<button class="tile wichtig wide" data-action="go" data-view="diktatHome">' +
    '<span class="emoji">📝</span><span class="label">Diktat-Training</span>' +
    '<span class="sub">Vorlesen lassen, auf Papier schreiben, mit Foto prüfen' +
    (trainCount ? ' · ' + trainCount + ' Übungswörter' : '') + '</span></button>' +
    '<button class="tile" data-action="go" data-view="matheHome">' +
    '<span class="emoji">🔢</span><span class="label">Mathe</span><span class="sub">Zahlen bis 1000</span></button>' +
    '<button class="tile" data-action="go" data-view="packsHome">' +
    '<span class="emoji">📚</span><span class="label">Üben mit Fotos</span><span class="sub">Fotos oder Checkliste · alle Fächer</span></button>' +
    '<button class="tile" data-action="go" data-view="notesHome">' +
    '<span class="emoji">💡</span><span class="label">Nachlesen</span><span class="sub">Regeln & Merksätze</span></button>' +
    '<button class="tile" data-action="go" data-view="arbeitHome">' +
    '<span class="emoji">🏅</span><span class="label">Meine Klassenarbeiten</span><span class="sub">Eintragen, Themen üben, Ergebnis zeigen</span></button>' +
    '<button class="tile wide" data-action="go" data-view="trophies" style="min-height:0">' +
    '<span class="emoji">🏆</span><span class="label">Gürtel & Pokale</span><span class="sub">' + F.state.tore + ' Tore · ' + Object.keys(F.state.awards || {}).length + ' Auszeichnungen</span></button>' +
    '</div>' +
    '<div class="center mt">' +
    '<button class="btn ghost small" data-action="go" data-view="parentGate">⚙️ Eltern-Bereich</button>' +
    '</div>';
  return html;
};

F.views.trophies = function () {
  var t = F.state.tore;
  var rows = F.BELTS.map(function (b) {
    var have = t >= b.min;
    return '<div class="list-item" style="cursor:default;opacity:' + (have ? 1 : 0.5) + '">' +
      '<span class="li-emoji">' + (have ? '🥋' : '🔒') + '</span>' +
      '<span class="li-main"><span class="li-title"><span class="belt" style="background:' + b.color + ';color:' + b.text + ';border-color:#ddd">' + F.esc(b.name) + '</span></span>' +
      '<span class="li-sub">' + (have ? 'Geschafft!' : 'ab ' + b.min + ' Tore') + '</span></span></div>';
  }).join('');
  var next = F.nextBelt(t);
  return F.topbar('Gürtel & Pokale') +
    '<div class="card center"><div style="font-size:3.5rem">⚽</div><h1>' + t + ' Tore</h1>' +
    '<p>' + (next ? 'Noch ' + (next.min - t) + ' Tore bis zum ' + F.esc(F.beltDativ(next.name)) + '!' : 'Du hast den schwarzen Gürtel! Du bist eine echte Lern-Meisterin! 🦊') + '</p>' +
    '<p class="muted small">Tore bekommst du für jede geschaffte Aufgabe, jedes Diktat und jede hochgeladene Klassenarbeit.</p></div>' +
    (F.awardShelfHtml ? F.awardShelfHtml() : '') + '<h2 class="mt">🥋 Meine Gürtel</h2>' + rows;
};
