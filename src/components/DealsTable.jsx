function DealsTable({ deals, onDealClick }) {
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
              </tr>
            </thead>
            <tbody>
              {stageData.deals.map((deal) => (
                <tr key={deal.id} onClick={() => onDealClick(deal)} className="clickable-row">
                  <td className="deal-name">{deal.name || 'Untitled Deal'}</td>
                  <td className="owner">{deal.owner || '-'}</td>
                  <td className="amount">{formatCurrency(deal.currentOffer)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default DealsTable;
