import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'

// ── UTILS ─────────────────────────────────────────────────────────────────────
const MF=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MS=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const mk=(y,m)=>`${y}-${String(m).padStart(2,'0')}`
const pm=k=>{const[y,m]=k.split('-').map(Number);return{y,m}}
const am=(k,n)=>{const{y,m}=pm(k);const d=new Date(y,m-1+n);return mk(d.getFullYear(),d.getMonth()+1)}
const ml=k=>{const{y,m}=pm(k);return`${MF[m-1]} ${y}`}
const msh=k=>{const{y,m}=pm(k);return`${MS[m-1]}/${String(y).slice(2)}`}
const uid=()=>Math.random().toString(36).slice(2,9)
const COLOR_PRESETS=['#1a6fd4','#22c55e','#f59e0b','#f87171','#a78bfa','#60a5fa','#fb923c','#e879f9','#2dd4bf','#facc15','#94a3b8','#f472b6']

// ── THEME ─────────────────────────────────────────────────────────────────────
const getT=dark=>dark?{
  bgGrad:'linear-gradient(155deg,#0d1117 0%,#111827 50%,#0f172a 100%)',
  blob1:'rgba(37,99,235,0.18)',blob2:'rgba(16,185,129,0.12)',blob3:'rgba(124,58,237,0.10)',
  card:'rgba(255,255,255,0.06)',cardB:'rgba(255,255,255,0.10)',
  cardS:'rgba(255,255,255,0.10)',cardSB:'rgba(255,255,255,0.16)',
  sidebarBg:'rgba(255,255,255,0.04)',sidebarBorder:'rgba(255,255,255,0.08)',
  topbarBg:'rgba(0,0,0,0.3)',topbarBorder:'rgba(255,255,255,0.08)',
  navBg:'rgba(0,0,0,0.5)',navBorder:'rgba(255,255,255,0.07)',
  inp:'rgba(0,0,0,0.3)',inpB:'rgba(255,255,255,0.12)',
  prog:'rgba(255,255,255,0.07)',divider:'rgba(255,255,255,0.08)',
  text:'#f1f5f9',textSub:'#94a3b8',textMuted:'#475569',
  accent:'#60a5fa',green:'#4ade80',red:'#f87171',yellow:'#fbbf24',
  tabActive:'rgba(255,255,255,0.15)',tabActiveBorder:'rgba(255,255,255,0.25)',tabActiveTxt:'#fff',
  ring:'rgba(255,255,255,0.85)',shadow:'0 4px 24px rgba(0,0,0,0.3)',
  checkDone:'#4ade80',stripeBg:'rgba(255,255,255,0.03)',
}:{
  bgGrad:'linear-gradient(135deg,#c8dff5 0%,#b0ccec 50%,#a8c8ee 100%)',
  blob1:'rgba(255,255,255,0.52)',blob2:'rgba(180,220,255,0.45)',blob3:'rgba(255,255,255,0.35)',
  card:'rgba(255,255,255,0.65)',cardB:'rgba(255,255,255,0.88)',
  cardS:'rgba(255,255,255,0.72)',cardSB:'rgba(255,255,255,0.92)',
  sidebarBg:'rgba(255,255,255,0.35)',sidebarBorder:'rgba(255,255,255,0.55)',
  topbarBg:'rgba(255,255,255,0.45)',topbarBorder:'rgba(255,255,255,0.6)',
  navBg:'rgba(255,255,255,0.72)',navBorder:'rgba(255,255,255,0.9)',
  inp:'rgba(255,255,255,0.55)',inpB:'rgba(255,255,255,0.85)',
  prog:'rgba(0,0,0,0.07)',divider:'rgba(0,0,0,0.06)',
  text:'#1e293b',textSub:'#64748b',textMuted:'#94a3b8',
  accent:'#1a6fd4',green:'#16a34a',red:'#ef4444',yellow:'#f59e0b',
  tabActive:'rgba(255,255,255,0.75)',tabActiveBorder:'rgba(255,255,255,0.95)',tabActiveTxt:'#1a6fd4',
  ring:'#1a6fd4',shadow:'0 4px 24px rgba(0,0,0,0.08)',
  checkDone:'#22c55e',stripeBg:'rgba(255,255,255,0.4)',
}

// ── STYLE HELPERS ─────────────────────────────────────────────────────────────
const gls=(T,r=16)=>({background:T.card,border:`1px solid ${T.cardB}`,backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderRadius:r,boxShadow:T.shadow})
const glsS=(T,r=16)=>({background:T.cardS,border:`1px solid ${T.cardSB}`,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderRadius:r,boxShadow:T.shadow})
const INP=T=>({background:T.inp,border:`1px solid ${T.inpB}`,borderRadius:10,padding:'10px 12px',color:T.text,fontSize:13,outline:'none',width:'100%',fontFamily:"'Sora',sans-serif",boxSizing:'border-box'})
const LBL={display:'block',fontSize:10,color:'#4b5e70',marginBottom:5,fontWeight:600,letterSpacing:0.5,textTransform:'uppercase'}

// ── DEFAULT DATA ──────────────────────────────────────────────────────────────
const DEFAULT_CATS=[
  {id:'fixos',nome:'Gastos Fixos',cor:'#a78bfa',icone:'💰',subcats:[]},
  {id:'cartao',nome:'Cartão de Crédito',cor:'#f59e0b',icone:'💳',subcats:[]},
  {id:'parcelado',nome:'Compras Parceladas',cor:'#34d399',icone:'📦',subcats:[]},
  {id:'alimentacao',nome:'Alimentação',cor:'#22c55e',icone:'🛒',subcats:['Supermercado','Delivery','Restaurante','Lanche']},
]

function buildState(){
  return{
    categorias:DEFAULT_CATS,meses:{},parcelas:[],
    recorrentes:[],orcamentos:{fixos:0,cartao:0,parcelado:0,alimentacao:0},
  }
}
function migrateState(s){
  if(!s.categorias)s={...s,categorias:DEFAULT_CATS}
  s={...s,categorias:s.categorias.map(c=>({subcats:[],...c}))}
  return s
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function ChartTip({active,payload,label}){
  if(!active||!payload?.length)return null
  return(<div style={{background:'rgba(15,23,42,0.92)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,padding:'10px 14px',fontSize:11}}>
    <p style={{margin:'0 0 5px',color:'#94a3b8',fontWeight:600}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{margin:'2px 0',color:p.fill||p.color||'#e2e8f0'}}>{p.name}: {fmt(p.value)}</p>)}
  </div>)
}

function BtnOk({onClick,color,label='✓'}){
  return <button onClick={onClick} style={{background:color,border:'none',borderRadius:10,padding:'10px 16px',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:"'Sora',sans-serif"}}>{label}</button>
}
function BtnX({onClick}){
  return <button onClick={onClick} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'10px 13px',color:'#94a3b8',cursor:'pointer',fontSize:14,fontFamily:"'Sora',sans-serif"}}>✕</button>
}

function Sec({T,title,children,style={}}){
  return(<div style={{...gls(T,18),padding:16,marginBottom:12,...style}}>
    <h3 style={{margin:'0 0 13px',fontSize:10,fontWeight:700,color:T.textMuted,textTransform:'uppercase',letterSpacing:1.2}}>{title}</h3>
    {children}
  </div>)
}

function Leg({color,label}){
  return(<div style={{display:'flex',alignItems:'center',gap:5}}>
    <div style={{width:8,height:8,borderRadius:3,background:color,flexShrink:0}}/>
    <span style={{fontSize:10,color:'#64748b'}}>{label}</span>
  </div>)
}

function DonutSVG({slices,total,T}){
  const size=140,r=50,circ=2*Math.PI*r;let offset=0
  return(<div style={{display:'flex',alignItems:'center',gap:16}}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.prog} strokeWidth={20}/>
      {slices.map(s=>{const dash=(s.val/total)*circ,gap=circ-dash;const el=<circle key={s.id} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.cor} strokeWidth={18} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size/2} ${size/2})`}/>;offset+=dash;return el})}
      <text x={size/2} y={size/2-5} textAnchor="middle" fill={T.textMuted} fontSize="8" fontFamily="Sora,sans-serif">TOTAL</text>
      <text x={size/2} y={size/2+12} textAnchor="middle" fill={T.text} fontSize="12" fontFamily="Sora,sans-serif" fontWeight="700">{fmt(total)}</text>
    </svg>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:9}}>
      {slices.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:s.cor,flexShrink:0}}/>
        <span style={{flex:1,fontSize:11,color:T.textSub}}>{s.nome}</span>
        <span style={{fontSize:11,fontWeight:600,color:s.cor}}>{fmt(s.val)}</span>
        <span style={{fontSize:9,color:T.textMuted}}>{((s.val/total)*100).toFixed(0)}%</span>
      </div>)}
    </div>
  </div>)
}

// ── SIDEBAR (desktop only) ────────────────────────────────────────────────────
function Sidebar({T,state,month,setMonth,CATS,curMes,totalRenda,totalGastos}){
  const totalPago=CATS.flatMap(c=>curMes[c.id]||[]).filter(i=>i.pago).reduce((s,i)=>s+i.valor,0)
  const pctPago=totalGastos>0?(totalPago/totalGastos)*100:0
  const saldo=totalRenda-totalGastos
  return(<div style={{background:T.sidebarBg,borderRight:`1px solid ${T.sidebarBorder}`,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',padding:'20px 14px',display:'flex',flexDirection:'column',gap:0,overflowY:'auto'}}>
    {/* Month nav */}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
      <span style={{fontSize:16,fontWeight:700,color:T.text,letterSpacing:-0.4}}>{ml(month)}</span>
      <div style={{display:'flex',gap:4}}>
        {['‹','›'].map((l,i)=><button key={l} onClick={()=>setMonth(am(month,i===0?-1:1))} style={{width:26,height:26,borderRadius:8,background:T.card,border:`1px solid ${T.cardB}`,color:T.textSub,cursor:'pointer',fontSize:13,fontWeight:500,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}>{l}</button>)}
      </div>
    </div>
    <p style={{fontSize:10,color:T.textMuted,marginBottom:18}}>{CATS.length} categorias · {pctPago.toFixed(0)}% pago</p>

    {/* Progress ring */}
    <div style={{...gls(T,14),display:'flex',alignItems:'center',gap:11,padding:'13px',marginBottom:18}}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx={26} cy={26} r={20} fill="none" stroke={T.prog} strokeWidth={6}/>
        <circle cx={26} cy={26} r={20} fill="none" stroke={T.ring} strokeWidth={6} strokeDasharray={`${pctPago*1.257} 125.7`} strokeLinecap="round" transform="rotate(-90 26 26)"/>
        <text x={26} y={30} textAnchor="middle" fill={T.accent} fontSize="9" fontWeight="700" fontFamily="Sora,sans-serif">{pctPago.toFixed(0)}%</text>
      </svg>
      <div>
        <div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>Pagamentos</div>
        <div style={{fontSize:17,fontWeight:600,color:T.text}}>{fmt(totalPago)}</div>
        <div style={{fontSize:10,color:T.textMuted,marginTop:1}}>de {fmt(totalGastos)} total</div>
      </div>
    </div>

    {/* Categories */}
    <p style={{fontSize:9,color:T.textMuted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:7,padding:'0 4px'}}>Categorias</p>
    {CATS.map(cat=>{
      const items=curMes[cat.id]||[]
      const sub=items.reduce((s,i)=>s+i.valor,0)
      const orc=state.orcamentos[cat.id]||0
      const pct2=orc>0?(sub/orc)*100:0
      return(<div key={cat.id} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',borderRadius:12,marginBottom:3,background:'transparent'}}>
        <span style={{fontSize:15}}>{cat.icone}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:600,color:T.text}}>{cat.nome}</div>
          <div style={{fontSize:9,color:T.textMuted,marginTop:1}}>{items.filter(i=>i.pago).length}/{items.length} pagos</div>
          {orc>0&&<div style={{height:3,background:T.prog,borderRadius:99,overflow:'hidden',marginTop:4,width:50}}><div style={{height:'100%',width:`${Math.min(pct2,100)}%`,background:cat.cor,borderRadius:99}}/></div>}
        </div>
        <div style={{textAlign:'right',fontSize:11,fontWeight:700,color:T.text}}>{fmt(sub)}</div>
      </div>)
    })}

    {/* Footer */}
    <div style={{marginTop:'auto',paddingTop:14,borderTop:`1px solid ${T.divider}`}}>
      <div style={{display:'flex',justifyContent:'space-between',padding:'3px 4px'}}><span style={{fontSize:11,color:T.textMuted}}>Renda</span><span style={{fontSize:12,fontWeight:600,color:T.green}}>{fmt(totalRenda)}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',padding:'3px 4px'}}><span style={{fontSize:11,color:T.textMuted}}>Gastos</span><span style={{fontSize:12,fontWeight:600,color:T.text}}>{fmt(totalGastos)}</span></div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'8px 4px 0'}}>
        <span style={{fontSize:12,color:T.textSub}}>Saldo</span>
        <span style={{fontSize:21,fontWeight:700,color:saldo>=0?T.green:T.red}}>{fmt(Math.abs(saldo))}</span>
      </div>
    </div>
  </div>)
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function FinancasApp({session}){
  const[state,setState]=useState(null)
  const[month,setMonth]=useState(mk(new Date().getFullYear(),new Date().getMonth()+1))
  const[view,setView]=useState('mes')
  const[loading,setLoading]=useState(true)
  const[seeding,setSeeding]=useState(false)
  const[syncStatus,setSyncStatus]=useState('saved')
  const[dark,setDark]=useState(()=>window.matchMedia?.('(prefers-color-scheme: dark)').matches??false)
  const[isMobile,setIsMobile]=useState(()=>window.innerWidth<=768)
  const saveTimerRef=useRef(null)
  const T=getT(dark)

  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<=768)
    window.addEventListener('resize',onResize)
    return()=>window.removeEventListener('resize',onResize)
  },[])

  useEffect(()=>{
    ;(async()=>{
      try{
        const{data,error}=await supabase.from('user_data').select('data').eq('user_id',session.user.id).single()
        if(error&&error.code!=='PGRST116')throw error
        setState(data?.data?migrateState(data.data):buildState())
      }catch{setState(buildState())}
      setLoading(false)
    })()
  },[session])

  const save=useCallback(async next=>{
    setState(next)
    setSyncStatus('saving')
    if(saveTimerRef.current)clearTimeout(saveTimerRef.current)
    saveTimerRef.current=setTimeout(async()=>{
      try{
        const{error}=await supabase.from('user_data').upsert({user_id:session.user.id,data:next,updated_at:new Date().toISOString()},{onConflict:'user_id'})
        if(error)throw error
        setSyncStatus('saved')
      }catch{setSyncStatus('error')}
    },1500)
  },[session])

  useEffect(()=>{
    if(!state||seeding)return
    const mes=state.meses[month]||{}
    if(mes._seeded)return
    setSeeding(true)
    const CATS=state.categorias||DEFAULT_CATS
    const recs=(state.recorrentes||[]).filter(r=>r.ativo)
    const newMes={rendas:[],...mes,_seeded:true}
    CATS.forEach(c=>{if(!newMes[c.id])newMes[c.id]=[]})
    recs.forEach(r=>{if(!(newMes[r.catId]||[]).some(i=>i.recorrenteId===r.id))newMes[r.catId]=[...(newMes[r.catId]||[]),{id:uid(),nome:r.nome,valor:r.valor,pago:false,nota:'',subcat:null,recorrenteId:r.id}]})
    save({...state,meses:{...state.meses,[month]:newMes}}).then(()=>setSeeding(false))
  },[month,state,save,seeding])

  const logout=()=>supabase.auth.signOut()

  if(loading||!state)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0d1117',color:'#60a5fa',fontFamily:'Sora,sans-serif',gap:12,flexDirection:'column'}}>
      <div style={{width:32,height:32,borderRadius:'50%',border:'3px solid #60a5fa',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      <span style={{fontSize:13}}>Carregando seus dados...</span>
    </div>
  )

  const CATS=state.categorias||DEFAULT_CATS
  const curMes={rendas:[],_seeded:false,...(state.meses[month]||{})}
  CATS.forEach(c=>{if(!curMes[c.id])curMes[c.id]=[]})
  const totalRenda=(curMes.rendas||[]).reduce((s,r)=>s+r.valor,0)
  const totalGastos=CATS.flatMap(c=>curMes[c.id]||[]).reduce((s,i)=>s+i.valor,0)
  const userName=session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Você'

  const syncColor=syncStatus==='saving'?T.textMuted:syncStatus==='error'?T.red:T.green
  const syncIcon=syncStatus==='saving'?'🔄':syncStatus==='error'?'⚠️':'✓'

  // ── TOPBAR ──
  const topbar=(
    <div style={{background:T.topbarBg,borderBottom:`1px solid ${T.topbarBorder}`,backdropFilter:'blur(24px)',WebkitBackdropFilter:'blur(24px)',display:'flex',alignItems:'center',padding:'0 20px',gap:12,height:52,flexShrink:0,position:'sticky',top:0,zIndex:50}}>
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <div style={{width:30,height:30,borderRadius:9,background:T.card,border:`1px solid ${T.cardB}`,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>💰</div>
        {!isMobile&&<span style={{fontSize:14,fontWeight:600,color:T.text,letterSpacing:-0.3}}>Finanças Pessoais</span>}
      </div>

      {/* Month nav (mobile) */}
      {isMobile&&<div style={{display:'flex',alignItems:'center',gap:6}}>
        {['‹','›'].map((l,i)=><button key={l} onClick={()=>setMonth(am(month,i===0?-1:1))} style={{width:26,height:26,borderRadius:8,background:T.card,border:`1px solid ${T.cardB}`,color:T.textSub,cursor:'pointer',fontSize:13,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}>{l}</button>)}
        <span style={{fontSize:14,fontWeight:700,color:T.text,letterSpacing:-0.3}}>{ml(month)}</span>
      </div>}

      {/* Tabs (desktop only) */}
      {!isMobile&&<div style={{display:'flex',gap:3,margin:'0 auto'}}>
        {[['mes','💳 Mês'],['graficos','📊 Gráficos'],['parcelas','🗓️ Parcelas'],['config','⚙️ Config']].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{fontSize:12,padding:'6px 14px',borderRadius:99,border:view===v?`1px solid ${T.tabActiveBorder}`:'none',background:view===v?T.tabActive:'transparent',color:view===v?T.tabActiveTxt:T.textSub,cursor:'pointer',fontWeight:view===v?600:400,fontFamily:"'Sora',sans-serif",backdropFilter:view===v?'blur(12px)':'none',WebkitBackdropFilter:view===v?'blur(12px)':'none',boxShadow:view===v?T.shadow:'none'}}>{l}</button>
        ))}
      </div>}

      <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:isMobile?'auto':0}}>
        {!isMobile&&<div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:syncColor,background:syncStatus==='saved'?`rgba(34,197,94,0.12)`:syncStatus==='error'?`rgba(239,68,68,0.12)`:'rgba(148,163,184,0.1)',borderRadius:99,padding:'3px 10px',border:`1px solid ${syncStatus==='saved'?'rgba(34,197,94,0.25)':syncStatus==='error'?'rgba(239,68,68,0.25)':'rgba(148,163,184,0.2)'}`}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:syncColor}}/>
          {syncStatus==='saving'?'Salvando...':syncStatus==='error'?'Erro':'Salvo'}
        </div>}
        <button onClick={()=>setDark(d=>!d)} style={{width:30,height:30,borderRadius:8,background:T.card,border:`1px solid ${T.cardB}`,color:T.text,cursor:'pointer',fontSize:14,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}>{dark?'☀️':'🌙'}</button>
        <div style={{display:'flex',alignItems:'center',gap:7,background:T.card,border:`1px solid ${T.cardB}`,borderRadius:99,padding:'4px 12px 4px 4px',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
          <div style={{width:24,height:24,borderRadius:'50%',background:T.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{userName[0]?.toUpperCase()}</div>
          {!isMobile&&<span style={{fontSize:12,color:T.text,fontWeight:500}}>{userName}</span>}
        </div>
        <button onClick={logout} style={{background:'none',border:`1px solid ${T.divider}`,borderRadius:7,padding:'3px 9px',color:T.textMuted,fontSize:11,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>Sair</button>
      </div>
    </div>
  )

  const props={state,save,month,setMonth,curMes,totalRenda,totalGastos,CATS,T,isMobile}

  return(
    <div style={{minHeight:'100vh',fontFamily:"'Sora',sans-serif",color:T.text,position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');
        *{box-sizing:border-box;}body{margin:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        button,input,select,textarea{font-family:'Sora',sans-serif;}
        .item-row:hover{background:rgba(255,255,255,0.05);border-radius:8px;}
        input::placeholder,textarea::placeholder{color:rgba(148,163,184,0.4);}
        input[type=month]::-webkit-calendar-picker-indicator{filter:${dark?'invert(0.6)':'invert(0.4)'};}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.3);border-radius:99px;}
      `}</style>

      {/* Fixed background */}
      <div style={{position:'fixed',inset:0,background:T.bgGrad,zIndex:0}}>
        <div style={{position:'absolute',width:350,height:350,top:-80,left:-60,borderRadius:'50%',background:T.blob1,filter:'blur(40px)'}}/>
        <div style={{position:'absolute',width:280,height:280,bottom:-40,right:-40,borderRadius:'50%',background:T.blob2,filter:'blur(36px)'}}/>
        <div style={{position:'absolute',width:220,height:220,top:'40%',left:'38%',borderRadius:'50%',background:T.blob3,filter:'blur(32px)'}}/>
      </div>

      {/* App shell */}
      <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        {topbar}

        {isMobile?(
          // MOBILE LAYOUT
          <div style={{flex:1,padding:'14px 14px 70px',overflow:'auto'}}>
            {view==='mes'&&<MesView {...props}/>}
            {view==='graficos'&&<GraficosView {...props}/>}
            {view==='parcelas'&&<ParcelasView {...props}/>}
            {view==='config'&&<ConfigView {...props}/>}
          </div>
        ):(
          // DESKTOP LAYOUT
          <div style={{flex:1,display:'grid',gridTemplateColumns:'260px 1fr',overflow:'hidden',height:'calc(100vh - 52px)'}}>
            <Sidebar T={T} state={state} month={month} setMonth={setMonth} CATS={CATS} curMes={curMes} totalRenda={totalRenda} totalGastos={totalGastos}/>
            <div style={{overflowY:'auto',padding:'20px 22px 32px'}}>
              {view==='mes'&&<MesView {...props}/>}
              {view==='graficos'&&<GraficosView {...props}/>}
              {view==='parcelas'&&<ParcelasView {...props}/>}
              {view==='config'&&<ConfigView {...props}/>}
            </div>
          </div>
        )}

        {/* Mobile bottom nav */}
        {isMobile&&(
          <div style={{position:'fixed',bottom:0,left:0,right:0,height:56,background:T.navBg,borderTop:`1px solid ${T.navBorder}`,backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'center',justifyContent:'space-around',zIndex:50}}>
            {[['mes','💳','Mês'],['graficos','📊','Gráficos'],['parcelas','🗓️','Parcelas'],['config','⚙️','Config']].map(([v,ic,l])=>(
              <button key={v} onClick={()=>setView(v)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 12px',borderRadius:10,border:'none',background:view===v?`${T.accent}18`:'transparent',cursor:'pointer'}}>
                <span style={{fontSize:16}}>{ic}</span>
                <span style={{fontSize:9,color:view===v?T.accent:T.textMuted,fontWeight:view===v?700:400,fontFamily:"'Sora',sans-serif"}}>{l}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── MES VIEW ──────────────────────────────────────────────────────────────────
function MesView({state,save,month,curMes,totalRenda,totalGastos,CATS,T,isMobile}){
  const[open,setOpen]=useState(null)
  const[addCat,setAddCat]=useState(null)
  const[form,setForm]=useState({nome:'',valor:'',subcat:''})
  const[busca,setBusca]=useState('')
  const[addRenda,setAddRenda]=useState(false)
  const[rendaForm,setRendaForm]=useState({nome:'',valor:''})
  const[notaOpen,setNotaOpen]=useState(null)
  const[editItem,setEditItem]=useState(null)
  const[editForm,setEditForm]=useState({nome:'',valor:'',subcat:'',novaCat:''})

  const totalPago=CATS.flatMap(c=>curMes[c.id]||[]).filter(i=>i.pago).reduce((s,i)=>s+i.valor,0)
  const pct=totalGastos>0?(totalPago/totalGastos)*100:0
  const saldo=totalRenda-totalGastos

  const updMes=(catId,items)=>save({...state,meses:{...state.meses,[month]:{...curMes,[catId]:items}}})
  const togglePago=(catId,id)=>updMes(catId,(curMes[catId]||[]).map(i=>i.id===id?{...i,pago:!i.pago}:i))
  const removeItem=(catId,id)=>updMes(catId,(curMes[catId]||[]).filter(i=>i.id!==id))
  const saveNota=(catId,id,nota)=>updMes(catId,(curMes[catId]||[]).map(i=>i.id===id?{...i,nota}:i))
  const addItem=catId=>{const v=parseFloat(form.valor.replace(',','.'));if(!form.nome||isNaN(v))return;updMes(catId,[...(curMes[catId]||[]),{id:uid(),nome:form.nome,valor:v,pago:false,nota:'',subcat:form.subcat||null,recorrenteId:null}]);setForm({nome:'',valor:'',subcat:''});setAddCat(null)}
  const addRendaItem=()=>{const v=parseFloat(rendaForm.valor.replace(',','.'));if(!rendaForm.nome||isNaN(v))return;save({...state,meses:{...state.meses,[month]:{...curMes,rendas:[...(curMes.rendas||[]),{id:uid(),nome:rendaForm.nome,valor:v}]}}});setRendaForm({nome:'',valor:''});setAddRenda(false)}
  const removeRenda=id=>save({...state,meses:{...state.meses,[month]:{...curMes,rendas:(curMes.rendas||[]).filter(r=>r.id!==id)}}})
  const startEdit=(cat,item)=>{setEditItem({catId:cat.id,itemId:item.id});setEditForm({nome:item.nome,valor:String(item.valor),subcat:item.subcat||'',novaCat:cat.id});setNotaOpen(null)}
  const saveEdit=()=>{
    if(!editItem)return
    const v=parseFloat(editForm.valor.replace(',','.'))
    if(!editForm.nome||isNaN(v))return
    const item=(curMes[editItem.catId]||[]).find(i=>i.id===editItem.itemId)
    if(!item)return
    const updated={...item,nome:editForm.nome,valor:v,subcat:editForm.subcat||null}
    if(editForm.novaCat===editItem.catId){
      updMes(editItem.catId,(curMes[editItem.catId]||[]).map(i=>i.id===editItem.itemId?updated:i))
    }else{
      const newMes={...curMes,[editItem.catId]:(curMes[editItem.catId]||[]).filter(i=>i.id!==editItem.itemId),[editForm.novaCat]:[...(curMes[editForm.novaCat]||[]),updated]}
      save({...state,meses:{...state.meses,[month]:newMes}})
    }
    setEditItem(null)
  }

  const buscaLow=busca.toLowerCase().trim()
  const buscaAtiva=buscaLow.length>1
  const todosItens=buscaAtiva?CATS.flatMap(c=>(curMes[c.id]||[]).filter(i=>i.nome.toLowerCase().includes(buscaLow)).map(i=>({...i,catCor:c.cor,catNome:c.nome}))):[]

  const INP2=INP(T)

  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    {/* SALDO — mobile only (desktop shows in sidebar) */}
    {isMobile&&totalRenda>0&&<div style={{...gls(T,18),padding:'14px 16px',marginBottom:12}}>
      <p style={{margin:0,fontSize:9,color:T.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>Saldo do Mês</p>
      <p style={{margin:'2px 0 0',fontSize:22,fontWeight:800,color:saldo>=0?T.green:T.red,letterSpacing:-1}}>{saldo>=0?'':'-'}{fmt(Math.abs(saldo))}</p>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:10,paddingTop:9,borderTop:`1px solid ${T.divider}`}}>
        <div><div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase'}}>Renda</div><div style={{fontSize:11,fontWeight:700,color:T.green}}>{fmt(totalRenda)}</div></div>
        <div><div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase'}}>Gastos</div><div style={{fontSize:11,fontWeight:700,color:T.red}}>{fmt(totalGastos)}</div></div>
        <div><div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase'}}>Pendente</div><div style={{fontSize:11,fontWeight:700,color:T.yellow}}>{fmt(totalGastos-totalPago)}</div></div>
      </div>
    </div>}

    {/* DESKTOP METRIC CARDS */}
    {!isMobile&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
      {[[fmt(totalGastos),'Total gastos',T.accent,'Abril 2025'],[fmt(totalPago),'Já pago',T.green,`↑ ${pct.toFixed(0)}% do total`],[fmt(totalGastos-totalPago),'Pendente',T.yellow,`${CATS.flatMap(c=>curMes[c.id]||[]).filter(i=>!i.pago).length} em aberto`],[fmt(Math.abs(saldo)),'Saldo livre',saldo>=0?T.green:T.red,saldo>=0?'😊 No azul':'😬 Negativo']].map(([v,l,c,s],i)=>(
        <div key={i} style={{...gls(T,16),padding:'14px 16px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,borderRadius:'16px 16px 0 0',background:c}}/>
          <div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,marginTop:6}}>{l}</div>
          <div style={{fontSize:18,fontWeight:700,color:i===3?c:T.text}}>{v}</div>
          <div style={{display:'inline-flex',fontSize:10,padding:'2px 8px',borderRadius:99,marginTop:6,background:`${c}18`,color:c,fontWeight:600}}>{s}</div>
        </div>
      ))}
    </div>}

    {/* PROGRESS BAR — mobile */}
    {isMobile&&<div style={{...gls(T,14),padding:'11px 14px',marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}><span style={{fontSize:11,color:T.textSub}}>Pagamentos realizados</span><span style={{fontSize:11,fontWeight:700,color:T.accent}}>{pct.toFixed(0)}%</span></div>
      <div style={{height:6,background:T.prog,borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${T.accent},${T.green})`,borderRadius:99,transition:'width 0.6s ease'}}/></div>
    </div>}

    {/* RENDAS */}
    <Sec T={T} title="💰 Rendas do Mês">
      {(curMes.rendas||[]).length===0&&!addRenda&&<p style={{color:T.textMuted,fontSize:12,textAlign:'center',padding:'4px 0 8px'}}>Nenhuma renda lançada.</p>}
      {(curMes.rendas||[]).map(r=><div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:`1px solid ${T.divider}`}}>
        <span>💵</span><span style={{flex:1,fontSize:12,color:T.green,fontWeight:500}}>{r.nome}</span>
        <span style={{fontWeight:700,color:T.green,fontSize:13}}>{fmt(r.valor)}</span>
        <button onClick={()=>removeRenda(r.id)} style={{background:'none',border:'none',color:T.textMuted,fontSize:17,cursor:'pointer',padding:'0 2px'}}>×</button>
      </div>)}
      {addRenda?<div style={{display:'flex',gap:6,paddingTop:10,flexWrap:'wrap'}}>
        <input style={{...INP2,flex:1,minWidth:120}} placeholder="Ex: Salário..." value={rendaForm.nome} onChange={e=>setRendaForm(p=>({...p,nome:e.target.value}))}/>
        <input style={{...INP2,width:110}} placeholder="0,00" value={rendaForm.valor} onChange={e=>setRendaForm(p=>({...p,valor:e.target.value}))}/>
        <BtnOk onClick={addRendaItem} color={T.green}/><BtnX onClick={()=>setAddRenda(false)}/>
      </div>:<button onClick={()=>setAddRenda(true)} style={{background:'none',border:'none',color:T.green,fontSize:11,cursor:'pointer',padding:'8px 0 0',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Adicionar renda</button>}
    </Sec>

    {/* BUSCA */}
    <div style={{position:'relative',marginBottom:12}}>
      <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:T.textMuted,pointerEvents:'none'}}>🔍</span>
      <input style={{...INP2,paddingLeft:36,...gls(T,12),border:`1px solid ${T.cardB}`}} placeholder="Buscar lançamento..." value={busca} onChange={e=>setBusca(e.target.value)}/>
      {busca&&<button onClick={()=>setBusca('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.textMuted,fontSize:16,cursor:'pointer'}}>×</button>}
    </div>
    {buscaAtiva&&<Sec T={T} title={`${todosItens.length} resultado(s)`}>
      {todosItens.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:`1px solid ${T.divider}`}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:item.catCor,flexShrink:0}}/><span style={{flex:1,fontSize:12,color:T.text}}>{item.nome}</span>
        {item.subcat&&<span style={{fontSize:9,background:`${T.prog}`,borderRadius:5,padding:'2px 6px',color:T.textSub}}>{item.subcat}</span>}
        <span style={{fontSize:12,fontWeight:600,color:item.catCor}}>{fmt(item.valor)}</span>
      </div>)}
    </Sec>}

    {/* DESKTOP 2-col layout for categories */}
    {!isMobile&&!buscaAtiva&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,alignItems:'start'}}>
      <div>{CATS.slice(0,Math.ceil(CATS.length/2)).map(cat=><CatBlock key={cat.id} cat={cat} curMes={curMes} state={state} T={T} open={open} setOpen={setOpen} addCat={addCat} setAddCat={setAddCat} form={form} setForm={setForm} addItem={addItem} togglePago={togglePago} removeItem={removeItem} notaOpen={notaOpen} setNotaOpen={setNotaOpen} saveNota={saveNota} editItem={editItem} setEditItem={setEditItem} editForm={editForm} setEditForm={setEditForm} startEdit={startEdit} saveEdit={saveEdit} CATS={CATS} INP2={INP2}/>)</div>
      <div>{CATS.slice(Math.ceil(CATS.length/2)).map(cat=><CatBlock key={cat.id} cat={cat} curMes={curMes} state={state} T={T} open={open} setOpen={setOpen} addCat={addCat} setAddCat={setAddCat} form={form} setForm={setForm} addItem={addItem} togglePago={togglePago} removeItem={removeItem} notaOpen={notaOpen} setNotaOpen={setNotaOpen} saveNota={saveNota} editItem={editItem} setEditItem={setEditItem} editForm={editForm} setEditForm={setEditForm} startEdit={startEdit} saveEdit={saveEdit} CATS={CATS} INP2={INP2}/>)</div>
    </div>}
    {(isMobile||buscaAtiva)&&!buscaAtiva&&CATS.map(cat=><CatBlock key={cat.id} cat={cat} curMes={curMes} state={state} T={T} open={open} setOpen={setOpen} addCat={addCat} setAddCat={setAddCat} form={form} setForm={setForm} addItem={addItem} togglePago={togglePago} removeItem={removeItem} notaOpen={notaOpen} setNotaOpen={setNotaOpen} saveNota={saveNota} editItem={editItem} setEditItem={setEditItem} editForm={editForm} setEditForm={setEditForm} startEdit={startEdit} saveEdit={saveEdit} CATS={CATS} INP2={INP2}/>)}
  </div>)
}

function CatBlock({cat,curMes,state,T,open,setOpen,addCat,setAddCat,form,setForm,addItem,togglePago,removeItem,notaOpen,setNotaOpen,saveNota,editItem,setEditItem,editForm,setEditForm,startEdit,saveEdit,CATS,INP2}){
  const items=curMes[cat.id]||[]
  const sub=items.reduce((s,i)=>s+i.valor,0)
  const orc=state.orcamentos[cat.id]||0
  const pctOrc=orc>0?(sub/orc)*100:0
  const alerta=orc>0&&pctOrc>=100
  const aviso=orc>0&&pctOrc>=80&&!alerta
  const isOpen=open===cat.id
  return(<div style={{...gls(T,16),overflow:'hidden',marginBottom:10,border:`1px solid ${alerta?`${T.red}55`:aviso?`${T.yellow}44`:T.cardB}`,transition:'border-color 0.2s'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',cursor:'pointer',userSelect:'none'}} onClick={()=>setOpen(isOpen?null:cat.id)}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:3,height:32,borderRadius:99,background:cat.cor,flexShrink:0}}/>
        <span style={{fontSize:17}}>{cat.icone}</span>
        <div>
          <p style={{margin:0,fontWeight:600,fontSize:13,color:T.text}}>{cat.nome}</p>
          <p style={{margin:0,fontSize:10,color:T.textMuted}}>{items.filter(i=>i.pago).length}/{items.length} pagos{orc>0&&<span style={{color:alerta?T.red:aviso?T.yellow:T.textMuted}}> · {pctOrc.toFixed(0)}% orç.</span>}</p>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:7}}>
        {alerta&&<span style={{fontSize:9,background:`${T.red}22`,color:T.red,borderRadius:6,padding:'2px 7px',fontWeight:700}}>⚠️</span>}
        {aviso&&<span style={{fontSize:9,background:`${T.yellow}22`,color:T.yellow,borderRadius:6,padding:'2px 7px',fontWeight:700}}>⚡</span>}
        <span style={{color:cat.cor,fontWeight:700,fontSize:13}}>{fmt(sub)}</span>
        <span style={{color:T.textMuted,fontSize:13,display:'inline-block',transform:isOpen?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.25s'}}>▾</span>
      </div>
    </div>
    {orc>0&&<div style={{height:3,background:T.prog}}><div style={{height:'100%',width:`${Math.min(pctOrc,100)}%`,background:alerta?T.red:aviso?T.yellow:cat.cor,transition:'width 0.4s'}}/></div>}
    {isOpen&&<div style={{padding:'8px 14px 13px',borderTop:`1px solid ${T.divider}`}}>
      {cat.subcats?.length>0&&(()=>{
        const byS={};items.forEach(i=>{const k=i.subcat||'Outros';byS[k]=(byS[k]||0)+i.valor})
        const entries=Object.entries(byS)
        return entries.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:10}}>
          {entries.map(([k,v])=><div key={k} style={{background:`${cat.cor}15`,borderRadius:7,padding:'3px 8px',fontSize:10,border:`1px solid ${cat.cor}30`}}>
            <span style={{color:T.textMuted}}>{k}: </span><span style={{color:cat.cor,fontWeight:700}}>{fmt(v)}</span>
          </div>)}
        </div>
      })()}
      {items.length===0&&<p style={{textAlign:'center',color:T.textMuted,fontSize:12,padding:'10px 0'}}>Sem lançamentos.</p>}
      {items.map(item=>{
        const isEditing=editItem?.catId===cat.id&&editItem?.itemId===item.id
        return(<div key={item.id} className="item-row" style={{padding:'5px 3px',opacity:!isEditing&&item.pago?0.45:1}}>
          {isEditing?(
            <div style={{background:T.prog,borderRadius:12,padding:12,margin:'4px 0',border:`1px solid ${cat.cor}44`}}>
              <p style={{margin:'0 0 9px',fontSize:10,color:cat.cor,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>✏️ Editar lançamento</p>
              <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
                <input style={{...INP2,flex:1,minWidth:110}} placeholder="Descrição" value={editForm.nome} onChange={e=>setEditForm(p=>({...p,nome:e.target.value}))}/>
                <input style={{...INP2,width:100}} placeholder="0,00" value={editForm.valor} onChange={e=>setEditForm(p=>({...p,valor:e.target.value}))}/>
              </div>
              <div style={{marginBottom:8}}>
                <label style={LBL}>Mover para categoria</label>
                <select style={{...INP2,cursor:'pointer'}} value={editForm.novaCat} onChange={e=>setEditForm(p=>({...p,novaCat:e.target.value}))}>
                  {CATS.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}{c.id===cat.id?' (atual)':''}</option>)}
                </select>
              </div>
              {(()=>{const dc=CATS.find(c=>c.id===editForm.novaCat);return dc?.subcats?.length>0&&<div style={{marginBottom:8}}>
                <label style={LBL}>Subcategoria</label>
                <select style={{...INP2,cursor:'pointer'}} value={editForm.subcat} onChange={e=>setEditForm(p=>({...p,subcat:e.target.value}))}>
                  <option value="">Sem subcategoria</option>
                  {dc.subcats.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>})()}
              <div style={{display:'flex',gap:6}}>
                <BtnOk onClick={saveEdit} color={cat.cor}/><BtnX onClick={()=>setEditItem(null)}/>
              </div>
            </div>
          ):(
            <>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>togglePago(cat.id,item.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${cat.cor}`,background:item.pago?cat.cor:'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:700}}>{item.pago?'✓':''}</button>
                <span style={{flex:1,fontSize:12,color:T.text,textDecoration:item.pago?'line-through':'none'}}>{item.nome}</span>
                {item.subcat&&<span style={{fontSize:9,background:`${cat.cor}20`,color:cat.cor,borderRadius:5,padding:'2px 6px',flexShrink:0}}>{item.subcat}</span>}
                <span style={{fontSize:12,fontWeight:600,flexShrink:0,color:T.text}}>{fmt(item.valor)}</span>
                <button onClick={()=>startEdit(cat,item)} title="Editar" style={{background:'none',border:'none',fontSize:11,cursor:'pointer',padding:'0 1px',opacity:0.35,transition:'opacity 0.15s'}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0.35}>✏️</button>
                <button onClick={()=>setNotaOpen(notaOpen===item.id?null:item.id)} style={{background:'none',border:'none',fontSize:11,cursor:'pointer',padding:'0 1px',opacity:item.nota?0.9:0.25}}>📝</button>
                <button onClick={()=>removeItem(cat.id,item.id)} style={{background:'none',border:'none',color:T.textMuted,fontSize:15,cursor:'pointer',padding:'0 1px',lineHeight:1}}>×</button>
              </div>
              {notaOpen===item.id&&<textarea style={{...INP2,marginTop:6,fontSize:11,resize:'none',height:52,borderColor:`${cat.cor}44`}} placeholder="Nota..." value={item.nota||''} onChange={e=>saveNota(cat.id,item.id,e.target.value)}/>}
              {item.nota&&notaOpen!==item.id&&<p style={{margin:'2px 0 0 26px',fontSize:10,color:T.textMuted,fontStyle:'italic'}}>📝 {item.nota}</p>}
            </>
          )}
        </div>)
      })}
      {addCat===cat.id?<div style={{display:'flex',flexDirection:'column',gap:7,paddingTop:9}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <input style={{...INP2,flex:1,minWidth:110}} placeholder="Descrição" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/>
          <input style={{...INP2,width:100}} placeholder="0,00" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/>
        </div>
        {cat.subcats?.length>0&&<select style={{...INP2,cursor:'pointer'}} value={form.subcat} onChange={e=>setForm(p=>({...p,subcat:e.target.value}))}>
          <option value="">Sem subcategoria</option>
          {cat.subcats.map(s=><option key={s} value={s}>{s}</option>)}
        </select>}
        <div style={{display:'flex',gap:6}}><BtnOk onClick={()=>addItem(cat.id)} color={cat.cor}/><BtnX onClick={()=>setAddCat(null)}/></div>
      </div>:<button onClick={()=>{setAddCat(cat.id);setForm({nome:'',valor:'',subcat:''})}} style={{background:'none',border:'none',color:cat.cor,fontSize:11,cursor:'pointer',padding:'8px 0 0',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Adicionar lançamento</button>}
    </div>}
  </div>)
}

// ── GRAFICOS VIEW ─────────────────────────────────────────────────────────────
function GraficosView({state,month,CATS,T}){
  const[subcatCat,setSubcatCat]=useState(null)
  const barData=Array.from({length:11},(_,i)=>{const m=am(month,-3+i),d=state.meses[m]||{};const total=CATS.reduce((s,c)=>s+(d[c.id]||[]).reduce((ss,j)=>ss+j.valor,0),0);return{label:msh(m),total,current:m===month}})
  const mesD=state.meses[month]||{}
  const slices=CATS.map(c=>({...c,val:(mesD[c.id]||[]).reduce((s,i)=>s+i.valor,0)})).filter(s=>s.val>0)
  const totalMes=slices.reduce((s,c)=>s+c.val,0)
  const prev=am(month,-1),prevD=state.meses[prev]||{}
  const compData=CATS.map(c=>({label:c.nome.split(' ')[0],atual:(mesD[c.id]||[]).reduce((s,i)=>s+i.valor,0),anterior:(prevD[c.id]||[]).reduce((s,i)=>s+i.valor,0),cor:c.cor}))
  const projData=Array.from({length:10},(_,i)=>{const m=am(month,i),d=state.meses[m]||{};const parc=(d.parcelado||[]).reduce((s,i)=>s+i.valor,0);const outros=CATS.filter(c=>c.id!=='parcelado').reduce((s,c)=>s+(d[c.id]||[]).reduce((ss,i)=>ss+i.valor,0),0);return{label:msh(m),parc,outros,total:parc+outros}})
  const catsCS=CATS.filter(c=>c.subcats?.length>0&&(mesD[c.id]||[]).length>0)
  const selId=subcatCat||catsCS[0]?.id
  const selCat=CATS.find(c=>c.id===selId)
  const subSlices=selCat?(()=>{const byS={};(mesD[selId]||[]).forEach(i=>{const k=i.subcat||'Outros';byS[k]=(byS[k]||0)+i.valor});return Object.entries(byS).map(([nome,val],i)=>({nome,val,id:`s${i}`,cor:COLOR_PRESETS[i%COLOR_PRESETS.length]}))})():[]
  const subTotal=subSlices.reduce((s,i)=>s+i.val,0)
  const tickFmt=v=>v>=1000?`${(v/1000).toFixed(0)}k`:v
  const tickStyle={fill:T.textMuted,fontSize:9}
  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    <Sec T={T} title={`Distribuição — ${ml(month)}`}>{totalMes===0?<p style={{textAlign:'center',color:T.textMuted,fontSize:13,padding:'16px 0'}}>Sem lançamentos.</p>:<DonutSVG slices={slices} total={totalMes} T={T}/>}</Sec>
    {catsCS.length>0&&<Sec T={T} title="🏷️ Por Subcategoria">
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
        {catsCS.map(c=><button key={c.id} onClick={()=>setSubcatCat(c.id)} style={{padding:'5px 10px',borderRadius:8,border:`1px solid ${c.cor}${selId===c.id?'':'44'}`,background:selId===c.id?`${c.cor}22`:'transparent',color:selId===c.id?c.cor:T.textSub,fontSize:11,cursor:'pointer',fontWeight:selId===c.id?700:400,fontFamily:"'Sora',sans-serif"}}>{c.icone} {c.nome}</button>)}
      </div>
      {subSlices.length>0?<DonutSVG slices={subSlices} total={subTotal} T={T}/>:<p style={{textAlign:'center',color:T.textMuted,fontSize:12,padding:'8px 0'}}>Sem itens com subcategoria.</p>}
    </Sec>}
    <Sec T={T} title="Total por Mês"><ResponsiveContainer width="100%" height={170}><BarChart data={barData} margin={{top:4,right:0,bottom:0,left:0}} barSize={14}><XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}/><YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={tickFmt}/><Tooltip content={<ChartTip/>}/><Bar dataKey="total" radius={[5,5,0,0]} name="Gastos">{barData.map((e,i)=><Cell key={i} fill={e.current?T.accent:i<3?'rgba(148,163,184,0.2)':'rgba(148,163,184,0.12)'}/>)}</Bar></BarChart></ResponsiveContainer></Sec>
    <Sec T={T} title={`Comparativo — ${ml(month)} vs ${ml(prev)}`}><ResponsiveContainer width="100%" height={155}><BarChart data={compData} margin={{top:4,right:0,bottom:0,left:0}} barSize={12} barGap={4}><XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}/><YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={tickFmt}/><Tooltip content={<ChartTip/>}/><Bar dataKey="anterior" name={ml(prev)} radius={[4,4,0,0]}>{compData.map((e,i)=><Cell key={i} fill={`${e.cor}55`}/>)}</Bar><Bar dataKey="atual" name={ml(month)} radius={[4,4,0,0]}>{compData.map((e,i)=><Cell key={i} fill={e.cor}/>)}</Bar></BarChart></ResponsiveContainer><div style={{display:'flex',gap:12,paddingTop:6,flexWrap:'wrap'}}>{CATS.map(c=><Leg key={c.id} color={c.cor} label={c.nome.split(' ')[0]}/>)}</div></Sec>
    <Sec T={T} title="Projeção — Parcelas"><ResponsiveContainer width="100%" height={180}><BarChart data={projData} margin={{top:4,right:0,bottom:0,left:0}} barSize={18}><XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}/><YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={tickFmt}/><Tooltip content={<ChartTip/>}/><Bar dataKey="outros" stackId="a" fill="rgba(148,163,184,0.2)" name="Outros" radius={[0,0,0,0]}/><Bar dataKey="parc" stackId="a" fill={T.green} name="Parcelas" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer><div style={{display:'flex',gap:14,paddingTop:4}}><Leg color="rgba(148,163,184,0.4)" label="Outros"/><Leg color={T.green} label="Parcelas"/></div></Sec>
    <Sec T={T} title="Tendência Total"><ResponsiveContainer width="100%" height={145}><LineChart data={projData} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid stroke={T.divider} strokeDasharray="4 4"/><XAxis dataKey="label" tick={tickStyle} axisLine={false} tickLine={false}/><YAxis tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/><Tooltip content={<ChartTip/>}/><Line type="monotone" dataKey="total" stroke={T.accent} strokeWidth={2} dot={{r:2,fill:T.accent}} name="Total"/><Line type="monotone" dataKey="parc" stroke={T.green} strokeWidth={2} strokeDasharray="5 3" dot={false} name="Parcelas"/></LineChart></ResponsiveContainer></Sec>
  </div>)
}

// ── PARCELAS VIEW ─────────────────────────────────────────────────────────────
function ParcelasView({state,save,month,CATS,T}){
  const[showForm,setShowForm]=useState(false)
  const[form,setForm]=useState({nome:'',valor:'',total:'',ref:'',mesRef:month,catId:CATS[0]?.id||'parcelado'})
  const INP2=INP(T)
  const addParcela=()=>{
    const valor=parseFloat(form.valor.replace(',','.'));const total=parseInt(form.total),ref=parseInt(form.ref)
    if(!form.nome||isNaN(valor)||isNaN(total)||isNaN(ref)||ref<1||ref>total)return
    const mesInicio=am(form.mesRef,-(ref-1))
    const newP={id:uid(),nome:form.nome,valor,catId:form.catId,mesRef:form.mesRef,ref,total,mesInicio}
    let meses={...state.meses}
    for(let i=0;i<total;i++){
      const m=am(mesInicio,i),num=i+1
      if(!meses[m]){meses[m]={rendas:[],_seeded:false};CATS.forEach(c=>{meses[m][c.id]=[]})}
      meses[m]={...meses[m],[newP.catId]:[...(meses[m][newP.catId]||[]),{id:`${newP.id}-${num}`,nome:`${newP.nome} (${num}/${total})`,valor,pago:false,nota:'',subcat:null,parcelaId:newP.id}]}
    }
    save({...state,meses,parcelas:[...state.parcelas,newP]})
    setShowForm(false);setForm({nome:'',valor:'',total:'',ref:'',mesRef:month,catId:CATS[0]?.id||'parcelado'})
  }
  const removeParcela=pId=>{
    const meses={}
    Object.entries(state.meses).forEach(([m,data])=>{meses[m]={...data};CATS.forEach(c=>{meses[m][c.id]=(data[c.id]||[]).filter(i=>i.parcelaId!==pId)})})
    save({...state,meses,parcelas:state.parcelas.filter(p=>p.id!==pId)})
  }
  const liberation=[]
  state.parcelas.forEach(p=>{
    const mesFim=am(p.mesInicio,p.total-1)
    const{y:cy,m:cm}=pm(month),{y:sy,m:sm}=pm(p.mesInicio)
    const restante=Math.max(p.total-Math.max((cy-sy)*12+(cm-sm)+1,1),0)
    if(restante>0)liberation.push({...p,mesFim,restante,liberaEm:am(mesFim,1)})
  })
  liberation.sort((a,b)=>a.mesFim.localeCompare(b.mesFim))
  const libByMonth={}
  liberation.forEach(p=>{if(!libByMonth[p.liberaEm])libByMonth[p.liberaEm]=[];libByMonth[p.liberaEm].push(p)})
  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    <Sec T={T} title={`Parcelas Ativas — ${state.parcelas.length}`}>
      {state.parcelas.length===0&&<p style={{color:T.textMuted,textAlign:'center',fontSize:13,padding:'12px 0'}}>Nenhuma parcela cadastrada.</p>}
      {state.parcelas.map(p=>{
        const mesFim=am(p.mesInicio,p.total-1)
        const{y:cy,m:cm}=pm(month),{y:sy,m:sm}=pm(p.mesInicio)
        const atual=Math.min(Math.max((cy-sy)*12+(cm-sm)+1,1),p.total)
        const pct=(atual/p.total)*100
        const cat=CATS.find(c=>c.id===p.catId)||CATS[0]
        const restante=p.total-atual
        return(<div key={p.id} style={{background:T.prog,borderRadius:14,padding:13,marginBottom:9,border:`1px solid ${T.divider}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:9}}>
            <div style={{flex:1}}><p style={{margin:0,fontWeight:700,fontSize:13,color:T.text}}>{p.nome}</p><p style={{margin:'3px 0 0',fontSize:10,color:T.textMuted}}>{cat?.icone} {cat?.nome} · {atual}/{p.total} · até {ml(mesFim)}</p></div>
            <div style={{textAlign:'right',flexShrink:0}}><p style={{margin:0,fontWeight:700,color:cat?.cor,fontSize:14}}>{fmt(p.valor)}<span style={{fontSize:10,fontWeight:400,color:T.textMuted}}>/mês</span></p><p style={{margin:'2px 0 0',fontSize:10,color:T.textMuted}}>{restante>0?`${restante} restantes`:'✅ Quitado'}</p></div>
          </div>
          <div style={{height:4,background:T.prog,borderRadius:99,overflow:'hidden',marginBottom:9,border:`1px solid ${T.divider}`}}><div style={{height:'100%',width:`${pct}%`,background:cat?.cor,borderRadius:99,transition:'width 0.5s'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:10,color:T.textMuted}}>Total: <b style={{color:T.textSub}}>{fmt(p.valor*p.total)}</b> · A pagar: <b style={{color:cat?.cor}}>{fmt(p.valor*restante)}</b></span>
            <button onClick={()=>removeParcela(p.id)} style={{background:`${T.red}15`,border:`1px solid ${T.red}44`,borderRadius:8,padding:'4px 10px',color:T.red,fontSize:11,cursor:'pointer',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>Remover</button>
          </div>
        </div>)
      })}
    </Sec>
    {liberation.length>0&&<Sec T={T} title="📅 Liberação de Orçamento">
      {Object.entries(libByMonth).map(([m,ps])=>{
        const totalLib=ps.reduce((s,p)=>s+p.valor,0)
        return(<div key={m} style={{background:`${T.green}10`,borderRadius:12,padding:'11px 13px',marginBottom:8,border:`1px solid ${T.green}33`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><span style={{fontSize:12,fontWeight:700,color:T.green}}>{ml(m)}</span><span style={{fontSize:14,fontWeight:800,color:T.green}}>+{fmt(totalLib)}/mês</span></div>
          {ps.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:T.textMuted,padding:'2px 0'}}><span>✓ {p.nome} termina</span><span style={{color:T.green}}>{fmt(p.valor)}</span></div>)}
        </div>)
      })}
    </Sec>}
    {showForm?<Sec T={T} title="Adicionar Nova Parcela">
      <div style={{display:'flex',flexDirection:'column',gap:11}}>
        <div><label style={LBL}>Descrição</label><input style={INP2} placeholder="Ex: TV Samsung..." value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={LBL}>Valor/parcela</label><input style={INP2} placeholder="0,00" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/></div>
          <div><label style={LBL}>Total parcelas</label><input style={INP2} placeholder="12" type="number" min="1" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={LBL}>Parcela atual</label><input style={INP2} placeholder="3" type="number" min="1" value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))}/></div>
          <div><label style={LBL}>Mês referência</label><input style={INP2} type="month" value={form.mesRef} onChange={e=>setForm(p=>({...p,mesRef:e.target.value}))}/></div>
        </div>
        <div><label style={LBL}>Categoria</label><select style={{...INP2,cursor:'pointer'}} value={form.catId} onChange={e=>setForm(p=>({...p,catId:e.target.value}))}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select></div>
        {form.nome&&form.valor&&form.total&&form.ref&&<div style={{background:T.prog,borderRadius:9,padding:'9px 12px',fontSize:11,color:T.textMuted,border:`1px solid ${T.divider}`}}>💡 <b style={{color:T.text}}>{form.nome}</b> — {fmt(parseFloat(form.valor.replace(',','.'))||0)}/mês. Termina em <b style={{color:T.accent}}>{ml(am(am(form.mesRef,-(parseInt(form.ref)-1)),parseInt(form.total)-1))}</b>.</div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={addParcela} style={{flex:1,padding:'13px',background:`linear-gradient(135deg,${T.green},${T.accent})`,border:'none',borderRadius:12,color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>✓ Adicionar Parcela</button>
          <BtnX onClick={()=>setShowForm(false)}/>
        </div>
      </div>
    </Sec>:<button onClick={()=>setShowForm(true)} style={{width:'100%',padding:'14px',background:'transparent',border:`2px dashed ${T.divider}`,borderRadius:14,color:T.textMuted,fontSize:12,cursor:'pointer',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Nova Parcela</button>}
  </div>)
}

// ── CONFIG VIEW ───────────────────────────────────────────────────────────────
function ConfigView({state,save,month,CATS,T}){
  const[addRec,setAddRec]=useState(false)
  const[recForm,setRecForm]=useState({nome:'',valor:'',catId:CATS[0]?.id||'cartao'})
  const[orcLocal,setOrcLocal]=useState({...state.orcamentos})
  const[confirmReset,setConfirmReset]=useState(false)
  const[editCat,setEditCat]=useState(null)
  const[editForm,setEditForm]=useState({})
  const[newSubcat,setNewSubcat]=useState('')
  const[addingCat,setAddingCat]=useState(false)
  const[newCatForm,setNewCatForm]=useState({nome:'',icone:'💡',cor:'#60a5fa',subcats:[]})
  const[newCatSubcat,setNewCatSubcat]=useState('')
  const INP2=INP(T)

  const toggleRec=id=>save({...state,recorrentes:state.recorrentes.map(r=>r.id===id?{...r,ativo:!r.ativo}:r)})
  const removeRec=id=>save({...state,recorrentes:state.recorrentes.filter(r=>r.id!==id)})
  const addRecItem=()=>{const v=parseFloat(recForm.valor.replace(',','.'));if(!recForm.nome||isNaN(v))return;save({...state,recorrentes:[...state.recorrentes,{id:uid(),nome:recForm.nome,valor:v,catId:recForm.catId,ativo:true}]});setRecForm({nome:'',valor:'',catId:CATS[0]?.id||'cartao'});setAddRec(false)}
  const saveOrcamentos=()=>{const p={};Object.entries(orcLocal).forEach(([k,v])=>{const n=parseFloat(String(v).replace(',','.'));p[k]=isNaN(n)?0:n});save({...state,orcamentos:p})}
  const exportCSV=()=>{
    const rows=[['Mês','Categoria','Subcategoria','Item','Valor (R$)','Pago','Nota']]
    Object.entries(state.meses).sort().forEach(([m,data])=>{CATS.forEach(c=>(data[c.id]||[]).forEach(i=>rows.push([ml(m),c.nome,i.subcat||'',i.nome,i.valor.toFixed(2).replace('.',','),i.pago?'Sim':'Não',i.nota||''])));(data.rendas||[]).forEach(r=>rows.push([ml(m),'Renda','',r.nome,r.valor.toFixed(2).replace('.',','),'—','']))})
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`financas_${month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const resetMonth=()=>{const empty={rendas:[],_seeded:false};CATS.forEach(c=>{empty[c.id]=[]});save({...state,meses:{...state.meses,[month]:empty}});setConfirmReset(false)}
  const startEditCat=cat=>{setEditCat(cat.id);setEditForm({nome:cat.nome,icone:cat.icone,cor:cat.cor,subcats:[...cat.subcats]})}
  const saveEditCat=()=>{save({...state,categorias:CATS.map(c=>c.id===editCat?{...c,...editForm}:c)});setEditCat(null)}
  const addSubEdit=()=>{if(!newSubcat.trim()||editForm.subcats.includes(newSubcat.trim()))return;setEditForm(p=>({...p,subcats:[...p.subcats,newSubcat.trim()]}));setNewSubcat('')}
  const removeCat=catId=>save({...state,categorias:CATS.filter(c=>c.id!==catId)})
  const addNewCat=()=>{if(!newCatForm.nome.trim())return;save({...state,categorias:[...CATS,{id:uid(),...newCatForm}]});setAddingCat(false);setNewCatForm({nome:'',icone:'💡',cor:'#60a5fa',subcats:[]});setNewCatSubcat('')}
  const totalRec=(state.recorrentes||[]).filter(r=>r.ativo).reduce((s,r)=>s+r.valor,0)

  const ColorPicker=({value,onChange})=><div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:5}}>{COLOR_PRESETS.map(c=><button key={c} onClick={()=>onChange(c)} style={{width:24,height:24,borderRadius:'50%',background:c,border:value===c?'3px solid rgba(255,255,255,0.9)':'3px solid transparent',cursor:'pointer'}}/>)}</div>

  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    <Sec T={T} title="🗂️ Gerenciar Categorias">
      {CATS.map(cat=><div key={cat.id} style={{marginBottom:8}}>
        {editCat===cat.id?(
          <div style={{background:T.prog,borderRadius:13,padding:13,border:`1px solid ${editForm.cor}55`}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 64px',gap:8,marginBottom:10}}>
              <div><label style={LBL}>Nome</label><input style={INP2} value={editForm.nome} onChange={e=>setEditForm(p=>({...p,nome:e.target.value}))}/></div>
              <div><label style={LBL}>Ícone</label><input style={{...INP2,textAlign:'center',fontSize:20,padding:'6px 4px'}} value={editForm.icone} onChange={e=>setEditForm(p=>({...p,icone:e.target.value}))}/></div>
            </div>
            <div style={{marginBottom:10}}><label style={LBL}>Cor</label><ColorPicker value={editForm.cor} onChange={c=>setEditForm(p=>({...p,cor:c}))}/></div>
            <div style={{marginBottom:10}}>
              <label style={LBL}>Subcategorias</label>
              <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:7}}>{(editForm.subcats||[]).map(s=><span key={s} style={{background:`${editForm.cor}20`,color:editForm.cor,borderRadius:6,padding:'3px 8px',fontSize:11,display:'flex',alignItems:'center',gap:4}}>{s}<button onClick={()=>setEditForm(p=>({...p,subcats:p.subcats.filter(x=>x!==s)}))} style={{background:'none',border:'none',color:editForm.cor,cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>×</button></span>)}</div>
              <div style={{display:'flex',gap:6}}><input style={{...INP2,flex:1}} placeholder="Nova subcategoria..." value={newSubcat} onChange={e=>setNewSubcat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSubEdit()}/><BtnOk onClick={addSubEdit} color={editForm.cor} label="+"/></div>
            </div>
            <div style={{display:'flex',gap:6}}><BtnOk onClick={saveEditCat} color={editForm.cor} label="💾 Salvar"/><BtnX onClick={()=>setEditCat(null)}/></div>
          </div>
        ):(
          <div style={{...gls(T,12),display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
            <div style={{width:9,height:9,borderRadius:'50%',background:cat.cor,flexShrink:0}}/>
            <span style={{fontSize:16}}>{cat.icone}</span>
            <div style={{flex:1}}><p style={{margin:0,fontSize:12,fontWeight:600,color:T.text}}>{cat.nome}</p>{cat.subcats?.length>0&&<p style={{margin:'2px 0 0',fontSize:10,color:T.textMuted}}>{cat.subcats.join(' · ')}</p>}</div>
            <button onClick={()=>startEditCat(cat)} style={{background:T.prog,border:`1px solid ${T.divider}`,borderRadius:8,padding:'5px 10px',color:T.textSub,fontSize:11,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>✏️</button>
            <button onClick={()=>removeCat(cat.id)} style={{background:'none',border:'none',color:T.textMuted,fontSize:16,cursor:'pointer',padding:'0 2px'}}>×</button>
          </div>
        )}
      </div>)}
      {addingCat?(
        <div style={{background:T.prog,borderRadius:13,padding:13,border:`1px solid ${T.divider}`,marginTop:8}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 64px',gap:8,marginBottom:10}}>
            <div><label style={LBL}>Nome</label><input style={INP2} placeholder="Ex: Saúde" value={newCatForm.nome} onChange={e=>setNewCatForm(p=>({...p,nome:e.target.value}))}/></div>
            <div><label style={LBL}>Ícone</label><input style={{...INP2,textAlign:'center',fontSize:20,padding:'6px 4px'}} value={newCatForm.icone} onChange={e=>setNewCatForm(p=>({...p,icone:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:10}}><label style={LBL}>Cor</label><ColorPicker value={newCatForm.cor} onChange={c=>setNewCatForm(p=>({...p,cor:c}))}/></div>
          <div style={{marginBottom:10}}>
            <label style={LBL}>Subcategorias (opcional)</label>
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:7}}>{newCatForm.subcats.map(s=><span key={s} style={{background:`${newCatForm.cor}20`,color:newCatForm.cor,borderRadius:6,padding:'3px 8px',fontSize:11,display:'flex',alignItems:'center',gap:4}}>{s}<button onClick={()=>setNewCatForm(p=>({...p,subcats:p.subcats.filter(x=>x!==s)}))} style={{background:'none',border:'none',color:newCatForm.cor,cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>×</button></span>)}</div>
            <div style={{display:'flex',gap:6}}>
              <input style={{...INP2,flex:1}} placeholder="Adicionar..." value={newCatSubcat} onChange={e=>setNewCatSubcat(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&newCatSubcat.trim()){setNewCatForm(p=>({...p,subcats:[...p.subcats,newCatSubcat.trim()]}));setNewCatSubcat('')}}}/>
              <BtnOk onClick={()=>{if(!newCatSubcat.trim())return;setNewCatForm(p=>({...p,subcats:[...p.subcats,newCatSubcat.trim()]}));setNewCatSubcat('')}} color={newCatForm.cor} label="+"/>
            </div>
          </div>
          <div style={{display:'flex',gap:6}}><BtnOk onClick={addNewCat} color={T.accent} label="✓ Criar Categoria"/><BtnX onClick={()=>setAddingCat(false)}/></div>
        </div>
      ):<button onClick={()=>setAddingCat(true)} style={{width:'100%',padding:'11px',background:'transparent',border:`2px dashed ${T.divider}`,borderRadius:12,color:T.textMuted,fontSize:12,cursor:'pointer',fontWeight:600,fontFamily:"'Sora',sans-serif",marginTop:8}}>+ Nova Categoria</button>}
    </Sec>

    <Sec T={T} title={`🔁 Recorrentes — ${fmt(totalRec)}/mês`}>
      <p style={{fontSize:11,color:T.textMuted,marginTop:0,marginBottom:12}}>Aplicados automaticamente ao abrir um mês novo.</p>
      {(state.recorrentes||[]).map(r=>{const cat=CATS.find(c=>c.id===r.catId)||CATS[0];return(<div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:`1px solid ${T.divider}`,opacity:r.ativo?1:0.4}}>
        <button onClick={()=>toggleRec(r.id)} style={{width:18,height:18,borderRadius:4,border:`2px solid ${cat?.cor||T.accent}`,background:r.ativo?cat?.cor||T.accent:'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:700}}>{r.ativo?'✓':''}</button>
        <span style={{fontSize:14,width:20,textAlign:'center'}}>{cat?.icone}</span>
        <span style={{flex:1,fontSize:12,color:T.text}}>{r.nome}</span>
        <span style={{fontSize:12,fontWeight:600,color:cat?.cor}}>{fmt(r.valor)}</span>
        <button onClick={()=>removeRec(r.id)} style={{background:'none',border:'none',color:T.textMuted,fontSize:16,cursor:'pointer',padding:'0 2px'}}>×</button>
      </div>)})}
      {addRec?<div style={{display:'flex',gap:6,paddingTop:10,flexWrap:'wrap'}}>
        <input style={{...INP2,flex:1,minWidth:100}} placeholder="Descrição" value={recForm.nome} onChange={e=>setRecForm(p=>({...p,nome:e.target.value}))}/>
        <input style={{...INP2,width:90}} placeholder="0,00" value={recForm.valor} onChange={e=>setRecForm(p=>({...p,valor:e.target.value}))}/>
        <select style={{...INP2,width:130,cursor:'pointer'}} value={recForm.catId} onChange={e=>setRecForm(p=>({...p,catId:e.target.value}))}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select>
        <BtnOk onClick={addRecItem} color={T.accent}/><BtnX onClick={()=>setAddRec(false)}/>
      </div>:<button onClick={()=>setAddRec(true)} style={{background:'none',border:'none',color:T.accent,fontSize:11,cursor:'pointer',padding:'8px 0 0',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Adicionar recorrente</button>}
    </Sec>

    <Sec T={T} title="🎯 Limites de Orçamento">
      <p style={{fontSize:11,color:T.textMuted,marginTop:0,marginBottom:12}}>⚡ Aviso 80% · ⚠️ Alerta 100%</p>
      {CATS.map(cat=><div key={cat.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <span style={{fontSize:15,width:22,textAlign:'center'}}>{cat.icone}</span>
        <span style={{flex:1,fontSize:12,color:T.text}}>{cat.nome}</span>
        <div style={{position:'relative',width:130}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:T.textMuted,pointerEvents:'none'}}>R$</span>
          <input style={{...INP2,paddingLeft:28,textAlign:'right'}} value={orcLocal[cat.id]||''} onChange={e=>setOrcLocal(p=>({...p,[cat.id]:e.target.value}))}/>
        </div>
      </div>)}
      <BtnOk onClick={saveOrcamentos} color={T.accent} label="💾 Salvar Limites"/>
    </Sec>

    <Sec T={T} title="📤 Exportar Dados">
      <p style={{fontSize:11,color:T.textMuted,marginTop:0,marginBottom:14}}>CSV com subcategorias — compatível com Excel.</p>
      <BtnOk onClick={exportCSV} color={T.yellow} label="⬇️ Baixar CSV"/>
    </Sec>

    <Sec T={T} title="⚠️ Resetar Mês">
      <p style={{fontSize:11,color:T.textMuted,marginTop:0,marginBottom:12}}>Remove lançamentos de <b style={{color:T.text}}>{ml(month)}</b>. Parcelas não afetadas.</p>
      {confirmReset?<div style={{background:`${T.red}12`,border:`1px solid ${T.red}44`,borderRadius:12,padding:'12px 14px'}}>
        <p style={{margin:'0 0 12px',fontSize:12,color:T.red,fontWeight:600}}>Tem certeza? Não pode ser desfeito.</p>
        <div style={{display:'flex',gap:8}}><BtnOk onClick={resetMonth} color={T.red} label="Sim, limpar"/><BtnX onClick={()=>setConfirmReset(false)}/></div>
      </div>:<button onClick={()=>setConfirmReset(true)} style={{width:'100%',padding:'12px',background:'transparent',border:`1px solid ${T.red}55`,borderRadius:12,color:T.red,fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>🗑️ Limpar {ml(month)}</button>}
    </Sec>
  </div>)
}
