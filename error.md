Comment on lines +696 to +698
    exchangeRateDashboard?.entries.find(
      (entry) => entry.entity === 'ARI Casa de Cambio Internacional S.A.',
    ) ?? null
@chatgpt-codex-connector
chatgpt-codex-connector bot
2 minutes ago
P2 Badge Normalize the ARI entity lookup for the tooltip

This lookup only succeeds when entry.entity matches the hard-coded text byte-for-byte. The exchange-rate dashboard already normalizes entity names before treating them as the same institution (normalizeEntityName/isFeaturedEntity in frontend/src/modules/exchange/ExchangeRateDashboard.tsx), while the scraper preserves raw source names, so any punctuation/casing change in the BCCR feed will make the receipt form fall back to “No hay valores...” even though the ARI row is still present elsewhere in the UI. Matching on the normalized name here would keep the tooltip consistent with the dashboard.