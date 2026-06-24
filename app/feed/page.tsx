'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export const MEMBERS = [
  { id: '1', nickname: '우정' },
  { id: '2', nickname: '현경' },
  { id: '3', nickname: '길성' },
  { id: '4', nickname: '승수' },
]

export const avatarColors = [
  'bg-purple-100 text-purple-500',
  'bg-yellow-100 text-yellow-600',
  'bg-pink-100 text-pink-500',
  'bg-sky-100 text-sky-500',
]

export function TabBar({ active }: { active: string }) {
  const router = useRouter()
  const tabs = [
    { key: 'feed', label: '피드', icon: '🏠', path: '/feed' },
    { key: 'record', label: '기록', icon: '✏️', path: '/record' },
    { key: 'weekly', label: '주간', icon: '📊', path: '/weekly' },
    { key: 'monthly', label: '월간', icon: '📅', path: '/monthly' },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex">
      {tabs.map(t => (
        <button key={t.key} onClick={() => router.push(t.path)}
          className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs ${active === t.key ? 'text-violet-600 font-semibold' : 'text-gray-400'}`}>
          <span className="text-xl">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function getWeekDates(weekOffset: number) {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function FeedPage() {
  const [records, setRecords] = useState<any[]>([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const router = useRouter()

  useEffect(() => {
    const m = localStorage.getItem('member')
    if (!m) { router.push('/'); return }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [weekOffset])

  const fetchRecords = async () => {
    const dates = getWeekDates(weekOffset)
    const start = dates[0].toISOString().split('T')[0]
    const end = dates[6].toISOString().split('T')[0]
    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .gte('date', start)
      .lte('date', end)
    setRecords(data || [])
  }

  const getRecord = (memberId: string, date: string) =>
    records.find(r => r.member_id === memberId && r.date === date)

  const weekDates = getWeekDates(weekOffset)
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']
  const today = new Date().toISOString().split('T')[0]

  const weekLabel = () => {
    if (weekOffset === 0) return '이번 주'
    if (weekOffset === -1) return '지난 주'
    return `${Math.abs(weekOffset)}주 전`
  }

  const mealLabel = (type: string) => {
    if (type === 'clean') return '클린식 ✓'
    if (type === 'normal') return '일반식 ✓'
    if (type === 'pig') return '돼지식 🐷'
    return '—'
  }
  const mealColor = (type: string) => {
    if (type === 'clean') return 'text-green-600 font-medium'
    if (type === 'normal') return 'text-blue-600 font-medium'
    if (type === 'pig') return 'text-pink-500 font-medium'
    return 'text-gray-300'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">🥗 수다단 기록</h1>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { setWeekOffset(w => w - 1); setSelectedDate('') }}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 text-lg">←</button>
          <span className="text-sm font-medium text-gray-600">{weekLabel()}</span>
          <button onClick={() => { if (weekOffset < 0) { setWeekOffset(w => w + 1); setSelectedDate('') } }}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border text-lg ${weekOffset < 0 ? 'border-gray-200 text-gray-500' : 'border-gray-100 text-gray-200 cursor-not-allowed'}`}>→</button>
        </div>

        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-gray-100 p-2">
          {weekDates.map((d, i) => {
            const dateStr = d.toISOString().split('T')[0]
            const isSelected = selectedDate === dateStr
            const isToday = dateStr === today
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs transition-all ${isSelected ? 'bg-violet-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                <span className="mb-1">{dayLabels[i]}</span>
                <span className={`font-semibold text-sm ${isToday && !isSelected ? 'text-violet-500' : ''}`}>{d.getDate()}</span>
                {isToday && <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-violet-400'}`} />}
              </button>
            )
          })}
        </div>

        {selectedDate ? (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {selectedDate === today ? '오늘 현황' : `${selectedDate.slice(5).replace('-', '/')} 현황`}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MEMBERS.map((m, i) => {
                const r = getRecord(m.id, selectedDate)
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColors[i]}`}>
                        {m.nickname[0]}
                      </div>
                      <span className="text-sm font-medium">{m.nickname}</span>
                      {!r && <span className="text-xs text-gray-300 ml-auto">미기록</span>}
                    </div>
                    {r ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">저녁</span>
                          <span className={mealColor(r.meal_type)}>{mealLabel(r.meal_type)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">운동</span>
                          <span className={r.exercise_done ? 'text-violet-600 font-medium' : 'text-gray-300'}>
                            {r.exercise_done ? `💪 ${r.exercise_minutes}분` : '안함'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">간식</span>
                          <span className={r.snack_count > 0 ? 'text-orange-500' : 'text-gray-300'}>
                            {r.snack_count > 0 ? `🍪 ${r.snack_count}회${r.snack_count > 1 ? ' ⚠️' : ''}` : '없음'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">음주</span>
                          <span className={r.drink_done ? 'text-orange-500' : 'text-gray-300'}>
                            {r.drink_done ? '🍺 했음' : '없음'}
                          </span>
                        </div>
                        {r.memo && <p className="text-xs text-gray-400 pt-1 border-t border-gray-50 mt-1">{r.memo}</p>}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {['저녁', '운동', '간식', '음주'].map(label => (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="text-gray-300">{label}</span>
                            <span className="text-gray-200">—</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-300 text-sm mt-8">날짜를 선택해요</p>
        )}
      </div>
      <TabBar active="feed" />
    </div>
  )
}