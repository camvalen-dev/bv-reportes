import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  HardHat, ClipboardList, Users, Plus, Trash2, Upload, ChevronLeft,
  FileSpreadsheet, CheckCircle2, Settings, FolderOpen, Building2, X,
  AlertCircle, Clock, Hash, FileText, Mail, Loader2, Cloud, CloudOff,
  AtSign, LogOut, LogIn, UserPlus, Shield, User, Eye, EyeOff, KeyRound
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, getDoc, where
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} from 'firebase/auth';
import { db, auth, firebaseOk } from './firebase';

// =============================================================
// Constantes
// =============================================================
const CATEGORIAS = ['Cap.', 'M1', 'M2', 'AYU'];
const ESPECIALIDADES = ['Elect.', 'Mec.', 'Civ.', 'Instr.'];
const UNIDADES = ['M', 'Ud', 'Cu', 'Kg', 'Gl', 'Pza'];
const HORAS_DIA = 9;

// =============================================================
// Componentes UI
// =============================================================
const Button = ({ children, onClick, variant = 'primary', className = '', disabled, type = 'button', size = 'md' }) => {
  const base = 'font-semibold rounded-lg transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed tracking-tight';
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-4 py-3 text-base', lg: 'px-5 py-4 text-lg' };
  const variants = {
    primary: 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-lg shadow-amber-500/30',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-slate-200 border border-slate-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder, className = '', min, step }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>}
    <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min={min} step={step}
      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent" />
  </div>
);

const Select = ({ label, value, onChange, options, placeholder = 'Seleccionar...', className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>}
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
      <option value="">{placeholder}</option>
      {options.map((opt, i) => (
        <option key={i} value={typeof opt === 'object' ? opt.value : opt}>
          {typeof opt === 'object' ? opt.label : opt}
        </option>
      ))}
    </select>
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl p-5 ${className}`}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-3">
      {Icon && <div className="bg-amber-500/20 p-2 rounded-lg"><Icon className="w-5 h-5 text-amber-400" /></div>}
      <div>
        <h2 className="font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// =============================================================
// HOME
// =============================================================
const HomeScreen = ({ obras, obraActual, setObraActual, onGoAdmin, onGoLeader, onGoUsers, cloudStatus, isAdmin }) => (
  <div className="p-5 space-y-5">
    <div className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-red-600">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full translate-y-8 -translate-x-8"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HardHat className="w-6 h-6 text-slate-900" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-900/80">BV Reportes</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-full">
            {cloudStatus === 'ok' ? <Cloud className="w-3 h-3 text-slate-900" /> : <CloudOff className="w-3 h-3 text-slate-900" />}
            <span className="text-[10px] font-bold text-slate-900">{cloudStatus === 'ok' ? 'En línea' : 'Local'}</span>
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Reportería diaria<br />de cuadrillas</h1>
        <p className="text-sm text-slate-900/70 mt-2">Control de actividades y rendimientos en obra</p>
      </div>
    </div>

    <Card>
      <SectionHeader icon={Building2} title="Obra activa" subtitle="Selecciona el proyecto" />
      {obras.length === 0 ? (
        <div className="bg-slate-800/60 border border-dashed border-slate-700 rounded-xl p-4 text-center">
          <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-slate-300">No hay obras registradas.</p>
          <p className="text-xs text-slate-500 mt-1">Ingresa al panel Admin para crear una.</p>
        </div>
      ) : (
        <Select value={obraActual?.id ?? ''} onChange={(id) => setObraActual(obras.find(o => o.id === id) || null)}
          options={obras.map(o => ({ value: o.id, label: `${o.nombre} (${o.actividades?.length || 0} actividades)` }))}
          placeholder="Seleccionar obra..." />
      )}
    </Card>

    <div className="grid grid-cols-1 gap-3">
      <button onClick={onGoLeader} disabled={!obraActual}
        className="group relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl p-5 text-left transition-all active:scale-[0.98]">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-xl"><ClipboardList className="w-7 h-7 text-white" /></div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg tracking-tight">Líder de cuadrilla</h3>
            <p className="text-sm text-white/80">Crear reporte diario</p>
          </div>
        </div>
      </button>
      <button onClick={onGoAdmin}
        className="group relative overflow-hidden bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-5 text-left transition-all active:scale-[0.98] border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 p-3 rounded-xl"><Settings className="w-7 h-7 text-amber-400" /></div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg tracking-tight">Administrador</h3>
            <p className="text-sm text-slate-400">Gestionar obras y actividades</p>
          </div>
        </div>
      </button>
      {isAdmin && onGoUsers && (
        <button onClick={onGoUsers}
          className="group relative overflow-hidden bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 rounded-2xl p-5 text-left transition-all active:scale-[0.98] border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl"><Users className="w-7 h-7 text-blue-400" /></div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg tracking-tight">Usuarios</h3>
              <p className="text-sm text-slate-400">Crear cuentas y asignar permisos</p>
            </div>
          </div>
        </button>
      )}
    </div>

    <div className="text-center text-xs text-slate-500 pt-4">Sistema BV · v1.0 · {cloudStatus === 'ok' ? 'Firebase' : 'Local'}</div>
  </div>
);

// =============================================================
// ADMIN
// =============================================================
const AdminScreen = ({ obras, obraActual, setObraActual, onBack, guardarObra, eliminarObraCloud }) => {
  const [nuevaObra, setNuevaObra] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const fileInputRef = useRef(null);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  const crearObra = async () => {
    if (!nuevaObra.trim()) return;
    const nueva = { id: `obra_${Date.now()}`, nombre: nuevaObra.trim(), actividades: [] };
    try {
      await guardarObra(nueva);
      if (!obraActual) setObraActual(nueva);
      setNuevaObra('');
      mostrarMensaje('ok', `Obra "${nueva.nombre}" creada`);
    } catch (e) {
      mostrarMensaje('error', `Error: ${e.message}`);
    }
  };

  const eliminarObra = async (id) => {
    if (!confirm('¿Eliminar esta obra y todas sus actividades?')) return;
    try {
      await eliminarObraCloud(id);
      if (obraActual?.id === id) setObraActual(null);
    } catch (e) {
      mostrarMensaje('error', `Error: ${e.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !obraActual) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheet = wb.Sheets['Actividades']
        || wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('actividad'))]
        || wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      let headerRow = -1;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        if (rows[i]?.some(c => typeof c === 'string' && c.toLowerCase().includes('iditem'))) { headerRow = i; break; }
      }
      if (headerRow === -1) throw new Error('No se encontró la columna IdItem');

      const headers = rows[headerRow].map(h => String(h || '').trim());
      const idIdx = headers.findIndex(h => h.toLowerCase() === 'iditem');
      const grupoIdx = headers.findIndex(h => h.toLowerCase() === 'grupo');
      const actividadIdx = headers.findIndex(h => h.toLowerCase() === 'actividad');

      const nuevasActividades = [];
      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[idIdx]) continue;
        nuevasActividades.push({
          idItem: String(row[idIdx]),
          grupo: String(row[grupoIdx] || ''),
          actividad: String(row[actividadIdx] || ''),
        });
      }
      const obraActualizada = { ...obraActual, actividades: nuevasActividades };
      await guardarObra(obraActualizada);
      setObraActual(obraActualizada);
      mostrarMensaje('ok', `${nuevasActividades.length} actividades cargadas`);
    } catch (err) {
      mostrarMensaje('error', `Error: ${err.message}`);
    }
    e.target.value = '';
  };

  const actualizarActividad = async (idx, campo, valor) => {
    const nuevas = [...obraActual.actividades];
    nuevas[idx] = { ...nuevas[idx], [campo]: valor };
    const actualizada = { ...obraActual, actividades: nuevas };
    setObraActual(actualizada);
    await guardarObra(actualizada);
  };

  const eliminarActividad = async (idx) => {
    const nuevas = obraActual.actividades.filter((_, i) => i !== idx);
    const actualizada = { ...obraActual, actividades: nuevas };
    setObraActual(actualizada);
    await guardarObra(actualizada);
  };

  const agregarActividadManual = async () => {
    const nueva = { idItem: '', grupo: '', actividad: '' };
    const actualizada = { ...obraActual, actividades: [...obraActual.actividades, nueva] };
    setObraActual(actualizada);
    await guardarObra(actualizada);
  };

  // Gestión de correos
  const [nuevoCorreo, setNuevoCorreo] = useState('');

  const agregarCorreo = async () => {
    const correo = nuevoCorreo.trim().toLowerCase();
    if (!correo || !correo.includes('@')) {
      mostrarMensaje('error', 'Correo inválido');
      return;
    }
    const correosActuales = obraActual.correos || [];
    if (correosActuales.includes(correo)) {
      mostrarMensaje('error', 'Ese correo ya está agregado');
      return;
    }
    const actualizada = { ...obraActual, correos: [...correosActuales, correo] };
    setObraActual(actualizada);
    await guardarObra(actualizada);
    setNuevoCorreo('');
  };

  const eliminarCorreo = async (correo) => {
    const actualizada = { ...obraActual, correos: (obraActual.correos || []).filter(c => c !== correo) };
    setObraActual(actualizada);
    await guardarObra(actualizada);
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Administración</h1>
          <p className="text-xs text-slate-400">Obras y actividades</p>
        </div>
      </div>

      {mensaje && (
        <div className={`rounded-xl p-3 text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
          {mensaje.texto}
        </div>
      )}

      <Card>
        <SectionHeader icon={FolderOpen} title="Obras" subtitle={`${obras.length} registrada(s)`} />
        <div className="flex gap-2 mb-4">
          <input type="text" value={nuevaObra} onChange={(e) => setNuevaObra(e.target.value)} placeholder="Nombre de la obra..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            onKeyDown={(e) => e.key === 'Enter' && crearObra()} />
          <Button onClick={crearObra} size="md"><Plus className="w-5 h-5" /> Crear</Button>
        </div>
        <div className="space-y-2">
          {obras.map(o => (
            <div key={o.id} className={`flex items-center gap-3 p-3 rounded-lg border transition ${obraActual?.id === o.id ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-800/50 border-slate-700'}`}>
              <button onClick={() => setObraActual(o)} className="flex-1 text-left">
                <div className="font-semibold text-white text-sm">{o.nombre}</div>
                <div className="text-xs text-slate-400">{o.actividades?.length || 0} actividades</div>
              </button>
              {obraActual?.id === o.id && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
              <button onClick={() => eliminarObra(o.id)} className="p-2 hover:bg-red-500/20 rounded-lg">
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {obraActual && (
        <Card>
          <SectionHeader icon={ClipboardList} title={`Actividades · ${obraActual.nombre}`} subtitle="Cargadas desde Excel o manualmente" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input type="file" accept=".xlsx,.xlsm,.xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <Button onClick={() => fileInputRef.current?.click()} variant="primary" size="sm"><Upload className="w-4 h-4" /> Desde Excel</Button>
            <Button onClick={agregarActividadManual} variant="ghost" size="sm"><Plus className="w-4 h-4" /> Manual</Button>
          </div>

          {(obraActual.actividades?.length || 0) > 0 && (
            <div className="bg-slate-950/50 rounded-lg border border-slate-800 overflow-hidden">
              <div className="grid grid-cols-[80px_100px_1fr_40px] gap-2 p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80 border-b border-slate-800">
                <div>ID Item</div><div>Área</div><div>Actividad</div><div></div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {obraActual.actividades.map((a, i) => (
                  <div key={i} className="grid grid-cols-[80px_100px_1fr_40px] gap-2 p-2 text-xs border-b border-slate-800/50 items-center">
                    <input value={a.idItem} onChange={(e) => actualizarActividad(i, 'idItem', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs w-full" />
                    <input value={a.grupo} onChange={(e) => actualizarActividad(i, 'grupo', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs w-full" />
                    <input value={a.actividad} onChange={(e) => actualizarActividad(i, 'actividad', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs w-full" />
                    <button onClick={() => eliminarActividad(i)} className="p-1 hover:bg-red-500/20 rounded"><X className="w-3 h-3 text-red-400" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              <strong>Tip:</strong> El Excel debe tener una hoja <strong>"Actividades"</strong> con columnas <strong>IdItem</strong>, <strong>Grupo</strong> y <strong>Actividad</strong>.
            </p>
          </div>
        </Card>
      )}

      {obraActual && (
        <Card>
          <SectionHeader icon={AtSign} title="Correos de destino" subtitle="Reciben el reporte cuando el líder lo emite" />
          <div className="flex gap-2 mb-4">
            <input type="email" value={nuevoCorreo} onChange={(e) => setNuevoCorreo(e.target.value)}
              placeholder="correo@empresa.cl"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              onKeyDown={(e) => e.key === 'Enter' && agregarCorreo()} />
            <Button onClick={agregarCorreo} size="md"><Plus className="w-5 h-5" /> Agregar</Button>
          </div>
          {(obraActual.correos || []).length === 0 ? (
            <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400">Sin correos configurados</p>
              <p className="text-[10px] text-slate-500 mt-1">El líder deberá escribirlos manualmente al emitir</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(obraActual.correos || []).map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-800/70 border border-slate-700 rounded-lg p-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 text-sm text-white truncate">{c}</div>
                  <button onClick={() => eliminarCorreo(c)} className="p-1.5 hover:bg-red-500/20 rounded">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// =============================================================
// LEADER
// =============================================================
const LeaderScreen = ({ obra, onBack, hideBack }) => {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoy);
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [disciplina, setDisciplina] = useState('ELECTRICO');
  const [capataz, setCapataz] = useState('');
  const [supervisor, setSupervisor] = useState('');
  const [jefeTerreno, setJefeTerreno] = useState('');
  const [correosSeleccionados, setCorreosSeleccionados] = useState(() => obra.correos || []);
  const [correoExtra, setCorreoExtra] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Sincronizar cuando cambien los correos de la obra
  useEffect(() => {
    setCorreosSeleccionados(obra.correos || []);
  }, [obra.correos]);

  const toggleCorreo = (correo) => {
    setCorreosSeleccionados(prev =>
      prev.includes(correo) ? prev.filter(c => c !== correo) : [...prev, correo]
    );
  };

  const agregarCorreoExtra = () => {
    const c = correoExtra.trim().toLowerCase();
    if (!c || !c.includes('@')) { alert('Correo inválido'); return; }
    if (correosSeleccionados.includes(c)) { alert('Ya está en la lista'); return; }
    setCorreosSeleccionados(prev => [...prev, c]);
    setCorreoExtra('');
  };

  const [trabajadores, setTrabajadores] = useState(() =>
    Array.from({ length: 10 }, () => ({
      nombre: '', categoria: '', especialidad: 'Elect.',
      horas: Array(7).fill(''), observaciones: ''
    }))
  );

  const [actividades, setActividades] = useState(() => [
    ...Array.from({ length: 5 }, () => ({
      idItem: '', grupo: '', actividad: '', subArea: '', descripcion: '',
      unidad: '', cantidad: '', observaciones: ''
    })),
    { idItem: 'HH REPROCESOS', grupo: '', actividad: '', subArea: '', descripcion: '', unidad: '', cantidad: '', observaciones: '' },
    { idItem: 'HH PERDIDAS', grupo: '', actividad: '', subArea: '', descripcion: '', unidad: '', cantidad: '', observaciones: '' },
  ]);

  const [resultado, setResultado] = useState(null);

  const opcionesActividades = useMemo(
    () => (obra.actividades || []).map(a => ({
      value: a.idItem, label: `${a.idItem} · ${a.grupo} · ${a.actividad}`, ...a
    })), [obra.actividades]);

  const actualizarTrabajador = (idx, campo, valor) => {
    const next = [...trabajadores];
    next[idx] = { ...next[idx], [campo]: valor };
    setTrabajadores(next);
  };
  const actualizarHorasTrabajador = (idx, actIdx, valor) => {
    const next = [...trabajadores];
    const horas = [...next[idx].horas];
    horas[actIdx] = valor;
    next[idx] = { ...next[idx], horas };
    setTrabajadores(next);
  };
  const actualizarActividad = (idx, campo, valor) => {
    const next = [...actividades];
    if (campo === 'idItem' && idx < 5) {
      const found = (obra.actividades || []).find(a => String(a.idItem) === String(valor));
      if (found) {
        next[idx] = { ...next[idx], idItem: found.idItem, grupo: found.grupo, actividad: found.actividad, descripcion: next[idx].descripcion || found.actividad };
      } else { next[idx] = { ...next[idx], idItem: valor }; }
    } else { next[idx] = { ...next[idx], [campo]: valor }; }
    setActividades(next);
  };

  const totalHorasTrab = (t) => t.horas.reduce((s, h) => s + (parseFloat(h) || 0), 0);
  const totalHorasActividad = (actIdx) => trabajadores.reduce((s, t) => s + (parseFloat(t.horas[actIdx]) || 0), 0);
  const trabajadoresConNombre = trabajadores.filter(t => t.nombre.trim());
  const totalHorasGeneral = trabajadores.reduce((s, t) => s + totalHorasTrab(t), 0);

  // Construir Excel
  const construirExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = [];
    for (let i = 0; i < 53; i++) rows.push(Array(19).fill(null));

    rows[0][8] = obra.nombre.toUpperCase();
    rows[3][8] = 'REPORTE DIARIO DE TRABAJO';
    rows[7][0] = 'DISCIPLINA:'; rows[7][2] = disciplina;
    rows[7][8] = 'FECHA:'; rows[7][10] = fecha.split('-').reverse().join('/');
    rows[7][14] = 'EQUIPO:'; rows[7][16] = nombreEquipo;

    rows[11][0] = 'CANT.'; rows[11][2] = 'NOMBRE'; rows[11][6] = 'CATEG.'; rows[11][7] = 'ESPEC.';
    rows[11][8] = 'HORAS TRABAJADAS POR ACTIVIDAD';
    rows[11][15] = 'TOTAL HORAS DIA'; rows[11][16] = 'OBSERVACIONES';
    for (let i = 0; i < 7; i++) rows[12][8 + i] = i + 1;

    for (let i = 0; i < 10; i++) {
      const t = trabajadores[i]; const rowIdx = 13 + i;
      rows[rowIdx][0] = i + 1; rows[rowIdx][2] = t.nombre; rows[rowIdx][6] = t.categoria; rows[rowIdx][7] = t.especialidad;
      for (let j = 0; j < 7; j++) {
        const h = parseFloat(t.horas[j]);
        if (!isNaN(h) && h > 0) rows[rowIdx][8 + j] = h;
      }
      rows[rowIdx][15] = totalHorasTrab(t) || 0;
      rows[rowIdx][16] = t.observaciones;
    }

    rows[24][0] = 'NOTA:'; rows[24][1] = `LAS H.H. DIA SON ${HORAS_DIA} ( ${HORAS_DIA} HORAS )`;
    rows[24][7] = 'NOTA:'; rows[24][8] = 'EL CAPATAZ DEBE ESTAR INCLUIDO EN DESGLOSE DE HORAS';

    rows[26][0] = 'Nº ACTIV.'; rows[26][1] = 'ITEM ACTIVIDAD'; rows[26][3] = 'AREA'; rows[26][4] = 'SUB-AREA';
    rows[26][6] = 'DESCRIPCION DE TRABAJOS'; rows[26][15] = 'UNID'; rows[26][16] = 'CANTIDAD'; rows[26][17] = 'OBSERVACIONES';

    actividades.forEach((a, i) => {
      const rowIdx = 27 + i * 2;
      rows[rowIdx][0] = i + 1; rows[rowIdx][1] = a.idItem; rows[rowIdx][3] = a.grupo;
      rows[rowIdx][4] = a.subArea; rows[rowIdx][6] = a.descripcion || a.actividad;
      rows[rowIdx][15] = a.unidad; rows[rowIdx][16] = a.cantidad ? parseFloat(a.cantidad) : null;
      rows[rowIdx][17] = a.observaciones;
    });

    rows[43][0] = 'NOMBRE Y FIRMA DE CAPATAZ'; rows[43][6] = 'NOMBRE Y FIRMA DE SUPERVISOR';
    rows[43][12] = 'NOMBRE Y FIRMA JEFE DE TERRENO / ADMINISTRADOR';
    rows[46][0] = capataz; rows[46][6] = supervisor; rows[46][12] = jefeTerreno;

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 4 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 8 },
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
      { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 8 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 8 }, e: { r: 0, c: 14 } }, { s: { r: 3, c: 8 }, e: { r: 3, c: 14 } },
      { s: { r: 11, c: 2 }, e: { r: 11, c: 5 } }, { s: { r: 11, c: 8 }, e: { r: 11, c: 14 } },
      { s: { r: 26, c: 1 }, e: { r: 26, c: 2 } }, { s: { r: 26, c: 4 }, e: { r: 26, c: 5 } },
      { s: { r: 26, c: 6 }, e: { r: 26, c: 14 } },
    ];
    for (let i = 0; i < 10; i++) ws['!merges'].push({ s: { r: 13 + i, c: 2 }, e: { r: 13 + i, c: 5 } });
    for (let i = 0; i < 7; i++) {
      const r = 27 + i * 2;
      ws['!merges'].push({ s: { r, c: 1 }, e: { r, c: 2 } });
      ws['!merges'].push({ s: { r, c: 4 }, e: { r, c: 5 } });
      ws['!merges'].push({ s: { r, c: 6 }, e: { r, c: 14 } });
    }
    XLSX.utils.book_append_sheet(wb, ws, 'REPORTE DIARIO');

    // Resumen
    const resumenRows = [['Fecha', 'ID Item', 'Cuadrilla', 'Cantidad (solo M/Ud)', 'Unidad', 'HH Totales', 'Actividad', 'Área']];
    actividades.slice(0, 5).forEach((a, actIdx) => {
      if (!a.idItem) return;
      const hhTotal = totalHorasActividad(actIdx);
      const unidadNorm = (a.unidad || '').trim().toLowerCase();
      const cantidadIncluye = unidadNorm === 'm' || unidadNorm === 'ud';
      const cantidad = cantidadIncluye && a.cantidad ? parseFloat(a.cantidad) : '';
      resumenRows.push([
        fecha.split('-').reverse().join('/'), a.idItem, nombreEquipo, cantidad,
        a.unidad || '', hhTotal || 0, a.actividad || a.descripcion || '', a.grupo || ''
      ]);
    });
    [5, 6].forEach((idx) => {
      const hhTotal = totalHorasActividad(idx);
      if (hhTotal > 0) {
        resumenRows.push([fecha.split('-').reverse().join('/'), actividades[idx].idItem, nombreEquipo, '', '', hhTotal, '', '']);
      }
    });
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
    wsResumen['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'RESUMEN');

    return wb;
  };

  const validarDatos = () => {
    if (!nombreEquipo.trim()) { alert('Ingresa el Nombre del Equipo'); return false; }
    if (trabajadoresConNombre.length === 0) { alert('Ingresa al menos un trabajador'); return false; }
    const actConDatos = actividades.slice(0, 5).filter(a => a.idItem);
    if (actConDatos.length === 0) { alert('Ingresa al menos una actividad'); return false; }
    return true;
  };

  // Descargar local
  const descargarLocal = () => {
    if (!validarDatos()) return;
    const wb = construirExcel();
    const fname = `Reporte_${obra.nombre.replace(/\s+/g, '_')}_${(nombreEquipo || 'equipo').replace(/\s+/g, '_')}_${fecha}.xlsx`;
    XLSX.writeFile(wb, fname);
    setResultado({ tipo: 'descarga', nombre: fname });
  };

  // Enviar por correo
  const enviarPorCorreo = async () => {
    if (!validarDatos()) return;
    if (correosSeleccionados.length === 0) { alert('Selecciona al menos un correo destinatario'); return; }

    setEnviando(true);
    try {
      const wb = construirExcel();
      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      const fname = `Reporte_${obra.nombre.replace(/\s+/g, '_')}_${(nombreEquipo || 'equipo').replace(/\s+/g, '_')}_${fecha}.xlsx`;

      const res = await fetch('/api/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: correosSeleccionados,
          obraNombre: obra.nombre,
          equipo: nombreEquipo,
          fecha: fecha.split('-').reverse().join('/'),
          totalHH: totalHorasGeneral,
          numTrabajadores: trabajadoresConNombre.length,
          fileBase64: base64,
          fileName: fname,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || 'Error al enviar';
        const hint = data.hint ? `\n\n${data.hint}` : '';
        throw new Error(msg + hint);
      }
      setResultado({ tipo: 'correo', nombre: fname, destino: correosSeleccionados.join(', ') });
    } catch (err) {
      alert(`Error al enviar correo: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pb-40">
      <div className="sticky top-0 z-10 bg-gradient-to-b from-slate-950 to-slate-950/95 backdrop-blur border-b border-slate-800 px-5 py-3">
        <div className="flex items-center gap-3">
          {!hideBack && (
            <button onClick={onBack} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700"><ChevronLeft className="w-5 h-5 text-white" /></button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">Reporte Diario</h1>
            <p className="text-xs text-slate-400 truncate">{obra.nombre}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">HH totales</div>
            <div className="text-lg font-bold text-amber-400">{totalHorasGeneral}</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {resultado && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-emerald-200">
                  {resultado.tipo === 'correo' ? 'Correo enviado' : 'Reporte descargado'}
                </p>
                <p className="text-xs text-emerald-300/80 mt-1">{resultado.nombre}</p>
                {resultado.destino && <p className="text-xs text-emerald-400/60 mt-1">Enviado a: {resultado.destino}</p>}
              </div>
            </div>
          </div>
        )}

        <Card>
          <SectionHeader icon={FileText} title="Datos del reporte" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={fecha} onChange={setFecha} />
            <Input label="Nombre del Equipo" value={nombreEquipo} onChange={setNombreEquipo} placeholder="Ej: Cuadrilla A" />
            <Select label="Disciplina" value={disciplina} onChange={setDisciplina}
              options={['ELECTRICO', 'MECANICO', 'CIVIL', 'INSTRUMENTACION']} className="col-span-2" />
          </div>
        </Card>

        <Card>
          <SectionHeader icon={Users} title="Cuadrilla" subtitle={`${trabajadoresConNombre.length} trabajador(es) activo(s)`} />
          <div className="space-y-3">
            {trabajadores.map((t, i) => (
              <TrabajadorCard key={i} numero={i + 1} trabajador={t}
                onChange={(campo, valor) => actualizarTrabajador(i, campo, valor)}
                onChangeHoras={(actIdx, valor) => actualizarHorasTrabajador(i, actIdx, valor)}
                total={totalHorasTrab(t)} />
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader icon={ClipboardList} title="Actividades del día" subtitle="5 actividades + HH Reprocesos/Pérdidas" />
          <div className="space-y-3">
            {actividades.map((a, i) => (
              <ActividadCard key={i} numero={i + 1} actividad={a} esEspecial={i >= 5}
                opciones={opcionesActividades}
                onChange={(campo, valor) => actualizarActividad(i, campo, valor)}
                hhTotal={totalHorasActividad(i)} />
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader icon={Hash} title="Firmas" />
          <div className="space-y-3">
            <Input label="Capataz" value={capataz} onChange={setCapataz} placeholder="Nombre completo" />
            <Input label="Supervisor" value={supervisor} onChange={setSupervisor} placeholder="Nombre completo" />
            <Input label="Jefe de Terreno / Administrador" value={jefeTerreno} onChange={setJefeTerreno} placeholder="Nombre completo" />
          </div>
        </Card>

        <Card>
          <SectionHeader icon={Mail} title="Enviar por correo" subtitle={`${correosSeleccionados.length} destinatario(s) seleccionado(s)`} />
          {(obra.correos || []).length > 0 ? (
            <div className="space-y-2 mb-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Correos configurados en la obra</div>
              {(obra.correos || []).map((c, i) => {
                const seleccionado = correosSeleccionados.includes(c);
                return (
                  <button key={i} onClick={() => toggleCorreo(c)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition text-left ${seleccionado ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/50 border-slate-700'}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${seleccionado ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                      {seleccionado && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 text-sm text-white truncate">{c}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
              <p className="text-xs text-amber-200">
                No hay correos configurados en esta obra. Agrégalos desde el panel Admin o escribe uno abajo.
              </p>
            </div>
          )}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Agregar correo adicional</div>
            <div className="flex gap-2">
              <input type="email" value={correoExtra} onChange={(e) => setCorreoExtra(e.target.value)}
                placeholder="otro@empresa.cl"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                onKeyDown={(e) => e.key === 'Enter' && agregarCorreoExtra()} />
              <Button onClick={agregarCorreoExtra} size="sm"><Plus className="w-4 h-4" /></Button>
            </div>
            {correosSeleccionados.filter(c => !(obra.correos || []).includes(c)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {correosSeleccionados.filter(c => !(obra.correos || []).includes(c)).map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-white">
                    <span>{c}</span>
                    <button onClick={() => toggleCorreo(c)} className="hover:bg-red-500/20 rounded-full p-0.5">
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent p-5 pt-10">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-2">
          <Button onClick={descargarLocal} variant="secondary" size="md" disabled={enviando}>
            <FileSpreadsheet className="w-4 h-4" /> Descargar
          </Button>
          <Button onClick={enviarPorCorreo} variant="success" size="md" disabled={enviando || correosSeleccionados.length === 0}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {enviando ? 'Enviando...' : `Enviar (${correosSeleccionados.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Tarjeta trabajador
const TrabajadorCard = ({ numero, trabajador, onChange, onChangeHoras, total }) => {
  const [expanded, setExpanded] = useState(false);
  const hayDatos = trabajador.nombre.trim() || total > 0;
  const exceso = total > HORAS_DIA;

  return (
    <div className={`rounded-xl border transition ${hayDatos ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-800/30 border-slate-800'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-3 flex items-center gap-3 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${hayDatos ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>{numero}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{trabajador.nombre || <span className="text-slate-500 italic">Sin nombre</span>}</div>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {trabajador.categoria && <span>{trabajador.categoria}</span>}
            {trabajador.categoria && <span>·</span>}
            <span className={exceso ? 'text-red-400 font-semibold' : ''}>{total} HH</span>
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${expanded ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>{expanded ? 'Cerrar' : 'Abrir'}</div>
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-slate-700/50">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Nombre" value={trabajador.nombre} onChange={(v) => onChange('nombre', v)} className="col-span-2" />
            <Select label="Categoría" value={trabajador.categoria} onChange={(v) => onChange('categoria', v)} options={CATEGORIAS} />
            <Select label="Especialidad" value={trabajador.especialidad} onChange={(v) => onChange('especialidad', v)} options={ESPECIALIDADES} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Horas por actividad (1-7)</div>
            <div className="grid grid-cols-7 gap-1">
              {trabajador.horas.map((h, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="text-[10px] text-slate-500 mb-0.5">{i + 1}</div>
                  <input type="number" value={h} onChange={(e) => onChangeHoras(i, e.target.value)} min="0" step="0.5" placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1.5 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500" />
                </div>
              ))}
            </div>
            <div className={`mt-2 text-xs flex items-center justify-between ${exceso ? 'text-red-400' : 'text-slate-400'}`}>
              <span>Total HH día:</span><span className="font-bold">{total} / {HORAS_DIA}</span>
            </div>
          </div>
          <Input label="Observaciones" value={trabajador.observaciones} onChange={(v) => onChange('observaciones', v)} />
        </div>
      )}
    </div>
  );
};

// Tarjeta actividad
const ActividadCard = ({ numero, actividad, esEspecial, opciones, onChange, hhTotal }) => {
  const [expanded, setExpanded] = useState(false);
  const hayDatos = actividad.idItem || actividad.descripcion;

  if (esEspecial) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">{numero}</div>
          <div className="flex-1">
            <div className="font-semibold text-white text-sm">{actividad.idItem}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {hhTotal} HH acumuladas</div>
          </div>
          <div className="text-xs text-slate-500">Col. {numero} en horas</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border transition ${hayDatos ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-800/30 border-slate-800'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full p-3 flex items-center gap-3 text-left">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${hayDatos ? 'bg-emerald-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>{numero}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{actividad.actividad || actividad.descripcion || <span className="text-slate-500 italic">Sin actividad</span>}</div>
          <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
            {actividad.idItem && <span className="font-mono">{actividad.idItem}</span>}
            {actividad.grupo && <span>· {actividad.grupo}</span>}
            {actividad.cantidad && <span>· {actividad.cantidad} {actividad.unidad}</span>}
            <span>· {hhTotal} HH</span>
          </div>
        </div>
        <div className={`text-xs px-2 py-1 rounded ${expanded ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{expanded ? 'Cerrar' : 'Abrir'}</div>
      </button>
      {expanded && (
        <div className="p-3 pt-0 space-y-3 border-t border-slate-700/50">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">Seleccionar actividad</label>
            <select value={actividad.idItem} onChange={(e) => onChange('idItem', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">Seleccionar...</option>
              {opciones.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="ID Item" value={actividad.idItem} onChange={(v) => onChange('idItem', v)} />
            <Input label="Área" value={actividad.grupo} onChange={(v) => onChange('grupo', v)} />
            <Input label="Sub-Área" value={actividad.subArea} onChange={(v) => onChange('subArea', v)} className="col-span-2" />
          </div>
          <Input label="Descripción del trabajo" value={actividad.descripcion} onChange={(v) => onChange('descripcion', v)} />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Unidad de medida" value={actividad.unidad} onChange={(v) => onChange('unidad', v)} options={UNIDADES} />
            <Input label="Cantidad" type="number" value={actividad.cantidad} onChange={(v) => onChange('cantidad', v)} min="0" step="0.01" />
          </div>
          <Input label="Observaciones" value={actividad.observaciones} onChange={(v) => onChange('observaciones', v)} />
          <div className="bg-slate-900/60 rounded-lg p-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">HH acumuladas</span>
            <span className="text-emerald-400 font-bold">{hhTotal} HH</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================
// LOGIN
// =============================================================
// =============================================================
// CAMBIAR CONTRASEÑA (usuario autenticado)
// =============================================================
const ChangePasswordModal = ({ onClose }) => {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e) => {
    e?.preventDefault();
    setError(''); setOk('');
    if (!actual || !nueva || !confirmar) { setError('Completa todos los campos'); return; }
    if (nueva.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    if (nueva === actual) { setError('La nueva contraseña debe ser distinta'); return; }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, actual);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, nueva);
      setOk('Contraseña actualizada correctamente');
      setActual(''); setNueva(''); setConfirmar('');
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'La contraseña actual es incorrecta'
        : err.code === 'auth/weak-password'
        ? 'Contraseña muy débil (mínimo 6 caracteres)'
        : err.code === 'auth/requires-recent-login'
        ? 'Por seguridad, cierra sesión y vuelve a iniciar para cambiar la contraseña'
        : err.message || 'No se pudo cambiar la contraseña';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/20 p-2 rounded-lg"><KeyRound className="w-5 h-5 text-amber-400" /></div>
              <h2 className="font-bold text-white tracking-tight">Cambiar contraseña</h2>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña actual</label>
              <div className="relative">
                <input type={showActual ? 'text' : 'password'} value={actual} onChange={(e) => setActual(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <button type="button" onClick={() => setShowActual(!showActual)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white">
                  {showActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nueva contraseña</label>
              <div className="relative">
                <input type={showNueva ? 'text' : 'password'} value={nueva} onChange={(e) => setNueva(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <button type="button" onClick={() => setShowNueva(!showNueva)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white">
                  {showNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Input label="Confirmar nueva contraseña" type={showNueva ? 'text' : 'password'} value={confirmar} onChange={setConfirmar} placeholder="Repite la nueva contraseña" />

            {error && <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">{error}</div>}
            {ok && <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-200">{ok}</div>}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>Cancelar</Button>
              <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? 'Guardando...' : 'Actualizar'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin, error: externalError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resetting, setResetting] = useState(false);

  const recuperarPassword = async () => {
    setError(''); setInfo('');
    if (!email.trim()) { setError('Ingresa tu correo para recuperar la contraseña'); return; }
    if (!firebaseOk) { setError('Recuperación requiere conexión en línea'); return; }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setInfo('Te enviamos un correo con el enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.');
    } catch (err) {
      const msg = err.code === 'auth/user-not-found'
        ? 'No existe una cuenta con ese correo'
        : err.code === 'auth/invalid-email'
        ? 'Correo inválido'
        : err.message || 'No se pudo enviar el correo';
      setError(msg);
    } finally {
      setResetting(false);
    }
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!email || !password) { setError('Ingresa correo y contraseña'); return; }
    setLoading(true);
    setError('');
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
        ? 'Correo o contraseña incorrectos'
        : err.code === 'auth/too-many-requests'
        ? 'Demasiados intentos. Espera unos minutos.'
        : err.message || 'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 mb-4 shadow-lg shadow-amber-500/30">
            <HardHat className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">BV Reportes</h1>
          <p className="text-sm text-slate-400 mt-1">Inicia sesión para continuar</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Correo" type="email" value={email} onChange={setEmail} placeholder="usuario@empresa.cl" />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contraseña</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {(error || externalError) && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
                {error || externalError}
              </div>
            )}
            {info && (
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-200">
                {info}
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </Button>
            <button type="button" onClick={recuperarPassword} disabled={resetting}
              className="w-full text-center text-sm text-amber-400 hover:text-amber-300 disabled:opacity-50 py-1">
              {resetting ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
            </button>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-500">
          ¿No tienes cuenta? Pídele a tu administrador que te cree una.
        </p>
      </div>
    </div>
  );
};

// =============================================================
// GESTIÓN DE USUARIOS (solo admin)
// =============================================================
const UsersScreen = ({ obras, onBack, currentUid }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Form state
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPwd, setNuevoPwd] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRole, setNuevoRole] = useState('lider');
  const [nuevoObraId, setNuevoObraId] = useState('');
  const [creando, setCreando] = useState(false);

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  // Cargar usuarios en tiempo real
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q,
      (snap) => {
        setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        mostrarMensaje('error', `Error al cargar: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const resetForm = () => {
    setNuevoEmail(''); setNuevoPwd(''); setNuevoNombre('');
    setNuevoRole('lider'); setNuevoObraId('');
    setShowForm(false);
  };

  const crearUsuario = async () => {
    if (!nuevoEmail || !nuevoPwd) { mostrarMensaje('error', 'Email y contraseña obligatorios'); return; }
    if (nuevoPwd.length < 6) { mostrarMensaje('error', 'Contraseña: mínimo 6 caracteres'); return; }
    if (nuevoRole === 'lider' && !nuevoObraId) { mostrarMensaje('error', 'Asigna una obra al líder'); return; }

    setCreando(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          email: nuevoEmail, password: nuevoPwd, nombre: nuevoNombre,
          role: nuevoRole, obraId: nuevoRole === 'lider' ? nuevoObraId : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');
      mostrarMensaje('ok', `Usuario "${nuevoEmail}" creado`);
      resetForm();
    } catch (err) {
      mostrarMensaje('error', err.message);
    } finally {
      setCreando(false);
    }
  };

  const eliminarUsuario = async (u) => {
    if (u.uid === currentUid) { alert('No puedes eliminar tu propio usuario'); return; }
    if (!confirm(`¿Eliminar al usuario "${u.email}"?`)) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ uid: u.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      mostrarMensaje('ok', `Usuario eliminado`);
    } catch (err) {
      mostrarMensaje('error', err.message);
    }
  };

  const getNombreObra = (obraId) => obras.find(o => o.id === obraId)?.nombre || '—';

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white tracking-tight">Usuarios</h1>
          <p className="text-xs text-slate-400">Gestión de cuentas y permisos</p>
        </div>
      </div>

      {mensaje && (
        <div className={`rounded-xl p-3 text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
          {mensaje.texto}
        </div>
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)} variant="primary" size="md" className="w-full">
          <UserPlus className="w-5 h-5" /> Crear nuevo usuario
        </Button>
      )}

      {showForm && (
        <Card>
          <SectionHeader icon={UserPlus} title="Nuevo usuario" />
          <div className="space-y-3">
            <Input label="Nombre" value={nuevoNombre} onChange={setNuevoNombre} placeholder="Nombre completo" />
            <Input label="Correo" type="email" value={nuevoEmail} onChange={setNuevoEmail} placeholder="usuario@empresa.cl" />
            <Input label="Contraseña inicial" type="text" value={nuevoPwd} onChange={setNuevoPwd} placeholder="Mínimo 6 caracteres" />
            <Select label="Rol" value={nuevoRole} onChange={setNuevoRole}
              options={[
                { value: 'lider', label: 'Líder de cuadrilla (acceso solo a su obra)' },
                { value: 'admin', label: 'Administrador (acceso total)' },
              ]} placeholder={null} />
            {nuevoRole === 'lider' && (
              <Select label="Obra asignada" value={nuevoObraId} onChange={setNuevoObraId}
                options={obras.map(o => ({ value: o.id, label: o.nombre }))}
                placeholder="Seleccionar obra..." />
            )}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button onClick={resetForm} variant="ghost" size="md" disabled={creando}>Cancelar</Button>
              <Button onClick={crearUsuario} variant="primary" size="md" disabled={creando}>
                {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <SectionHeader icon={Users} title="Usuarios registrados" subtitle={`${usuarios.length} cuenta(s)`} />
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" /></div>
        ) : usuarios.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-4">Sin usuarios registrados.</p>
        ) : (
          <div className="space-y-2">
            {usuarios.map(u => (
              <div key={u.uid} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                  {u.role === 'admin' ? <Shield className="w-5 h-5 text-amber-400" /> : <User className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{u.nombre || u.email}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {u.email} · {u.role === 'admin' ? 'Admin' : `Líder · ${getNombreObra(u.obraId)}`}
                  </div>
                </div>
                {u.uid === currentUid ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-1 rounded">Tú</span>
                ) : (
                  <button onClick={() => eliminarUsuario(u)} className="p-2 hover:bg-red-500/20 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

// =============================================================
// APP PRINCIPAL (con Firebase + Auth + Roles)
// =============================================================
export default function App() {
  // Auth state
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'logged-out' | 'logged-in'
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // { role, obraId, nombre, email }
  const [authError, setAuthError] = useState('');

  // App state
  const [obras, setObras] = useState([]);
  const [obraActual, setObraActual] = useState(null);
  const [pantalla, setPantalla] = useState('home');
  const [cloudStatus, setCloudStatus] = useState('loading');
  const [showChangePwd, setShowChangePwd] = useState(false);

  // -------- Auth lifecycle --------
  useEffect(() => {
    if (!firebaseOk) {
      // Sin Firebase: modo offline solo (sin auth)
      setAuthState('logged-in');
      setUserProfile({ role: 'admin', email: 'local@local', nombre: 'Modo local' });
      setCloudStatus('local');
      try {
        const saved = localStorage.getItem('bv_obras');
        if (saved) setObras(JSON.parse(saved));
      } catch (e) {}
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setUserProfile(null);
        setAuthState('logged-out');
        setObras([]);
        setObraActual(null);
        return;
      }
      setCurrentUser(user);
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (!docSnap.exists()) {
          await signOut(auth);
          setAuthError('Tu cuenta no tiene perfil. Pídele a un administrador que te configure.');
          return;
        }
        const profile = docSnap.data();
        setUserProfile({ uid: user.uid, ...profile });
        setAuthState('logged-in');
        // Líder va directo a su pantalla
        if (profile.role === 'lider') setPantalla('leader');
      } catch (err) {
        console.error('Error cargando perfil:', err);
        setAuthError('Error al cargar tu perfil');
      }
    });
    return () => unsub();
  }, []);

  // -------- Cargar obras según rol --------
  useEffect(() => {
    if (authState !== 'logged-in' || !firebaseOk || !userProfile) return;

    let q;
    if (userProfile.role === 'lider') {
      // El líder solo ve su obra
      if (!userProfile.obraId) { setObras([]); setCloudStatus('ok'); return; }
      q = query(collection(db, 'obras'), where('__name__', '==', userProfile.obraId));
    } else {
      // Admin ve todas
      q = query(collection(db, 'obras'), orderBy('nombre'));
    }

    const unsub = onSnapshot(q,
      (snap) => {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setObras(lista);
        setCloudStatus('ok');
        if (userProfile.role === 'lider' && lista.length > 0) {
          setObraActual(lista[0]);
        } else {
          setObraActual(prev => prev ? lista.find(o => o.id === prev.id) || null : null);
        }
      },
      (err) => {
        console.error('Firestore error:', err);
        setCloudStatus('local');
      }
    );
    return () => unsub();
  }, [authState, userProfile]);

  // Fallback localStorage (solo modo local)
  useEffect(() => {
    if (cloudStatus === 'local' && !firebaseOk) {
      try { localStorage.setItem('bv_obras', JSON.stringify(obras)); } catch (e) {}
    }
  }, [obras, cloudStatus]);

  // -------- Acciones --------
  const handleLogin = async (email, password) => {
    setAuthError('');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    if (firebaseOk) await signOut(auth);
    setPantalla('home');
  };

  const guardarObra = async (obra) => {
    if (firebaseOk && cloudStatus === 'ok') {
      const { id, ...data } = obra;
      await setDoc(doc(db, 'obras', id), data);
    } else {
      setObras(prev => {
        const idx = prev.findIndex(o => o.id === obra.id);
        if (idx >= 0) { const next = [...prev]; next[idx] = obra; return next; }
        return [...prev, obra];
      });
    }
  };

  const eliminarObraCloud = async (id) => {
    if (firebaseOk && cloudStatus === 'ok') {
      await deleteDoc(doc(db, 'obras', id));
    } else {
      setObras(prev => prev.filter(o => o.id !== id));
    }
  };

  // -------- Render --------
  // Loading
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  // Login
  if (authState === 'logged-out') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-3xl"></div>
        </div>
        <div className="relative">
          <LoginScreen onLogin={handleLogin} error={authError} />
        </div>
      </div>
    );
  }

  // App principal
  const isAdmin = userProfile?.role === 'admin';
  const isLider = userProfile?.role === 'lider';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Barra superior con usuario y logout (siempre visible salvo en login) */}
      <div className="relative max-w-xl mx-auto">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1.5">
            {isAdmin ? <Shield className="w-3.5 h-3.5 text-amber-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="text-xs font-medium text-white truncate max-w-[200px]">
              {userProfile?.nombre || userProfile?.email}
            </span>
            <span className="text-[10px] text-slate-500">·</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{userProfile?.role}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowChangePwd(true)} title="Cambiar contraseña"
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full">
              <KeyRound className="w-4 h-4 text-slate-300" />
            </button>
            <button onClick={handleLogout} title="Cerrar sesión"
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full">
              <LogOut className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

        {/* Líder: va directo a la pantalla del reporte */}
        {isLider && obraActual && (
          <LeaderScreen obra={obraActual} onBack={() => {}} hideBack />
        )}
        {isLider && !obraActual && (
          <div className="p-5">
            <Card>
              <div className="text-center py-6">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-sm text-white font-semibold">No tienes obra asignada</p>
                <p className="text-xs text-slate-400 mt-1">Contacta al administrador para que te asigne una obra.</p>
              </div>
            </Card>
          </div>
        )}

        {/* Admin: navegación completa */}
        {isAdmin && pantalla === 'home' && (
          <HomeScreen obras={obras} obraActual={obraActual} setObraActual={setObraActual}
            onGoAdmin={() => setPantalla('admin')} onGoLeader={() => setPantalla('leader')}
            onGoUsers={() => setPantalla('users')} cloudStatus={cloudStatus} isAdmin />
        )}
        {isAdmin && pantalla === 'admin' && (
          <AdminScreen obras={obras} obraActual={obraActual} setObraActual={setObraActual}
            onBack={() => setPantalla('home')} guardarObra={guardarObra} eliminarObraCloud={eliminarObraCloud} />
        )}
        {isAdmin && pantalla === 'leader' && obraActual && (
          <LeaderScreen obra={obraActual} onBack={() => setPantalla('home')} />
        )}
        {isAdmin && pantalla === 'users' && (
          <UsersScreen obras={obras} onBack={() => setPantalla('home')} currentUid={userProfile?.uid} />
        )}
      </div>
    </div>
  );
}
