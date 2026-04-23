import { useState } from 'react'
import { supabase } from './supabaseClient'
const INP={background:'#090e1a',border:'1px solid #1f2d40',borderRadius:10,padding:'12px 14px',color:'#e2e8f0',fontSize:14,outline:'none',width:'100%',fontFamily:"'Sora',sans-serif",boxSizing:'border-box'}
export default function AuthPage(){
  const[mode,setMode]=useState('login')
  const[email,setEmail]=useState('')
  const[pass,setPass]=useState('')
  const[name,setName]=useState('')
  const[loading,setLoading]=useState(false)
  const[msg,setMsg]=useState(null)
  const[err,setErr]=useState(null)
  const handle=async e=>{
    e.preventDefault();setLoading(true);setErr(null);setMsg(null)
    try{
      if(mode==='signup'){const{error}=await supabase.auth.signUp({email,password:pass,options:{data:{name}}});if(error)throw error;setMsg('Conta criada! Verifique seu e-mail.')}
      else{const{error}=await supabase.auth.signInWithPassword({email,password:pass});if(error)throw error}
    }catch(e){setErr(e.message==='Invalid login credentials'?'E-mail ou senha incorretos.':e.message)}
    setLoading(false)
  }
  return(<div style={{minHeight:'100vh',background:'linear-gradient(160deg,#090e1a 0%,#0d1424 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:"'Sora',sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');*{box-sizing:border-box;}input::placeholder{color:#2a3a4a;}`}</style>
    <div style={{width:'100%',maxWidth:380}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:44,marginBottom:10}}>💰</div>
        <h1 style={{margin:0,fontSize:26,fontWeight:800,color:'#e2e8f0',letterSpacing:-1}}>Finanças Pessoais</h1>
        <p style={{margin:'6px 0 0',fontSize:13,color:'#4b5e70'}}>Controle financeiro simples e bonito</p>
      </div>
      <div style={{background:'#111827',borderRadius:20,padding:28,border:'1px solid #1f2d40'}}>
        <div style={{display:'flex',background:'#090e1a',borderRadius:12,padding:4,marginBottom:24,gap:4}}>
          {[['login','Entrar'],['signup','Criar conta']].map(([v,l])=><button key={v} onClick={()=>{setMode(v);setErr(null);setMsg(null)}} style={{flex:1,padding:'9px',borderRadius:9,border:'none',cursor:'pointer',background:mode===v?'#111827':'transparent',color:mode===v?'#f59e0b':'#4b5e70',fontWeight:mode===v?700:500,fontSize:13,fontFamily:"'Sora',sans-serif"}}>{l}</button>)}
        </div>
        <form onSubmit={handle} style={{display:'flex',flexDirection:'column',gap:14}}>
          {mode==='signup'&&<div><label style={{display:'block',fontSize:10,color:'#4b5e70',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Seu nome</label><input style={INP} placeholder="Ex: César" value={name} onChange={e=>setName(e.target.value)} required/></div>}
          <div><label style={{display:'block',fontSize:10,color:'#4b5e70',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>E-mail</label><input style={INP} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
          <div><label style={{display:'block',fontSize:10,color:'#4b5e70',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5}}>Senha</label><input style={INP} type="password" placeholder={mode==='signup'?'Mínimo 6 caracteres':'••••••••'} value={pass} onChange={e=>setPass(e.target.value)} required minLength={6}/></div>
          {err&&<div style={{background:'#f8717115',border:'1px solid #f8717144',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#f87171'}}>{err}</div>}
          {msg&&<div style={{background:'#34d39915',border:'1px solid #34d39944',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#34d399'}}>{msg}</div>}
          <button type="submit" disabled={loading} style={{padding:'14px',background:'linear-gradient(135deg,#f59e0b,#d97706)',border:'none',borderRadius:13,color:'#0f172a',fontWeight:800,fontSize:14,cursor:loading?'wait':'pointer',fontFamily:"'Sora',sans-serif",opacity:loading?0.7:1,marginTop:4}}>{loading?'Aguarde...':mode==='login'?'Entrar':'Criar conta'}</button>
        </form>
      </div>
    </div>
  </div>)
}
