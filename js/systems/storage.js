"use strict";

window.PachinkrawlerStorage = (() => {
  const SAVE_KEY = "pachinkrawler.run.v1";
  const META_KEY = "pachinkrawler.codex.v1";
  const SAVE_VERSION = 1;
  const META_VERSION = 1;

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

  function createEmptyMeta() {
    return {
      version: META_VERSION,
      discoveredItems: [],
      discoveredRunes: [],
      discoveredEnemies: [],
      discoveredEvolutions: []
    };
  }

  function loadMeta() {
    try {
      const raw = window.localStorage.getItem(META_KEY);
      if (!raw) return createEmptyMeta();
      const meta = JSON.parse(raw);
      if (!meta || meta.version !== META_VERSION) return createEmptyMeta();
      return {
        ...createEmptyMeta(),
        ...meta,
        discoveredItems: Array.isArray(meta.discoveredItems) ? meta.discoveredItems : [],
        discoveredRunes: Array.isArray(meta.discoveredRunes) ? meta.discoveredRunes : [],
        discoveredEnemies: Array.isArray(meta.discoveredEnemies) ? meta.discoveredEnemies : [],
        discoveredEvolutions: Array.isArray(meta.discoveredEvolutions) ? meta.discoveredEvolutions : []
      };
    } catch (error) {
      console.warn("No se pudo cargar el códice persistente.", error);
      return createEmptyMeta();
    }
  }

  function saveMeta(meta) {
    try {
      window.localStorage.setItem(META_KEY, JSON.stringify({
        ...createEmptyMeta(),
        ...clone(meta),
        version: META_VERSION
      }));
    } catch (error) {
      console.warn("No se pudo guardar el códice persistente.", error);
    }
  }

  function updateMeta(mutator) {
    const meta = loadMeta();
    mutator(meta);
    saveMeta(meta);
    return meta;
  }

  return {
    SAVE_VERSION,
    load,
    save,
    clear,
    hasSave: () => Boolean(load()),
    loadMeta,
    saveMeta,
    updateMeta
  };
})();
