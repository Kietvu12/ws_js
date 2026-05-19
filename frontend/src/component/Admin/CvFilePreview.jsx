/**
 * Preview CV file: PDF (iframe), DOCX (docx-preview), DOC (mammoth), XLSX (sheet table).
 * DOCX/DOC/XLSX lấy qua API proxy (có auth) để tránh CORS khi file nằm trên S3.
 * Props: viewUrl (string|null), filePath (string), title (string), onDownload (fn), cvStorageId (string|number), fileType (string), getFileContent (optional fn(cvStorageId, fileType) => Promise<ArrayBuffer>) dùng cho Agent thay getAdminCVFileContent
 */
import React, { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { Download, FileText } from 'lucide-react';
import apiService from '../../services/api';

const getExtension = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  const name = filePath.split('/').pop() || filePath;
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
};

export default function CvFilePreview({ viewUrl, filePath, title, onDownload, cvStorageId, fileType, getFileContent }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'pdf' | 'docx' | 'doc' | 'xlsx' | 'unsupported'
  const iframeRef = useRef(null);
  const docxContainerRef = useRef(null);
  const htmlContainerRef = useRef(null);
  const xlsxContainerRef = useRef(null);

  const ext = getExtension(filePath);

  useEffect(() => {
    if (!viewUrl || !ext) {
      setPreviewType(null);
      return;
    }
    if (ext === 'pdf') {
      setPreviewType('pdf');
      setError(null);
      return;
    }
    if (ext === 'docx') {
      setPreviewType('docx');
      setError(null);
      return;
    }
    if (ext === 'doc') {
      setPreviewType('doc');
      setError(null);
      return;
    }
    if (ext === 'xlsx' || ext === 'xls') {
      setPreviewType('xlsx');
      setError(null);
      return;
    }
    setPreviewType('unsupported');
  }, [viewUrl, ext]);

  // Load and render DOCX/DOC/XLSX qua API proxy (có auth) để tránh CORS
  useEffect(() => {
    if (!previewType || previewType === 'pdf' || previewType === 'unsupported') return;
    if (!cvStorageId || !fileType) {
      setError('Thiếu thông tin để tải file');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const fetchContent = getFileContent || apiService.getAdminCVFileContent;
        const arrayBuffer = await fetchContent(cvStorageId, fileType);
        if (cancelled) return;

        if (previewType === 'docx' && docxContainerRef.current) {
          docxContainerRef.current.innerHTML = '';
          await renderAsync(arrayBuffer, docxContainerRef.current);
        } else if (previewType === 'doc' && htmlContainerRef.current) {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          htmlContainerRef.current.innerHTML = result.value;
        } else if ((previewType === 'xlsx' || previewType === 'xls') && xlsxContainerRef.current) {
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const ws = wb.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(ws, { id: 'xlsx-table', editable: false });
          xlsxContainerRef.current.innerHTML = html;
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Không xem trước được');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [cvStorageId, fileType, previewType, getFileContent]);

  if (!filePath && !viewUrl) {
    return (
      <div className="rounded-lg border p-4 flex flex-col items-center justify-center min-h-[200px]" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
        <FileText className="w-10 h-10 mb-2" style={{ color: '#9ca3af' }} />
        <p className="text-sm" style={{ color: '#6b7280' }}>Chưa có file</p>
      </div>
    );
  }

  if (filePath && ext === 'pdf' && !viewUrl) {
    return (
      <div className="rounded-lg border p-4 flex flex-col items-center justify-center min-h-[200px]" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
        <p className="text-sm" style={{ color: '#6b7280' }}>Không lấy được link xem PDF</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden flex flex-col" style={{ borderColor: '#e5e7eb', backgroundColor: 'white' }}>
      <div className="px-3 py-2 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
        <span className="text-xs font-semibold" style={{ color: '#374151' }}>{title}</span>
        {onDownload && (
          <button
            type="button"
            onClick={() => onDownload()}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-gray-200"
            style={{ color: '#374151' }}
          >
            <Download className="w-3.5 h-3.5" />
            Tải xuống
          </button>
        )}
      </div>
      <div className="flex-1 min-h-[280px] overflow-auto p-2" style={{ backgroundColor: '#fff' }}>
        {loading && (
          <div className="flex items-center justify-center min-h-[240px]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent" style={{ borderColor: '#2563eb' }} />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center min-h-[240px]">
            <p className="text-sm text-center" style={{ color: '#dc2626' }}>{error}</p>
            <p className="text-xs mt-2" style={{ color: '#6b7280' }}>Bạn có thể tải xuống để xem file.</p>
          </div>
        )}
        {!loading && !error && previewType === 'pdf' && (
          <iframe
            ref={iframeRef}
            title={title}
            src={viewUrl}
            className="w-full min-h-[400px] rounded border"
            style={{ borderColor: '#e5e7eb', height: '460px' }}
          />
        )}
        {!loading && !error && previewType === 'docx' && (
          <div ref={docxContainerRef} className="docx-preview-container p-4 text-sm" style={{ minHeight: '260px' }} />
        )}
        {!loading && !error && previewType === 'doc' && (
          <div ref={htmlContainerRef} className="mammoth-content p-4 text-sm prose prose-sm max-w-none" style={{ minHeight: '260px' }} />
        )}
        {!loading && !error && previewType === 'xlsx' && (
          <div ref={xlsxContainerRef} className="xlsx-preview overflow-auto p-2 text-xs" style={{ minHeight: '260px' }} />
        )}
        {!loading && !error && previewType === 'unsupported' && (
          <div className="flex flex-col items-center justify-center min-h-[240px] p-4">
            <p className="text-sm" style={{ color: '#6b7280' }}>Trình xem không hỗ trợ loại file này.</p>
            <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>Vui lòng tải xuống để xem.</p>
          </div>
        )}
      </div>
    </div>
  );
}
