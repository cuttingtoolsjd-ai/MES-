import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import SplitWorkOrderModal from '../../components/SplitWorkOrderModal'
import ForcePasswordChangeModal from '../../components/ForcePasswordChangeModal'
import ChangePinModal from '../../components/ChangePinModal'
import MachineSettingsTable from '../../components/MachineSettingsTable'
import UserMenu from '../../components/UserMenu'

// Hardcoded machine list
const AVAILABLE_MACHINES = [
  'CNC1', 'CNC2', 'CNC3', 'CNC4', 'CNC5', 'CNC7',
  'CYLN1', 'CYLN2', 'CPX', 'TOPWORK',
  'OPG1', 'T&C1', 'T&C2',
  'COATING', 'EDM'
];

export default function OperatorDashboard() {
  const [user, setUser] = useState(null)
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [showChangePinModal, setShowChangePinModal] = useState(false)
  const [showMachineSettings, setShowMachineSettings] = useState(false)
  const router = useRouter()
  const [selectedMachines, setSelectedMachines] = useState([]) // Changed to array for multiple machines
  const [orderedAssignments, setOrderedAssignments] = useState([]);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [selectedWOForSplit, setSelectedWOForSplit] = useState(null);
  const [machinesConfirmed, setMachinesConfirmed] = useState(false); // Track if machines are confirmed
  const [pendingTransfers, setPendingTransfers] = useState([]); // Track pending transfers needing approval

  useEffect(() => {
    // Check if user is logged in and has operator role
    // Try multiple sources for auth data (localStorage → sessionStorage)
    let currentUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser')
    
    if (!currentUser) {
      router.push('/login')
      return
    }
    
    try {
      const parsed = JSON.parse(currentUser)
      const normalizedRole = String(parsed?.role || '').toLowerCase()
      const userData = { ...parsed, role: normalizedRole }
      
      // Ensure both storage methods have the latest data
      localStorage.setItem('currentUser', JSON.stringify(userData))
      sessionStorage.setItem('currentUser', JSON.stringify(userData))
      
      if (userData.role !== 'operator') {
        router.push(`/dashboard/${userData.role}`)
        return
      }
      
      setUser(userData)
      
        // Check if password change is required
        if (userData.password_change_required) {
          setShowPasswordChangeModal(true)
        }
      
      // Check if machines were confirmed in this session
      const machinesConfirmed = sessionStorage.getItem('machinesConfirmed')
      if (machinesConfirmed === 'true') {
        setMachinesConfirmed(true)
        const savedMachines = JSON.parse(localStorage.getItem('operatorMachines') || '[]')
        setSelectedMachines(savedMachines)
      }
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }, [router])

  function handleLogout() {
    // Record logout timestamp before clearing session
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser)
        supabase
          .from('users')
          .update({ last_logout: new Date().toISOString() })
          .eq('id', userData.id)
          .then(() => {
            localStorage.removeItem('currentUser')
            localStorage.removeItem('operatorMachines')
            sessionStorage.removeItem('machinesConfirmed')
            router.push('/login')
          })
      } catch {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('operatorMachines')
        sessionStorage.removeItem('machinesConfirmed')
        router.push('/login')
      }
    } else {
      localStorage.removeItem('currentUser')
      localStorage.removeItem('operatorMachines')
      sessionStorage.removeItem('machinesConfirmed')
      router.push('/login')
    }
  }

    function handlePasswordChanged() {
      setShowPasswordChangeModal(false)
      const updatedUser = { ...user, password_change_required: false }
      setUser(updatedUser)
    }

  function handleMachineToggle(machine) {
    setSelectedMachines(prev => {
      if (prev.includes(machine)) {
        return prev.filter(m => m !== machine)
      } else if (prev.length < 3) {
        return [...prev, machine]
      }
      return prev // Already at max 3 machines
    })
  }

  function handleConfirmMachines() {
    if (selectedMachines.length === 0) {
      alert('Please select at least 1 machine')
      return
    }
    localStorage.setItem('operatorMachines', JSON.stringify(selectedMachines))
    sessionStorage.setItem('machinesConfirmed', 'true')
    setMachinesConfirmed(true)
  }

  function handleChangeMachines() {
    setMachinesConfirmed(false)
    sessionStorage.removeItem('machinesConfirmed')
  }

  async function handleApproveTransfer(transferId) {
    const confirmed = confirm(
      '⚠️ IMPORTANT CONFIRMATION ⚠️\n\n' +
      'By accepting this transfer, you confirm that:\n\n' +
      '✓ You WILL complete your current assigned workload\n' +
      '✓ You have sufficient time in your shift to handle this additional work\n' +
      '✓ You understand this is a commitment to complete the transferred work\n\n' +
      'Do you accept this responsibility?'
    );
    
    if (!confirmed) return;

    const { error } = await supabase
      .from('machine_assignments')
      .update({ 
        transfer_status: 'active',
        pending_operator: null
      })
      .eq('id', transferId);

    if (error) {
      alert('Error approving transfer: ' + error.message);
    } else {
      alert('✅ Transfer approved! This work is now your responsibility.');
      // Refresh the data
      const event = new CustomEvent('refreshData');
      window.dispatchEvent(event);
      window.location.reload();
    }
  }

  async function handleRejectTransfer(transferId) {
    if (!confirm('Are you sure you want to reject this transfer? It will be deleted.')) return;
    
    const { error } = await supabase
      .from('machine_assignments')
      .delete()
      .eq('id', transferId);

    if (error) {
      alert('Error rejecting transfer: ' + error.message);
    } else {
      alert('❌ Transfer rejected and removed');
      window.location.reload();
    }
  }

  async function handleMarkAsDone(assignmentId, machine, korv) {
    const confirmed = confirm(
      '✅ Mark this work order as DONE?\n\n' +
      'This will:\n' +
      '• Remove it from your work queue\n' +
      '• Free up ' + korv + ' korv on ' + machine + '\n' +
      '• Mark it as completed\n\n' +
      'Confirm completion?'
    );
    
    if (!confirmed) return;

    // Get the current assignment to retrieve work_order_id and existing notes
    const { data: assignment, error: fetchError } = await supabase
      .from('machine_assignments')
      .select('work_order_id, notes')
      .eq('id', assignmentId)
      .single();

    if (fetchError) {
      alert('Error fetching assignment: ' + fetchError.message);
      return;
    }

    // Parse existing notes and add operator name
    let notes = {};
    try {
      notes = JSON.parse(assignment.notes || '{}');
    } catch {}
    notes.operator = user.username;
    notes.completed_by = user.username;

    // Set released_at to mark as complete and remove active status
    const { error } = await supabase
      .from('machine_assignments')
      .update({ 
        released_at: new Date().toISOString(),
        is_active: false,
        notes: JSON.stringify(notes)
      })
      .eq('id', assignmentId);

    if (error) {
      alert('Error marking as done: ' + error.message);
      return;
    }

    // Check if all assignments for this work order are now released
    const { data: allAssignments, error: checkError } = await supabase
      .from('machine_assignments')
      .select('id, released_at')
      .eq('work_order_id', assignment.work_order_id);

    if (!checkError && allAssignments) {
      const allReleased = allAssignments.every(a => a.released_at !== null);
      
      if (allReleased) {
        // Update work order status to Production Done and mark production completed
        await supabase
          .from('work_orders')
          .update({ 
            status: 'Production Done',
            production_completed_at: new Date().toISOString(),
            production_completed_by: user.username
          })
          .eq('id', assignment.work_order_id);
        
        alert('✅ Work order marked as DONE! All production assignments completed - Work Order moves to next stage (Marking/Coating)!');
      } else {
        alert('✅ Work order marked as DONE! Machine capacity freed.');
      }
    } else {
      alert('✅ Work order marked as DONE! Machine capacity freed.');
    }

    window.location.reload();
  }

  async function handleStartWorking(assignmentId, machine) {
    // First, deactivate any other work order on this machine
    await supabase
      .from('machine_assignments')
      .update({ is_active: false })
      .eq('machine', machine)
      .eq('is_active', true);

    // Get existing notes and add operator name
    const { data: assignment, error: fetchError } = await supabase
      .from('machine_assignments')
      .select('notes')
      .eq('id', assignmentId)
      .single();

    let notes = {};
    if (!fetchError && assignment) {
      try {
        notes = JSON.parse(assignment.notes || '{}');
      } catch {}
    }
    notes.operator = user.username;
    notes.started_by = user.username;

    // Then activate this work order
    const { error } = await supabase
      .from('machine_assignments')
      .update({ 
        is_active: true,
        started_at: new Date().toISOString(),
        notes: JSON.stringify(notes)
      })
      .eq('id', assignmentId);

    if (error) {
      alert('Error starting work: ' + error.message);
    } else {
      alert('✅ Work order started! This is now active on ' + machine);
      window.location.reload();
    }
  }

  function handleSplitClick(workOrder) {
    setSelectedWOForSplit(workOrder);
    setSplitModalOpen(true);
  }

  function handleSplitSuccess() {
    // Refresh assignments after split
    selectedMachines.forEach(machine => {
      supabase
        .from('machine_assignments')
        .select(`
          id, 
          work_order_id, 
          order,
          assigned_korv,
          work_orders (
            work_order_no,
            tool_code,
            quantity
          )
        `)
        .eq('machine', machine)
        .is('released_at', null)
        .then(({ data }) => {
          const sorted = (data || []).sort((a, b) => {
            if (a.order === null && b.order === null) return 0;
            if (a.order === null) return 1;
            if (b.order === null) return -1;
            return a.order - b.order;
          });
          setOrderedAssignments(prev => ({
            ...prev,
            [machine]: sorted
          }));
        });
    })
  }

  useEffect(() => {
    if (machinesConfirmed && selectedMachines.length > 0) {
      const assignmentsByMachine = {};
      const allPendingTransfers = [];
      
      const fetchPromises = selectedMachines.map(machine => 
        supabase
          .from('machine_assignments')
          .select(`
            id, 
            work_order_id, 
            order,
            assigned_korv,
            notes,
            transfer_status,
            work_orders (
              work_order_no,
              tool_code,
              quantity
            )
          `)
          .eq('machine', machine)
          .is('released_at', null)
          .then(({ data }) => {
            // Separate pending transfers from active assignments
            const pending = (data || []).filter(item => item.transfer_status === 'pending_approval');
            const active = (data || []).filter(item => item.transfer_status !== 'pending_approval');
            
            // Store pending transfers
            allPendingTransfers.push(...pending.map(item => ({
              ...item,
              machine,
              parsedNotes: JSON.parse(item.notes || '{}')
            })));
            
            // Sort active by order (nulls last)
            const sorted = active.sort((a, b) => {
              if (a.order === null && b.order === null) return 0;
              if (a.order === null) return 1;
              if (b.order === null) return -1;
              return a.order - b.order;
            });
            
            // Parse notes to identify transfers
            const enriched = sorted.map(item => {
              let parsedNotes = {};
              try {
                parsedNotes = JSON.parse(item.notes || '{}');
              } catch {}
              return {
                ...item,
                isTransferIn: ['one-way', 'two-way-in'].includes(parsedNotes.transfer_type),
                transferInfo: parsedNotes
              };
            });
            
            assignmentsByMachine[machine] = enriched;
          })
      );

      Promise.all(fetchPromises).then(() => {
        setOrderedAssignments(assignmentsByMachine);
        setPendingTransfers(allPendingTransfers);
      });
    }
  }, [machinesConfirmed, selectedMachines]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
        {/* Force Password Change Modal */}
        {showPasswordChangeModal && (
          <ForcePasswordChangeModal 
            user={user} 
            onPasswordChanged={handlePasswordChanged}
          />
        )}

        {/* Change PIN Modal */}
        {showChangePinModal && (
          <ChangePinModal 
            user={user} 
            onClose={() => setShowChangePinModal(false)}
            onSuccess={() => {
              setShowChangePinModal(false);
              alert('PIN changed successfully! Please use your new PIN on next login.');
            }}
          />
        )}
      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3 w-2/5">
              <button 
                onClick={() => {
                  try {
                    const saved = typeof window !== 'undefined' ? localStorage.getItem('currentUser') : null;
                    const parsed = saved ? JSON.parse(saved) : null;
                    const rawRole = (parsed?.role || user?.role || '').toString();
                    const role = rawRole.trim().toLowerCase();
                    const allowed = ['admin','manager','operator'];
                    if (allowed.includes(role)) {
                      router.push(`/dashboard/${role}`);
                    } else if (role.includes('admin')) {
                      router.push('/dashboard/admin');
                    } else if (role.includes('manager')) {
                      router.push('/dashboard/manager');
                    } else if (role.includes('operator') || role.includes('worker')) {
                      router.push('/dashboard/operator');
                    } else {
                      router.push('/login');
                    }
                  } catch (e) {
                    router.push('/login');
                  }
                }}
                className="hover:opacity-80 transition-opacity flex-shrink-0 w-28 h-10 sm:w-40 sm:h-12 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                title="Home"
              >
                <img 
                  src="/logo.png" 
                  alt="JD Cutting Tools" 
                  className="w-full h-full object-contain"
                />
              </button>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-600">Welcome back, <span className="font-semibold">{user.username}</span></p>
                <p className="text-xs text-gray-500">Operator Dashboard</p>
              </div>
            </div>
            <div className="w-3/5 flex justify-end">
              <UserMenu 
                user={user} 
                onChangePinClick={() => setShowChangePinModal(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow p-4 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user.username}!
            </h2>
            
            <p className="text-gray-600 mb-8">
              You are logged in as an <span className="font-semibold text-green-600">Operator</span>
            </p>

            {/* Machine Selector - Only shown if not confirmed */}
            {!machinesConfirmed && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-8">
                <h3 className="text-xl font-bold text-blue-900 mb-2">🏭 Select Your Machines for This Shift</h3>
                <p className="text-blue-700 mb-4">Choose 1 to 3 machines you'll be operating today</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {AVAILABLE_MACHINES.map(machine => (
                    <button
                      key={machine}
                      onClick={() => handleMachineToggle(machine)}
                      className={`px-4 py-3 rounded-lg font-bold text-lg transition-all ${
                        selectedMachines.includes(machine)
                          ? 'bg-green-600 text-white border-2 border-green-700 shadow-lg scale-105'
                          : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {machine}
                      {selectedMachines.includes(machine) && ' ✓'}
                    </button>
                  ))}
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">
                    Selected: <span className="font-bold text-gray-900">{selectedMachines.length} of 3 machines</span>
                  </div>
                  {selectedMachines.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedMachines.map(m => (
                        <span key={m} className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleConfirmMachines}
                  disabled={selectedMachines.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
                >
                  {selectedMachines.length === 0 
                    ? 'Select at least 1 machine to continue' 
                    : `Confirm ${selectedMachines.length} Machine${selectedMachines.length > 1 ? 's' : ''} & Start Shift`
                  }
                </button>
              </div>
            )}

            {/* Work Orders - Only shown after machines are confirmed */}
            {machinesConfirmed && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-green-900">Operating Machines:</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedMachines.map(m => (
                          <span key={m} className="px-3 py-1 bg-green-600 text-white rounded-full font-bold">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleChangeMachines}
                      className="px-4 py-2 bg-white border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 font-medium"
                    >
                      Change Machines
                    </button>
                  </div>
                </div>

                {/* Pending Transfers Section */}
                {pendingTransfers.length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold text-yellow-900 mb-2 flex items-center gap-2">
                      ⚠️ Pending Transfer Approvals ({pendingTransfers.length})
                    </h3>
                    <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-4">
                      <p className="text-red-900 font-bold text-sm mb-2">⚠️ IMPORTANT NOTICE:</p>
                      <p className="text-red-800 text-sm font-medium">
                        When you accept a transfer, you accept the responsibility to finish the job along with your existing workload for the shift!
                      </p>
                    </div>
                    <p className="text-yellow-700 text-sm mb-4">
                      Review the workload carefully and confirm if you have capacity to accept these transfers.
                    </p>
                    
                    <div className="space-y-3">
                      {pendingTransfers.map(transfer => {
                        const woDetails = transfer.work_orders;
                        const notes = transfer.parsedNotes;
                        
                        return (
                          <div key={transfer.id} className="bg-white border-2 border-yellow-300 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                                    NEEDS APPROVAL
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {transfer.machine}
                                  </span>
                                </div>
                                
                                <div className="mb-2">
                                  <div className="font-bold text-lg text-gray-900">
                                    WO: {woDetails?.work_order_no || transfer.work_order_id}
                                  </div>
                                  {woDetails && (
                                    <div className="text-sm text-gray-600">
                                      Tool: {woDetails.tool_code} • Korv: {transfer.assigned_korv}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="bg-yellow-100 rounded p-2 mb-2">
                                  <div className="text-sm font-medium text-yellow-900">
                                    Work Description: {notes.work_description || 'N/A'}
                                  </div>
                                  <div className="text-xs text-yellow-700 mt-1">
                                    From: {notes.from_machine} • 
                                    Transferred by: {notes.transferred_by}
                                  </div>
                                </div>
                                
                                <div className="text-sm text-gray-700">
                                  <span className="font-medium">Type:</span> {
                                    notes.transfer_type === 'one-way' ? 'One-Way Transfer' :
                                    notes.transfer_type === 'two-way-out' ? 'Two-Way Swap (Outgoing)' :
                                    'Two-Way Swap (Incoming)'
                                  }
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => handleApproveTransfer(transfer.id)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium whitespace-nowrap"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  onClick={() => handleRejectTransfer(transfer.id)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium whitespace-nowrap"
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedMachines.map(machine => {
                  const assignments = orderedAssignments[machine] || [];
                  return (
                    <div key={machine} className="bg-white border-2 border-gray-200 rounded-lg p-6 mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        📋 {machine} Work Queue
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">Complete work orders in this order</p>
                      
                      {assignments.length === 0 ? (
  <div className="text-gray-500 text-center p-4 bg-gray-50 rounded">
    No work orders assigned to this machine.
  </div>
) : (
  <ol className="space-y-2">
    {assignments.map((a, idx) => {
      const woDetails = a.work_orders;
      const woNumber = woDetails?.work_order_no || a.work_order_id;
      const isTransferred = a.isTransferIn;
      const transferInfo = a.transferInfo;
      const isActive = a.is_active;
      return (
        <li 
          key={a.id} 
          className={`flex items-start gap-3 p-3 rounded-lg shadow-sm border-2 ${
            isActive
              ? 'bg-blue-100 border-blue-500 border-4'
              : isTransferred 
              ? 'bg-pink-50 border-pink-300' 
              : 'bg-white border-green-200'
          }`}
        >
          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
            isActive
              ? 'bg-blue-600 text-white'
              : isTransferred
              ? 'bg-pink-600 text-white'
              : 'bg-green-600 text-white'
          }`}>
            {idx + 1}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-bold text-gray-900">WO: {woNumber}</div>
              {isActive && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded animate-pulse">
                  ⚡ WORKING NOW
                </span>
              )}
              {isTransferred && (
                <span className="px-2 py-0.5 bg-pink-600 text-white text-xs font-bold rounded">
                  TRANSFERRED IN
                </span>
              )}
            </div>
            {woDetails && (
              <div className="text-sm text-gray-600 mt-1">
                {woDetails.tool_code && `Tool: ${woDetails.tool_code} • `}
                Qty: {woDetails.quantity} • Korv: {a.assigned_korv}
              </div>
            )}
            {isTransferred && transferInfo.work_description && (
              <div className="text-sm text-pink-800 mt-1 bg-pink-100 rounded px-2 py-1">
                <span className="font-medium">Work: </span>{transferInfo.work_description}
                {transferInfo.from_machine && (
                  <span className="ml-2 text-pink-600">
                    (from {transferInfo.from_machine})
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {!isActive && (
              <button
                onClick={() => handleStartWorking(a.id, machine)}
                className="flex-shrink-0 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-bold"
                title="Start working on this work order"
              >
                ▶️ Start
              </button>
            )}
            <button
              onClick={() => handleMarkAsDone(a.id, machine, a.assigned_korv)}
              className="flex-shrink-0 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-bold"
              title="Mark this work order as complete"
            >
              ✓ Done
            </button>
            {!isTransferred && (
              <button
                onClick={() => {
                  setSelectedWOForSplit({ ...a, currentMachine: machine });
                  setSplitModalOpen(true);
                }}
                className="flex-shrink-0 px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm font-medium"
                title="Split or transfer this work order"
              >
                Split/Transfer
              </button>
            )}
          </div>
        </li>
      );
    })}
  </ol>
)}
                    </div>
                  );
                })}
              </>
            )}

            {!machinesConfirmed && (
              <div className="text-center text-gray-500 mt-8">
                <p className="mb-4">👆 Select your machines above to start your shift</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">🔧</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Machine Operations</h3>
                <p className="text-gray-600 text-sm">Start, stop, and monitor your machine</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-2xl font-bold text-gray-900 mb-2">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Production Log</h3>
                <p className="text-gray-600 text-sm">Track your daily production</p>
              </div>
            </div>

            <div className="text-center text-gray-500">
              <p className="mb-4">🚧 Operator features are coming soon!</p>
              <p className="text-sm">This dashboard will include machine controls, production tracking, and task management.</p>
            </div>
          </div>
        </div>

        {/* Work Status */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Tasks</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                <span className="text-green-800">Machine Setup</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Completed</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                <span className="text-blue-800">Production Run #1</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">In Progress</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-gray-600">Quality Check</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Pending</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Info</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><span className="font-medium">Role:</span> Operator</p>
              <p><span className="font-medium">Access Level:</span> Machine Operation</p>
              <p><span className="font-medium">Login Time:</span> {new Date().toLocaleString()}</p>
              <p><span className="font-medium">Shift:</span> Day Shift</p>
              {machinesConfirmed && selectedMachines.length > 0 && (
                <p><span className="font-medium">Current Machines:</span> {selectedMachines.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Split Work Order Modal */}
      <SplitWorkOrderModal
        isOpen={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        workOrder={selectedWOForSplit}
        currentMachine={selectedWOForSplit?.currentMachine}
        onSuccess={handleSplitSuccess}
        user={user}
      />

      {/* Machine Settings Modal */}
      {showMachineSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-2 p-4 relative animate-fadein max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowMachineSettings(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >&times;</button>
            <MachineSettingsTable />
          </div>
        </div>
      )}
    </div>
  )
}