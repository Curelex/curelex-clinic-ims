import React, { useState, useEffect, useCallback } from 'react';

const CLINIC_BASE = import.meta.env.VITE_CLINIC_API_URL
  ? `${import.meta.env.VITE_CLINIC_API_URL}`
  : '/api/clinic';

// ── helpers ────────────────────────────────────────────────────────────────────
function getTodayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function authHeader() {
  // Try all possible token keys — IMS token, clinic token, fallback
  const token =
    localStorage.getItem('ims_token') ||
    localStorage.getItem('clinic_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path) {
  const res = await fetch(`${CLINIC_BASE}${path}`, { headers: authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `API error ${res.status}`);
  return data;
}

function PaymentBadge({ method }) {
  return method === 'upi' ? (
    <span style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      📲 UPI
    </span>
  ) : (
    <span style={{ background: 'rgba(0,184,148,0.10)', color: '#00a878', border: '1px solid rgba(0,184,148,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      💵 Cash
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    waiting: { bg: 'rgba(21,101,168,0.10)', color: '#1565a8', border: 'rgba(21,101,168,0.25)', label: '⏳ Waiting' },
    called:  { bg: 'rgba(243,156,18,0.10)', color: '#d68910', border: 'rgba(243,156,18,0.25)', label: '📢 Called'  },
    done:    { bg: 'rgba(0,184,148,0.10)',  color: '#00a878', border: 'rgba(0,184,148,0.25)', label: '✓ Done'    },
  };
  const s = map[status] || map.waiting;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ── File row (download only) ────────────────────────────────────────────────
function FileRow({ file, patientId }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`${CLINIC_BASE}/patients/${patientId}/files/${file._id}`, {
        headers: authHeader(),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Download failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const isPdf   = file.mimeType === 'application/pdf';
  const isImage = file.mimeType?.startsWith('image/');
  const icon    = isPdf ? '📄' : isImage ? '🖼️' : '📎';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f7f9fc', border: '1px solid #e8eff6', borderRadius: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0a3d62' }}>{file.filename}</div>
        <div style={{ fontSize: 11, color: '#8fa8bc' }}>
          {(file.size / 1024).toFixed(1)} KB · {file.uploadedBy} · {new Date(file.uploadedAt).toLocaleDateString('en-IN')}
        </div>
      </div>
      <button
        onClick={download}
        disabled={loading}
        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
      >
        {loading ? '⏳' : '⬇ Download'}
      </button>
    </div>
  );
}

// ── Patient row (expandable) ────────────────────────────────────────────────
function PatientRow({ patient: p, isLast }) {
  const [expanded,  setExpanded]  = useState(false);
  const [files,     setFiles]     = useState([]);
  const [loadingF,  setLoadingF]  = useState(false);
  const [loadedF,   setLoadedF]   = useState(false);
  const pid = p._id || p.id;

  async function loadFiles() {
    if (loadedF) return;
    setLoadingF(true);
    try {
      const data = await apiFetch(`/patients/${pid}/files`);
      setFiles(Array.isArray(data) ? data : (data?.files || []));
      setLoadedF(true);
    } catch (e) {
      console.error('Files load error:', e);
      setFiles([]);
      setLoadedF(true);
    } finally {
      setLoadingF(false);
    }
  }

  function toggle() {
    setExpanded(v => !v);
    if (!loadedF) loadFiles();
  }

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #eef1f5' }}>
      {/* ── main row ── */}
      <div
        onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: expanded ? 'rgba(21,101,168,0.03)' : '#fff', transition: 'background 0.15s' }}
      >
        {/* token badge */}
        <div style={{ width: 38, height: 38, borderRadius: 10, background: p.status === 'done' ? '#e8eff6' : 'linear-gradient(135deg, #0a3d62, #1565a8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.status === 'done' ? '#8fa8bc' : '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
          {p.token}
        </div>

        {/* patient info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: p.status === 'done' ? '#8fa8bc' : '#0a3d62', textDecoration: p.status === 'done' ? 'line-through' : 'none' }}>{p.name}</span>
            {p.age && <span style={{ fontSize: 12, color: '#8fa8bc' }}>{p.gender === 'female' ? '♀' : '♂'} {p.age} yrs</span>}
            <StatusBadge status={p.status} />
            <PaymentBadge method={p.paymentMethod} />
            {p.dues > 0 && <span style={{ fontSize: 11, color: '#e74c3c', fontWeight: 700 }}>⚠️ Due Rs.{p.dues}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#4a6278', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            🩺 {p.symptoms?.substring(0, 80)}{p.symptoms?.length > 80 ? '…' : ''}
          </div>
          <div style={{ fontSize: 11, color: '#8fa8bc', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span>🕐 {p.time}</span>
            {p.phone && <span>📞 {p.phone}</span>}
            {p.followUpDate && <span style={{ color: '#7c3aed' }}>📅 {p.followUpDate}</span>}
          </div>
        </div>

        {/* fee summary */}
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
          {p.paid > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: '#00a878' }}>Rs.{p.paid}</div>}
          {p.dues > 0 && <div style={{ fontSize: 11, color: '#e74c3c', fontWeight: 600 }}>Due Rs.{p.dues}</div>}
          <div style={{ fontSize: 11, color: '#8fa8bc', marginTop: 2 }}>{expanded ? '▲ hide' : '▼ files'}</div>
        </div>
      </div>

      {/* ── files panel ── */}
      {expanded && (
        <div style={{ padding: '10px 16px 14px 66px', borderTop: '1px dashed #e8eff6', background: 'rgba(21,101,168,0.02)' }}>
          {loadingF ? (
            <div style={{ fontSize: 12, color: '#8fa8bc', padding: '8px 0' }}>⏳ Loading files…</div>
          ) : files.length === 0 ? (
            <div style={{ fontSize: 12, color: '#8fa8bc', padding: '8px 0' }}>📁 No files uploaded for this visit.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4a6278', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                📎 {files.length} file{files.length !== 1 ? 's' : ''} — uploaded by doctor / receptionist
              </div>
              {files.map(f => (
                <FileRow key={String(f._id)} file={f} patientId={pid} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Doctor section ──────────────────────────────────────────────────────────
function DoctorSection({ doctor, patients, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const total   = patients.length;
  const done    = patients.filter(p => p.status === 'done').length;
  const waiting = patients.filter(p => p.status === 'waiting').length;
  const revenue = patients.reduce((s, p) => s + (p.paid || 0), 0);
  const dues    = patients.reduce((s, p) => s + (p.dues || 0), 0);
  const files   = patients.reduce((s, p) => s + (p.fileCount || 0), 0);

  return (
    <div style={{ marginBottom: 16, border: '1.5px solid #dce9f5', borderRadius: 14, overflow: 'hidden' }}>
      {/* header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: 'linear-gradient(90deg, #0a3d62, #1565a8)', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👨‍⚕️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{doctor.name}</div>
          {doctor.specialist && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{doctor.specialist}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>🎫 {total}</span>
          <span style={{ background: 'rgba(0,220,130,0.25)', color: '#c8fce8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>✓ {done}</span>
          <span style={{ background: 'rgba(255,200,80,0.20)', color: '#ffe9a0', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>⏳ {waiting}</span>
          {revenue > 0 && <span style={{ background: 'rgba(0,220,130,0.20)', color: '#c8fce8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>💰 Rs.{revenue.toLocaleString()}</span>}
          {dues    > 0 && <span style={{ background: 'rgba(255,80,80,0.22)',  color: '#ffc8c8', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>⚠️ Rs.{dues.toLocaleString()}</span>}
          {files   > 0 && <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>📎 {files}</span>}
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* patients list */}
      {open && (
        patients.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8fa8bc', fontSize: 13, background: '#fff' }}>No patients for this filter.</div>
        ) : (
          <div style={{ background: '#fff' }}>
            {patients.map((p, i) => (
              <PatientRow key={p._id || p.id} patient={p} isLast={i === patients.length - 1} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AllPatientsIMS() {
  const [patients,    setPatients]    = useState([]);
  const [doctors,     setDoctors]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [dateFilter,  setDateFilter]  = useState('today');
  const [doctorFilter,setDoctorFilter]= useState('all');
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');

  const todayStr = getTodayIST();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const pData = await apiFetch('/patients');
      const pats = Array.isArray(pData) ? pData : (pData?.patients || []);
      setPatients(pats);

      // Build unique doctors list from patient data — no /users call needed
      const doctorMap = {};
      pats.forEach(p => {
        if (p.doctorId && !doctorMap[p.doctorId]) {
          doctorMap[p.doctorId] = { _id: p.doctorId, name: p.doctorName || 'Unknown Doctor' };
        }
      });
      setDoctors(Object.values(doctorMap));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── filtering ──
  const filtered = patients.filter(p => {
    const matchDate =
      dateFilter === 'today'    ? p.date === todayStr :
      dateFilter === 'week'     ? p.date >= (() => { const d=new Date(); d.setDate(d.getDate()-6); return d.toISOString().split('T')[0]; })() :
      true;
    const matchDoctor = doctorFilter === 'all' || String(p.doctorId) === doctorFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || String(p.token).includes(search) || p.phone?.includes(search);
    return matchDate && matchDoctor && matchStatus && matchSearch;
  });

  // group by doctor
  const grouped = {};
  filtered.forEach(p => {
    const key = String(p.doctorId || 'unknown');
    if (!grouped[key]) grouped[key] = { patients: [], name: p.doctorName || 'Unknown Doctor', id: key };
    grouped[key].patients.push(p);
  });

  // sort each group by token
  Object.values(grouped).forEach(g => g.patients.sort((a, b) => a.token - b.token));

  const totalPaid = filtered.reduce((s, p) => s + (p.paid || 0), 0);
  const totalDues = filtered.reduce((s, p) => s + (p.dues || 0), 0);

  const inputStyle = { padding: '8px 12px', borderRadius: 9, border: '1.5px solid #d0dce8', fontSize: 13, fontFamily: 'inherit', color: '#0a3d62', background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0a3d62', marginBottom: 4 }}>All Patients</h1>
        <p style={{ fontSize: 13, color: '#8fa8bc', margin: 0 }}>All patients across all doctors — click any row to view uploaded files</p>
      </div>

      {/* ── summary stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Patients', value: filtered.length,              icon: '👥', color: '#1565a8', bg: 'rgba(21,101,168,0.08)',  border: 'rgba(21,101,168,0.18)'  },
          { label: 'Completed',      value: filtered.filter(p=>p.status==='done').length,    icon: '✅', color: '#00a878', bg: 'rgba(0,184,148,0.08)',   border: 'rgba(0,184,148,0.18)'   },
          { label: 'Still Waiting',  value: filtered.filter(p=>p.status==='waiting').length, icon: '⏳', color: '#d68910', bg: 'rgba(214,137,16,0.08)',  border: 'rgba(214,137,16,0.18)'  },
          { label: 'Revenue Rs.',    value: `Rs.${totalPaid.toLocaleString()}`, icon: '💰', color: '#00a878', bg: 'rgba(0,184,148,0.08)',   border: 'rgba(0,184,148,0.18)'   },
          { label: 'Dues Rs.',       value: `Rs.${totalDues.toLocaleString()}`, icon: '⚠️', color: '#e74c3c', bg: 'rgba(231,76,60,0.08)',   border: 'rgba(231,76,60,0.18)'   },
        ].map(({ label, value, icon, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, color: '#8fa8bc', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── filters ── */}
      <div style={{ background: '#fff', border: '1.5px solid #dce9f5', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* search */}
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Search</label>
          <input
            style={inputStyle}
            placeholder="Name, token, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* date */}
        <div style={{ flex: '0 0 140px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Date</label>
          <select style={selectStyle} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        {/* doctor */}
        <div style={{ flex: '0 0 180px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Doctor</label>
          <select style={selectStyle} value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}>
            <option value="all">All Doctors</option>
            {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        {/* status */}
        <div style={{ flex: '0 0 140px' }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#8fa8bc', textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>Status</label>
          <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="waiting">Waiting</option>
            <option value="called">Called</option>
            <option value="done">Done</option>
          </select>
        </div>
        {/* refresh */}
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid #d0dce8', background: '#fff', color: '#1565a8', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
        >
          {loading ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      {/* ── content ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8fa8bc' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
          <div style={{ fontSize: 14 }}>Loading patients…</div>
        </div>
      ) : error ? (
        <div style={{ background: 'rgba(231,76,60,0.08)', border: '1.5px solid rgba(231,76,60,0.25)', borderRadius: 12, padding: '20px 24px', color: '#c0392b', textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Failed to load patients</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{error}</div>
          <button onClick={load} style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid rgba(231,76,60,0.3)', background: '#fff', color: '#c0392b', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#fff', border: '1.5px solid #dce9f5', borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🪑</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#0a3d62', marginBottom: 6 }}>No patients found</div>
          <div style={{ fontSize: 13, color: '#8fa8bc' }}>Try adjusting your filters above.</div>
        </div>
      ) : (
        <>
          {/* tip */}
          <div style={{ background: 'rgba(21,101,168,0.05)', border: '1px solid rgba(21,101,168,0.15)', borderRadius: 10, padding: '9px 14px', marginBottom: 16, fontSize: 12, color: '#1565a8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💡</span>
            <span>Click any patient row to view files uploaded by the doctor or receptionist for that visit.</span>
          </div>

          {/* doctor sections */}
          {Object.values(grouped).map((g, i) => (
            <DoctorSection
              key={g.id}
              doctor={{ name: g.name, id: g.id, specialist: doctors.find(d => String(d._id) === g.id)?.specialist }}
              patients={g.patients}
              defaultOpen={i === 0}
            />
          ))}
        </>
      )}
    </div>
  );
}