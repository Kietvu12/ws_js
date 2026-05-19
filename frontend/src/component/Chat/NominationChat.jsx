import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Send, Calendar, Clock, MessageCircle, Plus, Camera, X, DollarSign, CheckCircle, XCircle, ChevronDown, ChevronUp, RefreshCw, Paperclip, FileText, Archive, PanelRight } from 'lucide-react';
import apiService from '../../services/api';
import { getJobApplicationStatus, getJobApplicationStatusOptionsByLanguage, getJobApplicationStatusLabelByLanguage } from '../../utils/jobApplicationStatus';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';
import StatusChangeMessageCard from './StatusChangeMessageCard';

/**
 * Parse nội dung tin nhắn trạng thái (tạo bởi admin khi đổi trạng thái).
 * Trả về { isStatusChange, statusName, reason, paymentAmount } hoặc { isStatusChange: false }.
 */
function parseStatusMessageContent(content) {
  if (!content || typeof content !== 'string') return { isStatusChange: false };
  const hasStatusUpdate = content.includes('Cập nhật trạng thái') && content.includes('Trạng thái mới:');
  if (!hasStatusUpdate) return { isStatusChange: false };

  let statusName = '';
  const newStatusMatch = content.match(/\*\*Trạng thái mới:\*\*\s*([^\n*]+)/);
  if (newStatusMatch) statusName = newStatusMatch[1].trim();

  let reason = '';
  const reasonBlock = content.match(/\*\*Lý do:\*\*\s*([\s\S]*?)(?=\n\*\*|\n\*Tin nhắn|$)/);
  const noteBlock = content.match(/\*\*Ghi chú:\*\*\s*([\s\S]*?)(?=\n\*\*|\n\*Tin nhắn|$)/);
  if (reasonBlock) reason = reasonBlock[1].trim();
  else if (noteBlock) reason = noteBlock[1].trim();

  let paymentAmount = '';
  const paymentMatch = content.match(/\*\*Số tiền thanh toán:\*\*\s*([^\n]+)/);
  if (paymentMatch) paymentAmount = paymentMatch[1].trim();

  return { isStatusChange: true, statusName, reason, paymentAmount };
}

/** Đồng bộ logic folder với NominationDetailContent (cvPath → snapshot gốc / template) */
function parseNominationCvPath(cvPath) {
  let usedCvKind = null;
  let usedTemplateName = null;
  if (cvPath) {
    const lower = String(cvPath).toLowerCase();
    if (lower.includes('cv_original') || lower.includes('original')) {
      usedCvKind = 'original';
    } else if (lower.includes('cv_template') || lower.includes('template')) {
      usedCvKind = 'template';
      if (lower.includes('common')) usedTemplateName = 'Common';
      else if (lower.includes('/it') || lower.includes('\\it') || /it$/i.test(lower)) usedTemplateName = 'IT';
      else if (lower.includes('technical')) usedTemplateName = 'Technical';
    }
  }
  return { usedCvKind, usedTemplateName };
}

function buildUsedCvFilesFromList(cvFileList, usedCvKind, usedTemplateName) {
  const originalsForUsedCv = cvFileList?.originals || [];
  const templatesForUsedCv = cvFileList?.templates || [];
  const templatesByName = { Common: [], IT: [], Technical: [] };
  templatesForUsedCv.forEach((tpl) => {
    if (tpl?.template && templatesByName[tpl.template]) {
      templatesByName[tpl.template].push(tpl);
    }
  });
  if (usedCvKind === 'original') return originalsForUsedCv;
  if (usedCvKind === 'template' && usedTemplateName && templatesByName[usedTemplateName]?.length) {
    return templatesByName[usedTemplateName];
  }
  return [];
}

function getAttachmentKind(message) {
  const mime = String(message?.attachmentMimeType || '').toLowerCase();
  const name = String(getAttachmentDisplayName(message?.attachmentName) || '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() : '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv'].includes(ext)) {
    return 'video';
  }
  return 'document';
}

function getAttachmentDisplayName(rawName) {
  if (!rawName) return '';
  const original = String(rawName).trim();
  if (!original) return '';

  const hasEncodingHints = /%[0-9a-f]{2}/i.test(original) || original.includes('+');
  const decodeURIComponentSafe = (value) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  let decoded = original;
  if (hasEncodingHints) {
    decoded = decodeURIComponentSafe(original.replace(/\+/g, '%20'));
  }

  const repairMojibake = (value) => {
    try {
      const bytes = Uint8Array.from(value, (ch) => ch.charCodeAt(0) & 0xff);
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
    } catch {
      return value;
    }
  };

  const scoreText = (value) => {
    if (!value) return -999;
    const vietnameseMatches = value.match(/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi) || [];
    const mojibakeMatches = value.match(/[ÃÂÆÐÑØŒƒ‰�]/g) || [];
    return vietnameseMatches.length * 3 - mojibakeMatches.length * 4;
  };

  const repaired = repairMojibake(decoded);
  if (scoreText(repaired) > scoreText(decoded)) {
    decoded = repaired;
  }

  return decoded || original;
}

const CARD_BORDER = '#f3f4f6';
const CARD_HEADER_BG = '#f9fafb';
const CARD_BG = '#ffffff';

/** Trạng thái bắt buộc nhập lý do từ chối (4, 6, 10, 13, 16) */
const STATUSES_REQUIRE_REJECTION = [4, 6, 10, 13, 16];
/** Trạng thái 8: Đang chờ phỏng vấn – cần nhập ngày phỏng vấn + tạo lịch calendar */
const STATUS_INTERVIEW_SCHEDULE = 8;

/** Nền khu vực tin nhắn (trắng; trước đây chia 2 nửa xanh/hồng) */
const CHAT_BG_LEFT = '#ffffff';
const CHAT_BG_RIGHT = '#ffffff';
const BUBBLE_LEFT_BG = '#f0f2f5';
const BUBBLE_LEFT_BORDER = '#f0f2f5';
const BUBBLE_RIGHT_BG = '#0084ff';
const BUBBLE_RIGHT_BORDER = '#0084ff';
const BUBBLE_SYSTEM_BG = '#ffedd5';
const BUBBLE_SYSTEM_BORDER = '#ea580c';

const NominationChat = ({
  jobApplicationId,
  userType = 'admin',
  /** Admin: đơn do ứng viên tạo (job_applications.applicant_id) — chat Admin ↔ ứng viên, không qua CTV */
  chatWithApplicant = false,
  onScheduleInterview,
  onScheduleNyusha,
  collaboratorId,
  currentStatus,
  onStatusUpdated,
  introCandidateName = '—',
  introJobTitle = '—',
  /** CV gắn đơn tiến cử — Admin & CTV: nút Xem CV + ZIP folder + chỉnh sửa */
  cvStorageId = null,
  cvPath = '',
  candidateEditPath = '',
  mobileHeaderName = '',
  mobileHeaderAvatar = '',
  onOpenInfoPanel,
}) => {
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showNyushaModal, setShowNyushaModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [nyushaDate, setNyushaDate] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  // Form tin nhắn đổi trạng thái (admin) – hiển thị trong phần chat
  const [showStatusMessageForm, setShowStatusMessageForm] = useState(false);
  const [statusFormStatus, setStatusFormStatus] = useState(() => (currentStatus != null && currentStatus >= 1 && currentStatus <= 16) ? Number(currentStatus) : 2);
  const [statusFormReason, setStatusFormReason] = useState('');
  const [statusFormAttachReason, setStatusFormAttachReason] = useState(false);
  const [statusFormPaymentAmount, setStatusFormPaymentAmount] = useState('');
  const [statusFormTags, setStatusFormTags] = useState([]); // thẻ nhỏ: [{ text: '', subTags: [] }]

  const STATUS_PAID = 15;
  const [sendingStatusMessage, setSendingStatusMessage] = useState(false);

  // Payment Request (admin only) - đồng bộ với trang thanh toán
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [paymentRequestLoading, setPaymentRequestLoading] = useState(false);
  const [showPaymentSection, setShowPaymentSection] = useState(true);
  const [paymentFormAmount, setPaymentFormAmount] = useState('');
  const [paymentFormNote, setPaymentFormNote] = useState('');
  const [paymentFormRejectReason, setPaymentFormRejectReason] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  
  // Hover states
  const [hoveredInterviewButton, setHoveredInterviewButton] = useState(false);
  const [hoveredNyushaButton, setHoveredNyushaButton] = useState(false);
  const [hoveredSendButton, setHoveredSendButton] = useState(false);
  const [hoveredInterviewModalCancel, setHoveredInterviewModalCancel] = useState(false);
  const [hoveredInterviewModalConfirm, setHoveredInterviewModalConfirm] = useState(false);
  const [hoveredNyushaModalCancel, setHoveredNyushaModalCancel] = useState(false);
  const [hoveredNyushaModalConfirm, setHoveredNyushaModalConfirm] = useState(false);

  // Modal thay đổi trạng thái (admin) – trong header chat
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false);
  const [changeStatusSelected, setChangeStatusSelected] = useState(() => (currentStatus != null && currentStatus >= 1 && currentStatus <= 16) ? Number(currentStatus) : 2);
  const [changeStatusReason, setChangeStatusReason] = useState('');
  const [changeStatusAttachReason, setChangeStatusAttachReason] = useState(false);
  const [changeStatusAmount, setChangeStatusAmount] = useState('');
  const [changeStatusInterviewDate, setChangeStatusInterviewDate] = useState('');
  const [changeStatusInterviewTime, setChangeStatusInterviewTime] = useState('');
  const [changeStatusSubmitting, setChangeStatusSubmitting] = useState(false);
  const attachmentInputRef = useRef(null);

  const [showCvModal, setShowCvModal] = useState(false);
  const [cvModalFileList, setCvModalFileList] = useState({ originals: [], templates: [] });
  const [cvModalLoading, setCvModalLoading] = useState(false);
  const [downloadingCvZip, setDownloadingCvZip] = useState(false);
  const [activeCvTab, setActiveCvTab] = useState(0);

  const { usedCvKind, usedTemplateName } = useMemo(() => parseNominationCvPath(cvPath), [cvPath]);
  const usedCvFilesForModal = useMemo(
    () => buildUsedCvFilesFromList(cvModalFileList, usedCvKind, usedTemplateName),
    [cvModalFileList, usedCvKind, usedTemplateName]
  );
  const previewCvFiles = useMemo(() => {
    if (usedCvFilesForModal.length > 0) return usedCvFilesForModal;
    const o = cvModalFileList?.originals || [];
    const tpl = cvModalFileList?.templates || [];
    return [...o, ...tpl];
  }, [usedCvFilesForModal, cvModalFileList]);

  const showCvTools = cvStorageId && (userType === 'admin' || userType === 'ctv');

  const openCvModal = async () => {
    if (!cvStorageId) return;
    setShowCvModal(true);
    setActiveCvTab(0);
    setCvModalLoading(true);
    try {
      const data =
        userType === 'admin'
          ? await apiService.getAdminCVFileList(cvStorageId)
          : await apiService.getCtvCVFileList(cvStorageId);
      setCvModalFileList(data || { originals: [], templates: [] });
    } catch (e) {
      console.error(e);
      setCvModalFileList({ originals: [], templates: [] });
    } finally {
      setCvModalLoading(false);
    }
  };

  const handleDownloadCvFolderZip = async () => {
    if (!cvStorageId) return;
    const scope = usedCvKind === 'original' ? 'original' : 'template';
    const template = usedCvKind === 'original' ? 'all' : usedTemplateName || 'all';
    setDownloadingCvZip(true);
    try {
      const { blob, filename } =
        userType === 'admin'
          ? await apiService.downloadAdminCVZip(cvStorageId, scope, template)
          : await apiService.downloadCtvCVZip(cvStorageId, scope, template);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'cv-folder.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(t.errorDownloadZip || 'Không thể tải ZIP.');
    } finally {
      setDownloadingCvZip(false);
    }
  };

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      loadMessages();
    }, 3000);
    return () => clearInterval(interval);
  }, [jobApplicationId, userType]);

  // Load payment request (admin only)
  const loadPaymentRequest = async () => {
    if (userType !== 'admin' || !jobApplicationId) return;
    try {
      setPaymentRequestLoading(true);
      const res = await apiService.getAdminPaymentRequests({ jobApplicationId, limit: 1 });
      if (res.success && res.data?.paymentRequests?.length) {
        const pr = res.data.paymentRequests[0];
        setPaymentRequest(pr);
        setPaymentFormAmount(String(pr.amount ?? ''));
      } else {
        setPaymentRequest(null);
        setPaymentFormAmount('');
      }
    } catch {
      setPaymentRequest(null);
    } finally {
      setPaymentRequestLoading(false);
    }
  };

  useEffect(() => {
    if (userType === 'admin' && jobApplicationId) {
      loadPaymentRequest();
    }
  }, [jobApplicationId, userType]);

  const handlePaymentApprove = async () => {
    if (!paymentRequest || paymentActionLoading) return;
    try {
      setPaymentActionLoading(true);
      const amount = paymentFormAmount ? parseFloat(paymentFormAmount) : undefined;
      const res = await apiService.approvePaymentRequest(paymentRequest.id, paymentFormNote || undefined, amount);
      if (res.success) {
        await loadPaymentRequest();
        await loadMessages();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        alert(res.message || t.chatErrorApproveFailed);
      }
    } catch (e) {
      alert(e.message || t.chatErrorGeneric);
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handlePaymentReject = async () => {
    if (!paymentRequest || paymentActionLoading) return;
    if (!paymentFormRejectReason?.trim()) {
      alert(t.chatErrorRejectReasonRequired);
      return;
    }
    try {
      setPaymentActionLoading(true);
      const res = await apiService.rejectPaymentRequest(paymentRequest.id, paymentFormRejectReason.trim(), paymentFormNote || undefined);
      if (res.success) {
        await loadPaymentRequest();
        await loadMessages();
        setPaymentFormRejectReason('');
        if (onStatusUpdated) onStatusUpdated();
      } else {
        alert(res.message || t.chatErrorRejectFailed);
      }
    } catch (e) {
      alert(e.message || t.chatErrorGeneric);
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handlePaymentMarkPaid = async () => {
    if (!paymentRequest || paymentActionLoading) return;
    try {
      setPaymentActionLoading(true);
      const amount = paymentFormAmount ? parseFloat(paymentFormAmount) : undefined;
      const res = await apiService.markPaymentRequestAsPaid(paymentRequest.id, paymentFormNote || undefined, amount);
      if (res.success) {
        await loadPaymentRequest();
        await loadMessages();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        alert(res.message || t.chatErrorMarkPaidFailed);
      }
    } catch (e) {
      alert(e.message || t.chatErrorGeneric);
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handlePaymentUpdateAmount = async () => {
    if (!paymentRequest || paymentActionLoading) return;
    const amount = parseFloat(paymentFormAmount);
    if (Number.isNaN(amount) || amount < 0) {
      alert(t.chatErrorInvalidAmount);
      return;
    }
    try {
      setPaymentActionLoading(true);
      const res = await apiService.updateAdminPaymentRequest(paymentRequest.id, { amount, note: paymentFormNote || undefined });
      if (res.success) {
        await loadPaymentRequest();
        await loadMessages();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        alert(res.message || t.chatErrorUpdateFailed);
      }
    } catch (e) {
      alert(e.message || t.chatErrorGeneric);
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const paymentStatusLabel = (s) => ({ 0: t.paymentStatusPending, 1: t.paymentStatusApproved, 2: t.paymentStatusRejected, 3: t.paymentStatusPaid }[s] || '—');

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages]);

  // Đồng bộ trạng thái form với trạng thái đơn hiện tại (khi mở form hoặc currentStatus đổi)
  useEffect(() => {
    const v = currentStatus != null && currentStatus !== '' ? Number(currentStatus) : 2;
    if (v >= 1 && v <= 16) setStatusFormStatus(v);
  }, [currentStatus, showStatusMessageForm]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom < 80;
  };

  const loadMessages = async () => {
    try {
      let response;
      if (userType === 'admin') {
        response = await apiService.getAdminMessagesByJobApplication(jobApplicationId);
      } else if (userType === 'applicant') {
        response = await apiService.getApplicantMessagesByJobApplication(jobApplicationId);
      } else {
        response = await apiService.getCTVMessagesByJobApplication(jobApplicationId);
      }

      if (response.success && response.data?.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedAttachment) || sending) return;

    try {
      setSending(true);
      let messageData;
      if (selectedAttachment) {
        messageData = new FormData();
        messageData.append('jobApplicationId', String(parseInt(jobApplicationId, 10)));
        messageData.append('content', newMessage.trim());
        messageData.append('type', 'text');
        if (userType === 'applicant') {
          messageData.append('senderType', '4');
        }
        messageData.append('attachment', selectedAttachment);
      } else {
        messageData = {
          jobApplicationId: parseInt(jobApplicationId, 10),
          content: newMessage.trim(),
          type: 'text'
        };
      }

      let response;
      if (userType === 'admin') {
        response = await apiService.createAdminMessage(messageData);
      } else if (userType === 'applicant') {
        response = await apiService.createApplicantMessage(messageData);
      } else {
        response = await apiService.createCTVMessage(messageData);
      }

      if (response.success) {
        setNewMessage('');
        setSelectedAttachment(null);
        if (attachmentInputRef.current) attachmentInputRef.current.value = '';
        shouldAutoScrollRef.current = true;
        loadMessages();
      } else {
        alert(response.message || t.chatErrorSendMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert(t.chatErrorSendMessage);
    } finally {
      setSending(false);
    }
  };

  const handleSelectAttachment = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedAttachment(file);
  };

  const removeSelectedAttachment = () => {
    setSelectedAttachment(null);
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const handleScheduleInterview = async () => {
    console.log('[Frontend] handleScheduleInterview called', { interviewDate, interviewTime, userType, jobApplicationId });
    
    if (!interviewDate || !interviewTime) {
      alert(t.chatErrorInterviewRequired);
      return;
    }

    try {
      const dateTime = new Date(`${interviewDate}T${interviewTime}`);
      console.log('[Frontend] DateTime created:', dateTime.toISOString());
      console.log('[Frontend] userType:', userType, 'typeof:', typeof userType);
      
      // Create calendar event (for both admin and CTV)
      let calendarResponse = { success: true };
      const calendarData = {
        jobApplicationId: parseInt(jobApplicationId),
        eventType: 1, // Interview
        startAt: dateTime.toISOString(),
        title: 'Phỏng vấn ứng viên',
        description: `Lịch phỏng vấn cho đơn ứng tuyển #${jobApplicationId}`,
        ...(collaboratorId && userType === 'admin' && { collaboratorId: parseInt(collaboratorId) })
      };
      
      console.log('[Frontend] Creating calendar event with data:', calendarData);
      
      try {
        if (userType === 'admin') {
          console.log('[Frontend] User is admin, calling apiService.createAdminCalendar...');
          calendarResponse = await apiService.createAdminCalendar(calendarData);
        } else {
          console.log('[Frontend] User is CTV, calling apiService.createCTVCalendar...');
          calendarResponse = await apiService.createCTVCalendar(calendarData);
        }
        
        console.log('[Frontend] Calendar API called, response:', calendarResponse);
        
        if (!calendarResponse || !calendarResponse.success) {
          console.error('[Frontend] Calendar creation failed:', calendarResponse);
          alert(calendarResponse?.message || t.chatErrorCreateSchedule);
          return;
        }
      } catch (error) {
        console.error('[Frontend] Error creating calendar:', error);
        console.error('[Frontend] Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response
        });
        alert(`${t.chatErrorCreateSchedule}: ${error.message || ''}`);
        return;
      }

      console.log('[Frontend] Calendar response check:', calendarResponse);
      if (calendarResponse && calendarResponse.success) {
        let updateResponse;
        if (userType === 'admin') {
          const updateData = {
            interviewDate: dateTime.toISOString(),
            status: 3
          };
          updateResponse = await apiService.updateAdminJobApplication(jobApplicationId, updateData);
        } else {
          const updateData = {
            interviewDate: dateTime.toISOString(),
            status: 3
          };
          updateResponse = await apiService.updateJobApplication(jobApplicationId, updateData);
        }

        if (updateResponse.success) {
          const messageData = {
            jobApplicationId: parseInt(jobApplicationId),
            content: `Đã đặt lịch phỏng vấn: ${interviewDate} ${interviewTime}`,
            type: 'system'
          };

          await (userType === 'admin'
            ? apiService.createAdminMessage(messageData)
            : apiService.createCTVMessage(messageData));

          setShowInterviewModal(false);
          setInterviewDate('');
          setInterviewTime('');
          loadMessages();
          if (onScheduleInterview) onScheduleInterview();
          alert(t.chatSuccessInterviewScheduled);
        } else {
          alert(updateResponse.message || t.chatErrorUpdateApplication);
        }
      } else {
        alert(calendarResponse.message || t.chatErrorCreateSchedule);
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert(t.chatErrorCreateSchedule);
    }
  };

  const handleScheduleNyusha = async () => {
    if (!nyushaDate) {
      alert(t.chatErrorNyushaRequired);
      return;
    }

    try {
      const date = new Date(nyushaDate);
      console.log('[Frontend] handleScheduleNyusha called', { nyushaDate, userType, jobApplicationId });
      console.log('[Frontend] userType:', userType, 'typeof:', typeof userType);
      
      // Create calendar event (for both admin and CTV)
      let calendarResponse = { success: true };
      const calendarData = {
        jobApplicationId: parseInt(jobApplicationId),
        eventType: 2, // Nyusha
        startAt: date.toISOString(),
        title: 'Ngày nhập công ty',
        description: `Ngày nhập công ty cho đơn ứng tuyển #${jobApplicationId}`,
        ...(collaboratorId && userType === 'admin' && { collaboratorId: parseInt(collaboratorId) })
      };
      
      console.log('[Frontend] Creating nyusha calendar event with data:', calendarData);
      
      try {
        if (userType === 'admin') {
          console.log('[Frontend] User is admin, calling apiService.createAdminCalendar...');
          calendarResponse = await apiService.createAdminCalendar(calendarData);
        } else {
          console.log('[Frontend] User is CTV, calling apiService.createCTVCalendar...');
          calendarResponse = await apiService.createCTVCalendar(calendarData);
        }
        
        console.log('[Frontend] Calendar API called, response:', calendarResponse);
        
        if (!calendarResponse || !calendarResponse.success) {
          console.error('[Frontend] Calendar creation failed:', calendarResponse);
          alert(calendarResponse?.message || t.chatErrorCreateSchedule);
          return;
        }
      } catch (error) {
        console.error('[Frontend] Error creating calendar:', error);
        console.error('[Frontend] Error details:', {
          message: error.message,
          stack: error.stack,
          response: error.response
        });
        alert(`${t.chatErrorCreateSchedule}: ${error.message || ''}`);
        return;
      }

      console.log('[Frontend] Calendar response check:', calendarResponse);
      if (calendarResponse && calendarResponse.success) {
        let updateResponse;
        if (userType === 'admin') {
          const updateData = {
            nyushaDate: date.toISOString().split('T')[0],
            status: 8
          };
          updateResponse = await apiService.updateAdminJobApplication(jobApplicationId, updateData);
        } else {
          const updateData = {
            nyushaDate: date.toISOString().split('T')[0],
            status: 8
          };
          updateResponse = await apiService.updateJobApplication(jobApplicationId, updateData);
        }

        if (updateResponse.success) {
          const messageData = {
            jobApplicationId: parseInt(jobApplicationId),
            content: `Đã đặt ngày nhập công ty: ${nyushaDate}`,
            type: 'system'
          };

          await (userType === 'admin'
            ? apiService.createAdminMessage(messageData)
            : apiService.createCTVMessage(messageData));

          setShowNyushaModal(false);
          setNyushaDate('');
          loadMessages();
          if (onScheduleNyusha) onScheduleNyusha();
          alert(t.chatSuccessNyushaScheduled);
        } else {
          alert(updateResponse.message || t.chatErrorUpdateApplication);
        }
      } else {
        alert(calendarResponse.message || t.chatErrorCreateSchedule);
      }
    } catch (error) {
      console.error('Error scheduling nyusha:', error);
      alert(t.chatErrorNyushaSchedule);
    }
  };

  const handleConfirmChangeStatus = async () => {
    if (!jobApplicationId || changeStatusSubmitting) return;
    const statusNum = Number(changeStatusSelected);
    if (Number.isNaN(statusNum) || statusNum < 1 || statusNum > 16) {
      alert(t.selectValidStatus);
      return;
    }
    if (changeStatusAttachReason && !changeStatusReason.trim()) {
      alert(t.chatReasonRequired || 'Vui lòng nhập lý do.');
      return;
    }
    if (statusNum === STATUS_INTERVIEW_SCHEDULE) {
      if (!changeStatusInterviewDate || !changeStatusInterviewTime) {
        alert(t.chatErrorInterviewRequired);
        return;
      }
    }
    if (statusNum === STATUS_PAID) {
      const amount = parseFloat(changeStatusAmount);
      if (Number.isNaN(amount) || amount < 0) {
        alert(t.chatErrorPaymentAmountRequired);
        return;
      }
    }

    try {
      setChangeStatusSubmitting(true);
      if (statusNum === STATUS_INTERVIEW_SCHEDULE) {
        const dateTime = new Date(`${changeStatusInterviewDate}T${changeStatusInterviewTime}`);
        const calendarData = {
          jobApplicationId: parseInt(jobApplicationId),
          eventType: 1,
          startAt: dateTime.toISOString(),
          title: 'Phỏng vấn ứng viên',
          description: `Lịch phỏng vấn cho đơn ứng tuyển #${jobApplicationId}`,
          ...(collaboratorId && { collaboratorId: parseInt(collaboratorId) })
        };
        const calendarResponse = await apiService.createAdminCalendar(calendarData);
        if (!calendarResponse?.success) {
          alert(calendarResponse?.message || t.chatErrorCreateSchedule);
          return;
        }
        const updateResponse = await apiService.updateAdminJobApplication(jobApplicationId, {
          interviewDate: dateTime.toISOString(),
          status: STATUS_INTERVIEW_SCHEDULE
        });
        if (!updateResponse.success) {
          alert(updateResponse.message || t.chatErrorUpdateApplication);
          return;
        }
        await apiService.createAdminMessage({
          jobApplicationId: parseInt(jobApplicationId),
          content: `Đã đặt lịch phỏng vấn: ${changeStatusInterviewDate} ${changeStatusInterviewTime}`,
          type: 'system'
        });
        setShowChangeStatusModal(false);
        setChangeStatusAttachReason(false);
        setChangeStatusReason('');
        setChangeStatusInterviewDate('');
        setChangeStatusInterviewTime('');
        loadMessages();
        if (onScheduleInterview) onScheduleInterview();
        if (onStatusUpdated) onStatusUpdated();
        alert(t.chatSuccessInterviewScheduled);
      } else {
        const rejectNote = changeStatusAttachReason ? changeStatusReason.trim() : '';
        const paymentAmount = statusNum === STATUS_PAID ? parseFloat(changeStatusAmount) : null;
        const response = await apiService.updateJobApplicationStatus(
          parseInt(jobApplicationId),
          statusNum,
          rejectNote,
          paymentAmount,
          !changeStatusAttachReason
        );
        if (response.success) {
          setShowChangeStatusModal(false);
          setChangeStatusAttachReason(false);
          setChangeStatusReason('');
          setChangeStatusAmount('');
          loadMessages();
          if (userType === 'admin') await loadPaymentRequest();
          if (onStatusUpdated) onStatusUpdated();
          alert(response.message || (t.updateSuccess || 'Cập nhật trạng thái thành công.'));
        } else {
          alert(response.message || t.chatErrorStatusChangeFailed);
        }
      }
    } catch (err) {
      const msg = err?.data?.message || err?.message || t.chatErrorStatusChangeFailed;
      alert(msg);
    } finally {
      setChangeStatusSubmitting(false);
    }
  };

  const handleSendStatusMessage = async (e) => {
    e.preventDefault();
    if (!jobApplicationId || sendingStatusMessage) return;
    if (statusFormStatus === STATUS_PAID) {
      const amount = parseFloat(statusFormPaymentAmount);
      if (Number.isNaN(amount) || amount < 0) {
        alert(t.chatErrorPaymentAmountRequired);
        return;
      }
    }
    const reason = statusFormAttachReason ? statusFormReason.trim() : '';
    const tagLines = statusFormAttachReason
      ? statusFormTags.map((t) => {
        const main = (t.text || '').trim();
        const sub = (t.subTags || []).filter((s) => String(s).trim()).map((s) => '  + ' + String(s).trim());
        return main ? ['+ ' + main, ...sub].join('\n') : sub.join('\n');
      }).filter(Boolean)
      : [];
    const rejectNote = reason + (tagLines.length ? '\n\n' + tagLines.join('\n') : '');
    try {
      setSendingStatusMessage(true);
      const response = await apiService.updateJobApplicationStatus(
        parseInt(jobApplicationId),
        statusFormStatus,
        rejectNote,
        statusFormStatus === STATUS_PAID ? parseFloat(statusFormPaymentAmount) : null,
        !statusFormAttachReason
      );
      if (response.success) {
        setShowStatusMessageForm(false);
        setStatusFormAttachReason(false);
        setStatusFormReason('');
        setStatusFormPaymentAmount('');
        setStatusFormTags([]);
        // Gọi lại tin nhắn ngay để hiển thị thẻ trạng thái vừa gửi (backend đã tạo message)
        await loadMessages();
        if (userType === 'admin') await loadPaymentRequest();
        if (onStatusUpdated) onStatusUpdated();
      } else {
        alert(response.message || t.chatErrorStatusChangeFailed);
      }
    } catch (err) {
      const msg = err?.data?.message || err?.message || t.chatErrorStatusMessageFailed;
      alert(msg);
    } finally {
      setSendingStatusMessage(false);
    }
  };

  const addStatusFormTag = () => {
    setStatusFormTags((prev) => [...prev, { text: '', subTags: [] }]);
  };

  const addStatusFormSubTag = (tagIndex) => {
    setStatusFormTags((prev) => {
      const next = [...prev];
      const t = next[tagIndex] || { text: '', subTags: [] };
      next[tagIndex] = { ...t, subTags: [...(t.subTags || []), ''] };
      return next;
    });
  };

  const updateStatusFormTag = (tagIndex, text) => {
    setStatusFormTags((prev) => {
      const next = [...prev];
      const t = next[tagIndex] || { text: '', subTags: [] };
      next[tagIndex] = { ...t, text };
      return next;
    });
  };

  const updateStatusFormSubTag = (tagIndex, subIndex, text) => {
    setStatusFormTags((prev) => {
      const next = [...prev];
      const t = next[tagIndex] || { text: '', subTags: [] };
      const sub = [...(t.subTags || [])];
      sub[subIndex] = text;
      next[tagIndex] = { ...t, subTags: sub };
      return next;
    });
  };

  const removeStatusFormTag = (tagIndex) => {
    setStatusFormTags((prev) => prev.filter((_, i) => i !== tagIndex));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const statusLabel = getJobApplicationStatusLabelByLanguage(statusFormStatus, language);

  return (
    <div className="flex h-full flex-col rounded-2xl border shadow-sm sm:rounded-lg" style={{ backgroundColor: 'white', borderColor: CARD_BORDER }}>
      {/* Header */}
      <div className="border-b px-3 py-2 sm:p-4" style={{ borderColor: CARD_BORDER, backgroundColor: CARD_HEADER_BG }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3
              className="hidden min-w-0 items-center gap-2 text-sm font-bold sm:flex"
              style={{ color: '#111827' }}
              title={userType === 'admin' && chatWithApplicant ? 'Trao đổi với ứng viên (đơn từ landing)' : undefined}
            >
              <span
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full sm:h-auto sm:w-auto sm:rounded-none"
                style={{ backgroundColor: '#e0e7ff' }}
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#4f46e5' }} />
              </span>
              <span className="truncate">{mobileHeaderName || t.chatTitle}</span>
            </h3>
            <div className="flex min-w-0 items-center gap-2 sm:hidden">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase"
                style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}
              >
                {mobileHeaderAvatar || 'C'}
              </div>
              <p className="truncate text-sm font-semibold" style={{ color: '#111827' }}>
                {mobileHeaderName || t.chatTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenInfoPanel?.()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-white text-neutral-700 sm:hidden"
            style={{ borderColor: '#e5e7eb' }}
            aria-label={t.nominationInfoBlock}
          >
            <PanelRight className="h-4 w-4" aria-hidden />
          </button>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {showCvTools && (
              <button
                type="button"
                onClick={openCvModal}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1"
                style={{ color: '#1d4ed8', backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}
              >
                <FileText className="w-3.5 h-3.5" />
                {t.chatViewCv}
              </button>
            )}
            {userType === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  setChangeStatusSelected((currentStatus != null && currentStatus >= 1 && currentStatus <= 16) ? Number(currentStatus) : 2);
                  setChangeStatusReason('');
                  setChangeStatusAttachReason(false);
                  setChangeStatusAmount('');
                  setChangeStatusInterviewDate('');
                  setChangeStatusInterviewTime('');
                  setShowChangeStatusModal(true);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1"
                style={{ color: '#374151', backgroundColor: 'white', borderColor: '#e5e7eb' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t.chatChangeStatusSend}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section Yêu cầu thanh toán (admin only) */}
      {userType === 'admin' && (
        <div className="hidden rounded-none border-b sm:block" style={{ borderColor: CARD_BORDER, backgroundColor: CARD_HEADER_BG }}>
          <button
            type="button"
            onClick={() => setShowPaymentSection(!showPaymentSection)}
            className="w-full px-4 py-2 flex items-center justify-between text-left"
          >
            <span className="text-xs font-bold flex items-center gap-2" style={{ color: '#111827' }}>
              <DollarSign className="w-4 h-4 flex-shrink-0" style={{ color: '#6b7280' }} />
              {t.chatPaymentRequest}
              {paymentRequest && (
                <span className="px-1.5 py-0.5 rounded text-[10px] border" style={{ backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }}>
                  {paymentStatusLabel(paymentRequest.status)}
                </span>
              )}
            </span>
            {showPaymentSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showPaymentSection && (
            <div className="px-4 pb-4 space-y-3">
              {paymentRequestLoading ? (
                <div className="text-xs" style={{ color: '#6b7280' }}>{t.chatLoading}</div>
              ) : paymentRequest ? (
                <>
                  <div className="flex items-center gap-4 text-xs">
                    <span><strong>{t.chatAmount}:</strong> {(paymentRequest.amount ?? 0).toLocaleString('vi-VN')}đ</span>
                    <span><strong>{t.statusLabel}:</strong> {paymentStatusLabel(paymentRequest.status)}</span>
                  </div>
                  {(paymentRequest.status === 0 || paymentRequest.status === 1) && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold mb-0.5">{t.chatAmountToPay}</label>
                        <input
                          type="number"
                          value={paymentFormAmount}
                          onChange={e => setPaymentFormAmount(e.target.value)}
                          placeholder="VD: 500000"
                          min="0"
                          className="w-full px-2 py-1.5 border rounded text-xs"
                          style={{ borderColor: '#d1d5db' }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold mb-0.5">{t.chatNote}</label>
                        <input
                          type="text"
                          value={paymentFormNote}
                          onChange={e => setPaymentFormNote(e.target.value)}
                          placeholder={t.chatNoteOptional}
                          className="w-full px-2 py-1.5 border rounded text-xs"
                          style={{ borderColor: '#d1d5db' }}
                        />
                      </div>
                      {paymentRequest.status === 0 && (
                        <div>
                          <label className="block text-[10px] font-semibold mb-0.5">{t.chatRejectReason}</label>
                          <input
                            type="text"
                            value={paymentFormRejectReason}
                            onChange={e => setPaymentFormRejectReason(e.target.value)}
                            placeholder={t.chatRejectReasonPlaceholder}
                            className="w-full px-2 py-1.5 border rounded text-xs"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {paymentRequest.status === 0 && (
                          <>
                            <button
                              type="button"
                              onClick={handlePaymentApprove}
                              disabled={paymentActionLoading}
                              className="px-3 py-1 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: '#16a34a', opacity: paymentActionLoading ? 0.6 : 1 }}
                            >
                              <CheckCircle className="w-3 h-3 inline mr-1" /> {t.chatApprove}
                            </button>
                            <button
                              type="button"
                              onClick={handlePaymentReject}
                              disabled={paymentActionLoading || !paymentFormRejectReason?.trim()}
                              className="px-3 py-1 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: '#dc2626', opacity: paymentActionLoading ? 0.6 : 1 }}
                            >
                              <XCircle className="w-3 h-3 inline mr-1" /> {t.chatReject}
                            </button>
                          </>
                        )}
                        {paymentRequest.status === 1 && (
                          <button
                            type="button"
                            onClick={handlePaymentMarkPaid}
                            disabled={paymentActionLoading}
                            className="px-3 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: '#16a34a', opacity: paymentActionLoading ? 0.6 : 1 }}
                          >
                            <DollarSign className="w-3 h-3 inline mr-1" /> {t.chatMarkPaid}
                          </button>
                        )}
                        {(paymentRequest.status === 0 || paymentRequest.status === 1) && (
                          <button
                            type="button"
                            onClick={handlePaymentUpdateAmount}
                            disabled={paymentActionLoading}
                            className="px-3 py-1 rounded text-xs font-semibold"
                            style={{ backgroundColor: '#e5e7eb', color: '#374151', opacity: paymentActionLoading ? 0.6 : 1 }}
                          >
                            {t.chatUpdateAmount}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs" style={{ color: '#6b7280' }}>{t.chatNoPaymentRequest}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form tin nhắn đổi trạng thái (admin) */}
      {userType === 'admin' && showStatusMessageForm && (
        <form onSubmit={handleSendStatusMessage} className="mx-4 mt-3 mb-2 rounded-xl overflow-hidden flex-shrink-0 border shadow-sm" style={{ borderColor: CARD_BORDER, backgroundColor: CARD_BG }}>
          <div className="px-4 py-3 text-center font-bold text-sm border-b" style={{ backgroundColor: CARD_HEADER_BG, color: '#111827', borderColor: CARD_BORDER }}>
            {statusLabel}
          </div>
          <div className="p-4 space-y-4" style={{ backgroundColor: CARD_BG }}>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                {t.chatStatusLabel}
              </label>
              <select
                value={statusFormStatus}
                onChange={(e) => {
                  const nextStatus = parseInt(e.target.value, 10);
                  setStatusFormStatus(nextStatus);
                  setStatusFormPaymentAmount('');
                  setStatusFormAttachReason(false);
                  setStatusFormReason('');
                  setStatusFormTags([]);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}
              >
                {getJobApplicationStatusOptionsByLanguage(language).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {statusFormStatus === STATUS_PAID && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                  {t.chatPaymentAmount} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={statusFormPaymentAmount}
                  onChange={(e) => setStatusFormPaymentAmount(e.target.value)}
                  placeholder={t.chatPaymentAmountPlaceholder}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm font-medium" style={{ color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={statusFormAttachReason}
                  onChange={(e) => {
                    const checked = !!e.target.checked;
                    setStatusFormAttachReason(checked);
                    if (!checked) {
                      setStatusFormReason('');
                      setStatusFormTags([]);
                    }
                  }}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: '#2563eb', flexShrink: 0 }}
                />
                <span>{t.reasonNoteOptional || 'Lý do / Ghi chú (tùy chọn)'}</span>
              </label>

              {statusFormAttachReason && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                    Lý do:
                  </label>
                  <textarea
                    value={statusFormReason}
                    onChange={(e) => setStatusFormReason(e.target.value)}
                    placeholder={t.chatReasonPlaceholder}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-y"
                    style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}
                  />
                </div>
              )}

              {statusFormStatus !== STATUS_PAID && statusFormAttachReason && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={addStatusFormTag}
                    className="flex items-center gap-1 text-sm font-bold"
                    style={{ color: '#374151' }}
                  >
                    <Plus className="w-4 h-4" /> {t.chatAddTag}
                  </button>
                  {statusFormTags.map((tag, tagIndex) => (
                    <div key={tagIndex} className="pl-4 space-y-1 border-l-2" style={{ borderColor: '#e5e7eb' }}>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={tag.text || ''}
                          onChange={(e) => updateStatusFormTag(tagIndex, e.target.value)}
                          placeholder={t.chatTagPlaceholder}
                          className="flex-1 px-2 py-1 border rounded text-xs"
                          style={{ borderColor: '#e5e7eb' }}
                        />
                        <button
                          type="button"
                          onClick={() => addStatusFormSubTag(tagIndex)}
                          className="text-xs font-bold flex items-center gap-0.5"
                          style={{ color: '#6b7280' }}
                        >
                          <Plus className="w-3 h-3" /> {t.chatSubTag}
                        </button>
                        <button type="button" onClick={() => removeStatusFormTag(tagIndex)} className="p-0.5" style={{ color: '#9ca3af' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {(tag.subTags || []).map((sub, subIndex) => (
                        <div key={subIndex} className="pl-3 flex gap-2 items-center">
                          <span className="text-xs" style={{ color: '#6b7280' }}>+</span>
                          <input
                            type="text"
                            value={sub}
                            onChange={(e) => updateStatusFormSubTag(tagIndex, subIndex, e.target.value)}
                            placeholder={t.chatSubTagPlaceholder}
                            className="flex-1 px-2 py-1 border rounded text-xs"
                            style={{ borderColor: '#e5e7eb' }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowStatusMessageForm(false);
                  setStatusFormAttachReason(false);
                  setStatusFormReason('');
                  setStatusFormPaymentAmount('');
                  setStatusFormTags([]);
                }}
                className="px-4 py-2 border rounded-lg text-sm font-medium"
                style={{ borderColor: '#d1d5db', color: '#374151' }}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={sendingStatusMessage || (statusFormStatus === STATUS_PAID && !statusFormPaymentAmount.trim())}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: '#2563eb', color: '#fff', opacity: sendingStatusMessage ? 0.7 : 1 }}
              >
                {sendingStatusMessage ? t.chatSending : t.chatSendToCtv}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Messages: 2 block nền trái/phải + thẻ màu */}
      <div className="mx-0 my-0 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border sm:mx-3 sm:my-2 sm:rounded-xl" style={{ borderColor: '#cbd5e1' }}>
        <div className="relative flex-1 min-h-0 flex">
          <div className="absolute inset-0 flex pointer-events-none" aria-hidden>
            <div className="w-1/2" style={{ backgroundColor: CHAT_BG_LEFT }} />
            <div className="w-1/2" style={{ backgroundColor: CHAT_BG_RIGHT }} />
          </div>
          <div
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
            className="relative z-[1] min-h-[220px] flex-1 space-y-3 overflow-y-auto p-3 sm:min-h-[200px]"
          >
            {loading ? (
              <div className="flex items-center justify-center min-h-[160px]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-transparent border-t-gray-400" style={{ borderTopColor: '#6b7280' }} />
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="text-center text-xs py-6 rounded-lg border border-dashed" style={{ color: '#64748b', backgroundColor: 'rgba(255,255,255,0.65)', borderColor: '#94a3b8' }}>
                    {t.chatNoMessages}
                  </div>
                )}
                {messages.map((message) => {
                  const statusParsed = parseStatusMessageContent(message.content);
                  const isNominationIntroMessage =
                    typeof message.content === 'string' &&
                    message.content.trim().startsWith('Cảm ơn bạn đã tiến cử');
                  const effectiveSenderType = isNominationIntroMessage ? 1 : message.senderType;
                  const isSender =
                    userType === 'admin'
                      ? effectiveSenderType === 1
                      : userType === 'applicant'
                        ? effectiveSenderType === 4
                        : effectiveSenderType === 2;
                  if (message.senderType === 3 && statusParsed.isStatusChange) {
                    return (
                      <div
                        key={message.id}
                        className={`flex w-full ${userType === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <StatusChangeMessageCard
                          statusName={statusParsed.statusName}
                          reason={statusParsed.reason}
                          paymentAmount={statusParsed.paymentAmount}
                          createdAt={message.createdAt}
                          formatDate={formatDate}
                          variant={userType === 'admin' ? 'adminSide' : 'ctvSide'}
                        />
                      </div>
                    );
                  }

                  const isSystem = (message.senderType === 3 || message.type === 'system') && !isNominationIntroMessage;
                  if (isSystem && !statusParsed.isStatusChange) {
                    const displayContent = message.content === '[Attachment]' ? '' : message.content;
                    return (
                      <div key={message.id} className="flex justify-center w-full">
                        <div
                          className="max-w-[90%] rounded-xl px-3 py-2 border-2 shadow-sm"
                          style={{
                            backgroundColor: BUBBLE_SYSTEM_BG,
                            borderColor: BUBBLE_SYSTEM_BORDER,
                          }}
                        >
                          {!!displayContent && (
                            <p className="text-xs whitespace-pre-wrap font-medium" style={{ color: '#9a3412' }}>
                              {displayContent}
                            </p>
                          )}
                          {message.attachmentUrl && (
                            (() => {
                              const kind = getAttachmentKind(message);
                              if (kind === 'image') {
                                return (
                                  <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-1">
                                    <img
                                      src={message.attachmentUrl}
                                      alt={message.attachmentName || 'attachment'}
                                      className="max-w-[220px] max-h-[220px] rounded-lg border"
                                      style={{ borderColor: 'rgba(154,52,18,0.35)' }}
                                    />
                                  </a>
                                );
                              }
                              if (kind === 'video') {
                                return (
                                  <video
                                    controls
                                    className="mt-1 max-w-[220px] max-h-[220px] rounded-lg border"
                                    style={{ borderColor: 'rgba(154,52,18,0.35)' }}
                                    src={message.attachmentUrl}
                                  />
                                );
                              }
                              return (
                                <a
                                  href={message.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold underline mt-1"
                                  style={{ color: '#9a3412' }}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  {getAttachmentDisplayName(message.attachmentName) || 'attachment'}
                                </a>
                              );
                            })()
                          )}
                          <p className="text-[10px] mt-1" style={{ color: '#c2410c' }}>
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const cardStyle = isSender
                    ? {
                        backgroundColor: BUBBLE_RIGHT_BG,
                        border: `1px solid ${BUBBLE_RIGHT_BORDER}`,
                        boxShadow: '0 1px 4px rgba(0, 132, 255, 0.25)',
                      }
                    : {
                        backgroundColor: BUBBLE_LEFT_BG,
                        border: `1px solid ${BUBBLE_LEFT_BORDER}`,
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                      };

                  return (
                    <div
                      key={message.id}
                      className={`flex w-full ${isSender ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[78%] rounded-2xl px-3 py-2 sm:max-w-[72%]" style={cardStyle}>
                        {message.content !== '[Attachment]' && (
                          <p className="text-xs whitespace-pre-wrap font-medium" style={{ color: isSender ? '#ffffff' : '#050505' }}>
                            {message.content}
                          </p>
                        )}
                        {message.attachmentUrl && (
                          (() => {
                            const kind = getAttachmentKind(message);
                            if (kind === 'image') {
                              return (
                                <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="block mt-1">
                                  <img
                                    src={message.attachmentUrl}
                                    alt={message.attachmentName || 'attachment'}
                                    className="max-w-[240px] max-h-[240px] rounded-lg border"
                                    style={{ borderColor: isSender ? 'rgba(255,255,255,0.45)' : '#d1d5db' }}
                                  />
                                </a>
                              );
                            }
                            if (kind === 'video') {
                              return (
                                <video
                                  controls
                                  className="mt-1 max-w-[240px] max-h-[240px] rounded-lg border"
                                  style={{ borderColor: isSender ? 'rgba(255,255,255,0.45)' : '#d1d5db' }}
                                  src={message.attachmentUrl}
                                />
                              );
                            }
                            return (
                              <a
                                href={message.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold underline mt-1"
                                style={{ color: isSender ? '#ffffff' : '#111827' }}
                              >
                                <Paperclip className="w-3 h-3" />
                                {getAttachmentDisplayName(message.attachmentName) || 'attachment'}
                              </a>
                            );
                          })()
                        )}
                        <p className="text-[10px] mt-1 opacity-80" style={{ color: isSender ? 'rgba(255,255,255,0.85)' : '#65676b' }}>
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t px-2 py-1.5 sm:p-4" style={{ borderColor: CARD_BORDER }}>
        {selectedAttachment && (
          <div className="mb-2 flex items-center justify-between rounded-lg border px-3 py-1.5" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs truncate" style={{ color: '#111827' }}>{selectedAttachment.name}</span>
            </div>
            <button type="button" onClick={removeSelectedAttachment} className="p-1" style={{ color: '#6b7280' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5 sm:gap-2">
          <input
            ref={attachmentInputRef}
            type="file"
            onChange={handleSelectAttachment}
            className="hidden"
            disabled={sending}
          />
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-sm sm:h-auto sm:w-auto sm:rounded-xl sm:px-3 sm:py-2"
            style={{ borderColor: '#e5e7eb', color: '#64748b', backgroundColor: '#fff' }}
            disabled={sending}
          >
            <Plus className="h-4 w-4 sm:hidden" />
            <Paperclip className="hidden h-4 w-4 sm:block" />
          </button>
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-sm sm:hidden"
            style={{ borderColor: '#e5e7eb', color: '#64748b', backgroundColor: '#fff' }}
            disabled={sending}
          >
            <Camera className="h-4 w-4" />
          </button>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={t.chatMessagePlaceholder}
            rows={1}
            className="h-8 flex-1 resize-none rounded-full px-3 py-1.5 text-sm focus:outline-none sm:h-auto sm:rounded-xl"
            style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb', color: '#111827' }}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !selectedAttachment) || sending}
            onMouseEnter={() => setHoveredSendButton(true)}
            onMouseLeave={() => setHoveredSendButton(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
            style={{
              backgroundColor: hoveredSendButton ? '#1d4ed8' : '#2563eb',
              color: 'white',
              opacity: ((!newMessage.trim() && !selectedAttachment) || sending) ? 0.5 : 1,
              cursor: ((!newMessage.trim() && !selectedAttachment) || sending) ? 'not-allowed' : 'pointer'
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Modal Xem CV — tải ZIP toàn bộ folder snapshot + link chỉnh sửa (Admin & CTV) */}
      {showCvModal && showCvTools && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.45)' }}>
          <div
            className="bg-white rounded-xl shadow-xl border max-w-5xl w-full max-h-[90vh] flex flex-col"
            style={{ borderColor: CARD_BORDER }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: CARD_BORDER }}>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>
                  {t.chatCvModalTitle}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  {t.chatCvModalFolderHint}{' '}
                  {usedCvKind === 'original'
                    ? 'CV_original'
                    : usedCvKind === 'template'
                      ? `CV_Template / ${usedTemplateName || '—'}`
                      : '—'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {candidateEditPath ? (
                  <Link
                    to={candidateEditPath}
                    className="px-3 py-1.5 text-xs rounded-lg border font-medium inline-flex items-center gap-1"
                    style={{ borderColor: '#2563eb', color: '#2563eb', backgroundColor: 'white' }}
                  >
                    {t.chatEditCandidateCv}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleDownloadCvFolderZip}
                  disabled={downloadingCvZip}
                  className="px-3 py-1.5 text-xs rounded-lg border inline-flex items-center gap-1 font-medium"
                  style={{ borderColor: '#059669', color: '#059669', backgroundColor: '#ecfdf5' }}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {downloadingCvZip ? t.chatLoading : t.chatDownloadFolderZip}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border"
                  style={{ borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
            {cvModalLoading ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-blue-600" />
              </div>
            ) : previewCvFiles.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs" style={{ color: '#6b7280' }}>
                {t.chatCvNoFilesInFolder}
              </div>
            ) : (
              <>
                <div className="px-4 pt-3 border-b overflow-x-auto shrink-0" style={{ borderColor: CARD_BORDER }}>
                  <div className="flex gap-2">
                    {previewCvFiles.map((file, idx) => {
                      const title = file.name || file.label || `File ${idx + 1}`;
                      const isActive = idx === activeCvTab;
                      return (
                        <button
                          key={`cv-tab-${idx}`}
                          type="button"
                          onClick={() => setActiveCvTab(idx)}
                          className="px-3 py-1.5 text-xs border-b-2 transition-colors whitespace-nowrap"
                          style={{
                            color: isActive ? '#2563eb' : '#6b7280',
                            borderColor: isActive ? '#2563eb' : 'transparent',
                          }}
                        >
                          {title}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
                  {previewCvFiles[activeCvTab]?.viewUrl ? (
                    <div className="flex-1 min-h-[min(500px,50vh)] flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                        <span style={{ color: '#6b7280' }}>
                          {previewCvFiles[activeCvTab].name || previewCvFiles[activeCvTab].label || `File ${activeCvTab + 1}`}
                        </span>
                        {previewCvFiles[activeCvTab].downloadUrl && (
                          <a
                            href={previewCvFiles[activeCvTab].downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline"
                            style={{ color: '#2563eb' }}
                          >
                            Download
                          </a>
                        )}
                      </div>
                      <div className="flex-1 border rounded-lg min-h-[200px] overflow-hidden" style={{ borderColor: CARD_BORDER }}>
                        <iframe
                          title="CV preview"
                          src={previewCvFiles[activeCvTab].viewUrl}
                          className="w-full h-full min-h-[420px]"
                          style={{ border: 'none' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: '#6b7280' }}>
                      {t.chatCvNoFilesInFolder}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal thay đổi trạng thái */}
      {showChangeStatusModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-xl shadow-lg border w-full max-w-md mx-4 p-5 bg-white" style={{ borderColor: CARD_BORDER }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{t.changeStatusModalTitle || 'Thay đổi trạng thái'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.newStatusLabel || 'Trạng thái mới'}</label>
                <select
                  value={changeStatusSelected}
                  onChange={(e) => {
                    setChangeStatusSelected(parseInt(e.target.value, 10));
                    setChangeStatusReason('');
                    setChangeStatusAttachReason(false);
                    setChangeStatusAmount('');
                    setChangeStatusInterviewDate('');
                    setChangeStatusInterviewTime('');
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  {getJobApplicationStatusOptionsByLanguage(language).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-start gap-2 text-sm font-medium" style={{ color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={changeStatusAttachReason}
                    onChange={(e) => {
                      const checked = !!e.target.checked;
                      setChangeStatusAttachReason(checked);
                      if (!checked) setChangeStatusReason('');
                    }}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: '#2563eb', flexShrink: 0 }}
                  />
                  <span>{t.reasonNoteOptional || 'Lý do / Ghi chú (tùy chọn)'}</span>
                </label>
                {changeStatusAttachReason && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                      Lý do:
                    </label>
                    <textarea
                      value={changeStatusReason}
                      onChange={(e) => setChangeStatusReason(e.target.value)}
                      placeholder={t.placeholderReasonStatus || 'Nhập lý do...'}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                )}
              </div>
              {changeStatusSelected === STATUS_INTERVIEW_SCHEDULE && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.chatDate || 'Ngày'}</label>
                    <input
                      type="date"
                      value={changeStatusInterviewDate}
                      onChange={(e) => setChangeStatusInterviewDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.chatTime || 'Giờ'}</label>
                    <input
                      type="time"
                      value={changeStatusInterviewTime}
                      onChange={(e) => setChangeStatusInterviewTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      style={{ borderColor: '#e5e7eb' }}
                    />
                  </div>
                </>
              )}
              {changeStatusSelected === STATUS_PAID && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                    {t.chatPaymentAmount || 'Số tiền thanh toán'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={changeStatusAmount}
                    onChange={(e) => setChangeStatusAmount(e.target.value)}
                    placeholder={t.chatPaymentAmountPlaceholder || 'VD: 500000'}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                    {t.chatPaymentRequestCreatedPaid || 'Sẽ tạo đơn thanh toán với trạng thái Đã thanh toán.'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowChangeStatusModal(false);
                  setChangeStatusAttachReason(false);
                  setChangeStatusReason('');
                  setChangeStatusAmount('');
                  setChangeStatusInterviewDate('');
                  setChangeStatusInterviewTime('');
                }}
                className="px-4 py-2 rounded-lg border text-sm font-medium"
                style={{ borderColor: '#e5e7eb', color: '#374151', backgroundColor: 'white' }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmChangeStatus}
                disabled={changeStatusSubmitting ||
                  (changeStatusAttachReason && !changeStatusReason.trim()) ||
                  (changeStatusSelected === STATUS_INTERVIEW_SCHEDULE && (!changeStatusInterviewDate || !changeStatusInterviewTime)) ||
                  (changeStatusSelected === STATUS_PAID && (Number.isNaN(parseFloat(changeStatusAmount)) || parseFloat(changeStatusAmount) < 0))}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#2563eb' }}
              >
                {changeStatusSubmitting ? (t.updating || 'Đang cập nhật...') : (t.updateButton || 'Cập nhật')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Modal */}
      {showInterviewModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-6 w-96" style={{ backgroundColor: 'white' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{t.chatScheduleInterviewTitle}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.chatDate}</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.chatTime}</label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowInterviewModal(false);
                  setInterviewDate('');
                  setInterviewTime('');
                }}
                onMouseEnter={() => setHoveredInterviewModalCancel(true)}
                onMouseLeave={() => setHoveredInterviewModalCancel(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                style={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  backgroundColor: hoveredInterviewModalCancel ? '#f9fafb' : 'transparent'
                }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleScheduleInterview}
                onMouseEnter={() => setHoveredInterviewModalConfirm(true)}
                onMouseLeave={() => setHoveredInterviewModalConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: hoveredInterviewModalConfirm ? '#2563eb' : '#2563eb',
                  color: 'white'
                }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nyusha Modal */}
      {showNyushaModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-6 w-96" style={{ backgroundColor: 'white' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#111827' }}>{t.chatScheduleNyushaTitle}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>{t.nyushaDate}</label>
                <input
                  type="date"
                  value={nyushaDate}
                  onChange={(e) => setNyushaDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowNyushaModal(false);
                  setNyushaDate('');
                }}
                onMouseEnter={() => setHoveredNyushaModalCancel(true)}
                onMouseLeave={() => setHoveredNyushaModalCancel(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
                style={{
                  borderColor: '#d1d5db',
                  color: '#374151',
                  backgroundColor: hoveredNyushaModalCancel ? '#f9fafb' : 'transparent'
                }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleScheduleNyusha}
                onMouseEnter={() => setHoveredNyushaModalConfirm(true)}
                onMouseLeave={() => setHoveredNyushaModalConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: hoveredNyushaModalConfirm ? '#16a34a' : '#16a34a',
                  color: 'white'
                }}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NominationChat;

