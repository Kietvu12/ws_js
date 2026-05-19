import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, Inbox, Send, RefreshCw, PenLine, X, LogOut, Reply, Paperclip, Bold, Italic, Underline, Highlighter, Type, Trash2, Palette, Users, Building2, ChevronLeft, Star, Archive, Settings, Search, ChevronRight, MoreVertical, User } from 'lucide-react';
import apiService from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString();
};

const normalizeOutlookErrorMessage = (message, fallbackMessage) => {
  const raw = (message || '').toString();
  const lower = raw.toLowerCase();
  const isTenantAccountMismatch =
    lower.includes('selected user account does not exist in tenant') ||
    (lower.includes('cannot access the application') && lower.includes('external user'));

  if (isTenantAccountMismatch) {
    return 'Tài khoản Microsoft hiện tại không thuộc tenant VietArtistry. Vui lòng đăng nhập bằng tài khoản thuộc tenant này hoặc nhờ quản trị viên thêm tài khoản của bạn dưới dạng External User trước khi kết nối lại Outlook.';
  }

  return raw || fallbackMessage;
};

/** Loại bỏ src="cid:..." trong HTML email để tránh ERR_UNKNOWN_URL_SCHEME (ảnh nhúng trong thư không load được trên web) */
const sanitizeEmailBodyHtml = (html) => {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/\ssrc=["']cid:[^"']+["']/gi, ' src="#" data-cid-placeholder="1"');
};

/** Chuẩn hóa một recipient (hỗ trợ { email, name } hoặc { emailAddress: { address, name } }) */
const normalizeRecipient = (r) => {
  if (!r) return null;
  const email = r.email ?? r.emailAddress?.address ?? r.address ?? '';
  const name = r.name ?? r.emailAddress?.name ?? '';
  if (!email && !name) return null;
  return name ? `${name} <${email}>` : email;
};

/** Format mảng toRecipients/ccRecipients từ API thành chuỗi hiển thị */
const formatRecipients = (recipients) => {
  if (recipients == null) return '—';
  let list = recipients;
  if (typeof recipients === 'string') {
    try {
      list = JSON.parse(recipients);
    } catch {
      return recipients || '—';
    }
  }
  if (!Array.isArray(list) || list.length === 0) return '—';
  const parts = list.map(normalizeRecipient).filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
};

/** Lấy địa chỉ email từ một recipient (object hoặc chuỗi "Name <email>") */
const getEmailFromRecipient = (r) => {
  if (!r) return '';
  if (typeof r === 'string') {
    const m = r.match(/<([^>]+)>/);
    return m ? m[1].trim() : r.trim();
  }
  return r.email ?? r.emailAddress?.address ?? r.address ?? '';
};

/** Nhóm email theo thời gian: today, yesterday, thisWeek, lastWeek, older */
const groupEmailsByDate = (emailList) => {
  if (!Array.isArray(emailList) || emailList.length === 0) return { today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const lastWeekStart = new Date(todayStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  const groups = { today: [], yesterday: [], thisWeek: [], lastWeek: [], older: [] };
  emailList.forEach((email) => {
    const d = email.receivedDateTime ? new Date(email.receivedDateTime) : new Date(0);
    if (d >= todayStart) groups.today.push(email);
    else if (d >= yesterdayStart) groups.yesterday.push(email);
    else if (d >= weekStart) groups.thisWeek.push(email);
    else if (d >= lastWeekStart) groups.lastWeek.push(email);
    else groups.older.push(email);
  });
  return groups;
};

/** Trả về { prev, next } email trong mảng so với currentId */
const getPrevNextEmail = (emailList, currentId) => {
  if (!Array.isArray(emailList) || !currentId) return { prev: null, next: null };
  const idx = emailList.findIndex((e) => e.id === currentId);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? emailList[idx - 1] : null,
    next: idx < emailList.length - 1 ? emailList[idx + 1] : null
  };
};

/** Từ danh sách mail đã gửi, trích ra mảng địa chỉ email (unique) đã từng gửi đến */
const getUniqueSentAddresses = (sentEmails) => {
  const set = new Set();
  (sentEmails || []).forEach((mail) => {
    let list = mail.toRecipients ?? mail.to_recipients ?? [];
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch {
        return;
      }
    }
    if (!Array.isArray(list)) return;
    list.forEach((r) => {
      const addr = getEmailFromRecipient(r);
      if (addr) set.add(addr.toLowerCase());
    });
  });
  return Array.from(set).sort();
};

const EmailPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [outlookStatus, setOutlookStatus] = useState(null);
  const [cleared, setCleared] = useState(false);

  const [connection, setConnection] = useState(null);
  const [connected, setConnected] = useState(false);
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('inbox'); // 'inbox' | 'sent'
  const [searchQuery, setSearchQuery] = useState('');
  const headerSearch = searchParams.get('search') || '';
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);
  const settingsDropdownRef = useRef(null);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeStep, setComposeStep] = useState('cards'); // 'cards' | 'compose' — bước 1: chọn 3 note, bước 2: 2 cột (trái: mail đã gửi, phải: soạn/chọn)
  const [composeTab, setComposeTab] = useState('free'); // 'free' | 'ctv' | 'company'
  const [composeSentEmails, setComposeSentEmails] = useState([]);
  const [loadingComposeSent, setLoadingComposeSent] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState([]); // File[]
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState(null);
  const [composeNeedReconnect, setComposeNeedReconnect] = useState(false);
  const composeEditorRef = useRef(null);
  const composeFileInputRef = useRef(null);
  const initialSyncTriggeredRef = useRef(false);

  useEffect(() => {
    // Header search sync via query string `?search=...`
    setSearchQuery(headerSearch);
  }, [headerSearch]);

  /** Tab Cộng tác viên */
  const [collaboratorsList, setCollaboratorsList] = useState([]);
  const [loadingCollaborators, setLoadingCollaborators] = useState(false);
  const [selectedCtvIds, setSelectedCtvIds] = useState(new Set());
  /** Tab Doanh nghiệp */
  const [companiesList, setCompaniesList] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState(new Set());
  /** Trạng thái định dạng đang áp dụng tại vị trí con trỏ (để tô đậm nền nút trên toolbar) */
  const [composeToolbarActive, setComposeToolbarActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    highlight: false,
    fontSize: '',
    foreColor: null
  });

  /** Giới hạn đính kèm: 4MB/file, 15MB tổng (Graph ~4MB message) */
  const MAX_FILE_SIZE = 4 * 1024 * 1024;
  const MAX_TOTAL_ATTACHMENTS = 15 * 1024 * 1024;

  /** Màu chữ có thể chọn (hex) */
  const COMPOSE_COLORS = [
    { name: 'Đen', hex: '#000000' },
    { name: 'Đỏ', hex: '#dc2626' },
    { name: 'Xanh dương', hex: '#2563eb' },
    { name: 'Xanh lá', hex: '#16a34a' },
    { name: 'Cam', hex: '#ea580c' },
    { name: 'Tím', hex: '#7c3aed' },
    { name: 'Xám', hex: '#6b7280' }
  ];

  /** Cập nhật trạng thái toolbar theo selection trong editor */
  const updateComposeToolbarActive = useCallback(() => {
    const el = composeEditorRef.current;
    if (!el || !document.getSelection) return;
    const sel = document.getSelection();
    if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      setComposeToolbarActive((prev) => ({ ...prev, bold: false, italic: false, underline: false, highlight: false, fontSize: '', foreColor: null }));
      return;
    }
    const bold = document.queryCommandState('bold');
    const italic = document.queryCommandState('italic');
    const underline = document.queryCommandState('underline');
    const fontSize = document.queryCommandValue('fontSize') || '';
    let foreColor = document.queryCommandValue('foreColor') || null;
    if (foreColor && foreColor.indexOf('rgb') === 0) {
      const m = foreColor.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (m) {
        const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
        foreColor = `#${r}${g}${b}`.toLowerCase();
      }
    }
    if (foreColor && foreColor.indexOf('#') !== 0) foreColor = null;
    setComposeToolbarActive((prev) => ({
      ...prev,
      bold,
      italic,
      underline,
      highlight: false,
      fontSize,
      foreColor: foreColor || prev.foreColor
    }));
  }, []);

  const loadConnection = useCallback(async () => {
    try {
      setLoadingConnection(true);
      const data = await apiService.getOutlookConnection();
      setConnection(data.connection);
      setConnected(!!data.connected);
    } catch (e) {
      console.error(e);
      setConnected(false);
      setConnection(null);
    } finally {
      setLoadingConnection(false);
    }
  }, []);

  const loadEmails = useCallback(async (folderOverride) => {
    if (!connected) return;
    const folder = folderOverride ?? currentFolder;
    try {
      setLoadingEmails(true);
      const data = await apiService.getOutlookEmails({ folder, limit: 50 });
      const list = data.emails || [];
      const totalCount = data.total ?? list.length;
      setEmails(list);
      setTotal(totalCount);
      setSelectedEmail((prev) => {
        if (!prev) return null;
        const still = list.find((e) => e.id === prev.id);
        return still ? { ...still, body: prev.body } : null;
      });
      if (folderOverride != null) setCurrentFolder(folderOverride);
    } catch (e) {
      console.error(e);
      // Chỉ xóa danh sách khi lỗi 401/403 (chưa đăng nhập / hết quyền), còn lại giữ list cũ để tránh nháy "Đồng bộ ngay"
      const clearList = e.status === 401 || e.status === 403;
      if (clearList) {
        setEmails([]);
        setTotal(0);
      }
    } finally {
      setLoadingEmails(false);
    }
  }, [connected, currentFolder]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (connected) loadEmails();
  }, [connected, currentFolder, loadEmails]);

  // Tự động đồng bộ định kỳ để thư mới (gửi đến) hiển thị mà không cần bấm "Đồng bộ"
  const AUTO_SYNC_INTERVAL_MS = 90 * 1000; // 90 giây
  useEffect(() => {
    if (!connected) return;
    const runAutoSync = async () => {
      try {
        await apiService.syncOutlookEmails();
        await loadConnection();
        await loadEmails(currentFolder);
      } catch (e) {
        console.error('Auto sync:', e);
      }
    };
    const timer = setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [connected, currentFolder, loadEmails, loadConnection]);

  // Tự động đồng bộ lần đầu khi đã kết nối nhưng chưa từng đồng bộ (chưa có lastSyncAt)
  useEffect(() => {
    if (!connected || !connection || connection.lastSyncAt != null || initialSyncTriggeredRef.current) return;
    initialSyncTriggeredRef.current = true;
    (async () => {
      try {
        setSyncing(true);
        await apiService.syncOutlookEmails();
        await loadConnection();
        await loadEmails(currentFolder);
        setTimeout(() => loadEmails(currentFolder), 400);
      } catch (e) {
        console.error(e);
        initialSyncTriggeredRef.current = false;
      } finally {
        setSyncing(false);
      }
    })();
  }, [connected, connection, loadConnection, loadEmails, currentFolder]);

  useEffect(() => {
    const outlook = searchParams.get('outlook');
    const email = searchParams.get('email');
    const message = searchParams.get('message');
    if (outlook && !cleared) {
      if (outlook === 'connected') {
        setOutlookStatus({ type: 'connected', email: email ? decodeURIComponent(email) : '' });
        loadConnection();
      } else if (outlook === 'error') {
        const decodedMessage = message ? decodeURIComponent(message) : '';
        const normalizedMessage = normalizeOutlookErrorMessage(
          decodedMessage,
          t.outlookErrorDefault || 'Kết nối thất bại.'
        );
        setOutlookStatus({ type: 'error', message: normalizedMessage, needReconnect: true });
      }
      setSearchParams({}, { replace: true });
      setCleared(true);
    }
  }, [searchParams, setSearchParams, cleared, t.outlookErrorDefault, loadConnection]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inTrigger = settingsMenuRef.current?.contains(e.target);
      const inDropdown = settingsDropdownRef.current?.contains(e.target);
      if (!inTrigger && !inDropdown) setSettingsMenuOpen(false);
    };
    if (settingsMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsMenuOpen]);

  const handleConnectOutlook = () => {
    const url = apiService.getOutlookConnectUrl();
    if (!url) {
      setOutlookStatus({ type: 'error', message: t.outlookLoginRequired || 'Vui lòng đăng nhập lại.' });
      return;
    }
    window.location.href = url;
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setOutlookStatus(null);
      await apiService.syncOutlookEmails();
      await loadConnection();
      // Gọi loadEmails ngay, rồi gọi lại sau 400ms để tránh danh sách trống do GET chạy trước khi DB kịp commit
      await loadEmails(currentFolder);
      setTimeout(() => { loadEmails(currentFolder); }, 400);
    } catch (e) {
      console.error(e);
      const msg = e.message || 'Đồng bộ thất bại';
      const needReconnect = /token|401|403|Kết nối lại|quyền/i.test(msg);
      setOutlookStatus({ type: 'error', message: msg, needReconnect });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectOutlook = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất Outlook? Danh sách thư đã đồng bộ sẽ bị xóa.')) return;
    try {
      await apiService.disconnectOutlook();
      await loadConnection();
      setEmails([]);
      setTotal(0);
      setSelectedEmail(null);
      setConnected(false);
      setConnection(null);
      setOutlookStatus(null);
    } catch (e) {
      console.error(e);
      setOutlookStatus({ type: 'error', message: e.message || 'Đăng xuất thất bại' });
    }
  };

  const handleFolderChange = (folder) => {
    setCurrentFolder(folder);
    setSelectedEmail(null);
  };

  const handleSelectEmail = async (email) => {
    setSelectedEmail({ ...email, body: undefined });
    try {
      setLoadingDetail(true);
      const full = await apiService.getOutlookEmailById(email.id);
      setSelectedEmail(full || email);
    } catch (e) {
      console.error(e);
      setSelectedEmail(email);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openCompose = () => {
    setComposeStep('cards');
    setComposeTab('free');
    setComposeTo('');
    setComposeCc('');
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachments([]);
    setComposeError(null);
    setComposeNeedReconnect(false);
    setSelectedCtvIds(new Set());
    setSelectedCompanyIds(new Set());
    setComposeOpen(true);
  };

  const selectComposeType = (tab) => {
    setComposeTab(tab);
    setComposeStep('compose');
  };

  const loadComposeSentEmails = useCallback(async () => {
    try {
      setLoadingComposeSent(true);
      const data = await apiService.getOutlookEmails({ folder: 'sent', limit: 50 });
      setComposeSentEmails(data?.emails || []);
    } catch (e) {
      console.error(e);
      setComposeSentEmails([]);
    } finally {
      setLoadingComposeSent(false);
    }
  }, []);

  /** Thêm địa chỉ vào ô Đến (append, cách nhau dấu phẩy) */
  const addEmailToComposeTo = useCallback((addressOrLabel) => {
    const addr = typeof addressOrLabel === 'string' ? addressOrLabel : (addressOrLabel?.email ?? addressOrLabel?.address ?? '');
    if (!addr) return;
    setComposeTo((prev) => (prev ? `${prev}, ${addr}` : addr));
  }, []);

  const loadCollaboratorsForCompose = useCallback(async () => {
    try {
      setLoadingCollaborators(true);
      const res = await apiService.getCollaborators({ limit: 500, status: 1 });
      if (res?.success && res?.data?.collaborators) {
        setCollaboratorsList(res.data.collaborators.filter((c) => c.email));
      } else {
        setCollaboratorsList([]);
      }
    } catch (e) {
      console.error(e);
      setCollaboratorsList([]);
    } finally {
      setLoadingCollaborators(false);
    }
  }, []);

  const loadCompaniesForCompose = useCallback(async () => {
    try {
      setLoadingCompanies(true);
      // Lấy email doanh nghiệp từ bảng company_email_addresses (include: 'emailAddresses')
      const res = await apiService.getCompanies({ limit: 500, include: 'emailAddresses' });
      if (res?.success && res?.data?.companies) {
        const flatCompanies = [];
        res.data.companies.forEach((company) => {
          const emails = company.emailAddresses || [];
          emails.forEach((emailRow) => {
            if (emailRow?.email) {
              flatCompanies.push({
                id: emailRow.id, // dùng id của dòng email để chọn
                companyId: company.id,
                name: company.name,
                email: emailRow.email
              });
            }
          });
        });
        setCompaniesList(flatCompanies);
      } else {
        setCompaniesList([]);
      }
    } catch (e) {
      console.error(e);
      setCompaniesList([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  /** Load dữ liệu cột trái theo tab: tự do = địa chỉ đã gửi, CTV = danh sách CTV, DN = danh sách DN */
  useEffect(() => {
    if (!composeOpen || composeStep !== 'compose') return;
    if (composeTab === 'free') loadComposeSentEmails();
    else if (composeTab === 'ctv') loadCollaboratorsForCompose();
    else if (composeTab === 'company') loadCompaniesForCompose();
  }, [composeOpen, composeStep, composeTab, loadComposeSentEmails, loadCollaboratorsForCompose, loadCompaniesForCompose]);

  const toggleCtvSelection = (id) => {
    setSelectedCtvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCompanySelection = (id) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllCtv = () => {
    if (selectedCtvIds.size === collaboratorsList.length) {
      setSelectedCtvIds(new Set());
    } else {
      setSelectedCtvIds(new Set(collaboratorsList.map((c) => c.id)));
    }
  };

  const selectAllCompanies = () => {
    if (selectedCompanyIds.size === companiesList.length) {
      setSelectedCompanyIds(new Set());
    } else {
      setSelectedCompanyIds(new Set(companiesList.map((c) => c.id)));
    }
  };

  /** Chuyển danh sách đã chọn (CTV) sang tab Gửi tự do và điền Đến */
  const applyCtvRecipientsAndCompose = () => {
    const selected = collaboratorsList.filter((c) => selectedCtvIds.has(c.id));
    const toStr = selected.map((c) => (c.name ? `${c.name} <${c.email}>` : c.email)).join(', ');
    setComposeTo(toStr);
    setComposeTab('free');
  };

  /** Chuyển danh sách đã chọn (doanh nghiệp) sang tab Gửi tự do và điền Đến */
  const applyCompanyRecipientsAndCompose = () => {
    const selected = companiesList.filter((c) => selectedCompanyIds.has(c.id));
    const toStr = selected.map((c) => (c.name ? `${c.name} <${c.email}>` : c.email)).join(', ');
    setComposeTo(toStr);
    setComposeTab('free');
  };

  /** Tạo block trích dẫn thư gốc (dùng cho Reply và Forward) */
  const buildQuotedBody = (email) => {
    if (!email) return '';
    const dateStr = formatDate(email.receivedDateTime);
    const quotedFrom = email.fromName || email.fromEmail || '—';
    const rawBody = email.body || email.bodyPreview || '';
    const safeQuoted = typeof rawBody === 'string' ? sanitizeEmailBodyHtml(rawBody) : '';
    return `<br><br><div style="border-left:3px solid #ccc;padding-left:12px;margin-top:12px;color:#666;font-size:14px;"><p>Vào ${dateStr}, ${quotedFrom} đã viết:</p><div>${safeQuoted || ''}</div></div>`;
  };

  /** Mở soạn thư trả lời — mặc định gửi cho người gửi thư, mở thẳng form soạn (không qua bước chọn đối tượng) */
  const openReply = () => {
    if (!selectedEmail) return;
    const fromAddr = selectedEmail.fromEmail || (selectedEmail.from && (selectedEmail.from.emailAddress?.address || selectedEmail.from.address)) || '';
    const fromName = selectedEmail.fromName || (selectedEmail.from && selectedEmail.from.emailAddress?.name) || '';
    const toStr = fromName ? `${fromName} <${fromAddr}>` : fromAddr;
    const subj = selectedEmail.subject || '';
    const reSubject = subj.toLowerCase().startsWith('re:') ? subj : `Re: ${subj}`;
    setComposeTo(toStr);
    setComposeCc('');
    setComposeSubject(reSubject);
    setComposeBody(buildQuotedBody(selectedEmail));
    setComposeAttachments([]);
    setComposeError(null);
    setComposeNeedReconnect(false);
    setComposeStep('compose');
    setComposeTab('free');
    setComposeOpen(true);
  };

  /** Mở soạn thư chuyển tiếp — subject Fwd: ..., nội dung trích dẫn, người nhận để trống (trong ô nội dung thư) */
  const openForward = () => {
    if (!selectedEmail) return;
    const subj = selectedEmail.subject || '';
    const fwdSubject = subj.toLowerCase().startsWith('fwd:') ? subj : `Fwd: ${subj}`;
    setComposeTo('');
    setComposeCc('');
    setComposeSubject(fwdSubject);
    setComposeBody(buildQuotedBody(selectedEmail));
    setComposeAttachments([]);
    setComposeError(null);
    setComposeNeedReconnect(false);
    setComposeStep('compose');
    setComposeTab('free');
    setComposeOpen(true);
  };

  const closeCompose = () => {
    if (!sending) {
      setComposeOpen(false);
      setComposeAttachments([]);
    }
  };

  /** Đồng bộ nội dung từ contenteditable ra state (gọi khi mở modal và khi user gõ) */
  const syncComposeBodyFromEditor = useCallback(() => {
    if (composeEditorRef.current) setComposeBody(composeEditorRef.current.innerHTML || '');
  }, []);

  /** Gắn nội dung state vào editor khi mở modal (chạy sau khi DOM đã mount) */
  useEffect(() => {
    if (!composeOpen) {
      setComposeToolbarActive({ bold: false, italic: false, underline: false, highlight: false, fontSize: '', foreColor: null });
      return;
    }
    const timer = setTimeout(() => {
      if (composeEditorRef.current) {
        composeEditorRef.current.innerHTML = composeBody || '';
        composeEditorRef.current.focus?.();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [composeOpen]);

  const handleComposeAttachmentChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    let total = composeAttachments.reduce((acc, f) => acc + f.size, 0);
    const added = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setComposeError(`File "${file.name}" vượt quá ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
        continue;
      }
      if (total + file.size > MAX_TOTAL_ATTACHMENTS) {
        setComposeError('Tổng dung lượng đính kèm vượt quá 15MB.');
        break;
      }
      added.push(file);
      total += file.size;
    }
    if (added.length) {
      setComposeError(null);
      setComposeAttachments((prev) => [...prev, ...added]);
    }
    e.target.value = '';
  };

  const removeComposeAttachment = (index) => {
    setComposeAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const parseRecipientsInput = (str) => {
    if (!str || typeof str !== 'string') return [];
    return str
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  /** Đọc file thành base64 */
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSendEmail = async () => {
    const toList = parseRecipientsInput(composeTo);
    if (toList.length === 0) {
      setComposeError('Vui lòng nhập ít nhất một địa chỉ người nhận (Đến).');
      return;
    }
    setComposeError(null);
    setSending(true);
    try {
      const bodyHtml = composeEditorRef.current ? composeEditorRef.current.innerHTML : composeBody;
      const attachmentsPayload = [];
      for (const file of composeAttachments) {
        const contentBytes = await fileToBase64(file);
        attachmentsPayload.push({
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          contentBytes
        });
      }
      await apiService.sendOutlookEmail({
        to: toList,
        cc: parseRecipientsInput(composeCc).length > 0 ? parseRecipientsInput(composeCc) : undefined,
        subject: composeSubject.trim() || '(Không tiêu đề)',
        body: bodyHtml || '',
        bodyContentType: 'HTML',
        ...(attachmentsPayload.length > 0 && { attachments: attachmentsPayload })
      });
      setComposeOpen(false);
      setOutlookStatus({ type: 'connected', email: connection?.email });
      // Đồng bộ lại từ Outlook để thư vừa gửi có trong DB, rồi chuyển sang "Đã gửi" và tải danh sách
      setSyncing(true);
      try {
        await apiService.syncOutlookEmails();
        await loadConnection();
        await loadEmails('sent');
      } catch (syncErr) {
        console.error(syncErr);
        await loadEmails();
      } finally {
        setSyncing(false);
      }
    } catch (e) {
      console.error(e);
      const msg = e.message || '';
      const isAccessDenied = /403|Access is denied|ErrorAccessDenied/i.test(msg);
      setComposeNeedReconnect(!!isAccessDenied);
      setComposeError(
        isAccessDenied
          ? 'Tài khoản chưa có quyền gửi thư. Vui lòng bấm "Kết nối lại Outlook" bên dưới để đăng nhập lại Microsoft và cấp quyền gửi thư.'
          : msg || 'Gửi thư thất bại.'
      );
    } finally {
      setSending(false);
    }
  };

  if (loadingConnection) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Đang tải...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t.adminSystemEmail || 'Email hệ thống'}
          </h1>
          <p className="mt-1.5 text-gray-600">
            {t.outlookEmailDescription || 'Kết nối tài khoản Outlook (Microsoft) để đồng bộ và gửi email.'}
          </p>
        </div>

        {outlookStatus && (
          <div
            className={`rounded-xl p-4 flex items-start gap-3 mb-6 ${
              outlookStatus.type === 'connected'
                ? 'bg-emerald-50 border border-emerald-200/80'
                : 'bg-red-50 border border-red-200/80'
            }`}
          >
            {outlookStatus.type === 'connected' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              {outlookStatus.type === 'connected' ? (
                <p className="text-emerald-800 text-sm">
                  {t.outlookConnectedSuccess || 'Đã kết nối Outlook thành công.'}
                  {outlookStatus.email && (
                    <span className="block mt-1.5 font-medium text-emerald-900 truncate">{outlookStatus.email}</span>
                  )}
                </p>
              ) : (
                <p className="text-red-800 text-sm">{outlookStatus.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Connect card */}
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {t.outlookConnectTitle || 'Đồng bộ Outlook'}
              </h2>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">
                {t.outlookConnectDescription || 'Kết nối tài khoản Microsoft/Outlook của bạn để đồng bộ email.'}
              </p>
              <button
                type="button"
                onClick={handleConnectOutlook}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t.outlookConnectButton || 'Kết nối Outlook'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredEmails = searchQuery.trim()
    ? emails.filter((e) => {
        const q = searchQuery.toLowerCase();
        const subj = (e.subject || '').toLowerCase();
        const from = (e.fromName || e.fromEmail || '').toLowerCase();
        const preview = (e.bodyPreview || '').toLowerCase();
        return subj.includes(q) || from.includes(q) || preview.includes(q);
      })
    : emails;
  const grouped = groupEmailsByDate(filteredEmails);
  const unreadCount = currentFolder === 'inbox' ? emails.filter((e) => !e.isRead).length : 0;
  const prevNext = getPrevNextEmail(filteredEmails, selectedEmail?.id);

  const formatListTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDetailTime = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return `Hôm nay, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString() + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitial = (nameOrEmail) => {
    if (!nameOrEmail) return '?';
    const n = String(nameOrEmail).trim();
    if (n.includes('@')) return n[0].toUpperCase();
    return n[0].toUpperCase();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] xl:h-[calc(100vh-4rem)] min-h-[380px] md:min-h-[440px] xl:min-h-[520px] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
      <div className="flex-1 flex min-h-0 bg-white">
        {/* Sidebar trái: COMPOSE + mailbox + labels + user */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col py-4">
          <div className="px-3">
            <button
              type="button"
              onClick={openCompose}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#dc2626' }}
            >
              <Mail className="w-4 h-4" />
              Soạn thư
            </button>
          </div>
          <nav className="flex flex-col gap-0.5 px-2 mt-4">
            <button
              type="button"
              onClick={() => handleFolderChange('inbox')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                currentFolder === 'inbox' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Inbox className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">Hộp thư đến</span>
              {unreadCount > 0 && (
                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleFolderChange('sent')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors ${
                currentFolder === 'sent' ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">Đã gửi</span>
            </button>
          </nav>
          <div className="mt-4 px-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Labels</p>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Family
              </span>
              <span className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Friends
              </span>
              <span className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-600">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> Agencies
              </span>
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-200 px-3 relative" ref={settingsMenuRef}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm text-gray-700 truncate flex-1 min-w-0" title={connection?.email}>
                {connection?.email ? connection.email.split('@')[0] : 'Outlook'}
              </span>
              <button
                type="button"
                onClick={() => setSettingsMenuOpen((v) => !v)}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-500"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            {settingsMenuOpen && (() => {
              const el = settingsMenuRef.current;
              const rect = el?.getBoundingClientRect?.();
              if (!rect) return null;
              const bottom = typeof window !== 'undefined' ? window.innerHeight - rect.top + 8 : 80;
              const left = rect.left;
              const width = Math.max(180, rect.width);
              return createPortal(
              <div
                ref={settingsDropdownRef}
                className="py-2 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col min-w-[180px]"
                style={{
                  position: 'fixed',
                  zIndex: 9999,
                  bottom,
                  left,
                  width,
                }}
              >
                {connection?.lastSyncAt && (
                  <p className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
                    Lần cuối: {formatDate(connection.lastSyncAt)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); const u = apiService.getOutlookConnectUrl(); if (u) window.location.href = u; }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" /> Kết nối lại
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); handleDisconnectOutlook(); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất
                </button>
              </div>,
              document.body
            );
            })()}
          </div>
        </aside>

        {/* Panel giữa: danh sách thư */}
        <div className="w-[360px] flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              {currentFolder === 'inbox' ? 'Hộp thư đến' : 'Đã gửi'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" className="rounded border-gray-300" aria-label="Chọn tất cả" />
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                title="Đồng bộ"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex-1 flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingEmails ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Đang tải...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center px-6 py-12 gap-4 min-h-[200px]">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-gray-700 text-sm font-medium">
                  {currentFolder === 'inbox' ? 'Hộp thư đến chưa được đồng bộ' : 'Chưa có thư đã gửi'}
                </p>
                <p className="text-gray-500 text-xs mt-1">Bấm nút đồng bộ để tải thư từ Outlook.</p>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {[
                  { key: 'today', label: 'Hôm nay', list: grouped.today },
                  { key: 'yesterday', label: 'Hôm qua', list: grouped.yesterday },
                  { key: 'thisWeek', label: 'Tuần này', list: grouped.thisWeek },
                  { key: 'lastWeek', label: 'Tuần trước', list: grouped.lastWeek },
                  { key: 'older', label: 'Cũ hơn', list: grouped.older }
                ].map(
                  (section) =>
                    section.list.length > 0 && (
                      <div key={section.key}>
                        <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                          {section.label}
                        </p>
                        {section.list.map((email) => (
                          <button
                            key={email.id}
                            type="button"
                            onClick={() => handleSelectEmail(email)}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-2 ${
                              selectedEmail?.id === email.id ? 'bg-blue-50/80 border-l-2 border-l-red-500' : ''
                            }`}
                          >
                            <input type="checkbox" className="mt-1 rounded border-gray-300" onClick={(e) => e.stopPropagation()} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-sm truncate flex-1 ${email.isRead ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold'}`}>
                                  {email.fromName || email.fromEmail || '—'}
                                </span>
                                <span className="text-xs text-gray-400 flex-shrink-0">{formatListTime(email.receivedDateTime)}</span>
                              </div>
                              <p className={`text-sm truncate mt-0.5 ${email.isRead ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>
                                {email.subject || '(Không tiêu đề)'}
                              </p>
                            </div>
                            {email.hasAttachments && <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-1" />}
                          </button>
                        ))}
                      </div>
                    )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Panel phải: nội dung thư */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 py-16">
              <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center">
                <Mail className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm">Chọn một thư để xem</p>
            </div>
          ) : (
            <>
              <header className="flex-shrink-0 border-b border-gray-200 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900 flex-1 min-w-0 truncate">
                    {selectedEmail.subject || '(Không tiêu đề)'}
                  </h2>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => prevNext.prev && handleSelectEmail(prevNext.prev)}
                      disabled={!prevNext.prev}
                      className="p-2 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30"
                      aria-label="Thư trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => prevNext.next && handleSelectEmail(prevNext.next)}
                      disabled={!prevNext.next}
                      className="p-2 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30"
                      aria-label="Thư sau"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" aria-label="Star"><Star className="w-4 h-4" /></button>
                    <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" aria-label="Archive"><Archive className="w-4 h-4" /></button>
                    <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" aria-label="Trash"><Trash2 className="w-4 h-4" /></button>
                    <button type="button" className="p-2 rounded hover:bg-gray-100 text-gray-500" aria-label="More"><MoreVertical className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {getInitial(selectedEmail.fromName || selectedEmail.fromEmail)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-900 block truncate">
                      {selectedEmail.fromName || selectedEmail.fromEmail || '—'}
                    </span>
                    <span className="text-xs text-gray-500">{formatDetailTime(selectedEmail.receivedDateTime)}</span>
                  </div>
                </div>
              </header>
              <div className="flex-1 overflow-y-auto p-5">
                {loadingDetail ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Đang tải nội dung...
                  </div>
                ) : selectedEmail.body ? (
                  <div
                    className="prose prose-sm max-w-none text-gray-800 bg-white rounded-lg border border-gray-200 p-5 shadow-sm prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600"
                    dangerouslySetInnerHTML={{ __html: sanitizeEmailBodyHtml(selectedEmail.body) }}
                  />
                ) : (
                  <p className="text-gray-500 text-sm bg-white rounded-lg border border-gray-200 p-5">
                    {selectedEmail.bodyPreview || 'Không có nội dung.'}
                  </p>
                )}
                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedEmail.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700"
                      >
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className="truncate max-w-[180px]">{att.name || 'File'}</span>
                        {att.size != null && <span className="text-xs text-gray-500">{(att.size / 1024).toFixed(0)} kb</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={openReply}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Trả lời
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={openForward}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Chuyển tiếp
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {outlookStatus?.type === 'error' && (
        <div className="flex-shrink-0 px-5 py-3 bg-red-50 border-t border-red-200 flex items-center gap-3 text-red-800 text-sm flex-wrap">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span className="flex-1 min-w-0">{outlookStatus.message}</span>
          {(outlookStatus.needReconnect || /Kết nối lại|token|401|403|quyền/i.test(outlookStatus.message || '')) && (
            <button
              type="button"
              onClick={() => { const u = apiService.getOutlookConnectUrl(); if (u) window.location.href = u; }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 hover:bg-red-200 text-red-800 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Kết nối lại
            </button>
          )}
        </div>
      )}

      {/* Modal soạn thư: bước 1 = 3 note nhỏ, bước 2 = 2 cột (trái: mail đã gửi, phải: soạn/chọn) */}
      {composeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={closeCompose}
        >
          <div
            className={`bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 ${composeStep === 'cards' ? 'max-w-lg w-full' : 'max-w-5xl w-full max-h-[90vh]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50/80 flex-shrink-0">
              {composeStep === 'compose' ? (
                <button
                  type="button"
                  onClick={() => setComposeStep('cards')}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Đổi loại
                </button>
              ) : (
                <span />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {composeStep === 'cards' ? 'Soạn thư' : composeTab === 'free' ? 'Gửi tự do' : composeTab === 'ctv' ? 'Cộng tác viên' : 'Doanh nghiệp'}
              </h3>
              <button
                type="button"
                onClick={closeCompose}
                disabled={sending}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {composeStep === 'cards' ? (
              /* Bước 1: 3 note nhỏ xinh để chọn loại */
              <div className="p-6">
                <p className="text-sm text-gray-500 text-center mb-6">Chọn loại thư bạn muốn gửi</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => selectComposeType('free')}
                    className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-300 hover:shadow-md transition-all text-left"
                  >
                    <span className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                      <PenLine className="w-6 h-6 text-amber-700" />
                    </span>
                    <span className="font-semibold text-gray-900">Gửi tự do</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Nhập địa chỉ tùy ý, soạn và gửi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectComposeType('ctv')}
                    className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300 hover:shadow-md transition-all text-left"
                  >
                    <span className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                      <Users className="w-6 h-6 text-blue-700" />
                    </span>
                    <span className="font-semibold text-gray-900">Cộng tác viên</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Chọn CTV, gửi mail hàng loạt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectComposeType('company')}
                    className="group flex flex-col items-center p-5 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-300 hover:shadow-md transition-all text-left"
                  >
                    <span className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                      <Building2 className="w-6 h-6 text-emerald-700" />
                    </span>
                    <span className="font-semibold text-gray-900">Doanh nghiệp</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">Chọn doanh nghiệp, gửi mail</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Bước 2: 2 cột — trái: địa chỉ đã gửi (chỉ tab tự do) / danh sách email CTV / DN; phải: form soạn và gửi */
              <div className="flex-1 flex min-h-0">
                {/* Cột trái: Tab tự do = các địa chỉ đã gửi; Tab CTV = danh sách email CTV; Tab DN = danh sách email DN */}
                <aside className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
                  <div className="px-3 py-2.5 border-b border-gray-200 bg-white">
                    <h4 className="text-sm font-semibold text-gray-800">
                      {composeTab === 'free' ? 'Các địa chỉ đã gửi' : composeTab === 'ctv' ? 'Danh sách email CTV' : 'Danh sách email doanh nghiệp'}
                    </h4>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {composeTab === 'free' && (
                      <>
                        {loadingComposeSent ? (
                          <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>
                        ) : getUniqueSentAddresses(composeSentEmails).length === 0 ? (
                          <div className="py-6 text-center text-gray-500 text-xs">Chưa có địa chỉ nào đã gửi</div>
                        ) : (
                          <ul className="space-y-1">
                            {getUniqueSentAddresses(composeSentEmails).map((addr) => (
                              <li
                                key={addr}
                                role="button"
                                tabIndex={0}
                                onClick={() => addEmailToComposeTo(addr)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addEmailToComposeTo(addr); } }}
                                className="text-left p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors cursor-pointer text-sm text-gray-700 truncate"
                                title="Bấm để thêm vào Đến"
                              >
                                {addr}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                    {composeTab === 'ctv' && (
                      <>
                        {loadingCollaborators ? (
                          <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>
                        ) : collaboratorsList.length === 0 ? (
                          <div className="py-6 text-center text-gray-500 text-xs">Không có CTV nào có email</div>
                        ) : (
                          <ul className="space-y-1">
                            {collaboratorsList.map((c) => (
                              <li
                                key={c.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => addEmailToComposeTo(c.name ? `${c.name} <${c.email}>` : c.email)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addEmailToComposeTo(c.name ? `${c.name} <${c.email}>` : c.email); } }}
                                className="text-left p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors cursor-pointer"
                                title="Bấm để thêm vào Đến"
                              >
                                <p className="text-sm font-medium text-gray-900 truncate">{c.name || '—'}</p>
                                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                    {composeTab === 'company' && (
                      <>
                        {loadingCompanies ? (
                          <div className="py-6 text-center text-gray-500 text-sm">Đang tải...</div>
                        ) : companiesList.length === 0 ? (
                          <div className="py-6 text-center text-gray-500 text-xs">Không có doanh nghiệp nào có email</div>
                        ) : (
                          <ul className="space-y-1">
                            {companiesList.map((c) => (
                              <li
                                key={c.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => addEmailToComposeTo(c.name ? `${c.name} <${c.email}>` : c.email)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addEmailToComposeTo(c.name ? `${c.name} <${c.email}>` : c.email); } }}
                                className="text-left p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-colors cursor-pointer"
                                title="Bấm để thêm vào Đến"
                              >
                                <p className="text-sm font-medium text-gray-900 truncate">{c.name || '—'}</p>
                                <p className="text-xs text-gray-500 truncate">{c.email || '—'}</p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </aside>
                {/* Cột phải: Form soạn và gửi mail (chung cho cả 3 tab) */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                <div className="space-y-4">
              {composeError && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p>{composeError}</p>
                    {composeNeedReconnect && (
                      <button
                        type="button"
                        onClick={() => {
                          const url = apiService.getOutlookConnectUrl();
                          if (url) window.location.href = url;
                        }}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        Kết nối lại Outlook
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Đến <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="email@example.com hoặc nhiều địa chỉ cách nhau bởi dấu phẩy"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CC</label>
                <input
                  type="text"
                  value={composeCc}
                  onChange={(e) => setComposeCc(e.target.value)}
                  placeholder="email@example.com (tùy chọn, cách nhau bởi dấu phẩy)"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Tiêu đề thư"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung</label>
                {/* Toolbar định dạng: option đang áp dụng tại con trỏ sẽ có nền đậm */}
                <div className="flex flex-wrap items-center gap-1 p-1.5 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50">
                  <button
                    type="button"
                    title="In đậm"
                    onMouseDown={(e) => { e.preventDefault(); composeEditorRef.current?.focus(); document.execCommand('bold'); setTimeout(updateComposeToolbarActive, 0); }}
                    className={`p-2 rounded hover:bg-gray-200 text-gray-700 ${composeToolbarActive.bold ? 'bg-blue-200 text-blue-800 font-semibold' : ''}`}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="In nghiêng"
                    onMouseDown={(e) => { e.preventDefault(); composeEditorRef.current?.focus(); document.execCommand('italic'); setTimeout(updateComposeToolbarActive, 0); }}
                    className={`p-2 rounded hover:bg-gray-200 text-gray-700 ${composeToolbarActive.italic ? 'bg-blue-200 text-blue-800 font-semibold' : ''}`}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Gạch chân"
                    onMouseDown={(e) => { e.preventDefault(); composeEditorRef.current?.focus(); document.execCommand('underline'); setTimeout(updateComposeToolbarActive, 0); }}
                    className={`p-2 rounded hover:bg-gray-200 text-gray-700 ${composeToolbarActive.underline ? 'bg-blue-200 text-blue-800 font-semibold' : ''}`}
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <span className="w-px h-5 bg-gray-300 mx-0.5" />
                  <button
                    type="button"
                    title="Bôi vàng"
                    onMouseDown={(e) => { e.preventDefault(); composeEditorRef.current?.focus(); document.execCommand('backColor', false, '#fef08a'); setTimeout(updateComposeToolbarActive, 0); }}
                    className="p-2 rounded hover:bg-gray-200 text-gray-700"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <span className="w-px h-5 bg-gray-300 mx-0.5" />
                  <span className="text-xs text-gray-500 mr-0.5 flex items-center gap-0.5">
                    <Palette className="w-3.5 h-3.5" /> Màu:
                  </span>
                  {COMPOSE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      onMouseDown={(e) => { e.preventDefault(); composeEditorRef.current?.focus(); document.execCommand('foreColor', false, c.hex); setTimeout(updateComposeToolbarActive, 0); }}
                      className={`w-7 h-7 rounded border-2 shrink-0 ${composeToolbarActive.foreColor?.toLowerCase() === c.hex.toLowerCase() ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  <label className="relative w-7 h-7 rounded border-2 border-gray-300 overflow-hidden cursor-pointer hover:border-gray-400 shrink-0 flex items-center justify-center bg-white" title="Màu khác">
                    <input
                      type="color"
                      className="w-full h-full opacity-0 cursor-pointer min-w-[28px] min-h-[28px]"
                      onChange={(e) => { composeEditorRef.current?.focus(); document.execCommand('foreColor', false, e.target.value); setTimeout(updateComposeToolbarActive, 0); }}
                    />
                  </label>
                  <span className="w-px h-5 bg-gray-300 mx-0.5" />
                  <select
                    title="Cỡ chữ"
                    className={`text-sm border rounded px-2 py-1.5 ${composeToolbarActive.fontSize ? 'bg-blue-100 border-blue-300 text-blue-800 font-medium' : 'border-gray-300 bg-white text-gray-700'}`}
                    value={composeToolbarActive.fontSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) { composeEditorRef.current?.focus(); document.execCommand('fontSize', false, v); setTimeout(updateComposeToolbarActive, 0); }
                    }}
                  >
                    <option value="">Cỡ chữ</option>
                    <option value="1">Nhỏ</option>
                    <option value="2">Vừa</option>
                    <option value="3">Bình thường</option>
                    <option value="4">Lớn</option>
                    <option value="5">Rất lớn</option>
                  </select>
                </div>
                <div
                  ref={composeEditorRef}
                  contentEditable
                  className="min-h-[200px] px-3.5 py-2.5 border border-gray-300 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 prose prose-sm max-w-none"
                  data-placeholder="Nội dung thư..."
                  onInput={syncComposeBodyFromEditor}
                  onBlur={syncComposeBodyFromEditor}
                  onKeyUp={updateComposeToolbarActive}
                  onMouseUp={updateComposeToolbarActive}
                  suppressContentEditableWarning
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Đính kèm</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={composeFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleComposeAttachmentChange}
                  />
                  <button
                    type="button"
                    onClick={() => composeFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    Chọn file
                  </button>
                  <span className="text-xs text-gray-500">Tối đa 4MB/file, 15MB tổng</span>
                </div>
                {composeAttachments.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {composeAttachments.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                      >
                        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate flex-1 min-w-0">{file.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeComposeAttachment(index)}
                          className="p-1 rounded hover:bg-red-100 text-red-600 flex-shrink-0"
                          title="Xóa đính kèm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
                </div>
            </div>
            <div className="flex-shrink-0 flex justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50/80">
              <button
                type="button"
                onClick={closeCompose}
                disabled={sending}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={sending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Gửi
                  </>
                )}
              </button>
            </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailPage;
