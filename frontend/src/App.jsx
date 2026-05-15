import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Import IMS App
import IMSApp from './ims/App';
// Import Clinic App  
import ClinicApp from './clinic/App';

// Optional: Landing page to choose system
function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-5xl font-bold mb-8">Welcome to Integrated System</h1>
        <div className="space-x-4">
          <a 
            href="/ims" 
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            📦 Inventory Management System
          </a>
          <a 
            href="/clinic" 
            className="inline-block bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            🏥 Clinic Management System
          </a>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* IMS System - all routes starting with /ims */}
        <Route path="/ims/*" element={<IMSApp />} />
        
        {/* Clinic System - all routes starting with /clinic */}
        <Route path="/clinic/*" element={<ClinicApp />} />
        
        {/* Redirect any unknown routes to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;