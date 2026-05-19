import React from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import ResizableCvTable from './ResizableCvTable';
import { cvLayoutKey } from './cvLayoutKey';
import { SupplementTplText } from './CvTemplateSupplementText.jsx';
import { CV_LINK } from './cvSupplementLinks.js';
import { SupplementMarkedText, SupplementFieldWrap } from './CandidateDetailSupplementMarks.jsx';
import {
  formatCvYearMonthJa,
  formatShokumuPeriodCell,
  formatShokumuPeriodRangeJa,
  formatCvDocumentHeaderJa,
  formatCvAnyDateJa,
} from '../../utils/cvJpDateDisplay.js';
import { formatJpResidenceStatusForCvTemplate } from '../../utils/jpResidenceStatusDisplay.js';
import CvTemplateItTechnicalCertTable from './CvTemplateItTechnicalCertTable.jsx';

const CV_TPL = 'cv_it';

/**
 * CvTemplateIt – giao diện form CV IT (履歴書 + 職務経歴書).
 * Props:
 *   formData, setFormData
 *   activeTab, setActiveTab
 *   cvEditable, cvEditableBirthDate, cvEditableArray, cvEditableWithDefault
 *   getDefaultCvDate, updateEmployment, updateEmploymentPair, toggleShokumuCheckbox
 *   handleAddWorkExperience, handleAddShokumuTable, handleInsertWorkExperienceAt, handleInsertWorkExperienceBlockAt (bảng 職歴 Rirekisho / 職務経歴 Shokumu)
 *   handleBackendPreviewWithOptions, avatarPreview
 *   supplementMarking (optional admin)
 */
const CvTemplateIt = ({
  formData,
  setFormData,
  activeTab,
  setActiveTab,
  cvEditable: cvEditableRaw,
  cvEditableBirthDate: cvEditableBirthDateRaw,
  cvEditableArray: cvEditableArrayRaw,
  cvEditableWithDefault: cvEditableWithDefaultRaw,
  getDefaultCvDate,
  updateEmployment,
  updateEmploymentPair,
  toggleShokumuCheckbox,
  handleAddWorkExperience,
  handleAddShokumuTable,
  handleInsertWorkExperienceAt,
  handleInsertWorkExperienceBlockAt,
  handleBackendPreviewWithOptions,
  avatarPreview,
  onCvTableLayoutCommit,
  supplementMarking,
}) => {
  const layout = formData.cvTableLayout || {};
  const colSaved = (tab, tableId, fallback) =>
    layout[cvLayoutKey(CV_TPL, tab, tableId)]?.cols ?? fallback;
  const sm = (templateFieldKey, formFieldKey) => ({ templateFieldKey, formFieldKey });
  const cvEditable = (field, className = '', style = {}, supp = null) =>
    cvEditableRaw(field, className, style, supp || sm(`tpl-it-${field}`, field));
  const cvEditableBirthDate = (className = '', style = {}, supp = null) =>
    cvEditableBirthDateRaw(className, style, supp || sm('tpl-it-birthDate', CV_LINK.birthDate));
  const cvEditableWithDefault = (
    field,
    defaultVal,
    className = '',
    style = {},
    displayTransform = (v) => v,
    supp = null
  ) =>
    cvEditableWithDefaultRaw(
      field,
      defaultVal,
      className,
      style,
      displayTransform,
      supp || sm(`tpl-it-${field}-default`, field)
    );
  const cvEditableArray = (
    arrayName,
    index,
    subfield,
    className = '',
    style = {},
    displayValue = undefined,
    supp = null
  ) => {
    const formFieldKey = `${arrayName}-${index}-${subfield}`;
    return cvEditableArrayRaw(
      arrayName,
      index,
      subfield,
      className,
      style,
      displayValue,
      supp || sm(`tpl-it-${formFieldKey}`, formFieldKey)
    );
  };
  const marks = formData.adminSupplementMarks || [];
  const renderMarked = (text, templateFieldKey, formFieldKey, linkedFieldKeys = []) => {
    const linked = [formFieldKey, ...linkedFieldKeys].filter(Boolean);
    if (formFieldKey && !String(formFieldKey).startsWith('label-') && !String(formFieldKey).startsWith('tpl-')) {
      linked.push(`label-${formFieldKey}`);
    }
    const inner = (
      <SupplementMarkedText
        text={String(text ?? '').trim() || '　'}
        fieldKey={templateFieldKey}
        allMarks={marks}
        linkedFieldKeys={[...new Set(linked)]}
      />
    );
    if (supplementMarking?.onFieldContextMenu && formFieldKey) {
      return (
        <SupplementFieldWrap
          fieldKey={formFieldKey}
          onContextMenu={(e) => supplementMarking.onFieldContextMenu(e, formFieldKey)}
          className="select-text inline min-w-0"
        >
          {inner}
        </SupplementFieldWrap>
      );
    }
    return <span className="select-text inline min-w-0">{inner}</span>;
  };
  return (
    <div style={{ fontFamily: '"MS PMincho", "MS Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif' }}>
      {/* Tab buttons */}
      <div className="flex border-b mb-2 -mt-0.5 font-bold" style={{ borderColor: '#e5e7eb' }}>
        <button
          type="button"
          onClick={() => setActiveTab('rirekisho')}
          className="flex items-center gap-1 px-3 py-1 text-xs font-bold transition-colors"
          style={{
            color: activeTab === 'rirekisho' ? '#2563eb' : '#6b7280',
            borderBottom: activeTab === 'rirekisho' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          【履歴書】フォーマット
          <ChevronDown className="w-3 h-3" style={{ color: 'inherit' }} />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shokumu')}
          className="flex items-center gap-1 px-3 py-1 text-xs font-bold transition-colors"
          style={{
            color: activeTab === 'shokumu' ? '#2563eb' : '#6b7280',
            borderBottom: activeTab === 'shokumu' ? '2px solid #2563eb' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          【職務経歴書】フォーマット
          <ChevronDown className="w-3 h-3" style={{ color: 'inherit' }} />
        </button>
      </div>

      {/* ===== 履歴書 ===== */}
      {activeTab === 'rirekisho' && (
        <div className="w-full">
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              onClick={() => {
                console.log('[CvTemplateIt] preview click', {
                  template: 'cv_it',
                  tab: 'rirekisho',
                  hasAvatarPreview: Boolean(avatarPreview),
                  avatarPreviewLength: typeof avatarPreview === 'string' ? avatarPreview.length : 0,
                });
                handleBackendPreviewWithOptions('cv_it', 'rirekisho');
              }}
              className="px-3 py-1.5 text-xs font-medium rounded border transition-colors"
              style={{ borderColor: '#d1d5db', color: '#2563eb' }}
            >
              Xem preview 【履歴書】
            </button>
          </div>
          <div className="w-full overflow-x-auto font-bold" style={{ fontSize: '11px', color: '#1f2937' }}>
            {/* Bảng thông tin cá nhân 5 dòng + ảnh */}
            <ResizableCvTable
              colPercents={colSaved('rirekisho', 'personalGrid', [7, 18, 7, 11, 6, 9, 42])}
              className="w-full border-collapse"
              style={{ borderColor: '#1f2937' }}
              layoutKey={cvLayoutKey(CV_TPL, 'rirekisho', 'personalGrid')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td colSpan={7} className="border p-2 text-center font-bold" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-rirekisho-banner" text="履歴書" supplementMarking={supplementMarking} className="select-text inline min-w-0" />
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-16 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-furigana" text="フリガナ" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.nameKana]} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 bg-white min-w-0" style={{ borderColor: '#1f2937' }}><span {...cvEditable('nameKana', '')} /></td>
                  <td className="border p-1 w-14 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-seinengappi" text="生年月日" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.birthDate]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditableBirthDate('', {})} title="YYYY-MM-DD" /></td>
                  <td className="border p-1 w-12 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3rem' }}>
                    <SupplementTplText fieldKey="tpl-it-nenrei" text="年齢" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.age]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-14" style={{ borderColor: '#1f2937', maxWidth: '3.5rem' }}><span {...cvEditable('age', '')} /></td>
                  <td rowSpan={5} className="border p-2 align-middle text-center w-24" style={{ borderColor: '#1f2937', verticalAlign: 'middle' }}>
                    {avatarPreview ? (
                      <div style={{ height: '7.5rem', width: '5.625rem', overflow: 'hidden', margin: '0 auto' }}>
                        <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', aspectRatio: '3/4', display: 'block' }} />
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">&lt;顔写真&gt;</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-16 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-shimei" text="氏名" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.nameKanji]} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 bg-white min-w-0" style={{ borderColor: '#1f2937' }}><span {...cvEditable('nameKanji', '')} /></td>
                  <td className="border p-1 font-medium w-14 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-gender" text="性別" supplementMarking={supplementMarking} linkedFieldKeys={['gender']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" className="rounded" checked={formData.gender === '男'} onChange={() => setFormData(prev => ({ ...prev, gender: '男' }))} /> 男</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer mt-0.5"><input type="checkbox" className="rounded" checked={formData.gender === '女'} onChange={() => setFormData(prev => ({ ...prev, gender: '女' }))} /> 女</label>
                  </td>
                  <td className="border p-1 font-medium w-16 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '4rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-passport" text="パスポート" supplementMarking={supplementMarking} linkedFieldKeys={['passport']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" className="rounded" checked={formData.passport === '有' || formData.passport === '1'} onChange={() => setFormData(prev => ({ ...prev, passport: '有' }))} /> 有</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer mt-0.5"><input type="checkbox" className="rounded" checked={formData.passport === '無' || formData.passport === '0'} onChange={() => setFormData(prev => ({ ...prev, passport: '無' }))} /> 無</label>
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-14 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-email" text="Email" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.email]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white min-w-0" style={{ borderColor: '#1f2937', maxWidth: '6rem' }}><span {...cvEditable('email', '')} /></td>
                  <td className="border p-1 font-medium w-12 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3rem' }}>
                    <SupplementTplText fieldKey="tpl-it-denwa" text="電話" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.phone]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('phone', '')} /></td>
                  <td className="border p-1 font-medium w-16 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '4rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-skypeId" text="Skype ID" supplementMarking={supplementMarking} linkedFieldKeys={['skypeId']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('skypeId', '')} /></td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-14 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-genju" text="現住所" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.postalCode, CV_LINK.address]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white min-w-0 text-center" style={{ borderColor: '#1f2937', maxWidth: '6rem' }}>
                    <span
                      {...cvEditable('address', 'block text-center')}
                      children={undefined}
                    >
                      {renderMarked([
                        formData.postalCode ? `〒${formData.postalCode}` : '',
                        formData.address || ''
                      ].filter(Boolean).join(' ') || '　', 'tpl-it-genju', 'address', ['postalCode'])}
                    </span>
                  </td>
                  <td className="border p-1 font-medium w-14 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-addressOrigin" text="出身地" supplementMarking={supplementMarking} linkedFieldKeys={['addressOrigin']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('addressOrigin', '')} /></td>
                  <td className="border p-1 font-medium w-14 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-hasSpouse" text="配偶者" supplementMarking={supplementMarking} linkedFieldKeys={['hasSpouse']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" className="rounded" checked={formData.hasSpouse === '有'} onChange={() => setFormData(prev => ({ ...prev, hasSpouse: '有' }))} /> 有</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer mt-0.5"><input type="checkbox" className="rounded" checked={formData.hasSpouse === '無'} onChange={() => setFormData(prev => ({ ...prev, hasSpouse: '無' }))} /> 無</label>
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-20 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-stayPurpose" text="日本滞在目的" supplementMarking={supplementMarking} linkedFieldKeys={['label-jpResidenceStatus', 'jpResidenceStatus']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white min-w-0 text-xs" style={{ borderColor: '#1f2937', maxWidth: '12rem' }} colSpan={3}>
                    {formatJpResidenceStatusForCvTemplate(formData.jpResidenceStatus) || '—'}
                  </td>
                  <td className="border p-1 font-medium w-16 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '4rem' }}>
                    <SupplementTplText fieldKey="tpl-it-label-visaExpiry" text="ビザの期限" supplementMarking={supplementMarking} linkedFieldKeys={['visaExpirationDate']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('visaExpirationDate', '')} /></td>
                </tr>
              </tbody>
            </ResizableCvTable>

            {/* Bảng 学歴 */}
            <ResizableCvTable
              className="w-full border-collapse mt-3 font-bold"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('rirekisho', 'education', [12, 20, 18, 18, 18, 14])}
              layoutKey={cvLayoutKey(CV_TPL, 'rirekisho', 'education')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td rowSpan={1 + Math.max(1, (formData.educations || []).length)} className="border p-2 text-center align-middle" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-education-title" text="学歴" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-education', 'education-0-content']} />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-edu-h-school" text="学校名 (英語名)" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-school_name']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-edu-h-major" text="学部・専攻" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-major']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-edu-h-start" text="入学年月" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-year']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-edu-h-end" text="卒業年月" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-endYear']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-edu-h-years" text="年数" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-education']} className="select-text inline" />
                  </td>
                </tr>
                {Array.from({ length: Math.max(1, (formData.educations || []).length) }).map((_, i) => {
                  const edu = formData.educations?.[i] || {};
                  return (
                    <tr key={`gakureki-${i}`}>
                      <td className="border p-1.5 bg-white" style={{ borderColor: '#1f2937' }}><span {...cvEditableArray('educations', i, 'school_name', 'block')} /></td>
                      <td className="border p-1.5 bg-white" style={{ borderColor: '#1f2937' }}><span {...cvEditableArray('educations', i, 'major', 'block')} /></td>
                      <td className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>
                        <span {...cvEditableArray('educations', i, 'year', 'block', {}, formatCvYearMonthJa(edu.year, edu.month))} />
                      </td>
                      <td className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>
                        <span {...cvEditableArray('educations', i, 'endYear', 'block', {}, formatCvYearMonthJa(edu.endYear, edu.endMonth))} />
                      </td>
                      <td className="border p-1.5 bg-white text-center" style={{ borderColor: '#1f2937' }}>　</td>
                    </tr>
                  );
                })}
              </tbody>
            </ResizableCvTable>

            {/* Bảng 外国語の会話レベル */}
            <ResizableCvTable
              className="w-full border-collapse mt-3 font-bold"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('rirekisho', 'languages', [12, 14, 14, 14, 24, 22])}
              layoutKey={cvLayoutKey(CV_TPL, 'rirekisho', 'languages')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td rowSpan={4} className="border p-2 text-center align-middle" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-it-language-title" text="外国語の会話レベル" supplementMarking={supplementMarking} linkedFieldKeys={['jpConversationLevel', 'enConversationLevel', 'otherConversationLevel', 'languageSkillRemarks', 'remarks']} />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-lang-h-jp" text="日本語" supplementMarking={supplementMarking} linkedFieldKeys={['jpConversationLevel']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-lang-h-en" text="英語" supplementMarking={supplementMarking} linkedFieldKeys={['enConversationLevel']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-lang-h-other" text="その他 ( )" supplementMarking={supplementMarking} linkedFieldKeys={['otherConversationLevel']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '10rem' }}>
                    <SupplementTplText fieldKey="tpl-it-lang-h-skill-note" text="言語スキル補足説明" supplementMarking={supplementMarking} linkedFieldKeys={['languageSkillRemarks']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '10rem' }}>
                    <SupplementTplText fieldKey="tpl-it-language-remarks-title" text="備考" supplementMarking={supplementMarking} linkedFieldKeys={['remarks']} />
                  </td>
                </tr>
                {[
                  { value: 'native', label: 'ネイティブ', borderCls: 'border-t border-l border-r' },
                  { value: 'business', label: 'ビジネス', borderCls: 'border-l border-r' },
                  { value: 'daily', label: '日常会話', borderCls: 'border-l border-r border-b' },
                ].map(({ value, label, borderCls }, rowIdx) => (
                  <tr key={value}>
                    {['jpConversationLevel', 'enConversationLevel', 'otherConversationLevel'].map(field => (
                      <td key={field} className={`${borderCls} p-1.5 bg-white`} style={{ borderColor: '#1f2937' }}>
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={formData[field] === value}
                            onChange={() => setFormData(prev => ({ ...prev, [field]: prev[field] === value ? '' : value }))}
                          />
                          ・{label}
                        </label>
                      </td>
                    ))}
                    {rowIdx === 0 && (
                      <>
                        <td rowSpan={3} className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', width: '10rem' }}><span {...cvEditable('languageSkillRemarks', '')} /></td>
                        <td rowSpan={3} className="border p-1.5 bg-white align-middle" style={{ borderColor: '#1f2937', width: '10rem' }}><span {...cvEditable('remarks', '')} /></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </ResizableCvTable>

            <CvTemplateItTechnicalCertTable
              tplPrefix="it"
              cvTpl={CV_TPL}
              formData={formData}
              setFormData={setFormData}
              cvEditableArray={cvEditableArray}
              renderMarked={renderMarked}
              supplementMarking={supplementMarking}
              colSaved={colSaved}
              onCvTableLayoutCommit={onCvTableLayoutCommit}
            />

            {/* Bảng 職歴 + 自己PR + 応募動機 + 備考 – mặc định 1 hàng, có nút 行を追加 và 挿入 */}
            <ResizableCvTable
              className="w-full border-collapse mt-3 font-bold"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('rirekisho', 'employment', [22, 20, 38, 20])}
              layoutKey={cvLayoutKey(CV_TPL, 'rirekisho', 'employment')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '10rem', maxWidth: '10rem' }}><SupplementTplText fieldKey="tpl-it-rireki-period-h" text="期間" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-period']} /></td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', minWidth: '9rem' }}><SupplementTplText fieldKey="tpl-it-rireki-place-h" text="勤務地" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-place']} /></td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', minWidth: '14rem' }}><SupplementTplText fieldKey="tpl-it-rireki-company-h" text="企業名" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-company']} /></td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '8rem', maxWidth: '8rem' }}><SupplementTplText fieldKey="tpl-it-rireki-role-h" text="ポジション・役割" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-description', 'employment-0-scale']} /></td>
                </tr>
                {(() => {
                  const list = formData.workExperiences || [];
                  const workCount = Math.max(1, formData.workHistoryCount ?? list.length);
                  const cellEditStyle = { outline: 'none', minHeight: '1em', minWidth: '1.5em', display: 'inline-block', cursor: 'text' };
                  return Array.from({ length: workCount }).map((_, i) => {
                    const emp = list[i] || {};
                    const companyDisplay = emp.company_name || '　';
                    const placeDisplay = emp.employmentPlace || emp.employment_place || emp.work_location || emp.location || '　';
                    const periodDisplay = formatShokumuPeriodRangeJa(
                      emp.start_date || [emp.startYear, emp.startMonth].filter(Boolean).join('/'),
                      emp.endCurrent ? '現在' : (emp.end_date || [emp.endYear, emp.endMonth].filter(Boolean).join('/')),
                    ) || emp.period || '　';
                    const roleDisplay = emp.companyRole || emp.company_role || emp.position_role || emp.position_name || emp.position || '　';
                    return (
                      <React.Fragment key={`shokureki-${i}`}>
                        <tr>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', width: '10rem', maxWidth: '10rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-period`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'period', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(periodDisplay, `tpl-it-rireki-${i}-period`, `employment-${i}-period`)}</span>
                          </td>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', minWidth: '9rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-place`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'employmentPlace', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(placeDisplay, `tpl-it-rireki-${i}-place`, `employment-${i}-place`)}</span>
                          </td>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', minWidth: '14rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-company`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'company_name', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(companyDisplay, `tpl-it-rireki-${i}-company`, `employment-${i}-company`)}</span>
                          </td>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', width: '8rem', maxWidth: '8rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-companyRole`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'companyRole', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(roleDisplay, `tpl-it-rireki-${i}-companyRole`, `employment-${i}-companyRole`)}</span>
                          </td>
                        </tr>
                        {i < workCount - 1 && handleInsertWorkExperienceBlockAt && (
                          <tr>
                            <td colSpan={4} className="border p-0.5 text-center" style={{ borderColor: '#e5e7eb', backgroundColor: '#f3f4f6' }}>
                              <button type="button" onClick={() => handleInsertWorkExperienceBlockAt(i + 1)} className="text-xs text-amber-600 hover:text-amber-800">挿入</button>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  });
                })()}
                <tr>
                  <td colSpan={4} className="border p-1 text-center" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
                    {handleAddWorkExperience && (
                      <button type="button" onClick={handleAddWorkExperience} className="text-xs flex items-center justify-center gap-1 mx-auto text-blue-600 hover:text-blue-800">
                        <Plus className="w-3.5 h-3.5" /> 行を追加
                      </button>
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-1.5 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-selfpr-title" text="自己PR (大学での成績順位、頑張ったこと、趣味等)" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-strengths', 'strengths', 'hobbiesSpecialSkills']} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-2 bg-white align-top min-h-[80px]" style={{ borderColor: '#1f2937' }}>
                    <span {...cvEditable('strengths', 'block whitespace-pre-wrap', { minHeight: '80px', whiteSpace: 'pre-wrap' })} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-1.5 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-motivation-title" text="応募動機" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-motivation', 'motivation']} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-2 bg-white align-top" style={{ borderColor: '#1f2937', minHeight: '80px' }}>
                    <span {...cvEditable('motivation', 'block whitespace-pre-wrap', { minHeight: '80px', whiteSpace: 'pre-wrap' }, sm('tpl-it-motivation', 'motivation'))} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-1.5 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-it-note-title" text="備考" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-block6-prefs', 'currentSalary', 'desiredSalary', 'desiredPosition', 'desiredLocation', 'visaExpirationDate']} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-2 bg-white align-top" style={{ borderColor: '#1f2937', fontSize: '10px' }}>
                    <div className="space-y-1">
                      <div>・現年収: {renderMarked(formData.currentSalary || '　', 'tpl-it-currentSalary', 'currentSalary', ['label-currentSalary'])}</div>
                      <div>・希望年収: {renderMarked(formData.desiredSalary || '　', 'tpl-it-desiredSalary', 'desiredSalary', ['label-desiredSalary'])}</div>
                      <div>・希望職種: {renderMarked(formData.desiredPosition || '　', 'tpl-it-desiredPosition', 'desiredPosition', ['label-desiredPosition'])}</div>
                      <div>・希望勤務地: {renderMarked(formData.desiredLocation || '　', 'tpl-it-desiredLocation', 'desiredLocation', ['label-desiredLocation'])}</div>
                      <div>
                        ・在留資格の種類:{' '}
                        {formatJpResidenceStatusForCvTemplate(formData.jpResidenceStatus) || '—'}
                      </div>
                      <div>・在留期間: {renderMarked(formatCvAnyDateJa(formData.visaExpirationDate) || formData.visaExpirationDate || '年月日', 'tpl-it-visaExpirationDate-note', 'visaExpirationDate', ['label-visaExpiry'])}</div>
                      <div>・在留カードに記載の就労制限:「在留資格に基づく就労活動のみ可」</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </ResizableCvTable>
          </div>
        </div>
      )}

      {/* ===== 職務経歴書 (CV IT) ===== */}
      {activeTab === 'shokumu' && (
        <div className="w-full">
          <div className="flex items-center justify-end mb-2">
            <button type="button" onClick={() => {
              console.log('[CvTemplateIt] preview click', {
                template: 'cv_it',
                tab: 'shokumu',
                hasAvatarPreview: Boolean(avatarPreview),
                avatarPreviewLength: typeof avatarPreview === 'string' ? avatarPreview.length : 0,
              });
              handleBackendPreviewWithOptions('cv_it', 'shokumu');
            }}
              className="px-3 py-1.5 text-xs font-medium rounded border transition-colors"
              style={{ borderColor: '#d1d5db', color: '#2563eb' }}>
              Xem preview 【職務経歴書】
            </button>
          </div>
          <div className="rounded border p-4 min-h-[200px]" style={{ borderColor: '#e5e7eb', fontSize: '11px', color: '#1f2937' }}>
            <div className="mb-6">
              <h2 className="text-center font-bold mb-8" style={{ fontSize: '1.25rem' }}>
                <SupplementTplText fieldKey="tpl-it-shokumu-h2" text="職務経歴書" supplementMarking={supplementMarking} />
              </h2>
              <div className="text-right space-y-1">
                <div>現在、<span {...cvEditableWithDefault('cvDocumentDate', getDefaultCvDate(false), 'inline-block min-w-[8em]', {}, (v) => formatCvDocumentHeaderJa(String(v || '').replace(/現在$/, '')))} /></div>
                <div>氏名: <span {...cvEditable('nameKanji', '')} /> (<span {...cvEditable('nameKana', '')} />)</div>
              </div>
            </div>

            {/* 職務要約 */}
            <div className="mt-4 mb-5">
              <ResizableCvTable
                className="w-full border-collapse font-bold"
                style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
                colPercents={colSaved('shokumu', 'summary', [12, 88])}
                layoutKey={cvLayoutKey(CV_TPL, 'shokumu', 'summary')}
                onLayoutCommit={onCvTableLayoutCommit}
              >
                <tbody>
                  <tr>
                    <td className="border p-2 text-center align-middle" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '12%' }}>
                      <SupplementTplText fieldKey="tpl-it-shokumu-summary-title" text="職務要約" supplementMarking={supplementMarking} linkedFieldKeys={['careerSummary']} className="select-text inline" />
                    </td>
                    <td className="border p-3 bg-white align-top" style={{ borderColor: '#1f2937' }}>
                      <div className="whitespace-pre-wrap min-h-[4rem]" {...cvEditable('careerSummary', 'block', { whiteSpace: 'pre-wrap' })} />
                    </td>
                  </tr>
                </tbody>
              </ResizableCvTable>
            </div>

            {/* 職務経歴 – IT: 1 công ty = 1 block trái; mỗi project hiển thị thành 1 hàng chính để tránh vỡ UI. */}
            {(() => {
              const workList = formData.workExperiences || [];
              const cellStyle = { borderWidth: '1px', borderStyle: 'dotted', borderColor: '#9ca3af' };
              const roles = (w) => (Array.isArray(w?.roleCheckboxes) ? w.roleCheckboxes : []);
              const processes = (w) => (Array.isArray(w?.processCheckboxes) ? w.processCheckboxes : []);
              const renderWorkExperience = (w, workIndex) => {
                const roleSet = roles(w);
                const processSet = processes(w);
                const chk = (type, key) => (type === 'role' ? roleSet.includes(key) : processSet.includes(key));
                const onChk = (type, key) => (toggleShokumuCheckbox ? () => toggleShokumuCheckbox(workIndex, type, key) : undefined);
                const projects = Array.isArray(w.projects) && w.projects.length > 0 ? w.projects : [null];
                const companyNameDisplay = w.company_name || '';
                const rowSpan = projects.length;

                return projects.map((project, projectIndex) => {
                  const p = project || {};
                  const projectPeriod = formatShokumuPeriodRangeJa(
                    [p.startYear, p.startMonth].filter(Boolean).join('/'),
                    p.endCurrent ? '現在' : [p.endYear, p.endMonth].filter(Boolean).join('/'),
                  ) || p.period || '20xx 年 xx 月～20xx 年 xx 月';
                  const projectSummary = [
                    p.team_size ? `【チーム人数】${p.team_size}` : '',
                    p.role ? `【役割】${p.role}` : '',
                    projectPeriod ? `【期間】${projectPeriod}` : '',
                    p.description ? `【担当業務】${p.description}` : '',
                    p.tools_tech ? `【開発言語・ツール】${p.tools_tech}` : '',
                  ].filter(Boolean).join('\n');
                  return (
                    <tr key={`work-${workIndex}-project-${projectIndex}`}>
                      {projectIndex === 0 && (
                        <td rowSpan={rowSpan} className="border p-2 align-top bg-white" style={{ borderColor: '#1f2937', width: '18%', verticalAlign: 'top', borderRightStyle: 'solid', borderRightColor: '#1f2937' }}>
                          <div className="text-xs whitespace-pre-wrap" {...cvEditableArray('workExperiences', workIndex, 'company_name', 'text-xs whitespace-pre-wrap', {}, companyNameDisplay || '　')} />
                        </td>
                      )}
                      <td className="p-1.5 align-top bg-white" style={cellStyle}>
                        <div className="text-xs whitespace-pre-wrap">
                          <span className="font-medium">【プロジェクト名】</span>
                          <span {...cvEditableArray('workExperiences', workIndex, 'business_purpose', 'block', {}, p.project_name || w.business_purpose || '　')} />
                          <span className="block mt-1">{projectSummary || '　'}</span>
                        </div>
                      </td>
                      <td className="p-1.5 align-top bg-white" style={cellStyle}>
                        <div className="space-y-1 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('role', 'PM')} onChange={onChk('role', 'PM')} /> ・PM</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('role', 'PL')} onChange={onChk('role', 'PL')} /> ・PL</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('role', 'サブリーダー')} onChange={onChk('role', 'サブリーダー')} /> ・サブリーダー</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('role', 'プログラマー')} onChange={onChk('role', 'プログラマー')} /> ・プログラマー</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('role', 'BrSE')} onChange={onChk('role', 'BrSE')} /> ・BrSE</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('role', 'その他')} onChange={onChk('role', 'その他')} /> ・その他</label>
                        </div>
                      </td>
                      <td className="p-1.5 align-top bg-white" style={cellStyle}>
                        <div className="space-y-1 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '要件定義')} onChange={onChk('process', '要件定義')} /> ・要件定義</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '基本設計')} onChange={onChk('process', '基本設計')} /> ・基本設計</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '詳細設計')} onChange={onChk('process', '詳細設計')} /> ・詳細設計</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '実装・単体')} onChange={onChk('process', '実装・単体')} /> ・実装・単体</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '結合テスト')} onChange={onChk('process', '結合テスト')} /> ・結合テスト</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '総合テスト')} onChange={onChk('process', '総合テスト')} /> ・総合テスト</label>
                          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded" checked={chk('process', '保守・運用')} onChange={onChk('process', '保守・運用')} /> ・保守・運用</label>
                        </div>
                      </td>
                    </tr>
                  );
                });
              };
              return (
                <div className="border" style={{ borderColor: '#1f2937' }}>
                  <div className="p-2 text-center font-bold" style={{ backgroundColor: '#e2efd9', color: '#1f2937' }}>
                    <SupplementTplText fieldKey="tpl-it-shokumu-work-banner" text="職務経歴" supplementMarking={supplementMarking} linkedFieldKeys={['workExperiences-0-company_name']} className="select-text inline" />
                  </div>
                  <ResizableCvTable className="w-full border-collapse font-bold" style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }} colPercents={colSaved('shokumu', 'workGrid:0', [16, 35, 24, 25])} layoutKey={cvLayoutKey(CV_TPL, 'shokumu', 'workGrid:0')} onLayoutCommit={onCvTableLayoutCommit}>
                    <thead>
                      <tr>
                        <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', borderBottomStyle: 'solid', borderBottomColor: '#1f2937', backgroundColor: '#e2efd9' }}><SupplementTplText fieldKey="tpl-it-shokumu-workplace-h" text="勤務地" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-company']} /></td>
                        <td className="border p-1.5 text-center font-medium" style={{ borderStyle: 'dotted', borderColor: '#9ca3af', borderTopStyle: 'solid', borderBottomStyle: 'solid', borderTopColor: '#1f2937', borderBottomColor: '#1f2937', backgroundColor: '#e2efd9', minWidth: '35%' }}><SupplementTplText fieldKey="tpl-it-shokumu-h-desc" text="業務内容 (具体的、詳細に記入)" supplementMarking={supplementMarking} linkedFieldKeys={['workExperiences-0-description']} className="select-text inline" /></td>
                        <td className="border p-1.5 text-center font-medium" style={{ borderStyle: 'dotted', borderColor: '#9ca3af', borderTopStyle: 'solid', borderBottomStyle: 'solid', borderTopColor: '#1f2937', borderBottomColor: '#1f2937', backgroundColor: '#e2efd9', width: '22%' }}><SupplementTplText fieldKey="tpl-it-shokumu-h-role" text="役割・担当業務" supplementMarking={supplementMarking} linkedFieldKeys={['workExperiences-0-roleCheckboxes']} className="select-text inline" /></td>
                        <td className="border p-1.5 text-center font-medium" style={{ borderStyle: 'dotted', borderColor: '#9ca3af', borderTopStyle: 'solid', borderBottomStyle: 'solid', borderTopColor: '#1f2937', borderBottomColor: '#1f2937', backgroundColor: '#e2efd9', width: '20%' }}><SupplementTplText fieldKey="tpl-it-shokumu-h-process" text="作業工程" supplementMarking={supplementMarking} linkedFieldKeys={['workExperiences-0-processCheckboxes']} className="select-text inline" /></td>
                      </tr>
                    </thead>
                    <tbody>
                      {workList.length > 0 ? workList.flatMap((w, idx) => renderWorkExperience(w, idx)) : renderWorkExperience({}, 0)}
                      <tr><td colSpan={3} className="p-1.5 align-middle bg-gray-50 text-center" style={cellStyle}>{handleAddWorkExperience ? <button type="button" onClick={handleAddWorkExperience} className="text-xs text-blue-600 hover:text-blue-800 underline">行を追加</button> : <span className="text-xs text-gray-400">行を追加</span>}</td></tr>
                    </tbody>
                  </ResizableCvTable>
                </div>
              );
            })()}

            {/* 活かせるスキル + 資格・免許 */}
            <div className="mt-4 border" style={{ borderColor: '#1f2937' }}>
              <ResizableCvTable
                className="w-full border-collapse"
                style={{ borderColor: '#1f2937' }}
                colPercents={colSaved('shokumu', 'skillsCert', [100])}
                layoutKey={cvLayoutKey(CV_TPL, 'shokumu', 'skillsCert')}
                onLayoutCommit={onCvTableLayoutCommit}
              >
                <tbody>
                  <tr>
                    <td className="px-3 py-2 font-medium text-left align-middle" style={{ backgroundColor: '#e2efd9', color: '#1f2937', borderWidth: '1px', borderBottomWidth: '1px', borderColor: '#1f2937' }}>
                      <SupplementTplText fieldKey="tpl-it-shokumu-skills-title" text="活かせるスキル・経験・知識" supplementMarking={supplementMarking} linkedFieldKeys={['technicalSkills']} className="select-text inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="min-h-[8rem] p-3 text-xs whitespace-pre-wrap bg-white align-top" style={{ borderColor: '#1f2937', borderWidth: '0 1px 1px 1px' }}>
                      <div className="block" style={{ minHeight: '8rem' }}>
                        {renderMarked(formData.technicalSkills || '　', 'tpl-it-shokumu-skills', 'technicalSkills')}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-left align-middle" style={{ backgroundColor: '#e2efd9', color: '#1f2937', borderWidth: '1px', borderColor: '#1f2937' }}>
                      <SupplementTplText fieldKey="tpl-it-shokumu-qual-title" text="資格・免許" supplementMarking={supplementMarking} linkedFieldKeys={['certificates', 'addCandidate-certificates']} className="select-text inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="min-h-[4rem] p-3 text-xs whitespace-pre-wrap bg-white align-top" style={{ borderColor: '#1f2937', borderWidth: '0 1px 1px 1px' }}>
                      <div className="block" style={{ minHeight: '4rem' }}>
                        {(formData.certificates || []).length > 0 ? (
                          <div className="space-y-1">
                            {(formData.certificates || []).map((cert, index) => {
                              const year = String(cert?.year || '').trim();
                              const month = String(cert?.month || '').trim();
                              const name = String(cert?.name || '').trim();
                              const acquired = [year, month].filter(Boolean).length ? `（${year}年${month}月）` : '';
                              return (
                                <div key={`${index}-${name}-${year}-${month}`}>
                                  ・{name}{acquired}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          '　'
                        )}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </ResizableCvTable>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvTemplateIt;
