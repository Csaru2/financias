import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts'

const MF=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MS=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
const mk=(y,m)=>`${y}-${String(m).padStart(2,'0')}`
const pm=k=>{const[y,m]=k.split('-').map(Number);return{y,m}}
const am=(k,n)=>{const{y,m}=pm(k);const d=new Date(y,m-1+n);return mk(d.getFullYear(),d.getMonth()+1)}
const ml=k=>{const{y,m}=pm(k);return`${MF[m-1]} ${y}`}
const msh=k=>{const{y,m}=pm(k);return`${MS[m-1]}/${String(y).slice(2)}`}
const uid=()=>Math.random().toString(36).slice(2,9)

const CATS=[
  {id:'fixos',nome:'Gastos Fixos',cor:'#a78bfa',icone:'🏠'},
  {id:'cartao',nome:'Cartão de Crédito',cor:'#f59e0b',icone:'💳'},
  {id:'parcelado',nome:'Compras Parceladas',cor:'#34d399',icone:'📦'},
  {id:'alimentacao',nome:'Alimentação',cor:'#f87171',icone:'🍽️'},
]

const INP={background:'#090e1a',border:'1px solid #1f2d40',borderRadius:10,padding:'10px 12px',color:'#e2e8f0',fontSize:13,outline:'none',width:'100%',fontFamily:"'Sora',sans-serif",boxSizing:'border-box'}
const LBL={display:'block',fontSize:10,color:'#4b5e70',marginBottom:5,fontWeight:600,letterSpacing:0.5,textTransform:'uppercase'}

const PARCELAS_INIT=[
  {id:'p1',nome:'Compra de Pontos',valor:140,catId:'parcelado',ref:1,total:10},
  {id:'p2',nome:'Celular',valor:479.94,catId:'parcelado',ref:4,total:15},
  {id:'p3',nome:'Veterinário',valor:496,catId:'parcelado',ref:3,total:4},
  {id:'p4',nome:'Cadeira Isa',valor:109,catId:'parcelado',ref:1,total:2},
  {id:'p5',nome:'Pontos Nubank',valor:126,catId:'parcelado',ref:4,total:10},
]
const CARTAO_ABRIL=[
  {nome:'Wellhub',valor:69.99},{nome:'ChatGPT',valor:99.99},{nome:'Inglês/Espanhol',valor:220},
  {nome:'Microsoft',valor:60},{nome:'YouTube',valor:53.9},{nome:'iCloud',valor:19.9},
  {nome:'Vapor do Vinho',valor:286},{nome:'Netflix',valor:59.9},{nome:'Google One',valor:9.9},
  {nome:'Ração',valor:85.49},{nome:'Anuidade',valor:105},{nome:'Vivo',valor:40},{nome:'Compra Amazon',valor:55.84},
].map((i,idx)=>({...i,id:`c${idx}`,pago:false,nota:'',recorrenteId:null}))

function buildState(){
  const mesRef='2025-04'
  const parcelas=PARCELAS_INIT.map(p=>({...p,mesInicio:am(mesRef,-(p.ref-1))}))
  const meses={[mesRef]:{
    fixos:[
      {id:'f1',nome:'Terapia',valor:500,pago:true,nota:'',recorrenteId:'r10'},
      {id:'f2',nome:'Mãe',valor:500,pago:true,nota:'',recorrenteId:'r11'},
      {id:'f3',nome:'Leia',valor:200,pago:true,nota:'',recorrenteId:'r12'},
    ],
    cartao:CARTAO_ABRIL,parcelado:[],alimentacao:[],rendas:[],_seeded:true,
  }}
  parcelas.forEach(p=>{
    for(let i=0;i<p.total;i++){
      const m=am(p.mesInicio,i),num=i+1
      if(!meses[m])meses[m]={fixos:[],cartao:[],parcelado:[],alimentacao:[],rendas:[],_seeded:false}
      meses[m].parcelado.push({id:`${p.id}-${num}`,nome:`${p.nome} (${num}/${p.total})`,valor:p.valor,pago:false,nota:'',parcelaId:p.id})
    }
  })
  return{meses,parcelas,
    recorrentes:[
      {id:'r10',nome:'Terapia',valor:500,catId:'fixos',ativo:true},
      {id:'r11',nome:'Mãe',valor:500,catId:'fixos',ativo:true},
      {id:'r12',nome:'Leia',valor:200,catId:'fixos',ativo:true},
      {id:'r1',nome:'Wellhub',valor:69.99,catId:'cartao',ativo:true},
      {id:'r2',nome:'ChatGPT',valor:99.99,catId:'cartao',ativo:true},
      {id:'r3',nome:'Inglês/Espanhol',valor:220,catId:'cartao',ativo:true},
      {id:'r4',nome:'Microsoft',valor:60,catId:'cartao',ativo:true},
      {id:'r5',nome:'YouTube',valor:53.9,catId:'cartao',ativo:true},
      {id:'r6',nome:'iCloud',valor:19.9,catId:'cartao',ativo:true},
      {id:'r7',nome:'Netflix',valor:59.9,catId:'cartao',ativo:true},
      {id:'r8',nome:'Google One',valor:9.9,catId:'cartao',ativo:true},
      {id:'r9',nome:'Vivo',valor:40,catId:'cartao',ativo:true},
    ],
    orcamentos:{fixos:1300,cartao:1300,parcelado:1500,alimentacao:800},
  }
}

function ChartTooltip({active,payload,label}){
  if(!active||!payload||!payload.length)return null
  return(<div style={{background:'#1e293b',border:'1px solid #1f2d40',borderRadius:10,padding:'10px 14px',fontSize:11}}>
    <p style={{margin:'0 0 5px',color:'#94a3b8',fontWeight:600}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{margin:'2px 0',color:p.fill||p.color}}>{p.name}: {fmt(p.value)}</p>)}
  </div>)
}
function NavBtn({label,onClick}){return <button onClick={onClick} style={{width:32,height:32,background:'#111827',border:'1px solid #1f2d40',color:'#94a3b8',borderRadius:9,cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>{label}</button>}
function BtnOk({onClick,color}){return <button onClick={onClick} style={{background:color,border:'none',borderRadius:10,padding:'10px 14px',color:'#0f172a',fontWeight:700,cursor:'pointer',fontSize:13,fontFamily:"'Sora',sans-serif"}}>✓</button>}
function BtnCancel({onClick}){return <button onClick={onClick} style={{background:'#1e293b',border:'none',borderRadius:10,padding:'10px 12px',color:'#94a3b8',cursor:'pointer',fontSize:14,fontFamily:"'Sora',sans-serif"}}>✕</button>}
function Sec({title,children}){return <div style={{background:'#111827',borderRadius:17,padding:15,marginBottom:13,border:'1px solid #1f2d40'}}><h3 style={{margin:'0 0 13px',fontSize:10,fontWeight:700,color:'#4b5e70',textTransform:'uppercase',letterSpacing:1.2}}>{title}</h3>{children}</div>}
function Leg({color,label}){return <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:9,height:9,borderRadius:3,background:color,flexShrink:0}}/><span style={{fontSize:10,color:'#4b5e70'}}>{label}</span></div>}
function DonutSVG({slices,total}){
  const size=150,r=54,circ=2*Math.PI*r;let offset=0
  return(<div style={{display:'flex',alignItems:'center',gap:16}}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#090e1a" strokeWidth={22}/>
      {slices.map(s=>{const dash=(s.val/total)*circ,gap=circ-dash;const el=<circle key={s.id} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.cor} strokeWidth={20} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size/2} ${size/2})`}/>;offset+=dash;return el})}
      <text x={size/2} y={size/2-4} textAnchor="middle" fill="#4b5e70" fontSize="8" fontFamily="Sora,sans-serif" letterSpacing="1">TOTAL</text>
      <text x={size/2} y={size/2+13} textAnchor="middle" fill="#f59e0b" fontSize="12" fontFamily="Sora,sans-serif" fontWeight="700">{fmt(total)}</text>
    </svg>
    <div style={{flex:1,display:'flex',flexDirection:'column',gap:9}}>
      {slices.map(s=><div key={s.id} style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:7,height:7,borderRadius:'50%',background:s.cor,flexShrink:0}}/><span style={{flex:1,fontSize:11,color:'#4b5e70'}}>{s.nome}</span><span style={{fontSize:11,fontWeight:600,color:s.cor}}>{fmt(s.val)}</span><span style={{fontSize:9,color:'#4b5e70'}}>{((s.val/total)*100).toFixed(0)}%</span></div>)}
    </div>
  </div>)
}

export default function FinancasApp({session}){
  const [state,setState]=useState(null)
  const [month,setMonth]=useState(mk(new Date().getFullYear(),new Date().getMonth()+1))
  const [view,setView]=useState('mes')
  const [loading,setLoading]=useState(true)
  const [seeding,setSeeding]=useState(false)
  const [syncStatus,setSyncStatus]=useState('saved') // 'saved' | 'saving' | 'error'
  const saveTimerRef=useRef(null)

  useEffect(()=>{
    ;(async()=>{
      try{
        const{data,error}=await supabase.from('user_data').select('data').eq('user_id',session.user.id).single()
        if(error&&error.code!=='PGRST116')throw error
        setState(data?.data||buildState())
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
    const recs=(state.recorrentes||[]).filter(r=>r.ativo)
    const newMes={fixos:[],cartao:[],parcelado:[],alimentacao:[],rendas:[],...mes,_seeded:true}
    recs.forEach(r=>{if(!(newMes[r.catId]||[]).some(i=>i.recorrenteId===r.id))newMes[r.catId]=[...(newMes[r.catId]||[]),{id:uid(),nome:r.nome,valor:r.valor,pago:false,nota:'',recorrenteId:r.id}]})
    save({...state,meses:{...state.meses,[month]:newMes}}).then(()=>setSeeding(false))
  },[month,state,save,seeding])

  const logout=()=>supabase.auth.signOut()

  if(loading||!state)return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#090e1a',color:'#f59e0b',fontFamily:'Sora,sans-serif',gap:12}}>
      <div style={{width:22,height:22,borderRadius:'50%',border:'3px solid #f59e0b',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      Carregando seus dados...
    </div>
  )

  const curMes=state.meses[month]||{fixos:[],cartao:[],parcelado:[],alimentacao:[],rendas:[],_seeded:false}
  const totalRenda=(curMes.rendas||[]).reduce((s,r)=>s+r.valor,0)
  const totalGastos=CATS.flatMap(c=>curMes[c.id]||[]).reduce((s,i)=>s+i.valor,0)
  const saldo=totalRenda-totalGastos
  const userName=session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Você'
  const tabSt=v=>({flex:1,padding:'9px 2px',borderRadius:10,border:'none',cursor:'pointer',transition:'all 0.2s',background:view===v?'#090e1a':'transparent',color:view===v?'#f59e0b':'#4b5e70',fontWeight:view===v?700:500,fontSize:11,fontFamily:"'Sora',sans-serif"})

  const syncIcon=syncStatus==='saving'?'🔄':syncStatus==='error'?'⚠️':'✓'
  const syncColor=syncStatus==='saving'?'#4b5e70':syncStatus==='error'?'#f87171':'#34d399'

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#090e1a 0%,#0d1424 60%,#0a1020 100%)',padding:'20px 16px 100px',fontFamily:"'Sora',sans-serif",color:'#e2e8f0',maxWidth:500,margin:'0 auto'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&display=swap');*{box-sizing:border-box;}body{margin:0;background:#090e1a;}@keyframes spin{to{transform:rotate(360deg);}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}button,input,select,textarea{font-family:'Sora',sans-serif;}input::placeholder,textarea::placeholder{color:#2a3a4a;}.item-row:hover{background:#ffffff06;border-radius:7px;}input[type=month]::-webkit-calendar-picker-indicator{filter:invert(0.4);}`}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <p style={{margin:0,fontSize:10,color:'#4b5e70',letterSpacing:3,textTransform:'uppercase'}}>Finanças Pessoais</p>
          <h1 style={{margin:'3px 0 0',fontSize:24,fontWeight:800,letterSpacing:-1}}>{ml(month)}</h1>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <NavBtn label="‹" onClick={()=>setMonth(am(month,-1))}/>
            <button onClick={()=>setMonth(mk(new Date().getFullYear(),new Date().getMonth()+1))} style={{background:'#111827',border:'1px solid #1f2d40',color:'#4b5e70',borderRadius:8,padding:'5px 9px',fontSize:10,cursor:'pointer',fontWeight:600,letterSpacing:0.5,fontFamily:"'Sora',sans-serif"}}>HOJE</button>
            <NavBtn label="›" onClick={()=>setMonth(am(month,1))}/>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:syncColor,fontWeight:600}}>{syncIcon} {syncStatus==='saving'?'Salvando...':syncStatus==='error'?'Erro ao salvar':'Salvo'}</span>
            <span style={{fontSize:10,color:'#4b5e70'}}>|</span>
            <span style={{fontSize:10,color:'#4b5e70'}}>👤 {userName}</span>
            <button onClick={logout} style={{background:'none',border:'1px solid #1f2d40',borderRadius:7,padding:'3px 8px',color:'#4b5e70',fontSize:10,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>Sair</button>
          </div>
        </div>
      </div>

      {totalRenda>0&&<div style={{background:saldo>=0?'#081a0f':'#1a0808',border:`1px solid ${saldo>=0?'#34d39933':'#f8717133'}`,borderRadius:16,padding:'12px 16px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><p style={{margin:0,fontSize:10,color:'#4b5e70',textTransform:'uppercase',letterSpacing:0.5}}>Saldo do Mês</p><p style={{margin:'3px 0 0',fontSize:22,fontWeight:800,color:saldo>=0?'#34d399':'#f87171',letterSpacing:-1}}>{saldo>=0?'':'-'}{fmt(Math.abs(saldo))}</p></div>
        <div style={{textAlign:'right',fontSize:11,color:'#4b5e70',lineHeight:1.9}}><div>Renda: <b style={{color:'#34d399'}}>{fmt(totalRenda)}</b></div><div>Gastos: <b style={{color:'#f87171'}}>{fmt(totalGastos)}</b></div></div>
        <div style={{fontSize:28}}>{saldo>=0?'😊':'😬'}</div>
      </div>}

      <div style={{display:'flex',background:'#111827',borderRadius:14,padding:4,marginBottom:18,gap:3,border:'1px solid #1f2d40'}}>
        <button style={tabSt('mes')} onClick={()=>setView('mes')}>💳 Mês</button>
        <button style={tabSt('graficos')} onClick={()=>setView('graficos')}>📊 Gráficos</button>
        <button style={tabSt('parcelas')} onClick={()=>setView('parcelas')}>🗓️ Parcelas</button>
        <button style={tabSt('config')} onClick={()=>setView('config')}>⚙️ Config</button>
      </div>

      {view==='mes'&&<MesView state={state} save={save} month={month} curMes={curMes} totalRenda={totalRenda} totalGastos={totalGastos}/>}
      {view==='graficos'&&<GraficosView state={state} month={month}/>}
      {view==='parcelas'&&<ParcelasView state={state} save={save} month={month}/>}
      {view==='config'&&<ConfigView state={state} save={save} month={month}/>}
    </div>
  )
}

function MesView({state,save,month,curMes,totalRenda,totalGastos}){
  const[open,setOpen]=useState(null)
  const[addCat,setAddCat]=useState(null)
  const[form,setForm]=useState({nome:'',valor:''})
  const[busca,setBusca]=useState('')
  const[addRenda,setAddRenda]=useState(false)
  const[rendaForm,setRendaForm]=useState({nome:'',valor:''})
  const[notaOpen,setNotaOpen]=useState(null)
  const totalPago=CATS.flatMap(c=>curMes[c.id]||[]).filter(i=>i.pago).reduce((s,i)=>s+i.valor,0)
  const pct=totalGastos>0?(totalPago/totalGastos)*100:0
  const updMes=(catId,items)=>save({...state,meses:{...state.meses,[month]:{...curMes,[catId]:items}}})
  const togglePago=(catId,id)=>updMes(catId,(curMes[catId]||[]).map(i=>i.id===id?{...i,pago:!i.pago}:i))
  const removeItem=(catId,id)=>updMes(catId,(curMes[catId]||[]).filter(i=>i.id!==id))
  const saveNota=(catId,id,nota)=>updMes(catId,(curMes[catId]||[]).map(i=>i.id===id?{...i,nota}:i))
  const addItem=catId=>{const v=parseFloat(form.valor.replace(',','.'));if(!form.nome||isNaN(v))return;updMes(catId,[...(curMes[catId]||[]),{id:uid(),nome:form.nome,valor:v,pago:false,nota:'',recorrenteId:null}]);setForm({nome:'',valor:''});setAddCat(null)}
  const addRendaItem=()=>{const v=parseFloat(rendaForm.valor.replace(',','.'));if(!rendaForm.nome||isNaN(v))return;save({...state,meses:{...state.meses,[month]:{...curMes,rendas:[...(curMes.rendas||[]),{id:uid(),nome:rendaForm.nome,valor:v}]}}});setRendaForm({nome:'',valor:''});setAddRenda(false)}
  const removeRenda=id=>save({...state,meses:{...state.meses,[month]:{...curMes,rendas:(curMes.rendas||[]).filter(r=>r.id!==id)}}})
  const buscaLow=busca.toLowerCase().trim()
  const buscaAtiva=buscaLow.length>1
  const todosItens=buscaAtiva?CATS.flatMap(c=>(curMes[c.id]||[]).filter(i=>i.nome.toLowerCase().includes(buscaLow)).map(i=>({...i,catCor:c.cor,catNome:c.nome}))):[]
  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    <Sec title="💰 Rendas do Mês">
      {(curMes.rendas||[]).length===0&&!addRenda&&<p style={{color:'#4b5e70',fontSize:12,textAlign:'center',padding:'4px 0 8px'}}>Nenhuma renda lançada.</p>}
      {(curMes.rendas||[]).map(r=><div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #1f2d4022'}}>
        <span style={{fontSize:14}}>💵</span><span style={{flex:1,fontSize:12,color:'#86efac'}}>{r.nome}</span>
        <span style={{fontSize:13,fontWeight:700,color:'#34d399'}}>{fmt(r.valor)}</span>
        <button onClick={()=>removeRenda(r.id)} style={{background:'none',border:'none',color:'#4b5e70',fontSize:17,cursor:'pointer',padding:'0 2px'}}>×</button>
      </div>)}
      {addRenda?<div style={{display:'flex',gap:6,paddingTop:10,flexWrap:'wrap'}}>
        <input style={{...INP,flex:1,minWidth:120}} placeholder="Ex: Salário..." value={rendaForm.nome} onChange={e=>setRendaForm(p=>({...p,nome:e.target.value}))}/>
        <input style={{...INP,width:110}} placeholder="0,00" value={rendaForm.valor} onChange={e=>setRendaForm(p=>({...p,valor:e.target.value}))}/>
        <BtnOk onClick={addRendaItem} color="#34d399"/><BtnCancel onClick={()=>setAddRenda(false)}/>
      </div>:<button onClick={()=>setAddRenda(true)} style={{background:'none',border:'none',color:'#34d399',fontSize:11,cursor:'pointer',padding:'8px 0 0',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Adicionar renda</button>}
    </Sec>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
      {[[fmt(totalGastos),'Total','#f59e0b'],[fmt(totalPago),'Pago','#34d399'],[fmt(totalGastos-totalPago),'Pendente','#f87171']].map(([v,l,c])=><div key={l} style={{background:'#111827',borderRadius:13,padding:'11px 8px',border:`1px solid ${c}22`,textAlign:'center'}}><p style={{margin:0,fontSize:9,color:'#4b5e70',textTransform:'uppercase',letterSpacing:0.5}}>{l}</p><p style={{margin:'4px 0 0',fontSize:12,fontWeight:700,color:c}}>{v}</p></div>)}
    </div>
    <div style={{background:'#111827',borderRadius:13,padding:13,marginBottom:12,border:'1px solid #1f2d40'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}><span style={{fontSize:11,color:'#4b5e70'}}>Pagamentos realizados</span><span style={{fontSize:11,fontWeight:700,color:pct===100?'#34d399':'#f59e0b'}}>{pct.toFixed(0)}%</span></div>
      <div style={{height:6,background:'#090e1a',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:pct===100?'linear-gradient(90deg,#34d399,#059669)':'linear-gradient(90deg,#f59e0b,#d97706)',borderRadius:99,transition:'width 0.6s ease'}}/></div>
    </div>
    <div style={{position:'relative',marginBottom:14}}>
      <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'#4b5e70',pointerEvents:'none'}}>🔍</span>
      <input style={{...INP,paddingLeft:36}} placeholder="Buscar lançamento..." value={busca} onChange={e=>setBusca(e.target.value)}/>
      {busca&&<button onClick={()=>setBusca('')} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'#4b5e70',fontSize:16,cursor:'pointer'}}>×</button>}
    </div>
    {buscaAtiva&&<Sec title={`${todosItens.length} resultado(s)`}>
      {todosItens.length===0&&<p style={{color:'#4b5e70',fontSize:12,textAlign:'center',padding:'8px 0'}}>Nenhum item encontrado.</p>}
      {todosItens.map(item=><div key={item.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #1f2d4022'}}>
        <div style={{width:7,height:7,borderRadius:'50%',background:item.catCor,flexShrink:0}}/><span style={{flex:1,fontSize:12}}>{item.nome}</span>
        <span style={{fontSize:11,color:'#4b5e70',marginRight:4}}>{item.catNome.split(' ')[0]}</span>
        <span style={{fontSize:12,fontWeight:600,color:item.catCor}}>{fmt(item.valor)}</span>
      </div>)}
    </Sec>}
    {!buscaAtiva&&CATS.map(cat=>{
      const items=curMes[cat.id]||[]
      const sub=items.reduce((s,i)=>s+i.valor,0)
      const orc=state.orcamentos[cat.id]||0
      const pctOrc=orc>0?(sub/orc)*100:0
      const alerta=orc>0&&pctOrc>=100
      const aviso=orc>0&&pctOrc>=80&&!alerta
      const isOpen=open===cat.id
      return(<div key={cat.id} style={{background:'#111827',borderRadius:16,border:`1px solid ${alerta?'#f8717155':aviso?'#f59e0b44':'#1f2d40'}`,overflow:'hidden',marginBottom:9,transition:'border-color 0.2s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'13px 15px',cursor:'pointer',userSelect:'none'}} onClick={()=>setOpen(isOpen?null:cat.id)}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:3,height:34,borderRadius:99,background:cat.cor,flexShrink:0}}/><span style={{fontSize:18}}>{cat.icone}</span>
            <div><p style={{margin:0,fontWeight:600,fontSize:13}}>{cat.nome}</p><p style={{margin:0,fontSize:10,color:'#4b5e70'}}>{items.filter(i=>i.pago).length}/{items.length} pagos{orc>0&&<span style={{color:alerta?'#f87171':aviso?'#f59e0b':'#4b5e70'}}> · {pctOrc.toFixed(0)}% do orç.</span>}</p></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            {alerta&&<span style={{fontSize:10,background:'#f8717122',color:'#f87171',borderRadius:6,padding:'2px 6px',fontWeight:700}}>⚠️ Estourado</span>}
            {aviso&&<span style={{fontSize:10,background:'#f59e0b22',color:'#f59e0b',borderRadius:6,padding:'2px 6px',fontWeight:700}}>⚡ Atenção</span>}
            <span style={{color:cat.cor,fontWeight:700,fontSize:14}}>{fmt(sub)}</span>
            <span style={{color:'#4b5e70',fontSize:14,transition:'transform 0.25s',display:'inline-block',transform:isOpen?'rotate(180deg)':'rotate(0deg)'}}>▾</span>
          </div>
        </div>
        {orc>0&&<div style={{height:3,background:'#090e1a'}}><div style={{height:'100%',width:`${Math.min(pctOrc,100)}%`,background:alerta?'#f87171':aviso?'#f59e0b':cat.cor,transition:'width 0.4s'}}/></div>}
        {isOpen&&<div style={{padding:'8px 15px 14px',borderTop:'1px solid #090e1a'}}>
          {items.length===0&&<p style={{textAlign:'center',color:'#4b5e70',fontSize:12,padding:'10px 0'}}>Sem lançamentos.</p>}
          {items.map(item=><div key={item.id} className="item-row" style={{padding:'6px 4px',transition:'background 0.15s',opacity:item.pago?0.45:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>togglePago(cat.id,item.id)} style={{width:19,height:19,borderRadius:5,border:`2px solid ${cat.cor}`,background:item.pago?cat.cor:'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#0f172a',fontSize:10,fontWeight:700,transition:'all 0.15s'}}>{item.pago?'✓':''}</button>
              <span style={{flex:1,fontSize:12,textDecoration:item.pago?'line-through':'none'}}>{item.nome}</span>
              <span style={{fontSize:12,fontWeight:600,flexShrink:0}}>{fmt(item.valor)}</span>
              <button onClick={()=>setNotaOpen(notaOpen===item.id?null:item.id)} title="Nota" style={{background:'none',border:'none',fontSize:12,cursor:'pointer',padding:'0 2px',opacity:item.nota?1:0.3}}>📝</button>
              <button onClick={()=>removeItem(cat.id,item.id)} style={{background:'none',border:'none',color:'#4b5e70',fontSize:16,cursor:'pointer',padding:'0 2px',lineHeight:1}}>×</button>
            </div>
            {notaOpen===item.id&&<textarea style={{...INP,marginTop:6,fontSize:11,resize:'none',height:56,borderColor:`${cat.cor}44`}} placeholder="Adicionar nota..." value={item.nota||''} onChange={e=>saveNota(cat.id,item.id,e.target.value)}/>}
            {item.nota&&notaOpen!==item.id&&<p style={{margin:'2px 0 0 27px',fontSize:10,color:'#4b5e70',fontStyle:'italic'}}>📝 {item.nota}</p>}
          </div>)}
          {addCat===cat.id?<div style={{display:'flex',gap:6,paddingTop:10,flexWrap:'wrap'}}>
            <input style={{...INP,flex:1,minWidth:110}} placeholder="Descrição" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/>
            <input style={{...INP,width:100}} placeholder="0,00" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/>
            <BtnOk onClick={()=>addItem(cat.id)} color={cat.cor}/><BtnCancel onClick={()=>setAddCat(null)}/>
          </div>:<button onClick={()=>{setAddCat(cat.id);setForm({nome:'',valor:''})}} style={{background:'none',border:'none',color:cat.cor,fontSize:11,cursor:'pointer',padding:'8px 0 0',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Adicionar lançamento</button>}
        </div>}
      </div>)
    })}
  </div>)
}

function GraficosView({state,month}){
  const barData=Array.from({length:11},(_,i)=>{const m=am(month,-3+i),d=state.meses[m]||{};const total=CATS.reduce((s,c)=>s+(d[c.id]||[]).reduce((ss,j)=>ss+j.valor,0),0);return{label:msh(m),total,current:m===month}})
  const mesD=state.meses[month]||{}
  const slices=CATS.map(c=>({...c,val:(mesD[c.id]||[]).reduce((s,i)=>s+i.valor,0)})).filter(s=>s.val>0)
  const totalMes=slices.reduce((s,c)=>s+c.val,0)
  const prev=am(month,-1),prevD=state.meses[prev]||{}
  const compData=CATS.map(c=>({label:c.nome.split(' ')[0],atual:(mesD[c.id]||[]).reduce((s,i)=>s+i.valor,0),anterior:(prevD[c.id]||[]).reduce((s,i)=>s+i.valor,0),cor:c.cor}))
  const projData=Array.from({length:10},(_,i)=>{const m=am(month,i),d=state.meses[m]||{};const parc=(d.parcelado||[]).reduce((s,i)=>s+i.valor,0);const outros=CATS.filter(c=>c.id!=='parcelado').reduce((s,c)=>s+(d[c.id]||[]).reduce((ss,i)=>ss+i.valor,0),0);return{label:msh(m),parc,outros,total:parc+outros}})
  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    <Sec title={`Distribuição — ${ml(month)}`}>{totalMes===0?<p style={{textAlign:'center',color:'#4b5e70',fontSize:13,padding:'16px 0'}}>Sem lançamentos neste mês.</p>:<DonutSVG slices={slices} total={totalMes}/>}</Sec>
    <Sec title="Total por Mês"><ResponsiveContainer width="100%" height={175}><BarChart data={barData} margin={{top:4,right:0,bottom:0,left:0}} barSize={14}><XAxis dataKey="label" tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="total" radius={[5,5,0,0]} name="Gastos">{barData.map((e,i)=><Cell key={i} fill={e.current?'#f59e0b':i<3?'#1a3050':'#1a2535'}/>)}</Bar></BarChart></ResponsiveContainer></Sec>
    <Sec title={`Comparativo — ${ml(month)} vs ${ml(prev)}`}><ResponsiveContainer width="100%" height={160}><BarChart data={compData} margin={{top:4,right:0,bottom:0,left:0}} barSize={13} barGap={4}><XAxis dataKey="label" tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="anterior" name={ml(prev)} radius={[4,4,0,0]}>{compData.map((e,i)=><Cell key={i} fill={e.cor+'55'}/>)}</Bar><Bar dataKey="atual" name={ml(month)} radius={[4,4,0,0]}>{compData.map((e,i)=><Cell key={i} fill={e.cor}/>)}</Bar></BarChart></ResponsiveContainer><div style={{display:'flex',gap:12,paddingTop:6,flexWrap:'wrap'}}>{CATS.map(c=><Leg key={c.id} color={c.cor} label={c.nome.split(' ')[0]}/>)}</div></Sec>
    <Sec title="Projeção — Impacto das Parcelas"><ResponsiveContainer width="100%" height={185}><BarChart data={projData} margin={{top:4,right:0,bottom:0,left:0}} barSize={18}><XAxis dataKey="label" tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="outros" stackId="a" fill="#1e3050" name="Outros" radius={[0,0,0,0]}/><Bar dataKey="parc" stackId="a" fill="#34d399" name="Parcelas" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer><div style={{display:'flex',gap:14,paddingTop:4}}><Leg color="#1e3050" label="Outros gastos"/><Leg color="#34d399" label="Parcelas"/></div></Sec>
    <Sec title="Tendência Total"><ResponsiveContainer width="100%" height={150}><LineChart data={projData} margin={{top:5,right:10,bottom:0,left:0}}><CartesianGrid stroke="#1a2535" strokeDasharray="4 4"/><XAxis dataKey="label" tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#4b5e70',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/><Tooltip content={<ChartTooltip/>}/><Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={{r:2,fill:'#f59e0b'}} name="Total"/><Line type="monotone" dataKey="parc" stroke="#34d399" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Parcelas"/></LineChart></ResponsiveContainer></Sec>
  </div>)
}

function ParcelasView({state,save,month}){
  const[showForm,setShowForm]=useState(false)
  const[form,setForm]=useState({nome:'',valor:'',total:'',ref:'',mesRef:month,catId:'parcelado'})
  const addParcela=()=>{
    const valor=parseFloat(form.valor.replace(',','.'))
    const total=parseInt(form.total),ref=parseInt(form.ref)
    if(!form.nome||isNaN(valor)||isNaN(total)||isNaN(ref)||ref<1||ref>total)return
    const mesInicio=am(form.mesRef,-(ref-1))
    const newP={id:uid(),nome:form.nome,valor,catId:form.catId,mesRef:form.mesRef,ref,total,mesInicio}
    let meses={...state.meses}
    for(let i=0;i<total;i++){
      const m=am(mesInicio,i),num=i+1
      if(!meses[m])meses[m]={fixos:[],cartao:[],parcelado:[],alimentacao:[],rendas:[],_seeded:false}
      meses[m]={...meses[m],[newP.catId]:[...(meses[m][newP.catId]||[]),{id:`${newP.id}-${num}`,nome:`${newP.nome} (${num}/${total})`,valor,pago:false,nota:'',parcelaId:newP.id}]}
    }
    save({...state,meses,parcelas:[...state.parcelas,newP]})
    setShowForm(false);setForm({nome:'',valor:'',total:'',ref:'',mesRef:month,catId:'parcelado'})
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
    <Sec title={`Parcelas Ativas — ${state.parcelas.length}`}>
      {state.parcelas.length===0&&<p style={{color:'#4b5e70',textAlign:'center',fontSize:13,padding:'12px 0'}}>Nenhuma parcela cadastrada.</p>}
      {state.parcelas.map(p=>{
        const mesFim=am(p.mesInicio,p.total-1)
        const{y:cy,m:cm}=pm(month),{y:sy,m:sm}=pm(p.mesInicio)
        const atual=Math.min(Math.max((cy-sy)*12+(cm-sm)+1,1),p.total)
        const pct=(atual/p.total)*100
        const cat=CATS.find(c=>c.id===p.catId)||CATS[2]
        const restante=p.total-atual
        return(<div key={p.id} style={{background:'#090e1a',borderRadius:13,padding:13,marginBottom:9,border:'1px solid #1f2d40'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:9}}>
            <div style={{flex:1}}><p style={{margin:0,fontWeight:700,fontSize:13}}>{p.nome}</p><p style={{margin:'3px 0 0',fontSize:10,color:'#4b5e70'}}>{cat.icone} {cat.nome} · {atual}/{p.total} · até {ml(mesFim)}</p></div>
            <div style={{textAlign:'right',flexShrink:0}}><p style={{margin:0,fontWeight:700,color:cat.cor,fontSize:14}}>{fmt(p.valor)}<span style={{fontSize:10,fontWeight:400,color:'#4b5e70'}}>/mês</span></p><p style={{margin:'2px 0 0',fontSize:10,color:'#4b5e70'}}>{restante>0?`${restante} restantes`:'✅ Quitado'}</p></div>
          </div>
          <div style={{height:4,background:'#1a2535',borderRadius:99,overflow:'hidden',marginBottom:9}}><div style={{height:'100%',width:`${pct}%`,background:cat.cor,borderRadius:99,transition:'width 0.5s'}}/></div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:10,color:'#4b5e70'}}>Total: <b style={{color:'#94a3b8'}}>{fmt(p.valor*p.total)}</b> · A pagar: <b style={{color:cat.cor}}>{fmt(p.valor*restante)}</b></span>
            <button onClick={()=>removeParcela(p.id)} style={{background:'#1a2535',border:'1px solid #1f2d40',borderRadius:8,padding:'4px 10px',color:'#f87171',fontSize:11,cursor:'pointer',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>Remover</button>
          </div>
        </div>)
      })}
    </Sec>
    {liberation.length>0&&<Sec title="📅 Projeção de Liberação de Orçamento">
      <p style={{fontSize:11,color:'#4b5e70',marginTop:0,marginBottom:12}}>Quando cada parcela termina e quanto libera mensalmente.</p>
      {Object.entries(libByMonth).map(([m,ps])=>{
        const totalLib=ps.reduce((s,p)=>s+p.valor,0)
        return(<div key={m} style={{background:'#090e1a',borderRadius:12,padding:'11px 13px',marginBottom:8,border:'1px solid #34d39933'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}><span style={{fontSize:12,fontWeight:700,color:'#34d399'}}>{ml(m)}</span><span style={{fontSize:14,fontWeight:800,color:'#34d399'}}>+{fmt(totalLib)}/mês</span></div>
          {ps.map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#4b5e70',padding:'2px 0'}}><span>✓ {p.nome} termina</span><span style={{color:'#86efac'}}>{fmt(p.valor)}</span></div>)}
        </div>)
      })}
    </Sec>}
    {showForm?<Sec title="Adicionar Nova Parcela">
      <div style={{display:'flex',flexDirection:'column',gap:11}}>
        <div><label style={LBL}>Descrição</label><input style={INP} placeholder="Ex: TV Samsung..." value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={LBL}>Valor da parcela (R$)</label><input style={INP} placeholder="0,00" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/></div>
          <div><label style={LBL}>Total de parcelas</label><input style={INP} placeholder="12" type="number" min="1" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))}/></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <div><label style={LBL}>Parcela atual (nº)</label><input style={INP} placeholder="3" type="number" min="1" value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))}/></div>
          <div><label style={LBL}>Mês de referência</label><input style={INP} type="month" value={form.mesRef} onChange={e=>setForm(p=>({...p,mesRef:e.target.value}))}/></div>
        </div>
        <div><label style={LBL}>Categoria</label><select style={{...INP,cursor:'pointer'}} value={form.catId} onChange={e=>setForm(p=>({...p,catId:e.target.value}))}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select></div>
        {form.nome&&form.valor&&form.total&&form.ref&&<div style={{background:'#090e1a',borderRadius:9,padding:'9px 12px',fontSize:11,color:'#4b5e70',border:'1px solid #1f2d40'}}>
          💡 <b style={{color:'#e2e8f0'}}>{form.nome}</b> — {fmt(parseFloat(form.valor.replace(',','.'))||0)}/mês, parcela {form.ref}/{form.total} em {ml(form.mesRef)}. Termina em <b style={{color:'#f59e0b'}}>{ml(am(am(form.mesRef,-(parseInt(form.ref)-1)),parseInt(form.total)-1))}</b>.
        </div>}
        <div style={{display:'flex',gap:8}}>
          <button onClick={addParcela} style={{flex:1,padding:'13px',background:'linear-gradient(135deg,#34d399,#059669)',border:'none',borderRadius:12,color:'#0f172a',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>✓ Adicionar Parcela</button>
          <BtnCancel onClick={()=>setShowForm(false)}/>
        </div>
      </div>
    </Sec>:<button onClick={()=>setShowForm(true)} style={{width:'100%',padding:'14px',background:'transparent',border:'2px dashed #1f2d40',borderRadius:14,color:'#4b5e70',fontSize:12,cursor:'pointer',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Nova Parcela</button>}
  </div>)
}

function ConfigView({state,save,month}){
  const[addRec,setAddRec]=useState(false)
  const[recForm,setRecForm]=useState({nome:'',valor:'',catId:'cartao'})
  const[orcLocal,setOrcLocal]=useState({...state.orcamentos})
  const[confirmReset,setConfirmReset]=useState(false)
  const toggleRec=id=>save({...state,recorrentes:state.recorrentes.map(r=>r.id===id?{...r,ativo:!r.ativo}:r)})
  const removeRec=id=>save({...state,recorrentes:state.recorrentes.filter(r=>r.id!==id)})
  const addRecItem=()=>{const v=parseFloat(recForm.valor.replace(',','.'));if(!recForm.nome||isNaN(v))return;save({...state,recorrentes:[...state.recorrentes,{id:uid(),nome:recForm.nome,valor:v,catId:recForm.catId,ativo:true}]});setRecForm({nome:'',valor:'',catId:'cartao'});setAddRec(false)}
  const saveOrcamentos=()=>{const parsed={};Object.entries(orcLocal).forEach(([k,v])=>{const n=parseFloat(String(v).replace(',','.'));parsed[k]=isNaN(n)?0:n});save({...state,orcamentos:parsed})}
  const exportCSV=()=>{
    const rows=[['Mês','Categoria','Item','Valor (R$)','Pago','Nota']]
    Object.entries(state.meses).sort().forEach(([m,data])=>{CATS.forEach(c=>(data[c.id]||[]).forEach(i=>rows.push([ml(m),c.nome,i.nome,i.valor.toFixed(2).replace('.',','),i.pago?'Sim':'Não',i.nota||''])));(data.rendas||[]).forEach(r=>rows.push([ml(m),'Renda',r.nome,r.valor.toFixed(2).replace('.',','),'—','']))})
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`financas_${month}.csv`;a.click()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const resetMonth=()=>{save({...state,meses:{...state.meses,[month]:{fixos:[],cartao:[],parcelado:[],alimentacao:[],rendas:[],_seeded:false}}});setConfirmReset(false)}
  const totalRec=(state.recorrentes||[]).filter(r=>r.ativo).reduce((s,r)=>s+r.valor,0)
  return(<div style={{animation:'fadeIn 0.25s ease'}}>
    <Sec title={`🔁 Gastos Recorrentes — ${fmt(totalRec)}/mês`}>
      <p style={{fontSize:11,color:'#4b5e70',marginTop:0,marginBottom:12}}>Aplicados automaticamente ao abrir um mês pela primeira vez.</p>
      {(state.recorrentes||[]).map(r=>{const cat=CATS.find(c=>c.id===r.catId)||CATS[1];return(<div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #1f2d4022',opacity:r.ativo?1:0.4,transition:'opacity 0.2s'}}>
        <button onClick={()=>toggleRec(r.id)} style={{width:18,height:18,borderRadius:5,border:`2px solid ${cat.cor}`,background:r.ativo?cat.cor:'transparent',flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#0f172a',fontSize:9,fontWeight:700,transition:'all 0.15s'}}>{r.ativo?'✓':''}</button>
        <span style={{fontSize:14,width:20,textAlign:'center'}}>{cat.icone}</span><span style={{flex:1,fontSize:12}}>{r.nome}</span>
        <span style={{fontSize:12,fontWeight:600,color:cat.cor}}>{fmt(r.valor)}</span>
        <button onClick={()=>removeRec(r.id)} style={{background:'none',border:'none',color:'#4b5e70',fontSize:16,cursor:'pointer',padding:'0 2px'}}>×</button>
      </div>)})}
      {addRec?<div style={{display:'flex',gap:6,paddingTop:10,flexWrap:'wrap'}}>
        <input style={{...INP,flex:1,minWidth:100}} placeholder="Descrição" value={recForm.nome} onChange={e=>setRecForm(p=>({...p,nome:e.target.value}))}/>
        <input style={{...INP,width:90}} placeholder="0,00" value={recForm.valor} onChange={e=>setRecForm(p=>({...p,valor:e.target.value}))}/>
        <select style={{...INP,width:120,cursor:'pointer'}} value={recForm.catId} onChange={e=>setRecForm(p=>({...p,catId:e.target.value}))}>{CATS.map(c=><option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}</select>
        <BtnOk onClick={addRecItem} color="#a78bfa"/><BtnCancel onClick={()=>setAddRec(false)}/>
      </div>:<button onClick={()=>setAddRec(true)} style={{background:'none',border:'none',color:'#a78bfa',fontSize:11,cursor:'pointer',padding:'8px 0 0',fontWeight:600,fontFamily:"'Sora',sans-serif"}}>+ Adicionar recorrente</button>}
    </Sec>
    <Sec title="🎯 Limites de Orçamento por Categoria">
      <p style={{fontSize:11,color:'#4b5e70',marginTop:0,marginBottom:12}}>⚡ Aviso em 80% · ⚠️ Alerta em 100% do limite</p>
      {CATS.map(cat=><div key={cat.id} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <span style={{fontSize:16,width:22,textAlign:'center'}}>{cat.icone}</span><span style={{flex:1,fontSize:12}}>{cat.nome}</span>
        <div style={{position:'relative',width:130}}>
          <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#4b5e70',pointerEvents:'none'}}>R$</span>
          <input style={{...INP,paddingLeft:28,textAlign:'right'}} value={orcLocal[cat.id]||''} onChange={e=>setOrcLocal(p=>({...p,[cat.id]:e.target.value}))}/>
        </div>
      </div>)}
      <button onClick={saveOrcamentos} style={{width:'100%',padding:'12px',background:'linear-gradient(135deg,#a78bfa,#7c3aed)',border:'none',borderRadius:12,color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',marginTop:4,fontFamily:"'Sora',sans-serif"}}>💾 Salvar Limites</button>
    </Sec>
    <Sec title="📤 Exportar Dados">
      <p style={{fontSize:11,color:'#4b5e70',marginTop:0,marginBottom:14}}>CSV compatível com Excel — todos os meses lançados.</p>
      <button onClick={exportCSV} style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,#f59e0b,#d97706)',border:'none',borderRadius:12,color:'#0f172a',fontWeight:800,fontSize:13,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>⬇️ Baixar CSV completo</button>
    </Sec>
    <Sec title="⚠️ Mês Atual">
      <p style={{fontSize:11,color:'#4b5e70',marginTop:0,marginBottom:12}}>Remove os lançamentos manuais de <b style={{color:'#e2e8f0'}}>{ml(month)}</b>. Parcelas não são afetadas.</p>
      {confirmReset?<div style={{background:'#f8717111',border:'1px solid #f8717144',borderRadius:12,padding:'12px 14px'}}>
        <p style={{margin:'0 0 12px',fontSize:12,color:'#f87171',fontWeight:600}}>Tem certeza? Esta ação não pode ser desfeita.</p>
        <div style={{display:'flex',gap:8}}>
          <button onClick={resetMonth} style={{flex:1,padding:'10px',background:'#f87171',border:'none',borderRadius:10,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>Sim, limpar</button>
          <button onClick={()=>setConfirmReset(false)} style={{flex:1,padding:'10px',background:'#1e293b',border:'none',borderRadius:10,color:'#94a3b8',fontSize:12,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>Cancelar</button>
        </div>
      </div>:<button onClick={()=>setConfirmReset(true)} style={{width:'100%',padding:'12px',background:'transparent',border:'1px solid #f8717155',borderRadius:12,color:'#f87171',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:"'Sora',sans-serif"}}>🗑️ Limpar {ml(month)}</button>}
    </Sec>
  </div>)
}
