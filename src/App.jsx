import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import DealsTable from './components/DealsTable';
import DealDetail from './components/DealDetail';
import Login from './components/Login';

function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDealIndex, setSelectedDealIndex] = useState(null);
  const [portalId, setPortalId] = useState(null);

  useEffect(() => {
    fetchDeals();
  }, []);

  // Sort deals to match the display order in DealsTable (grouped by stage, sorted by stageOrder descending)
  const sortDealsByStage = (dealsArray) => {
    // Group deals by stage
    const dealsByStage = dealsArray.reduce((acc, deal) => {
      const stageId = deal.stage;
      if (!acc[stageId]) {
        acc[stageId] = {
          stageOrder: deal.stageOrder || 999,
          deals: []
        };
      }
      acc[stageId].deals.push(deal);
      return acc;
    }, {});

    // Sort stages by display order (descending) and flatten back into array
    return Object.values(dealsByStage)
      .sort((a, b) => b.stageOrder - a.stageOrder)
      .flatMap(stage => stage.deals);
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/deals', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch deals');
      }

      const data = await response.json();
      const sortedDeals = sortDealsByStage(data.deals);
      setDeals(sortedDeals);
      setPortalId(data.portalId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDealClick = (deal) => {
    const index = deals.findIndex(d => d.id === deal.id);
    setSelectedDealIndex(index);
  };

  const handleNextDeal = () => {
    if (selectedDealIndex < deals.length - 1) {
      setSelectedDealIndex(selectedDealIndex + 1);
    }
  };

  const handlePreviousDeal = () => {
    if (selectedDealIndex > 0) {
      setSelectedDealIndex(selectedDealIndex - 1);
    }
  };

  const handleTagRemoved = (dealId) => {
    // Remove the deal from the list
    setDeals(prevDeals => prevDeals.filter(d => d.id !== dealId));
    setSelectedDealIndex(null);
  };

  const selectedDeal = selectedDealIndex !== null ? deals[selectedDealIndex] : null;

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>Weekly Apps Evaluation Dashboard</h1>
            <p className="subtitle">HubSpot Deals Overview</p>
          </div>
          <div className="user-section">
            <div className="user-info">
              {user.picture && <img src={user.picture} alt={user.name} className="user-avatar" />}
              <div className="user-details">
                <span className="user-name">{user.name}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
            <button className="logout-button" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
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
            <DealsTable deals={deals} onDealClick={handleDealClick} onRemoveDeal={handleTagRemoved} />
          </>
        )}
      </main>

      {selectedDeal && (
        <DealDetail
          deal={selectedDeal}
          portalId={portalId}
          onClose={() => setSelectedDealIndex(null)}
          onNext={handleNextDeal}
          onPrevious={handlePreviousDeal}
          hasNext={selectedDealIndex < deals.length - 1}
          hasPrevious={selectedDealIndex > 0}
          onTagRemoved={handleTagRemoved}
        />
      )}
    </div>
  );
}

export default App;
