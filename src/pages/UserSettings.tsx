import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, KeyRound, Loader2 } from 'lucide-react';

interface User {
  id: number;
  username: string;
  created_at: string;
}

export default function UserSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const [changePasswordId, setChangePasswordId] = useState<number | null>(null);
  const [changePasswordValue, setChangePasswordValue] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword })
      });
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create user');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  const handleChangePassword = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: changePasswordValue })
      });
      if (res.ok) {
        alert('Password updated successfully');
        setChangePasswordId(null);
        setChangePasswordValue('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update password');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage admin users who can access the dashboard.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <UserPlus className="h-5 w-5 mr-2 text-gray-500" />
            Add New User
          </h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="newUsername" className="sr-only">Username</label>
              <input
                id="newUsername"
                type="text"
                required
                placeholder="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="newPassword" className="sr-only">Password</label>
              <input
                id="newPassword"
                type="password"
                required
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Add User
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <KeyRound className="h-5 w-5 mr-2 text-gray-500" />
            Manage Users
          </h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <p className="text-sm text-gray-500">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  {changePasswordId === user.id ? (
                    <form onSubmit={(e) => handleChangePassword(e, user.id)} className="flex items-center gap-2">
                      <input
                        type="password"
                        required
                        placeholder="New Password"
                        value={changePasswordValue}
                        onChange={(e) => setChangePasswordValue(e.target.value)}
                        className="block w-32 sm:w-48 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChangePasswordId(null);
                          setChangePasswordValue('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => setChangePasswordId(user.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        Change Password
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-sm text-red-600 hover:text-red-900 font-medium flex items-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
