import React, { useState, useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import JsBarcode from 'jsbarcode';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Loader2, Download, Search, Upload, FileSpreadsheet, Trash2, LayoutTemplate, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, onSnapshot, query, deleteDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
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
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 24;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<{
    backgroundImage: string | null;
    barcodeX: number;
    barcodeY: number;
    barcodeWidth: number;
    barcodeHeight: number;
    showName: boolean;
    nameX: number;
    nameY: number;
    nameFontSize: number;
    nameColor: string;
    nameFontFamily: string;
    nameFontWeight: string;
    nameFontStyle: string;
  }>({
    backgroundImage: null,
    barcodeX: 50,
    barcodeY: 50,
    barcodeWidth: 200,
    barcodeHeight: 100,
    showName: false,
    nameX: 50,
    nameY: 160,
    nameFontSize: 24,
    nameColor: '#000000',
    nameFontFamily: 'sans-serif',
    nameFontWeight: 'bold',
    nameFontStyle: 'normal',
  });

  const [dragging, setDragging] = useState<'barcode' | 'name' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, element: 'barcode' | 'name') => {
    e.preventDefault();
    setDragging(element);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({
      x: element === 'barcode' ? templateConfig.barcodeX : templateConfig.nameX,
      y: element === 'barcode' ? templateConfig.barcodeY : templateConfig.nameY
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    if (dragging === 'barcode') {
      setTemplateConfig(p => ({ ...p, barcodeX: initialPos.x + dx, barcodeY: initialPos.y + dy }));
    } else if (dragging === 'name') {
      setTemplateConfig(p => ({ ...p, nameX: initialPos.x + dx, nameY: initialPos.y + dy }));
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('barcodeTemplateConfig');
    if (saved) {
      try {
        setTemplateConfig(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

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

  // Reset page when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Nama: 'John Doe', Department: 'Engineering', 'Barcode': 'JD123456' },
      { Nama: 'Jane Smith', Department: 'Marketing', 'Barcode': '' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Attendees_Template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    
    try {
      const data = await new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            resolve(XLSX.utils.sheet_to_json(ws));
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsBinaryString(file);
      });

      const attendees = data.map((row: any) => ({
        name: String(row.Nama || row.nama || row.Name || row.name || '').trim(),
        department: String(row.Department || row.department || row.Dept || row.dept || '').trim(),
        barcode_id: String(row.Barcode || row.barcode || row['QR Code'] || row.qr_code || row.QRCode || row.qrcode || Math.random().toString(36).substring(2, 10).toUpperCase()).trim(),
        checked_in: false,
        created_at: serverTimestamp()
      })).filter((a) => a.name && a.department);

      if (attendees.length === 0) {
        setImportMessage({ type: 'error', text: 'No valid data found. Ensure columns "Nama" and "Department" exist.' });
        setImporting(false);
        return;
      }

      // Chunk into batches of 400 to stay well under Firestore's 500 limit
      const chunks = [];
      for (let i = 0; i < attendees.length; i += 400) {
        chunks.push(attendees.slice(i, i + 400));
      }

      const registrationsRef = collection(db, 'registrations');
      
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((attendee) => {
          const newDocRef = doc(registrationsRef);
          batch.set(newDocRef, attendee);
        });
        
        // Add timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Network timeout during import. Please check your connection.")), 15000)
        );
        await Promise.race([batch.commit(), timeoutPromise]);
      }

      setImportMessage({ type: 'success', text: `Successfully imported ${attendees.length} attendees.` });
    } catch (error: any) {
      console.error('Error importing:', error);
      setImportMessage({ type: 'error', text: error.message || 'Failed to import attendees.' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setImportMessage(null), 5000);
    }
  };

  const generateBarcodeImage = async (id: string, name: string): Promise<string> => {
    return new Promise((resolve) => {
      const barcodeCanvas = document.createElement('canvas');
      JsBarcode(barcodeCanvas, id, {
        width: 1.5,
        height: 60,
        displayValue: false,
        background: "#ffffff",
        lineColor: "#000000",
        margin: 10
      });

      if (!templateConfig.backgroundImage) {
        resolve(barcodeCanvas.toDataURL('image/png'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = img.width;
        finalCanvas.height = img.height;
        const ctx = finalCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          ctx.drawImage(
            barcodeCanvas,
            templateConfig.barcodeX,
            templateConfig.barcodeY,
            templateConfig.barcodeWidth,
            templateConfig.barcodeHeight
          );
          if (templateConfig.showName) {
            ctx.font = `${templateConfig.nameFontStyle || 'normal'} ${templateConfig.nameFontWeight || 'bold'} ${templateConfig.nameFontSize}px ${templateConfig.nameFontFamily || 'sans-serif'}`;
            ctx.fillStyle = templateConfig.nameColor;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(name, templateConfig.nameX, templateConfig.nameY);
          }
        }
        resolve(finalCanvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(barcodeCanvas.toDataURL('image/png'));
      img.src = templateConfig.backgroundImage;
    });
  };

  const downloadBarcode = async (id: string, name: string) => {
    const dataUrl = await generateBarcodeImage(id, name);
    const downloadLink = document.createElement('a');
    downloadLink.download = `Barcode-${name.replace(/\s+/g, '-')}-${id}.png`;
    downloadLink.href = dataUrl;
    downloadLink.click();
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

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegistrations.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} attendees?`)) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const id of selectedIds) {
        batch.delete(doc(db, 'registrations', id));
        count++;
        if (count % 400 === 0) {
          await batch.commit();
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
      setSelectedIds(new Set());
    } catch (err) {
      alert('An error occurred while deleting attendees');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    
    setLoading(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("barcodes");
      if (!folder) return;

      const selectedRegs = registrations.filter(r => selectedIds.has(r.id));
      
      for (const reg of selectedRegs) {
        const dataUrl = await generateBarcodeImage(reg.barcode_id, reg.name);
        const base64Data = dataUrl.replace(/^data:image\/(png|jpg);base64,/, "");
        folder.file(`Barcode-${reg.name.replace(/\s+/g, '-')}-${reg.barcode_id}.png`, base64Data, {base64: true});
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "barcodes.zip");
    } catch (err) {
      console.error("Error generating zip:", err);
      alert("Failed to generate zip file.");
    } finally {
      setLoading(false);
    }
  };

  const displayedRegistrations = filteredRegistrations.slice(0, page * itemsPerPage);

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
          <h1 className="text-2xl font-bold text-gray-900">Attendees Barcodes</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and download barcodes for all registered attendees.
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
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Configure Barcode Template"
            >
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Design
            </button>
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

      {importMessage && (
        <div className={`mb-6 p-4 rounded-md ${
          importMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {importMessage.text}
        </div>
      )}

      {filteredRegistrations.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filteredRegistrations.length}
              ref={input => {
                if (input) {
                  input.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredRegistrations.length;
                }
              }}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Select All ({filteredRegistrations.length})</span>
          </label>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-sm text-gray-500 mr-2">{selectedIds.size} selected</span>
              <button
                onClick={handleBulkDownload}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Selected
              </button>
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete Selected
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedRegistrations.map((reg) => (
          <div key={reg.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col relative group transition-colors ${selectedIds.has(reg.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={selectedIds.has(reg.id)}
                onChange={() => toggleSelection(reg.id)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <button
              onClick={() => handleDelete(reg.id)}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10"
              title="Delete Attendee"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="p-6 flex-grow flex flex-col items-center justify-center border-b border-gray-100 bg-gray-50 pt-10">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4 w-full overflow-hidden flex justify-center" id={`barcode-container-${reg.barcode_id}`}>
                <Barcode value={reg.barcode_id} width={1.5} height={60} displayValue={false} />
              </div>
              <p className="text-xs text-gray-500 font-mono tracking-widest">{reg.barcode_id}</p>
            </div>
            <div className="p-4 text-center">
              <h3 className="text-lg font-semibold text-gray-900 truncate" title={reg.name}>{reg.name}</h3>
              <p className="text-sm text-gray-500 truncate" title={reg.department}>{reg.department}</p>
              <button
                onClick={() => downloadBarcode(reg.barcode_id, reg.name)}
                className="mt-4 w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Barcode
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

      {filteredRegistrations.length > displayedRegistrations.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Load More
          </button>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsTemplateModalOpen(false)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Barcode Template Settings</h3>
                <button onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Background Image</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const result = evt.target?.result as string;
                          const img = new Image();
                          img.onload = () => {
                            setTemplateConfig(prev => ({ 
                              ...prev, 
                              backgroundImage: result,
                              barcodeX: Math.floor(img.width / 2) - 100,
                              barcodeY: Math.floor(img.height / 2) - 50,
                            }));
                          };
                          img.src = result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>

                {templateConfig.backgroundImage && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Barcode Width</label>
                      <input type="number" value={templateConfig.barcodeWidth} onChange={e => setTemplateConfig(p => ({...p, barcodeWidth: Number(e.target.value)}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Barcode Height</label>
                      <input type="number" value={templateConfig.barcodeHeight} onChange={e => setTemplateConfig(p => ({...p, barcodeHeight: Number(e.target.value)}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                    </div>
                  </div>
                )}

                {templateConfig.backgroundImage && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="showName"
                        checked={templateConfig.showName}
                        onChange={(e) => setTemplateConfig(p => ({...p, showName: e.target.checked}))}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <label htmlFor="showName" className="ml-2 block text-sm font-medium text-gray-700">
                        Include Attendee Name
                      </label>
                    </div>
                    
                    {templateConfig.showName && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Font Family</label>
                          <select value={templateConfig.nameFontFamily || 'sans-serif'} onChange={e => setTemplateConfig(p => ({...p, nameFontFamily: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white">
                            <option value="sans-serif">Sans-serif</option>
                            <option value="serif">Serif</option>
                            <option value="monospace">Monospace</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Font Weight</label>
                          <select value={templateConfig.nameFontWeight || 'bold'} onChange={e => setTemplateConfig(p => ({...p, nameFontWeight: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white">
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="bolder">Bolder</option>
                            <option value="lighter">Lighter</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Font Style</label>
                          <select value={templateConfig.nameFontStyle || 'normal'} onChange={e => setTemplateConfig(p => ({...p, nameFontStyle: e.target.value}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white">
                            <option value="normal">Normal</option>
                            <option value="italic">Italic</option>
                            <option value="oblique">Oblique</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Font Size</label>
                          <input type="number" value={templateConfig.nameFontSize} onChange={e => setTemplateConfig(p => ({...p, nameFontSize: Number(e.target.value)}))} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Text Color</label>
                          <input type="color" value={templateConfig.nameColor} onChange={e => setTemplateConfig(p => ({...p, nameColor: e.target.value}))} className="mt-1 block w-full h-9 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {templateConfig.backgroundImage && (
                  <div className="mt-4 border rounded-lg overflow-hidden relative bg-gray-100 flex justify-center items-center p-4 select-none">
                    <p className="absolute top-2 left-2 text-xs text-gray-500 z-10 bg-white/80 px-2 py-1 rounded">Drag elements to position</p>
                    <div 
                      className="relative" 
                      style={{ maxWidth: '100%', overflow: 'auto' }}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      <img src={templateConfig.backgroundImage} alt="Template Preview" className="max-w-none pointer-events-none" style={{ opacity: 0.5 }} />
                      <div 
                        className="absolute bg-white border-2 border-dashed border-indigo-500 flex items-center justify-center opacity-80 cursor-move"
                        style={{
                          left: templateConfig.barcodeX,
                          top: templateConfig.barcodeY,
                          width: templateConfig.barcodeWidth,
                          height: templateConfig.barcodeHeight
                        }}
                        onMouseDown={(e) => handleMouseDown(e, 'barcode')}
                      >
                        <span className="text-xs font-bold text-indigo-700 pointer-events-none">BARCODE</span>
                      </div>
                      
                      {templateConfig.showName && (
                        <div 
                          className="absolute cursor-move border border-dashed border-transparent hover:border-gray-400"
                          style={{
                            left: templateConfig.nameX,
                            top: templateConfig.nameY,
                            color: templateConfig.nameColor,
                            fontSize: `${templateConfig.nameFontSize}px`,
                            fontFamily: templateConfig.nameFontFamily || 'sans-serif',
                            fontWeight: templateConfig.nameFontWeight || 'bold',
                            fontStyle: templateConfig.nameFontStyle || 'normal',
                            whiteSpace: 'nowrap'
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'name')}
                        >
                          Attendee Name
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    const defaultConfig = {
                      backgroundImage: null,
                      barcodeX: 50,
                      barcodeY: 50,
                      barcodeWidth: 200,
                      barcodeHeight: 100,
                      showName: false,
                      nameX: 50,
                      nameY: 160,
                      nameFontSize: 24,
                      nameColor: '#000000',
                      nameFontFamily: 'sans-serif',
                      nameFontWeight: 'bold',
                      nameFontStyle: 'normal',
                    };
                    setTemplateConfig(defaultConfig);
                    localStorage.removeItem('barcodeTemplateConfig');
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200"
                >
                  Clear Template
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('barcodeTemplateConfig', JSON.stringify(templateConfig));
                    setIsTemplateModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
