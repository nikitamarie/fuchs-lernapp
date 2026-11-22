/* Start der App */
(function () {
  F.speech.init();

  // Erster Start: den Diktat-Termin am Dienstag schon eintragen (kann im Eltern-Bereich gelöscht werden)
  if (!F.state.seeded) {
    F.state.seeded = true;
    if (F.daysUntil('2026-11-24') >= 0) {
      F.state.exams.push({ id: F.uid(), fach: 'deutsch', titel: 'Diktat', datum: '2026-11-24' });
    }
    F.save();
  }

  // Daten möglichst dauerhaft speichern (Safari löscht sonst evtl. nach längerer Pause)
  if (navigator.storage && navigator.storage.persist) {
    try { navigator.storage.persist(); } catch (e) {}
  }

  // Offline-Fähigkeit
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  F.home();
})();
