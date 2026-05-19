const MICROSOFT_AUTHORITY = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0`;
const MICROSOFT_SCOPES = 'openid profile email User.Read Mail.Read Mail.Send offline_access';

export function getAuthUrl(state) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI || '');
  const scope = encodeURIComponent(MICROSOFT_SCOPES);
  const stateEnc = encodeURIComponent(state);
  return `${MICROSOFT_AUTHORITY}/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scope}&state=${stateEnc}&prompt=consent`;
}

export async function exchangeCodeForTokens(code) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  const tokenUrl = `${MICROSOFT_AUTHORITY}/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${errText}`);
  }

  return res.json();
}

export async function getProfile(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph me failed: ${res.status} ${errText}`);
  }
  return res.json();
}

/**
 * Refresh access token using refresh_token
 */
export async function refreshAccessToken(refreshToken) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tokenUrl = `${MICROSOFT_AUTHORITY}/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${errText}`);
  }
  return res.json();
}

/**
 * Fetch messages from a mail folder (Microsoft Graph well-known names: inbox, sentitems, drafts, ...)
 */
export async function fetchFolderMessages(accessToken, folderName, top = 50) {
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/${folderName}/messages?$top=${top}&$orderby=receivedDateTime%20DESC&$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,conversationId,internetMessageId`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph messages failed: ${res.status} ${errText}`);
  }
  return res.json();
}

/** Inbox - thư đến */
export async function fetchInboxMessages(accessToken, top = 50) {
  return fetchFolderMessages(accessToken, 'inbox', top);
}

/**
 * Lấy danh sách mail folders (để tìm id của Sent Items nếu well-known name không dùng được)
 */
export async function fetchMailFolders(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me/mailFolders?$top=20', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph mailFolders failed: ${res.status} ${errText}`);
  }
  return res.json();
}

/** Sent Items - thư đã gửi. Thử sentitems (lowercase per docs), nếu 404 thì lấy folder id từ list */
export async function fetchSentMessages(accessToken, top = 50) {
  const url = `https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages?$top=${top}&$orderby=receivedDateTime%20DESC&$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,conversationId,internetMessageId`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.ok) return res.json();
  if (res.status === 404) {
    const foldersRes = await fetchMailFolders(accessToken);
    const folders = foldersRes.value || [];
    const sentFolder = folders.find(
      (f) => (f.wellKnownName && f.wellKnownName.toLowerCase() === 'sentitems') || (f.displayName && (f.displayName.toLowerCase().includes('sent') || f.displayName.toLowerCase().includes('đã gửi')))
    );
    if (sentFolder && sentFolder.id) {
      const res2 = await fetch(
        `https://graph.microsoft.com/v1.0/me/mailFolders/${encodeURIComponent(sentFolder.id)}/messages?$top=${top}&$orderby=receivedDateTime%20DESC&$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,conversationId,internetMessageId`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res2.ok) {
        const errText = await res2.text();
        throw new Error(`Graph sent messages failed: ${res2.status} ${errText}`);
      }
      return res2.json();
    }
  }
  const errText = await res.text();
  throw new Error(`Graph sent messages failed: ${res.status} ${errText}`);
}

/**
 * Gửi email qua Microsoft Graph (POST /me/sendMail).
 * @param {string} accessToken - Bearer token
 * @param {object} message - { to, cc?, subject, body, bodyContentType?: 'Text'|'HTML', attachments?: [{ name, contentType, contentBytes }] }
 */
export async function sendMail(accessToken, message) {
  const toList = normalizeRecipientsList(message.to);
  const ccList = message.cc ? normalizeRecipientsList(message.cc) : [];
  if (toList.length === 0) {
    throw new Error('Cần ít nhất một người nhận (Đến).');
  }
  const bodyContentType = (message.bodyContentType || 'HTML').toUpperCase() === 'HTML' ? 'HTML' : 'Text';
  const attachments = (message.attachments || []).filter((a) => a && a.name && a.contentBytes);
  const graphAttachments = attachments.map((a) => ({
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: a.name,
    contentType: a.contentType || 'application/octet-stream',
    contentBytes: a.contentBytes
  }));
  const payload = {
    message: {
      subject: message.subject || '(Không tiêu đề)',
      body: { contentType: bodyContentType, content: message.body || '' },
      toRecipients: toList.map((r) => ({ emailAddress: { address: r.address, name: r.name || undefined } })),
      ...(ccList.length > 0 && { ccRecipients: ccList.map((r) => ({ emailAddress: { address: r.address, name: r.name || undefined } })) }),
      ...(graphAttachments.length > 0 && { attachments: graphAttachments })
    },
    saveToSentItems: true
  };
  const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gửi thư thất bại: ${res.status} ${errText}`);
  }
}

/** Chuẩn hóa to/cc thành mảng { address, name } */
function normalizeRecipientsList(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : [input];
  const out = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
      if (match) {
        out.push({ name: match[1].trim(), address: match[2].trim() });
      } else {
        out.push({ address: trimmed, name: '' });
      }
    } else if (item && (item.address || item.email)) {
      out.push({ address: item.address || item.email, name: item.name || '' });
    }
  }
  return out;
}