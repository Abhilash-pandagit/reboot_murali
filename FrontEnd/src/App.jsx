import { useEffect, useState } from 'react'
import axios from 'axios'
import Layout from './components/Layout'
import UserPortal from './pages/UserPortal'
import AdminConsole from './pages/AdminConsole'
import ChainExplorer from './pages/ChainExplorer'
import SuspiciousTransactions from './pages/SuspiciousTransactions'
import NvidiaNimChatbot from './components/NvidiaNimChatbot'

const DEMO_USERS = [
  { id: 'U001', name: 'Alice Walker', bank: 'Stellar Bank', color: 'from-emerald-400 to-emerald-500' },
  { id: 'U002', name: 'Bob Taylor', bank: 'Nova Finance', color: 'from-blue-400 to-blue-500' },
  { id: 'U003', name: 'Carlos Rivera', bank: 'Prime Banking', color: 'from-purple-400 to-purple-500' },
  { id: 'U004', name: 'Diana Prince', bank: 'Apex Trust', color: 'from-cyan-400 to-cyan-500' },
  { id: 'U005', name: 'Eve Chen', bank: 'Quantum Pay', color: 'from-pink-400 to-pink-500' },
  { id: 'U006', name: 'Frank Okafor', bank: 'Gold Standard', color: 'from-amber-400 to-amber-500' },
  { id: 'U007', name: 'Grace Okonkwo', bank: 'Liberty Banking', color: 'from-red-400 to-red-500' },
]

export default function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [view, setView] = useState('home')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userBalances, setUserBalances] = useState({})
  const [accountViewMode, setAccountViewMode] = useState('grid')

  useEffect(() => {
    axios.get('/health')
      .then(res => setHealth(res.data))
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    axios.get('/api/users/all')
      .then((res) => {
        const balanceMap = {}
        ;(res.data || []).forEach((u) => {
          if (u?.id) {
            balanceMap[u.id] = Number(u.balance || 0)
          }
        })
        setUserBalances(balanceMap)
      })
      .catch((err) => {
        console.error('Failed to load user balances:', err)
      })
  }, [])

  const renderContent = () => {
    if (view === 'user-portal' && selectedUser) {
      return <UserPortal userId={selectedUser} />
    }

    if (view === 'admin') {
      return <AdminConsole />
    }

    if (view === 'explorer') {
      return <ChainExplorer />
    }

    if (view === 'suspicious') {
      return <SuspiciousTransactions />
    }

    if (view === 'user-select') {
      return (
        <div className="w-full">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Select Your Account</h1>
              <p className="text-slate-600 dark:text-slate-400">Choose a banking account to access FraudShield</p>
            </div>
            <div className="mt-6 md:mt-0 flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
              <button 
                onClick={() => setAccountViewMode('grid')}
                className={`p-2.5 rounded-lg transition-all ${accountViewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
              </button>
              <button 
                onClick={() => setAccountViewMode('table')}
                className={`p-2.5 rounded-lg transition-all ${accountViewMode === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-cyan-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                title="Table View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {accountViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {DEMO_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user.id)
                    setView('user-portal')
                  }}
                  className="group text-left transition-all transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none"
                >
                  {/* Card Container with Gradient Border */}
                  <div className={`p-[2px] rounded-2xl bg-gradient-to-br ${user.color} h-full transition-all shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] group-hover:shadow-2xl group-hover:scale-105`}>
                    <div className="bg-white dark:bg-slate-900 rounded-[14px] p-5 h-full flex flex-col">
                      
                      {/* User Avatar & Name */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-black text-xl shadow-sm transform group-hover:rotate-6 transition-transform`}>
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{user.id}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">{user.name}</p>
                        </div>
                      </div>

                      {/* Bank Name */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Bank Institution</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">{user.bank}</p>
                      </div>

                      <div className="flex-1"></div>

                      {/* Balance */}
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mt-4 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">Available Balance</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
                          £{Number(userBalances[user.id] ?? 0).toLocaleString()}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mt-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        <span className="text-xs font-bold uppercase tracking-wider">Access Portal</span>
                        <span className="text-lg font-bold group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4">User Details</th>
                      <th className="px-6 py-4">Institution</th>
                      <th className="px-6 py-4 text-right">Available Balance</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {DEMO_USERS.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${user.color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 dark:text-slate-100 text-base">{user.name}</p>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{user.bank}</td>
                        <td className="px-6 py-4 text-right font-black text-lg text-slate-900 dark:text-slate-100 font-mono">
                          £{Number(userBalances[user.id] ?? 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => {
                              setSelectedUser(user.id)
                              setView('user-portal')
                            }}
                            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/10 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition-all hover:scale-105"
                          >
                            Access Portal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="max-w-6xl mx-auto">
        {/* PPT Slide Header Style */}
        <div className="mb-8 flex justify-between items-start border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-[#111827] tracking-tight">
              FraudShield Engine: <span className="font-normal text-slate-700">problem we are solving</span>
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              Team Stallion Project — from manual fraud review to governed, traceable ledger analysis
            </p>
          </div>
          <div className="w-14 h-14 bg-white rounded-xl p-1 shadow-sm border border-slate-200 flex-shrink-0">
            <img src="/lloyds-horse.png" alt="Lloyds Horse" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* 3 Pillar Cards matching PPT Slide Aesthetics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Pillar 1: Today's pain points (Light Mint Green) */}
          <div className="bg-[#A3E3AB] text-[#082914] rounded-2xl p-6 shadow-md border border-[#8CD896] flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#082914] tracking-tight text-center border-b border-[#8CD896] pb-3">
                Today's pain points
              </h2>
              <ul className="space-y-4 text-sm font-bold leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[#082914] text-lg font-black">•</span>
                  <span>Fraud detection relies on isolated database silos with manual document reviews.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#082914] text-lg font-black">•</span>
                  <span>The inherited POC is developer-oriented and not production-ready against MLOps patterns.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#082914] text-lg font-black">•</span>
                  <span>Traditional RAG options add embedding, vector-index, and credential-management overhead.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#082914] text-lg font-black">•</span>
                  <span>Regulated use cases need evidence that is explainable, replayable, and source-cited.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#8CD896] text-xs font-black uppercase text-[#082914]/80 tracking-widest text-center">
              Legacy Limitations
            </div>
          </div>

          {/* Pillar 2: What CIB needs (Medium Vibrant Emerald Green) */}
          <div className="bg-[#00A865] text-[#031D0E] rounded-2xl p-6 shadow-md border border-[#00965A] flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#031D0E] tracking-tight text-center border-b border-[#00965A] pb-3">
                What CIB needs
              </h2>
              <ul className="space-y-4 text-sm font-bold leading-relaxed text-[#031D0E]">
                <li className="flex items-start gap-2">
                  <span className="text-[#031D0E] text-lg font-black">•</span>
                  <span>A lightweight way to ask questions across several payment audit records.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#031D0E] text-lg font-black">•</span>
                  <span>Clear source references: DAML contract ID, Merkle root, block index, and retrieved evidence.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#031D0E] text-lg font-black">•</span>
                  <span>A path that aligns with approved enterprise LLM access (NVIDIA Nemotron RAG) & governance.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#031D0E] text-lg font-black">•</span>
                  <span>A demonstrable pattern that shows value before committing to heavier infrastructure.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#00965A] text-xs font-black uppercase text-[#031D0E]/80 tracking-widest text-center">
              Target Requirements
            </div>
          </div>

          {/* Pillar 3: Show & Tell message (Deep Dark Forest Green) */}
          <div className="bg-[#0B3820] text-[#E2F7E8] rounded-2xl p-6 shadow-md border border-[#072914] flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-black mb-6 text-[#E2F7E8] tracking-tight text-center border-b border-[#144A2C] pb-3">
                Show & Tell message
              </h2>
              <ul className="space-y-4 text-sm font-semibold leading-relaxed text-[#D1EAD0]">
                <li className="flex items-start gap-2">
                  <span className="text-[#00A865] text-lg font-black">•</span>
                  <span>FraudShield is not only about generating a report; it makes payment validation faster and defensible.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00A865] text-lg font-black">•</span>
                  <span>The proposed approach focuses on retrieval transparency rather than black-box vector opacity.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00A865] text-lg font-black">•</span>
                  <span>The live demo shows grounded answers with complete DAML Canton ledger traceability.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-[#144A2C] text-xs font-bold uppercase text-[#A3E3AB] tracking-widest text-center">
              FraudShield Value Proposition
            </div>
          </div>

        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">System Status</h2>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold">Backend Unreachable</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          ) : health ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="font-semibold text-green-600 dark:text-green-400">Backend Connected</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-950 rounded p-3 space-y-1">
                <p><span className="text-slate-500 dark:text-slate-500">status:</span> {health.status}</p>
                <p><span className="text-slate-500 dark:text-slate-500">app:</span> {health.application}</p>
                <p><span className="text-slate-500 dark:text-slate-500">time:</span> {health.timestamp}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="animate-pulse w-2 h-2 rounded-full bg-slate-400"></span>
              Connecting to backend…
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout currentView={view} onNavigate={setView}>
      {renderContent()}
      <NvidiaNimChatbot />
    </Layout>
  )
}

