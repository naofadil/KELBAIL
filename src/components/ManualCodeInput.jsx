import { useState } from 'react'
import { Zap, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ManualCodeInput({ onSubmit, isLoading = false }) {
  const [code, setCode] = useState('')
  const submit = (e) => { e.preventDefault(); if (code.trim()) { onSubmit(code.trim()); setCode('') } }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">Ou saisis le code du billet manuellement</label>
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex: TKT-ABC12345" disabled={isLoading} className="bg-secondary border-border text-foreground font-mono text-center tracking-wider h-12 text-lg" autoFocus />
      </div>
      <Button type="submit" disabled={!code.trim() || isLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-xl font-semibold flex items-center justify-center gap-2">
        {isLoading ? <><LoaderCircle className="w-4 h-4 animate-spin" />Validation en cours...</> : <><Zap className="w-4 h-4" />Valider le billet</>}
      </Button>
    </form>
  )
}
