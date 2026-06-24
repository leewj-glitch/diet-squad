'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TabBar, MEMBERS } from '../feed/page'

export default function WeeklyPage() {
  const [records, setRecords] = useState<any[]>([])
  const [fines, setFines] = useState<any[]>([])
  const [selected, setSelected] = useState(MEMBERS[0])
  const [weekOffset, setWeekOffset] = useState(0)
  const router = useRouter()

  const getWeekStart = (offset = 0) => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diff + offset * 7)
    return monday.toISOString().split('T')[0]
  }

  const getWeekEnd = (start: string) => {
    const d = new Date(start)
    d.setDate(d.getDate() + 6)
    return d.toISOString().split('T')[0]
  }

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = getWeekEnd(weekStart)

  useEffect(() => {
    const m = localStorage.getItem('member')
    if (!m) { router.push('/'); return }
    fetchData()
  }, [weekOffset])

  const fetchData = async () => {
    const { data: r } = await supabase.from('daily_records').select('*').gte('date', weekStart).lte('date', weekEnd)
    const { data: f } = await supabase.from('fines').select('*').eq('week_start', weekStart)
    setRecords(r || [])
    setFines(f || [])
  }

  const getWeekDates = () => {
    const start = new Date(weekStart)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }

  const mealEmoji = (type: string) => {
    if (type === 'clean') return '🥗'
    if (type === 'normal') return '🍚'
    if (type === 'pig') return '🐷'
    return ''
  }

  const calcFine = (memberId: string) => {
    const mr = records.filter(r => r.member_id === memberId)
    const cleanCount = mr.filter(r => r.meal_type === 'clean').length
    const normalCount = mr.filter(r => r.meal_type === 'normal').length
    const pigCount = mr.filter(r => r.meal_type === 'pig').length
    const exerciseCount = mr.filter(r => r.exercise_done && r.exercise_minutes >= 30).length
    const snackTotal = mr.reduce((a, r) => a + (r.snack_count || 0), 0)
    const drinkCount = mr.filter(r => r.drink_done).length
    const mealFine = (Math.max(0, 2 - cleanCount) + Math.max(0, 3 - normalCount) + pigCount) * 1000
    const exerciseFine = Math.max(0, 4 - exerciseCount) * 1000
    const snackFine = Math.max(0, snackTotal - 1) * 1000
    const total = mealFine + exerciseFine + snackFine
    return { cleanCount, normalCount, pigCount, exerciseCount, snackTotal, drinkCount, mealFine, exerciseFine, snackFine, total }
  }

  const togglePaid = async (memberId: string) => {
    const fine = calcFine(memberId)
    const fineRecord = fines.find(f => f.member_id === memberId)
    const newPaid = !fineRecord?.is_paid
    await supabase.from('fines').upsert({
      member_id: memberId, week_start: weekStart,
      meal_fine: fine.mealFine, exercise_fine: fine.exerciseFine,
      snack_fine: fine.snackFine, total_fine: fine.total,
      is_paid: newPaid,
      paid_at: newPaid ? new Date().toISOString() : null
    }, { onConflict: 'member_id,week_start' })
    fetchData()
  }

  const fine = calcFine(selected.id)
  const fineRecord = fines.find(f => f.member_id === selected.id)
  const weekDates = getWeekDates()
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  const weekLabel = () => {
    if (weekOffset === 0) return '이번 주'
    if (weekOffset === -1) return '지난 주'
    return `${Math.abs(weekOffset)}주 전`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">

        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold">주간 현황</h1>
        </div>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 text-lg">←</button>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">{weekLabel()}</p>
            <p className="text-xs text-gray-400">{weekStart} ~ {weekEnd}</p>
          </div>
          <button onClick={() => { if (weekOffset < 0) setWeekOffset(w => w + 1) }}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border text-lg ${weekOffset < 0 ? 'border-gray-200 text-gray-500' : 'border-gray-100 text-gray-200 cursor-not-allowed'}`}>→</button>
        </div>

        <div className="flex gap-2 mb-4">
          {MEMBERS.map(m => (
            <button key={m.id} onClick={() => setSelected(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${selected.id === m.id ? 'bg-violet-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
              {m.nickname}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">이번 주 기록</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDates.map((date, i) => {
              const r = records.find(r => r.member_id === selected.id && r.date === date)
              return (
                <div key={date} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-gray-300 mb-1">{dayLabels[i]}</span>
                  <span className="text-lg">{r ? mealEmoji(r.meal_type) : '　'}</span>
                  <span className="text-sm">{r?.exercise_done ? '💪' : '　'}</span>
                  <span className="text-sm">{r && r.snack_count > 0 ? '🍪' : '　'}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50 flex-wrap">
            <span className="text-xs text-gray-400">🥗 클린</span>
            <span className="text-xs text-gray-400">🍚 일반</span>
            <span className="text-xs text-gray-400">🐷 돼지</span>
            <span className="text-xs text-gray-400">💪 운동</span>
            <span className="text-xs text-gray-400">🍪 간식</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: '클린식', count: fine.cleanCount, target: 2, fine: Math.max(0, 2 - fine.cleanCount) * 1000 },
            { label: '일반식', count: fine.normalCount, target: 3, fine: Math.max(0, 3 - fine.normalCount) * 1000 },
            { label: '운동 30분↑', count: fine.exerciseCount, target: 4, fine: fine.exerciseFine },
            { label: '간식', count: fine.snackTotal, target: 1, fine: fine.snackFine },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">{item.label}</p>
              <p className="text-2xl font-semibold">
                {item.count}<span className="text-sm text-gray-300 font-normal">/{item.target}</span>
              </p>
              {item.fine > 0
                ? <p className="text-xs text-red-400 mt-1">−{item.fine.toLocaleString()}원</p>
                : <p className="text-xs text-green-500 mt-1">✓</p>}
            </div>
          ))}
        </div>

        {fine.pigCount > 0 && (
          <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-4 flex justify-between items-center">
            <span className="text-sm text-pink-700">🐷 돼지식 {fine.pigCount}회</span>
            <span className="text-sm text-red-400 font-medium">−{(fine.pigCount * 1000).toLocaleString()}원</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400 mb-1">이번 주 벌금</p>
              <p className={`text-3xl font-semibold ${fine.total > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {fine.total > 0 ? `${fine.total.toLocaleString()}원` : '없음 🎉'}
              </p>
            </div>
            {fine.total > 0 && (
              <button
                onClick={() => togglePaid(selected.id)}
                className={`text-sm px-4 py-2 rounded-xl font-medium ${fineRecord?.is_paid ? 'bg-green-50 text-green-600' : 'bg-violet-500 text-white'}`}>
                {fineRecord?.is_paid ? '납부 완료 ✓ (취소)' : '납부 완료'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-medium mb-3">음주 ({fine.drinkCount}회)</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: Math.max(4, fine.drinkCount) }).map((_, i) => (
              <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${i < fine.drinkCount ? 'bg-orange-100' : 'bg-gray-100'}`}>
                {i < fine.drinkCount ? '🍺' : ''}
              </div>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="weekly" />
    </div>
  )
}