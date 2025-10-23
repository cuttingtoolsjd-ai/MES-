import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { calculateKorvPerUnit } from '../lib/korvCalculations';

const DEFAULT_TOOL = {
  tool_code: '',
  tool_description: '',
  standard_korv: '',
  cnc_time: '',
  cylindrical_time: '',
  tc_time: '',
  organisational_korv: '',
  times_locked: false,
  times_locked_at: null,
  times_locked_by: null
};

export default function ToolMasterOverview({ user, onMakeWorkorder }) {
  const [tools, setTools] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Editing state
  const [editTool, setEditTool] = useState(null);
  const [approvedEditTools, setApprovedEditTools] = useState([]); // tool_codes manager can edit now
  const [editForm, setEditForm] = useState(DEFAULT_TOOL);
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [managerReason, setManagerReason] = useState('');

  // Deletion state
  const [deleteTool, setDeleteTool] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  // Permission request state
  const [permissionModal, setPermissionModal] = useState(null); // 'edit' or 'delete'
  const [permissionTool, setPermissionTool] = useState(null);
  const [permissionReason, setPermissionReason] = useState('');
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');

  // Create new tool state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_TOOL);
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('tool_master')
        .select('*')
        .order('tool_code');
      setTools(data || []);
      setLoading(false);
    }
    load();
    // Fetch approved edit requests for this manager
    if (user?.role === 'manager') {
      supabase
        .from('manager_permission_requests')
        .select('tool_code')
        .eq('requested_by', user.username)
        .eq('action', 'edit')
        .eq('status', 'approved')
        .then(({ data }) => {
          setApprovedEditTools((data || []).map(r => r.tool_code));
        });
    }
  }, [user]);

  const filtered = tools.filter(
    t => t.tool_code.toLowerCase().includes(search.toLowerCase()) ||
         (t.tool_description || '').toLowerCase().includes(search.toLowerCase())
  );

  function openEditModal(tool) {
    // Managers can always edit timing fields without permission
    // Only need permission for description changes or if times are locked
    setEditTool(tool);
    setEditForm({
      tool_code: tool.tool_code || '',
      tool_description: tool.tool_description || '',
      standard_korv: tool.standard_korv || '',
      cnc_time: tool.cnc_time || '',
      cylindrical_time: tool.cylindrical_time || '',
      tc_time: tool.tc_time || tool.tc_estimated || '',
      organisational_korv: tool.organisational_korv || '',
      times_locked: !!tool.times_locked,
      times_locked_at: tool.times_locked_at || null,
      times_locked_by: tool.times_locked_by || null
    });
    setManagerReason('');
    setEditMessage('');
  }

  function openDeleteModal(tool) {
    if (user?.role === 'manager') {
      setPermissionModal('delete');
      setPermissionTool(tool);
      setPermissionReason('');
      setPermissionMessage('');
    } else {
      setDeleteTool(tool);
      setDeleteReason('');
      setDeleteMessage('');
    }
  }

  async function handleDeleteSubmit(e) {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteMessage('');
    if (user?.role === 'manager' && !deleteReason.trim()) {
      setDeleteMessage('Please provide a reason for deletion (required for managers).');
      setDeleteLoading(false);
      return;
    }
    const { error } = await supabase
      .from('tool_master')
      .delete()
      .eq('tool_code', deleteTool.tool_code);
    if (error) {
      setDeleteMessage('Error deleting tool: ' + error.message);
    } else {
      setDeleteMessage('✅ Tool deleted!');
      setTimeout(() => {
        setDeleteTool(null);
        setDeleteMessage('');
        setDeleteReason('');
      }, 1200);
      if (user?.role === 'manager') {
        await supabase.from('tool_edit_logs').insert([
          {
            tool_code: deleteTool.tool_code,
            edited_by: user.username,
            reason: deleteReason,
            action: 'delete',
            edited_at: new Date().toISOString(),
          },
        ]);
      }
      const { data } = await supabase.from('tool_master').select('*').order('tool_code');
      setTools(data || []);
    }
    setDeleteLoading(false);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditLoading(true);
    setEditMessage('');
    
    // Auto-calc standard_korv from times (1 korv = 5 min)
    const computedKorv = calculateKorvPerUnit(
      editForm.cnc_time ? parseFloat(editForm.cnc_time) : 0,
      editForm.cylindrical_time ? parseFloat(editForm.cylindrical_time) : 0,
      editForm.tc_time ? parseFloat(editForm.tc_time) : 0
    );
    
    if (user?.role === 'manager') {
      // Check if description was changed
      const descriptionChanged = editForm.tool_description !== editTool.tool_description;
      
      if (descriptionChanged) {
        // Description changes require admin approval
        if (!managerReason.trim()) {
          setEditMessage('Please provide a reason for changing the tool description (requires admin approval).');
          setEditLoading(false);
          return;
        }
        const { error } = await supabase
          .from('manager_permission_requests')
          .insert([{
            tool_code: editForm.tool_code,
            requested_by: user.username,
            action: 'edit',
            reason: managerReason,
            status: 'pending',
            requested_at: new Date().toISOString(),
            tool_data: editForm
          }]);
        if (error) {
          setEditMessage('Error submitting edit request: ' + error.message);
        } else {
          setEditMessage('✅ Description change request submitted to admin. Timing changes saved directly.');
          // Still save timing changes directly even if description needs approval
          await supabase
            .from('tool_master')
            .update({
              standard_korv: computedKorv,
              cnc_time: editForm.cnc_time ? parseFloat(editForm.cnc_time) : 0,
              cylindrical_time: editForm.cylindrical_time ? parseFloat(editForm.cylindrical_time) : 0,
              tc_time: editForm.tc_time ? parseFloat(editForm.tc_time) : 0,
              organisational_korv: editForm.organisational_korv ? parseFloat(editForm.organisational_korv) : null,
              last_updated: new Date().toISOString(),
            })
            .eq('tool_code', editForm.tool_code);
          const { data } = await supabase.from('tool_master').select('*').order('tool_code');
          setTools(data || []);
          setTimeout(() => {
            setEditTool(null);
            setEditMessage('');
          }, 2000);
        }
      } else {
        // Only timing changes - save directly without admin approval
        const { error } = await supabase
          .from('tool_master')
          .update({
            standard_korv: computedKorv,
            cnc_time: editForm.cnc_time ? parseFloat(editForm.cnc_time) : 0,
            cylindrical_time: editForm.cylindrical_time ? parseFloat(editForm.cylindrical_time) : 0,
            tc_time: editForm.tc_time ? parseFloat(editForm.tc_time) : 0,
            organisational_korv: editForm.organisational_korv ? parseFloat(editForm.organisational_korv) : null,
            last_updated: new Date().toISOString(),
          })
          .eq('tool_code', editForm.tool_code);
        if (error) {
          setEditMessage('Error updating tool timing: ' + error.message);
        } else {
          setEditMessage('✅ Tool timing updated successfully!');
          const { data } = await supabase.from('tool_master').select('*').order('tool_code');
          setTools(data || []);
          setTimeout(() => {
            setEditTool(null);
            setEditMessage('');
          }, 1500);
        }
      }
    } else {
      // Admins can update everything directly
      const { error } = await supabase
        .from('tool_master')
        .update({
          tool_description: editForm.tool_description,
          standard_korv: computedKorv,
          cnc_time: editForm.cnc_time ? parseFloat(editForm.cnc_time) : 0,
          cylindrical_time: editForm.cylindrical_time ? parseFloat(editForm.cylindrical_time) : 0,
          tc_time: editForm.tc_time ? parseFloat(editForm.tc_time) : 0,
          organisational_korv: editForm.organisational_korv ? parseFloat(editForm.organisational_korv) : null,
          last_updated: new Date().toISOString(),
        })
        .eq('tool_code', editForm.tool_code);
      if (error) {
        setEditMessage('Error updating tool: ' + error.message);
      } else {
        setEditMessage('✅ Tool updated!');
        const { data } = await supabase.from('tool_master').select('*').order('tool_code');
        setTools(data || []);
        setTimeout(() => {
          setEditTool(null);
          setEditMessage('');
        }, 1500);
      }
    }
    setEditLoading(false);
  }

  async function handlePermissionRequest(e) {
    e.preventDefault();
    setPermissionLoading(true);
    setPermissionMessage('');
    if (!permissionReason.trim()) {
      setPermissionMessage('Reason is required.');
      setPermissionLoading(false);
      return;
    }
    const { error } = await supabase
      .from('manager_permission_requests')
      .insert([{
        tool_code: permissionTool.tool_code,
        requested_by: user.username,
        action: permissionModal,
        reason: permissionReason,
        status: 'pending',
        requested_at: new Date().toISOString(),
      }]);
    if (error) {
      setPermissionMessage('Error submitting request: ' + error.message);
    } else {
      setPermissionMessage('✅ Request submitted to admin.');
      setTimeout(() => {
        setPermissionModal(null);
        setPermissionMessage('');
        setPermissionReason('');
      }, 1200);
    }
    setPermissionLoading(false);
  }

  async function handleCreateTool(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMessage('');
    
    if (!createForm.tool_code.trim()) {
      setCreateMessage('Tool code is required.');
      setCreateLoading(false);
      return;
    }

    // Auto-calc standard_korv from times (1 korv = 5 min)
    const standardKorv = calculateKorvPerUnit(
      createForm.cnc_time ? parseFloat(createForm.cnc_time) : 0,
      createForm.cylindrical_time ? parseFloat(createForm.cylindrical_time) : 0,
      createForm.tc_time ? parseFloat(createForm.tc_time) : 0
    );

    const { error } = await supabase
      .from('tool_master')
      .insert([{
        tool_code: createForm.tool_code.trim(),
        tool_description: createForm.tool_description.trim() || null,
        standard_korv: standardKorv,
        cnc_time: createForm.cnc_time ? parseFloat(createForm.cnc_time) : 0,
        cylindrical_time: createForm.cylindrical_time ? parseFloat(createForm.cylindrical_time) : 0,
        tc_time: createForm.tc_time ? parseFloat(createForm.tc_time) : 0,
        organisational_korv: createForm.organisational_korv ? parseFloat(createForm.organisational_korv) : null,
      }]);

    if (error) {
      setCreateMessage('Error creating tool: ' + error.message);
    } else {
      setCreateMessage('✅ Tool created successfully!');
      const { data } = await supabase.from('tool_master').select('*').order('tool_code');
      setTools(data || []);
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateForm(DEFAULT_TOOL);
        setCreateMessage('');
      }, 1200);
    }
    setCreateLoading(false);
  }

  return (
    <>
      {/* Create Tool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Tool</h3>
            <form onSubmit={handleCreateTool} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Code *</label>
                  <input
                    type="text"
                    value={createForm.tool_code}
                    onChange={e => setCreateForm({ ...createForm, tool_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    placeholder="e.g., T001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Description</label>
                  <input
                    type="text"
                    value={createForm.tool_description}
                    onChange={e => setCreateForm({ ...createForm, tool_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Carbide End Mill"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNC Time (min)</label>
                  <input
                    type="number"
                    value={createForm.cnc_time}
                    onChange={e => setCreateForm({ ...createForm, cnc_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cylindrical Time (min)</label>
                  <input
                    type="number"
                    value={createForm.cylindrical_time}
                    onChange={e => setCreateForm({ ...createForm, cylindrical_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">T&C Time (min)</label>
                  <input
                    type="number"
                    value={createForm.tc_time}
                    onChange={e => setCreateForm({ ...createForm, tc_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organisational Korv</label>
                  <input
                    type="number"
                    value={createForm.organisational_korv}
                    onChange={e => setCreateForm({ ...createForm, organisational_korv: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calculated Korv per Unit (read-only)</label>
                  <input
                    type="number"
                    value={calculateKorvPerUnit(
                      createForm.cnc_time ? parseFloat(createForm.cnc_time) : 0,
                      createForm.cylindrical_time ? parseFloat(createForm.cylindrical_time) : 0,
                      createForm.tc_time ? parseFloat(createForm.tc_time) : 0
                    )}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={createLoading} className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-md">
                  {createLoading ? 'Creating...' : 'Create Tool'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md">Cancel</button>
              </div>
              {createMessage && (
                <div className={`mt-2 p-2 rounded-md ${createMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {createMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
      {permissionModal && permissionTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPermissionModal(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 z-10">
            <h3 className="text-lg font-semibold mb-4">
              Request Permission to {permissionModal === 'edit' ? 'Edit' : 'Delete'} Tool
            </h3>
            <form onSubmit={handlePermissionRequest} className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-md">
                <p><strong>Tool Code:</strong> {permissionTool.tool_code}</p>
                <p><strong>Description:</strong> {permissionTool.tool_description}</p>
                <p><strong>Action:</strong> {permissionModal === 'edit' ? 'Edit Tool Details' : 'Delete Tool'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for {permissionModal === 'edit' ? 'editing' : 'deleting'} this tool (required)
                </label>
                <textarea
                  value={permissionReason}
                  onChange={e => setPermissionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  required
                  placeholder={`Please explain why you need to ${permissionModal} this tool...`}
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Your request will be sent to an admin for approval.
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={permissionLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md">
                  {permissionLoading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button type="button" onClick={() => setPermissionModal(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md">Cancel</button>
              </div>
              {permissionMessage && (
                <div className={`mt-2 p-2 rounded-md ${permissionMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {permissionMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Edit Tool Modal */}
      {editTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditTool(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto p-6 z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Edit Tool: {editTool.tool_code}</h3>
            
            {user?.role === 'manager' && (
              <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded">
                <p className="font-semibold mb-1">ℹ️ Manager Edit Permissions:</p>
                <ul className="text-sm space-y-1">
                  <li>✅ You can edit <strong>timing fields</strong> directly (CNC, Cylindrical, T&C, Organisational Korv)</li>
                  <li>⚠️ Description changes require admin approval</li>
                </ul>
              </div>
            )}
            
            {editForm?.times_locked && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded">
                Times are locked{editForm.times_locked_by ? ` by ${editForm.times_locked_by}` : ''}{editForm.times_locked_at ? ` on ${new Date(editForm.times_locked_at).toLocaleString()}` : ''}. Non-admins cannot edit time fields.
              </div>
            )}
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Code</label>
                  <input
                    type="text"
                    value={editForm.tool_code}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tool Description {user?.role === 'manager' && <span className="text-orange-600">(requires approval)</span>}
                  </label>
                  <input
                    type="text"
                    value={editForm.tool_description}
                    onChange={e => setEditForm({ ...editForm, tool_description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNC Time (min) {user?.role === 'manager' && <span className="text-green-600">✓ direct edit</span>}
                  </label>
                  <input
                    type="number"
                    value={editForm.cnc_time}
                    onChange={e => setEditForm({ ...editForm, cnc_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                    disabled={!!editForm.times_locked && user?.role !== 'admin'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cylindrical Time (min) {user?.role === 'manager' && <span className="text-green-600">✓ direct edit</span>}
                  </label>
                  <input
                    type="number"
                    value={editForm.cylindrical_time}
                    onChange={e => setEditForm({ ...editForm, cylindrical_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                    disabled={!!editForm.times_locked && user?.role !== 'admin'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    T&C Time (min) {user?.role === 'manager' && <span className="text-green-600">✓ direct edit</span>}
                  </label>
                  <input
                    type="number"
                    value={editForm.tc_time}
                    onChange={e => setEditForm({ ...editForm, tc_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                    disabled={!!editForm.times_locked && user?.role !== 'admin'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organisational Korv {user?.role === 'manager' && <span className="text-green-600">✓ direct edit</span>}
                  </label>
                  <input
                    type="number"
                    value={editForm.organisational_korv}
                    onChange={e => setEditForm({ ...editForm, organisational_korv: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calculated Korv per Unit (read-only)</label>
                  <input
                    type="number"
                    value={calculateKorvPerUnit(
                      editForm.cnc_time ? parseFloat(editForm.cnc_time) : 0,
                      editForm.cylindrical_time ? parseFloat(editForm.cylindrical_time) : 0,
                      editForm.tc_time ? parseFloat(editForm.tc_time) : 0
                    )}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  />
                </div>
                {user?.role === 'manager' && editForm.tool_description !== editTool.tool_description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Description Change (required for admin approval)
                    </label>
                    <textarea
                      value={managerReason}
                      onChange={e => setManagerReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      required
                      placeholder="Explain why you're changing the tool description..."
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 items-center flex-wrap">
                <button type="submit" disabled={editLoading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md">
                  {editLoading ? 'Saving...' : (user?.role === 'manager' && editForm.tool_description !== editTool.tool_description ? 'Save Timing & Request Description Approval' : 'Save Changes')}
                </button>
                <button type="button" onClick={() => setEditTool(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md">Cancel</button>
                {user?.role === 'admin' && !editForm.times_locked && (
                  <button
                    type="button"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md"
                    onClick={async () => {
                      const { error } = await supabase
                        .from('tool_master')
                        .update({
                          times_locked: true,
                          times_locked_at: new Date().toISOString(),
                          times_locked_by: user.username
                        })
                        .eq('tool_code', editForm.tool_code);
                      if (!error) {
                        setEditForm(prev => ({ ...prev, times_locked: true, times_locked_at: new Date().toISOString(), times_locked_by: user.username }));
                      } else {
                        setEditMessage('Error locking times: ' + error.message);
                      }
                    }}
                  >
                    Lock Times
                  </button>
                )}
              </div>
              {editMessage && (
                <div className={`mt-2 p-2 rounded-md ${editMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {editMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Delete Tool Modal */}
      {deleteTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDeleteTool(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 z-10">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Tool</h3>
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> You are about to delete this tool permanently!
                </p>
                <p className="mt-2"><strong>Tool Code:</strong> {deleteTool.tool_code}</p>
                <p><strong>Description:</strong> {deleteTool.tool_description}</p>
              </div>
              {user?.role === 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Deletion (required)</label>
                  <textarea
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    required
                    placeholder="Explain why you're deleting this tool..."
                  />
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button type="submit" disabled={deleteLoading} className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 px-4 rounded-md">
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button type="button" onClick={() => setDeleteTool(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md">Cancel</button>
              </div>
              {deleteMessage && (
                <div className={`mt-2 p-2 rounded-md ${deleteMessage.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {deleteMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
          <input
            type="text"
            placeholder="Search tool code or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2"
          >
            ➕ Create New Tool
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow text-sm border border-gray-300" style={{ tableLayout: 'auto', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">Tool Code</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">Description</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider border-b border-r border-gray-300">Korv Value</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700 uppercase tracking-wider border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-2">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-2 text-gray-500">No tools found</td></tr>
              ) : filtered.map(tool => (
                <tr key={tool.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap align-top border-b border-r border-gray-300">{tool.tool_code}</td>
                  <td className="px-4 py-2 align-top border-b border-r border-gray-300" style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{tool.tool_description}</td>
                  <td className="px-4 py-2 whitespace-nowrap align-top border-b border-r border-gray-300">{tool.standard_korv}</td>
                  <td className="px-4 py-2 flex gap-2 align-top border-b"> 
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => openEditModal(tool)}
                    >Edit</button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                      onClick={() => openDeleteModal(tool)}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


