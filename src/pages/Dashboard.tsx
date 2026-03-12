import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Users, CheckCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { collection, getDocs, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Stats {
  total: number;
  checkedIn: number;
  pending: number;
}

interface Registration {
  id: string;
  barcode_id: string;
  name: string;
  department: string;
  phone: string | null;
  company: string | null;
  checked_in: boolean;
  created_at: any;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, checkedIn: 0, pending: 0 });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scannerMode, setScannerMode] = useState<'camera' | 'physical'>('camera');
  const [physicalScanInput, setPhysicalScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'pending'>('all');

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScanRef = useRef<{ text: string; time: number } | null>(null);
  const physicalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scannerMode === 'physical' && physicalInputRef.current) {
      physicalInputRef.current.focus();
    }
  }, [scannerMode]);

  useEffect(() => {
    const q = query(collection(db, 'registrations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs: Registration[] = [];
      let checkedInCount = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as Registration;
        regs.push({ ...data, id: doc.id });
        if (data.checked_in) {
          checkedInCount++;
        }
      });
      setRegistrations(regs);
      setStats({
        total: regs.length,
        checkedIn: checkedInCount,
        pending: regs.length - checkedInCount
      });
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error: ', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCheckIn = async (barcodeId: string) => {
    try {
      const q = query(collection(db, 'registrations'), where('barcode_id', '==', barcodeId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setScanResult({ success: false, message: 'Barcode not found' });
      } else {
        const docRef = querySnapshot.docs[0].ref;
        const currentStatus = querySnapshot.docs[0].data().checked_in;
        await updateDoc(docRef, { checked_in: !currentStatus });
        const action = !currentStatus ? 'checked in' : 'checked out';
        setScanResult({ success: true, message: `Successfully ${action} ${barcodeId}` });
      }
    } catch (error) {
      console.error(error);
      setScanResult({ success: false, message: 'Action failed due to network error' });
    }
    setTimeout(() => setScanResult(null), 5000);
  };

  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          'reader',
          { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdgePercentage = 0.7; // 70% of the smallest edge
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0
          },
          false
        );
        scannerRef.current.render(
          (decodedText) => {
            const now = Date.now();
            if (
              lastScanRef.current &&
              lastScanRef.current.text === decodedText &&
              now - lastScanRef.current.time < 3000
            ) {
              return;
            }
            lastScanRef.current = { text: decodedText, time: now };
            handleCheckIn(decodedText);
          },
          (error) => {
            // ignore continuous scanning errors
          }
        );
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch = reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.barcode_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === 'checked_in') return matchesSearch && reg.checked_in;
    if (filterStatus === 'pending') return matchesSearch && !reg.checked_in;
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Registered</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Checked In</p>
            <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center">
          <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scanner Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Barcode Scanner</h2>
                <p className="text-sm text-gray-500 mt-1">Scan tickets to check in attendees</p>
              </div>
              <div className="flex bg-gray-200 p-1 rounded-lg">
                <button
                  onClick={() => setScannerMode('camera')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    scannerMode === 'camera' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Camera
                </button>
                <button
                  onClick={() => {
                    setScannerMode('physical');
                    stopScanner();
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    scannerMode === 'physical' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Device
                </button>
              </div>
            </div>
            <div className="p-6">
              {scannerMode === 'camera' ? (
                !scanning ? (
                  <button
                    onClick={startScanner}
                    className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Start Camera Scanner
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div id="reader" className="w-full overflow-hidden rounded-lg border border-gray-200"></div>
                    <button
                      onClick={stopScanner}
                      className="w-full py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Stop Camera Scanner
                    </button>
                  </div>
                )
              ) : (
                <div 
                  className="space-y-4 cursor-text"
                  onClick={() => physicalInputRef.current?.focus()}
                >
                  <p className="text-sm text-gray-600">
                    Plug in your USB/Bluetooth barcode scanner and ensure this input is focused before scanning.
                  </p>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (physicalScanInput.trim()) {
                      handleCheckIn(physicalScanInput.trim());
                      setPhysicalScanInput('');
                    }
                  }} className="flex gap-2">
                    <input
                      ref={physicalInputRef}
                      type="text"
                      autoFocus
                      placeholder="Ready to scan..."
                      value={physicalScanInput}
                      onChange={(e) => setPhysicalScanInput(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button 
                      type="submit" 
                      disabled={!physicalScanInput.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                      Check In
                    </button>
                  </form>
                </div>
              )}

              {scanResult && (
                <div className={`mt-4 p-4 rounded-lg text-sm ${
                  scanResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {scanResult.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Registrations List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Registrations</h2>
                <p className="text-sm text-gray-500 mt-1">Manage all attendees</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search attendees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'checked_in' | 'pending')}
                  className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                >
                  <option value="all">All Status</option>
                  <option value="checked_in">Checked In</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRegistrations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No registrations found.
                      </td>
                    </tr>
                  ) : (
                    filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                              {reg.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{reg.name}</div>
                              <div className="text-sm text-gray-500">{reg.department}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 font-mono">
                            {reg.barcode_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {reg.checked_in ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Checked In
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleCheckIn(reg.barcode_id)}
                            className={`${
                              reg.checked_in
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-indigo-600 hover:text-indigo-900'
                            } font-medium`}
                          >
                            {reg.checked_in ? 'Check Out' : 'Check In'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
