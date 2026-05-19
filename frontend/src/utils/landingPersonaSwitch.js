/**
 * Hỗ trợ chuyển giữa landing Cộng tác viên (/collaborator, /landing/collaborator)
 * và Ứng viên (/candidate, /landing/candidate) giữ nguyên "mode" landing hay không.
 */

/**
 * @param {string} pathname
 * @returns {{ base: string, role: 'collaborator'|'candidate', rest: string } | null}
 */
export function getLandingPersonaContext(pathname) {
  const raw = pathname || '/';
  const p = raw.replace(/\/+$/, '') || '/';
  const ordered = [
    ['/landing/collaborator', 'collaborator'],
    ['/landing/candidate', 'candidate'],
    ['/collaborator', 'collaborator'],
    ['/candidate', 'candidate'],
  ];
  for (const [base, role] of ordered) {
    if (p === base || p.startsWith(`${base}/`)) {
      const rest = p === base ? '' : p.slice(base.length);
      return { base, role, rest };
    }
  }
  if (p === '/' || p.startsWith('/jobs') || p.startsWith('/blog')) {
    const rest = p === '/' ? '' : p;
    return { base: '', role: 'collaborator', rest };
  }
  return null;
}

/**
 * URL tương ứng khi chuyển sang vai CTV hoặc ứng viên (giữ jobs/blog/…; path chỉ UV → map hợp lý).
 * @param {string} pathname
 * @param {'collaborator'|'candidate'} targetRole
 */
export function hrefForLandingPersona(pathname, targetRole) {
  const ctx = getLandingPersonaContext(pathname);
  if (!ctx) {
    return targetRole === 'collaborator' ? '/collaborator' : '/candidate';
  }
  if (ctx.role === targetRole) {
    return `${ctx.base}${ctx.rest || ''}` || ctx.base;
  }
  const isLanding = ctx.base.startsWith('/landing/');
  const isRoot = ctx.base === '';
  const otherBase =
    targetRole === 'collaborator'
      ? isRoot
        ? '/'
        : isLanding
          ? '/landing/collaborator'
          : '/collaborator'
      : isRoot
        ? '/candidate'
        : isLanding
          ? '/landing/candidate'
          : '/candidate';

  let rest = ctx.rest;

  if (ctx.role === 'candidate' && targetRole === 'collaborator') {
    if (/^\/(login|register)(\/|$)/.test(rest)) rest = '';
    else if (/^\/profile(\/|$)/.test(rest)) rest = '';
    else if (/^\/nominations\//.test(rest)) rest = '';
    else if (/^\/jobs\/[^/]+\/apply\/?$/.test(rest)) rest = rest.replace(/\/apply\/?$/, '');
  }

  const path = `${otherBase}${rest || ''}`;
  return path || otherBase;
}
