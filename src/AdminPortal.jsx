import React, { useState, useEffect, useRef } from 'react';
import { 
  Boxes, 
  UsersRound, 
  Eye, 
  EyeOff, 
  UserCog, 
  Building2, 
  ListFilter, 
  ShieldCheck, 
  Globe, 
  ShieldAlert, 
  Sparkles,
  LogOut,
  FolderPlus,
  Package,
  Layers,
  Edit3,
  Trash2,
  DollarSign,
  ImageIcon,
  X,
  Lock,
  Unlock,
  RotateCcw,
  Archive
} from 'lucide-react';
import SalesLedger from './SalesLedger';
import InventoryManagement from './components/InventoryManagement';
import BranchManagement from './components/BranchManagement';
import BatchTransferModal from './components/BatchTransferModal';
import TransferHistoryModal from './components/TransferHistoryModal';
import StaffManagement from './StaffManagement';

export default function AdminApp({ currentUser, supabase, setView }) {
  // --- AUTHENTICATION & SESSION STATES (From Website 1) ---
  const [session, setSession] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- NAVIGATION TAB STATE ---
  const [activeTab, setActiveTab] = useState('inventory'); 

  // --- DATA STATES ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [transferLogs, setTransferLogs] = useState([]);

  // --- CATEGORY STATES (From Website 1) ---
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoryActionLoading, setCategoryActionLoading] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // --- PRIVACY / FINANCIAL VISIBILITY STATES ---
  const [showFinancials, setShowFinancials] = useState(false);
  const autoHideTimerRef = useRef(null);

  // --- BRANCH & INVENTORY FILTER STATES ---
  const [viewingBranch, setViewingBranch] = useState(''); 
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // --- STOREFRONT CONTROL STATES ---
  const [storefrontBranch, setStorefrontBranch] = useState(() => {
    return localStorage.getItem('donchike_storefront_branch') || '';
  });
  const [liveStoreBranch, setLiveStoreBranch] = useState('');

  // --- FORM STATES ---
  // Branch Form
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [editingBranch, setEditingBranch] = useState(null);

  // Staff Form
  const [staffName, setStaffName] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [staffRole, setStaffRole] = useState('staff');
  const [staffBranch, setStaffBranch] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);

  // Inventory & Product Form
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [batch, setBatch] = useState('');
  const [productBranch, setProductBranch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // --- BATCH TRANSFER MODAL STATES ---
  const [batchTransferOpen, setBatchTransferOpen] = useState(false);
  const [batchTransferStep, setBatchTransferStep] = useState('select'); 
  const [selectedBatchItems, setSelectedBatchItems] = useState({}); 
  const [batchTransferLoading, setBatchTransferLoading] = useState(false);
  const [batchTransferError, setBatchTransferError] = useState('');

  // --- TRANSFER HISTORY MODAL STATE ---
  const [transferHistoryOpen, setTransferHistoryOpen] = useState(false);

  const activeBranchId = viewingBranch;

  // --- INITIAL AUTH & DATA FETCHING ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllAppData();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllAppData();
    });

    return () => {
      subscription.unsubscribe();
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('donchike_storefront_branch', storefrontBranch);
  }, [storefrontBranch]);

  useEffect(() => {
    if (session) {
      fetchAllAppData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (viewingBranch !== 'ALL') {
      setProductBranch(viewingBranch);
    } else {
      setProductBranch('');
    }
  }, [viewingBranch]);

  const fetchAllAppData = async () => {
    fetchBranchesFromSupabase();
    fetchCategoriesFromSupabase();
    fetchProducts();
    fetchCustomersFromSupabase();
    fetchTransferLogs();
    fetchStaffFromSupabase();
    fetchStoreSettings();
  };

  // --- AUTHENTICATION HANDLERS (Supabase Real-Time Auth) ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setAdminEmail('');
        setAdminPassword('');
        setSession(data.session);
        fetchAllAppData();
      }
    } catch (err) {
      setAuthError('An unexpected authentication error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    if (setView) setView('client');
  };

  // --- FETCHING FUNCTIONS ---
  const fetchCategoriesFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (!error && data) setCategories(data);
    } catch (err) {
      console.error("Erreur chargement catégories:", err);
    }
  };

  const fetchBranchesFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('branches').select('*').order('created_at', { ascending: true });
      if (!error && data) setBranches(data);
    } catch (err) { 
      console.error("Erreur branches:", err); 
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (err) { 
      console.error("Erreur produits:", err); 
    }
  };

  const fetchCustomersFromSupabase = async () => {
    try {
      const { data: cData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      let rawCustomers = cData || [];

      let historyData = [];
      const [res1, res2, res3] = await Promise.all([
        supabase.from('customer_history').select('*'),
        supabase.from('sales_ledger').select('*'),
        supabase.from('sales').select('*')
      ]);

      if (res2.data && res2.data.length > 0) historyData = [...historyData, ...res2.data];
      if (res1.data && res1.data.length > 0) historyData = [...historyData, ...res1.data];
      if (res3.data && res3.data.length > 0) historyData = [...historyData, ...res3.data];

      const uniqueHistoryMap = new Map();
      historyData.forEach(item => {
        if (item.id) uniqueHistoryMap.set(item.id, item);
      });
      historyData = Array.from(uniqueHistoryMap.values());

      rawCustomers = rawCustomers.map(c => {
        const cHist = historyData.filter(h => 
          String(h.customer_id || h.customerId || h.client_id) === String(c.id)
        );
        return { ...c, customer_history: cHist };
      });

      const formatted = rawCustomers.map(c => {
        const rawHistory = c.customer_history || [];
        const formattedHistory = rawHistory.map(h => {
          let parsedItems = [];
          if (h.items) {
            if (typeof h.items === 'string') {
              try { parsedItems = JSON.parse(h.items); } catch (e) { parsedItems = []; }
            } else if (Array.isArray(h.items)) {
              parsedItems = h.items;
            }
          }

          const itemSum = parsedItems.reduce((acc, it) => {
            const pr = parseFloat(it.price || it.unit_price || 0) || 0;
            const qt = parseInt(it.qty || it.quantity || 1) || 1;
            return acc + (pr * qt);
          }, 0);

          const totalAmt = parseFloat(h.total_amount ?? h.total ?? h.amount ?? h.grand_total ?? itemSum) || itemSum;
          const paidAmt = parseFloat(h.amount_paid ?? h.paid ?? h.paid_amount ?? 0) || 0;
          let debtAmt = parseFloat(h.debt ?? h.balance ?? h.amount_due ?? 0) || 0;

          if (debtAmt === 0 && totalAmt > paidAmt && paidAmt > 0) {
            debtAmt = totalAmt - paidAmt;
          }

          return {
            ...h,
            id: h.id,
            total: totalAmt,
            total_amount: totalAmt,
            amount_paid: paidAmt,
            debt: debtAmt,
            items: parsedItems,
            productId: h.product_id || h.productId
          };
        }).sort((a, b) => b.id - a.id);

        const directDebt = parseFloat(c.total_debt ?? c.totalDebt ?? c.debt ?? c.balance ?? 0) || 0;
        const historyDebtSum = formattedHistory.reduce((acc, h) => acc + (parseFloat(h.debt) || 0), 0);

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          branch_id: c.branch_id,
          totalDebt: Math.max(directDebt, historyDebtSum),
          history: formattedHistory
        };
      });

      setCustomers(formatted);
    } catch (err) { 
      console.error("Erreur clients:", err.message); 
    }
  };

  const fetchStaffFromSupabase = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('*').order('created_at', { ascending: false });
      if (!error && data) setStaffList(data);
    } catch (err) { 
      console.error("Erreur personnel:", err); 
    }
  };

  const fetchTransferLogs = async () => {
    try {
      const { data, error } = await supabase.from('stock_transfers').select('*').order('created_at', { ascending: false });
      if (!error && data) setTransferLogs(data);
    } catch (err) {
      console.log("Journal des transferts non encore disponible.");
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const { data } = await supabase.from('store_settings').select('active_branch').single();
      if (data) setLiveStoreBranch(data.active_branch || '');
    } catch (err) {
      console.log("Store settings defaultHQ.");
    }
  };

  // --- CATEGORY HANDLERS (From Website 1) ---
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCategoryCreating(true);
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim() }]);
      if (error) throw error;
      setNewCategoryName('');
      await fetchCategoriesFromSupabase();
      alert('Catégorie créée avec succès !');
    } catch (err) {
      alert(`Erreur Catégorie: ${err.message}`);
    } finally {
      setCategoryCreating(false);
    }
  };

  const startEditCategory = (category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName('');
  };

  const handleUpdateCategory = async (e, id) => {
    e.preventDefault();
    if (!editCategoryName.trim()) return;

    setCategoryActionLoading(true);
    try {
      const { error } = await supabase.from('categories').update({ name: editCategoryName.trim() }).eq('id', id);
      if (error) throw error;
      cancelEditCategory();
      await fetchCategoriesFromSupabase();
    } catch (err) {
      alert(`Erreur mise à jour catégorie: ${err.message}`);
    } finally {
      setCategoryActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return;
    setCategoryActionLoading(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      await fetchCategoriesFromSupabase();
    } catch (err) {
      alert(`Erreur suppression catégorie: ${err.message}`);
    } finally {
      setCategoryActionLoading(false);
    }
  };

  // --- FINANCIAL SECURITY & VISIBILITY ---
  const handleToggleFinancialVisibility = () => {
    if (showFinancials) {
      setShowFinancials(false);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    } else {
      setShowFinancials(true);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = setTimeout(() => setShowFinancials(false), 10 * 60 * 1000);
    }
  };

  const formatMoney = (amount) => {
    if (!showFinancials) return '••••••••';
    return `${(amount || 0).toLocaleString()} FCFA`;
  };

  // --- BRANCH & STOREFRONT HANDLERS ---
  const handleUpdateLiveBranch = async (newBranchId) => {
    try {
      const { error } = await supabase.from('store_settings').upsert({ id: 1, active_branch: newBranchId }, { onConflict: 'id' });
      if (error) throw error;
      setLiveStoreBranch(newBranchId);
      alert("Succursale en ligne mise à jour avec succès !");
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchName) return;
    try {
      const payload = { name: branchName.trim(), location: branchLocation.trim() };
      if (editingBranch) {
        await supabase.from('branches').update(payload).eq('id', editingBranch.id);
        alert('Succursale mise à jour !');
      } else {
        await supabase.from('branches').insert([payload]);
        alert('Nouvelle succursale créée !');
      }
      setBranchName(''); setBranchLocation(''); setEditingBranch(null);
      fetchBranchesFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleDeleteBranch = async (branchId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette succursale ?')) return;
    try {
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
      if (error) throw error;
      if (viewingBranch === branchId) setViewingBranch('');
      fetchBranchesFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleReassignStaff = async (staffId, newBranchId) => {
    try {
      const { error } = await supabase.from('staff').update({ branch_id: newBranchId || null }).eq('id', staffId);
      if (error) throw error;
      fetchStaffFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffName || !staffPin) return;
    try {
      const payload = {
        full_name: staffName.trim(),
        pin_code: staffPin.trim(),
        role: staffRole,
        branch_id: staffBranch || null,
        is_active: true
      };
      if (editingStaff) {
        await supabase.from('staff').update(payload).eq('id', editingStaff.id);
      } else {
        await supabase.from('staff').insert([payload]);
      }
      setStaffName(''); setStaffPin(''); setStaffRole('staff'); setStaffBranch(''); setEditingStaff(null);
      fetchStaffFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleToggleStaffStatus = async (id, currentStatus) => {
    try {
      await supabase.from('staff').update({ is_active: !currentStatus }).eq('id', id);
      fetchStaffFromSupabase();
    } catch (err) { alert(`Erreur: ${err.message}`); }
  };

  const handleStartEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setStaffName(staffMember.full_name || '');
    setStaffPin(staffMember.pin_code || '');
    setStaffRole(staffMember.role || 'staff');
    setStaffBranch(staffMember.branch_id || '');
    setActiveTab('staff');
  };

  // --- IMAGE COMPRESSION & PRODUCT MANAGEMENT ---
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => { 
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image(); img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width; let height = img.height;
          if (width > height) { if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; } }
          else { if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' })), 'image/jpeg', quality);
        };
      };
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || quantity === '' || !batch) return;
    setUploading(true);
    let image_url = editingProduct ? editingProduct.image_url : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80';
    try {
      if (imageFile) {
        let fileToUpload = await compressImage(imageFile, 800, 800, 0.8);
        const fileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('product-images').upload(fileName, fileToUpload);
        if (!upErr) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
          if (data?.publicUrl) image_url = data.publicUrl;
        }
      }

      const parsedQty = parseInt(quantity) || 0;
      const parsedInitQty = initialQuantity !== '' ? parseInt(initialQuantity) : (editingProduct ? editingProduct.initial_quantity : parsedQty);

      const payload = { 
        name: name.trim(), 
        description: description.trim(), 
        price: parseFloat(price),
        cost_price: parseFloat(costPrice) || 0,
        image_url, 
        quantity: parsedQty, 
        initial_quantity: parsedInitQty || parsedQty,
        stock_status: parsedQty > 0, 
        batch_reference: batch.trim().toUpperCase(),
        branch_id: productBranch || null,
        category_id: categoryId ? parseInt(categoryId) : null,
        is_archived: false
      };

      if (editingProduct) {
        await supabase.from('products').update(payload).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert([payload]);
      }

      handleCancelEditProduct();
      await fetchProducts();
      alert('Produit enregistré avec succès !');
    } catch (err) { 
      alert(`Erreur: ${err.message}`); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleStartEditProduct = (p) => {
    setEditingProduct(p); 
    setName(p.name); 
    setPrice(p.price); 
    setCostPrice(p.cost_price || '');
    setQuantity(p.quantity); 
    setInitialQuantity(p.initial_quantity !== undefined ? p.initial_quantity : p.quantity);
    setCategoryId(p.category_id || '');
    setDescription(p.description || ''); 
    setBatch(p.batch_reference || ''); 
    setProductBranch(p.branch_id || '');
  };

  const handleCancelEditProduct = () => {
    setEditingProduct(null); setName(''); setPrice(''); setCostPrice(''); setQuantity(''); 
    setInitialQuantity(''); setCategoryId(''); setDescription(''); setBatch(''); setImageFile(null); setProductBranch('');
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    await supabase.from('products').update({ quantity: parsedVolume, stock_status: parsedVolume > 0 }).eq('id', id);
    setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, quantity: parsedVolume, stock_status: parsedVolume > 0 } : p));
  };

  const handleArchiveProduct = async (id, archiveState = true) => {
    if (!window.confirm(archiveState ? 'Archiver ce produit ?' : 'Restaurer ce produit ?')) return;
    await supabase.from('products').update({ is_archived: archiveState }).eq('id', id);
    setProducts(prev => prev.map(p => String(p.id) === String(id) ? { ...p, is_archived: archiveState } : p));
  };

  // --- BATCH TRANSFER HANDLERS ---
  const handleOpenBatchTransfer = () => {
    setSelectedBatchItems({});
    setBatchTransferStep('select');
    setBatchTransferError('');
    setBatchTransferOpen(true);
  };

  const handleOpenTransferHistory = () => {
    fetchTransferLogs();
    setTransferHistoryOpen(true);
  };

  const handleToggleBatchItemSelect = (product) => {
    setSelectedBatchItems(prev => {
      const copy = { ...prev };
      if (copy[product.id]?.selected) {
        delete copy[product.id];
      } else {
        copy[product.id] = { product, selected: true, targetBranch: branches[0]?.id || '', qty: 1 };
      }
      return copy;
    });
  };

  const handleUpdateBatchItemDetail = (productId, field, value) => {
    setSelectedBatchItems(prev => {
      if (!prev[productId]) return prev;
      return { ...prev, [productId]: { ...prev[productId], [field]: value } };
    });
  };

  const handleProceedToBatchReview = () => {
    const activeItems = Object.values(selectedBatchItems).filter(item => item.selected);
    if (activeItems.length === 0) {
      setBatchTransferError("Veuillez sélectionner au moins un produit.");
      return;
    }
    setBatchTransferError('');
    setBatchTransferStep('review');
  };

  const handleConfirmBatchTransfer = async () => {
    setBatchTransferLoading(true);
    setBatchTransferError('');

    try {
      const activeItems = Object.values(selectedBatchItems).filter(item => item.selected);
      const transferRef = `TRF-${Date.now().toString().slice(-6)}`;
      const transferSummary = [];

      for (const item of activeItems) {
        const { product, targetBranch, qty } = item;
        const transferQty = Number(qty) || 0;

        const newHqQty = product.quantity - transferQty;
        await supabase.from('products').update({ quantity: newHqQty, stock_status: newHqQty > 0 }).eq('id', product.id);

        const existingTargetProd = products.find(p => 
          p.name.trim().toLowerCase() === product.name.trim().toLowerCase() && 
          String(p.batch_reference || '').trim().toUpperCase() === String(product.batch_reference || '').trim().toUpperCase() && 
          String(p.branch_id || '') === String(targetBranch)
        );

        if (existingTargetProd) {
          const newTargetQty = (existingTargetProd.quantity || 0) + transferQty;
          await supabase.from('products').update({ quantity: newTargetQty, stock_status: newTargetQty > 0 }).eq('id', existingTargetProd.id);
        } else {
          const { id, created_at, ...prodData } = product;
          prodData.branch_id = targetBranch;
          prodData.quantity = transferQty;
          prodData.initial_quantity = transferQty;
          prodData.stock_status = true;
          await supabase.from('products').insert([prodData]);
        }

        const targetBranchObj = branches.find(b => String(b.id) === String(targetBranch));
        transferSummary.push({
          product_id: product.id,
          product_name: product.name,
          batch_reference: product.batch_reference || 'N/A',
          qty: transferQty,
          target_branch_id: targetBranch,
          target_branch_name: targetBranchObj?.name || 'Succursale'
        });
      }

      const newLogRecord = {
        transfer_ref: transferRef,
        items: transferSummary,
        created_by: session?.user?.email || 'Admin HQ',
        created_at: new Date().toISOString()
      };

      await supabase.from('stock_transfers').insert([newLogRecord]);
      setBatchTransferLoading(false);
      setBatchTransferOpen(false);
      await fetchProducts();
      await fetchTransferLogs();
      alert(`Transfert effectué avec succès ! Réf: ${transferRef}`);
    } catch (err) {
      setBatchTransferError(`Erreur: ${err.message}`);
      setBatchTransferLoading(false);
    }
  };

  // --- COMPUTED FINANCIAL METRICS & FILTERS ---
  const contextProducts = products.filter(p => {
    if (activeBranchId === 'ALL' || activeBranchId === '') return true;
    return String(p.branch_id || '') === String(activeBranchId);
  });

  const contextCustomers = customers.filter(c => {
    if (activeBranchId === 'ALL' || activeBranchId === '') return true;
    return String(c.branch_id || '') === String(activeBranchId);
  });

  const lowStockProducts = contextProducts.filter(p => !p.is_archived && (parseInt(p.quantity) || 0) <= 3);
  const hasLowStock = lowStockProducts.length > 0;

  const totalSalesRevenue = contextCustomers.reduce((acc, c) => {
    return acc + (c.history || []).reduce((hAcc, h) => hAcc + (parseFloat(h.total || 0) || 0), 0);
  }, 0);

  const totalGoodsSoldCost = contextCustomers.reduce((acc, c) => {
    return acc + (c.history || []).reduce((hAcc, h) => {
      const items = Array.isArray(h.items) ? h.items : [];
      return hAcc + items.reduce((iAcc, it) => {
        const matchedProd = products.find(p => String(p.id) === String(it.productId || it.product_id));
        return iAcc + ((parseFloat(matchedProd?.cost_price || 0)) * (parseInt(it.qty || 1)));
      }, 0);
    }, 0);
  }, 0);

  const totalOutstandingDebt = contextCustomers.reduce((acc, c) => acc + (parseFloat(c.totalDebt) || 0), 0);

  const getProductSoldQty = (productId) => {
    return contextCustomers.reduce((acc, c) => acc + (c.history || []).reduce((hAcc, h) => {
      if (h.items && Array.isArray(h.items)) {
        const item = h.items.find(i => String(i.productId || i.product_id) === String(productId));
        return hAcc + (item ? (parseInt(item.qty) || 0) : 0);
      }
      return hAcc;
    }, 0), 0);
  };

  const getTrueInitialQty = (p) => {
    if (p.initial_quantity !== undefined && p.initial_quantity !== null && p.initial_quantity !== '') return parseInt(p.initial_quantity);
    return (parseInt(p.quantity) || 0) + getProductSoldQty(p.id);
  };

  const totalInventoryCost = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.cost_price) || 0) * getTrueInitialQty(p)), 0);
  const totalExpectedRevenue = contextProducts.reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * getTrueInitialQty(p)), 0);
  const totalPotentialRetail = contextProducts.filter(p => !p.is_archived).reduce((acc, p) => acc + ((parseFloat(p.price) || 0) * (parseInt(p.quantity) || 0)), 0);

  const uniqueBatches = ['ALL', ...new Set(contextProducts.map(p => p.batch_reference).filter(Boolean))];
  
  const filteredProducts = contextProducts.filter(p => {
    const matchesBatch = selectedBatchFilter === 'ALL' || p.batch_reference === selectedBatchFilter;
    const matchesCategory = selectedCategoryFilter === 'ALL' || String(p.category_id) === String(selectedCategoryFilter);
    const matchesArchiveState = showArchived ? p.is_archived : !p.is_archived;
    const matchesLowStock = showLowStockOnly ? (parseInt(p.quantity) || 0) <= 3 : true;
    return matchesBatch && matchesCategory && matchesArchiveState && matchesLowStock;
  });

  const storefrontFilteredProducts = products.filter(p => {
    if (p.is_archived || parseInt(p.quantity) < 1) return false;
    if (storefrontBranch === '') return !p.branch_id || p.branch_id === '';
    return String(p.branch_id || '') === String(storefrontBranch);
  });

  const hqProductsForTransfer = products.filter(p => (!p.branch_id || p.branch_id === '') && !p.is_archived && parseInt(p.quantity) > 0);
  const activeSelectedArray = Object.values(selectedBatchItems).filter(i => i.selected);

  // --- UNAUTHENTICATED LOGIN SCREEN (Supabase Auth from Website 1) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-gray-900">Admin Portal Login</h2>
            <p className="text-xs text-gray-500 mt-1">Authenticate using your Supabase credentials.</p>
            {authError && <p className="text-red-500 text-xs mt-2 font-medium bg-red-50 p-2 rounded-lg">{authError}</p>}
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Email Address</label>
              <input 
                type="email" 
                placeholder="admin@chikeglobal.com" 
                value={adminEmail} 
                onChange={e => setAdminEmail(e.target.value)} 
                className="w-full border p-2.5 rounded-xl text-xs bg-white text-black focus:outline-none focus:border-[#f68b1e]" 
                required 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={adminPassword} 
                onChange={e => setAdminPassword(e.target.value)} 
                className="w-full border p-2.5 rounded-xl text-xs bg-white text-black focus:outline-none focus:border-[#f68b1e]" 
                required 
              />
            </div>
            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
            >
              {authLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN ADMIN PORTAL DASHBOARD ---
  return (
    <div className="bg-[#f8fafc] text-slate-900 font-sans p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER NAVIGATION & SESSION */}
        <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveTab('inventory')} 
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'inventory' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Boxes className="w-4 h-4 text-emerald-400" /> 
                <span>Inventory & Categories</span>
              </button>

              <button 
                onClick={() => setActiveTab('customers')} 
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'customers' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UsersRound className="w-4 h-4 text-blue-400" /> 
                <span>Sales Ledger</span>
              </button>

              <button 
                onClick={() => setActiveTab('storefront')} 
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'storefront' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-4 h-4 text-indigo-400" /> 
                <span>Storefront</span>
              </button>

              <button 
                onClick={() => setActiveTab('staff')} 
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'staff' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCog className="w-4 h-4 text-amber-400" /> 
                <span>Staff</span>
              </button>

              <button 
                onClick={() => setActiveTab('branches')} 
                className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'branches' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-purple-400" /> 
                <span>Branches & HQ</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* LOW STOCK ALERT */}
              <button 
                onClick={() => { setActiveTab('inventory'); setShowLowStockOnly(prev => !prev); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  hasLowStock 
                    ? (showLowStockOnly ? 'bg-rose-700 text-white' : 'bg-rose-600 text-white animate-pulse')
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Critique: {lowStockProducts.length}</span>
              </button>

              {/* BRANCH FILTER DROPDOWN */}
              <div className="flex items-center gap-2 border border-slate-200 px-3.5 py-2 rounded-xl bg-slate-50/80">
                <ListFilter className="w-4 h-4 text-slate-400" />
                <select 
                  value={viewingBranch} 
                  onChange={(e) => setViewingBranch(e.target.value)} 
                  className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">HQ Stock (Default)</option>
                  <option value="ALL">All Branches</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* LOGOUT */}
              <button 
                onClick={handleAdminLogout}
                className="px-3 py-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 flex items-center space-x-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

        {/* FINANCIAL METRICS BAR */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-400" /> Performance Financière
            </span>
            <button
              onClick={handleToggleFinancialVisibility}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white text-slate-700 border border-slate-200 shadow-sm cursor-pointer"
            >
              {showFinancials ? <EyeOff className="w-4 h-4 text-rose-500" /> : <Eye className="w-4 h-4 text-emerald-600" />}
              <span>{showFinancials ? 'Masquer les chiffres' : 'Afficher les chiffres'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Asset Cost</p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-2">{formatMoney(totalInventoryCost)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-indigo-500">Expected Revenue</p>
              <p className="text-base sm:text-lg font-black text-indigo-600 mt-2">{formatMoney(totalExpectedRevenue)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-emerald-500">Stock Value</p>
              <p className="text-base sm:text-lg font-black text-emerald-600 mt-2">{formatMoney(totalPotentialRetail)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-purple-500">COGS (Sold Cost)</p>
              <p className="text-base sm:text-lg font-black text-purple-600 mt-2">{formatMoney(totalGoodsSoldCost)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-blue-500">Total Sales (Rev)</p>
              <p className="text-base sm:text-lg font-black text-blue-600 mt-2">{formatMoney(totalSalesRevenue)}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-rose-500">
              <p className="text-[10px] font-bold uppercase text-rose-500">Outstanding Debts</p>
              <p className="text-base sm:text-lg font-black text-rose-600 mt-2">{formatMoney(totalOutstandingDebt)}</p>
            </div>
          </div>
        </div>

        {/* TAB 1: INVENTORY & CATEGORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: CATEGORIES & PRODUCT ENTRY */}
            <div className="space-y-6">
              
              {/* CATEGORY MANAGEMENT CARD (From Website 1) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-2 pb-2 border-b mb-4">
                  <FolderPlus className="w-4 h-4 text-[#f68b1e]" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700">Category Management</h3>
                </div>
                
                <form onSubmit={handleCreateCategory} className="space-y-3 mb-5">
                  <input 
                    type="text" 
                    placeholder="e.g. Wigs, Bundles, Creams, Oils" 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)} 
                    className="w-full border p-2 text-xs rounded-lg bg-white text-black" 
                    required 
                  />
                  <button 
                    type="submit" 
                    disabled={categoryCreating}
                    className="w-full bg-slate-900 text-white text-xs py-2 rounded-lg font-bold uppercase hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    {categoryCreating ? 'Creating...' : 'Add Category'}
                  </button>
                </form>

                <div className="border-t pt-4">
                  <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Existing Categories</h4>
                  {categories.length === 0 ? (
                    <p className="text-xs text-slate-400">No categories found.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {categories.map(cat => (
                        <li key={cat.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {editingCategory?.id === cat.id ? (
                            <form onSubmit={(e) => handleUpdateCategory(e, cat.id)} className="flex w-full space-x-2 items-center">
                              <input
                                type="text"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                className="w-full border p-1 text-xs rounded bg-white text-black"
                                autoFocus
                              />
                              <button type="submit" disabled={categoryActionLoading} className="text-xs text-green-600 font-bold">Save</button>
                              <button type="button" onClick={cancelEditCategory} className="text-xs text-slate-500 font-bold">Cancel</button>
                            </form>
                          ) : (
                            <>
                              <span className="text-xs font-medium text-slate-700 truncate">{cat.name}</span>
                              <div className="flex items-center space-x-2">
                                <button onClick={() => startEditCategory(cat)} className="text-slate-400 hover:text-green-600"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* PRODUCT ADD / EDIT FORM (Integrated Category + Branch + Batch) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center pb-2 border-b mb-4">
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700">
                    {editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}
                  </h3>
                  {editingProduct && (
                    <button onClick={handleCancelEditProduct} className="text-xs text-red-500 font-bold">Annuler</button>
                  )}
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-3.5">
                  <input type="text" placeholder="Nom du produit" value={name} onChange={e => setName(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                  <input type="text" placeholder="Batch Ref (ex: BATCH-A)" value={batch} onChange={e => setBatch(e.target.value)} className="w-full border p-2 text-xs rounded-lg uppercase" required />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Prix Achat</label>
                      <input type="number" placeholder="Cost" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Prix Vente</label>
                      <input type="number" placeholder="Retail" value={price} onChange={e => setPrice(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Catégorie</label>
                      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border p-2 text-xs rounded-lg bg-white">
                        <option value="">-- Sans Catégorie --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Succursale</label>
                      <select value={productBranch} onChange={e => setProductBranch(e.target.value)} className="w-full border p-2 text-xs rounded-lg bg-white">
                        <option value="">HQ Stock Principal</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Qté Initiale</label>
                      <input type="number" placeholder="Initial" value={initialQuantity} onChange={e => setInitialQuantity(e.target.value)} className="w-full border p-2 text-xs rounded-lg" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Stock Actuel</label>
                      <input type="number" placeholder="Stock" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2 text-xs rounded-lg" required />
                    </div>
                  </div>

                  <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 text-xs rounded-lg h-16" />
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} className="w-full text-xs text-slate-500" />

                  <button type="submit" disabled={uploading} className="w-full bg-[#f68b1e] text-white text-xs py-2.5 rounded-lg font-bold uppercase tracking-wider cursor-pointer">
                    {uploading ? 'Traitement...' : editingProduct ? 'Enregistrer les modifications' : 'Publier le Produit'}
                  </button>
                </form>
              </div>

            </div>

            {/* RIGHT COLUMN: INVENTORY TABLE CATALOG */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b gap-3">
                <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 flex items-center">
                  <Layers className="w-4 h-4 mr-1.5 text-orange-600" /> Catalogue des Produits
                </h3>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleOpenBatchTransfer} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                    Transférer Stock
                  </button>
                  <button onClick={handleOpenTransferHistory} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold">
                    Historique Transferts
                  </button>
                  <select value={selectedCategoryFilter} onChange={e => setSelectedCategoryFilter(e.target.value)} className="border p-1.5 text-xs rounded-lg bg-slate-50 font-bold">
                    <option value="ALL">Toutes Catégories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select value={selectedBatchFilter} onChange={e => setSelectedBatchFilter(e.target.value)} className="border p-1.5 text-xs rounded-lg bg-slate-50 font-bold">
                    {uniqueBatches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b">
                      <th className="p-2.5">Image</th>
                      <th className="p-2.5">Article</th>
                      <th className="p-2.5">Catégorie</th>
                      <th className="p-2.5">Batch / Branch</th>
                      <th className="p-2.5">Achat</th>
                      <th className="p-2.5">Vente</th>
                      <th className="p-2.5 text-center">Stock</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const matchedCat = categories.find(c => String(c.id) === String(p.category_id));
                      const matchedBranch = branches.find(b => String(b.id) === String(p.branch_id));

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5"><img src={p.image_url} alt={p.name} className="w-9 h-9 object-cover rounded border" /></td>
                          <td className="p-2.5 font-bold">{p.name}</td>
                          <td className="p-2.5 text-slate-500 font-medium">{matchedCat ? matchedCat.name : '-'}</td>
                          <td className="p-2.5">
                            <span className="bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded text-[10px] mr-1">{p.batch_reference || 'N/A'}</span>
                            <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">{matchedBranch ? matchedBranch.name : 'HQ'}</span>
                          </td>
                          <td className="p-2.5 text-slate-500">{p.cost_price?.toLocaleString()} FCFA</td>
                          <td className="p-2.5 font-bold text-orange-600">{p.price?.toLocaleString()} FCFA</td>
                          <td className="p-2.5 text-center"><input type="number" value={p.quantity !== null ? p.quantity : 0} onChange={(e) => handleUpdateStockVolume(p.id, e.target.value)} className="w-14 border text-center p-0.5 rounded font-bold" /></td>
                          <td className="p-2.5 text-center space-x-2">
                            <button onClick={() => handleStartEditProduct(p)} className="text-blue-500 hover:text-blue-700"><Edit3 className="w-4 h-4 inline" /></button>
                            <button onClick={() => handleArchiveProduct(p.id, !p.is_archived)} className="text-purple-600 hover:text-purple-800"><Archive className="w-4 h-4 inline" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BRANCHES & HQ MANAGEMENT */}
        {activeTab === 'branches' && (
          <BranchManagement 
            branches={branches}
            branchName={branchName}
            setBranchName={setBranchName}
            branchLocation={branchLocation}
            setBranchLocation={setBranchLocation}
            editingBranch={editingBranch}
            setEditingBranch={setEditingBranch}
            handleSaveBranch={handleSaveBranch}
            handleDeleteBranch={handleDeleteBranch} 
            staffList={staffList}                   
            handleReassignStaff={handleReassignStaff} 
          />
        )}

        {/* TAB 3: SALES LEDGER */}
        {activeTab === 'customers' && (
          <SalesLedger 
            products={contextProducts}
            customers={contextCustomers}
            fetchProducts={fetchProducts}
            fetchCustomers={fetchCustomersFromSupabase}
            supabase={supabase}
            currentUser={currentUser}
            activeBranchId={activeBranchId} 
          />
        )}

        {/* TAB 4: STOREFRONT PREVIEW */}
        {activeTab === 'storefront' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-emerald-500/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-emerald-950 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-600" /> Configuration de la Boutique Publique
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">Sélectionnez la succursale dont le stock sera visible en ligne.</p>
                </div>
                <select 
                  value={liveStoreBranch}
                  onChange={(e) => handleUpdateLiveBranch(e.target.value)}
                  className="text-sm font-bold text-slate-900 border p-2 rounded-xl bg-white"
                >
                  <option value="">Siège Principal (HQ)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-base font-black text-slate-900">Aperçu du Catalogue de la Vitrine Publique</h3>
                <select 
                  value={storefrontBranch}
                  onChange={(e) => setStorefrontBranch(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold"
                >
                  <option value="">Aperçu : Siège Principal (HQ)</option>
                  {branches.map(b => <option key={b.id} value={b.id}>Aperçu : {b.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {storefrontFilteredProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl border overflow-hidden flex flex-col">
                    <img src={product.image_url} alt={product.name} className="h-44 w-full object-cover" />
                    <div className="p-4 flex flex-col justify-between flex-1 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900">{product.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{product.description || 'Aucune description.'}</p>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs font-mono font-bold">{product.batch_reference || 'BATCH'}</span>
                        <span className="text-sm font-black text-emerald-600">{product.price?.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STAFF MANAGEMENT */}
        {activeTab === 'staff' && (
          <StaffManagement 
            supabase={supabase}
            branches={branches}
            staffList={staffList}
            fetchStaffFromSupabase={fetchStaffFromSupabase}
            verifyAdminPinBeforeAction={async () => true}
            staffName={staffName}
            setStaffName={setStaffName}
            staffPin={staffPin}
            setStaffPin={setStaffPin}
            staffRole={staffRole}
            setStaffRole={setStaffRole}
            staffBranch={staffBranch}
            setStaffBranch={setStaffBranch}
            editingStaff={editingStaff}
            setEditingStaff={setEditingStaff}
            handleSaveStaff={handleSaveStaff}
            handleToggleStaffStatus={handleToggleStaffStatus}
            handleStartEditStaff={handleStartEditStaff}
          />
        )}

      </div>

      {/* MULTI-PRODUCT BATCH TRANSFER MODAL */}
      <BatchTransferModal 
        batchTransferOpen={batchTransferOpen}
        setBatchTransferOpen={setBatchTransferOpen}
        batchTransferStep={batchTransferStep}
        setBatchTransferStep={setBatchTransferStep}
        batchTransferError={batchTransferError}
        hqProductsForTransfer={hqProductsForTransfer}
        selectedBatchItems={selectedBatchItems}
        handleToggleBatchItemSelect={handleToggleBatchItemSelect}
        handleUpdateBatchItemDetail={handleUpdateBatchItemDetail}
        branches={branches}
        activeSelectedArray={activeSelectedArray}
        handleProceedToBatchReview={handleProceedToBatchReview}
        handleConfirmBatchTransfer={handleConfirmBatchTransfer}
        batchTransferLoading={batchTransferLoading}
      />

      {/* TRANSFER HISTORY MODAL */}
      <TransferHistoryModal 
        isOpen={transferHistoryOpen}
        onClose={() => setTransferHistoryOpen(false)}
        transferLogs={transferLogs}
        branches={branches}
      />

    </div>
  );
}