import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, User, Clock, Activity, AlertTriangle, Bed, FileText, CheckCircle2, Printer, Download, Monitor, Users, ArrowRightCircle, AlertOctagon, Sun, Moon } from 'lucide-react';

const App = () => {
  // --- CONFIGURACIÓN INICIAL ---
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
  const [activeTab, setActiveTab] = useState(ROOMS[0].id);
  const [manualRoomSelect, setManualRoomSelect] = useState(ROOMS[0].id);
  const [staff, setStaff] = useState({}); // { roomId: { nurse: '', tens: '', shift: 'Día' } }
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Estados para Traslado
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({ id: null, name: '', fromRoom: '', toRoom: '', newBedNumber: '' });

  // Estado para errores de validación
  const [validationError, setValidationError] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    bedNumber: '',
    treatment: '',
    pending: '',
    hospitalization: false,
    room: ROOMS[0].id
  });

  // --- EFECTOS (RELOJ Y PERSISTENCIA) ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Cargar datos al inicio
  useEffect(() => {
    const savedPatients = localStorage.getItem('pediatric_er_patients');
    if (savedPatients) setPatients(JSON.parse(savedPatients));

    const savedStaff = localStorage.getItem('pediatric_er_staff');
    if (savedStaff) setStaff(JSON.parse(savedStaff));
  }, []);

  // Guardar datos automáticos
  useEffect(() => {
    localStorage.setItem('pediatric_er_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('pediatric_er_staff', JSON.stringify(staff));
  }, [staff]);

  // --- LÓGICA DE NEGOCIO ---

  const updateStaff = (roomId, role, value) => {
    setStaff(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [role]: value
      }
    }));
  };

  // Validación de Camas Duplicadas
  const checkBedAvailability = (roomId, bedNumber, excludePatientId = null) => {
    if (!bedNumber || String(bedNumber).trim() === '') return null; 

    const targetBed = String(bedNumber).trim().toLowerCase();

    const conflict = patients.find(p => {
      if (p.room !== roomId) return false;
      if (p.id === excludePatientId) return false;
      const currentPatientBed = (p.bedNumber || '').toString().trim().toLowerCase();
      return currentPatientBed === targetBed;
    });

    return conflict ? conflict.name : null;
  };

  // --- MANEJADORES DE MODALES Y ACCIONES ---

  const openModal = (patient = null) => {
    setValidationError(''); 
    if (patient) {
      setFormData(patient);
      setEditingId(patient.id);
    } else {
      setFormData({
        name: '',
        bedNumber: '',
        treatment: '',
        pending: '',
        hospitalization: false,
        room: activeTab === MANUAL_TAB_ID ? manualRoomSelect : activeTab
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setValidationError('');

    // Validar cama antes de guardar
    const bedConflictName = checkBedAvailability(formData.room, formData.bedNumber, editingId);
    if (bedConflictName) {
      setValidationError(`ERROR CRÍTICO: La cama "${formData.bedNumber}" ya está ocupada por: ${bedConflictName}.`);
      return; 
    }

    if (editingId) {
      setPatients(patients.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
    } else {
      setPatients([...patients, { ...formData, id: Date.now().toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteId) {
      setPatients(patients.filter(p => p.id !== deleteId));
      setDeleteId(null);
    }
  };

  // --- LÓGICA DE TRASLADO ---
  const openTransferModal = (patient) => {
    setValidationError(''); 
    const suggestedRoom = ROOMS.find(r => r.id !== patient.room)?.id || ROOMS[0].id;
    
    setTransferData({
      id: patient.id,
      name: patient.name,
      fromRoom: patient.room,
      toRoom: suggestedRoom,
      newBedNumber: ''
    });
    setIsTransferModalOpen(true);
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    setValidationError('');
    
    const bedConflictName = checkBedAvailability(transferData.toRoom, transferData.newBedNumber, transferData.id);
    if (bedConflictName) {
      setValidationError(`IMPOSIBLE TRASLADAR: La cama "${transferData.newBedNumber}" en ${ROOMS.find(r => r.id === transferData.toRoom)?.name} está ocupada por ${bedConflictName}.`);
      return; 
    }

    if (transferData.id) {
      setPatients(patients.map(p => {
        if (p.id === transferData.id) {
          return { 
            ...p, 
            room: transferData.toRoom, 
            bedNumber: transferData.newBedNumber 
          };
        }
        return p;
      }));
      setIsTransferModalOpen(false);
    }
  };

  // --- GENERADOR DE DOCUMENTO HTML (DESCARGA) ---
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

      // 4 Filas vacías para completar a mano
      const emptyRowsHtml = Array(4).fill(`
        <tr>
          <td style="height: 40px; border: 1px solid black;"></td>
          <td style="border: 1px solid black;"></td>
          <td style="border: 1px solid black;"></td>
          <td style="border: 1px solid black;"></td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Hoja de Respaldo - ${roomName}</title>
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
          <h1>Registro Manual / Respaldo - ${roomName}</h1>
          
          <div class="meta">
            <span>FECHA: ${new Date().toLocaleDateString()}</span>
            <span>HORA GENERACIÓN: ${new Date().toLocaleTimeString()}</span>
          </div>

          <div class="staff-box">
            <strong>EQUIPO A CARGO (${currentShift.toUpperCase()}):</strong> &nbsp;&nbsp; 
            Enfermera/o: <u>${nurseName}</u> &nbsp;&nbsp;|&nbsp;&nbsp; 
            TENS: <u>${tensName}</u>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%">N° / CAMA</th>
                <th style="width: 30%">PACIENTE</th>
                <th style="width: 30%">TRATAMIENTO</th>
                <th style="width: 30%">OBSERVACIONES - PENDIENTES</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              ${emptyRowsHtml} 
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Respaldo_${roomName.replace(/\s+/g, '_')}_${new Date().getTime()}.html`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    }, 0);
  };

  // --- RENDERIZADO ---
  const isManualTab = activeTab === MANUAL_TAB_ID;
  const currentRoomId = isManualTab ? manualRoomSelect : activeTab;
  const filteredPatients = patients.filter(p => p.room === currentRoomId);
  const showBedColumn = ['obs1', 'obs2', 'obs34', 'reanimador'].includes(currentRoomId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      
      {/* --- ESTILOS CSS DE IMPRESIÓN (INCRUSTADOS) --- */}
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
          h1 { font-size: 14px; text-align: center; text-transform: uppercase; border-bottom: 2px solid black; padding-bottom: 5px; margin-bottom: 10px; }
          .print-header { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 5px; }
          .print-staff { border: 1px solid #ccc; padding: 5px; font-size: 10px; margin-bottom: 10px; }
          .empty-row { height: 40px; }
        }
        .only-print { display: none; }
      `}</style>

      {/* --- HEADER --- */}
      <div className="no-print">
        <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">PIZARRA URGENCIA PEDIÁTRICA</h1>
                <p className="text-blue-100 text-xs font-bold">Control de Pacientes en Tiempo Real</p>
              </div>
            </div>
            <div className="text-right hidden md:block border-l border-blue-500 pl-6">
              <div className="font-mono text-3xl font-bold leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <p className="text-blue-200 text-xs mt-1 uppercase">{currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-4 md:p-6">
          
          {/* --- PESTAÑAS DE NAVEGACIÓN --- */}
          <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-slate-200 pb-1">
            {ROOMS.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveTab(room.id)}
                className={`
                  px-4 py-3 rounded-t-lg font-bold transition-all duration-200 flex-1 md:flex-none text-sm md:text-base flex items-center justify-center gap-2
                  ${activeTab === room.id ? 'bg-white text-blue-700 border-t-4 border-blue-600 shadow-sm' : 'bg-slate-200 text-slate-500 border-t-4 border-transparent'}
                  ${room.id === 'reanimador' && activeTab === 'reanimador' ? '!text-red-600 !border-red-600' : ''}
                `}
              >
                {room.id === 'reanimador' && <AlertTriangle size={16} />}
                {room.name}
                <span className="ml-1 text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                  {patients.filter(p => p.room === room.id).length}
                </span>
              </button>
            ))}

            <button
              onClick={() => setActiveTab(MANUAL_TAB_ID)}
              className={`
                px-4 py-3 rounded-t-lg font-bold transition-all duration-200 flex-1 md:flex-none text-sm md:text-base flex items-center justify-center gap-2 ml-auto
                ${activeTab === MANUAL_TAB_ID ? 'bg-slate-800 text-white border-t-4 border-slate-600 shadow-sm' : 'bg-slate-200 text-slate-600 border-t-4 border-transparent hover:bg-slate-300'}
              `}
            >
              <Printer size={18} />
              <span className="hidden md:inline">Formato Manual</span>
              <span className="md:hidden">Imprimir</span>
            </button>
          </div>

          {/* --- CONTENIDO SEGÚN PESTAÑA --- */}

          {isManualTab ? (
            /* === MODO GENERADOR MANUAL === */
            <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-300 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    Generador de Hoja de Respaldo
                  </h2>
                  <p className="text-sm text-slate-500">Selecciona una sala para descargar el formato manual.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
                  <select 
                    value={manualRoomSelect}
                    onChange={(e) => setManualRoomSelect(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg font-medium bg-white w-full sm:w-auto"
                  >
                    {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      type="button"
                      onClick={handleDownloadHTML}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
                      title="Descargar archivo HTML para imprimir"
                    >
                      <Download size={18} /> Descargar para Imprimir
                    </button>
                  </div>
                </div>
              </div>

              {/* PREVISUALIZACIÓN DEL DOCUMENTO */}
              <div className="border-2 border-slate-800 p-8 bg-white shadow-inner overflow-x-auto flex justify-center bg-slate-100">
                <div className="min-w-[600px] max-w-[700px] bg-white p-8 shadow-lg min-h-[800px]"> 
                  <div className="text-center border-b-2 border-black pb-4 mb-4">
                    <h1 className="text-xl font-bold uppercase tracking-wider">Registro Manual / Respaldo</h1>
                    <h2 className="text-lg font-bold uppercase text-slate-700">{ROOMS.find(r => r.id === manualRoomSelect)?.name}</h2>
                  </div>
                  
                  <div className="flex justify-between text-xs font-mono mb-4 text-slate-600">
                    <span>FECHA: {new Date().toLocaleDateString()}</span>
                    <span>HORA: {new Date().toLocaleTimeString()}</span>
                  </div>

                   {/* Previsualización de Personal */}
                   <div className="mb-4 border p-2 bg-slate-50 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <strong>PERSONAL A CARGO:</strong>
                      <span className="font-bold bg-slate-200 px-2 rounded text-[10px] uppercase">TURNO: {staff[manualRoomSelect]?.shift || 'Día'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-1">
                      <div>Enfermera/o: <u>{staff[manualRoomSelect]?.nurse || '___________________'}</u></div>
                      <div>TENS: <u>{staff[manualRoomSelect]?.tens || '___________________'}</u></div>
                    </div>
                  </div>

                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-2 w-[10%] text-center font-bold">N° / CAMA</th>
                        <th className="border border-black p-2 w-[30%] text-left font-bold">PACIENTE</th>
                        <th className="border border-black p-2 w-[30%] text-left font-bold">TRATAMIENTO</th>
                        <th className="border border-black p-2 w-[30%] text-left font-bold">OBSERVACIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients
                          .sort((a, b) => (showBedColumn && a.bedNumber && b.bedNumber) ? a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }) : 0)
                          .map((patient) => (
                          <tr key={patient.id}>
                            <td className="border border-black p-2 text-center font-bold">{patient.bedNumber || '-'}</td>
                            <td className="border border-black p-2">
                              <div className="font-bold uppercase">{patient.name}</div>
                              {patient.hospitalization && <div className="text-red-600 font-bold text-[9px] mt-1">[HOSPITALIZAR]</div>}
                            </td>
                            <td className="border border-black p-2 whitespace-pre-wrap">{patient.treatment}</td>
                            <td className="border border-black p-2 whitespace-pre-wrap">{patient.pending}</td>
                          </tr>
                        ))
                      }
                      {/* SIEMPRE mostrar 4 filas vacías de respaldo */}
                      {[1, 2, 3, 4].map((i) => (
                        <tr key={`backup-row-${i}`}>
                          <td className="border border-black p-2 h-10 bg-slate-50/30"></td>
                          <td className="border border-black p-2 h-10 bg-slate-50/30"></td>
                          <td className="border border-black p-2 h-10 bg-slate-50/30"></td>
                          <td className="border border-black p-2 h-10 bg-slate-50/30"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="mt-8 text-center text-[10px] text-slate-400 italic">
                    Respaldo digital. Los datos pueden cambiar.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* === MODO PIZARRA INTERACTIVA === */
            <div className={`bg-white rounded-b-lg shadow-lg min-h-[60vh] border relative ${activeTab === 'reanimador' ? 'border-red-200' : 'border-slate-200'}`}>
              
              {/* --- BARRA DE REGISTRO DE PERSONAL --- */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-end rounded-t-lg">
                <div className="flex items-center gap-2 lg:col-span-3 mb-2">
                  <Users className="text-blue-600" size={20} />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">Equipo {ROOMS.find(r => r.id === activeTab)?.name}:</span>
                </div>
                
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Enfermera/o a cargo</label>
                  <input 
                    type="text" 
                    placeholder="Nombre..." 
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 outline-none"
                    value={staff[activeTab]?.nurse || ''}
                    onChange={(e) => updateStaff(activeTab, 'nurse', e.target.value)}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">TENS a cargo</label>
                  <input 
                    type="text" 
                    placeholder="Nombre..." 
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 outline-none"
                    value={staff[activeTab]?.tens || ''}
                    onChange={(e) => updateStaff(activeTab, 'tens', e.target.value)}
                  />
                </div>
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Turno Actual</label>
                  <select 
                    value={staff[activeTab]?.shift || 'Día'}
                    onChange={(e) => updateStaff(activeTab, 'shift', e.target.value)}
                    className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                  >
                    <option value="Día">☀️ Turno Día</option>
                    <option value="Noche">🌙 Turno Noche</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider border-b border-slate-300">
                      {showBedColumn && <th className="p-4 w-16 font-bold text-center">Cama</th>}
                      <th className="p-4 w-1/4 font-bold">Paciente</th>
                      <th className="p-4 w-1/3 font-bold">Tratamiento</th>
                      <th className="p-4 w-1/3 font-bold">Pendiente</th>
                      <th className="p-4 w-28 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.length > 0 ? (
                      filteredPatients
                        .sort((a, b) => (showBedColumn && a.bedNumber && b.bedNumber) ? a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }) : 0)
                        .map((patient) => (
                        <tr key={patient.id} className="hover:bg-blue-50 transition-colors">
                          {showBedColumn && (
                            <td className="p-4 align-top text-center">
                              {patient.bedNumber ? <span className="font-bold text-lg bg-slate-100 px-2 py-1 rounded border">{patient.bedNumber}</span> : '-'}
                            </td>
                          )}
                          <td className="p-4 align-top">
                            <div className="font-bold text-lg">{patient.name}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10}/> {patient.timestamp}</div>
                            {patient.hospitalization && <div className="mt-1 inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold"><Bed size={10}/> HOSPITALIZAR</div>}
                          </td>
                          <td className="p-4 align-top text-sm whitespace-pre-wrap bg-blue-50/50 rounded m-1">{patient.treatment}</td>
                          <td className="p-4 align-top text-sm whitespace-pre-wrap bg-amber-50/50 rounded m-1">{patient.pending}</td>
                          <td className="p-4 text-center">
                            <div className="flex gap-1 justify-center">
                              {/* Botón Trasladar */}
                              <button 
                                onClick={() => openTransferModal(patient)}
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                title="Trasladar Paciente"
                              >
                                <ArrowRightCircle size={18} />
                              </button>
                              <button onClick={() => openModal(patient)} className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Editar"><Edit2 size={18} /></button>
                              <button onClick={() => setDeleteId(patient.id)} className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors" title="Dar de alta"><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                        <Monitor size={48} className="opacity-20"/>
                        <span className="font-medium">Sala vacía</span>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Botón Flotante */}
              <button onClick={() => openModal()} className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 z-20 flex items-center gap-2">
                <Plus size={24} /><span className="hidden md:inline font-bold">Ingresar Paciente</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* --- INTERFAZ OCULTA DE IMPRESIÓN DIRECTA (CTRL+P) --- */}
      <div className="hidden print:block print-container">
        <h1>Registro Manual / Respaldo - {(isManualTab ? ROOMS.find(r => r.id === manualRoomSelect) : ROOMS.find(r => r.id === activeTab))?.name.toUpperCase()}</h1>
        <div className="print-header">
          <span>FECHA: {new Date().toLocaleDateString()}</span>
          <span>HORA: {new Date().toLocaleTimeString()}</span>
          <span>SALA: {(isManualTab ? ROOMS.find(r => r.id === manualRoomSelect) : ROOMS.find(r => r.id === activeTab))?.name}</span>
        </div>

        <div className="print-staff">
          <strong>PERSONAL DE TURNO ({staff[isManualTab ? manualRoomSelect : activeTab]?.shift?.toUpperCase() || 'DÍA'}):</strong> &nbsp;
          Enfermera/o: {staff[isManualTab ? manualRoomSelect : activeTab]?.nurse || '__________'} &nbsp;|&nbsp; 
          TENS: {staff[isManualTab ? manualRoomSelect : activeTab]?.tens || '__________'}
        </div>

        <table>
          <thead>
            <tr>
              <th style={{width: '10%'}}>N° / CAMA</th>
              <th style={{width: '30%'}}>PACIENTE</th>
              <th style={{width: '30%'}}>TRATAMIENTO</th>
              <th style={{width: '30%'}}>OBSERVACIONES - PENDIENTES</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(p => (
                <tr key={p.id}>
                  <td style={{textAlign: 'center', fontWeight: 'bold'}}>{p.bedNumber || '-'}</td>
                  <td>
                    <div style={{fontWeight: 'bold', textTransform: 'uppercase'}}>{p.name}</div>
                    {p.hospitalization && <div style={{fontWeight: 'bold', textDecoration: 'underline', fontSize: '10px', marginTop: '2px'}}>[HOSPITALIZAR]</div>}
                  </td>
                  <td>{p.treatment}</td>
                  <td>{p.pending}</td>
                </tr>
              ))
            }
            {/* 4 Filas de Respaldo Manual SIEMPRE */}
            {[1, 2, 3, 4].map(i => (
              <tr key={`print-backup-${i}`}>
                <td className="empty-row"></td>
                <td className="empty-row"></td>
                <td className="empty-row"></td>
                <td className="empty-row"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* === MODALES === */}

      {/* Modal de Traslado */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-700">
                <ArrowRightCircle size={24} />
                <h2 className="text-xl font-bold">Trasladar Paciente</h2>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            <div className="mb-6">
              <p className="text-slate-600 text-sm">Estás moviendo a <span className="font-bold text-slate-900">{transferData.name}</span>.</p>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded border">
                <span>Desde: <strong>{ROOMS.find(r => r.id === transferData.fromRoom)?.name}</strong></span>
              </div>
            </div>

             {validationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs font-bold">
                <AlertOctagon size={16} className="shrink-0 mt-0.5" />
                <div>{validationError}</div>
              </div>
            )}

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Hacia Sala (Destino)</label>
                <select
                  value={transferData.toRoom}
                  onChange={(e) => {
                    setTransferData({...transferData, toRoom: e.target.value});
                    setValidationError('');
                  }}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white font-medium"
                >
                  {ROOMS.filter(r => r.id !== transferData.fromRoom).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {['obs1', 'obs2', 'obs34', 'reanimador'].includes(transferData.toRoom) && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nueva Cama / Ubicación</label>
                  <input
                    type="text"
                    placeholder="Ej: 5"
                    value={transferData.newBedNumber}
                    onChange={(e) => {
                      setTransferData({...transferData, newBedNumber: e.target.value});
                      setValidationError('');
                    }}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center font-bold"
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 mt-1">Se borrará el número de cama anterior automáticamente.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-lg shadow-purple-600/20"
                >
                  <ArrowRightCircle size={18} />
                  Confirmar Traslado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">{editingId ? 'Editar' : 'Ingresar'} Paciente</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-slate-400" /></button>
            </div>

            {validationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-xs font-bold">
                <AlertOctagon size={16} className="shrink-0 mt-0.5" />
                <div>{validationError}</div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Sala</label>
                  <select 
                    value={formData.room} 
                    onChange={(e) => {
                      setFormData({...formData, room: e.target.value});
                      setValidationError('');
                    }} 
                    className="w-full p-2 border rounded"
                  >
                    {ROOMS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">N° Cama</label>
                  <input 
                    type="text" 
                    value={formData.bedNumber} 
                    onChange={(e) => {
                      setFormData({...formData, bedNumber: e.target.value});
                      setValidationError('');
                    }}
                    className="w-full p-2 border rounded text-center font-bold" 
                    placeholder="#" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Paciente</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" placeholder="Nombre completo" />
              </div>
              
              <div className={`p-3 rounded border cursor-pointer flex items-center gap-3 ${formData.hospitalization ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`} onClick={() => setFormData({...formData, hospitalization: !formData.hospitalization})}>
                 <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.hospitalization ? 'bg-red-600 border-red-600 text-white' : 'bg-white'}`}>{formData.hospitalization && <CheckCircle2 size={14}/>}</div>
                 <span className="text-sm font-medium text-slate-700">Marcar "Requiere Hospitalización"</span>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tratamiento</label>
                <textarea rows="3" value={formData.treatment} onChange={e => setFormData({...formData, treatment: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pendiente</label>
                <textarea rows="2" value={formData.pending} onChange={e => setFormData({...formData, pending: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"><Save size={18}/> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Borrado */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl p-6 max-w-sm text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-600 mb-4" />
            <h3 className="text-lg font-bold mb-2">¿Dar de alta?</h3>
            <p className="text-sm text-slate-500 mb-6">Se eliminará el paciente del registro.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;