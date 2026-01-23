function DealDetail({ deal, onClose }) {
  if (!deal) return null;

  const { performance } = deal;

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '--';
    return `$${value.toLocaleString()}`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '--';
    return value.toLocaleString();
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '--';
    return `${value}%`;
  };

  const Tile = ({ label, value, highlight = false, negative = false }) => (
    <div className={`tile ${highlight ? 'highlight' : ''} ${negative ? 'negative' : ''}`}>
      <span className="tile-value">{value}</span>
      <span className="tile-label">{label}</span>
    </div>
  );

  const isNegative = (val) => val !== null && val < 0;

  // Calculate multiplier (months to recoup)
  const currentOffer = deal.currentOffer || 0;
  const monthlyProfit = performance.avgProfit3m || 0;
  const multiplier = monthlyProfit > 0 ? Math.round(currentOffer / monthlyProfit) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <div className="modal-header compact">
          <div className="header-left">
            <h2>{deal.name}</h2>
            {deal.owner && <span className="deal-owner">Owner: {deal.owner}</span>}
          </div>
          <div className="header-meta">
            <span className={`stage-badge stage-${deal.stage === 'closedwon' ? 'won' : deal.stage === 'closedlost' ? 'lost' : 'active'}`}>
              {deal.stage}
            </span>
            <span className="last-updated">Updated: {performance.lastDataUpdate}</span>
          </div>
        </div>

        <div className="offer-banner">
          <div className="offer-main">
            <span className="offer-label">Current Offer</span>
            <span className="offer-value">{formatCurrency(currentOffer)}</span>
          </div>
          {multiplier !== null && (
            <div className="offer-multiplier">
              <span className="multiplier-value">({multiplier} months payback)</span>
            </div>
          )}
        </div>

        <div className="sections-row">
          <section className="detail-section">
            <h3>Monthly Avg (3 Months)</h3>
            <div className="tiles-compact">
              <Tile label="Rev (Ads)" value={formatCurrency(performance.avgRevAds3m)} highlight />
              <Tile label="Rev (IAP+Sub)" value={formatCurrency(performance.avgRevIAP3m)} highlight />
              <Tile label="Profit" value={formatCurrency(performance.avgProfit3m)} highlight negative={isNegative(performance.avgProfit3m)} />
              <Tile label="Expenses" value={formatCurrency(performance.avgExpenses3m)} />
              <Tile label="Other Expenses" value={formatCurrency(performance.avgOtherExpenses3m)} />
              <Tile label="UA Profit" value={formatCurrency(performance.avgUAProfit)} />
              <Tile label="UA Rev" value={formatCurrency(performance.avgUARev3m)} />
              <Tile label="% UA Profit" value={formatPercent(performance.pctUAProfit)} />
              <Tile label="UA ROI" value={performance.uaROI !== null ? performance.uaROI.toFixed(1) : '--'} negative={isNegative(performance.uaROI)} />
            </div>
          </section>

          <section className="detail-section">
            <h3>App Metrics</h3>
            <div className="tiles-compact">
              <Tile label="Avg Installs" value={formatNumber(performance.avgInstalls3m)} highlight />
              <Tile label="Organic Installs" value={formatNumber(performance.avgOrgInstalls3m)} />
              <Tile label="% Organic" value={formatPercent(performance.pctOrgInstalls)} highlight />
              <Tile label="App Rating" value={performance.appRating || '--'} highlight />
              <Tile label="Retention D1" value={formatPercent(performance.retentionD1)} />
              <Tile label="Retention D7" value={formatPercent(performance.retentionD7)} />
              <Tile label="Engagement" value={performance.avgEngagementTime ? `${performance.avgEngagementTime}m` : '--'} />
              <Tile label="Top Countries" value={performance.topCountries || '--'} />
            </div>
          </section>

          <section className="detail-section">
            <h3>Last Month</h3>
            <div className="tiles-compact">
              <Tile label="Rev (Ads)" value={formatCurrency(performance.revAdsLastMonth)} highlight />
              <Tile label="Rev (IAP)" value={formatCurrency(performance.revIAPLastMonth)} highlight />
              <Tile label="Profit" value={formatCurrency(performance.profitLastMonth)} highlight negative={isNegative(performance.profitLastMonth)} />
              <Tile label="Expenses" value={formatCurrency(performance.expensesLastMonth)} />
              <Tile label="Other Expenses" value={formatCurrency(performance.otherExpensesLastMonth)} />
              <Tile label="Installs" value={formatNumber(performance.installsLastMonth)} highlight />
              <Tile label="Organic Installs" value={formatNumber(performance.orgInstallsLastMonth)} />
              <Tile label="Expense Details" value={performance.otherExpensesDetails || '--'} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default DealDetail;
