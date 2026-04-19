const { setGlobalOptions } = require('firebase-functions');
const { onCall } = require('firebase-functions/v2/https');

setGlobalOptions({ maxInstances: 10, region: 'europe-west1' });

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

exports.stravaExchangeToken = onCall(
  { secrets: ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'] },
  async (request) => {
    const { code } = request.data;
    if (!code) throw new Error('Missing code');

    const res = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    });
    if (!res.ok) throw new Error('Strava token exchange failed');
    return res.json();
  }
);

exports.stravaRefreshToken = onCall(
  { secrets: ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'] },
  async (request) => {
    const { refreshToken } = request.data;
    if (!refreshToken) throw new Error('Missing refreshToken');

    const res = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    if (!res.ok) throw new Error('Strava token refresh failed');
    return res.json();
  }
);
