'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { TabBar, MEMBERS } from '../feed/page'

export default function RecordPage() {
  const [member, setMember] = useState<any>(MEMBERS[0])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [mealType, setMealType] = useState<'clean' | 'normal' | 'pig'>('clean')
  const [exerciseDone, setExerciseDone] = useState(false)
  const [exerciseMinutes, setExerciseMinutes] = useState(0)
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
      setExerciseMinutes(data.exercise_minutes || 0)
      setSnackCount(data.snack_count || 0)
      setDrinkDone(data.drink_done || false)
      setMemo(data.memo || '')
    } else {
      setExistingId(null)
      setMealType('clean')
      setExerciseDone(false)
      setExerciseMinutes(0)
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
    setExerciseMinutes(0)
    setSnackCount(0)
    setDrinkDone(false)
    setMemo('')
  }

  const colors = ['bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-blue-500']
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">기록</h1>
          {existingId && (
            <button onClick={handleDelete} className="text-red-400 text-sm border border-red-200 px-3 py-1 rounded-xl">삭제</button>
          )}
        </div>

        {existingId && (
          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 mb-4 text-sm text-violet-700">
            이미 기록이 있어요. 수정 후 저장하면 덮어써요 ✏️
          </div>
        )}

        {/* 멤버 선택 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-sm font-medium mb-3">누구로 기록할까요?</p>
          <div className="grid grid-cols-4 gap-2">
            {MEMBERS.map((m, i) => (
              <button key={m.id} onClick={() => handleMemberChange(m)}
                className={`py-3 rounded-xl text-sm font-semibold text-white transition-all ${colors[i]} ${member?.id === m.id ? 'opacity-100 ring-2 ring-offset-2 ring-violet-300' : 'opacity-40'}`}>
                {m.nickname}
              </button>
            ))}
          </div>
        </div>

        {/* 날짜 선택 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-sm font-medium mb-3">날짜 선택</p>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm"
          />
        </div>

        {/* 저녁 식단 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-sm font-medium mb-3">저녁 식단</p>
          <div className="flex gap-2">
            {[
              { value: 'clean', label: '🥗 클린식', active: 'bg-green-500 text-white' },
              { value: 'normal', label: '🍚 일반식', active: 'bg-blue-500 text-white' },
              { value: 'pig', label: '🐷 돼지식', active: 'bg-pink-500 text-white' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setMealType(opt.value as any)}
                className={`flex-1 py-3 rounded-xl text-xs font-medium ${mealType === opt.value ? opt.active : 'border border-gray-200 text-gray-400'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 운동 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-sm font-medium mb-3">운동</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setExerciseDone(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${exerciseDone ? 'bg-violet-500 text-white' : 'border border-gray-200 text-gray-400'}`}>
              💪 했어요
            </button>
            <button onClick={() => { setExerciseDone(false); setExerciseMinutes(0) }}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${!exerciseDone ? 'bg-gray-400 text-white' : 'border border-gray-200 text-gray-400'}`}>
              ❌ 안 했어요
            </button>
          </div>
          {exerciseDone && (
            <input type="number" placeholder="운동 시간 (분)"
              value={exerciseMinutes || ''}
              onChange={e => setExerciseMinutes(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm" />
          )}
        </div>

        {/* 간식 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-sm font-medium mb-3">간식</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setSnackCount(Math.max(0, snackCount - 1))}
              className="w-10 h-10 border border-gray-200 rounded-xl text-xl">−</button>
            <span className="text-xl font-semibold w-8 text-center">{snackCount}</span>
            <button onClick={() => setSnackCount(snackCount + 1)}
              className="w-10 h-10 border border-gray-200 rounded-xl text-xl">+</button>
            <span className="text-sm text-gray-400">회</span>
            {snackCount > 1 && <span className="text-orange-500 text-sm ml-auto">⚠️ {(snackCount - 1) * 1000}원</span>}
          </div>
        </div>

        {/* 음주 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
          <p className="text-sm font-medium mb-3">음주</p>
          <div className="flex gap-2">
            <button onClick={() => setDrinkDone(true)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${drinkDone ? 'bg-orange-400 text-white' : 'border border-gray-200 text-gray-400'}`}>
              🍺 했어요
            </button>
            <button onClick={() => setDrinkDone(false)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium ${!drinkDone ? 'bg-gray-400 text-white' : 'border border-gray-200 text-gray-400'}`}>
              안 했어요
            </button>
          </div>
        </div>

        {/* 메모 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <p className="text-sm font-medium mb-2">메모 (선택)</p>
          <textarea value={memo} onChange={e => setMemo(e.target.value)}
            className="w-full text-sm text-gray-600 resize-none outline-none"
            rows={3} placeholder="한 줄 메모..." />
        </div>

        <button onClick={handleSubmit} disabled={loading || saved}
          className="w-full bg-violet-500 text-white rounded-2xl py-4 font-medium text-sm">
          {saved ? '저장됐어요 🎉' : loading ? '저장 중...' : existingId ? '수정 저장하기' : '기록 저장하기'}
        </button>
      </div>
      <TabBar active="record" />
    </div>
  )
}