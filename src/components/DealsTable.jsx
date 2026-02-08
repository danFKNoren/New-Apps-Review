import { useState } from 'react';
import axios from 'axios';

function DealsTable({ deals, onDealClick, onRemoveDeal }) {
  const [removingDealId, setRemovingDealId] = useState(null);
  const [confirmRemoveDealId, setConfirmRemoveDealId] = useState(null);

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const getStageClass = (stage) => {
    if (stage === 'closedwon') return 'stage-won';
    if (stage === 'closedlost') return 'stage-lost';
    return 'stage-active';
  };

  const handleRemoveClick = (e, dealId) => {
    e.stopPropagation(); // Prevent row click
    setConfirmRemoveDealId(dealId);
  };

  const handleConfirmRemove = async (dealId) => {
    setConfirmRemoveDealId(null);
    setRemovingDealId(dealId);
    try {
      const response = await axios.post(
        `/api/deals/${dealId}/remove-tag`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        if (onRemoveDeal) {
          onRemoveDeal(dealId);
        }
      }
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Failed to remove tag. Please try again.');
    } finally {
      setRemovingDealId(null);
    }
  };

  const handleCancelRemove = () => {
    setConfirmRemoveDealId(null);
  };

  if (deals.length === 0) {
    return (
      <div className="empty-state">
        <p>No deals found</p>
      </div>
    );
  }

  // Group deals by stage
  const dealsByStage = deals.reduce((acc, deal) => {
    const stageId = deal.stage;
    if (!acc[stageId]) {
      acc[stageId] = {
        stageName: deal.stageName || deal.stage,
        stageOrder: deal.stageOrder || 999,
        deals: []
      };
    }
    acc[stageId].deals.push(deal);
    return acc;
  }, {});

  // Sort stages by display order (descending - latest to earliest)
  const sortedStages = Object.entries(dealsByStage).sort((a, b) => {
    return b[1].stageOrder - a[1].stageOrder;
  });

  return (
    <>
      <div className="table-container">
        {sortedStages.map(([stageId, stageData]) => (
          <div key={stageId} className="stage-section">
            <div className="stage-header">
              <h3 className="stage-title">{stageData.stageName}</h3>
              <span className="stage-count">{stageData.deals.length} deal{stageData.deals.length !== 1 ? 's' : ''}</span>
            </div>
            <table className="deals-table">
              <thead>
                <tr>
                  <th>Deal Name</th>
                  <th>Owner</th>
                  <th>Current Offer</th>
                  <th className="actions-column"></th>
                </tr>
              </thead>
              <tbody>
                {stageData.deals.map((deal) => (
                  <tr key={deal.id} className="clickable-row">
                    <td className="deal-name" onClick={() => onDealClick(deal)}>{deal.name || 'Untitled Deal'}</td>
                    <td className="owner" onClick={() => onDealClick(deal)}>{deal.owner || '-'}</td>
                    <td className="amount" onClick={() => onDealClick(deal)}>{formatCurrency(deal.currentOffer)}</td>
                    <td className="actions-cell">
                      <button
                        className="remove-icon-btn"
                        onClick={(e) => handleRemoveClick(e, deal.id)}
                        disabled={removingDealId === deal.id}
                        title="Remove from list"
                      >
                        {removingDealId === deal.id ? '...' : '×'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {confirmRemoveDealId && (
        <div className="confirmation-overlay" onClick={handleCancelRemove}>
          <div className="confirmation-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Are you sure?</h3>
            <p>Remove "Next-meeting" tag from this deal?</p>
            <p className="confirmation-note">The deal will be removed from this view.</p>
            <div className="confirmation-actions">
              <button onClick={handleCancelRemove} className="btn-cancel">
                Cancel
              </button>
              <button onClick={() => handleConfirmRemove(confirmRemoveDealId)} className="btn-confirm-remove">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DealsTable;
