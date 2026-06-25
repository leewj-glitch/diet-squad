'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TabBar, MEMBERS } from '../feed/page'

const memberStyles = {
  '1': { bg: 'bg-purple-50', button: 'bg-purple-400', ring: 'ring-purple-300' },
  '2': { bg: 'bg-yellow-50', button: 'bg-yellow-300', ring: 'ring-yellow-200' },
  '3': { bg: 'bg-pink-50', button: 'bg-pink-300', ring: 'ring-pink-200' },
  '4': { bg: 'bg-sky-50', button: 'bg-sky-300', ring: 'ring-sky-200' },
}

function getWeekDates(offset: number) {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function RecordPage() {
  const [member, setMember] = useState<any>(MEMBERS[0])
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState<'clean' | 'normal' | 'pig'>('clean')
  const [exerciseDone, setExerciseDone] = useState(false)
  const [exerciseMinutes, setExerciseMinutes] = useState(30)
  const [snackCount, setSnackCount] = useState(0)
  const [drinkDone, setDrinkDone] = useState(false)
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingId, setExistingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const m = localStorage.getItem('member')
    if (!m) { router.push('/'); return }
    const parsed = JSON.parse(m)
    const found = MEMBERS.find(mem => mem.id === parsed.id) || MEMBERS[0]
    setMember(found)

    const savedDate = localStorage.getItem('selectedFeedDate')
    if (savedDate) {
      setSelectedDate(savedDate)
      localStorage.removeItem('selectedFeedDate')
    }
  }, [])

  useEffect(() => {
    if (member && selectedDate) loadRecord(member.id, selectedDate)
  }, [member, selectedDate])

  const loadRecord = async (memberId: string, date: string) => {
    const { data } = await supabase
      .from('daily_records')
      .select('*')
      .eq('member_id', memberId)
      .eq('date', date)
      .single()
    if (data) {
      setExistingId(data.id)
      setMealType(data.meal_type || 'clean')
      setExerciseDone(data.exercise_done || false)
      setExerciseMinutes(data.exercise_minutes || 30)
      setSnackCount(data.snack_count || 0)
      setDrinkDone(data.drink_done || false)
      setMemo(data.memo || '')
    } else {
      setExistingId(null)
      setMealType('clean')
      setExerciseDone(false)
      setExerciseMinutes(30)
      setSnackCount(0)
      setDrinkDone(false)
      setMemo('')
    }
  }

  const handleMemberChange = (m: any) => {
    localStorage.setItem('member', JSON.stringify(m))
    setMember(m)
  }

  const handleSubmit = async () => {
    if (!member) return
    setLoading(true)
    const { error } = await supabase.from('daily_records').upsert({
      member_id: member.id,
      date: selectedDate,
      meal_type: mealType,
      exercise_done: exerciseDone,
      exercise_minutes: exerciseMinutes,
      snack_count: snackCount,
      drink_done: drinkDone,
      memo,
    }, { onConflict: 'member_id,date' })
    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      setSaved(true)
      setTimeout(() => { setSaved(false); router.push('/feed') }, 1000)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!existingId) return
    if (!confirm('이 날 기록을 삭제할까요?')) return
    await supabase.from('daily_records').delete().eq('id', existingId)
    setExistingId(null)
    setMealType('clean')
    setExerciseDone(false)
    setExerciseMinutes(30)
    setSnackCount(0)
    setDrinkDone(false)
    setMemo('')
  }

  const style = memberStyles[member?.id as keyof typeof memberStyles] || memberStyles['1']
  const today = new Date().toISOString().split('T')[0]
  const weekDates = getWeekDates(weekOffset)
  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  const weekLabel = () => {
    if (weekOffset === 0) return '이번 주'
    if (weekOffset === -1) return '지난 주'
    return `${Math.abs(weekOffset)}주 전`
  }

  return (
    <div className={`min-h-screen ${style.bg} pb-24 transition-colors duration-300`}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">기록</h1>
          {existingId && (
            <button onClick={handleDelete} className="text-red-400 text-sm border border-red-200 px-3 py-1 rounded-xl bg-white">삭제</button>
          )}
        </div>

        {existingId && (
          <div className="bg-white/70 border border-white rounded-2xl px-4 py-3 mb-4 text-sm text-gray-600">
            이미 기록이 있어요. 수정 후 저장하면 덮어써요 ✏️
          </div>
        )}

        {/* 멤버 선택 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-4">
          <p className="text-sm font-medium mb-3">누구로 기록할까요?</p>
          <div className="grid grid-cols-4 gap-2">
            {MEMBERS.map((m) => {
              const s = memberStyles[m.id as keyof typeof memberStyles]
              return (
                <button key={m.id} onClick={() => handleMemberChange(m)}
                  className={`py-3 rounded-xl text-sm font-semibold text-white transition-all ${s.button} ${member?.id === m.id ? `opacity-100 ring-2 ring-offset-2 ${s.ring}` : 'opacity-40'}`}>
                  {m.nickname}
                </button>
              )
            })}
          </div>
        </div>

        {/* 날짜 선택 — 주간 탭 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 bg-white">←</button>
            <span className="text-xs font-medium text-gray-500">{weekLabel()}</span>
            <button onClick={() => { if (weekOffset < 0) setWeekOffset(w => w + 1) }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border text-sm ${weekOffset < 0 ? 'border-gray-200 text-gray-500 bg-white' : 'border-gray-100 text-gray-200 cursor-not-allowed'}`}>→</button>
          </div>
          <div className="flex gap-1">
            {weekDates.map((d, i) => {
              const dateStr = d.toISOString().split('T')[0]
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === today
              const isFuture = dateStr > today
              return (
                <button key={dateStr}
                  onClick={() => { if (!isFuture) setSelectedDate(dateStr) }}
                  disabled={isFuture}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs transition-all
                    ${isSelected ? 'bg-violet-500 text-white' : isFuture ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-50'}`}>
                  <span className="mb-1">{dayLabels[i]}</span>
                  <span className={`font-semibold text-sm ${isToday && !isSelected ? 'text-violet-500' : ''}`}>{d.getDate()}</span>
                  {isToday && <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-violet-400'}`} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 저녁 식단 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-4">
          <p className="text-sm font-medium mb-3">저녁 식단</p>
          <div className="flex gap-2">
            {[
              { value: 'clean', label: '🥗 클린식', active: 'bg-green-400 text-white' },
              { value: 'normal', label: '🍚 일반식', active: 'bg-blue-400 text-white' },
              { value: 'pig', label: '🐷 돼지식', active: 'bg-pink-400 text-white' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setMealType(opt.value as any)}
                className={`flex-1 py-3 rounded-xl text-xs font-medium ${mealType === opt.value ? opt.active : 'border border-gray-200 text-gray-400 bg-white'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 운동 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-4">
          <p className="text-sm font-medium mb-3">운동</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => { setExerciseDone(true); setExerciseMinutes(30) }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${exerciseDone ? 'bg-violet-400 text-white' : 'border border-gray-200 text-gray-400 bg-white'}`}>
              💪 했어요
            </button>
            <button onClick={() => { setExerciseDone(false); setExerciseMinutes(30) }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${!exerciseDone ? 'bg-gray-400 text-white' : 'border border-gray-200 text-gray-400 bg-white'}`}>
              ❌ 안 했어요
            </button>
          </div>
          {exerciseDone && (
            <div className="flex items-center gap-4">
              <button onClick={() => setExerciseMinutes(m => Math.max(10, m - 10))}
                className="w-10 h-10 border border-gray-200 rounded-xl text-xl bg-white">−</button>
              <span className="text-lg font-semibold flex-1 text-center">{exerciseMinutes}분</span>
              <button onClick={() => setExerciseMinutes(m => m + 10)}
                className="w-10 h-10 border border-gray-200 rounded-xl text-xl bg-white">+</button>
            </div>
          )}
        </div>

        {/* 간식 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-4">
          <p className="text-sm font-medium mb-3">간식</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setSnackCount(Math.max(0, snackCount - 1))}
              className="w-10 h-10 border border-gray-200 rounded-xl text-xl bg-white">−</button>
            <span className="text-xl font-semibold w-8 text-center">{snackCount}</span>
            <button onClick={() => setSnackCount(snackCount + 1)}
              className="w-10 h-10 border border-gray-200 rounded-xl text-xl bg-white">+</button>
            <span className="text-sm text-gray-400">회</span>
            {snackCount > 1 && <span className="text-orange-500 text-sm ml-auto">⚠️ {(snackCount - 1) * 1000}원</span>}
          </div>
        </div>

        {/* 음주 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-4">
          <p className="text-sm font-medium mb-3">음주</p>
          <div className="flex gap-2">
            <button onClick={() => setDrinkDone(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${drinkDone ? 'bg-orange-300 text-white' : 'border border-gray-200 text-gray-400 bg-white'}`}>
              🍺 했어요
            </button>
            <button onClick={() => setDrinkDone(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${!drinkDone ? 'bg-gray-400 text-white' : 'border border-gray-200 text-gray-400 bg-white'}`}>
              안 했어요
            </button>
          </div>
        </div>

        {/* 메모 */}
        <div className="bg-white/80 rounded-2xl border border-white p-4 mb-6">
          <p className="text-sm font-medium mb-2">메모 (선택)</p>
          <textarea value={memo} onChange={e => setMemo(e.target.value)}
            className="w-full text-sm text-gray-600 resize-none outline-none bg-transparent"
            rows={3} placeholder="한 줄 메모..." />
        </div>

        <button onClick={handleSubmit} disabled={loading || saved}
          className={`w-full text-white rounded-2xl py-4 font-medium text-sm ${style.button}`}>
          {saved ? '저장됐어요 🎉' : loading ? '저장 중...' : existingId ? '수정 저장하기' : '기록 저장하기'}
        </button>
      </div>
      <TabBar active="record" />
    </div>
  )
}