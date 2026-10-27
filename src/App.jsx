import React, { useState, useEffect } from 'react';
import ClientApp from './ClientApp';
import AdminPortal from './AdminPortal';
import { supabase } from './utils/supabaseClient';
import { Lock, LogOut, ShoppingCart, Search, Plus, Minus } from 'lucide-react';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#admin');
  const [currentUser, setCurrentUser] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Staff POS states
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submittingSale, setSubmittingSale] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminRoute(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'staff') {
      fetchStaffBranchData();
    }
  }, [currentUser]);

  const fetchStaffBranchData = async () => {
    try {
      const [prodRes, branchRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_archived', false),
        supabase.from('branches').select('*')
      ]);
      if (prodRes.data) setProducts(prodRes.data);
      if (branchRes.data) setBranches(branchRes.data);
    } catch (err) {
      console.error("Error fetching staff data:", err);
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
      // Query without .single() to avoid PGRST116 multi-row / single row errors
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('pin_code', cleanPin);

      if (error) throw error;

      if (!data || data.length === 0) {
        setLoginError('Incorrect PIN code.');
      } else {
        const activeUser = data.find(u => u.is_active) || data[0];

        if (!activeUser.is_active) {
          setLoginError('This account has been deactivated. Please contact an administrator.');
        } else {
          setCurrentUser(activeUser);
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
    setCart([]);
  };

  // --- Staff POS Cart Handlers ---
  const handleAddToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleUpdateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert('Your cart is empty.');
    if (!customerName.trim()) return alert('Please enter customer name.');

    setSubmittingSale(true);
    try {
      const paid = parseFloat(amountPaid) || cartTotal;
      const debt = Math.max(0, cartTotal - paid);

      // 1. Create or retrieve customer
      let customerId = null;
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customerPhone.trim() || 'N/A')
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert([{
            name: customerName.trim(),
            phone: customerPhone.trim() || 'N/A',
            branch_id: currentUser.branch_id || null
          }])
          .select()
          .single();
        if (custErr) throw custErr;
        customerId = newCust.id;
      }

      // 2. Insert sale record (links staff_id & staff_name so Admin dashboard displays it)
      const salePayload = {
        customer_id: customerId,
        staff_id: currentUser.id,
        staff_name: currentUser.full_name,
        branch_id: currentUser.branch_id || null,
        total: cartTotal,
        amount_paid: paid,
        debt: debt,
        items: cart.map(i => ({ productId: i.id, name: i.name, price: i.price, qty: i.qty })),
        created_at: new Date().toISOString()
      };

      const { error: saleErr } = await supabase.from('customer_history').insert([salePayload]);
      if (saleErr) throw saleErr;

      // 3. Deduct stock quantities in Supabase
      for (const item of cart) {
        const newStock = Math.max(0, item.quantity - item.qty);
        await supabase
          .from('products')
          .update({ quantity: newStock, stock_status: newStock > 0 })
          .eq('id', item.id);
      }

      alert('Sale recorded successfully!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setAmountPaid('');
      fetchStaffBranchData();
    } catch (err) {
      alert(`Checkout error: ${err.message}`);
    } finally {
      setSubmittingSale(false);
    }
  };

  if (!isAdminRoute) {
    return <ClientApp />;
  }

  // --- PIN Login Screen ---
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

  // --- ADMIN DASHBOARD ROUTE ---
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

  // --- STAFF SALES REGISTER ROUTE ---
  const staffBranch = branches.find(b => String(b.id) === String(currentUser.branch_id));
  const branchProducts = products.filter(p => {
    if (!currentUser.branch_id) return !p.branch_id || p.branch_id === '';
    return String(p.branch_id) === String(currentUser.branch_id);
  });
  const filteredProducts = branchProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <div className="bg-black text-white text-xs px-4 py-3 flex justify-between items-center z-50 shadow-md">
        <div className="flex items-center space-x-3">
          <span className="font-bold text-sm">{currentUser.full_name}</span>
          <span className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Sales Staff</span>
          <span className="text-amber-400 font-semibold">| Branch: {staffBranch ? staffBranch.name : 'Headquarters (HQ)'}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-1.5 hover:text-amber-400 font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      <div className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PRODUCT CATALOG */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase">Branch Sales Register</h2>
              <p className="text-xs text-slate-500">Select products to process customer sales.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-slate-50 outline-none focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[650px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <p className="text-xs text-slate-400 italic col-span-full py-8 text-center">No products available in this branch.</p>
            ) : (
              filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => product.quantity > 0 && handleAddToCart(product)}
                  className={`bg-white rounded-xl border p-3 flex flex-col justify-between transition-all ${
                    product.quantity > 0 ? 'hover:shadow-md cursor-pointer border-slate-200 hover:border-orange-400' : 'opacity-50 cursor-not-allowed bg-slate-50'
                  }`}
                >
                  <img src={product.image_url} alt={product.name} className="h-32 w-full object-cover rounded-lg mb-2" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                    <p className="text-[10px] text-slate-500">Stock: {product.quantity}</p>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t">
                    <span className="text-xs font-black text-orange-600">#{product.price?.toLocaleString()}</span>
                    <button 
                      disabled={product.quantity <= 0}
                      className="p-1.5 bg-black text-white rounded-lg hover:bg-slate-800 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CART & CHECKOUT PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-sm uppercase text-slate-900">Current Order</h3>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 divide-y">
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Cart is empty.</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="pt-2 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-500">#{item.price?.toLocaleString()} × {item.qty}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleUpdateQty(item.id, -1)} className="p-1 bg-slate-100 rounded hover:bg-slate-200"><Minus className="w-3 h-3" /></button>
                      <span className="font-bold">{item.qty}</span>
                      <button onClick={() => handleUpdateQty(item.id, 1)} className="p-1 bg-slate-100 rounded hover:bg-slate-200"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between items-center font-black text-sm">
                <span>Total:</span>
                <span className="text-emerald-600">#{cartTotal.toLocaleString()}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-2.5">
                <input 
                  type="text"
                  placeholder="Customer Full Name *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full border p-2 text-xs rounded-xl bg-slate-50 outline-none focus:bg-white"
                  required
                />
                <input 
                  type="text"
                  placeholder="Customer Phone Number"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full border p-2 text-xs rounded-xl bg-slate-50 outline-none focus:bg-white"
                />
                <input 
                  type="number"
                  placeholder={`Amount Paid (Default: #${cartTotal})`}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="w-full border p-2 text-xs rounded-xl bg-slate-50 outline-none focus:bg-white"
                />

                <button 
                  type="submit"
                  disabled={submittingSale || cart.length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl uppercase text-xs tracking-wider transition-colors cursor-pointer shadow-sm mt-2"
                >
                  {submittingSale ? 'Processing...' : 'Complete Sale'}
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}