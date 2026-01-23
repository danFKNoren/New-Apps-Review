import { useState, useEffect } from 'react';
import DealsTable from './components/DealsTable';
import DealDetail from './components/DealDetail';

function App() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/deals');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch deals');
      }

      const data = await response.json();
      setDeals(data.deals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Weekly Apps Evaluation Dashboard</h1>
        <p className="subtitle">HubSpot Deals Overview</p>
      </header>

      <main className="main">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading deals...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>Error: {error}</p>
            <button onClick={fetchDeals}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="stats">
              <div className="stat-card">
                <span className="stat-value">{deals.length}</span>
                <span className="stat-label">Total Deals</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">
                  ${deals.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toLocaleString()}
                </span>
                <span className="stat-label">Total Value</span>
              </div>
            </div>
            <DealsTable deals={deals} onDealClick={setSelectedDeal} />
          </>
        )}
      </main>

      {selectedDeal && (
        <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      )}
    </div>
  );
}

export default App;
