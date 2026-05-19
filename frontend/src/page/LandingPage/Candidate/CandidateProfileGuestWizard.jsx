import React from 'react';
import { Link } from 'react-router-dom';

/** Mũi tên xuống một nét liền: thân dọc + tam giác (không dùng icon tách khỏi đoạn thẳng). */
function ContinuousDownArrow({ variant = 'short', className = '' }) {
  const tip = (
    <div
      className="h-0 w-0 shrink-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-neutral-900 sm:border-x-[7px] sm:border-t-[9px]"
      aria-hidden
    />
  );

  if (variant === 'tall') {
    return (
      <div className={`flex min-h-0 w-7 flex-1 flex-col items-center ${className}`} aria-hidden>
        <div className="min-h-0 w-[2px] flex-1 rounded-t-full bg-neutral-900" />
        <div className="-mt-px">{tip}</div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-7 flex-col items-center sm:w-8 ${className}`}
      aria-hidden
    >
      <div className="h-14 w-[2px] rounded-t-full bg-neutral-900 sm:h-16 md:h-[4.25rem]" />
      <div className="-mt-px">{tip}</div>
    </div>
  );
}

/**
 * Sơ đồ hướng dẫn tạo CV (khách chưa đăng nhập). Step 1: banner dẫn tới đăng nhập; các bước khác chỉ xem.
 */
export default function CandidateProfileGuestWizard({ copy, prefix }) {
  const t = copy;
  const loginUrl = `${prefix}/login`;
  const profilePath = `${prefix}/profile`;

  const boxClass =
    'inline-flex min-h-[44px] min-w-[120px] max-w-full items-center justify-center rounded-lg border border-[#ED212F] bg-white px-4 py-2.5 text-center text-sm font-semibold text-neutral-900 sm:min-w-[140px]';

  return (
    <div className="mx-auto w-full max-w-3xl" aria-label={t.guestGuideAria || 'Hướng dẫn tạo CV'}>
      <h1 className="mb-8 px-1 text-left text-base font-bold leading-snug sm:text-lg md:text-xl">
        <span className="text-neutral-900">{t.guestHeroBefore}</span>
        <span className="text-[#ED212F]">{t.guestHeroAi}</span>
        <span className="text-neutral-900">{t.guestHeroMid}</span>
        {t.guestHeroBrand ? <span className="text-[#ED212F]">{t.guestHeroBrand}</span> : null}
        <span className="text-neutral-900">{t.guestHeroEnd}</span>
      </h1>

      {/* Step 1 */}
      <section className="mb-10">
        <p className="mb-2 text-left text-sm font-bold text-neutral-900">{t.guestStep1}</p>
        <Link
          to={loginUrl}
          state={{ from: profilePath }}
          aria-label={`${t.guestLoginBannerBefore}${t.guestLoginLink}${t.guestLoginBannerAfter}`}
          className="block rounded-xl bg-[#ED212F] px-4 py-3 text-center text-sm font-medium leading-snug text-white shadow-sm transition-colors hover:bg-[#d11824] sm:text-base"
        >
          {t.guestLoginBannerBefore}
          <span className="font-bold tracking-wide underline decoration-2 underline-offset-2">
            {t.guestLoginLink}
          </span>
          {t.guestLoginBannerAfter}
        </Link>
      </section>

      {/* Step 2: hai nhánh — Có | Chưa cùng hàng; Chưa = một mũi tên dài bỏ qua upload */}
      <section className="mb-10">
        <p className="mb-2 text-left text-sm font-bold text-neutral-900">{t.guestStep2}</p>
        <p className="mb-5 text-left text-sm font-semibold text-neutral-900 sm:mb-6 sm:text-base">
          {t.guestQHasCv}
        </p>

        <div className="mx-auto grid w-full max-w-xl grid-cols-2 items-stretch gap-x-3 sm:max-w-2xl sm:gap-x-8 md:gap-x-12">
          {/* Trái: Có → ↓ → Upload → ↓ → chữ nghiêng (mũi tên cuối chỉ tới dòng chữ, không thêm mũi tên sau chữ) */}
          <div className="flex flex-col items-center gap-1">
            <div className={boxClass}>{t.guestYes}</div>
            <ContinuousDownArrow />
            <div className={boxClass}>{t.guestUploadCv}</div>
            <ContinuousDownArrow />
            <p className="mt-1 max-w-[200px] text-center text-[11px] italic leading-snug text-[#b91c1c] sm:max-w-none sm:text-xs md:text-sm">
              {t.guestUploadHint}
            </p>
          </div>

          {/* Phải: Chưa cùng hàng Có; ô grid kéo cao bằng cột trái → đường dọc flex-1 = mũi tên “dài” bỏ upload */}
          <div className="flex h-full min-h-0 flex-col items-center">
            <div className={boxClass}>{t.guestNo}</div>
            <div className="flex min-h-0 w-full flex-1 flex-col items-center pt-1 sm:pt-2" aria-hidden>
              <ContinuousDownArrow variant="tall" />
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="mb-10">
        <p className="mb-2 text-left text-sm font-bold text-neutral-900">{t.guestStep3}</p>
        <p className="mb-5 text-center text-sm font-semibold text-neutral-900 sm:text-base">{t.guestQTemplate}</p>
        <div className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
          <div className={`${boxClass} flex-1 sm:flex-none`}>{t.tplStandard}</div>
          <div className={`${boxClass} flex-1 sm:flex-none`}>{t.tplTechnical}</div>
          <div className={`${boxClass} flex-1 sm:flex-none`}>{t.tplIt}</div>
        </div>
      </section>

      {/* Step 4 */}
      <section>
        <p className="mb-2 text-left text-sm font-bold text-neutral-900">{t.guestStep4}</p>
        <p className="text-left text-sm italic leading-relaxed text-[#b91c1c] sm:text-base">{t.guestStep4Hint}</p>
      </section>
    </div>
  );
}
