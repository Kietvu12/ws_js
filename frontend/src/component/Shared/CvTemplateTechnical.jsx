import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import ResizableCvTable from './ResizableCvTable';
import { cvLayoutKey } from './cvLayoutKey';
import { SupplementTplText } from './CvTemplateSupplementText.jsx';
import { CV_LINK } from './cvSupplementLinks.js';
import { SupplementMarkedText, SupplementFieldWrap } from './CandidateDetailSupplementMarks.jsx';
import {
  formatCvYearMonthJa,
  parseYearMonthFlexible,
  formatShokumuPeriodCell,
  formatShokumuPeriodRangeJa,
  formatCvDocumentHeaderJa,
  formatCvAnyDateJa,
} from '../../utils/cvJpDateDisplay.js';
import { formatJpResidenceStatusForCvTemplate } from '../../utils/jpResidenceStatusDisplay.js';
import CvTemplateItTechnicalCertTable from './CvTemplateItTechnicalCertTable.jsx';

const CV_TPL = 'cv_technical';

/**
 * CvTemplateTechnical – giao diện form CV Kỹ thuật (履歴書 + 職務経歴書).
 * Rirekisho giống CV IT (trừ không bỏ bảng 使用可能ツール・ソフトウェア等枠).
 * Props:
 *   formData, setFormData
 *   activeTab (= cvTechnicalTab), setActiveTab (= setCvTechnicalTab)
 *   cvEditable, cvEditableBirthDate, cvEditableArray, cvEditableWithDefault
 *   getDefaultCvDate
 *   updateEmployment, updateEmploymentPair
 *   handleAddWorkExperience, handleInsertWorkExperienceAt, handleInsertWorkExperienceBlockAt (bảng 職歴 Rirekisho)
 *   handleBackendPreviewWithOptions
 *   avatarPreview
 *   supplementMarking (optional admin)
 */
const CvTemplateTechnical = ({
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
      supp || sm(`tpl-tech-${field}-default`, field)
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
      supp || sm(`tpl-tech-${formFieldKey}`, formFieldKey)
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

      {/* ===== 履歴書 (giống hệt IT) ===== */}
      {activeTab === 'rirekisho' && (
        <div className="w-full">
          <div className="flex items-center justify-end mb-2">
            <button
              type="button"
              onClick={() => handleBackendPreviewWithOptions('cv_technical', 'rirekisho')}
              className="px-3 py-1.5 text-xs font-medium rounded border transition-colors"
              style={{ borderColor: '#d1d5db', color: '#2563eb' }}
            >
              Xem preview 【履歴書】
            </button>
          </div>
          <div className="w-full overflow-x-auto" style={{ fontSize: '11px', color: '#1f2937' }}>
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
                    <SupplementTplText fieldKey="tpl-tech-rirekisho-banner" text="履歴書" supplementMarking={supplementMarking} className="select-text inline min-w-0" />
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-16 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-furigana" text="フリガナ" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.nameKana]} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 bg-white min-w-0" style={{ borderColor: '#1f2937' }}><span {...cvEditable('nameKana', '')} /></td>
                  <td className="border p-1 w-14 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-seinengappi" text="生年月日" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.birthDate]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditableBirthDate('', {})} title="YYYY-MM-DD" /></td>
                  <td className="border p-1 w-12 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-nenrei" text="年齢" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.age]} className="select-text inline" />
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
                    <SupplementTplText fieldKey="tpl-tech-shimei" text="氏名" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.nameKanji]} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 bg-white min-w-0" style={{ borderColor: '#1f2937' }}><span {...cvEditable('nameKanji', '')} /></td>
                  <td className="border p-1 font-medium w-14 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-gender" text="性別" supplementMarking={supplementMarking} linkedFieldKeys={['gender']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" className="rounded" checked={formData.gender === '男'} onChange={() => setFormData(prev => ({ ...prev, gender: '男' }))} /> 男</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer mt-0.5"><input type="checkbox" className="rounded" checked={formData.gender === '女'} onChange={() => setFormData(prev => ({ ...prev, gender: '女' }))} /> 女</label>
                  </td>
                  <td className="border p-1 font-medium w-16 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '4rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-passport" text="パスポート" supplementMarking={supplementMarking} linkedFieldKeys={['passport']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" className="rounded" checked={formData.passport === '有' || formData.passport === '1'} onChange={() => setFormData(prev => ({ ...prev, passport: '有' }))} /> 有</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer mt-0.5"><input type="checkbox" className="rounded" checked={formData.passport === '無' || formData.passport === '0'} onChange={() => setFormData(prev => ({ ...prev, passport: '無' }))} /> 無</label>
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-14 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-email" text="Email" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.email]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white min-w-0" style={{ borderColor: '#1f2937', maxWidth: '6rem' }}><span {...cvEditable('email', '')} /></td>
                  <td className="border p-1 font-medium w-12 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-denwa" text="電話" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.phone]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('phone', '')} /></td>
                  <td className="border p-1 font-medium w-16 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '4rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-skypeId" text="Skype ID" supplementMarking={supplementMarking} linkedFieldKeys={['skypeId']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('skypeId', '')} /></td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-14 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-genju" text="現住所" supplementMarking={supplementMarking} linkedFieldKeys={[CV_LINK.postalCode, CV_LINK.address]} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white min-w-0 text-center" style={{ borderColor: '#1f2937', maxWidth: '6rem' }}>
                    <span
                      {...cvEditable('address', 'block text-center')}
                      children={undefined}
                    >
                      {renderMarked([
                        formData.postalCode ? `〒${formData.postalCode}` : '',
                        formData.address || ''
                      ].filter(Boolean).join(' ') || '　', 'tpl-tech-genju', 'address', ['postalCode'])}
                    </span>
                  </td>
                  <td className="border p-1 font-medium w-14 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-addressOrigin" text="出身地" supplementMarking={supplementMarking} linkedFieldKeys={['addressOrigin']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('addressOrigin', '')} /></td>
                  <td className="border p-1 font-medium w-14 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '3.5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-hasSpouse" text="配偶者" supplementMarking={supplementMarking} linkedFieldKeys={['hasSpouse']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}>
                    <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" className="rounded" checked={formData.hasSpouse === '有'} onChange={() => setFormData(prev => ({ ...prev, hasSpouse: '有' }))} /> 有</label>
                    <label className="flex items-center gap-1 text-xs cursor-pointer mt-0.5"><input type="checkbox" className="rounded" checked={formData.hasSpouse === '無'} onChange={() => setFormData(prev => ({ ...prev, hasSpouse: '無' }))} /> 無</label>
                  </td>
                </tr>
                <tr>
                  <td className="border p-1 font-medium w-20 whitespace-nowrap text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem', maxWidth: '5rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-stayPurpose" text="日本滞在目的" supplementMarking={supplementMarking} linkedFieldKeys={['label-jpResidenceStatus', 'jpResidenceStatus']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white min-w-0 text-xs" style={{ borderColor: '#1f2937', maxWidth: '12rem' }} colSpan={3}>
                    {formatJpResidenceStatusForCvTemplate(formData.jpResidenceStatus) || '—'}
                  </td>
                  <td className="border p-1 font-medium w-16 text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', maxWidth: '4rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-label-visaExpiry" text="ビザの期限" supplementMarking={supplementMarking} linkedFieldKeys={['visaExpirationDate']} className="select-text inline" />
                  </td>
                  <td className="border p-1 bg-white w-20" style={{ borderColor: '#1f2937', maxWidth: '5rem' }}><span {...cvEditable('visaExpirationDate', '')} /></td>
                </tr>
              </tbody>
            </ResizableCvTable>

            {/* 学歴 */}
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
                    <SupplementTplText fieldKey="tpl-tech-education-title" text="学歴" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-education', 'education', 'education-0-content']} />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-edu-h-school" text="学校名 (英語名)" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-school_name']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-edu-h-major" text="学部・専攻" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-major']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-edu-h-start" text="入学年月" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-year']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-edu-h-end" text="卒業年月" supplementMarking={supplementMarking} linkedFieldKeys={['education-0-endYear']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-edu-h-years" text="年数" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-education']} className="select-text inline" />
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

            {/* 外国語の会話レベル */}
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
                    <SupplementTplText fieldKey="tpl-tech-language-title" text="外国語の会話レベル" supplementMarking={supplementMarking} linkedFieldKeys={['jpConversationLevel', 'enConversationLevel', 'otherConversationLevel', 'languageSkillRemarks', 'remarks']} />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-lang-h-jp" text="日本語" supplementMarking={supplementMarking} linkedFieldKeys={['jpConversationLevel']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-lang-h-en" text="英語" supplementMarking={supplementMarking} linkedFieldKeys={['enConversationLevel']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-lang-h-other" text="その他 ( )" supplementMarking={supplementMarking} linkedFieldKeys={['otherConversationLevel']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '10rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-lang-h-skill-note" text="言語スキル補足説明" supplementMarking={supplementMarking} linkedFieldKeys={['languageSkillRemarks']} className="select-text inline" />
                  </td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '10rem' }}>
                    <SupplementTplText fieldKey="tpl-tech-language-remarks-title" text="備考" supplementMarking={supplementMarking} linkedFieldKeys={['remarks']} />
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
                          <input type="checkbox" className="rounded"
                            checked={formData[field] === value}
                            onChange={() => setFormData(prev => ({ ...prev, [field]: prev[field] === value ? '' : value }))}
                          /> ・{label}
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
              tplPrefix="tech"
              cvTpl={CV_TPL}
              formData={formData}
              setFormData={setFormData}
              cvEditableArray={cvEditableArray}
              renderMarked={renderMarked}
              supplementMarking={supplementMarking}
              colSaved={colSaved}
              onCvTableLayoutCommit={onCvTableLayoutCommit}
            />

            {/* 使用可能ツール・ソフトウェア等枠: 2 cột (学習した / 業務で利用した), dữ liệu từ 24 & 25, mỗi ô = [tên | ô nhập], không checkbox */}
            <ResizableCvTable
              className="w-full border-collapse mt-3 font-bold"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('rirekisho', 'tools', [12, 22, 22, 22, 22])}
              layoutKey={cvLayoutKey(CV_TPL, 'rirekisho', 'tools')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                {(() => {
                  const learned = formData.learnedTools || [];
                  const experienced = formData.experienceTools || [];
                  const rowCount = Math.max(1, learned.length, experienced.length);
                  return (
                    <>
                      <tr>
                        <td rowSpan={rowCount + 1} className="border p-2 text-center align-middle" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '5rem' }}>
                          <SupplementTplText fieldKey="tpl-tech-tools-title-side" text="使用可能ツール・ソフトウェア等枠" supplementMarking={supplementMarking} linkedFieldKeys={['learnedTools', 'experienceTools', 'toolsSoftwareNotes']} className="select-text inline" />
                        </td>
                        <td colSpan={2} className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                          <SupplementTplText fieldKey="tpl-tech-tools-h-learned" text="学習したツール・ソフトウェア" supplementMarking={supplementMarking} linkedFieldKeys={['learnedTools']} className="select-text inline" />
                        </td>
                        <td colSpan={2} className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                          <SupplementTplText fieldKey="tpl-tech-tools-h-exp" text="業務で利用したツール・ソフトウェア" supplementMarking={supplementMarking} linkedFieldKeys={['experienceTools']} className="select-text inline" />
                        </td>
                      </tr>
                      {Array.from({ length: rowCount }).map((_, ri) => {
                        const learnedName = learned[ri] ?? '';
                        const expName = experienced[ri] ?? '';
                        return (
                          <tr key={ri}>
                            <td className="border p-1.5 bg-white text-left" style={{ borderColor: '#1f2937', borderRight: '2px dotted #1f2937' }}>
                              <SupplementTplText fieldKey={`tpl-tech-tools-learned-name-${ri}`} text={learnedName.trim() ? learnedName : '　'} supplementMarking={supplementMarking} linkedFieldKeys={['learnedTools']} className="text-xs pl-1 select-text inline min-w-0" />
                            </td>
                            <td className="border p-1 bg-white text-center align-middle" style={{ borderColor: '#1f2937', borderLeft: '2px dotted #1f2937', minWidth: '2.5rem' }}>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                className="outline-none min-h-[1.2em] block text-center text-xs w-full"
                                onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `learnedToolsNote-${ri}`)}
                                onBlur={(e) => {
                                  const v = (e.currentTarget.textContent || '').trim();
                                  const key = learnedName || `__learned_${ri}`;
                                  setFormData(prev => ({
                                    ...prev,
                                    toolsSoftwareNotes: {
                                      ...(prev.toolsSoftwareNotes || {}),
                                      learned: { ...(prev.toolsSoftwareNotes?.learned || {}), [key]: v },
                                      experienced: prev.toolsSoftwareNotes?.experienced || {},
                                      experiencedOther: prev.toolsSoftwareNotes?.experiencedOther ?? '',
                                    },
                                  }));
                                }}
                              >
                                {renderMarked((formData.toolsSoftwareNotes?.learned || {})[learnedName || `__learned_${ri}`] || '　', `tpl-tech-tools-learned-${ri}`, `learnedToolsNote-${ri}`)}
                              </span>
                            </td>
                            <td className="border p-1.5 bg-white text-left" style={{ borderColor: '#1f2937', borderRight: '2px dotted #1f2937' }}>
                              <SupplementTplText fieldKey={`tpl-tech-tools-exp-name-${ri}`} text={expName.trim() ? expName : '　'} supplementMarking={supplementMarking} linkedFieldKeys={['experienceTools']} className="text-xs pl-1 select-text inline min-w-0" />
                            </td>
                            <td className="border p-1 bg-white text-center align-middle" style={{ borderColor: '#1f2937', borderLeft: '2px dotted #1f2937', minWidth: '2.5rem' }}>
                              <span
                                contentEditable
                                suppressContentEditableWarning
                                className="outline-none min-h-[1.2em] block text-center text-xs w-full"
                                onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `experienceToolsNote-${ri}`)}
                                onBlur={(e) => {
                                  const v = (e.currentTarget.textContent || '').trim();
                                  const key = expName || `__experienced_${ri}`;
                                  setFormData(prev => ({
                                    ...prev,
                                    toolsSoftwareNotes: {
                                      ...(prev.toolsSoftwareNotes || {}),
                                      learned: prev.toolsSoftwareNotes?.learned || {},
                                      experienced: { ...(prev.toolsSoftwareNotes?.experienced || {}), [key]: v },
                                      experiencedOther: prev.toolsSoftwareNotes?.experiencedOther ?? '',
                                    },
                                  }));
                                }}
                              >
                                {renderMarked((formData.toolsSoftwareNotes?.experienced || {})[expName || `__experienced_${ri}`] || '　', `tpl-tech-tools-experience-${ri}`, `experienceToolsNote-${ri}`)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}
              </tbody>
            </ResizableCvTable>

            {/* Bảng 職歴 + 自己PR + 応募動機 + 備考 – giống CV IT: mặc định 1 hàng, 行を追加, 挿入, 勤務地 nhập tay */}
            <ResizableCvTable
              className="w-full border-collapse mt-3 font-bold"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('rirekisho', 'employment', [22, 20, 38, 20])}
              layoutKey={cvLayoutKey(CV_TPL, 'rirekisho', 'employment')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '10rem', maxWidth: '10rem' }}><SupplementTplText fieldKey="tpl-tech-rireki-period-h" text="期間" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-period']} /></td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', minWidth: '9rem' }}><SupplementTplText fieldKey="tpl-tech-rireki-place-h" text="勤務地" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-place']} /></td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', minWidth: '14rem' }}><SupplementTplText fieldKey="tpl-tech-rireki-company-h" text="企業名" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-company']} /></td>
                  <td className="border p-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '8rem', maxWidth: '8rem' }}><SupplementTplText fieldKey="tpl-tech-rireki-role-h" text="ポジション・役割" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-description', 'employment-0-scale']} /></td>
                </tr>
                {(() => {
                  const list = formData.workExperiences || [];
                  const workCount = Math.max(1, formData.workHistoryCount ?? list.length);
                  const cellEditStyle = { outline: 'none', minHeight: '1em', minWidth: '1.5em', display: 'inline-block', cursor: 'text' };
                  return Array.from({ length: workCount }).map((_, i) => {
                    const row = list[i] || {};
                    const startRaw = row.start_date || [row.startYear, row.startMonth].filter(Boolean).join('/');
                    const endRaw = row.endCurrent ? '現在' : (row.end_date || [row.endYear, row.endMonth].filter(Boolean).join('/'));
                    const periodDisplay = formatShokumuPeriodRangeJa(startRaw, endRaw) || row.period || '';
                    const companyNameDisplay = (row.company_name || '').replace(/\s*入社\s*$|\s*退社\s*$/g, '').trim();
                    const employmentPlaceDisplay = row.employmentPlace || row.employment_place || row.work_location || row.location || '';
                    const companyRoleDisplay = row.companyRole || row.company_role || row.position_role || row.position_name || row.position || '';
                    const descriptionDisplay = row.description || '';
                    return (
                      <React.Fragment key={`shokureki-${i}`}>
                        <tr>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', width: '10rem', maxWidth: '10rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-period`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'period', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(formatShokumuPeriodCell(periodDisplay) || periodDisplay || '　', `tpl-tech-rireki-${i}-period`, `employment-${i}-period`)}</span>
                          </td>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', minWidth: '9rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-place`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'employmentPlace', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(employmentPlaceDisplay || '　', `tpl-tech-rireki-${i}-place`, `employment-${i}-place`)}</span>
                          </td>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', minWidth: '14rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-company`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'company_name', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(companyNameDisplay || '　', `tpl-tech-rireki-${i}-company`, `employment-${i}-company`)}</span>
                          </td>
                          <td className="border p-1.5 bg-white text-center align-middle" style={{ borderColor: '#1f2937', width: '8rem', maxWidth: '8rem' }}>
                            <span contentEditable suppressContentEditableWarning onContextMenu={(e) => supplementMarking?.onFieldContextMenu?.(e, `employment-${i}-companyRole`)} onBlur={(e) => (updateEmploymentPair || updateEmployment)(i, 'companyRole', (e.currentTarget.textContent || '').trim())} style={cellEditStyle}>{renderMarked(companyRoleDisplay || '　', `tpl-tech-rireki-${i}-companyRole`, `employment-${i}-companyRole`)}</span>
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
                    <SupplementTplText fieldKey="tpl-tech-selfpr-title" text="自己PR (大学での成績順位、頑張ったこと、趣味等)" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-strengths', 'strengths', 'hobbiesSpecialSkills']} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-2 bg-white align-top min-h-[80px]" style={{ borderColor: '#1f2937' }}>
                    <SupplementTplText
                      fieldKey="tpl-tech-selfpr"
                      text={(formData.strengths || formData.careerSummary || formData.hobbiesSpecialSkills || '　').trim() || '　'}
                      supplementMarking={supplementMarking}
                      linkedFieldKeys={['addCandidate-strengths', 'strengths', 'careerSummary', 'hobbiesSpecialSkills']}
                      className="block whitespace-pre-wrap"
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-1.5 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-motivation-title" text="応募動機" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-motivation', 'motivation']} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-2 bg-white align-top" style={{ borderColor: '#1f2937', minHeight: '80px' }}>
                    <SupplementTplText
                      fieldKey="tpl-tech-motivation"
                      text={(formData.motivation || '　').trim() || '　'}
                      supplementMarking={supplementMarking}
                      linkedFieldKeys={['addCandidate-motivation', 'motivation']}
                      className="block whitespace-pre-wrap"
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-1.5 font-medium text-center" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9' }}>
                    <SupplementTplText fieldKey="tpl-tech-note-title" text="備考" supplementMarking={supplementMarking} linkedFieldKeys={['addCandidate-block6-prefs', 'currentSalary', 'desiredSalary', 'desiredPosition', 'desiredLocation', 'visaExpirationDate']} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border p-2 bg-white align-top" style={{ borderColor: '#1f2937', fontSize: '10px' }}>
                    <div className="space-y-1">
                      <div>・現年収: {renderMarked(formData.currentSalary || '　', 'tpl-tech-currentSalary', 'currentSalary', ['label-currentSalary'])}</div>
                      <div>・希望年収: {renderMarked(formData.desiredSalary || '　', 'tpl-tech-desiredSalary', 'desiredSalary', ['label-desiredSalary'])}</div>
                      <div>・希望職種: {renderMarked(formData.desiredPosition || '　', 'tpl-tech-desiredPosition', 'desiredPosition', ['label-desiredPosition'])}</div>
                      <div>・希望勤務地: {renderMarked(formData.desiredLocation || '　', 'tpl-tech-desiredLocation', 'desiredLocation', ['label-desiredLocation'])}</div>
                      <div>・在留資格の種類: 技術・人文知識・国際業務</div>
                      <div>・在留期間: {renderMarked(formatCvAnyDateJa(formData.visaExpirationDate) || formData.visaExpirationDate || '年月日', 'tpl-tech-visaExpirationDate-note', 'visaExpirationDate', ['label-visaExpiry'])}</div>
                      <div>・在留カードに記載の就労制限:「在留資格に基づく就労活動のみ可」</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </ResizableCvTable>
          </div>
        </div>
      )}

      {/* ===== 職務経歴書 (CV Kỹ thuật) ===== */}
      {activeTab === 'shokumu' && (
        <div className="w-full">
          <div className="flex items-center justify-end mb-2">
            <button type="button" onClick={() => handleBackendPreviewWithOptions('cv_technical', 'shokumu')}
              className="px-3 py-1.5 text-xs font-medium rounded border transition-colors"
              style={{ borderColor: '#d1d5db', color: '#2563eb' }}>
              Xem preview 【職務経歴書】
            </button>
          </div>
          <div className="rounded border p-4 min-h-[200px]" style={{ borderColor: '#e5e7eb', fontSize: '11px', color: '#1f2937' }}>
            <div className="mb-6">
              <h2 className="text-center font-bold mb-8" style={{ fontSize: '1.25rem' }}>
                <SupplementTplText fieldKey="tpl-tech-shokumu-h2" text="職務経歴書" supplementMarking={supplementMarking} />
              </h2>
              <div className="text-right space-y-1">
                <div>現在、<span {...cvEditableWithDefault('cvDocumentDate', getDefaultCvDate(false), 'inline-block min-w-[8em]', {}, (v) => formatCvDocumentHeaderJa(String(v || '').replace(/現在$/, '')))} /></div>
                <div>氏名: <span {...cvEditable('nameKanji', '')} /> (<span {...cvEditable('nameKana', '')} />)</div>
              </div>
            </div>

            {/* 職務要約 */}
            <ResizableCvTable
              className="w-full border-collapse font-bold mt-4"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('shokumu', 'summary', [12, 88])}
              layoutKey={cvLayoutKey(CV_TPL, 'shokumu', 'summary')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td className="border p-2 text-center align-middle" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', width: '12%' }}>
                    <SupplementTplText fieldKey="tpl-tech-shokumu-summary-title" text="職務要約" supplementMarking={supplementMarking} linkedFieldKeys={['careerSummary']} className="select-text inline" />
                  </td>
                  <td className="border p-3 bg-white align-top" style={{ borderColor: '#1f2937' }}>
                    <div className="whitespace-pre-wrap min-h-[4rem]" {...cvEditable('careerSummary', 'block')} />
                  </td>
                </tr>
              </tbody>
            </ResizableCvTable>

            {/* 職務経歴 – Technical: 1 block = 1 công ty (cặp workExperiences). Số block = workHistoryCount ?? ceil(length/2). */}
            <div className="mt-4">
              <div className="border p-2 text-center font-bold" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', color: '#1f2937' }}>
                <SupplementTplText fieldKey="tpl-tech-shokumu-work-banner" text="職務経歴" supplementMarking={supplementMarking} linkedFieldKeys={['workExperiences-0-company_name']} className="select-text inline" />
              </div>
              {(() => {
                const list = formData.workExperiences || [];
                const blockCount = Math.max(1, formData.workHistoryCount ?? list.length);
                const labels = ['【職歴１】', '【職歴２】', '【職歴３】'];
                const defaultPeriods = ['2016 年 6 月～2018 年 6 月 (例)', '2018 年 6 月～2022 年 6 月 (例)', '2022 年 6 月～現在 (例)'];
                const formatWorkPeriodDisplay = (startEmp = {}) => {
                  const startLabel = startEmp.start_date || [startEmp.startYear, startEmp.startMonth].filter(Boolean).join('/');
                  const endLabel = startEmp.endCurrent ? '現在' : (startEmp.end_date || [startEmp.endYear, startEmp.endMonth].filter(Boolean).join('/'));
                  return formatShokumuPeriodRangeJa(startLabel, endLabel)
                    || formatShokumuPeriodCell(`${startLabel}～${endLabel}`)
                    || (startLabel && endLabel ? `${startLabel}～${endLabel}` : '')
                    || '';
                };
                return Array.from({ length: blockCount }, (_, blockIndex) => {
                  const baseIdx = blockIndex;
                  const emp = list[baseIdx] || {};
                  const label = labels[blockIndex] || `【職歴${blockIndex + 1}】`;
                  const pd = defaultPeriods[blockIndex] || '';
                  const companyFallback =
                    emp.company_name || emp.companyName || emp.company || emp.companyKanji || emp.companyJa || '';
                  const positionFallback =
                    emp.companyRole || emp.company_role || emp.position_role || emp.position_name || emp.positionName || emp.position || emp.role || emp.jobTitle || '';
                  const locationFallback =
                    emp.location || emp.workLocation || emp.work_location || '';
                  const periodFallback = formatWorkPeriodDisplay(emp) || pd;
                  return (
                    <div key={label} className="mb-2 last:mb-0">
                      <ResizableCvTable
                        className="w-full border-collapse font-bold mt-0"
                        style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937', borderTopWidth: blockIndex === 0 ? undefined : 0 }}
                        colPercents={colSaved('shokumu', `workGrid:${blockIndex}`, [11, 39, 38, 12])}
                        layoutKey={cvLayoutKey(CV_TPL, 'shokumu', `workGrid:${blockIndex}`)}
                        onLayoutCommit={onCvTableLayoutCommit}
                      >
                        <tbody>
                          <tr>
                            <td className="border py-0.5 px-1.5 text-center align-middle" style={{ borderColor: '#1f2937', backgroundColor: '#e5e7eb', width: '11%' }}>
                              <SupplementTplText fieldKey={`tpl-tech-shokumu-block-label-${blockIndex}`} text={label} supplementMarking={supplementMarking} linkedFieldKeys={[`workExperiences-${baseIdx}-period`]} className="select-text inline text-xs" />
                            </td>
                            <td className="border py-0.5 px-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e5e7eb', width: '40%', minWidth: '38%' }}>
                              <span {...cvEditableArray('workExperiences', baseIdx, 'company_name', 'block w-full', { display: 'block' }, companyFallback)} />
                            </td>
                            <td className="border py-0.5 px-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e5e7eb' }}>
                              <span {...cvEditableArray('workExperiences', baseIdx, 'position_name', 'block w-full', { display: 'block' }, positionFallback)} />
                            </td>
                            <td className="border py-0.5 px-1.5 text-center font-medium" style={{ borderColor: '#1f2937', backgroundColor: '#e5e7eb', width: '12%', maxWidth: '12%' }}>
                              <span {...cvEditableArray('workExperiences', baseIdx, 'location', 'block w-full', { display: 'block' }, locationFallback)} />
                            </td>
                          </tr>
                          <tr>
                            <td className="border py-0.5 px-1.5 text-center font-medium bg-white" style={{ borderColor: '#1f2937', width: '11%' }}>
                              <SupplementTplText fieldKey="tpl-tech-shokumu-period-h" text="期間" supplementMarking={supplementMarking} linkedFieldKeys={['employment-0-period']} />
                            </td>
                            <td colSpan={2} className="border py-0.5 px-1.5 text-center font-medium bg-white" style={{ borderColor: '#1f2937', minWidth: '70%' }}>
                              <SupplementTplText fieldKey="tpl-tech-shokumu-h-desc-tech" text="業務内容" supplementMarking={supplementMarking} linkedFieldKeys={[`workExperiences-${baseIdx}-description`]} className="select-text inline" />
                            </td>
                            <td className="border py-0.5 px-1.5 text-center font-medium bg-white" style={{ borderColor: '#1f2937', width: '12%', maxWidth: '12%' }}>
                              <SupplementTplText fieldKey="tpl-tech-shokumu-h-tools" text="使用ツール" supplementMarking={supplementMarking} linkedFieldKeys={[`workExperiences-${baseIdx}-tools_tech`]} className="select-text inline" />
                            </td>
                          </tr>
                          <tr>
                            <td className="border p-1.5 bg-white align-middle text-center" style={{ borderColor: '#1f2937', width: '11%' }}>
                              <span {...cvEditableArray('workExperiences', baseIdx, 'period', 'block', {}, periodFallback)} />
                            </td>
                            <td rowSpan={4} colSpan={2} className="border p-2 bg-white align-top" style={{ borderColor: '#1f2937', minWidth: '70%' }}>
                              <span {...cvEditableArray('workExperiences', baseIdx, 'description', 'block', {}, emp.description)} />
                            </td>
                            <td rowSpan={4} className="border p-1.5 bg-white align-top whitespace-pre-wrap" style={{ borderColor: '#1f2937', width: '12%', maxWidth: '12%', verticalAlign: 'top' }}>
                              <span {...cvEditableArray('workExperiences', baseIdx, 'tools_tech', 'block', {}, emp.tools_tech)} />
                            </td>
                          </tr>
                          <tr key="r2" />
                          <tr key="r3" />
                          <tr key="r4" />
                        </tbody>
                      </ResizableCvTable>
                    </div>
                  );
                });
              })()}
            </div>

            {/* 活かせるスキル + 資格・免許 */}
            <ResizableCvTable
              className="w-full border-collapse font-bold mt-4 border"
              style={{ fontSize: '11px', color: '#1f2937', borderColor: '#1f2937' }}
              colPercents={colSaved('shokumu', 'skillsCert', [100])}
              layoutKey={cvLayoutKey(CV_TPL, 'shokumu', 'skillsCert')}
              onLayoutCommit={onCvTableLayoutCommit}
            >
              <tbody>
                <tr>
                  <td className="border p-2 text-center font-bold" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', color: '#1f2937' }}>
                    <SupplementTplText fieldKey="tpl-tech-shokumu-skills-title" text="活かせるスキル・経験・知識" supplementMarking={supplementMarking} linkedFieldKeys={['technicalSkills']} className="select-text inline" />
                  </td>
                </tr>
                <tr>
                  <td className="border p-3 min-h-[100px] bg-white text-sm whitespace-pre-wrap align-top" style={{ borderColor: '#1f2937', color: '#1f2937' }}>
                    <div className="whitespace-pre-wrap min-h-[100px]">{formData.technicalSkills?.trim() || '　'}</div>
                  </td>
                </tr>
                <tr>
                  <td className="border p-2 text-center font-bold" style={{ borderColor: '#1f2937', backgroundColor: '#e2efd9', color: '#1f2937' }}>
                    <SupplementTplText fieldKey="tpl-tech-shokumu-qual-title" text="資格・免許" supplementMarking={supplementMarking} linkedFieldKeys={['certificates', 'addCandidate-certificates']} className="select-text inline" />
                  </td>
                </tr>
                <tr>
                  <td className="border p-3 bg-white text-sm align-top min-h-[4rem]" style={{ borderColor: '#1f2937', color: '#1f2937' }}>
                    <div className="whitespace-pre-wrap min-h-[4rem]">
                      {(formData.certificates?.filter(c => c?.name?.trim()).length > 0)
                        ? formData.certificates.filter(c => c?.name?.trim()).map(c => `・${c.name}${(c.year || c.month) ? ` (${formatCvYearMonthJa(c.year, c.month)})` : ''}`).join('\n')
                        : '　'}
                    </div>
                  </td>
                </tr>
              </tbody>
            </ResizableCvTable>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvTemplateTechnical;
