import { OutlookConnection } from '../../models/index.js';
import { getAuthUrl, exchangeCodeForTokens, getProfile } from '../../services/outlookOAuthService.js';
import { generateToken, verifyToken } from '../../utils/jwt.js';

// Sau OAuth callback, redirect user về đây. Khi test qua Dev Tunnel: set FRONTEND_URL = URL tunnel frontend (vd: https://xxx-5173.asse.devtunnels.ms)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const EMAIL_PAGE_PATH = '/admin/emails';
function redirectToEmailPage(queryParams) {
  const base = `${FRONTEND_URL.replace(/\/$/, '')}${EMAIL_PAGE_PATH}`;
  const qs = new URLSearchParams(queryParams).toString();
  return qs ? `${base}?${qs}` : base;
}

export async function connect(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const state = generateToken(
      { adminId, purpose: 'outlook_connect' },
      '600s'
    );
    const authUrl = getAuthUrl(state);
    return res.redirect(302, authUrl);
  } catch (err) {
    console.error('Outlook connect error:', err);
    return res.redirect(302, redirectToEmailPage({ outlook: 'error', message: err.message || 'Connect failed' }));
  }
}

export async function callback(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      const msg = error_description || error;
      return res.redirect(302, redirectToEmailPage({ outlook: 'error', message: msg }));
    }

    if (!code || !state) {
      return res.redirect(302, redirectToEmailPage({ outlook: 'error', message: 'Missing code or state' }));
    }

    const decoded = verifyToken(state);
    if (decoded.purpose !== 'outlook_connect' || !decoded.adminId) {
      return res.redirect(302, redirectToEmailPage({ outlook: 'error', message: 'Invalid state' }));
    }

    const adminId = decoded.adminId;
    const tokens = await exchangeCodeForTokens(code);
    const profile = await getProfile(tokens.access_token);

    const email = profile.mail || profile.userPrincipalName || '';
    if (!email) {
      return res.redirect(302, redirectToEmailPage({ outlook: 'error', message: 'No email in profile' }));
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    let connection = await OutlookConnection.findOne({ where: { adminId } });
    if (connection) {
      await connection.update({
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        isActive: true,
        syncEnabled: true
      });
    } else {
      connection = await OutlookConnection.create({
        adminId,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt,
        isActive: true,
        syncEnabled: true
      });
    }

    return res.redirect(302, redirectToEmailPage({ outlook: 'connected', email }));
  } catch (err) {
    console.error('Outlook callback error:', err);
    const msg = err.message || 'Callback failed';
    return res.redirect(302, redirectToEmailPage({ outlook: 'error', message: msg }));
  }
}