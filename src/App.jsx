import {useEffect,useMemo,useState} from 'react'
import {sb} from './supabase'
const EST=['Pendiente','En curso','En revisión','Bloqueado','Hecho','No aplica']
const REST=['Abierto','Mitigado','Cerrado']
const hoy=new Date().toISOString().slice(0,10)
const pct=(a,b)=>b?Math.round(100*a/b):0
const cerrada=i=>['Hecho','No aplica'].includes(i.estado)
function Login(){
  const [e,setE]=useState(''),[p,setP]=useState(''),[err,setErr]=useState('')
  const go=async ev=>{ev.preventDefault();const{error}=await sb.auth.signInWithPassword({email:e,password:p});if(error)setErr('No se pudo entrar: '+error.message)}
  return <form className="login" onSubmit={go}><h1>Mono Cromat<br/>Preapertura</h1>
    <input type="email" placeholder="Correo" value={e} onChange={x=>setE(x.target.value)} required/>
    <input type="password" placeholder="Contraseña" value={p} onChange={x=>setP(x.target.value)} required/>
    <button className="go">Entrar</button>{err&&<small>{err}</small>}</form>
}
export default function App(){
  const [s,setS]=useState(undefined),[tab,setTab]=useState('Panel'),[m,setM]=useState([]),[t,setT]=useState([]),[r,setR]=useState([])
  const [fm,setFm]=useState(''),[fe,setFe]=useState(''),[q,setQ]=useState('')
  useEffect(()=>{sb.auth.getSession().then(({data})=>setS(data.session));const{data}=sb.auth.onAuthStateChange((_,x)=>setS(x));return()=>data.subscription.unsubscribe()},[])
  useEffect(()=>{if(!s)return;const g=n=>sb.from(n).select('*').order('id');Promise.all([g('marcas'),g('tareas'),g('riesgos')]).then(([a,b,c])=>{setM(a.data||[]);setT(b.data||[]);setR(c.data||[])})},[s])
  const up=(tb,set)=>(id,p)=>{set(x=>x.map(i=>i.id===id?{...i,...p}:i));sb.from(tb).update(p).eq('id',id).then(()=>{})}
  const ut=up('tareas',setT),ur=up('riesgos',setR)
  const st=useMemo(()=>m.map(b=>{const x=t.filter(i=>i.marca===b.nombre),h=x.filter(i=>i.estado==='Hecho')
    return{...b,n:x.length,h:h.length,p:pct(h.length,x.length),bl:x.filter(i=>i.estado==='Bloqueado').length,
      ve:x.filter(i=>i.fecha&&i.fecha<hoy&&!cerrada(i)).length,se:h.filter(i=>!i.evidencia).length}}),[m,t])
  const luz=b=>b.bl||b.se||b.ve?'rojo':b.p===100?'verde':'ambar'
  if(s===undefined)return null
  if(!s)return <Login/>
  const lista=t.filter(i=>(!fm||i.marca===fm)&&(!fe||i.estado===fe)&&(!q||(i.tarea+i.frente).toLowerCase().includes(q.toLowerCase())))
  const K=[['Tareas',t.length],['Hechas',t.filter(i=>i.estado==='Hecho').length],['Bloqueadas',t.filter(i=>i.estado==='Bloqueado').length],['Riesgos abiertos',r.filter(i=>i.estado==='Abierto').length]]
  return <><header><strong>Mono Cromat</strong>
    {['Panel','Checklist','Riesgos'].map(x=><button key={x} className={tab===x?'on':''} onClick={()=>setTab(x)}>{x}</button>)}
    <button onClick={()=>sb.auth.signOut()}>Salir</button></header>
  <main>
  {tab==='Panel'&&<><div className="kpis">{K.map(([k,v])=><div key={k}><b>{v}</b>{k}</div>)}</div>
    {st.map(b=><div className="card" key={b.id}><div className="row"><i className={'dot '+luz(b)}/><h3>{b.nombre}</h3><span>{b.h} de {b.n} ({b.p}%)</span></div>
      <div className="bar"><u style={{width:b.p+'%'}}/></div>
      <small>{b.bl} bloqueadas, {b.ve} vencidas, {b.se} "Hecho" sin evidencia</small></div>)}
    <p className="nota">Checklist completo no equivale a autorización de apertura. Antes del Go / No-Go revisa prototipos físicos, números reales, permisos y capacidad.</p></>}
  {tab==='Checklist'&&<><div className="filtros">
    <select value={fm} onChange={e=>setFm(e.target.value)}><option value="">Todas las marcas</option>{m.map(b=><option key={b.id}>{b.nombre}</option>)}</select>
    <select value={fe} onChange={e=>setFe(e.target.value)}><option value="">Todos los estados</option>{EST.map(x=><option key={x}>{x}</option>)}</select>
    <input placeholder="Buscar tarea" value={q} onChange={e=>setQ(e.target.value)}/></div>
    {lista.map(i=><div className="card" key={i.id}><div className="meta"><span>{i.id}</span><span>{i.marca}</span><span>{i.frente}</span></div>
      <h3>{i.tarea}</h3><p>{i.criterio}</p>
      <div className="grid"><select value={i.estado} onChange={e=>ut(i.id,{estado:e.target.value})}>{EST.map(x=><option key={x}>{x}</option>)}</select>
      <input defaultValue={i.responsable} placeholder="Responsable" onBlur={e=>ut(i.id,{responsable:e.target.value})}/>
      <input type="date" defaultValue={i.fecha||''} onChange={e=>ut(i.id,{fecha:e.target.value||null})}/>
      <input defaultValue={i.evidencia} placeholder="Evidencia o enlace" onBlur={e=>ut(i.id,{evidencia:e.target.value})}/></div></div>)}
    {!lista.length&&<p>No hay tareas con esos filtros.</p>}</>}
  {tab==='Riesgos'&&r.map(i=><div className="card" key={i.id}><div className="meta"><span>{i.id}</span><span>{i.area}</span></div>
    <h3>{i.riesgo}</h3><p>{i.mitigacion}</p>
    <div className="grid"><span className="tag">Probabilidad {i.probabilidad}</span><span className="tag">Impacto {i.impacto}</span>
    <select value={i.estado} onChange={e=>ur(i.id,{estado:e.target.value})}>{REST.map(x=><option key={x}>{x}</option>)}</select>
    <input defaultValue={i.responsable} placeholder="Responsable" onBlur={e=>ur(i.id,{responsable:e.target.value})}/></div></div>)}
  </main></>
}
