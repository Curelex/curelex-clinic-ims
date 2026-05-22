// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  apiLogout,
  getSession,
  setSession as persistSession,
  apiGetMyClinic,
  apiUpdateMyClinic,
  apiGetUsers,
  apiAddUser,
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

// ─── Helper: normalize whatever the backend sends into 'lite'|'plus'|'pro'|null
function normalizePlan(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  // Handle "clinic_pro", "Clinic Pro", "PRO", "pro" etc.
  if (s.includes('pro'))  return 'pro';
  if (s.includes('plus')) return 'plus';
  if (s.includes('lite')) return 'lite';
  // Handle exact keys
  if (['pro', 'plus', 'lite'].includes(s)) return s;
  return null;
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
  // ────────────────────────────────────────────────────────────────────────────

  // ── On app load: if we have a session but no plan in localStorage,
  //    fetch clinic from backend to restore the plan (handles page refresh
  //    after logout+login, or cases where localStorage was cleared)
  useEffect(() => {
    const storedPlan = normalizePlan(localStorage.getItem('curelex_activePlan'));
    const currentSession = getSession();

    if (currentSession && !storedPlan) {
      // No plan in localStorage but user is logged in — fetch from backend
      apiGetMyClinic()
        .then((clinic) => {
          // Backend likely returns clinic.plan or clinic.subscription.plan
          const backendPlan =
            clinic?.plan ??
            clinic?.subscription?.plan ??
            clinic?.activePlan ??
            null;

          if (backendPlan) {
            setActivePlan(backendPlan); // normalizes + saves to localStorage
          }
        })
        .catch(() => {
          // Ignore — user may not be authenticated yet
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

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

    // After login, always sync plan from backend
    // (in case localStorage was wiped or plan changed server-side)
    apiGetMyClinic()
      .then((clinic) => {
        const backendPlan =
          clinic?.plan ??
          clinic?.subscription?.plan ??
          clinic?.activePlan ??
          null;

        if (backendPlan) {
          setActivePlan(backendPlan);
        }
        // If no plan on backend, leave as-is (user will be shown PlanSelection)
      })
      .catch(() => {
        // Ignore fetch errors during login sync
      });
  }, [setSession, setActivePlan]);

  const logout = useCallback(() => setSession(null), [setSession]);

  // ── Clinic ───────────────────────────────────────────────────────────────────
  const refreshClinic = useCallback(() => apiGetMyClinic(), []);
  const saveClinic    = useCallback((updates) => apiUpdateMyClinic(updates), []);

  // ── Users ────────────────────────────────────────────────────────────────────
  const getUsers   = useCallback(() => apiGetUsers(), []);
  const addUser    = useCallback((data) => apiAddUser(data), []);
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
    setActivePlan(planKey); // normalizes + saves
  }, [setActivePlan]);

  return (
    <AppContext.Provider value={{
      session, login, logout,
      // ── Plan ──
      activePlan,       // 'lite' | 'plus' | 'pro' | null
      setActivePlan,
      clearPlan,
      activatePlan,
      // ── Clinic ──
      refreshClinic, saveClinic,
      // ── Users ──
      getUsers, addUser, deleteUser, getMe,
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