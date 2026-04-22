import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AuthPage from './AuthPage'
import FinancasApp from './FinancasApp'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#090e1a', color:'#f59e0b', fontFamily:'Sora,sans-serif', gap:12 }}>
      <div style={{ width:22, height:22, borderRadius:'50%', border:'3px solid #f59e0b', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      Carregando...
    </div>
  )

  if (!session) return <AuthPage />
  return <FinancasApp session={session} />
}
