type ExchangeRateEntry = {
  entity_type: string
  entity: string
  buy_rate: number
  sell_rate: number
  spread: number
  updated_at: string
}

type ExchangeRateHighlight = {
  entity_type: string
  entity: string
  rate: number
  updated_at: string
}

type ExchangeRateDashboardData = {
  source: string
  source_url: string
  report_date: string
  fetched_at: string
  average_buy_rate: number
  average_sell_rate: number
  average_spread: number
  best_buy: ExchangeRateHighlight
  best_sell: ExchangeRateHighlight
  entries: ExchangeRateEntry[]
}

type ExchangeRateDashboardProps = {
  data: ExchangeRateDashboardData | null
  error: string | null
  isLoading: boolean
  onRefresh: () => void
}

function formatRate(value: number) {
  return new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('es-CR')
}

export function ExchangeRateDashboard({
  data,
  error,
  isLoading,
  onRefresh,
}: ExchangeRateDashboardProps) {
  return (
    <section className="panel-stack">
      <div className="section-title">
        <div>
          <h2>Tipo de cambio BCCR</h2>
          <p className="muted">
            Ventanilla anunciada por intermediarios cambiarios autorizados.
          </p>
        </div>
        <div className="action-row">
          <button className="tab-btn" type="button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? 'Actualizando...' : 'Actualizar tipo de cambio'}
          </button>
        </div>
      </div>

      {error ? <p className="sync-status warning">{error}</p> : null}

      {!data ? (
        <article className="card-group">
          <p className="empty">
            {isLoading
              ? 'Consultando el tipo de cambio del BCCR...'
              : 'No hay datos de tipo de cambio disponibles todavia.'}
          </p>
        </article>
      ) : (
        <>
          <div className="health-layout exchange-summary-layout">
            <article className="health-card exchange-highlight-card">
              <h3>Mejor compra</h3>
              <p className="exchange-rate-value">CRC {formatRate(data.best_buy.rate)}</p>
              <p className="health-meta">{data.best_buy.entity}</p>
              <p className="health-meta">{data.best_buy.entity_type}</p>
              <p className="health-meta">Actualizado: {formatTimestamp(data.best_buy.updated_at)}</p>
            </article>
            <article className="health-card exchange-highlight-card">
              <h3>Mejor venta</h3>
              <p className="exchange-rate-value">CRC {formatRate(data.best_sell.rate)}</p>
              <p className="health-meta">{data.best_sell.entity}</p>
              <p className="health-meta">{data.best_sell.entity_type}</p>
              <p className="health-meta">Actualizado: {formatTimestamp(data.best_sell.updated_at)}</p>
            </article>
            <article className="health-card">
              <h3>Promedios</h3>
              <p className="health-row">
                Compra promedio: <span className="health-badge ok">{formatRate(data.average_buy_rate)}</span>
              </p>
              <p className="health-row">
                Venta promedio: <span className="health-badge ok">{formatRate(data.average_sell_rate)}</span>
              </p>
              <p className="health-meta">Diferencial promedio: {formatRate(data.average_spread)}</p>
              <p className="health-meta">{data.report_date}</p>
            </article>
          </div>

          <article className="card-group">
            <div className="section-title">
              <div>
                <h2>Intermediarios monitoreados</h2>
                <p className="muted">
                  Fuente: <a href={data.source_url} target="_blank" rel="noreferrer">{data.source}</a>
                </p>
              </div>
              <p className="muted">Consultado: {formatTimestamp(data.fetched_at)}</p>
            </div>

            <div className="excel-list-wrapper">
              <div className="excel-list-header exchange-rates-header" role="row">
                <span>Tipo</span>
                <span>Entidad</span>
                <span>Compra</span>
                <span>Venta</span>
                <span>Diferencial</span>
                <span>Ultima actualizacion</span>
              </div>
              <div className="excel-list-body">
                {data.entries.map((entry) => (
                  <article className="excel-row exchange-rates-row" key={`${entry.entity_type}-${entry.entity}`}>
                    <span>{entry.entity_type}</span>
                    <span>{entry.entity}</span>
                    <span className="exchange-buy-rate">CRC {formatRate(entry.buy_rate)}</span>
                    <span className="exchange-sell-rate">CRC {formatRate(entry.sell_rate)}</span>
                    <span>{formatRate(entry.spread)}</span>
                    <span>{formatTimestamp(entry.updated_at)}</span>
                  </article>
                ))}
              </div>
            </div>
          </article>
        </>
      )}
    </section>
  )
}
