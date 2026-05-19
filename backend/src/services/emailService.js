import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Service - Tích hợp với Outlook/Gmail
 * Sử dụng kietvu389@gmail.com làm email nguồn
 *
 * Thông báo nội bộ khi có đơn tiến cử mới (tiêu đề/nội dung): `nominationEmailService.sendNewNominationAdminNotification`
 * (gọi `sendEmail` với danh sách `config.nominationNewAdminEmails`).
 */
class EmailService {
  constructor() {
    // Cấu hình email nguồn
    this.fromEmail = config.email.from;
    this.fromName = config.email.fromName;
    this.mailer = (config.email.mailer || '').toLowerCase();

    // Chỉ khởi tạo SMTP transporter khi không dùng MS Graph
    this.transporter = this.mailer === 'msgraph'
      ? null
      : nodemailer.createTransport({
        ...(config.email.host
          ? {
            host: config.email.host,
            port: config.email.port,
            secure: Boolean(config.email.secure)
          }
          : {
            service: config.email.service // 'gmail' or 'outlook'
          }),
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      });
  }

  /**
   * Gửi email đơn giản
   * @param {Object} options - { to, subject, text, html, attachments }
   */
  async sendEmail(options) {
    try {
      if (this.mailer === 'msgraph') {
        const accessToken = await this.getMsGraphAccessToken();
        const fromAddress = config.email.microsoftMailFrom || this.fromEmail;
        const payload = {
          message: {
            subject: options.subject || '(No subject)',
            body: {
              contentType: options.html ? 'HTML' : 'Text',
              content: options.html || options.text || ''
            },
            toRecipients: this.normalizeRecipients(options.to).map((address) => ({ emailAddress: { address } })),
            ...(this.normalizeRecipients(options.cc).length > 0
              ? { ccRecipients: this.normalizeRecipients(options.cc).map((address) => ({ emailAddress: { address } })) }
              : {}),
            ...(this.normalizeRecipients(options.bcc).length > 0
              ? { bccRecipients: this.normalizeRecipients(options.bcc).map((address) => ({ emailAddress: { address } })) }
              : {}),
            ...(options.attachments?.length
              ? { attachments: await this.buildGraphAttachments(options.attachments) }
              : {})
          },
          saveToSentItems: true
        };

        const res = await fetch(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}/sendMail`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`MS Graph sendMail failed: ${res.status} ${errText}`);
        }

        return {
          success: true,
          messageId: null,
          response: 'sent_via_msgraph'
        };
      }

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html || options.text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        attachments: options.attachments || []
      };

      const info = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Gửi email với file đính kèm
   * @param {Object} options - { to, subject, text, html, filePath, fileName }
   */
  async sendEmailWithAttachment(options) {
    try {
      const attachments = [];
      
      if (options.filePath && fs.existsSync(options.filePath)) {
        attachments.push({
          filename: options.fileName || path.basename(options.filePath),
          path: options.filePath
        });
      }

      return await this.sendEmail({
        ...options,
        attachments
      });
    } catch (error) {
      console.error('Error sending email with attachment:', error);
      throw error;
    }
  }

  /**
   * Gửi email đến nhiều người nhận
   * @param {Object} options - { recipients (array), subject, text, html, attachments }
   */
  async sendBulkEmail(options) {
    try {
      const results = [];
      const recipients = Array.isArray(options.recipients) ? options.recipients : [options.recipients];
      
      for (const recipient of recipients) {
        try {
          const result = await this.sendEmail({
            to: recipient.email || recipient,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments
          });
          
          results.push({
            recipient,
            success: true,
            messageId: result.messageId
          });
        } catch (error) {
          results.push({
            recipient,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        total: recipients.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error sending bulk email:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra kết nối email
   */
  async verifyConnection() {
    try {
      if (this.mailer === 'msgraph') {
        const accessToken = await this.getMsGraphAccessToken();
        const fromAddress = config.email.microsoftMailFrom || this.fromEmail;
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(fromAddress)}?$select=id,mail,userPrincipalName`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        // Một số app chỉ được cấp Mail.Send (không có User.Read.All), lúc đó bỏ qua bước đọc user.
        if (!res.ok && res.status !== 403) {
          const errText = await res.text();
          throw new Error(`MS Graph verification failed: ${res.status} ${errText}`);
        }
        return { success: true, message: 'MS Graph email service is ready' };
      }

      await this.transporter.verify();
      return { success: true, message: 'SMTP email service is ready' };
    } catch (error) {
      console.error('Email service verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getMsGraphAccessToken() {
    const tenantId = config.email.microsoftTenantId;
    const clientId = config.email.microsoftClientId;
    const clientSecret = config.email.microsoftClientSecret;
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Missing Microsoft Graph credentials (MICROSOFT_TENANT_ID / MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET).');
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default'
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MS Graph token failed: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
  }

  normalizeRecipients(input) {
    if (!input) return [];
    const values = Array.isArray(input) ? input : [input];
    const out = [];
    for (const value of values) {
      const text = String(value || '').trim();
      if (!text) continue;
      const parts = text.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
      for (const part of parts) {
        const match = part.match(/<([^>]+)>$/);
        out.push((match ? match[1] : part).trim());
      }
    }
    return [...new Set(out)];
  }

  async buildGraphAttachments(attachments) {
    const out = [];
    for (const item of attachments) {
      if (!item) continue;
      // Hỗ trợ cả attachment dạng { path } và { content } như nodemailer
      if (item.path && fs.existsSync(item.path)) {
        const contentBytes = fs.readFileSync(item.path).toString('base64');
        out.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: item.filename || path.basename(item.path),
          contentType: item.contentType || 'application/octet-stream',
          contentBytes
        });
      } else if (item.content) {
        const contentBuffer = Buffer.isBuffer(item.content) ? item.content : Buffer.from(String(item.content));
        out.push({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: item.filename || 'attachment.txt',
          contentType: item.contentType || 'application/octet-stream',
          contentBytes: contentBuffer.toString('base64')
        });
      }
    }
    return out;
  }
}

export default new EmailService();

