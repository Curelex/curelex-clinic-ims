import React, { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";

const IMS_BASE =
  import.meta.env.VITE_IMS_API_URL || "http://localhost:5000/ims/api/v1";

export default function PharmacistDashboard() {
  const { logout } = useApp();
  const [status, setStatus] = useState("connecting");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;
    autoConnect();
  }, []);

  async function autoConnect() {
    if (localStorage.getItem("ims_token")) {
      window.location.replace("/ims");
      return;
    }

    const ssoToken = localStorage.getItem("ims_sso_token"); // ← FIXED
    if (!ssoToken) {
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(`${IMS_BASE}/auth/sso-exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ssoToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "SSO failed");

      localStorage.removeItem("ims_sso_token"); // ← FIXED
      localStorage.setItem("ims_token", data.token);
      window.location.replace("/ims");
    } catch (err) {
      console.error("SSO exchange failed:", err.message);
      setStatus("error");
    }
  }

  const wrap = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0a3d62 0%, #1565a8 60%, #00b894 100%)",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  };
  const card = {
    background: "#fff",
    borderRadius: 20,
    padding: "40px 36px",
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(10,61,98,0.28)",
  };

  if (status === "error") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 52 }}>⚠️</div>
          <h2 style={{ color: "#0a3d62", margin: "12px 0 8px" }}>
            Session Expired
          </h2>
          <p style={{ color: "#6b8299", marginBottom: 24 }}>
            Please log in again to open the Inventory System.
          </p>
          <button
            onClick={logout}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, #0a3d62, #1565a8)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>💊</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#0a3d62", marginBottom: 8 }}>
          Opening Inventory System…
        </div>
        <div style={{ color: "#8fa8bc", fontSize: 13, marginBottom: 24 }}>
          Please wait
        </div>
        <div style={{
          width: 36, height: 36, margin: "0 auto",
          border: "4px solid #e4eaf1",
          borderTop: "4px solid #1565a8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}