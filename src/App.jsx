import React, { useState, useEffect } from 'react';
import ClientApp from './ClientApp';
import AdminPortal from './AdminPortal';
import SalesLedger from './SalesLedger';
import { supabase } from './utils/supabaseClient';
import { Lock, LogOut } from 'lucide-react';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#admin');
  const [currentUser, setCurrentUser] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Global Data States
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchProducts();
      fetchCustomers();
    }
  }, [currentUser]);

  const fetchProducts = async () => {
    try {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (data) setCustomers(data);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  };

  // --- ROBUST PIN LOGIN HANDLER ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setLoginError('Please enter a PIN code.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('pin_code', cleanPin);

      if (error) throw error;

      if (!data || data.length === 0) {
        setLoginError('Incorrect PIN code.');
      } else {
        const activeUser = data.find(u => u.is_active === true || u.is_active === 'true') || data[0];

        if (activeUser.is_active === false) {
          setLoginError('This account has been deactivated. Please contact an administrator.');
        } else {
          const normalizedUser = {
            ...activeUser,
            role: String(activeUser.role || 'staff').toLowerCase()
          };
          setCurrentUser(normalizedUser);
          setPinInput('');
        }
      }
    } catch (err) {
      setLoginError(`Login error: ${err.message || 'Server connection issue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPinInput('');
  };

  if (!isAdminRoute) {
    return <ClientApp />;
  }

  // --- PIN LOGIN SCREEN ---
  if (isAdminRoute && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-gray-100 p-8 shadow-xl flex flex-col items-center">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-9 h-9 text-orange-600" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Restricted Access</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">Please enter your PIN code</p>
            {loginError && (
              <p className="text-red-500 text-xs mt-3 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100">
                {loginError}
              </p>
            )}
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
              <input
                type="password"
                placeholder="••••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full bg-amber-50/70 border-2 border-slate-900/10 focus:border-slate-900 text-slate-900 text-center text-xl tracking-[0.4em] font-mono py-3.5 rounded-2xl outline-none transition-all placeholder:text-slate-400 placeholder:tracking-normal"
                maxLength={10}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !pinInput}
              className="w-full bg-black hover:bg-slate-800 disabled:bg-gray-300 text-white font-black py-3.5 rounded-2xl uppercase text-xs tracking-widest transition-all cursor-pointer shadow-md"
            >
              {isLoading ? 'VERIFYING...' : 'SIGN IN'}
            </button>
          </form>

          <div className="mt-8 pt-2 text-center">
            <button
              onClick={() => { window.location.hash = ''; setIsAdminRoute(false); }}
              className="text-xs text-slate-400 font-medium hover:text-slate-600 underline cursor-pointer"
            >
              Return to public storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ADMIN ROUTE ---
  if (currentUser && currentUser.role === 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc]">
        <div className="bg-black text-white text-xs px-4 py-2.5 flex justify-between items-center z-50">
          <div className="flex items-center space-x-3">
            <span className="font-bold">{currentUser.full_name}</span>
            <span className="bg-orange-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Admin</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-1.5 hover:text-amber-400 font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
        <div className="flex-grow">
          <AdminPortal 
            currentUser={currentUser} 
            supabase={supabase} 
            setView={() => { window.location.hash = ''; setIsAdminRoute(false); setCurrentUser(null); }} 
          />
        </div>
      </div>
    );
  }

  // --- STAFF ROUTE: RENDERS EXACT SALES LEDGER POS INTERFACE ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <div className="bg-black text-white text-xs px-4 py-2.5 flex justify-between items-center z-50">
        <div className="flex items-center space-x-3">
          <span className="font-bold">{currentUser.full_name}</span>
          <span className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Sales Staff</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-1.5 hover:text-amber-400 font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 flex-grow">
        <SalesLedger 
          products={products}
          customers={customers}
          fetchProducts={fetchProducts}
          fetchCustomers={fetchCustomers}
          supabase={supabase}
          currentUser={currentUser}
          activeBranchId={currentUser.branch_id || ''} 
        />
      </div>
    </div>
  );
}