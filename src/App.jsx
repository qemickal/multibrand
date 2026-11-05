import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { sb } from './supabase.js'
import { LOCAL_KEY, readLocalData, writeLocalData } from './lib/local-data.js'
import { fetchAll } from './lib/supabase-data.js'
import Shell from './components/Shell.jsx'
import Dashboard from './components/Dashboard.jsx'
import Checklist from './components/Checklist.jsx'
import Brands from './components/Brands.jsx'
import Risks from './components/Risks.jsx'
import Login from './components/Login.jsx'
import { BrandEditor, RiskEditor, TaskEditor } from './components/Editors.jsx'
import { AppLogo } from './components/common.jsx'

const EMPTY_TASK_FILTERS = { search: '', brand: '', status: '', priority: '', attention: '' }
const EMPTY_RISK_FILTERS = { search: '', status: '' }

function Loading({ error, onRetry }) {
  return <div className="loading-page"><AppLogo />{error ? <div className="loading-box"><span><AlertCircle size={22} /></span><h1>No pudimos cargar tu espacio</h1><p>{error}</p><button type="button" className="primary-button" onClick={onRetry}><RefreshCw size={16} /> Intentar de nuevo</button></div> : <div className="loading-box"><span className="loading-spinner" /><h1>Preparando tu espacio...</h1><p>Un momento, estamos reuniendo todo.</p></div>}</div>
}

export default function App() {
  const [authReady, setAuthReady] = useState(!sb)
  const [session, setSession] = useState(null)
  const [sessionError, setSessionError] = useState('')
  const [local, setLocal] = useState(!sb)
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)
  const [page, setPage] = useState('panel')
  const [taskFilters, setTaskFilters] = useState(EMPTY_TASK_FILTERS)
  const [riskFilters, setRiskFilters] = useState(EMPTY_RISK_FILTERS)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toast, setToast] = useState(null)
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    if (!sb) return undefined
    let active = true
    sb.auth.getSession().then(({ data: result, error }) => {
      if (!active) return
      if (error) setSessionError('No pudimos recuperar tu sesión. Intenta iniciar sesión de nuevo.')
      setSession(result?.session || null)
      setAuthReady(true)
    }).catch(() => {
      if (!active) return
      setSessionError('No pudimos recuperar tu sesión. Revisa tu conexión.')
      setAuthReady(true)
    })
    const { data: listener } = sb.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setSessionError('')
      setAuthReady(true)
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    if (!local && !session) { setData(null); return undefined }
    let active = true
    setData(null)
    setLoadError('')
    if (local) {
      try { setData(readLocalData()) } catch (error) { setLoadError(error.message || 'No pudimos acceder al almacenamiento local.') }
    } else {
      Promise.all([fetchAll(sb, 'marcas'), fetchAll(sb, 'tareas'), fetchAll(sb, 'riesgos')])
        .then(([marcas, tareas, riesgos]) => { if (active) setData({ marcas, tareas, riesgos }) })
        .catch(() => { if (active) setLoadError('Revisa tu conexión y la configuración de Supabase. Tus datos no se han modificado.') })
    }
    return () => { active = false }
  }, [local, session, loadVersion])

  useEffect(() => {
    if (!local) return undefined
    const handleStorage = event => {
      if (event.key !== LOCAL_KEY) return
      try { setData(readLocalData()) } catch (error) { setLoadError(error.message) }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [local])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const navigate = useCallback((nextPage, filters = {}) => {
    if (nextPage === 'checklist') setTaskFilters({ ...EMPTY_TASK_FILTERS, ...filters })
    if (nextPage === 'riesgos') setRiskFilters({ ...EMPTY_RISK_FILTERS, ...filters })
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openModal = (type, item = null) => { setSaveError(''); setModal({ type, item }) }
  const closeModal = () => { if (!saving) { setModal(null); setSaveError('') } }

  const save = async (table, record, isNew) => {
    setSaving(true)
    setSaveError('')
    try {
      if (local) {
        const collection = isNew ? [...data[table], record] : data[table].map(item => item.id === record.id ? record : item)
        const next = { ...data, [table]: collection }
        writeLocalData(next)
        setData(next)
      } else {
        const query = isNew ? sb.from(table).insert(record) : sb.from(table).update(record).eq('id', record.id)
        const { data: saved, error } = await query.select().single()
        if (error) throw error
        setData(current => ({ ...current, [table]: isNew ? [...current[table], saved] : current[table].map(item => item.id === saved.id ? saved : item) }))
      }
      setModal(null)
      setToast({ kind: 'success', message: isNew ? 'Agregado correctamente.' : 'Cambios guardados correctamente.' })
    } catch {
      setSaveError(local ? 'No se pudieron guardar los cambios en este navegador. Revisa el almacenamiento disponible e inténtalo de nuevo.' : 'No se pudieron guardar los cambios. Revisa tu conexión y permisos e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const exit = async () => {
    if (local) { setLocal(false); setPage('panel'); return }
    try {
      const { error } = await sb.auth.signOut()
      if (error) throw error
      setPage('panel')
    } catch {
      setToast({ kind: 'error', message: 'No se pudo cerrar la sesión. Inténtalo de nuevo.' })
    }
  }

  if (!authReady) return <Loading />
  if (!local && !session) return <Login supabase={sb} onDemo={() => setLocal(true)} sessionError={sessionError} />
  if (!data || loadError) return <Loading error={loadError} onRetry={() => setLoadVersion(version => version + 1)} />

  return <Shell page={page} onNavigate={navigate} local={local} email={session?.user?.email} canExit={Boolean(sb)} onExit={exit} online={online}>
    {page === 'panel' && <Dashboard data={data} local={local} online={online} onNavigate={navigate} onOpenTask={task => openModal('task', task)} onNewTask={() => openModal('task')} />}
    {page === 'checklist' && <Checklist data={data} local={local} online={online} filters={taskFilters} onFiltersChange={setTaskFilters} onOpenTask={task => openModal('task', task)} onNewTask={() => openModal('task')} />}
    {page === 'marcas' && <Brands data={data} local={local} online={online} onNavigate={navigate} onEditBrand={brand => openModal('brand', brand)} />}
    {page === 'riesgos' && <Risks data={data} local={local} online={online} filters={riskFilters} onFiltersChange={setRiskFilters} onOpenRisk={risk => openModal('risk', risk)} onNewRisk={() => openModal('risk')} />}
    {modal?.type === 'task' && <TaskEditor key={`task-${modal.item?.id || 'new'}`} task={modal.item} brands={data.marcas} saving={saving} error={saveError} onClose={closeModal} onSave={(record, isNew) => save('tareas', record, isNew)} />}
    {modal?.type === 'risk' && <RiskEditor key={`risk-${modal.item?.id || 'new'}`} risk={modal.item} saving={saving} error={saveError} onClose={closeModal} onSave={(record, isNew) => save('riesgos', record, isNew)} />}
    {modal?.type === 'brand' && <BrandEditor key={`brand-${modal.item.id}`} brand={modal.item} saving={saving} error={saveError} onClose={closeModal} onSave={(record, isNew) => save('marcas', record, isNew)} />}
    {toast && <div className={`toast ${toast.kind === 'error' ? 'toast-error' : ''}`} role={toast.kind === 'error' ? 'alert' : 'status'}>{toast.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}{toast.message}</div>}
  </Shell>
}
