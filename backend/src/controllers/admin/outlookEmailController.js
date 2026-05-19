import { OutlookConnection, SyncedEmail } from '../../models/index.js';
import { fetchInboxMessages, fetchSentMessages, refreshAccessToken, sendMail } from '../../services/outlookOAuthService.js';

/**
 * GET /api/admin/outlook/connection - Lấy thông tin kết nối Outlook của admin hiện tại
 */
export async function getConnection(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const connection = await OutlookConnection.findOne({
      where: { adminId },
      attributes: ['id', 'email', 'isActive', 'syncEnabled', 'lastSyncAt']
    });
    if (!connection) {
      return res.status(200).json({
        success: true,
        data: { connection: null, connected: false }
      });
    }
    const plain = connection.get({ plain: true });
    return res.status(200).json({
      success: true,
      data: { connection: plain, connected: true }
    });
  } catch (err) {
    console.error('getConnection error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * POST /api/admin/outlook/disconnect - Đăng xuất / ngắt kết nối Outlook (xóa connection của admin hiện tại)
 */
export async function disconnect(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const connection = await OutlookConnection.findOne({ where: { adminId } });
    if (!connection) {
      return res.status(200).json({ success: true, message: 'Chưa kết nối Outlook.' });
    }
    await SyncedEmail.destroy({ where: { outlookConnectionId: connection.id } });
    await connection.destroy();
    return res.status(200).json({ success: true, message: 'Đã đăng xuất Outlook.' });
  } catch (err) {
    console.error('Outlook disconnect error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Đăng xuất thất bại' });
  }
}

/**
 * POST /api/admin/outlook/sync - Đồng bộ inbox từ Microsoft Graph vào DB
 */
export async function sync(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const connection = await OutlookConnection.findOne({ where: { adminId } });
    if (!connection) {
      return res.status(400).json({ success: false, message: 'Chưa kết nối Outlook. Vui lòng kết nối trước.' });
    }

    let accessToken = connection.accessToken;
    const expiresAt = connection.expiresAt;
    if (connection.refreshToken && expiresAt && new Date(expiresAt) <= new Date(Date.now() + 5 * 60 * 1000)) {
      const refreshed = await refreshAccessToken(connection.refreshToken);
      accessToken = refreshed.access_token;
      const newExpires = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;
      await connection.update({
        accessToken,
        refreshToken: refreshed.refresh_token || connection.refreshToken,
        expiresAt: newExpires
      });
    }

    const processMessages = async (messages, connectionId, folder, direction) => {
      let created = 0;
      let updated = 0;
      for (const msg of messages) {
        const from = msg.from?.emailAddress || {};
        const fromEmail = from.address || '';
        const fromName = from.name || '';
        const toRecipients = (msg.toRecipients || []).map(r => ({ email: r.emailAddress?.address, name: r.emailAddress?.name }));
        const ccRecipients = (msg.ccRecipients || []).map(r => ({ email: r.emailAddress?.address, name: r.emailAddress?.name }));
        const bccRecipients = (msg.bccRecipients || []).map(r => ({ email: r.emailAddress?.address, name: r.emailAddress?.name }));

        const [row, wasCreated] = await SyncedEmail.findOrCreate({
          where: { messageId: msg.id },
          defaults: {
            outlookConnectionId: connectionId,
            messageId: msg.id,
            conversationId: msg.conversationId || null,
            internetMessageId: msg.internetMessageId || null,
            subject: msg.subject || '',
            body: msg.body?.content || null,
            bodyPreview: msg.bodyPreview || null,
            fromEmail,
            fromName,
            toRecipients,
            ccRecipients,
            bccRecipients,
            receivedDateTime: msg.receivedDateTime ? new Date(msg.receivedDateTime) : null,
            sentDateTime: msg.sentDateTime ? new Date(msg.sentDateTime) : null,
            isRead: !!msg.isRead,
            hasAttachments: !!msg.hasAttachments,
            importance: msg.importance || null,
            folder,
            direction
          }
        });
        if (wasCreated) created++;
        else {
          await row.update({
            outlookConnectionId: connectionId,
            subject: msg.subject || '',
            body: msg.body?.content || row.body,
            bodyPreview: msg.bodyPreview || row.bodyPreview,
            fromEmail,
            fromName,
            toRecipients,
            ccRecipients,
            bccRecipients,
            receivedDateTime: msg.receivedDateTime ? new Date(msg.receivedDateTime) : row.receivedDateTime,
            sentDateTime: msg.sentDateTime ? new Date(msg.sentDateTime) : row.sentDateTime,
            isRead: !!msg.isRead,
            hasAttachments: !!msg.hasAttachments,
            importance: msg.importance || null,
            folder,
            direction
          });
          updated++;
        }
      }
      return { created, updated };
    };

    const callGraphInbox = async (token) => {
      const res = await fetchInboxMessages(token, 100);
      return res;
    };

    let inboxRes;
    try {
      inboxRes = await callGraphInbox(accessToken);
    } catch (graphErr) {
      const msg = graphErr.message || '';
      const is401 = /401|Unauthorized|invalid_token|Token/i.test(msg);
      const is403 = /403|Access denied|Forbidden/i.test(msg);
      console.error('Outlook sync inbox Graph error:', msg);
      if (is401 && connection.refreshToken) {
        try {
          const refreshed = await refreshAccessToken(connection.refreshToken);
          accessToken = refreshed.access_token;
          const newExpires = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;
          await connection.update({
            accessToken,
            refreshToken: refreshed.refresh_token || connection.refreshToken,
            ...(newExpires && { expiresAt: newExpires })
          });
          inboxRes = await callGraphInbox(accessToken);
        } catch (refreshErr) {
          console.error('Outlook sync refresh token failed:', refreshErr.message);
          return res.status(401).json({
            success: false,
            message: 'Token Outlook hết hạn. Vui lòng bấm "Kết nối lại" để đăng nhập lại Microsoft.'
          });
        }
      } else if (is401) {
        return res.status(401).json({
          success: false,
          message: 'Token Outlook hết hạn hoặc không hợp lệ. Vui lòng bấm "Kết nối lại" để đăng nhập lại Microsoft.'
        });
      } else if (is403) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản chưa có quyền đọc thư (Mail.Read). Vui lòng bấm "Kết nối lại" và đồng ý quyền khi Microsoft hỏi.'
        });
      } else {
        return res.status(502).json({
          success: false,
          message: msg || 'Không thể kết nối Microsoft Graph. Thử lại sau hoặc bấm "Kết nối lại".'
        });
      }
    }
    const inboxMessages = inboxRes.value || [];
    const inboxStats = await processMessages(inboxMessages, connection.id, 'inbox', 'inbound');

    let sentStats = { created: 0, updated: 0 };
    let sentMessages = [];
    try {
      const sentRes = await fetchSentMessages(accessToken, 100);
      sentMessages = sentRes.value || [];
      sentStats = await processMessages(sentMessages, connection.id, 'sent', 'outbound');
    } catch (sentErr) {
      console.error('Outlook sync sent folder error:', sentErr.message || sentErr);
      // Không fail cả sync; inbox vẫn thành công
    }

    await connection.update({ lastSyncAt: new Date() });

    console.log(`Outlook sync done: inbox=${inboxMessages.length} (${inboxStats.created} new, ${inboxStats.updated} updated), sent=${sentMessages.length} (${sentStats.created} new, ${sentStats.updated} updated)`);

    return res.status(200).json({
      success: true,
      data: {
        inbox: { created: inboxStats.created, updated: inboxStats.updated, total: inboxMessages.length },
        sent: { created: sentStats.created, updated: sentStats.updated, total: sentMessages.length },
        lastSyncAt: new Date()
      }
    });
  } catch (err) {
    console.error('Outlook sync error:', err);
    const msg = err.message || '';
    const isToken = /token|401|Unauthorized|ECONNREFUSED/i.test(msg);
    return res.status(500).json({
      success: false,
      message: isToken
        ? 'Token hoặc kết nối Microsoft lỗi. Vui lòng bấm "Kết nối lại" và thử đồng bộ lại.'
        : msg || 'Đồng bộ thất bại'
    });
  }
}

/**
 * GET /api/admin/outlook/emails - Danh sách email đã đồng bộ (phân trang)
 */
export async function listEmails(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const connection = await OutlookConnection.findOne({ where: { adminId } });
    if (!connection) {
      return res.status(200).json({ success: true, data: { emails: [], total: 0 } });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const folder = (req.query.folder || 'inbox').toLowerCase();
    const offset = (page - 1) * limit;

    const orderField = folder === 'sent' ? 'sentDateTime' : 'receivedDateTime';
    const { count, rows } = await SyncedEmail.findAndCountAll({
      where: {
        outlookConnectionId: connection.id,
        folder
      },
      order: [[orderField, 'DESC']],
      limit,
      offset,
      attributes: ['id', 'subject', 'bodyPreview', 'fromEmail', 'fromName', 'receivedDateTime', 'sentDateTime', 'isRead', 'hasAttachments']
    });

    return res.status(200).json({
      success: true,
      data: {
        emails: rows.map(r => r.get({ plain: true })),
        total: count,
        page,
        limit
      }
    });
  } catch (err) {
    console.error('listEmails error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * GET /api/admin/outlook/emails/:id - Chi tiết một email
 */
export async function getEmailById(req, res) {
  try {
    const adminId = req.admin?.id;
    const { id } = req.params;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const connection = await OutlookConnection.findOne({ where: { adminId } });
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Chưa kết nối Outlook' });
    }

    const email = await SyncedEmail.findOne({
      where: { id: parseInt(id, 10), outlookConnectionId: connection.id }
    });
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email không tồn tại' });
    }

    const plain = email.get({ plain: true });
    const toRecipients = plain.toRecipients ?? plain.to_recipients ?? [];
    const ccRecipients = plain.ccRecipients ?? plain.cc_recipients ?? [];
    return res.status(200).json({
      success: true,
      data: {
        email: {
          ...plain,
          toRecipients: Array.isArray(toRecipients) ? toRecipients : (typeof toRecipients === 'string' ? (() => { try { return JSON.parse(toRecipients); } catch { return []; } })() : []),
          ccRecipients: Array.isArray(ccRecipients) ? ccRecipients : (typeof ccRecipients === 'string' ? (() => { try { return JSON.parse(ccRecipients); } catch { return []; } })() : [])
        }
      }
    });
  } catch (err) {
    console.error('getEmailById error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
}

/**
 * POST /api/admin/outlook/send - Gửi email qua Outlook (Microsoft Graph sendMail)
 * Body: { to: string | string[] | {email,name}[], cc?: same, subject: string, body: string, bodyContentType?: 'Text'|'HTML' }
 */
export async function sendEmail(req, res) {
  try {
    const adminId = req.admin?.id;
    if (!adminId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const connection = await OutlookConnection.findOne({ where: { adminId } });
    if (!connection) {
      return res.status(400).json({ success: false, message: 'Chưa kết nối Outlook. Vui lòng kết nối trước.' });
    }

    let accessToken = connection.accessToken;
    const expiresAt = connection.expiresAt;
    if (connection.refreshToken && expiresAt && new Date(expiresAt) <= new Date(Date.now() + 5 * 60 * 1000)) {
      const refreshed = await refreshAccessToken(connection.refreshToken);
      accessToken = refreshed.access_token;
      const newExpires = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;
      await connection.update({
        accessToken,
        ...(refreshed.refresh_token && { refreshToken: refreshed.refresh_token }),
        ...(newExpires && { expiresAt: newExpires })
      });
    }

    const { to, cc, subject, body, bodyContentType, attachments } = req.body || {};
    await sendMail(accessToken, { to, cc, subject, body, bodyContentType, attachments });

    return res.status(200).json({ success: true, message: 'Đã gửi thư thành công.' });
  } catch (err) {
    console.error('sendEmail error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gửi thư thất bại.' });
  }
}
