'use client'
import { useRouter } from 'next/navigation'

const MEMBERS = [
  { id: '1', nickname: '현' },
  { id: '2', nickname: '승' },
  { id: '3', nickname: '우' },
  { id: '4', nickname: '길' },
]

export default function HomePage() {
  const router = useRouter()
  const selectMember = (member: any) => {
    localStorage.setItem('member', JSON.stringify(member))
    router.push('/feed')
  }
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center mb-2">🥗 다이어트 스쿼드</h1>
        <p className="text-gray-400 text-sm text-center mb-8">누구로 시작할까요?</p>
        <div className="grid grid-cols-2 gap-3">
          {MEMBERS.map(m => (
            <button key={m.id} onClick={() => selectMember(m)}
              className="bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold text-2xl rounded-2xl py-8 transition-colors">
              {m.nickname}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
