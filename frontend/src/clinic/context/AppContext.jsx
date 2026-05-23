// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  apiLogout,
  getSession,
  removeToken,
  removeSession,
  setSession as persistSession,
  apiGetMyClinic,
  apiUpdateMyClinic,
  apiGetUsers,
  apiAddUser,
  apiUpdateUser,
  apiDeleteUser,
  apiGetPatients,
  apiAddPatient,
  apiUpdatePatientStatus,
  apiUpdateFollowUp,
  apiUpdateTokenLimit,
  apiGetMe,
  apiUploadPatientFile,
  apiGetPatientFiles,
  apiDownloadPatientFile,
  apiDeletePatientFile,
  apiGetPatientHistory,
  apiActivatePlan,
} from '../utils/api';

const AppContext = createContext(null);

// ── Helper: normalize plan string into 'lite'|'plus'|'pro'|null ──────────────
function normalizePlan(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s.includes('pro'))  return 'pro';
  if (s.includes('plus')) return 'plus';
  if (s.includes('lite')) return 'lite';
  if (['pro', 'plus', 'lite'].includes(s)) return s;
  return null;
}

// ── Helper: clear all auth from localStorage ──────────────────────────────────
function clearAllAuth() {
  removeToken();
  removeSession();
  localStorage.removeItem('ims_token');
  localStorage.removeItem('curelex_activePlan');
}

export function AppProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());

  // ── Plan state ───────────────────────────────────────────────────────────────
  const [activePlan, setActivePlanState] = useState(
    () => normalizePlan(localStorage.getItem('curelex_activePlan'))
  );

  const setActivePlan = useCallback((planKey) => {
    const normalized = normalizePlan(planKey);
    if (normalized) {
      localStorage.setItem('curelex_activePlan', normalized);
    } else {
      localStorage.removeItem('curelex_activePlan');
    }
    setActivePlanState(normalized);
  }, []);

  const clearPlan = useCallback(() => {
    localStorage.removeItem('curelex_activePlan');
    setActivePlanState(null);
  }, []);

  // ── On app load: restore plan from backend if missing in localStorage ────────
  useEffect(() => {
    const storedPlan     = normalizePlan(localStorage.getItem('curelex_activePlan'));
    const currentSession = getSession();

    if (currentSession && !storedPlan) {
      apiGetMyClinic()
        .then((clinic) => {
          if (!clinic) return; // 401 redirect already happened in api.js
          const backendPlan =
            clinic?.plan ??
            clinic?.subscription?.plan ??
            clinic?.activePlan ??
            null;
          if (backendPlan) setActivePlan(backendPlan);
        })
        .catch((err) => {
          // ✅ Clear session if token is invalid/expired
          const msg = err?.message || '';
          if (
            msg.includes('401') ||
            msg.includes('Invalid') ||
            msg.includes('expired') ||
            msg.includes('Unauthorized')
          ) {
            clearAllAuth();
            setSessionState(null);
            setActivePlanState(null);
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSession = useCallback((sess) => {
    setSessionState(sess);
    if (sess) {
      persistSession(sess);
    } else {
      apiLogout();
      clearPlan();
    }
  }, [clearPlan]);

  const login = useCallback((sess) => {
    setSession(sess);

    // Sync plan from backend after login
    apiGetMyClinic()
      .then((clinic) => {
        if (!clinic) return;
        const backendPlan =
          clinic?.plan ??
          clinic?.subscription?.plan ??
          clinic?.activePlan ??
          null;
        if (backendPlan) setActivePlan(backendPlan);
      })
      .catch(() => {
        // Ignore — api.js handles 401 redirect automatically
      });
  }, [setSession, setActivePlan]);

  const logout = useCallback(() => setSession(null), [setSession]);

  // ── Clinic ───────────────────────────────────────────────────────────────────
  const refreshClinic = useCallback(() => apiGetMyClinic(), []);
  const saveClinic    = useCallback((updates) => apiUpdateMyClinic(updates), []);

  // ── Users ────────────────────────────────────────────────────────────────────
  const getUsers   = useCallback(() => apiGetUsers(), []);
  const addUser    = useCallback((data) => apiAddUser(data), []);
  const updateUser = useCallback((userId, data) => apiUpdateUser(userId, data), []);
  const deleteUser = useCallback((userId) => apiDeleteUser(userId), []);
  const getMe      = useCallback(() => apiGetMe(), []);

  // ── Token Limit ──────────────────────────────────────────────────────────────
  const updateTokenLimit = useCallback(
    (doctorId, limit) => apiUpdateTokenLimit(doctorId, limit), []
  );

  // ── Patients ─────────────────────────────────────────────────────────────────
  const getPatients         = useCallback((params = {}) => apiGetPatients(params), []);
  const addPatient          = useCallback((data) => apiAddPatient(data), []);
  const updatePatientStatus = useCallback(
    (patientId, status) => apiUpdatePatientStatus(patientId, status), []
  );
  const updateFollowUp = useCallback(
    (patientId, followUpDate, followUpNote) =>
      apiUpdateFollowUp(patientId, followUpDate, followUpNote), []
  );

  // ── Patient Files ─────────────────────────────────────────────────────────────
  const uploadPatientFile = useCallback(
    (patientId, file) => apiUploadPatientFile(patientId, file), []
  );
  const getPatientFiles = useCallback(
    (patientId) => apiGetPatientFiles(patientId), []
  );
  const downloadPatientFile = useCallback(
    (patientId, fileId) => apiDownloadPatientFile(patientId, fileId), []
  );
  const deletePatientFile = useCallback(
    (patientId, fileId) => apiDeletePatientFile(patientId, fileId), []
  );

  // ── Patient History ───────────────────────────────────────────────────────────
  const getPatientHistory = useCallback(
    (phone) => apiGetPatientHistory(phone), []
  );

  // ── Plan Activation ───────────────────────────────────────────────────────────
  const activatePlan = useCallback(async (planKey) => {
    await apiActivatePlan(planKey);
    setActivePlan(planKey);
  }, [setActivePlan]);

  return (
    <AppContext.Provider value={{
      session, login, logout,
      // ── Plan ──
      activePlan,
      setActivePlan,
      clearPlan,
      activatePlan,
      // ── Clinic ──
      refreshClinic, saveClinic,
      // ── Users ──
      getUsers, addUser, updateUser, deleteUser, getMe,
      // ── Token ──
      updateTokenLimit,
      // ── Patients ──
      getPatients, addPatient, updatePatientStatus, updateFollowUp,
      // ── Files ──
      uploadPatientFile, getPatientFiles, downloadPatientFile, deletePatientFile,
      // ── History ──
      getPatientHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}