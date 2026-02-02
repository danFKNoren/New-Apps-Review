# Google OAuth Setup Guide

## What's Been Implemented

### Backend Changes
- ✅ Installed authentication packages (passport, passport-google-oauth20, jsonwebtoken, cookie-parser, express-session)
- ✅ Created `/server/config/passport.js` - Google OAuth strategy configuration
- ✅ Created `/server/middleware/auth.js` - JWT validation middleware
- ✅ Updated `/server/index.js` with:
  - Auth routes: `/api/auth/google`, `/api/auth/google/callback`, `/api/auth/me`, `/api/auth/logout`
  - Protected `/api/deals` endpoint
  - CORS configuration with credentials

### Frontend Changes
- ✅ Installed js-cookie package
- ✅ Created `/src/context/AuthContext.jsx` - Global authentication state management
- ✅ Created `/src/components/Login.jsx` - Login page with Google sign-in button
- ✅ Updated `/src/App.jsx` - Conditional rendering based on auth state, user profile in header
- ✅ Updated `/src/main.jsx` - Wrapped app with AuthProvider
- ✅ Updated `/src/App.css` - Added styles for login page and user profile

### Environment Variables
- ✅ Updated `.env` with OAuth configuration placeholders

---

## Next Steps: Google Cloud Configuration

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. **Create or Select a Project**
   - Click on the project dropdown (top left)
   - Create a new project or select an existing one

3. **Configure OAuth Consent Screen**
   - Navigate to: APIs & Services → OAuth consent screen
   - Select **User Type: Internal** (This automatically restricts to @jedyapps.com)
   - Click "Create"
   - Fill in the required fields:
     - App name: "HubSpot Dashboard" (or your preferred name)
     - User support email: your@jedyapps.com
     - Developer contact: your@jedyapps.com
   - Click "Save and Continue"
   - **Scopes**: Click "Add or Remove Scopes"
     - Add: `email`, `profile`, `openid` (usually pre-selected)
   - Click "Save and Continue"
   - Review summary and click "Back to Dashboard"

4. **Create OAuth 2.0 Credentials**
   - Navigate to: APIs & Services → Credentials
   - Click "+ Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "HubSpot Dashboard Web Client"
   - **Authorized JavaScript origins:**
     - `http://localhost:5173` (for local development)
     - `http://localhost:5175` (alternative port)
   - **Authorized redirect URIs:**
     - `http://localhost:5173/api/auth/google/callback`
     - `http://localhost:5175/api/auth/google/callback`
     - Add your production URL when ready: `https://your-app.vercel.app/api/auth/google/callback`
   - Click "Create"
   - **Copy the Client ID and Client Secret** (you'll need these next)

### Step 2: Update Environment Variables

Edit your `.env` file in the project root:

```bash
# Replace these with your actual values from Google Cloud Console
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET

# Generate random secrets (use: openssl rand -base64 32)
JWT_SECRET=YOUR_RANDOM_32_CHAR_STRING_HERE
SESSION_SECRET=YOUR_RANDOM_32_CHAR_STRING_HERE

# Development URLs (adjust port if needed)
CALLBACK_URL=http://localhost:5175/api/auth/google/callback
FRONTEND_URL=http://localhost:5175
```

**To generate secure random secrets:**
```bash
# Run these commands in terminal to generate secrets:
openssl rand -base64 32   # For JWT_SECRET
openssl rand -base64 32   # For SESSION_SECRET
```

### Step 3: Start the Development Server

The server is already running. If you need to restart it:

```bash
cd hubspot-dashboard
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend on http://localhost:5173 (or 5175 if 5173 is taken)

### Step 4: Test the OAuth Flow

1. **Open the app in your browser** (check the terminal for the actual port)
   - You should see the login page with "Sign in with Google" button

2. **Click "Sign in with Google"**
   - You'll be redirected to Google's OAuth consent screen
   - Only @jedyapps.com accounts will be able to see this screen (Internal app restriction)
   - Grant the requested permissions

3. **After successful login:**
   - You'll be redirected back to the dashboard
   - Your profile picture, name, and email should appear in the header
   - The deals table should load (protected route working)

4. **Test session persistence:**
   - Refresh the page → you should stay logged in
   - Close and reopen the browser → you should stay logged in (7-day JWT expiration)

5. **Test logout:**
   - Click the "Logout" button in the header
   - You should be redirected to the login page
   - Cookie should be cleared

### Step 5: Verify Security

- ✅ JWT stored in httpOnly cookie (protected from XSS)
- ✅ CORS restricted to specific origin
- ✅ Domain restriction via Google Workspace Internal app
- ✅ Protected API endpoints require valid JWT
- ✅ Session expires after 7 days

---

## Troubleshooting

### "Authentication required" error
- Check that your `.env` file has the correct Google OAuth credentials
- Restart the dev server after changing `.env`
- Check browser console for errors

### "Redirect URI mismatch" error
- Verify the redirect URI in Google Cloud Console matches exactly: `http://localhost:5175/api/auth/google/callback`
- Check the port number in your terminal (might be 5173, 5174, or 5175)
- Add all possible local ports to the authorized redirect URIs

### Can't access with @jedyapps.com account
- Verify the OAuth app is set to "Internal" user type
- Check that your Google Workspace admin hasn't restricted OAuth apps

### "Failed to fetch" on /api/auth/me
- Check that the backend server is running on port 3001
- Verify CORS configuration in `server/index.js`
- Check browser network tab for actual error

---

## Production Deployment (Vercel)

When ready to deploy:

1. **Add environment variables in Vercel Dashboard:**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - `CALLBACK_URL=https://your-app.vercel.app/api/auth/google/callback`
   - `FRONTEND_URL=https://your-app.vercel.app`
   - `NODE_ENV=production`

2. **Update Google Cloud Console:**
   - Add production redirect URI: `https://your-app.vercel.app/api/auth/google/callback`
   - Add production JavaScript origin: `https://your-app.vercel.app`

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Add Google OAuth authentication"
   git push
   ```

---

## File Structure

```
hubspot-dashboard/
├── server/
│   ├── config/
│   │   └── passport.js         # Google OAuth strategy
│   ├── middleware/
│   │   └── auth.js            # JWT validation
│   └── index.js               # Auth routes & protected endpoints
├── src/
│   ├── components/
│   │   ├── Login.jsx          # Login page UI
│   │   ├── DealsTable.jsx     # (existing)
│   │   └── DealDetail.jsx     # (existing)
│   ├── context/
│   │   └── AuthContext.jsx    # Global auth state
│   ├── App.jsx                # Main app with auth logic
│   ├── App.css                # Styles (including login)
│   └── main.jsx               # Entry point with AuthProvider
├── .env                        # Environment variables
└── package.json                # Updated dependencies
```

---

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/auth/google` - Start OAuth flow
- `GET /api/auth/google/callback` - OAuth callback

### Protected Endpoints (require authentication)
- `GET /api/deals` - Fetch HubSpot deals
- `GET /api/auth/me` - Get current user

### Other Endpoints
- `POST /api/auth/logout` - Clear auth cookie

---

## Authentication Flow

```
1. User visits app → AuthContext checks /api/auth/me
2. If no valid JWT → Show Login page
3. User clicks "Sign in with Google" → Redirects to /api/auth/google
4. Google OAuth consent screen → User approves
5. Google redirects to /api/auth/google/callback
6. Server generates JWT, sets httpOnly cookie
7. Server redirects to frontend
8. Frontend checks auth again → User is authenticated
9. Dashboard loads with protected data
```

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal for server errors
3. Verify all environment variables are set correctly
4. Ensure Google Cloud OAuth app is configured as "Internal"
5. Make sure the redirect URIs match exactly (including port numbers)
