import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, KeyRound, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function UserSettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ ...doc.data() as User, id: doc.id });
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setError('Failed to fetch users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Use email as document ID for simplicity in this example
      await setDoc(doc(db, 'users', newEmail), {
        email: newEmail,
        role: 'admin'
      });
      setNewEmail('');
    } catch (err) {
      alert('An error occurred');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      alert('An error occurred while deleting user');
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
              <label htmlFor="newEmail" className="sr-only">Email</label>
              <input
                id="newEmail"
                type="email"
                required
                placeholder="Email Address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
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
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-sm text-gray-500">Role: {user.role}</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-sm text-red-600 hover:text-red-900 font-medium flex items-center"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
