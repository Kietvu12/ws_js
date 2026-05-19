import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
 import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import './RichTextEditor.css';
import apiService, { normalizePostImageUrl } from '../../services/api';

const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const fontNames = ['sans-serif', 'raleway', 'montserrat'];

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return true;
  try {
    let Font = null;
    try {
      Font = Quill.import('formats/font');
    } catch (_) {}
    if (!Font) {
      try {
        Font = Quill.import('attributors/style/font');
      } catch (_) {}
    }
    if (Font) {
      Font.whitelist = fontNames;
      Quill.register(Font, true);
      fontsRegistered = true;
      return true;
    }
    const Parchment = Quill.import('parchment');
    if (Parchment && Parchment.Attributor && Parchment.Attributor.Class) {
      const FontClass = new Parchment.Attributor.Class('font', 'ql-font', { whitelist: fontNames });
      Quill.register(FontClass, true);
      fontsRegistered = true;
      return true;
    }
  } catch (_) {}
  return false;
}

export default function RichTextEditor({ value = '', onChange, placeholder, postId, disabled, langKey }) {
  const toolbarRef = useRef(null);
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInternalChange = useRef(false);
  const onChangeRef = useRef(onChange);
  const langKeyRef = useRef(langKey);
  const handlePasteRef = useRef(null);
  const pendingImageInsertRef = useRef(null);
  const lastEmittedHtmlRef = useRef('');

  // Keep in sync with backend default (backend: 10MB if MAX_FILE_SIZE not set).
  // Add small margin because some browsers increase size slightly when encoding.
  const MAX_UPLOAD_BYTES = 9 * 1024 * 1024; // ~9MB
  const MAX_IMAGE_DIM = 1600;
  const DEBUG_RTE = true;
  const debugLog = (...args) => {
    if (!DEBUG_RTE) return;
    console.log('[RichTextEditor]', ...args);
  };

  const compressImageIfNeeded = useCallback(async (file) => {
    if (!file) return file;
    if (file.size <= MAX_UPLOAD_BYTES) return file;
    debugLog('compress:start', {
      name: file.name,
      type: file.type,
      size: file.size,
      maxBytes: MAX_UPLOAD_BYTES,
    });

    const rawMime = String(file?.type || '');
    const ext = rawMime.includes('png') ? 'png' : 'jpg';

    // Resize + encode as JPEG to reduce size reliably.
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Read file failed'));
      reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('Load image failed'));
      im.src = dataUrl;
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(srcW, srcH));

    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, dstW, dstH);

    const baseName = String(file?.name || 'pasted-image').replace(/\.[^/.]+$/, '').trim() || 'pasted-image';
    const targetName = `${baseName}.jpg`;

    const qualities = [0.85, 0.75, 0.65, 0.55, 0.45];
    let bestFile = null;

    for (const q of qualities) {
      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          'image/jpeg',
          q
        );
      });
      if (!blob) continue;
      const candidate = new File([blob], targetName, { type: 'image/jpeg' });
      bestFile = candidate;
      debugLog('compress:attempt', { quality: q, size: candidate.size, name: candidate.name, type: candidate.type });
      if (candidate.size <= MAX_UPLOAD_BYTES) return candidate;
    }

    // If still too big, return the best compressed one.
    if (bestFile) {
      debugLog('compress:best-effort', { size: bestFile.size, name: bestFile.name, type: bestFile.type });
    }
    return bestFile || file;
  }, []);

  // Keep a stable Quill listener while still calling the latest `onChange` from parent.
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useLayoutEffect(() => {
    langKeyRef.current = langKey;
  }, [langKey]);

  // Stable text-change handler (so we can temporarily unbind it during value sync).
  const handleTextChange = useCallback((delta, oldDelta, source) => {
    const q = quillRef.current;
    if (!q) return;
    // Propagate changes unless we're syncing internal HTML (paste/dangerouslyPasteHTML).
    // Quill may report non-'user' sources for IME composition (Vietnamese typing); blocking
    // them causes the parent state to miss content and get overwritten on language remount.
    if (isInternalChange.current) return;
    const html = q.root.innerHTML;
    const normalizedHtml = html === '<p><br></p>' ? '' : html;
    lastEmittedHtmlRef.current = normalizedHtml;
    onChangeRef.current?.(langKeyRef.current, normalizedHtml);
  }, []);

  const uploadImage = useCallback(
    async (file) => {
      if (!file) return null;
      debugLog('upload:start', {
        source: 'editor',
        postId: postId || null,
        langKey: langKeyRef.current,
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const rawMime = String(file?.type || '');
      const isImageLike = !rawMime || rawMime.startsWith('image/');
      if (!isImageLike) {
        debugLog('upload:reject-non-image', { rawMime });
        alert('Chỉ cho phép ảnh.');
        return null;
      }

      const compressed = await compressImageIfNeeded(file);
      debugLog('upload:after-compress', {
        name: compressed?.name,
        type: compressed?.type,
        size: compressed?.size,
      });

      // Normalize clipboard mime to types backend accepts (multer fileFilter checks exact mimetype strings).
      const normalized = (() => {
        const mime = String(compressed?.type || rawMime || '');
        const m = mime.toLowerCase();
        if (!m) return { mime: 'image/jpeg', ext: 'jpg' };
        if (m.includes('png')) return { mime: 'image/png', ext: 'png' };
        if (m.includes('jpeg') || m.includes('jpg') || m.includes('pjpeg')) return { mime: 'image/jpeg', ext: 'jpg' };
        if (m.includes('webp')) return { mime: 'image/webp', ext: 'webp' };
        if (m.includes('gif')) return { mime: 'image/gif', ext: 'gif' };
        return null;
      })();

      // If we can't map it to an allowed backend mimetype, don't try to upload blindly.
      if (!normalized) {
        debugLog('upload:normalize-failed', { rawMime, compressedType: compressed?.type });
        // Still allow exact match for safety.
        if (rawMime && imageTypes.includes(rawMime)) {
          const ext = rawMime.split('/')?.[1] || 'png';
          const baseName = String(file?.name || 'pasted-image')
            .replace(/\.[^/.]+$/, '')
            .trim();
          const uploadName = `${baseName}.${ext}`;
          const normalizedFile = new File([file], uploadName, { type: rawMime });
          debugLog('upload:fallback-raw-mime', {
            uploadName,
            uploadType: normalizedFile.type,
            uploadSize: normalizedFile.size,
          });
          try {
            const res = postId
              ? await apiService.uploadPostImage(postId, normalizedFile)
              : await apiService.uploadPostTempImage(normalizedFile);
            debugLog('upload:response-fallback', res);
            if (res?.success) {
              const data = res?.data || {};
              const directUrl = data?.url || data?.imageUrl;
              if (directUrl) {
                const s = String(directUrl);
                debugLog('upload:url-direct-fallback', { raw: s, normalized: /^https?:\/\//i.test(s) ? s : normalizePostImageUrl(s) });
                return /^https?:\/\//i.test(s) ? s : normalizePostImageUrl(s);
              }

              const keyOrPath =
                data?.key ||
                data?.path ||
                data?.imageKey ||
                data?.imagePath ||
                data?.fileKey ||
                data?.filePath;
              if (keyOrPath) return normalizePostImageUrl(String(keyOrPath));
            }
          } catch (err) {
            console.error('Upload image error:', err);
            debugLog('upload:error-fallback', { message: err?.message, err });
            alert('Lỗi upload ảnh: ' + (err.message || ''));
          }
          return null;
        }
        alert('Chỉ cho phép ảnh: JPG, PNG, GIF, WEBP');
        return null;
      }

      const baseName = String(compressed?.name || file?.name || 'pasted-image')
        .replace(/\.[^/.]+$/, '')
        .trim();
      const uploadName = `${baseName}.${normalized.ext}`;
      const normalizedFile = normalized.mime
        ? new File([compressed], uploadName, { type: normalized.mime })
        : compressed;
      debugLog('upload:prepared-file', {
        uploadName: normalizedFile?.name,
        uploadType: normalizedFile?.type,
        uploadSize: normalizedFile?.size,
      });
      try {
        const res = postId
          ? await apiService.uploadPostImage(postId, normalizedFile)
          : await apiService.uploadPostTempImage(normalizedFile);
        debugLog('upload:response', res);
        if (res?.success) {
          const data = res?.data || {};
          // Back-end có thể trả `url` (full URL) hoặc `key` (giống thumbnail).
          // Nếu thiếu `url` thì quy đổi từ `key` sang URL bằng `normalizePostImageUrl`.
          const directUrl = data?.url || data?.imageUrl;
          if (directUrl) {
            const s = String(directUrl);
            debugLog('upload:url-direct', { raw: s, normalized: /^https?:\/\//i.test(s) ? s : normalizePostImageUrl(s) });
            return /^https?:\/\//i.test(s) ? s : normalizePostImageUrl(s);
          }

          const keyOrPath =
            data?.key ||
            data?.path ||
            data?.imageKey ||
            data?.imagePath ||
            data?.fileKey ||
            data?.filePath;
          if (keyOrPath) {
            const normalizedUrl = normalizePostImageUrl(String(keyOrPath));
            debugLog('upload:url-from-key', { keyOrPath, normalizedUrl });
            return normalizedUrl;
          }
        }
      } catch (err) {
        console.error('Upload image error:', err);
        debugLog('upload:error', { message: err?.message, err });
        alert('Lỗi upload ảnh: ' + (err.message || ''));
      }
      debugLog('upload:return-null');
      return null;
    },
    [postId]
  );

  const insertImage = useCallback((url, attempt = 0) => {
    const q = quillRef.current;
    if (!q) {
      debugLog('insert:quill-missing', { url, attempt });
      // Retry a few times because upload is async and editor can be remounting.
      if (attempt < 8) {
        setTimeout(() => insertImage(url, attempt + 1), 80);
      } else {
        pendingImageInsertRef.current = url;
        debugLog('insert:queued-pending', { url });
      }
      return;
    }
    const range = q.getSelection(true) || { index: q.getLength() };
    debugLog('insert:image', { url, rangeIndex: range.index, currentLength: q.getLength(), attempt });
    q.insertEmbed(range.index, 'image', url, 'user');
    q.setSelection(range.index + 1);

    // Force-sync content after image embed. In some timing windows (tab switch/remount),
    // Quill text-change can be skipped by internal guard and parent value would overwrite.
    requestAnimationFrame(() => {
      const html = q.root?.innerHTML || '';
      const normalizedHtml = html === '<p><br></p>' ? '' : html;
      debugLog('insert:sync-html', { htmlPreview: html.slice(0, 220), hasImg: html.includes('<img') });
      lastEmittedHtmlRef.current = normalizedHtml;
      onChangeRef.current?.(langKeyRef.current, normalizedHtml);
    });
  }, []);

  const handleImageSelect = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      debugLog('select:file', { name: file.name, type: file.type, size: file.size });
      const url = await uploadImage(file);
      if (url) {
        debugLog('select:insert-uploaded-url', { url });
        insertImage(url);
      } else {
        const blobUrl = URL.createObjectURL(file);
        debugLog('select:insert-blob-fallback', { blobUrl });
        insertImage(blobUrl);
      }
    };
    input.click();
  }, [uploadImage, insertImage]);

  useEffect(() => {
    if (!toolbarRef.current || !containerRef.current) return;
    // Always start from a clean container on each mount/remount.
    // The previous "skip if .ql-editor exists" can accidentally skip initialization
    // after language-tab remounts (especially in dev/StrictMode), causing paste handlers
    // to not be attached.
    if (toolbarRef.current) toolbarRef.current.innerHTML = '';
    if (containerRef.current) containerRef.current.innerHTML = '';

    registerFonts();
    const toolbarRows = [
      [{ font: fontNames }],
      [{ align: [] }],
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }, { background: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'link', 'image', 'clean'],
    ];

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung...',
      readOnly: disabled,
      modules: {
        toolbar: {
          container: toolbarRows,
          handlers: {
            image: handleImageSelect,
          },
        },
        clipboard: { matchVisual: false },
      },
    });

    quillRef.current = quill;
    if (pendingImageInsertRef.current) {
      const pendingUrl = pendingImageInsertRef.current;
      pendingImageInsertRef.current = null;
      debugLog('insert:flush-pending', { pendingUrl });
      setTimeout(() => insertImage(pendingUrl, 0), 0);
    }

    // Ensure paste images work reliably even when Quill stops propagation.
    const nativePasteHandler = (ev) => handlePasteRef.current?.(ev);
    if (quill.root?.addEventListener) {
      quill.root.addEventListener('paste', nativePasteHandler);
    }

    // Đưa toolbar ra ngoài container: Quill mặc định chèn toolbar vào đầu containerRef,
    // ta chuyển toolbar vào toolbarRef để chỉ còn 1 toolbar và dễ cleanup
    const toolbarEl = containerRef.current.querySelector('.ql-toolbar');
    if (toolbarEl && toolbarRef.current && !toolbarRef.current.contains(toolbarEl)) {
      toolbarRef.current.appendChild(toolbarEl);
    }

    quill.on('text-change', handleTextChange);

    if (value) {
      isInternalChange.current = true;
      quill.deleteText(0, quill.getLength(), 'silent');
      quill.clipboard.dangerouslyPasteHTML(0, value, 'silent');
      // Keep guard for a couple frames: Quill can emit `text-change`
      // slightly after paste (race condition when switching language tabs).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isInternalChange.current = false;
        });
      });
    }

    return () => {
      quill.off('text-change', handleTextChange);
      quillRef.current = null;
      if (toolbarRef.current) toolbarRef.current.innerHTML = '';
      if (containerRef.current) containerRef.current.innerHTML = '';
      if (quill.root?.removeEventListener) {
        quill.root.removeEventListener('paste', nativePasteHandler);
      }
    };
  }, []);

  useEffect(() => {
    const q = quillRef.current;
    if (!q || isInternalChange.current) return;
    const currentHtml = q.root.innerHTML;
    const normalizedValue = value || '';
    const normalizedCurrent = currentHtml === '<p><br></p>' ? '' : currentHtml;
    // Parent value can lag right after local edits (especially image insert/paste).
    // If editor content is exactly what we just emitted, skip backward overwrite.
    if (
      normalizedCurrent === lastEmittedHtmlRef.current &&
      normalizedValue !== normalizedCurrent
    ) {
      debugLog('sync:skip-parent-lag', {
        valueLen: normalizedValue.length,
        currentLen: normalizedCurrent.length,
      });
      return;
    }
    if (normalizedValue !== normalizedCurrent) {
      isInternalChange.current = true;
      const sel = q.getSelection();
      q.deleteText(0, q.getLength(), 'silent');
      q.clipboard.dangerouslyPasteHTML(0, normalizedValue, 'silent');
      if (sel) q.setSelection(sel);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isInternalChange.current = false;
        });
      });
    }
  }, [value]);

  useEffect(() => {
    const q = quillRef.current;
    if (q) q.enable(!disabled);
  }, [disabled]);

  const handlePaste = useCallback(
    (e) => {
      const clipboardData = e?.clipboardData || e?.nativeEvent?.clipboardData;
      if (!clipboardData) return;
      debugLog('paste:event', {
        hasFiles: Boolean(clipboardData.files?.length),
        fileCount: clipboardData.files?.length || 0,
        itemCount: clipboardData.items?.length || 0,
      });

      // Prefer clipboardData.files when available (some browsers)
      const fileList = clipboardData.files;
      if (fileList && fileList.length) {
        const imageFiles = Array.from(fileList).filter((f) => (f?.type || '').startsWith('image/'));
        const file = imageFiles[0];
        if (file) {
          debugLog('paste:using-files', { name: file.name, type: file.type, size: file.size });
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();

          uploadImage(file).then((url) => {
            if (url) {
              debugLog('paste:insert-uploaded-url', { url });
              insertImage(url);
            } else if (file) {
              const blobUrl = URL.createObjectURL(file);
              debugLog('paste:insert-blob-fallback', { blobUrl });
              insertImage(blobUrl);
            }
          });
          return;
        }
      }

      // Fallback: clipboardData.items
      const items = clipboardData.items;
      if (!items) return;
      for (const item of items) {
        const itemType = item?.type || '';
        const file = item.getAsFile?.();
        if (!file) continue;
        debugLog('paste:item', { itemType, fileType: file.type, fileSize: file.size, fileName: file.name });

        const mime = file.type || itemType || '';
        if (!mime.startsWith('image/') && !mime.includes('image')) continue;

        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();

        const safeType = file.type || itemType || 'image/png';
        const ext = safeType === 'image/jpeg' ? 'jpg' : (safeType.split('/')?.[1] || 'png');
        const uploadFile = file.name
          ? file
          : new File([file], `pasted-image-${Date.now()}.${ext}`, { type: safeType });

        uploadImage(uploadFile).then((url) => {
          if (url) {
            debugLog('paste:insert-uploaded-url-from-items', { url });
            insertImage(url);
          } else {
            const blobUrl = URL.createObjectURL(uploadFile);
            debugLog('paste:insert-blob-fallback-from-items', { blobUrl });
            insertImage(blobUrl);
          }
        });
        return;
      }
      debugLog('paste:no-image-found');
    },
    [uploadImage, insertImage]
  );

  useLayoutEffect(() => {
    handlePasteRef.current = handlePaste;
  }, [handlePaste]);

  return (
    <div
      className="rich-editor-wrapper"
      onPasteCapture={handlePaste}
      style={{ minHeight: 480 }}
    >
      <div ref={toolbarRef} className="rich-editor-toolbar" aria-label="Toolbar" />
      <div ref={containerRef} className="rich-editor-quill" />
    </div>
  );
}
