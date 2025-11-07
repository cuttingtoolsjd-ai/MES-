
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { listStockMovements } from '../lib/stock';
import WorkOrderStatusTracker from './WorkOrderStatusTracker';

export default function WorkOrderDetailModal({ order, onClose, user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockIssues, setStockIssues] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [workOrder, setWorkOrder] = useState(order);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const justOpenedRef = useRef(true);
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!order) return;
    fetchData();
  }, [order]);

  // Lock scroll and add ESC-to-close while modal is open
  useEffect(() => {
    if (!order || !mounted) return;
    
    // Save current scroll position to ref
    scrollYRef.current = window.scrollY;
    
    // Lock scroll by fixing body position
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    }
    window.addEventListener('keydown', handleKey);
    
    return () => {
      window.removeEventListener('keydown', handleKey);
      
      // Remove ALL scroll lock styles
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      // Force scroll restoration
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollYRef.current);
      });
    };
  }, [order, onClose, mounted]);

  // Avoid SSR/Next hydration mismatch and ensure we can portal to body
  useEffect(() => {
    console.log('Modal mounting, order:', order?.work_order_no);
    setMounted(true);
    // Trigger animation after mount
    setTimeout(() => {
      console.log('Setting visible to true');
      setVisible(true);
    }, 10);
    justOpenedRef.current = true;
    // Allow clicks after a brief delay to prevent event bubbling from triggering close
    const timer = setTimeout(() => {
      justOpenedRef.current = false;
    }, 100);
    return () => {
      console.log('Modal unmounting');
      setMounted(false);
      setVisible(false);
      clearTimeout(timer);
    };
  }, []);

  async function fetchData() {
    // Fetch latest work order data
    const { data: woData, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', order.id)
      .single();
    
    if (!woError && woData) {
      setWorkOrder(woData);
    }

    // Fetch assignments
    setLoading(true);
    const { data, error } = await supabase
      .from('machine_assignments')
      .select('id, machine, work_order_id, assigned_korv, notes, assigned_at, status, released_at, is_active, started_at, order')
      .eq('work_order_id', order.id)
      .order('assigned_at', { ascending: true });
    console.log('Fetching assignments for WO:', order.id, 'Data:', data, 'Error:', error);
    setAssignments(data || []);
    setLoading(false);

    // Fetch stock issues
    setLoadingStock(true);
    const { data: stockData, error: stockError } = await listStockMovements({ workOrderId: order.id });
    setStockIssues(stockData || []);
    setLoadingStock(false);
  }

  if (!mounted || !order) {
    return null;
  }

  const handleBackdropClick = (e) => {
    // Prevent closing if modal just opened (event bubbling from View button)
    if (justOpenedRef.current) return;
    // Only close if clicking directly on the backdrop, not on children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Render WITHOUT portal to test
  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: visible ? 'rgba(0, 0, 0, 0.75)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999999,
        transition: 'background-color 0.3s ease',
        padding: '1rem'
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full relative"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          padding: '1.5rem',
          zIndex: 999999999,
          overflowY: 'auto',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.9)',
          transition: 'opacity 0.3s ease, transform 0.3s ease'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
          style={{ zIndex: 10 }}
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="pr-8">
          <div className="text-lg font-bold text-blue-700 mb-2">WO {workOrder.work_order_no}</div>
          <div className="text-xs text-gray-500 mb-1">{workOrder.tool_code} — {workOrder.tool_description}</div>
          <div className="text-xs text-gray-500 mb-1">Qty: {workOrder.quantity}</div>
          <div className="text-xs text-gray-500 mb-1">Status: <span className="font-semibold">{workOrder.status}</span></div>
          <div className="text-xs text-gray-400 mb-4">Created: {workOrder.created_on?.slice(0,10)}</div>
        </div>
        
        {/* Status Tracker */}
        {user && (
          <div className="mb-6">
            <WorkOrderStatusTracker 
              workOrder={workOrder} 
              user={user} 
              onUpdate={fetchData}
            />
          </div>
        )}
        
        <div className="mb-3 text-sm font-semibold text-gray-700">Assignments / Planning</div>
        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No assignments found.</div>
        ) : (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Machine</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Department</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Shift</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Operator</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Korv</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Assigned At</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Done At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignments.map((a) => {
                  let dept = '', shift = '', operator = '', extra = {};
                  try { 
                    extra = JSON.parse(a.notes || '{}'); 
                    dept = extra.dept || ''; 
                    shift = extra.shift || ''; 
                    operator = extra.operator || ''; 
                  } catch {}
                  const isActive = a.is_active && !a.released_at;
                  const isReleased = !!a.released_at;
                  return (
                    <tr
                      key={a.id}
                      className={
                        (isActive ? 'bg-blue-100 border-l-4 border-l-blue-600 ' : '') +
                        (isReleased ? 'bg-gray-50 text-gray-500' : '')
                      }
                    >
                      <td className="px-3 py-2 font-semibold text-blue-700 border-b">
                        <div className="flex items-center gap-2">
                          {a.machine}
                          {isActive && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded animate-pulse">
                              ⚡ ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-b">
                        {dept ? dept.toUpperCase() : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-b capitalize">
                        {shift || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 border-b">
                        {operator || '-'}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-700 border-b">
                        {a.assigned_korv}
                      </td>
                      <td className="px-3 py-2 text-gray-500 border-b whitespace-nowrap">
                        {a.assigned_at?.slice(0,16).replace('T',' ')}
                      </td>
                      <td className="px-3 py-2 text-center border-b">
                        {isActive ? (
                          <span className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-bold">
                            Working
                          </span>
                        ) : isReleased ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            Done
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-500 border-b whitespace-nowrap">
                        {a.released_at ? (
                          <span className="text-emerald-600">{a.released_at.slice(0,16).replace('T',' ')}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
