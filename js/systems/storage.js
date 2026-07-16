"use strict";

window.PachinkrawlerStorage = (() => {
  const SAVE_KEY = "pachinkrawler.run.v1";
  const SAVE_VERSION = 1;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const save = JSON.parse(raw);
      if (!save || save.version !== SAVE_VERSION) return null;
      return save;
    } catch (error) {
      console.warn("No se pudo cargar la run guardada.", error);
      return null;
    }
  }

  function save(run) {
    if (!run || run.isTestMode) return;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(clone(run)));
    } catch (error) {
      console.warn("No se pudo guardar la run.", error);
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch (error) {
      console.warn("No se pudo borrar la run guardada.", error);
    }
  }

  return {
    SAVE_VERSION,
    load,
    save,
    clear,
    hasSave: () => Boolean(load())
  };
})();
