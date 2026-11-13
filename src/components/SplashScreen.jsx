import { useEffect, useMemo, useState } from 'react'

const CONFETTI_COLORS = ['#e649d8', '#22d3ee', '#8b5cf6', '#60a5fa', '#f472b6']

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true)
  const [phase, setPhase] = useState('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 500)
    const t2 = setTimeout(() => setPhase('exit'), 2400)
    const t3 = setTimeout(() => { setVisible(false); onComplete() }, 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  const confetti = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      left: (i * 53 + 11) % 100,
      top: (i * 37 + 5) % 85,
      size: 5 + (i % 3) * 3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 4 + (i % 5),
      delay: -((i * 0.7) % 4),
      rotate: (i * 47) % 360,
    })), [])

  if (!visible) return null
  const exiting = phase === 'exit'

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(120% 90% at 50% 0%, #152a7e 0%, #0b1552 38%, #060b33 70%, #04061f 100%)',
        animation: exiting ? 'spFadeOut .6s ease-out forwards' : 'none',
      }}
    >
      <style>{`
        @keyframes spFadeOut { to { opacity: 0 } }
        @keyframes spGlowPulse { 0%,100% { opacity:.5 } 50% { opacity:.9 } }
        @keyframes spRibbonDrift { 0%,100% { transform: translateX(0) translateY(0) } 50% { transform: translateX(14px) translateY(-8px) } }
        @keyframes spRibbonDrift2 { 0%,100% { transform: translateX(0) translateY(0) } 50% { transform: translateX(-16px) translateY(6px) } }
        @keyframes spBeamSway { 0%,100% { transform: rotate(38deg) } 50% { transform: rotate(42deg) } }
        @keyframes spBeamSway2 { 0%,100% { transform: rotate(52deg); opacity:.55 } 50% { transform: rotate(49deg); opacity:.8 } }
        @keyframes spConfetti {
          0%   { transform: translateY(-6vh) rotate(0deg) }
          100% { transform: translateY(106vh) rotate(540deg) }
        }
        @keyframes spLogoPop {
          0%   { transform: scale(.3) rotate(-18deg); opacity:0 }
          60%  { transform: scale(1.08) rotate(3deg); opacity:1 }
          100% { transform: scale(1) rotate(0deg); opacity:1 }
        }
        @keyframes spLogoFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
        @keyframes spLogoGlow {
          0%,100% { filter: drop-shadow(0 0 18px rgba(77,166,255,.45)) }
          50%     { filter: drop-shadow(0 0 42px rgba(120,200,255,.85)) }
        }
        @keyframes spTitleUp { 0% { transform: translateY(26px); opacity:0 } 100% { transform: translateY(0); opacity:1 } }
        @keyframes spLineGrow { 0% { transform: scaleX(0); opacity:0 } 100% { transform: scaleX(1); opacity:1 } }
        @keyframes spLineGlow { 0%,100% { box-shadow: 0 0 12px 2px rgba(34,211,238,.6) } 50% { box-shadow: 0 0 26px 6px rgba(34,211,238,.95) } }
        @keyframes spCrowdUp { 0% { transform: translateY(40px); opacity:0 } 100% { transform: translateY(0); opacity:1 } }
        @keyframes spBokeh { 0%,100% { opacity:.35; transform: scale(1) } 50% { opacity:.85; transform: scale(1.25) } }
        @keyframes spExitZoom { to { transform: scale(1.15); opacity:0 } }
      `}</style>

      {/* Lueur violette en haut à droite */}
      <div className="absolute pointer-events-none" style={{
        top: '-10%', right: '-5%', width: '55vw', height: '45vh', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,.4) 0%, transparent 65%)',
        animation: 'spGlowPulse 4s ease-in-out infinite',
      }} />

      {/* Projecteurs haut-droite */}
      <div className="absolute pointer-events-none" style={{
        top: '-6%', right: '6%', width: '10px', height: '48vh', transformOrigin: 'top center',
        background: 'linear-gradient(to bottom, rgba(180,230,255,.8), rgba(90,160,255,.25) 55%, transparent)',
        filter: 'blur(6px)', animation: 'spBeamSway 5s ease-in-out infinite',
      }} />
      <div className="absolute pointer-events-none" style={{
        top: '-8%', right: '20%', width: '16px', height: '42vh', transformOrigin: 'top center',
        background: 'linear-gradient(to bottom, rgba(167,139,250,.7), rgba(120,110,255,.2) 55%, transparent)',
        filter: 'blur(9px)', animation: 'spBeamSway2 6s ease-in-out infinite',
      }} />

      {/* Rubans de lumière — haut gauche */}
      <svg className="absolute pointer-events-none" style={{ top: 0, left: 0, width: '70vw', height: '38vh', animation: 'spRibbonDrift 7s ease-in-out infinite' }} viewBox="0 0 400 220" fill="none" preserveAspectRatio="none">
        <path d="M-20 30 C 80 90, 180 10, 420 60" stroke="url(#rg1)" strokeWidth="26" strokeLinecap="round" opacity=".5" filter="url(#rb)" />
        <path d="M-20 90 C 100 150, 220 60, 420 130" stroke="url(#rg1)" strokeWidth="12" strokeLinecap="round" opacity=".7" filter="url(#rb)" />
        <defs>
          <linearGradient id="rg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22d3ee" stopOpacity=".9" />
            <stop offset=".5" stopColor="#4da6ff" stopOpacity=".5" />
            <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <filter id="rb"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
      </svg>

      {/* Rubans de lumière — bas */}
      <svg className="absolute pointer-events-none" style={{ bottom: '4vh', left: 0, width: '100vw', height: '30vh', animation: 'spRibbonDrift2 8s ease-in-out infinite' }} viewBox="0 0 400 160" fill="none" preserveAspectRatio="none">
        <path d="M-20 120 C 90 40, 260 160, 420 60" stroke="url(#rg2)" strokeWidth="20" strokeLinecap="round" opacity=".45" filter="url(#rb2)" />
        <path d="M-20 150 C 120 80, 280 180, 420 100" stroke="url(#rg2)" strokeWidth="9" strokeLinecap="round" opacity=".65" filter="url(#rb2)" />
        <defs>
          <linearGradient id="rg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity=".7" />
            <stop offset=".5" stopColor="#38bdf8" stopOpacity=".8" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity=".2" />
          </linearGradient>
          <filter id="rb2"><feGaussianBlur stdDeviation="5" /></filter>
        </defs>
      </svg>

      {/* Confettis */}
      {confetti.map((c, i) => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${c.left}%`, top: `${c.top}%`,
          width: c.size, height: c.size * 0.45, borderRadius: 2,
          background: c.color, opacity: .85,
          transform: `rotate(${c.rotate}deg)`,
          animation: `spConfetti ${c.duration}s linear ${c.delay}s infinite`,
        }} />
      ))}

      {/* Contenu central */}
      <div className="relative z-10 text-center px-6" style={{ animation: exiting ? 'spExitZoom .6s cubic-bezier(.2,0,0,1) forwards' : 'none' }}>
        {/* Logo tourbillon */}
        <div className="mx-auto mb-8" style={{ animation: 'spLogoPop .8s cubic-bezier(.34,1.56,.64,1) both' }}>
          <div style={{ animation: 'spLogoFloat 3.5s ease-in-out 1s infinite' }}>
            <svg width="160" height="160" viewBox="0 0 200 200" fill="none" className="mx-auto" style={{ animation: 'spLogoGlow 2.6s ease-in-out infinite' }}>
              <g transform="rotate(-30 100 100)">
                {/* Crochet supérieur */}
                <path d="M152 58 C 122 20, 56 26, 46 72 C 38 106, 64 124, 100 110" stroke="#16409f" strokeWidth="40" strokeLinecap="round" fill="none" />
                <path d="M152 58 C 122 20, 56 26, 46 72 C 38 106, 64 124, 100 110" stroke="#4da6ff" strokeWidth="28" strokeLinecap="round" fill="none" />
                <path d="M149 60 C 122 27, 62 31, 53 72 C 46 101, 68 116, 98 105" stroke="#e8f5ff" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".95" />
                {/* Crochet inférieur (miroir) */}
                <path d="M48 142 C 78 180, 144 174, 154 128 C 162 94, 136 76, 100 90" stroke="#16409f" strokeWidth="40" strokeLinecap="round" fill="none" />
                <path d="M48 142 C 78 180, 144 174, 154 128 C 162 94, 136 76, 100 90" stroke="#4da6ff" strokeWidth="28" strokeLinecap="round" fill="none" />
                <path d="M51 140 C 78 173, 138 169, 147 128 C 154 99, 132 84, 102 95" stroke="#e8f5ff" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".95" />
              </g>
            </svg>
          </div>
        </div>

        {/* Titre */}
        <h1
          className="text-5xl font-black text-white tracking-tight"
          style={{ animation: 'spTitleUp .6s ease-out .35s both', textShadow: '0 4px 30px rgba(77,166,255,.5)' }}
        >
          Kel Bail
        </h1>

        {/* Trait lumineux */}
        <div
          className="mx-auto mt-4 h-1 w-40 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent, #22d3ee 30%, #60a5fa 70%, transparent)',
            animation: 'spLineGrow .5s ease-out .6s both, spLineGlow 2.2s ease-in-out 1.1s infinite',
          }}
        />

        {/* Slogan */}
        <p
          className="text-base text-blue-100/90 mt-5 font-medium tracking-wide"
          style={{ animation: 'spTitleUp .6s ease-out .75s both' }}
        >
          Découvre les meilleurs événements
        </p>
      </div>

      {/* Foule en silhouette + lumières bokeh */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ animation: 'spCrowdUp .9s ease-out .5s both' }}>
        {/* Bokeh colorés derrière la foule */}
        {[
          { l: '8%', b: 70, s: 26, c: '#8b5cf6', d: 0 }, { l: '22%', b: 88, s: 16, c: '#38bdf8', d: .6 },
          { l: '38%', b: 64, s: 30, c: '#60a5fa', d: 1.1 }, { l: '55%', b: 92, s: 14, c: '#e879f9', d: .3 },
          { l: '70%', b: 72, s: 24, c: '#818cf8', d: .9 }, { l: '86%', b: 84, s: 18, c: '#22d3ee', d: 1.5 },
        ].map((b, i) => (
          <div key={i} className="absolute rounded-full" style={{
            left: b.l, bottom: b.b, width: b.s, height: b.s, background: b.c,
            filter: 'blur(10px)', animation: `spBokeh ${2.4 + i * .3}s ease-in-out ${b.d}s infinite`,
          }} />
        ))}
        {/* Silhouette de foule, bras levés */}
        <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="w-full block" style={{ height: '14vh' }}>
          <path
            d="M0 90 L0 62 Q6 58 10 60 L14 44 L17 44 L19 58 Q28 52 36 56 L38 38 Q40 34 42 38 L44 54 Q52 48 60 54 L63 30 L66 30 L68 50 Q78 44 88 52 L90 40 Q92 36 94 40 L97 54 Q106 48 114 56 L118 36 L121 36 L123 52 Q132 46 140 54 L144 28 Q146 24 148 28 L151 48 Q160 44 168 52 L172 40 L175 40 L177 56 Q186 50 194 58 L198 34 Q200 30 202 34 L205 52 Q214 46 222 54 L226 42 L229 42 L231 56 Q240 50 248 58 L252 32 L255 32 L257 50 Q266 46 274 54 L278 38 Q280 34 282 38 L285 54 Q294 48 302 56 L306 42 L309 42 L311 58 Q320 52 328 58 L332 36 L335 36 L337 54 Q346 50 354 58 L358 44 Q360 40 362 44 L365 58 Q374 54 382 60 L386 48 L389 48 L391 60 Q396 58 400 62 L400 90 Z"
            fill="#030617"
          />
        </svg>
      </div>
    </div>
  )
}
