'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TabBar, MEMBERS, avatarColors, getWeekDates, UserHeader } from '../feed/page'

const START_DATE = '2026-06-22'

export default function WeeklyPage() {
  const [records, setRecords] = useState<any[]>([])
  const [allRecords, setAllRecords] = useState<any[]>([])
  const [allFines, setAllFines] = useState<any[]>([])
  const [selected, setSelected] = useState(MEMBERS[0])
  const [weekOffset, setWeekOffset] = useState(0)
  const router = useRouter()

  const weekDates = getWeekDates(weekOffset)
  const weekStart = weekDates[0]
  const weekEnd = weekDates[6]
  const isBeforeStart = weekEnd < START_DATE

  useEffect(() => {
    const m = localStorage.getItem('member')
    if (!m) { router.push('/'); return }
    fetchData()
  }, [weekOffset])

  const fetchData = async () => {
    const { data: r } = await supabase.from('daily_records').select('*').gte('date', weekStart).lte('date', weekEnd)
    const { data: ar } = await supabase.from('daily_records').select('*').gte('date', START_DATE)
    const { data: f } = await supabase.from('fines').select('*')
    setRecords(r || [])
    setAllRecords(ar || [])
    setAllFines(f || [])
  }

  const mealEmoji = (type: string) => {
    if (type === 'clean') return '🥗'
    if (type === 'normal') return '🍚'
    if (type === 'pig') return '🐷'
    return ''
  }

  const calcWeekFineForRecords = (recs: any[], memberId: string) => {
    const mr = recs.filter(r => r.member_id === memberId)
    const cleanCount = mr.filter(r => r.meal_type === 'clean').length
    const normalCount = mr.filter(r => r.meal_type === 'normal').length
    const goodMealCount = cleanCount + normalCount
    const exerciseCount = mr.filter(r => r.exercise_done && r.exercise_minutes >= 30).length
    const snackTotal = mr.reduce((a, r) => a + (r.snack_count || 0), 0)
    const drinkCount = mr.filter(r => r.drink_done).length
    const cleanFine = Math.max(0, 2 - cleanCount) * 1000
    const mealTotalFine = Math.max(0, 5 - goodMealCount) * 1000
    const totalMealFine = Math.max(cleanFine, mealTotalFine)
    const exerciseFine = Math.max(0, 4 - exerciseCount) * 2000
    const snackFine = Math.max(0, snackTotal - 1) * 1000
    const total = totalMealFine + exerciseFine + snackFine
    return { cleanCount, normalCount, goodMealCount, exerciseCount, snackTotal, drinkCount, totalMealFine, exerciseFine, snackFine, total }
  }

  const calcFine = (memberId: string) => calcWeekFineForRecords(records, memberId)

  // 시작일부터 지금까지 주별로 나눠서 각 주 벌금 합산
  const getAccumulatedFine = (memberId: string) => {
    // 시작일부터 오늘까지 모든 주의 월요일 구하기
    const start = new Date(START_DATE)
    const today = new Date()
    const weeks: string[] = []
    const cur = new Date(start)
    // 시작일이 속한 주의 월요일 찾기
    const startDay = cur.getDay()
    const startDiff = startDay === 0 ? -6 : 1 - startDay
    cur.setDate(cur.getDate() + startDiff)
    while (cur <= today) {
      weeks.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 7)
    }

    let totalFine = 0
    for (const wStart of weeks) {
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 6)
      const wEndStr = wEnd.toISOString().split('T')[0]
      // 시작일 이전 주는 스킵
      if (wEndStr < START_DATE) continue
      const weekRecs = allRecords.filter(r => r.member_id === memberId && r.date >= wStart && r.date <= wEndStr)
      const f = calcWeekFineForRecords(weekRecs, memberId)
      totalFine += f.total
    }

    const paid = allFines.filter(f => f.member_id === memberId && f.is_paid).reduce((a, f) => a + (f.total_fine || 0), 0)
    return { total: totalFine, paid, unpaid: totalFine - paid }
  }

  const togglePaid = async (memberId: string) => {
    const fine = calcFine(memberId)
    const fineRecord = allFines.find(f => f.member_id === memberId && f.week_start === weekStart)
    const newPaid = !fineRecord?.is_paid
    await supabase.from('fines').upsert({
      member_id: memberId, week_start: weekStart,
      meal_fine: fine.totalMealFine,
      exercise_fine: fine.exerciseFine,
      snack_fine: fine.snackFine,
      total_fine: fine.total,
      is_paid: newPaid,
      paid_at: newPaid ? new Date().toISOString() : null
    }, { onConflict: 'member_id,week_start' })
    fetchData()
  }

  const fine = calcFine(selected.id)
  const accumulated = getAccumulatedFine(selected.id)
  const fineRecord = allFines.find(f => f.member_id === selected.id && f.week_start === weekStart)
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  const weekLabel = () => {
    if (weekOffset === 0) return '이번 주'
    if (weekOffset === -1) return '지난 주'
    return `${Math.abs(weekOffset)}주 전`
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <UserHeader active="weekly" />
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

        {isBeforeStart ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">6월 22일부터 시작이에요 😊</p>
          </div>
        ) : (
          <>
            {/* 4명 벌금 요약 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
              <p className="text-xs text-gray-400 mb-3">{weekLabel()} 벌금 요약</p>
              <div className="grid grid-cols-2 gap-3">
                {MEMBERS.map((m, i) => {
                  const f = calcFine(m.id)
                  const fr = allFines.find(fi => fi.member_id === m.id && fi.week_start === weekStart)
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColors[i]}`}>
                        {m.nickname[0]}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{m.nickname}</p>
                        <p className={`text-sm font-semibold ${f.total > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {f.total > 0 ? `${f.total.toLocaleString()}원` : '없음'}
                          {fr?.is_paid && <span className="text-xs text-green-400 font-normal ml-1">✓</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 멤버 탭 */}
            <div className="flex gap-2 mb-4">
              {MEMBERS.map(m => (
                <button key={m.id} onClick={() => setSelected(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium ${selected.id === m.id ? 'bg-violet-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                  {m.nickname}
                </button>
              ))}
            </div>

            {/* 주간 기록 이모티콘 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-xs text-gray-400 mb-3">{weekLabel()} 기록</p>
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

            {/* 통계 카드 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">클린식</p>
                <p className="text-2xl font-semibold">{fine.cleanCount}<span className="text-sm text-gray-300 font-normal">/2↑</span></p>
                {fine.cleanCount < 2 ? <p className="text-xs text-red-400 mt-1">−{(2 - fine.cleanCount) * 1000}원</p> : <p className="text-xs text-green-500 mt-1">✓</p>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">클린+일반식</p>
                <p className="text-2xl font-semibold">{fine.goodMealCount}<span className="text-sm text-gray-300 font-normal">/5↑</span></p>
                {fine.goodMealCount < 5 ? <p className="text-xs text-red-400 mt-1">−{(5 - fine.goodMealCount) * 1000}원</p> : <p className="text-xs text-green-500 mt-1">✓</p>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">운동 30분↑</p>
                <p className="text-2xl font-semibold">{fine.exerciseCount}<span className="text-sm text-gray-300 font-normal">/4</span></p>
                {fine.exerciseFine > 0 ? <p className="text-xs text-red-400 mt-1">−{fine.exerciseFine.toLocaleString()}원</p> : <p className="text-xs text-green-500 mt-1">✓</p>}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-400 mb-1">간식</p>
                <p className="text-2xl font-semibold">{fine.snackTotal}<span className="text-sm text-gray-300 font-normal">회</span></p>
                {fine.snackFine > 0 ? <p className="text-xs text-red-400 mt-1">−{fine.snackFine.toLocaleString()}원</p> : <p className="text-xs text-green-500 mt-1">✓</p>}
              </div>
            </div>

            {/* 이번 주 벌금 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-400 mb-1">이번 주 벌금</p>
                  <p className={`text-3xl font-semibold ${fine.total > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {fine.total > 0 ? `${fine.total.toLocaleString()}원` : '없음 🎉'}
                  </p>
                </div>
                {fine.total > 0 && (
                  <button onClick={() => togglePaid(selected.id)}
                    className={`text-sm px-4 py-2 rounded-xl font-medium ${fineRecord?.is_paid ? 'bg-green-50 text-green-600' : 'bg-violet-500 text-white'}`}>
                    {fineRecord?.is_paid ? '납부완료 ✓\n(취소)' : '납부 완료'}
                  </button>
                )}
              </div>
            </div>

            {/* 누적 벌금 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
              <p className="text-sm font-medium mb-3">누적 벌금</p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">총 벌금</span>
                <span className={`font-semibold ${accumulated.total > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  {accumulated.total.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">납부 완료</span>
                <span className="text-green-500 font-medium">{accumulated.paid.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                <span className="text-gray-400">미납</span>
                <span className={`font-semibold ${accumulated.unpaid > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {accumulated.unpaid > 0 ? `${accumulated.unpaid.toLocaleString()}원` : '없음 ✓'}
                </span>
              </div>
            </div>

            {/* 음주 */}
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
          </>
        )}
      </div>
      <TabBar active="weekly" />
    </div>
  )
}