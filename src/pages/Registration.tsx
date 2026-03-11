import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Config {
  event_name: string;
  event_date: string;
  require_phone: boolean;
  require_company: boolean;
  logo_url?: string;
}

export default function Registration() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [barcodeId, setBarcodeId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    phone: '',
    company: '',
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'config', 'default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as Config);
        } else {
          console.error("No such config document!");
        }
      } catch (err) {
        console.error("Error fetching config:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const generatedBarcodeId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const registrationData = {
        barcode_id: generatedBarcodeId,
        name: formData.name,
        department: formData.department,
        checked_in: false,
        created_at: new Date().toISOString(),
      };
      
      if (formData.phone) (registrationData as any).phone = formData.phone;
      if (formData.company) (registrationData as any).company = formData.company;

      await addDoc(collection(db, 'registrations'), registrationData);
      setBarcodeId(generatedBarcodeId);
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load event configuration.
      </div>
    );
  }

  if (barcodeId) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center text-white">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h2 className="text-2xl font-bold">Registration Successful!</h2>
          <p className="mt-2 text-indigo-100">
            Please present this QR code at the entrance.
          </p>
        </div>
        <div className="p-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <QRCode value={barcodeId} size={200} />
          </div>
          <p className="mt-6 text-sm text-gray-500 font-mono tracking-widest">
            ID: {barcodeId}
          </p>
          <div className="mt-8 w-full border-t border-gray-100 pt-6">
            {config.logo_url && (
              <div className="flex justify-center mb-4">
                <img 
                  src={config.logo_url} 
                  alt="Event Logo" 
                  className="max-h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              {config.event_name}
            </h3>
            <p className="text-center text-gray-500 mt-1">
              {new Date(config.event_date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={() => {
              setBarcodeId(null);
              setFormData({ name: '', department: '', phone: '', company: '' });
            }}
            className="mt-8 w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Register Another Person
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="px-8 pt-8 pb-6 border-b border-gray-100">
        {config.logo_url && (
          <div className="flex justify-center mb-6">
            <img 
              src={config.logo_url} 
              alt="Event Logo" 
              className="max-h-24 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          {config.event_name}
        </h2>
        <p className="text-center text-gray-500 mt-2">
          {new Date(config.event_date).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <input
            type="text"
            id="department"
            required
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>

        {!!config.require_phone && (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        )}

        {!!config.require_company && (
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">
              Company
            </label>
            <input
              type="text"
              id="company"
              required
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Register Now'
          )}
        </button>
      </form>
    </div>
  );
}
