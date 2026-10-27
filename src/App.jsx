import React, { useState, useEffect } from 'react';
import ClientApp from './ClientApp';
import AdminPortal from './AdminPortal';
import { supabase } from './utils/supabaseClient';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#admin');

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isAdminRoute) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        <div className="bg-black text-white text-xs px-4 py-2.5 flex justify-between items-center z-50">
          <span className="font-bold uppercase tracking-wider">Chike Global Admin Dashboard</span>
          <button 
            onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }}
            className="hover:text-amber-400 font-bold transition-colors cursor-pointer"
          >
            ← Retour à la boutique publique
          </button>
        </div>
        <div className="flex-grow">
          <AdminPortal 
            currentUser={{ role: 'admin', full_name: 'Admin HQ' }} 
            supabase={supabase} 
            setView={() => { window.location.hash = ''; setIsAdminRoute(false); }} 
          />
        </div>
      </div>
    );
  }

  return <ClientApp />;
}