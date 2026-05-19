import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiService from '../../services/api';
import {
  ArrowLeft,
  Save,
  X,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Briefcase,
  Building2,
  Edit,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations/translations';

const PaymentRequestDetailContent = ({ variant }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { language } = useLanguage();
  const t = translations[language] || translations.vi;
  const isAdmin = variant === 'admin';
  const basePath = isAdmin ? '/admin' : '/agent';
  const listPath = isAdmin ? 'payments' : 'payment-history';
  const listUrl = `${basePath}/${listPath}`;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    status: '',
    note: '',
    rejectedReason: '',
  });

  const [hoveredBackButton, setHoveredBackButton] = useState(false);
  const [hoveredEditButton, setHoveredEditButton] = useState(false);
  const [hoveredCancelButton, setHoveredCancelButton] = useState(false);
  const [hoveredSaveButton, setHoveredSaveButton] = useState(false);
  const [hoveredCollaboratorLink, setHoveredCollaboratorLink] = useState(false);
  const [hoveredJobApplicationLink, setHoveredJobApplicationLink] = useState(false);
  const [hoveredJobLink, setHoveredJobLink] = useState(false);
  const [hoveredCandidateLink, setHoveredCandidateLink] = useState(false);
  const [hoveredApproveButton, setHoveredApproveButton] = useState(false);
  const [hoveredRejectButton, setHoveredRejectButton] = useState(false);
  const [hoveredMarkAsPaidButton, setHoveredMarkAsPaidButton] = useState(false);

  useEffect(() => {
    if (id) loadPaymentRequest();
  }, [id]);

  const loadPaymentRequest = async () => {
    try {
      setLoading(true);
      const response = isAdmin
        ? await apiService.getAdminPaymentRequestById(id)
        : await apiService.getPaymentRequestById(id);
      const pr = response?.data?.paymentRequest ?? response?.data;
      if (pr) {
        setPaymentRequest(pr);
        setFormData({
          amount: pr.amount || '',
          status: pr.status !== undefined ? String(pr.status) : '',
          note: pr.note || '',
          rejectedReason: pr.rejectedReason || '',
        });
      } else {
        alert(t.paymentRequestNotFound || 'Không tìm thấy đơn yêu cầu thanh toán');
        navigate(listUrl);
      }
    } catch (err) {
      console.error('Error loading payment request:', err);
      alert(t.errorLoadPaymentRequest || 'Lỗi khi tải thông tin đơn yêu cầu thanh toán');
      navigate(listUrl);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updateData = {
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        status: formData.status ? parseInt(formData.status, 10) : undefined,
        note: formData.note || undefined,
        rejectedReason: formData.rejectedReason || undefined,
      };
      Object.keys(updateData).forEach(key => { if (updateData[key] === undefined) delete updateData[key]; });
      const response = await apiService.updateAdminPaymentRequest(id, updateData);
      if (response.success) {
        alert(t.updatePaymentRequestSuccess || 'Cập nhật đơn yêu cầu thanh toán thành công!');
        setIsEditing(false);
        await loadPaymentRequest();
      } else {
        alert(response.message || t.updatePaymentRequestError);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || t.updatePaymentRequestError);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm(t.confirmApprovePayment || 'Bạn có chắc muốn duyệt yêu cầu thanh toán này?')) return;
    try {
      setSaving(true);
      const amount = formData.amount ? parseFloat(formData.amount) : undefined;
      const response = await apiService.approvePaymentRequest(id, formData.note, amount);
      if (response.success) {
        alert(t.approvePaymentSuccess || 'Duyệt yêu cầu thanh toán thành công!');
        await loadPaymentRequest();
      } else {
        alert(response.message || t.approvePaymentError);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || t.approvePaymentError);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!formData.rejectedReason?.trim()) {
      alert(t.pleaseEnterRejectReason || 'Vui lòng nhập lý do từ chối');
      return;
    }
    if (!window.confirm(t.confirmRejectPayment || 'Bạn có chắc muốn từ chối yêu cầu thanh toán này?')) return;
    try {
      setSaving(true);
      const response = await apiService.rejectPaymentRequest(id, formData.rejectedReason.trim(), formData.note);
      if (response.success) {
        alert(t.rejectPaymentSuccess || 'Từ chối yêu cầu thanh toán thành công!');
        await loadPaymentRequest();
      } else {
        alert(response.message || t.rejectPaymentError);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || t.rejectPaymentError);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!window.confirm(t.confirmMarkAsPaid || 'Bạn có chắc muốn đánh dấu đã thanh toán cho yêu cầu này?')) return;
    try {
      setSaving(true);
      const amount = formData.amount ? parseFloat(formData.amount) : undefined;
      const response = await apiService.markPaymentRequestAsPaid(id, formData.note, amount);
      if (response.success) {
        alert(t.markPaidSuccess || 'Đánh dấu đã thanh toán thành công!');
        await loadPaymentRequest();
      } else {
        alert(response.message || t.markPaidError);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || t.markPaidError);
    } finally {
      setSaving(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      0: { label: t.paymentStatusPending || 'Chờ duyệt', style: { backgroundColor: '#fef9c3', color: '#854d0e' }, icon: Clock },
      1: { label: t.paymentStatusApproved || 'Đã duyệt', style: { backgroundColor: '#dbeafe', color: '#1e40af' }, icon: AlertCircle },
      2: { label: t.paymentStatusRejected || 'Đã từ chối', style: { backgroundColor: '#fee2e2', color: '#991b1b' }, icon: XCircle },
      3: { label: t.paymentStatusPaid || 'Đã thanh toán', style: { backgroundColor: '#dcfce7', color: '#166534' }, icon: CheckCircle },
    };
    return statusMap[status] || { label: '—', style: { backgroundColor: '#f3f4f6', color: '#1f2937' }, icon: Clock };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 rounded-full mx-auto mb-3" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
          <p className="text-xs" style={{ color: '#4b5563' }}>{t.loading || 'Đang tải...'}</p>
        </div>
      </div>
    );
  }

  if (!paymentRequest) return null;

  const statusInfo = getStatusLabel(paymentRequest.status);
  const jobApp = paymentRequest.jobApplication;

  return (
    <div className="space-y-3">
      <div className="rounded-lg p-4 border flex items-center justify-between" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(listUrl)} onMouseEnter={() => setHoveredBackButton(true)} onMouseLeave={() => setHoveredBackButton(false)}
            className="p-2 rounded-lg transition-colors" style={{ backgroundColor: hoveredBackButton ? '#f3f4f6' : 'transparent' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: '#4b5563' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: '#111827' }}>{t.paymentRequestDetailTitle || 'Chi tiết đơn yêu cầu thanh toán'}</h1>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>ID: {id}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} onMouseEnter={() => setHoveredEditButton(true)} onMouseLeave={() => setHoveredEditButton(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5" style={{ backgroundColor: hoveredEditButton ? '#1d4ed8' : '#2563eb', color: 'white' }}>
                <Edit className="w-3.5 h-3.5" />{t.edit || 'Chỉnh sửa'}
              </button>
            ) : (
              <>
                <button onClick={() => { setIsEditing(false); setFormData({ amount: paymentRequest.amount || '', status: paymentRequest.status !== undefined ? String(paymentRequest.status) : '', note: paymentRequest.note || '', rejectedReason: paymentRequest.rejectedReason || '' }); }}
                  onMouseEnter={() => setHoveredCancelButton(true)} onMouseLeave={() => setHoveredCancelButton(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5" style={{ backgroundColor: hoveredCancelButton ? '#e5e7eb' : '#f3f4f6', color: '#374151' }}>
                  <X className="w-3.5 h-3.5" />{t.cancel || 'Hủy'}
                </button>
                <button onClick={handleSave} disabled={saving} onMouseEnter={() => !saving && setHoveredSaveButton(true)} onMouseLeave={() => setHoveredSaveButton(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5" style={{ backgroundColor: saving ? '#9ca3af' : (hoveredSaveButton ? '#1d4ed8' : '#2563eb'), color: 'white', opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  <Save className="w-3.5 h-3.5" />{saving ? (t.saving || 'Đang lưu...') : (t.saveChanges || 'Lưu thay đổi')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-3">
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
              <DollarSign className="w-4 h-4" style={{ color: '#2563eb' }} />{t.paymentRequestInfoBlock || 'Thông tin đơn yêu cầu'}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>{t.amountLabel || 'Số tiền'} {isAdmin && <span style={{ color: '#ef4444' }}>*</span>}</label>
                  {isAdmin && isEditing ? (
                    <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} placeholder="VD: 500000" min="0" step="0.01"
                      className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: '#d1d5db', outline: 'none' }} />
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#111827' }}>
                      <DollarSign className="w-4 h-4" style={{ color: '#16a34a' }} />
                      {paymentRequest.amount ? parseFloat(paymentRequest.amount).toLocaleString('vi-VN') : '0'}đ
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>{t.statusLabel || 'Trạng thái'}</label>
                  {isAdmin && isEditing ? (
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: '#d1d5db', outline: 'none' }}>
                      <option value="0">{t.paymentStatusPending || 'Chờ duyệt'}</option>
                      <option value="1">{t.paymentStatusApproved || 'Đã duyệt'}</option>
                      <option value="2">{t.paymentStatusRejected || 'Đã từ chối'}</option>
                      <option value="3">{t.paymentStatusPaid || 'Đã thanh toán'}</option>
                    </select>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold" style={statusInfo.style}>
                      {React.createElement(statusInfo.icon, { className: 'w-3.5 h-3.5' })}{statusInfo.label}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>{t.notesLabel || 'Ghi chú'}</label>
                {isAdmin && isEditing ? (
                  <textarea name="note" value={formData.note} onChange={handleInputChange} placeholder={t.placeholderNote || 'Nhập ghi chú...'} rows="3"
                    className="w-full px-3 py-2 border rounded-lg text-xs resize-none" style={{ borderColor: '#d1d5db', outline: 'none' }} />
                ) : (
                  <p className="text-xs p-3 rounded-lg min-h-[60px]" style={{ color: '#374151', backgroundColor: '#f9fafb' }}>{paymentRequest.note || '—'}</p>
                )}
              </div>
              {paymentRequest.status === 2 && (
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: '#111827' }}>{t.rejectReasonLabel || 'Lý do từ chối'}</label>
                  {isAdmin && isEditing ? (
                    <textarea name="rejectedReason" value={formData.rejectedReason} onChange={handleInputChange} placeholder={t.placeholderRejectReason} rows="2"
                      className="w-full px-3 py-2 border rounded-lg text-xs resize-none" style={{ borderColor: '#d1d5db', outline: 'none' }} />
                  ) : (
                    <p className="text-xs p-3 rounded-lg" style={{ color: '#b91c1c', backgroundColor: '#fef2f2' }}>{paymentRequest.rejectedReason || '—'}</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: '#e5e7eb' }}>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.requestDate || 'Ngày yêu cầu'}</label>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#374151' }}><Calendar className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />{paymentRequest.createdAt ? new Date(paymentRequest.createdAt).toLocaleDateString('vi-VN') : '—'}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.approvedDate || 'Ngày duyệt'}</label>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#374151' }}><Calendar className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />{paymentRequest.approvedAt ? new Date(paymentRequest.approvedAt).toLocaleDateString('vi-VN') : '—'}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.paidDate || 'Ngày thanh toán'}</label>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#374151' }}><Calendar className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />{paymentRequest.status === 3 && paymentRequest.updatedAt ? new Date(paymentRequest.updatedAt).toLocaleDateString('vi-VN') : '—'}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.lastUpdated || 'Cập nhật lần cuối'}</label>
                  <div className="flex items-center gap-1 text-xs" style={{ color: '#374151' }}><Clock className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />{paymentRequest.updatedAt ? new Date(paymentRequest.updatedAt).toLocaleDateString('vi-VN') : '—'}</div>
                </div>
              </div>
            </div>
          </div>

          {isAdmin && paymentRequest.collaborator && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <User className="w-4 h-4" style={{ color: '#2563eb' }} />{t.collaboratorSectionTitle || 'Thông tin CTV'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.collaboratorName || 'Tên CTV'}</label>
                  <button onClick={() => navigate(`${basePath}/collaborators/${paymentRequest.collaboratorId}`)} onMouseEnter={() => setHoveredCollaboratorLink(true)} onMouseLeave={() => setHoveredCollaboratorLink(false)}
                    className="text-xs font-semibold flex items-center gap-1" style={{ color: hoveredCollaboratorLink ? '#1e40af' : '#2563eb' }}>
                    <User className="w-3.5 h-3.5" />{paymentRequest.collaborator.name || '—'}
                  </button>
                  <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>ID: {paymentRequest.collaboratorId}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {jobApp && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>
                <Briefcase className="w-4 h-4" style={{ color: '#2563eb' }} />{t.jobApplicationInfo || 'Thông tin đơn ứng tuyển'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.nominationId || 'ID đơn ứng tuyển'}</label>
                  <button onClick={() => navigate(`${basePath}/nominations/${paymentRequest.jobApplicationId}`)} onMouseEnter={() => setHoveredJobApplicationLink(true)} onMouseLeave={() => setHoveredJobApplicationLink(false)}
                    className="text-xs font-semibold" style={{ color: hoveredJobApplicationLink ? '#1e40af' : '#2563eb' }}>{paymentRequest.jobApplicationId}</button>
                </div>
                {jobApp.job && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.jobInfo || 'Công việc'}</label>
                    <button onClick={() => navigate(`${basePath}/jobs/${jobApp.jobId}`)} onMouseEnter={() => setHoveredJobLink(true)} onMouseLeave={() => setHoveredJobLink(false)}
                      className="text-xs font-semibold flex items-center gap-1" style={{ color: hoveredJobLink ? '#2563eb' : '#111827' }}>
                      <Briefcase className="w-3.5 h-3.5" />{jobApp.job.title || '—'}
                    </button>
                  </div>
                )}
                {jobApp.job?.company && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.company}</label>
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#374151' }}><Building2 className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />{jobApp.job.company.name || '—'}</div>
                  </div>
                )}
                {jobApp.cv && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b7280' }}>{t.candidateInfo || 'Ứng viên'}</label>
                    <button onClick={() => navigate(`${basePath}/candidates/${jobApp.cvId || jobApp.cv?.id}`)} onMouseEnter={() => setHoveredCandidateLink(true)} onMouseLeave={() => setHoveredCandidateLink(false)}
                      className="text-xs font-semibold" style={{ color: hoveredCandidateLink ? '#2563eb' : '#111827' }}>{jobApp.cv.name || jobApp.cv.fullName || '—'}</button>
                    {jobApp.cv.code && <p className="text-[10px] mt-1" style={{ color: '#6b7280' }}>Mã CV: {jobApp.cv.code}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {isAdmin && !isEditing && (
            <div className="rounded-lg p-4 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <h2 className="text-sm font-bold mb-4 pb-3 border-b" style={{ color: '#111827', borderColor: '#e5e7eb' }}>{t.actions || 'Thao tác'}</h2>
              <p className="text-xs mb-3" style={{ color: '#6b7280' }}>{t.paymentAmountNote || 'Số tiền không được tính tự động. Vui lòng nhập số tiền cần thanh toán trước khi duyệt hoặc đánh dấu đã thanh toán.'}</p>
              {(paymentRequest.status === 0 || paymentRequest.status === 1) && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#111827' }}>{t.amountToPayLabel || 'Số tiền cần thanh toán (VNĐ)'}</label>
                  <input type="number" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} placeholder="VD: 500000" min="0" step="1"
                    className="w-full px-3 py-2 border rounded-lg text-xs" style={{ borderColor: '#d1d5db', outline: 'none' }} />
                </div>
              )}
              <div className="space-y-2">
                {paymentRequest.status === 0 && (
                  <>
                    <button onClick={handleApprove} disabled={saving} onMouseEnter={() => !saving && setHoveredApproveButton(true)} onMouseLeave={() => setHoveredApproveButton(false)}
                      className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: saving ? '#9ca3af' : (hoveredApproveButton ? '#15803d' : '#16a34a'), color: 'white', opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      <CheckCircle className="w-3.5 h-3.5" />{t.approveButton || 'Duyệt yêu cầu'}
                    </button>
                    <button onClick={handleReject} disabled={saving} onMouseEnter={() => !saving && setHoveredRejectButton(true)} onMouseLeave={() => setHoveredRejectButton(false)}
                      className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: saving ? '#9ca3af' : (hoveredRejectButton ? '#b91c1c' : '#dc2626'), color: 'white', opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      <XCircle className="w-3.5 h-3.5" />{t.rejectButton || 'Từ chối yêu cầu'}
                    </button>
                  </>
                )}
                {paymentRequest.status === 1 && (
                  <button onClick={handleMarkAsPaid} disabled={saving} onMouseEnter={() => !saving && setHoveredMarkAsPaidButton(true)} onMouseLeave={() => setHoveredMarkAsPaidButton(false)}
                    className="w-full px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2" style={{ backgroundColor: saving ? '#9ca3af' : (hoveredMarkAsPaidButton ? '#15803d' : '#16a34a'), color: 'white', opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    <DollarSign className="w-3.5 h-3.5" />{t.markAsPaidButton || 'Đánh dấu đã thanh toán'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentRequestDetailContent;
