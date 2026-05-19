import React from 'react';
import ResizableCvTable from './ResizableCvTable';
import { cvLayoutKey } from './cvLayoutKey';
import { SupplementTplText } from './CvTemplateSupplementText.jsx';
import { formatCvYearMonthJa, parseYearMonthFlexible } from '../../utils/cvJpDateDisplay.js';

const DEFAULT_CERT_COL_PERCENTS = [12, 8, 8, 8, 8, 8, 48];

/**
 * Bảng 保有資格・免許等 (IT + Technical).
 * Chỉ hiển thị 4 nhóm mặc định: JLPT / TOEIC / IELTS / GPL.
 */
export default function CvTemplateItTechnicalCertTable({
  tplPrefix,
  cvTpl,
  formData,
  setFormData,
  supplementMarking,
  colSaved,
  onCvTableLayoutCommit,
}) {
  const fixedCertYearMonth = (kind) => {
    if (kind === 'jlpt') return formatCvYearMonthJa(formData.jlptAcquiredYear, formData.jlptAcquiredMonth);
    if (kind === 'toeic') return formatCvYearMonthJa(formData.toeicYear, formData.toeicMonth);
    if (kind === 'ielts') return formatCvYearMonthJa(formData.ieltsYear, formData.ieltsMonth);
    if (kind === 'driving') return formatCvYearMonthJa(formData.drivingLicenseYear, formData.drivingLicenseMonth);
    return '';
  };

  const onFixedCertYearMonthBlur = (kind, rawText) => {
    const { year, month } = parseYearMonthFlexible(rawText);
    setFormData((prev) => {
      if (kind === 'jlpt') return { ...prev, jlptAcquiredYear: year, jlptAcquiredMonth: month };
      if (kind === 'toeic') return { ...prev, toeicYear: year, toeicMonth: month };
      if (kind === 'ielts') return { ...prev, ieltsYear: year, ieltsMonth: month };
      if (kind === 'driving') return { ...prev, drivingLicenseYear: year, drivingLicenseMonth: month };
      return prev;
    });
  };

  const FixedYmCell = ({ kind, formFieldKey }) => (
    <td className="border p-1.5 bg-white text-center text-xs" style={{ borderColor: '#1f2937' }}>
      <span
        contentEditable
        suppressContentEditableWarning
        className="outline-none min-h-[1.2em] block select-text"
        onBlur={(e) => onFixedCertYearMonthBlur(kind, e.currentTarget.textContent || '')}
        onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, formFieldKey)}
      >
        {fixedCertYearMonth(kind) || '　年　月'}
      </span>
    </td>
  );

  return (
    <ResizableCvTable
      className="w-full border-collapse mt-3 font-bold"
      style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
      colPercents={colSaved('rirekisho', 'certificates', DEFAULT_CERT_COL_PERCENTS)}
      layoutKey={cvLayoutKey(cvTpl, 'rirekisho', 'certificates')}
      onLayoutCommit={onCvTableLayoutCommit}
    >
      <tbody>
        <tr>
          <td
            rowSpan={5}
            className="border p-2 text-center align-middle"
            style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem' }}
          >
            <SupplementTplText
              fieldKey={`tpl-${tplPrefix}-cert-title`}
              text="保有資格・免許等"
              supplementMarking={supplementMarking}
              linkedFieldKeys={['addCandidate-certificates', 'jlptLevel', 'toeicScore', 'ieltsScore', 'hasDrivingLicense']}
            />
          </td>
          <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '6rem', minWidth: '6rem' }} />
          <td colSpan={4} className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
            <SupplementTplText fieldKey={`tpl-${tplPrefix}-cert-h-name`} text="名称" supplementMarking={supplementMarking} className="select-text inline" />
          </td>
          <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
            <SupplementTplText fieldKey={`tpl-${tplPrefix}-cert-h-ym`} text="取得年月" supplementMarking={supplementMarking} className="select-text inline" />
          </td>
        </tr>
        <tr>
          <td className="border p-1.5 text-center align-middle bg-white" style={{ borderColor: '#1f2937', width: '6rem', minWidth: '6rem' }}>
            <SupplementTplText fieldKey={`tpl-${tplPrefix}-cert-row-jlpt`} text="日本語検定" supplementMarking={supplementMarking} linkedFieldKeys={['jlptLevel']} className="select-text inline" />
          </td>
          <td colSpan={4} className="border p-1 bg-white" style={{ borderColor: '#1f2937' }}>
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-1">
              {['N1', 'N2', 'N3', 'N4'].map((n) => (
                <label key={n} className="flex items-center justify-center gap-0.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={(formData.jlptLevel ?? '') === n || (formData.jlptLevel ?? '') === n.replace('N', '')}
                    onChange={() => setFormData((prev) => ({ ...prev, jlptLevel: n }))}
                  />
                  {n}
                </label>
              ))}
            </div>
          </td>
          <FixedYmCell kind="jlpt" formFieldKey="jlptAcquiredYear" />
        </tr>
        <tr>
          <td rowSpan={2} className="border p-1.5 text-center align-middle bg-white" style={{ borderColor: '#1f2937', width: '6rem', minWidth: '6rem' }}>
            <SupplementTplText fieldKey={`tpl-${tplPrefix}-cert-row-en`} text="英語" supplementMarking={supplementMarking} linkedFieldKeys={['toeicScore', 'ieltsScore']} className="select-text inline" />
          </td>
          <td colSpan={4} className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>
            <span
              contentEditable
              suppressContentEditableWarning
              className="outline-none min-h-[1.2em] block"
              onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, 'toeicScore')}
              onBlur={(e) => {
                const m = (e.currentTarget.textContent || '').match(/(\d+)/);
                setFormData((prev) => ({ ...prev, toeicScore: m ? m[1] : '' }));
              }}
            >
              TOEIC ({(formData.toeicScore || '').trim() || '　　　'}点)
            </span>
          </td>
          <FixedYmCell kind="toeic" formFieldKey="toeicYear" />
        </tr>
        <tr>
          <td colSpan={4} className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>
            <span
              contentEditable
              suppressContentEditableWarning
              className="outline-none min-h-[1.2em] block"
              onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, 'ieltsScore')}
              onBlur={(e) => {
                const m = (e.currentTarget.textContent || '').match(/(\d+\.?\d*)/);
                setFormData((prev) => ({ ...prev, ieltsScore: m ? m[1] : '' }));
              }}
            >
              IELTS ({(formData.ieltsScore || '').trim() || '　　　'}点)
            </span>
          </td>
          <FixedYmCell kind="ielts" formFieldKey="ieltsYear" />
        </tr>
        <tr>
          <td className="border p-1.5 text-center align-middle bg-white" style={{ borderColor: '#1f2937', width: '6rem', minWidth: '6rem' }}>
            <SupplementTplText
              fieldKey={`tpl-${tplPrefix}-cert-row-drive`}
              text="自動車免許"
              supplementMarking={supplementMarking}
              linkedFieldKeys={['hasDrivingLicense', 'drivingLicenseYear']}
              className="select-text inline"
            />
          </td>
          <td colSpan={2} className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>
            <label className="flex items-center justify-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={formData.hasDrivingLicense === '1' || formData.hasDrivingLicense === '有る'}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    hasDrivingLicense: prev.hasDrivingLicense === '1' || prev.hasDrivingLicense === '有る' ? '' : '1',
                  }))
                }
              />
              有る
            </label>
          </td>
          <td colSpan={2} className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>
            <label className="flex items-center justify-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={formData.hasDrivingLicense === '0' || formData.hasDrivingLicense === '無し'}
                onChange={() =>
                  setFormData((prev) => ({
                    ...prev,
                    hasDrivingLicense: prev.hasDrivingLicense === '0' || prev.hasDrivingLicense === '無し' ? '' : '0',
                  }))
                }
              />
              無し
            </label>
          </td>
          <FixedYmCell kind="driving" formFieldKey="drivingLicenseYear" />
        </tr>
      </tbody>
    </ResizableCvTable>
  );
}
