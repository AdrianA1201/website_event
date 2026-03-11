import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Loader2, Download, Search, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, onSnapshot, query, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

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

export default function Attendees() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'registrations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs: Registration[] = [];
      snapshot.forEach((doc) => {
        regs.push({ ...doc.data() as Registration, id: doc.id });
      });
      // Sort by created_at descending
      regs.sort((a, b) => {
        const timeA = a.created_at?.toMillis ? a.created_at.toMillis() : 0;
        const timeB = b.created_at?.toMillis ? b.created_at.toMillis() : 0;
        return timeB - timeA;
      });
      setRegistrations(regs);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nama: 'John Doe', Department: 'Engineering', 'QR Code': 'JD123456' },
      { Nama: 'Jane Smith', Department: 'Marketing', 'QR Code': '' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Attendees_Template.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const attendees = data.map((row: any) => ({
          name: row.Nama || row.nama || row.Name || row.name,
          department: row.Department || row.department || row.Dept || row.dept,
          barcode_id: row['QR Code'] || row.qr_code || row.QRCode || row.qrcode || row.Barcode || row.barcode || Math.random().toString(36).substring(2, 10).toUpperCase(),
          checked_in: false,
          created_at: new Date()
        })).filter((a) => a.name && a.department);

        if (attendees.length === 0) {
          alert('No valid data found in Excel file. Please ensure columns "Nama" and "Department" exist.');
          setImporting(false);
          return;
        }

        // Batch write to Firestore
        const batch = writeBatch(db);
        const registrationsRef = collection(db, 'registrations');
        
        attendees.forEach((attendee) => {
          const newDocRef = doc(registrationsRef);
          batch.set(newDocRef, attendee);
        });

        await batch.commit();
        alert(`Successfully imported ${attendees.length} attendees.`);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Failed to parse Excel file.');
      } finally {
        setImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadQRCode = (id: string, name: string) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        // Fill white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${name.replace(/\s+/g, '-')}-${id}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attendee?')) return;
    try {
      await deleteDoc(doc(db, 'registrations', id));
    } catch (err) {
      alert('An error occurred while deleting attendee');
    }
  };

  const filteredRegistrations = registrations.filter((reg) =>
    reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reg.barcode_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendees QR Codes</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and download QR codes for all registered attendees.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search attendees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Download Excel Template"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Template
            </button>
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRegistrations.map((reg) => (
          <div key={reg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative group">
            <button
              onClick={() => handleDelete(reg.id)}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Attendee"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="p-6 flex-grow flex flex-col items-center justify-center border-b border-gray-100 bg-gray-50">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4">
                <QRCode id={`qr-${reg.barcode_id}`} value={reg.barcode_id} size={150} />
              </div>
              <p className="text-xs text-gray-500 font-mono tracking-widest">{reg.barcode_id}</p>
            </div>
            <div className="p-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900 truncate" title={reg.name}>{reg.name}</h3>
              <p className="text-sm text-gray-500 truncate" title={reg.department}>{reg.department}</p>
              <button
                onClick={() => downloadQRCode(reg.barcode_id, reg.name)}
                className="mt-4 w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </button>
            </div>
          </div>
        ))}
        {filteredRegistrations.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200 border-dashed">
            No attendees found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
