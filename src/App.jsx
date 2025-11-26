import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Importamos la conexión
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc 
} from 'firebase/firestore'; // Herramientas de la base de datos

import { Plus, Trash2, Edit2, Save, X, Clock, Activity, AlertTriangle, Bed, FileText, CheckCircle2, Printer, Download, Monitor, Users, ArrowRightCircle, AlertOctagon } from 'lucide-react';

const App = () => {
  // --- CONFIGURACIÓN ---
  const ROOMS = [
    { id: 'obs1', name: 'Observación 1' },
    { id: 'obs2', name: 'Observación 2' },
    { id: 'obs34', name: 'Observación 3-4' },
    { id: 'tratamiento', name: 'Tratamiento' },
    { id: 'reanimador', name: 'Reanimador' }
  ];
  const MANUAL_TAB_ID = 'manual_backup';

  // --- ESTADOS ---
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState({}); 
  const [activeTab, setActiveTab] = useState(ROOMS[0].id);
  const [manualRoomSelect, setManualRoomSelect] = useState(ROOMS[0].id);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Estados Traslado
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({ id: null, name: '', fromRoom: '', toRoom: '', newBedNumber: '' });

  const [validationError, setValidationError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Formulario
  const [formData, setFormData] = useState({
    name: '', bedNumber: '', treatment: '', pending: '', hospitalization: false, room: ROOMS[0].id
  });

  // --- EFECTOS: CONEXIÓN A FIREBASE EN TIEMPO REAL ---
  
  // 1. Reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Escuchar PACIENTES desde la Nube
  useEffect(() => {
    // Esto crea un "canal abierto" con la base de datos
    const unsubscribe = onSnapshot(collection(db, "patients"), (snapshot) => {
      const patientsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setPatients(patientsData);
    });
    return () => unsubscribe();
  }, []);

  // 3. Escuchar PERSONAL desde la Nube
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "staff"), (snapshot) => {
      const staffData = {};
      snapshot.docs.forEach(doc => {
        staffData[doc.id] = doc.data();
      });
      setStaff(staffData);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE NEGOCIO (AHORA CON FIREBASE) ---

  const updateStaff = async (roomId, role, value) => {
    // Actualizamos localmente para feedback instantáneo
    const newStaff = { ...staff, [roomId]: { ...staff[roomId], [role]: value } };
    setStaff(newStaff);

    // Guardamos en la nube
    const roomRef = doc(db, "staff", roomId);
    await setDoc(roomRef, newStaff[roomId], { merge: true });
  };

  const checkBedAvailability = (roomId, bedNumber, excludePatientId = null) => {
    if (!bedNumber || String(bedNumber).trim() === '') return null; 
    const targetBed = String(bedNumber).trim().toLowerCase();
    const conflict = patients.find(p => {
      if (p.room !== roomId) return false;
      if (p.id === excludePatientId) return false;
      const currentBed = (p.bedNumber || '').toString().trim().toLowerCase();
      return currentBed === targetBed;
    });
    return conflict ? conflict.name : null;
  };

  // --- MANEJADORES ---

  const openModal = (patient = null) => {
    setValidationError(''); 
    if (patient) {
      setFormData(patient);
      setEditingId(patient.id);
    } else {
      setFormData({
        name: '', bedNumber: '', treatment: '', pending: '', hospitalization: false,
        room: activeTab === MANUAL_TAB_ID ? manualRoomSelect : activeTab
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationError('');

    const bedConflictName = checkBedAvailability(formData.room, formData.bedNumber, editingId);
    if (bedConflictName) {
      setValidationError(`ERROR: Cama "${formData.bedNumber}" ocupada por: ${bedConflictName}.`);
      return; 
    }

    try {
      if (editingId) {
        // EDITAR en Nube
        const patientRef = doc(db, "patients", editingId);
        await updateDoc(patientRef, formData);
      } else {
        // CREAR en Nube
        await addDoc(collection(db, "patients"), {
          ...formData,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error guardando:", error);
      setValidationError("Error de conexión al guardar.");
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await deleteDoc(doc(db, "patients", deleteId));
        setDeleteId(null);
      } catch (error) {
        console.error("Error borrando:", error);
      }
    }
  };

  const openTransferModal = (patient) => {
    setValidationError(''); 
    const suggestedRoom = ROOMS.find(r => r.id !== patient.room)?.id || ROOMS[0].id;
    setTransferData({
      id: patient.id, name: patient.name, fromRoom: patient.room,
      toRoom: suggestedRoom, newBedNumber: ''
    });
    setIsTransferModalOpen(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    const bedConflictName = checkBedAvailability(transferData.toRoom, transferData.newBedNumber, transferData.id);
    if (bedConflictName) {
      setValidationError(`IMPOSIBLE: Cama ocupada por ${bedConflictName}.`);
      return; 
    }

    if (transferData.id) {
      try {
        const patientRef = doc(db, "patients", transferData.id);
        await updateDoc(patientRef, {
          room: transferData.toRoom,
          bedNumber: transferData.newBedNumber
        });
        setIsTransferModalOpen(false);
      } catch (error) {
        console.error("Error trasladando:", error);
      }
    }
  };

  // --- DESCARGA HTML ---
  const handleDownloadHTML = () => {
    setTimeout(() => {
      const roomName = ROOMS.find(r => r.id === manualRoomSelect)?.name || 'General';
      const patientsToPrint = patients.filter(p => p.room === manualRoomSelect);
      const currentStaff = staff[manualRoomSelect] || {};
      const nurseName = currentStaff.nurse || '___________________';
      const tensName = currentStaff.tens || '___________________';
      const currentShift = currentStaff.shift || 'Día';

      const rowsHtml = patientsToPrint.map(p => `
        <tr>
          <td style="text-align: center; font-weight: bold; border: 1px solid black; padding: 4px;">${p.bedNumber || '-'}</td>
          <td style="border: 1px solid black; padding: 4px;">
            <div style="font-weight: bold; text-transform: uppercase;">${p.name}</div>
            ${p.hospitalization ? '<div style="color: red; font-size: 10px; font-weight: bold;">[HOSPITALIZAR]</div>' : ''}
          </td>
          <td style="border: 1px solid black; padding: 4px;">${p.treatment || ''}</td>
          <td style="border: 1px solid black; padding: 4px;">${p.pending || ''}</td>
        </tr>
      `).join('');

      const emptyRowsHtml = Array(4).fill(`
        <tr><td style="height: 40px; border: 1px solid black;"></td><td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td><td style="border: 1px solid black;"></td></tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Respaldo - ${roomName}</title>
          <style>
            @page { size: portrait; margin: 1cm; }
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background-color: #f0f0f0; text-align: center; border: 1px solid black; padding: 8px; }
            h1 { text-align: center; text-transform: uppercase; font-size: 16px; border-bottom: 2px solid black; margin-bottom: 5px; }
            .meta { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 5px; }
            .staff-box { border: 1px solid #ccc; padding: 5px; font-size: 11px; background: #f9f9f9; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <h1>Registro Manual - ${roomName}</h1>
          <div class="meta"><span>FECHA: ${new Date().toLocaleDateString()}</span><span>HORA: ${new Date().toLocaleTimeString()}</span></div>
          <div class="staff-box"><strong>EQUIPO (${currentShift.toUpperCase()}):</strong> Enf: <u>${nurseName}</u> | TENS: <u>${tensName}</u></div>
          <table>
            <thead><tr><th style="width: 10%">CAMA</th><th style="width: 30%">PACIENTE</th><th style="width: 30%">TRATAMIENTO</th><th style="width: 30%">PENDIENTES</th></tr></thead>
            <tbody>${rowsHtml}${emptyRowsHtml}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Respaldo_${roomName}.html`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    }, 0);
  };

  // --- RENDERIZADO ---
  const isManualTab = activeTab === MANUAL_TAB_ID;
  const currentRoomId = isManualTab ? manualRoomSelect : activeTab;
  const filteredPatients = patients.filter(p => p.room === currentRoomId);
  const showBedColumn = ['obs1', 'obs2', 'obs34', 'reanimador'].includes(currentRoomId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* IMPRESIÓN */}
      <style>{`
        @media print {
          @page { size: portrait; margin: 1cm; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .print-container { width: 100%; }
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th, td { border: 1px solid black; padding: 4px; vertical-align: top; }
          th { background-color: #f0f0f0 !important; font-weight: bold; text-align: center; }
          h1 { font-size: 14px; text-align: center; text-transform: uppercase; border-bottom: 2px solid black; margin-bottom: 10px; }
          .print-header { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 5px; }
          .print-staff { border: 1px solid #ccc; padding: 5px; font-size: 10px; margin-bottom: 10px; }
          .empty-row { height: 40px; }
        }
        .only-print { display: none; }
      `}</style>

      {/* HEADER */}
      <div className="no-print">
        <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">URGENCIA PEDIÁTRICA</h1>
                <p className="text-blue-100 text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Conectado en Tiempo Real
                </p>
              </div>
            </div>
            <div className="text-right hidden md:block border-l border-blue-500 pl-6">
              <div className="font-mono text-3xl font-bold leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-6">
          {/* TABS */}
          <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-slate-200 pb-1">
            {ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveTab(room.id)}
                className={`px-4 py-3 rounded-t-lg font-bold transition-all flex-1 md:flex-none flex items-center justify-center gap-2 ${activeTab === room.id ? 'bg-white text-blue-700 border-t-4 border-blue-600 shadow-sm' : 'bg-slate-200 text-slate-500 border-t-4 border-transparent'} ${room.id === 'reanimador' && activeTab === 'reanimador' ? '!text-red-600 !border-red-600' : ''}`}
              >
                {room.id === 'reanimador' && <AlertTriangle size={16} />}
                {room.name}
                <span className="ml-1 text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{patients.filter(p => p.room === room.id).length}</span>
              </button>
            ))}
            <button onClick={() => setActiveTab(MANUAL_TAB_ID)} className={`px-4 py-3 rounded-t-lg font-bold transition-all flex-1 md:flex-none flex items-center justify-center gap-2 ml-auto ${activeTab === MANUAL_TAB_ID ? 'bg-slate-800 text-white border-t-4 border-slate-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
              <Printer size={18} /><span className="hidden md:inline">Formato Manual</span>
            </button>
          </div>

          {isManualTab ? (
            <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-300">
              <div className="flex justify-between items-center mb-6 bg-slate-50 p-4 rounded border">
                <div><h2 className="text-xl font-bold flex items-center gap-2"><FileText className="text-blue-600" />Generador de Respaldo</h2></div>
                <div className="flex gap-3">
                  <select value={manualRoomSelect} onChange={(e) => setManualRoomSelect(e.target.value)} className="p-2 border rounded font-medium">{ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                  <button onClick={handleDownloadHTML} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"><Download size={18} /> Descargar</button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`bg-white rounded-b-lg shadow-lg min-h-[60vh] border relative ${activeTab === 'reanimador' ? 'border-red-200' : 'border-slate-200'}`}>
              {/* STAFF BAR */}
              <div className="bg-slate-50 border-b p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-t-lg">
                <div className="flex items-center gap-2 lg:col-span-3 mb-2"><Users className="text-blue-600" size={20} /><span className="text-sm font-bold uppercase">Equipo {ROOMS.find(r => r.id === activeTab)?.name}:</span></div>
                <input type="text" placeholder="Enfermera/o..." className="p-2 border rounded text-sm" value={staff[activeTab]?.nurse || ''} onChange={(e) => updateStaff(activeTab, 'nurse', e.target.value)} />
                <input type="text" placeholder="TENS..." className="p-2 border rounded text-sm" value={staff[activeTab]?.tens || ''} onChange={(e) => updateStaff(activeTab, 'tens', e.target.value)} />
                <select value={staff[activeTab]?.shift || 'Día'} onChange={(e) => updateStaff(activeTab, 'shift', e.target.value)} className="p-2 border rounded text-sm bg-white">
                  <option value="Día">☀️ Día</option><option value="Noche">🌙 Noche</option>
                </select>
              </div>

              {/* TABLA PACIENTES */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider border-b">
                      {showBedColumn && <th className="p-4 w-16 text-center">Cama</th>}
                      <th className="p-4 w-1/4">Paciente</th>
                      <th className="p-4 w-1/3">Tratamiento</th>
                      <th className="p-4 w-1/3">Pendiente</th>
                      <th className="p-4 w-28 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.sort((a, b) => (showBedColumn && a.bedNumber && b.bedNumber) ? a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }) : 0).map((patient) => (
                        <tr key={patient.id} className="hover:bg-blue-50 transition-colors">
                          {showBedColumn && <td className="p-4 align-top text-center">{patient.bedNumber ? <span className="font-bold text-lg bg-slate-100 px-2 py-1 rounded border">{patient.bedNumber}</span> : '-'}</td>}
                          <td className="p-4 align-top">
                            <div className="font-bold text-lg">{patient.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10}/> {patient.timestamp}</div>
                            {patient.hospitalization && <div className="mt-1 inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold"><Bed size={10}/> HOSPITALIZAR</div>}
                          </td>
                          <td className="p-4 align-top text-sm whitespace-pre-wrap bg-blue-50/50 rounded m-1">{patient.treatment}</td>
                          <td className="p-4 align-top text-sm whitespace-pre-wrap bg-amber-50/50 rounded m-1">{patient.pending}</td>
                          <td className="p-4 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => openTransferModal(patient)} className="p-2 text-purple-600 hover:bg-purple-100 rounded" title="Trasladar"><ArrowRightCircle size={18} /></button>
                              <button onClick={() => openModal(patient)} className="p-2 text-blue-600 hover:bg-blue-100 rounded" title="Editar"><Edit2 size={18} /></button>
                              <button onClick={() => setDeleteId(patient.id)} className="p-2 text-red-600 hover:bg-red-100 rounded" title="Alta"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400"><Monitor size={48} className="mx-auto opacity-20 mb-2"/><span className="font-medium">Sala vacía</span></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button onClick={() => openModal()} className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 z-20 flex items-center gap-2"><Plus size={24} /><span className="hidden md:inline font-bold">Ingresar</span></button>
            </div>
          )}
        </main>
      </div>

      {/* VERSION IMPRESA OCULTA */}
      <div className="hidden print:block print-container">
        <h1>Registro - {(isManualTab ? ROOMS.find(r => r.id === manualRoomSelect) : ROOMS.find(r => r.id === activeTab))?.name}</h1>
        <div className="print-header"><span>FECHA: {new Date().toLocaleDateString()}</span><span>HORA: {new Date().toLocaleTimeString()}</span></div>
        <div className="print-staff"><strong>EQUIPO ({staff[isManualTab ? manualRoomSelect : activeTab]?.shift || 'DÍA'}):</strong> Enf: {staff[isManualTab ? manualRoomSelect : activeTab]?.nurse || '___'} | TENS: {staff[isManualTab ? manualRoomSelect : activeTab]?.tens || '___'}</div>
        <table>
          <thead><tr><th style={{width: '10%'}}>CAMA</th><th style={{width: '30%'}}>PACIENTE</th><th style={{width: '30%'}}>TRATAMIENTO</th><th style={{width: '30%'}}>PENDIENTES</th></tr></thead>
          <tbody>
            {filteredPatients.map(p => (
              <tr key={p.id}>
                <td style={{textAlign: 'center', fontWeight: 'bold'}}>{p.bedNumber || '-'}</td>
                <td><div style={{fontWeight: 'bold'}}>{p.name}</div>{p.hospitalization && <div style={{fontSize: '10px'}}>[HOSP]</div>}</td>
                <td>{p.treatment}</td><td>{p.pending}</td>
              </tr>
            ))}
            {[1, 2, 3, 4].map(i => <tr key={i}><td className="empty-row"></td><td className="empty-row"></td><td className="empty-row"></td><td className="empty-row"></td></tr>)}
          </tbody>
        </table>
      </div>

      {/* MODALES */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 flex gap-2"><ArrowRightCircle /> Trasladar Paciente</h2>
            <p className="mb-4 text-sm">Moviendo a <strong>{transferData.name}</strong> desde {ROOMS.find(r => r.id === transferData.fromRoom)?.name}.</p>
            {validationError && <div className="mb-4 p-2 bg-red-100 text-red-700 text-xs rounded border border-red-200 font-bold flex gap-2"><AlertOctagon size={16}/>{validationError}</div>}
            <form onSubmit={handleTransfer} className="space-y-4">
              <div><label className="font-bold text-sm">Destino</label><select value={transferData.toRoom} onChange={(e) => setTransferData({...transferData, toRoom: e.target.value})} className="w-full p-2 border rounded">{ROOMS.filter(r => r.id !== transferData.fromRoom).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              {['obs1', 'obs2', 'obs34', 'reanimador'].includes(transferData.toRoom) && <div><label className="font-bold text-sm">Nueva Cama</label><input type="text" value={transferData.newBedNumber} onChange={(e) => setTransferData({...transferData, newBedNumber: e.target.value})} className="w-full p-2 border rounded font-bold text-center" /></div>}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button><button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded font-bold">Confirmar</button></div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Editar' : 'Ingresar'} Paciente</h2>
            {validationError && <div className="mb-4 p-2 bg-red-100 text-red-700 text-xs rounded border border-red-200 font-bold flex gap-2"><AlertOctagon size={16}/>{validationError}</div>}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2"><label className="text-sm font-bold">Sala</label><select value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} className="w-full p-2 border rounded">{ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div><label className="text-sm font-bold">N° Cama</label><input type="text" value={formData.bedNumber} onChange={(e) => setFormData({...formData, bedNumber: e.target.value})} className="w-full p-2 border rounded text-center font-bold" /></div>
              </div>
              <div><label className="text-sm font-bold">Paciente</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" /></div>
              <div className={`p-2 rounded border cursor-pointer flex items-center gap-2 ${formData.hospitalization ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`} onClick={() => setFormData({...formData, hospitalization: !formData.hospitalization})}><div className={`w-4 h-4 rounded border flex items-center justify-center ${formData.hospitalization ? 'bg-red-600 border-red-600 text-white' : 'bg-white'}`}>{formData.hospitalization && <CheckCircle2 size={12}/>}</div><span className="text-sm font-bold">Requiere Hospitalización</span></div>
              <div><label className="text-sm font-bold">Tratamiento</label><textarea rows="3" value={formData.treatment} onChange={e => setFormData({...formData, treatment: e.target.value})} className="w-full p-2 border rounded" /></div>
              <div><label className="text-sm font-bold">Pendiente</label><textarea rows="2" value={formData.pending} onChange={e => setFormData({...formData, pending: e.target.value})} className="w-full p-2 border rounded" /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl p-6 max-w-sm text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" /><h3 className="text-lg font-bold mb-2">¿Dar de alta?</h3><p className="text-sm text-slate-500 mb-6">Esta acción borrará al paciente de la base de datos.</p>
            <div className="flex justify-center gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded">Cancelar</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded font-bold">Confirmar Alta</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;