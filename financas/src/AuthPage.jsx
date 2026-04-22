import { useState } from 'react'
import { supabase } from './supabaseClient'

const T = { bg:'#090e1a', card:'#111827', border:'#1f2d40', text:'#e2e8f0', muted:'#4b5e70', accent:'#f59e0b' }
const inp = { background:'#090e1a', border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', color:T.text, fontSize:14, outline:'none', width:'100%', fontFamily:"'Sora',sans-serif", boxSizing:'border-box' }

export default function AuthPage() {
  const [mode,    setMode]    = useState('login')  // 'login' | 'signup'
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null)
  const [err,     setErr]     = useState(null)

  const handle = async e => {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { name } }
        })
        if (error) throw error
        setMsg('Conta criada! Verifique seu e-mail para confirmar.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (error) throw error
      }
    } catch (e) {
      setErr(e.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:`linear-gradient(160deg,${T.bg} 0%,#0d1424 100%)`, display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Sora',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap');*{box-sizing:border-box;}input::placeholder{color:#2a3a4a;}`}</style>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:44, marginBottom:10 }}>💰</div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:800, color:T.text, letterSpacing:-1 }}>Finanças Pessoais</h1>
          <p style={{ margin:'6px 0 0', fontSize:13, color:T.muted }}>Controle financeiro simples e bonito</p>
        </div>

        <div style={{ background:T.card, borderRadius:20, padding:28, border:`1px solid ${T.border}` }}>
          <div style={{ display:'flex', background:T.bg, borderRadius:12, padding:4, marginBottom:24, gap:4 }}>
            {[['login','Entrar'],['signup','Criar conta']].map(([v,l]) => (
              <button key={v} onClick={() => { setMode(v); setErr(null); setMsg(null) }} style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', background:mode===v?T.card:'transparent', color:mode===v?T.accent:T.muted, fontWeight:mode===v?700:500, fontSize:13, fontFamily:"'Sora',sans-serif", transition:'all 0.2s' }}>{l}</button>
            ))}
          </div>

          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display:'block', fontSize:10, color:T.muted, marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Seu nome</label>
                <input style={inp} placeholder="Ex: César" value={name} onChange={e=>setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label style={{ display:'block', fontSize:10, color:T.muted, marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>E-mail</label>
              <input style={inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={{ display:'block', fontSize:10, color:T.muted, marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Senha</label>
              <input style={inp} type="password" placeholder={mode==='signup'?"Mínimo 6 caracteres":"••••••••"} value={pass} onChange={e=>setPass(e.target.value)} required minLength={6} />
            </div>

            {err && <div style={{ background:'#f8717115', border:'1px solid #f8717144', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#f87171' }}>{err}</div>}
            {msg && <div style={{ background:'#34d39915', border:'1px solid #34d39944', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#34d399' }}>{msg}</div>}

            <button type="submit" disabled={loading} style={{ padding:'14px', background:`linear-gradient(135deg,${T.accent},#d97706)`, border:'none', borderRadius:13, color:'#0f172a', fontWeight:800, fontSize:14, cursor:loading?'wait':'pointer', fontFamily:"'Sora',sans-serif", opacity:loading?0.7:1, marginTop:4 }}>
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
