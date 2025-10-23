import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function EmployeeTable({ users, onDeactivate, onReactivate }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Machine</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{user.role}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{user.assigned_machine || '-'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.active ? 'Active' : 'Inactive'}</span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm">
                {user.active ? (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => onDeactivate(user.id)}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    className="text-green-600 hover:underline"
                    onClick={() => onReactivate && onReactivate(user.id)}
                  >
                    Reactivate
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
