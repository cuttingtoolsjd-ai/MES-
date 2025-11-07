import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PermissionRequestsTable({ user }) {
  const [permissionRequests, setPermissionRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [requestMessage, setRequestMessage] = useState('')

  useEffect(() => {
    fetchPermissionRequests()
  }, [])

  async function fetchPermissionRequests() {
    setLoadingRequests(true)
    try {
      const { data, error } = await supabase
        .from('manager_permission_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      if (error) {
        setRequestMessage('Error fetching requests: ' + error.message)
      } else {
        setPermissionRequests(data || [])
      }
    } catch (err) {
      setRequestMessage('Unexpected error: ' + err.message)
    } finally {
      setLoadingRequests(false)
    }
  }

  async function handleApproveRequest(requestId, action, toolCode) {
    try {
      if (action === 'delete') {
        // Delete the tool immediately
        const { error: delError } = await supabase
          .from('tool_master')
          .delete()
          .eq('tool_code', toolCode)
        if (delError) {
          setRequestMessage('Error deleting tool: ' + delError.message)
          return
        }
        // Mark request as approved
        const { error: reqError } = await supabase
          .from('manager_permission_requests')
          .update({
            status: 'approved',
            reviewed_by: user.username,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', requestId)
        if (reqError) {
          setRequestMessage('Error updating request: ' + reqError.message)
        } else {
          setRequestMessage(`✅ Tool ${toolCode} deleted and request approved.`)
          fetchPermissionRequests()
          setTimeout(() => setRequestMessage(''), 3000)
        }
      } else if (action === 'edit') {
        // Fetch the request to see if it contains tool_data (manager's submitted edit)
        const { data: reqData, error: reqFetchError } = await supabase
          .from('manager_permission_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle()
        if (reqFetchError) {
          setRequestMessage('Error fetching request: ' + reqFetchError.message)
          return
        }
        if (reqData && reqData.tool_data) {
          // This is a manager's submitted edit, apply it to tool_master
          const toolData = reqData.tool_data
          const computedKorv = ((parseFloat(toolData.cnc_time || 0) + parseFloat(toolData.cylindrical_time || 0) + parseFloat(toolData.tc_time || toolData.tc_estimated || 0)) / 5).toFixed(2)
          const { error: updateError } = await supabase
            .from('tool_master')
            .update({
              tool_description: toolData.tool_description,
              standard_korv: parseFloat(computedKorv),
              cnc_time: toolData.cnc_time ? parseFloat(toolData.cnc_time) : 0,
              cylindrical_time: toolData.cylindrical_time ? parseFloat(toolData.cylindrical_time) : 0,
              tc_time: toolData.tc_time ? parseFloat(toolData.tc_time) : (toolData.tc_estimated ? parseFloat(toolData.tc_estimated) : 0),
              organisational_korv: toolData.organisational_korv ? parseFloat(toolData.organisational_korv) : null,
              last_updated: new Date().toISOString()
            })
            .eq('tool_code', toolCode)
          if (updateError) {
            setRequestMessage('Error applying manager edit: ' + updateError.message)
            return
          }
          // Mark request as approved
          const { error: reqError } = await supabase
            .from('manager_permission_requests')
            .update({
              status: 'approved',
              reviewed_by: user.username,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', requestId)
          if (reqError) {
            setRequestMessage('Error updating request: ' + reqError.message)
          } else {
            setRequestMessage(`✅ Manager's edit applied and request approved for tool ${toolCode}.`)
            fetchPermissionRequests()
            setTimeout(() => setRequestMessage(''), 3000)
          }
        } else {
          // First approval: allow manager to edit
          const { error } = await supabase
            .from('manager_permission_requests')
            .update({
              status: 'approved',
              reviewed_by: user.username,
              reviewed_at: new Date().toISOString()
            })
            .eq('id', requestId)
          if (error) {
            setRequestMessage('Error approving request: ' + error.message)
          } else {
            setRequestMessage(`✅ Edit request approved! Manager can now edit tool ${toolCode}.`)
            fetchPermissionRequests()
            setTimeout(() => setRequestMessage(''), 3000)
          }
        }
      }
    } catch (err) {
      setRequestMessage('Unexpected error: ' + err.message)
    }
  }

  async function handleDenyRequest(requestId, adminNotes = '') {
    try {
      const { error } = await supabase
        .from('manager_permission_requests')
        .update({
          status: 'denied',
          reviewed_by: user.username,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes
        })
        .eq('id', requestId)
      if (error) {
        setRequestMessage('Error denying request: ' + error.message)
      } else {
        setRequestMessage('❌ Request denied.')
        fetchPermissionRequests()
        setTimeout(() => setRequestMessage(''), 3000)
      }
    } catch (err) {
      setRequestMessage('Unexpected error: ' + err.message)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Manager Permission Requests</h2>
      {requestMessage && (
        <div className={`mb-4 p-4 rounded-md ${
          requestMessage.includes('✅') || requestMessage.includes('successfully')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {requestMessage}
        </div>
      )}
      {loadingRequests ? (
        <div className="text-center py-4">Loading requests...</div>
      ) : permissionRequests.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No permission requests found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested By
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tool Code
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested At
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {permissionRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {request.requested_by}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {request.tool_code}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.action === 'edit' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {request.action === 'edit' ? 'Edit' : 'Delete'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={request.reason}>
                    {request.reason}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      request.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {new Date(request.requested_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id, request.action, request.tool_code)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDenyRequest(request.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Deny
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">
                        {request.status === 'approved' ? 'Approved' : 'Denied'} by {request.reviewed_by}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 text-center">
        <button
          onClick={fetchPermissionRequests}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          🔄 Refresh Requests
        </button>
      </div>
    </div>
  )
}
