'use client'
import { useRouter } from 'next/navigation'

export const MEMBERS = [
  { id: '1', nickname: '우정' },
  { id: '2', nickname: '현경' },
  { id: '3', nickname: '길성' },
  { id: '4', nickname: '승수' },
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
        <h1 className="text-2xl font-semibold text-center mb-2">🥗 수다단 기록</h1>
        <p className="text-gray-400 text-sm text-center mb-8">누구로 시작할까요?</p>
        <div className="grid grid-cols-2 gap-3">
          {MEMBERS.map((m, i) => {
            const colors = ['bg-purple-200 text-purple-700', 'bg-yellow-200 text-yellow-700', 'bg-pink-200 text-pink-700', 'bg-sky-200 text-sky-700']
            return (
              <button key={m.id} onClick={() => selectMember(m)}
                className={`${colors[i]} font-semibold text-xl rounded-2xl py-8 transition-colors hover:opacity-80`}>
                {m.nickname}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}