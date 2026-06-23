(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const isReady = Boolean(cfg.url && cfg.anonKey);

  window.appConfig = {
    ...cfg,
    isReady
  };

  window.db = {
    client: isReady ? window.supabase.createClient(cfg.url, cfg.anonKey) : null
  };
})();
