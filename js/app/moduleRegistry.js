/**
 * Registro de módulos da aplicação (controllers).
 * Cada módulo exporta create(ctx) → métodos anexados ao runtime.
 */
(function (global) {
  "use strict";

  const modules = new Map();

  function register(name, factory) {
    modules.set(name, factory);
  }

  function createRuntime(baseCtx) {
    const ctx = { ...baseCtx };
    for (const [name, factory] of modules) {
      if (typeof factory !== "function") continue;
      const api = factory(ctx);
      if (api && typeof api === "object") Object.assign(ctx, api);
    }
    return ctx;
  }

  global.PIBMapApp = {
    register,
    createRuntime,
    modules,
  };
})(typeof window !== "undefined" ? window : globalThis);
