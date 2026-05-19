import React from 'react';
import { SupplementFieldWrap, SupplementMarkedText } from './CandidateDetailSupplementMarks.jsx';

/** Chuỗi tĩnh trong preview template — đánh dấu bổ sung (admin); linkedFieldKeys đồng bộ highlight với label form. CTV chỉ đọc marks (không có onField) vẫn bôi vàng. */
export function SupplementTplText({
  fieldKey,
  text,
  supplementMarking,
  linkedFieldKeys,
  className = 'select-text inline min-w-0',
}) {
  const marks = supplementMarking?.marks ?? [];
  const onField = supplementMarking?.onFieldContextMenu;
  const inner = (
    <SupplementMarkedText text={text} fieldKey={fieldKey} allMarks={marks} linkedFieldKeys={linkedFieldKeys} />
  );
  if (onField) {
    return (
      <SupplementFieldWrap fieldKey={fieldKey} onContextMenu={(e) => onField(e, fieldKey)} className={className}>
        {inner}
      </SupplementFieldWrap>
    );
  }
  if (!marks.length) return text;
  return <span className={className}>{inner}</span>;
}
