import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api';

const STORAGE_KEY = 'ungvienjs_auth';

function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

const CandidateAuthContext = createContext(null);

export function CandidateAuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());

  const setAuth = useCallback((token, applicant) => {
    const next = { token, applicant };
    writeSession(next);
    setSession(next);
  }, []);

  const clearAuth = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    const tok = session?.token;
    try {
      if (tok) await apiService.logoutApplicant(tok);
    } catch {
      /* ignore */
    }
    clearAuth();
  }, [session?.token, clearAuth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = readSession();
      if (!s?.token || s.applicant) return;
      try {
        const res = await apiService.getApplicantMe();
        if (cancelled || !res.success || !res.data?.applicant) return;
        const next = { token: s.token, applicant: res.data.applicant };
        writeSession(next);
        setSession(next);
      } catch {
        if (!cancelled) clearAuth();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearAuth]);

  const value = useMemo(
    () => ({
      applicant: session?.applicant ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      setAuth,
      clearAuth,
      logout,
    }),
    [session, setAuth, clearAuth, logout]
  );

  return <CandidateAuthContext.Provider value={value}>{children}</CandidateAuthContext.Provider>;
}

export function useCandidateAuth() {
  const ctx = useContext(CandidateAuthContext);
  if (!ctx) {
    return {
      applicant: null,
      token: null,
      isAuthenticated: false,
      setAuth: () => {},
      clearAuth: () => {},
      logout: async () => {},
    };
  }
  return ctx;
}
