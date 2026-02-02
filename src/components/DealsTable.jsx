function DealsTable({ deals, onDealClick }) {
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const getStageLabel = (stage) => {
    const stageMap = {
      appointmentscheduled: 'Appointment Scheduled',
      qualifiedtobuy: 'Qualified to Buy',
      presentationscheduled: 'Presentation Scheduled',
      decisionmakerboughtin: 'Decision Maker Bought-In',
      contractsent: 'Contract Sent',
      closedwon: 'Closed Won',
      closedlost: 'Closed Lost',
    };
    return stageMap[stage] || stage || '-';
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

  return (
    <div className="table-container">
      <table className="deals-table">
        <thead>
          <tr>
            <th>Deal Name</th>
            <th>Owner</th>
            <th>Stage</th>
            <th>Current Offer</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id} onClick={() => onDealClick(deal)} className="clickable-row">
              <td className="deal-name">{deal.name || 'Untitled Deal'}</td>
              <td className="owner">{deal.owner || '-'}</td>
              <td>
                <span className={`stage-badge ${getStageClass(deal.stage)}`}>
                  {deal.stageName || deal.stage || '-'}
                </span>
              </td>
              <td className="amount">{formatCurrency(deal.currentOffer)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DealsTable;
