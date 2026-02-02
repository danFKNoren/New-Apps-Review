import { useState } from 'react';
import axios from 'axios';

function DealDetail({ deal, portalId, onClose, onNext, onPrevious, hasNext, hasPrevious, onTagRemoved }) {
  if (!deal) return null;

  const { performance } = deal;
  const [isRemoving, setIsRemoving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isEditingTransferSummary, setIsEditingTransferSummary] = useState(false);
  const [transferSummaryText, setTransferSummaryText] = useState(deal.transferSummary || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleRemoveTagClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmRemove = async () => {
    setShowConfirmation(false);
    setIsRemoving(true);
    try {
      const response = await axios.post(
        `/api/deals/${deal.id}/remove-tag`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        if (onTagRemoved) {
          onTagRemoved(deal.id);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag. Please try again.');
      setIsRemoving(false);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmation(false);
  };

  const handleEditTransferSummary = () => {
    setIsEditingTransferSummary(true);
    setTransferSummaryText(deal.transferSummary || '');
  };

  const handleCancelEdit = () => {
    setIsEditingTransferSummary(false);
    setTransferSummaryText(deal.transferSummary || '');
  };

  const handleSaveTransferSummary = async () => {
    setIsSaving(true);
    try {
      const response = await axios.post(
        `/api/deals/${deal.id}/update-transfer-summary`,
        { transferSummary: transferSummaryText },
        { withCredentials: true }
      );

      if (response.data.success) {
        deal.transferSummary = transferSummaryText;
        setIsEditingTransferSummary(false);
        alert('Transfer summary updated successfully!');
      }
    } catch (error) {
      console.error('Error updating transfer summary:', error);
      alert('Failed to update transfer summary. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hubspotUrl = portalId ? `https://app.hubspot.com/contacts/${portalId}/deal/${deal.id}/` : null;

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

        <div className="modal-nav">
          <button
            className="modal-nav-btn"
            onClick={onPrevious}
            disabled={!hasPrevious}
            title="Previous deal"
          >
            ↑
          </button>
          <button
            className="modal-nav-btn"
            onClick={onNext}
            disabled={!hasNext}
            title="Next deal"
          >
            ↓
          </button>
        </div>

        <div className="modal-header compact">
          <div className="header-left">
            <h2>{deal.name}</h2>
            {deal.owner && <span className="deal-owner">Owner: {deal.owner}</span>}
          </div>
          <div className="header-meta">
            <span className={`stage-badge stage-${deal.stage === 'closedwon' ? 'won' : deal.stage === 'closedlost' ? 'lost' : 'active'}`}>
              {deal.stageName || deal.stage}
            </span>
            <span className="last-updated">Updated: {performance.lastDataUpdate}</span>
            {hubspotUrl && (
              <a
                href={hubspotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hubspot-link"
                title="Open in HubSpot"
              >
                Open in HubSpot →
              </a>
            )}
            {deal.googlePlayPage && (
              <a
                href={deal.googlePlayPage}
                target="_blank"
                rel="noopener noreferrer"
                className="hubspot-link google-play-link"
                title="Open in Google Play"
              >
                Google Play →
              </a>
            )}
            <button
              onClick={handleRemoveTagClick}
              disabled={isRemoving}
              className="remove-tag-btn"
              title="Remove Next-meeting tag"
            >
              {isRemoving ? 'Removing...' : 'Remove from List'}
            </button>
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

          <section className="detail-section app-metrics-section">
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
        </div>

        <div className="transfer-summary-full">
          <div className="transfer-summary-header">
            <span className="transfer-summary-label">Transfer Summary</span>
            {!isEditingTransferSummary && (
              <button
                onClick={handleEditTransferSummary}
                className="edit-summary-btn"
                title="Edit transfer summary"
              >
                ✏️
              </button>
            )}
          </div>
          {isEditingTransferSummary ? (
            <>
              <textarea
                value={transferSummaryText}
                onChange={(e) => setTransferSummaryText(e.target.value)}
                className="transfer-summary-textarea"
                rows="6"
                placeholder="Enter transfer summary..."
              />
              <div className="transfer-summary-actions">
                <button
                  onClick={handleCancelEdit}
                  className="btn-cancel-edit"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTransferSummary}
                  className="btn-save-edit"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <p className="transfer-summary-text">
              {deal.transferSummary || 'No transfer summary available. Click edit to add one.'}
            </p>
          )}
        </div>
      </div>

      {showConfirmation && (
        <div className="confirmation-overlay" onClick={handleCancelRemove}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Are you sure?</h3>
            <p>Remove "Next-meeting" tag from this deal?</p>
            <p className="confirmation-note">The deal will be removed from this view.</p>
            <div className="confirmation-actions">
              <button onClick={handleCancelRemove} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleConfirmRemove} className="btn-confirm-remove">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DealDetail;
