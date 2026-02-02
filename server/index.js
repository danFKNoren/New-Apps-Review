import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import passport from 'passport';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { configurePassport } from './config/passport.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = 3001;

// CORS configuration with credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Session configuration (required for passport)
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const USE_DUMMY_DATA = !HUBSPOT_API_KEY || HUBSPOT_API_KEY === 'YOUR_API_KEY_HERE' || process.env.USE_DUMMY_DATA === 'true';

// Cache for stage ID to name mapping, portal ID, and owner mapping
let stageMapping = {};
let stageMappingLoaded = false;
let portalId = null;
let ownerMapping = {};
let ownerMappingLoaded = false;

// Fetch account info to get portal ID
async function loadPortalId() {
  if (portalId) return;

  try {
    const response = await axios.get(
      'https://api.hubapi.com/account-info/v3/details',
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    portalId = response.data.portalId;
    console.log('Loaded portal ID:', portalId);
  } catch (error) {
    console.error('Error loading portal ID:', error.message);
  }
}

// Fetch pipeline stages to map IDs to names
async function loadStageMapping() {
  if (stageMappingLoaded) return;

  try {
    const response = await axios.get(
      'https://api.hubapi.com/crm/v3/pipelines/deals',
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    stageMapping = {};
    for (const pipeline of response.data.results) {
      for (const stage of pipeline.stages) {
        stageMapping[stage.id] = stage.label;
      }
    }
    stageMappingLoaded = true;
    console.log('Loaded stage mapping:', Object.keys(stageMapping).length, 'stages');
  } catch (error) {
    console.error('Error loading stage mapping:', error.message);
  }
}

// Fetch a single owner by ID
async function fetchOwner(ownerId) {
  if (ownerMapping[ownerId]) return ownerMapping[ownerId];

  try {
    const response = await axios.get(
      `https://api.hubapi.com/crm/v3/owners/${ownerId}`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const owner = response.data;
    const fullName = [owner.firstName, owner.lastName].filter(Boolean).join(' ');
    const name = fullName || owner.email || `Owner #${ownerId}`;
    ownerMapping[ownerId] = name;
    return name;
  } catch (error) {
    console.error(`Error fetching owner ${ownerId}:`, error.message);
    return `Owner #${ownerId}`;
  }
}

// Fetch owners to map IDs to names
async function loadOwnerMapping(ownerIds) {
  try {
    // Fetch owners that we don't have in cache yet
    const uncachedOwnerIds = ownerIds.filter(id => !ownerMapping[id]);

    if (uncachedOwnerIds.length === 0) return;

    // Fetch each owner individually
    await Promise.all(uncachedOwnerIds.map(id => fetchOwner(id)));

    console.log('Loaded owner mapping:', Object.keys(ownerMapping).length, 'owners');
  } catch (error) {
    console.error('Error loading owner mapping:', error.message);
  }
}

// Dummy data for development
const dummyDeals = [
  {
    id: '1', name: 'Acme Corp - Enterprise License', stage: 'contractsent', amount: '75000', closeDate: '2026-02-15', owner: 'Sarah Chen', currentOffer: 15000,
    googlePlayPage: 'https://play.google.com/store/apps/details?id=com.example.app',
    transferSummary: 'This app has strong organic growth and consistent revenue streams. The retention metrics are above industry average, making it a solid acquisition target. Key assets include established user base and proven monetization strategy.',
    performance: {
      avgRevAds3m: 373, avgRevIAP3m: 0, avgExpenses3m: 0, avgOtherExpenses3m: 0,
      avgProfit3m: 373, avgUAProfit: null, avgUARev3m: null, pctUAProfit: null, uaROI: null,
      avgInstalls3m: 23559, avgOrgInstalls3m: 23559, pctOrgInstalls: 100,
      topCountries: 'US, UK, CA', appRating: 4.7, retentionD1: 42, retentionD7: 18,
      avgEngagementTime: null, lastDataUpdate: '2026-01-21',
      revAdsLastMonth: 370, revIAPLastMonth: 0, expensesLastMonth: 0, otherExpensesLastMonth: 0,
      profitLastMonth: 370, installsLastMonth: 25496, orgInstallsLastMonth: 25496, otherExpensesDetails: null
    }
  },
  {
    id: '2', name: 'TechStart Inc - Annual Plan', stage: 'qualifiedtobuy', amount: '24000', closeDate: '2026-02-28', owner: 'Mike Johnson', currentOffer: 28000,
    performance: {
      avgRevAds3m: 890, avgRevIAP3m: 250, avgExpenses3m: 120, avgOtherExpenses3m: 50,
      avgProfit3m: 970, avgUAProfit: 450, avgUARev3m: 600, pctUAProfit: 75, uaROI: 2.5,
      avgInstalls3m: 45000, avgOrgInstalls3m: 32000, pctOrgInstalls: 71,
      topCountries: 'US, DE, FR', appRating: 4.5, retentionD1: 38, retentionD7: 15,
      avgEngagementTime: 12.5, lastDataUpdate: '2026-01-20',
      revAdsLastMonth: 920, revIAPLastMonth: 280, expensesLastMonth: 100, otherExpensesLastMonth: 30,
      profitLastMonth: 1070, installsLastMonth: 48000, orgInstallsLastMonth: 35000, otherExpensesDetails: 'Marketing'
    }
  },
  {
    id: '3', name: 'Global Solutions - Expansion', stage: 'closedwon', amount: '150000', closeDate: '2026-01-10', owner: 'Sarah Chen', currentOffer: 180000,
    googlePlayPage: 'https://play.google.com/store/apps/details?id=com.global.app',
    performance: {
      avgRevAds3m: 2500, avgRevIAP3m: 1800, avgExpenses3m: 500, avgOtherExpenses3m: 200,
      avgProfit3m: 3600, avgUAProfit: 1200, avgUARev3m: 1500, pctUAProfit: 80, uaROI: 3.2,
      avgInstalls3m: 120000, avgOrgInstalls3m: 85000, pctOrgInstalls: 71,
      topCountries: 'US, JP, BR', appRating: 4.8, retentionD1: 52, retentionD7: 28,
      avgEngagementTime: 18.3, lastDataUpdate: '2026-01-22',
      revAdsLastMonth: 2800, revIAPLastMonth: 2100, expensesLastMonth: 450, otherExpensesLastMonth: 180,
      profitLastMonth: 4270, installsLastMonth: 135000, orgInstallsLastMonth: 95000, otherExpensesDetails: null
    }
  },
  {
    id: '4', name: 'Startup Labs - Pilot Program', stage: 'presentationscheduled', amount: '12000', closeDate: '2026-03-01', owner: 'Alex Rivera', currentOffer: 5000,
    performance: {
      avgRevAds3m: 150, avgRevIAP3m: 0, avgExpenses3m: 80, avgOtherExpenses3m: 0,
      avgProfit3m: 70, avgUAProfit: null, avgUARev3m: null, pctUAProfit: null, uaROI: null,
      avgInstalls3m: 8500, avgOrgInstalls3m: 8500, pctOrgInstalls: 100,
      topCountries: 'US', appRating: 4.2, retentionD1: 35, retentionD7: 12,
      avgEngagementTime: 8.2, lastDataUpdate: '2026-01-19',
      revAdsLastMonth: 180, revIAPLastMonth: 0, expensesLastMonth: 75, otherExpensesLastMonth: 0,
      profitLastMonth: 105, installsLastMonth: 9200, orgInstallsLastMonth: 9200, otherExpensesDetails: null
    }
  },
  {
    id: '5', name: 'MegaCorp - Custom Integration', stage: 'decisionmakerboughtin', amount: '95000', closeDate: '2026-02-20', owner: 'Mike Johnson', currentOffer: 120000,
    performance: {
      avgRevAds3m: 1800, avgRevIAP3m: 3200, avgExpenses3m: 800, avgOtherExpenses3m: 300,
      avgProfit3m: 3900, avgUAProfit: 2100, avgUARev3m: 2800, pctUAProfit: 75, uaROI: 2.8,
      avgInstalls3m: 95000, avgOrgInstalls3m: 55000, pctOrgInstalls: 58,
      topCountries: 'US, UK, AU', appRating: 4.6, retentionD1: 48, retentionD7: 24,
      avgEngagementTime: 15.7, lastDataUpdate: '2026-01-21',
      revAdsLastMonth: 1950, revIAPLastMonth: 3500, expensesLastMonth: 750, otherExpensesLastMonth: 280,
      profitLastMonth: 4420, installsLastMonth: 102000, orgInstallsLastMonth: 58000, otherExpensesDetails: 'Server costs'
    }
  },
  {
    id: '6', name: 'Local Business Pro', stage: 'closedlost', amount: '8500', closeDate: '2026-01-05', owner: 'Alex Rivera', currentOffer: 2000,
    performance: {
      avgRevAds3m: 45, avgRevIAP3m: 0, avgExpenses3m: 60, avgOtherExpenses3m: 20,
      avgProfit3m: -35, avgUAProfit: null, avgUARev3m: null, pctUAProfit: null, uaROI: -0.5,
      avgInstalls3m: 2100, avgOrgInstalls3m: 1800, pctOrgInstalls: 86,
      topCountries: 'US', appRating: 3.8, retentionD1: 22, retentionD7: 8,
      avgEngagementTime: 4.5, lastDataUpdate: '2026-01-18',
      revAdsLastMonth: 30, revIAPLastMonth: 0, expensesLastMonth: 55, otherExpensesLastMonth: 15,
      profitLastMonth: -40, installsLastMonth: 1900, orgInstallsLastMonth: 1650, otherExpensesDetails: 'Support'
    }
  },
  {
    id: '7', name: 'CloudFirst - Team Plan', stage: 'appointmentscheduled', amount: '36000', closeDate: '2026-03-15', owner: 'Sarah Chen', currentOffer: 18000,
    performance: {
      avgRevAds3m: 620, avgRevIAP3m: 180, avgExpenses3m: 150, avgOtherExpenses3m: 40,
      avgProfit3m: 610, avgUAProfit: 280, avgUARev3m: 350, pctUAProfit: 80, uaROI: 1.9,
      avgInstalls3m: 32000, avgOrgInstalls3m: 24000, pctOrgInstalls: 75,
      topCountries: 'US, CA, MX', appRating: 4.4, retentionD1: 40, retentionD7: 17,
      avgEngagementTime: 11.2, lastDataUpdate: '2026-01-20',
      revAdsLastMonth: 680, revIAPLastMonth: 210, expensesLastMonth: 140, otherExpensesLastMonth: 35,
      profitLastMonth: 715, installsLastMonth: 35000, orgInstallsLastMonth: 26500, otherExpensesDetails: null
    }
  },
  {
    id: '8', name: 'DataDriven Analytics', stage: 'closedwon', amount: '62000', closeDate: '2026-01-18', owner: 'Mike Johnson', currentOffer: 55000,
    performance: {
      avgRevAds3m: 1100, avgRevIAP3m: 850, avgExpenses3m: 280, avgOtherExpenses3m: 100,
      avgProfit3m: 1570, avgUAProfit: 720, avgUARev3m: 900, pctUAProfit: 80, uaROI: 2.6,
      avgInstalls3m: 58000, avgOrgInstalls3m: 42000, pctOrgInstalls: 72,
      topCountries: 'US, UK, DE', appRating: 4.7, retentionD1: 45, retentionD7: 22,
      avgEngagementTime: 14.8, lastDataUpdate: '2026-01-22',
      revAdsLastMonth: 1250, revIAPLastMonth: 920, expensesLastMonth: 260, otherExpensesLastMonth: 90,
      profitLastMonth: 1820, installsLastMonth: 63000, orgInstallsLastMonth: 46000, otherExpensesDetails: null
    }
  },
  {
    id: '9', name: 'Retail Plus - Multi-location', stage: 'contractsent', amount: '45000', closeDate: '2026-02-10', owner: 'Alex Rivera', currentOffer: 32000,
    performance: {
      avgRevAds3m: 780, avgRevIAP3m: 420, avgExpenses3m: 200, avgOtherExpenses3m: 80,
      avgProfit3m: 920, avgUAProfit: 380, avgUARev3m: 480, pctUAProfit: 79, uaROI: 2.0,
      avgInstalls3m: 41000, avgOrgInstalls3m: 29000, pctOrgInstalls: 71,
      topCountries: 'US, CA', appRating: 4.3, retentionD1: 36, retentionD7: 14,
      avgEngagementTime: 9.8, lastDataUpdate: '2026-01-21',
      revAdsLastMonth: 850, revIAPLastMonth: 480, expensesLastMonth: 180, otherExpensesLastMonth: 70,
      profitLastMonth: 1080, installsLastMonth: 44000, orgInstallsLastMonth: 31500, otherExpensesDetails: null
    }
  },
  {
    id: '10', name: 'FinanceHub - Compliance Package', stage: 'qualifiedtobuy', amount: '88000', closeDate: '2026-03-30', owner: 'Sarah Chen', currentOffer: 85000,
    performance: {
      avgRevAds3m: 1450, avgRevIAP3m: 2200, avgExpenses3m: 600, avgOtherExpenses3m: 250,
      avgProfit3m: 2800, avgUAProfit: 1400, avgUARev3m: 1750, pctUAProfit: 80, uaROI: 2.3,
      avgInstalls3m: 72000, avgOrgInstalls3m: 48000, pctOrgInstalls: 67,
      topCountries: 'US, UK, SG', appRating: 4.5, retentionD1: 44, retentionD7: 20,
      avgEngagementTime: 13.5, lastDataUpdate: '2026-01-22',
      revAdsLastMonth: 1580, revIAPLastMonth: 2400, expensesLastMonth: 550, otherExpensesLastMonth: 220,
      profitLastMonth: 3210, installsLastMonth: 78000, orgInstallsLastMonth: 52000, otherExpensesDetails: 'Compliance audit'
    }
  },
];

if (USE_DUMMY_DATA) {
  console.log('Running with DUMMY DATA (no valid HubSpot API key configured)');
}

// Auth Routes

// Start OAuth flow
app.get('/api/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

// OAuth callback
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
      },
      process.env.JWT_SECRET || 'fallback-jwt-secret',
      { expiresIn: '7d' }
    );

    // Set JWT in httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  }
);

// Get current user
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true });
});

// Proxy endpoint for HubSpot deals (protected)
app.get('/api/deals', requireAuth, async (req, res) => {
  // Return dummy data if no valid API key
  if (USE_DUMMY_DATA) {
    return res.json({ deals: dummyDeals });
  }

  try {
    // Load stage mapping and portal ID if not already loaded
    if (!stageMappingLoaded) {
      await loadStageMapping();
    }
    if (!portalId) {
      await loadPortalId();
    }

    // Use Search API to filter by Next-meeting tag only
    const response = await axios.post(
      'https://api.hubapi.com/crm/v3/objects/deals/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'tags',
                operator: 'CONTAINS_TOKEN',
                value: 'Next-meeting'
              }
            ]
          }
        ],
        limit: 100,
        properties: [
          // Basic deal info
          'dealname',
          'dealstage',
          'amount',
          'closedate',
          'hubspot_owner_id',
          'hubspot_owner_assigneddate',
          'hs_object_source_label',
          'hs_lastmodifieddate',
          'current_offer',
          'tags',
          'google_play_page',
          'transfer_summary',
          // 3-month averages
          'avg_rev_last_3_months',
          'avg_rev__iap__sub__last_3_months',
          'avg_expenses_last_3_months',
          'avg_other_expenses_last_3_months',
          'avg_profit_last_3_months',
          'avg_ua_profit',
          'avg_ua_rev_last_3_months',
          'ua_profit',
          'ua_roi',
          'avg_installs_last_3_month',
          'avg_organic_installs_last_3_months',
          'organic_installs',
          // App metrics
          'top_countries',
          'app_rating',
          'retention_day_1',
          'retention_day_7',
          'average_engagement_time_per_active_user',
          // Last month data
          'app_revenue__from_ads_last_30_days',
          'app_revenue__from_from_inapp_last_30_days',
          'expenses_last_month',
          'other_expenses_last_month',
          'profit_last_month',
          'installs_last_month',
          'organic_installs_last_month',
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract unique owner IDs and fetch their names
    const ownerIds = [...new Set(
      response.data.results
        .map(deal => deal.properties.hubspot_owner_id)
        .filter(Boolean)
    )];

    if (ownerIds.length > 0) {
      await loadOwnerMapping(ownerIds);
    }

    // Helper function to properly round to 2 decimals without floating point errors
    const round2 = (val) => parseFloat(val.toFixed(2));
    const percentToDisplay = (val) => round2(val * 100);

    const deals = response.data.results
      .map((deal) => {
        const props = deal.properties;
        const ownerId = props.hubspot_owner_id;

        return {
          id: deal.id,
          name: props.dealname,
          stage: props.dealstage,
          stageName: stageMapping[props.dealstage] || props.dealstage,
          amount: props.amount,
          closeDate: props.closedate,
          ownerId: ownerId,
          owner: ownerId ? (ownerMapping[ownerId] || `Owner #${ownerId}`) : null,
          lastModified: props.hs_lastmodifieddate,
          currentOffer: parseFloat(props.current_offer) || null,
          googlePlayPage: props.google_play_page || null,
          transferSummary: props.transfer_summary || null,
          performance: {
            avgRevAds3m: props.avg_rev_last_3_months ? round2(parseFloat(props.avg_rev_last_3_months)) : null,
            avgRevIAP3m: props.avg_rev__iap__sub__last_3_months ? round2(parseFloat(props.avg_rev__iap__sub__last_3_months)) : null,
            avgExpenses3m: props.avg_expenses_last_3_months ? round2(parseFloat(props.avg_expenses_last_3_months)) : null,
            avgOtherExpenses3m: props.avg_other_expenses_last_3_months ? round2(parseFloat(props.avg_other_expenses_last_3_months)) : null,
            avgProfit3m: props.avg_profit_last_3_months ? round2(parseFloat(props.avg_profit_last_3_months)) : null,
            avgUAProfit: props.avg_ua_profit ? round2(parseFloat(props.avg_ua_profit)) : null,
            avgUARev3m: props.avg_ua_rev_last_3_months ? round2(parseFloat(props.avg_ua_rev_last_3_months)) : null,
            pctUAProfit: props.ua_profit ? percentToDisplay(parseFloat(props.ua_profit)) : null,
            uaROI: props.ua_roi ? round2(parseFloat(props.ua_roi)) : null,
            avgInstalls3m: props.avg_installs_last_3_month ? Math.round(parseFloat(props.avg_installs_last_3_month)) : null,
            avgOrgInstalls3m: props.avg_organic_installs_last_3_months ? Math.round(parseFloat(props.avg_organic_installs_last_3_months)) : null,
            pctOrgInstalls: props.organic_installs ? percentToDisplay(parseFloat(props.organic_installs)) : null,
            topCountries: props.top_countries || null,
            appRating: props.app_rating ? round2(parseFloat(props.app_rating)) : null,
            retentionD1: props.retention_day_1 ? percentToDisplay(parseFloat(props.retention_day_1)) : null,
            retentionD7: props.retention_day_7 ? percentToDisplay(parseFloat(props.retention_day_7)) : null,
            avgEngagementTime: props.average_engagement_time_per_active_user ? round2(parseFloat(props.average_engagement_time_per_active_user)) : null,
            lastDataUpdate: props.hs_lastmodifieddate?.split('T')[0] || '--',
            revAdsLastMonth: props.app_revenue__from_ads_last_30_days ? round2(parseFloat(props.app_revenue__from_ads_last_30_days)) : null,
            revIAPLastMonth: props.app_revenue__from_from_inapp_last_30_days ? round2(parseFloat(props.app_revenue__from_from_inapp_last_30_days)) : null,
            expensesLastMonth: props.expenses_last_month ? round2(parseFloat(props.expenses_last_month)) : null,
            otherExpensesLastMonth: props.other_expenses_last_month ? round2(parseFloat(props.other_expenses_last_month)) : null,
            profitLastMonth: props.profit_last_month ? round2(parseFloat(props.profit_last_month)) : null,
            installsLastMonth: props.installs_last_month ? Math.round(parseFloat(props.installs_last_month)) : null,
            orgInstallsLastMonth: props.organic_installs_last_month ? Math.round(parseFloat(props.organic_installs_last_month)) : null,
            otherExpensesDetails: null, // This might be in another property
          },
        };
      });

    res.json({ deals, portalId });
  } catch (error) {
    console.error('HubSpot API Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch deals from HubSpot',
      details: error.response?.data?.message || error.message,
    });
  }
});

// Remove "Next-meeting" tag from a deal (protected)
app.post('/api/deals/:dealId/remove-tag', requireAuth, async (req, res) => {
  const { dealId } = req.params;

  console.log(`[TAG REMOVAL] Request received for deal ID: ${dealId}`);

  // For dummy data, just return success
  if (USE_DUMMY_DATA) {
    console.log('[TAG REMOVAL] Running in dummy mode - simulating success');
    return res.json({ success: true, message: 'Tag removed (dummy mode)' });
  }

  try {
    console.log('[TAG REMOVAL] Fetching current tags from HubSpot...');
    // Fetch the current deal to get its tags
    const dealResponse = await axios.get(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=tags`,
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const currentTags = dealResponse.data.properties.tags || '';
    console.log('[TAG REMOVAL] Current tags:', currentTags);

    // Remove "Next-meeting" tag (tags can be separated by semicolons or commas)
    const separator = currentTags.includes(';') ? ';' : ',';
    const tagsArray = currentTags.split(separator).map(tag => tag.trim()).filter(tag => tag !== '');
    const updatedTags = tagsArray.filter(tag => tag !== 'Next-meeting').join(separator);

    console.log('[TAG REMOVAL] Updated tags:', updatedTags);

    // Update the deal with the new tags
    console.log('[TAG REMOVAL] Updating deal in HubSpot...');
    await axios.patch(
      `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      {
        properties: {
          tags: updatedTags,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[TAG REMOVAL] Successfully removed tag from HubSpot');
    res.json({ success: true, message: 'Tag removed successfully' });
  } catch (error) {
    console.error('[TAG REMOVAL] Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to remove tag',
      details: error.response?.data?.message || error.message,
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dummyData: USE_DUMMY_DATA });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
