import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, MessageSquare, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '@/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import SubPageHeader from '@/components/SubPageHeader'
import { useRequireAuth } from '@/hooks/useAuth'

const threadId = (eventId, a, b) => `${eventId}:${[a, b].sort().join('|')}`

/** Messagerie acheteur ↔ organisateur, un fil par événement. */
export default function Conversations() {
  const qc = useQueryClient()
  const { user } = useRequireAuth()
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => api.entities.Event.list('-created_date', 200) })
  const { data: messages = [] } = useQuery({ queryKey: ['messages', user?.email], queryFn: () => api.entities.Message.list('created_date', 5000), enabled: !!user?.email, refetchInterval: 4000 })
  const mine = useMemo(() => messages.filter((m) => m.from_email === user?.email || m.to_email === user?.email), [messages, user])

  // Ouverture depuis la fiche événement : ?event=<id> crée/ouvre le fil avec l'organisateur.
  const startEventId = params.get('event')
  const startEvent = events.find((e) => e.id === startEventId)
  const activeThread = params.get('thread') || (startEvent && startEvent.organizer_email && startEvent.organizer_email !== user?.email ? threadId(startEvent.id, user?.email, startEvent.organizer_email) : null)

  const threads = useMemo(() => {
    const map = {}
    mine.forEach((m) => { (map[m.thread_id] ||= []).push(m) })
    if (activeThread && !map[activeThread]) map[activeThread] = []
    return Object.entries(map).map(([id, list]) => {
      const [eventId, pair] = id.split(':'); const other = pair.split('|').find((e) => e !== user?.email)
      const event = events.find((e) => e.id === eventId)
      const last = list[list.length - 1]
      return { id, event, other, last, unread: list.filter((m) => m.to_email === user?.email && !m.read).length, list }
    }).sort((a, b) => new Date(b.last?.created_date || 0) - new Date(a.last?.created_date || 0))
  }, [mine, events, activeThread, user])

  const current = threads.find((t) => t.id === activeThread)
  const otherName = current?.event ? (current.other === current.event.organizer_email ? current.event.organizer_name : null) : null

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [current?.list.length])
  useEffect(() => {
    if (!current) return
    current.list.filter((m) => m.to_email === user.email && !m.read).forEach((m) => api.entities.Message.update(m.id, { read: true }))
  }, [current, user])

  const send = useMutation({
    mutationFn: async () => {
      const body = text.trim(); if (!body || !current) return
      await api.entities.Message.create({ thread_id: current.id, event_id: current.event?.id, from_email: user.email, from_name: user.full_name, to_email: current.other, body, read: false })
      await api.entities.Notification.create({ user_email: current.other, type: 'message', status: 'unread', title: `Message de ${user.full_name}`, message: body.slice(0, 80), action_url: `/compte/conversations?thread=${encodeURIComponent(current.id)}` })
    },
    onSuccess: () => { setText(''); qc.invalidateQueries({ queryKey: ['messages'] }) },
  })

  if (!user) return null
  return (
    <div className="min-h-screen flex flex-col">
      <SubPageHeader title={current ? (otherName || current.other) : 'Conversations'} subtitle={current ? current.event?.title : 'Tes messages'} backTo={current ? '/compte/conversations' : '/compte'} />
      {!current ? (
        <main className="max-w-lg mx-auto w-full px-4 py-5">
          {threads.length === 0 ? (
            <div className="text-center py-12"><MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Aucune conversation</p><p className="text-xs text-muted-foreground mt-1">Contacte un organisateur depuis la fiche d'un événement.</p></div>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => (
                <button key={t.id} onClick={() => setParams({ thread: t.id })} className="w-full text-left bg-card border border-border/50 rounded-xl p-3.5 flex items-center gap-3 hover:border-primary/30 transition-colors">
                  {t.event?.poster_url ? <img src={t.event.poster_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2"><p className="font-semibold text-foreground text-sm truncate">{t.other === t.event?.organizer_email ? t.event?.organizer_name : t.last?.from_email === t.other ? t.last.from_name : t.other}</p>{t.last && <span className="text-[10px] text-muted-foreground flex-shrink-0">{format(new Date(t.last.created_date), 'd MMM HH:mm', { locale: fr })}</span>}</div>
                    <p className="text-xs text-muted-foreground truncate">{t.event?.title}</p>
                    <p className="text-xs text-foreground/80 truncate mt-0.5">{t.last ? `${t.last.from_email === user.email ? 'Toi : ' : ''}${t.last.body}` : 'Nouvelle conversation'}</p>
                  </div>
                  {t.unread > 0 ? <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{t.unread}</span> : <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                </button>
              ))}
            </div>
          )}
        </main>
      ) : (
        <>
          <main className="max-w-lg mx-auto w-full px-4 py-5 flex-1 space-y-3 pb-24">
            {current.list.length === 0 && <p className="text-xs text-center text-muted-foreground">Démarre la conversation à propos de « {current.event?.title} ».</p>}
            {current.list.map((m) => { const me = m.from_email === user.email; return (
              <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${me ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border/50 text-foreground rounded-bl-sm'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${me ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{format(new Date(m.created_date), 'HH:mm')}</p>
                </div>
              </div>) })}
            <div ref={bottomRef} />
          </main>
          <form onSubmit={(e) => { e.preventDefault(); send.mutate() }} className="fixed bottom-20 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/30 p-3">
            <div className="max-w-lg mx-auto flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Écris ton message..." className="bg-secondary border-border text-foreground rounded-xl" />
              <Button type="submit" disabled={!text.trim() || send.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4"><Send className="w-4 h-4" /></Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
