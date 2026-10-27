import React from 'react';
import { MapPin, Trash2, Users, Edit } from 'lucide-react';

export default function BranchManagement({
  branches,
  branchName,
  setBranchName,
  branchLocation,
  setBranchLocation,
  editingBranch,
  setEditingBranch,
  handleSaveBranch,
  handleDeleteBranch,
  staffList = [],
  handleReassignStaff
}) {
  return (
    <div className="space-y-6 font-sans">
      {/* TOP SECTION: Branch Creation and Network List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Branch Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 mb-5 pb-3 border-b">
            {editingBranch ? 'Edit Branch' : 'Register New Branch'}
          </h3>
          
          <form onSubmit={handleSaveBranch} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Branch Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Abidjan Center" 
                value={branchName} 
                onChange={e => setBranchName(e.target.value)} 
                className="w-full border border-slate-200 p-3 text-xs rounded-xl bg-slate-50 focus:bg-white outline-none font-medium" 
                required 
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">Location Details</label>
              <input 
                type="text" 
                placeholder="e.g. Cocovico Marché" 
                value={branchLocation} 
                onChange={e => setBranchLocation(e.target.value)} 
                className="w-full border border-slate-200 p-3 text-xs rounded-xl bg-slate-50 focus:bg-white outline-none font-medium" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-black hover:bg-slate-800 text-white text-xs py-3.5 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
            >
              {editingBranch ? 'Update Branch' : 'Save Branch'}
            </button>

            {editingBranch && (
              <button 
                type="button"
                onClick={() => { setEditingBranch(null); setBranchName(''); setBranchLocation(''); }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-3 rounded-xl font-bold uppercase tracking-wider transition-colors cursor-pointer mt-2"
              >
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Branch List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 pb-3 border-b flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-orange-600" /> Branch Network ({branches.length})
          </h3>

          <div className="overflow-hidden mt-4 rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold border-b">
                <tr>
                  <th className="p-3.5">Branch Name</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{b.name}</td>
                    <td className="p-3.5 text-slate-500">{b.location || 'N/A'}</td>
                    <td className="p-3.5 flex items-center justify-end gap-3">
                      <button 
                        onClick={() => { setEditingBranch(b); setBranchName(b.name); setBranchLocation(b.location || ''); }} 
                        className="text-blue-600 font-bold hover:text-blue-800 flex items-center bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="w-3 h-3 mr-1" /> Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteBranch && handleDeleteBranch(b.id)} 
                        className="text-red-600 font-bold hover:text-red-800 flex items-center bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {branches.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-slate-400 italic">No branches registered yet. Use the form to add one.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Quick Staff Reassignment */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 pb-3 border-b flex items-center">
          <Users className="w-4 h-4 mr-2 text-orange-600" /> Quick Staff Branch Assignment
        </h3>
        <p className="text-xs text-slate-500 mb-4 mt-2">
          Instantly assign or transfer a staff member to a branch so their sales transactions and branch stock remain isolated.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold border-b">
              <tr>
                <th className="p-3.5">Staff Name</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Current Branch</th>
                <th className="p-3.5">Reassign To Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map(staff => (
                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{staff.full_name}</td>
                  <td className="p-3.5 text-slate-500 uppercase font-semibold">{staff.role}</td>
                  <td className="p-3.5">
                    <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md font-bold border border-orange-100">
                      {branches.find(b => String(b.id) === String(staff.branch_id))?.name || 'Headquarters (HQ)'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={staff.branch_id || ''}
                      onChange={(e) => handleReassignStaff && handleReassignStaff(staff.id, e.target.value)}
                      className="border border-slate-200 p-2 text-xs rounded-xl bg-slate-50 focus:bg-white font-semibold outline-none min-w-[180px] cursor-pointer"
                    >
                      <option value="">Headquarters (HQ)</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-slate-400 italic">No staff members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}