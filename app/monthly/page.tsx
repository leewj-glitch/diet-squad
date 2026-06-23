'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TabBar, MEMBERS, avatarColors } from '../feed/page'

export default function MonthlyPage() {
  const [records, setRecords] = useState<any[]>([])
  const [monthOffset, setMonthOffset] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const m = localStorage.getItem('member')
    if (!m) { router.push('/'); return }
    fetchData()
  }, [monthOffset])

  const getMonthStart = () => {
    const now = new Date()
    now.setMonth(now.getMonth() + monthOffset)
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  const fetchData = async () => {
    const monthStart = getMonthStart()
    const now = new Date(monthStart)
    now.setMonth(now.getMonth() + 1)
    const monthEnd = now.toISOString().split('T')[0]
    const { data: r } = await supabase
      .from('daily_records')
      .select('*')
      .gte('date', monthStart)
      .lt('date', monthEnd)
    setRecords(r || [])
  }

  const getMonthInfo = () => {
    const now = new Date()
    now.setMonth(now.getMonth() + monthOffset)
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }

  const getDaysInMonth = () => {
    const { year, month } = getMonthInfo()
    return new Date(year, month, 0).getDate()
  }

  const getFirstDayOfWeek = () => {
    const { year, month } = getMonthInfo()
    const day = new Date(year, month - 1, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const getDrinkersOnDay = (day: number) => {
    const { year, month } = getMonthInfo()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return records
      .filter(r => r.date === dateStr && r.drink_done)
      .map(r => MEMBERS.findIndex(m => m.id === r.member_id))
      .filter(i => i !== -1)
  }

  const getDrinkCount = (id: string) => records.filter(r => r.member_id === id && r.drink_done).length
  const getDrinkFine = (id: string) => Math.max(0, getDrinkCount(id) - 6) * 10000

  const { year, month } = getMonthInfo()
  const daysInMonth = getDaysInMonth()
  const firstDay = getFirstDayOfWeek()
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  const monthLabel = () => {
    if (monthOffset === 0) return `${year}년 ${month}월`
    return `${year}년 ${month}월`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setMonthOffset(o => o - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 text-lg">←</button>
          <h1 className="text-xl font-semibold">{monthLabel()}</h1>
          <button onClick={() => { if (monthOffset < 0) setMonthOffset(o => o + 1) }}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border text-lg ${monthOffset < 0 ? 'border-gray-200 text-gray-500' : 'border-gray-100 text-gray-200 cursor-not-allowed'}`}>→</button>
        </div>

        {/* 캘린더 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {dayLabels.map(d => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
          </div>
          {/* 날짜 */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const drinkers = getDrinkersOnDay(day)
              const today = new Date()
              const isToday = today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day
              return (
                <div key={day} className={`flex flex-col items-center py-1 rounded-xl ${isToday ? 'bg-violet-50' : ''}`}>
                  <span className={`text-xs mb-1 ${isToday ? 'text-violet-600 font-semibold' : 'text-gray-500'}`}>{day}</span>
                  {drinkers.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {drinkers.map(idx => (
                        <div key={idx} className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold ${avatarColors[idx]}`}>
                          {MEMBERS[idx].nickname[0]}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 멤버별 음주 현황 */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">음주 현황</p>
        {MEMBERS.map((m, i) => {
          const drinkCount = getDrinkCount(m.id)
          const drinkFine = getDrinkFine(m.id)
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm ${avatarColors[i]}`}>
                  {m.nickname[0]}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.nickname}</p>
                  <p className="text-xs text-gray-400">{drinkCount}회 / 월 6회 허용</p>
                </div>
                {drinkFine > 0 && (
                  <span className="text-red-500 text-sm font-semibold">+{drinkFine.toLocaleString()}원</span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: Math.max(6, drinkCount) }).map((_, idx) => (
                  <div key={idx} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${idx < drinkCount && idx < 6 ? 'bg-orange-100' : idx >= 6 && idx < drinkCount ? 'bg-red-100' : 'bg-gray-100'}`}>
                    {idx < drinkCount ? '🍺' : ''}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <TabBar active="monthly" />
    </div>
  )
}