import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';

interface Config {
  event_name: string;
  event_date: string;
  require_phone: boolean;
  require_company: boolean;
  logo_url?: string;
}

export default function Configuration() {
  const [config, setConfig] = useState<Config>({
    event_name: '',
    event_date: '',
    require_phone: false,
    require_company: false,
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/config', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setConfig({
          ...data,
          require_phone: Boolean(data.require_phone),
          require_company: Boolean(data.require_company),
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuration saved successfully.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save configuration.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <h1 className="text-xl font-bold text-gray-900">Event Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage event details and registration form fields.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {message && (
            <div className={`p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="event_name" className="block text-sm font-medium text-gray-700">
                Event Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="event_name"
                  id="event_name"
                  required
                  value={config.event_name}
                  onChange={(e) => setConfig({ ...config, event_name: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="event_date" className="block text-sm font-medium text-gray-700">
                Event Date
              </label>
              <div className="mt-1">
                <input
                  type="date"
                  name="event_date"
                  id="event_date"
                  required
                  value={config.event_date}
                  onChange={(e) => setConfig({ ...config, event_date: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">
                Logo URL (Optional)
              </label>
              <div className="mt-1">
                <input
                  type="url"
                  name="logo_url"
                  id="logo_url"
                  placeholder="https://example.com/logo.png"
                  value={config.logo_url || ''}
                  onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Provide a URL to an image to be displayed on the registration page.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-900">Registration Form Fields</h3>
            <p className="text-sm text-gray-500 mt-1">Select which fields are required during registration.</p>
            
            <div className="mt-4 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="require_phone"
                    name="require_phone"
                    type="checkbox"
                    checked={config.require_phone}
                    onChange={(e) => setConfig({ ...config, require_phone: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="require_phone" className="font-medium text-gray-700">
                    Require Phone Number
                  </label>
                  <p className="text-gray-500">Attendees must provide their phone number.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="require_company"
                    name="require_company"
                    type="checkbox"
                    checked={config.require_company}
                    onChange={(e) => setConfig({ ...config, require_company: e.target.checked })}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="require_company" className="font-medium text-gray-700">
                    Require Company Name
                  </label>
                  <p className="text-gray-500">Attendees must provide their company or organization name.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
