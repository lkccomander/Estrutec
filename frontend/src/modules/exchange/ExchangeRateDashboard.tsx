import { useI18n } from '../../i18n/useI18n'

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

function formatRate(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatTimestamp(value: string, locale: string) {
  return new Date(value).toLocaleString(locale)
}

export function ExchangeRateDashboard({
  data,
  error,
  isLoading,
  onRefresh,
}: ExchangeRateDashboardProps) {
  const { language, t } = useI18n()
  const locale = language === 'en' ? 'en-US' : 'es-CR'

  return (
    <section className="panel-stack">
      <div className="section-title">
        <div>
          <h2>{t('exchangeDashboard.title')}</h2>
          <p className="muted">
            {t('exchangeDashboard.subtitle')}
          </p>
        </div>
        <div className="action-row">
          <button className="tab-btn" type="button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? t('exchangeDashboard.refreshing') : t('exchangeDashboard.refresh')}
          </button>
        </div>
      </div>

      {error ? <p className="sync-status warning">{error}</p> : null}

      {!data ? (
        <article className="card-group">
          <p className="empty">
            {isLoading
              ? t('exchangeDashboard.loading')
              : t('exchangeDashboard.empty')}
          </p>
        </article>
      ) : (
        <>
          <div className="health-layout exchange-summary-layout">
            <article className="health-card exchange-highlight-card">
              <h3>{t('exchangeDashboard.bestBuy')}</h3>
              <p className="exchange-rate-value">CRC {formatRate(data.best_buy.rate, locale)}</p>
              <p className="health-meta">{data.best_buy.entity}</p>
              <p className="health-meta">{data.best_buy.entity_type}</p>
              <p className="health-meta">
                {t('exchangeDashboard.updatedAt')}: {formatTimestamp(data.best_buy.updated_at, locale)}
              </p>
            </article>
            <article className="health-card exchange-highlight-card">
              <h3>{t('exchangeDashboard.bestSell')}</h3>
              <p className="exchange-rate-value">CRC {formatRate(data.best_sell.rate, locale)}</p>
              <p className="health-meta">{data.best_sell.entity}</p>
              <p className="health-meta">{data.best_sell.entity_type}</p>
              <p className="health-meta">
                {t('exchangeDashboard.updatedAt')}: {formatTimestamp(data.best_sell.updated_at, locale)}
              </p>
            </article>
            <article className="health-card">
              <h3>{t('exchangeDashboard.averages')}</h3>
              <p className="health-row">
                {t('exchangeDashboard.averageBuy')}:{' '}
                <span className="health-badge ok">{formatRate(data.average_buy_rate, locale)}</span>
              </p>
              <p className="health-row">
                {t('exchangeDashboard.averageSell')}:{' '}
                <span className="health-badge ok">{formatRate(data.average_sell_rate, locale)}</span>
              </p>
              <p className="health-meta">
                {t('exchangeDashboard.averageSpread')}: {formatRate(data.average_spread, locale)}
              </p>
              <p className="health-meta">{data.report_date}</p>
            </article>
          </div>

          <article className="card-group">
            <div className="section-title">
              <div>
                <h2>{t('exchangeDashboard.entitiesTitle')}</h2>
                <p className="muted">
                  {t('exchangeDashboard.source')}:{' '}
                  <a href={data.source_url} target="_blank" rel="noreferrer">{data.source}</a>
                </p>
              </div>
              <p className="muted">
                {t('exchangeDashboard.fetchedAt')}: {formatTimestamp(data.fetched_at, locale)}
              </p>
            </div>

            <div className="excel-list-wrapper">
              <div className="excel-list-header exchange-rates-header" role="row">
                <span>{t('exchangeDashboard.tableType')}</span>
                <span>{t('exchangeDashboard.tableEntity')}</span>
                <span>{t('exchangeDashboard.tableBuy')}</span>
                <span>{t('exchangeDashboard.tableSell')}</span>
                <span>{t('exchangeDashboard.tableSpread')}</span>
                <span>{t('exchangeDashboard.tableUpdatedAt')}</span>
              </div>
              <div className="excel-list-body">
                {data.entries.map((entry) => (
                  <article className="excel-row exchange-rates-row" key={`${entry.entity_type}-${entry.entity}`}>
                    <span>{entry.entity_type}</span>
                    <span>{entry.entity}</span>
                    <span className="exchange-buy-rate">CRC {formatRate(entry.buy_rate, locale)}</span>
                    <span className="exchange-sell-rate">CRC {formatRate(entry.sell_rate, locale)}</span>
                    <span>{formatRate(entry.spread, locale)}</span>
                    <span>{formatTimestamp(entry.updated_at, locale)}</span>
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
