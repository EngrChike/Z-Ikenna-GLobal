import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { ShieldCheck, Trash2, Pencil, LogOut } from 'lucide-react';

export default function AdminPortal({ products, fetchProducts, setView }) {
  // REAL SUPABASE AUTHENTICATION STATES
  const [session, setSession] = useState(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Form states (used for both Add and Edit)
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Edit target tracker
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    // Check existing active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes (login/logout events)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // SECURE SUPABASE AUTH LOGIN
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (error) {
        setAuthError(error.message);
      } else {
        setAdminEmail('');
        setAdminPassword('');
      }
    } catch (err) {
      setAuthError('An unexpected authentication error occurred.');
    } finally {
      setAuthLoading(false);
    }
  };

  // LOGOUT HANDLER
  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    cancelEdit();
    setView('client');
  };

  // HELPER FUNCTION: AUTOMATIC IMAGE COMPRESSOR
  const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Canvas compression failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpdateStockVolume = async (id, newVolume) => {
    const parsedVolume = parseInt(newVolume) || 0;
    const { error } = await supabase
      .from('products')
      .update({ 
        quantity: parsedVolume,
        stock_status: parsedVolume > 0 
      })
      .eq('id', id);

    if (!error) {
      await fetchProducts();
    } else {
      alert(`Permission Denied: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this item from listing?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      await fetchProducts();
    } else {
      alert(`Delete Error: ${error.message}`);
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price);
    setQuantity(product.quantity);
    setDescription(product.description || '');
    setImageFile(null);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setQuantity('');
    setDescription('');
    setImageFile(null);
  };

  // ADD PRODUCT
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || !quantity) return;

    if (!imageFile) {
      alert('Please select an image file for the product before publishing.');
      return;
    }

    setUploading(true);
    let image_url = '';

    try {
      let fileToUpload = imageFile;
      try {
        fileToUpload = await compressImage(imageFile, 800, 800, 0.8);
      } catch (compressionError) {
        console.warn("Compression skipped, using original file:", compressionError);
      }

      const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${Date.now()}_${cleanName}`;
      
      const { error: upErr } = await supabase.storage
        .from('product-images') 
        .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      if (data?.publicUrl) {
        image_url = data.publicUrl;
      } else {
        throw new Error("Failed to retrieve public URL from storage.");
      }

      const parsedQty = parseInt(quantity) || 0;
      const payload = {
        name: String(name).trim(),
        description: String(description || '').trim(),
        price: parseFloat(price),
        image_url: image_url,
        quantity: parsedQty,
        stock_status: parsedQty > 0
      };

      const { error: insErr } = await supabase.from('products').insert([payload]);
      if (insErr) throw insErr;

      setName('');
      setPrice('');
      setQuantity('');
      setDescription('');
      setImageFile(null);
      
      await fetchProducts();
      alert('Product published successfully!');
    } catch (err) {
      console.error(err);
      alert(`Upload/Database Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // UPDATE PRODUCT
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setUploading(true);

    let image_url = editingProduct.image_url;

    try {
      if (imageFile) {
        let fileToUpload = imageFile;
        try {
          fileToUpload = await compressImage(imageFile, 800, 800, 0.8);
        } catch (compressionError) {
          console.warn("Compression skipped, using original file:", compressionError);
        }

        const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;

        const { error: upErr } = await supabase.storage
          .from('product-images')
          .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });

        if (upErr) throw upErr;

        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
        if (data?.publicUrl) {
          image_url = data.publicUrl;
        } else {
          throw new Error("Failed to retrieve public URL from storage.");
        }
      }

      const parsedQty = parseInt(quantity) || 0;
      const payload = {
        name: String(name).trim(),
        description: String(description || '').trim(),
        price: parseFloat(price),
        image_url: image_url,
        quantity: parsedQty,
        stock_status: parsedQty > 0
      };

      const { error: updErr } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (updErr) throw updErr;

      cancelEdit();
      await fetchProducts();
      alert('Product updated successfully!');
    } catch (err) {
      console.error(err);
      alert(`Update Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="max-w-7xl w-full mx-auto p-4 py-8">
      {!session ? (
        <div className="max-w-sm mx-auto bg-white rounded-2xl border border-gray-200 p-6 mt-10 shadow-sm">
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-gray-900">Admin Portal Login</h2>
            <p className="text-xs text-gray-500 mt-1">Authenticate using your Supabase user credentials.</p>
            {authError && <p className="text-red-500 text-xs mt-2 font-medium bg-red-50 p-2 rounded-lg">{authError}</p>}
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Email Address</label>
              <input 
                type="email" 
                placeholder="admin@zikennaglobal.com" 
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
              className="w-full bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all"
            >
              {authLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400">Authenticated Session</p>
              <p className="text-xs font-bold text-gray-800">{session.user.email}</p>
            </div>
            <button 
              onClick={handleAdminLogout} 
              className="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center space-x-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
              <div className="flex justify-between items-center pb-2 border-b mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700">
                  {editingProduct ? 'Update Cosmetics Product' : 'Add New Product'}
                </h3>
                {editingProduct && (
                  <button 
                    onClick={cancelEdit} 
                    className="text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              
              <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="space-y-3.5">
                <input 
                  type="text" 
                  placeholder="Product Title" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full border p-2 text-xs rounded-lg bg-white text-black" 
                  required 
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="number" 
                    placeholder="Price (#)" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)} 
                    className="w-full border p-2 text-xs rounded-lg bg-white text-black" 
                    required 
                  />
                  <input 
                    type="number" 
                    placeholder="Stock Qty" 
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    className="w-full border p-2 text-xs rounded-lg bg-white text-black" 
                    required 
                  />
                </div>
                <textarea 
                  placeholder="Description" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  className="w-full border p-2 text-xs rounded-lg h-14 bg-white text-black" 
                />
                
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 block font-bold uppercase">
                    {editingProduct ? 'Change Product Image (Optional)' : 'Product Image (Required)'}
                  </label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setImageFile(e.target.files[0])} 
                    className="w-full text-xs text-gray-500" 
                    required={!editingProduct}
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={uploading} 
                  className="w-full bg-[#f68b1e] text-white text-xs py-2 rounded-lg font-bold uppercase hover:bg-[#e07a16] transition-all"
                >
                  {uploading ? 'Processing...' : editingProduct ? 'Save Updates' : 'Publish Product'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wide text-gray-700 mb-4 pb-2 border-b">Operational Catalog Controller</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 font-bold border-b">
                      <th className="p-2.5">Item Info</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5 text-center">In-Stock Units</th>
                      <th className="p-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => (
                      <tr key={p.id} className={`hover:bg-gray-50/50 ${editingProduct?.id === p.id ? 'bg-orange-50/50' : ''}`}>
                        <td className="p-2.5 flex items-center space-x-2">
                          <img src={p.image_url} alt="" className="w-8 h-8 object-cover rounded border" />
                          <span className="font-bold text-gray-900 line-clamp-1">{p.name}</span>
                        </td>
                        <td className="p-2.5 font-bold text-gray-700">#{p.price.toLocaleString()}</td>
                        <td className="p-2.5 text-center">
                          <input 
                            type="number" 
                            value={p.quantity !== null ? p.quantity : (p.stock_status ? 10 : 0)} 
                            onChange={(e) => handleUpdateStockVolume(p.id, e.target.value)}
                            className="w-14 border text-center p-0.5 rounded font-bold text-xs bg-white text-black"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-3">
                            <button 
                              onClick={() => startEditProduct(p)} 
                              className="text-gray-400 hover:text-green-600 transition-colors"
                              title="Edit Product Info"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)} 
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}