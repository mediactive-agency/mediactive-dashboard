import { useState, useEffect, useRef } from 'react'

const GRADIENT = 'linear-gradient(90deg, #B16CEA, #FF5E69, #FFA84B)'

// ─── Educational steps (modal cards, no highlight target) ───────────────────
const EDU_STEPS = [
  {
    id: 'welcome',
    title: 'Quick tour — 5 minutes',
    content: (name) => (
      <>
        <p style={P_STYLE}>
          Hey{name ? ` ${name}` : ''}, let's get you up to speed. This tour covers how to track outreach, log calls, and read your dashboard.
        </p>
        <p style={P_STYLE}>
          You can replay this tour anytime by clicking the <strong style={{ color: 'var(--text)' }}>?</strong> button in the top right corner.
        </p>
      </>
    ),
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'outreach-sheet',
    title: 'How to log outreach',
    content: () => (
      <>
        <p style={P_STYLE}>Every day you do outreach, open your <strong style={{ color: 'var(--text)' }}>Outreach Google Sheet</strong> and fill in the row for today's date.</p>
        <div style={GRID_STYLE}>
          {[
            { col: 'Col A — Date', desc: "Today's date, e.g. 15 Jun 2025" },
            { col: 'Col B — Connections sent', desc: 'How many connection requests you sent' },
            { col: 'Col C — Replies', desc: 'How many people replied to you' },
            { col: 'Col D — Positive replies', desc: 'Replies that showed interest or booked a call' },
            { col: 'Col E — Bookings', desc: 'Calls actually booked that day' },
            { col: 'Col F — Followups done', desc: 'Followups sent to people who replied' },
          ].map(({ col, desc }) => (
            <div key={col} style={GRID_ITEM_STYLE}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{col}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
        <p style={{ ...P_STYLE, marginTop: 10 }}>Each month has its own tab (Jan, Feb, Mar…). The dashboard reads all tabs automatically.</p>
      </>
    ),
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
  },
  {
    id: 'log-call',
    title: 'How to log a sales call',
    content: () => (
      <>
        <p style={P_STYLE}>After every sales call, just open <strong style={{ color: 'var(--text)' }}>Claude</strong> and say:</p>
        <div style={QUOTE_STYLE}>"Log my last call"</div>
        <p style={P_STYLE}>Claude uses your Fathom recording to automatically extract:</p>
        <div style={CHECKLIST_STYLE}>
          {['Prospect name and call date', 'Their current situation and goals', 'All objections raised', 'Whether it closed or needs a follow-up', 'Lead quality score (1–5)', 'Duration and service pitched'].map(item => (
            <div key={item} style={CHECKLIST_ITEM_STYLE}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p style={P_STYLE}>Claude shows you a preview and asks for confirmation before logging anything. You stay in control.</p>
      </>
    ),
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    ),
  },
  {
    id: 'dashboard-tabs',
    title: "What's in the dashboard",
    content: (_, onNav) => (
      <>
        <p style={P_STYLE}>The sidebar has five sections. Here's what each one shows:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Dashboard', nav: 'dashboard', desc: 'Full-funnel overview: connections → replies → bookings → closed deals. Monthly performance chart.' },
            { label: 'Outreach', nav: 'outreach', desc: 'LinkedIn analytics per month. Conversion rates at each step of the funnel.' },
            { label: 'Sales Calls', nav: 'sales', desc: 'Call log with objections breakdown, lead quality distribution, and upcoming booked calls.' },
            { label: 'Daily Tasks', nav: 'tasks', desc: 'Your streak calendar. Track outreach and followup consistency day by day.' },
            { label: 'Clients', nav: 'clients', desc: 'All active clients and their revenue. Pipeline view of deals in progress.' },
          ].map(({ label, nav, desc }) => (
            <div key={label} style={TAB_ROW_STYLE}
              onClick={() => onNav && onNav(nav)}
              role={onNav ? 'button' : undefined}
              tabIndex={onNav ? 0 : undefined}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.4 }}>{desc}</div>
              {onNav && (
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>Click to open →</div>
              )}
            </div>
          ))}
        </div>
      </>
    ),
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: 'done',
    title: "You're ready",
    content: (name) => (
      <>
        <p style={P_STYLE}>
          That's everything, {name ? name : 'you're all set'}. Start logging your outreach daily and Claude will handle the call logging automatically.
        </p>
        <div style={CHECKLIST_STYLE}>
          {[
            'Fill in your outreach sheet every day',
            'After each sales call: "Log my last call" in Claude',
            'Check your dashboard weekly to spot trends',
            'Use the ? button if you need this tour again',
          ].map(item => (
            <div key={item} style={CHECKLIST_ITEM_STYLE}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </>
    ),
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
]

// ─── Overlay tour steps (highlight real UI elements) ──────────────────────
// Each step points at a CSS data-tour attribute on a DOM element
const OVERLAY_STEPS = [
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: 'Dashboard tab',
    body: 'Your main overview. Funnel metrics, monthly performance, and pipeline status all in one place.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-outreach"]',
    title: 'Outreach tab',
    body: 'See your LinkedIn funnel by month. Track connection rate, reply rate, and booking rate.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-sales"]',
    title: 'Sales Calls tab',
    body: 'Every logged call appears here. Objections breakdown, lead quality scores, and upcoming calls.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-tasks"]',
    title: 'Daily Tasks tab',
    body: 'Your streak calendar. See at a glance which days you did outreach and followups.',
    placement: 'right',
  },
  {
    target: '[data-tour="filter-bar"]',
    title: 'Date filter',
    body: 'Filter all charts by time period — last 30 days, last quarter, or a custom date range.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="help-btn"]',
    title: 'This button',
    body: 'Opens this tour again anytime. If you ever forget how something works, start here.',
    placement: 'bottom-left',
  },
]

// ─── Shared styles ────────────────────────────────────────────────────────────
const P_STYLE = { fontSize: 13.5, lineHeight: 1.65, color: 'var(--text2)', margin: '0 0 10px' }
const QUOTE_STYLE = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: '3px solid #B16CEA',
  borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text)',
  fontStyle: 'italic', margin: '0 0 12px',
}
const CHECKLIST_STYLE = { display: 'flex', flexDirection: 'column', gap: 7, margin: '0 0 10px' }
const CHECKLIST_ITEM_STYLE = { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.45 }
const GRID_STYLE = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, margin: '0 0 10px' }
const GRID_ITEM_STYLE = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }
const TAB_ROW_STYLE = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '8px 12px', cursor: 'pointer', transition: 'border-color 0.15s',
}

// ─── Tooltip positioning ─────────────────────────────────────────────────────
function getTooltipPos(rect, placement, isMobile) {
  if (!rect) return { top: 100, left: '50%', transform: 'translateX(-50%)' }
  const GAP = 14
  if (isMobile) {
    return { bottom: 24, left: 16, right: 16, top: 'auto', transform: 'none', position: 'fixed' }
  }
  if (placement === 'right') return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: 'translateY(-50%)' }
  if (placement === 'bottom') return { top: rect.bottom + GAP, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  if (placement === 'bottom-left') return { top: rect.bottom + GAP, right: window.innerWidth - rect.right, transform: 'none' }
  return { top: rect.bottom + GAP, left: rect.left }
}

// ─── Highlight box around target ─────────────────────────────────────────────
function Highlight({ rect }) {
  if (!rect) return null
  const PAD = 6
  return (
    <div style={{
      position: 'fixed',
      top: rect.top - PAD, left: rect.left - PAD,
      width: rect.width + PAD * 2, height: rect.height + PAD * 2,
      borderRadius: 10, border: '2px solid #B16CEA',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
      zIndex: 1200, pointerEvents: 'none',
      transition: 'all 0.25s ease',
    }} />
  )
}

// ─── Overlay tooltip ──────────────────────────────────────────────────────────
function OverlayTooltip({ step, total, stepData, onNext, onSkip, rect, isMobile }) {
  const pos = getTooltipPos(rect, stepData.placement, isMobile)
  return (
    <div style={{
      position: 'fixed', zIndex: 1201,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px', width: isMobile ? undefined : 260,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      ...pos,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {step + 1} / {total}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{stepData.title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 14 }}>{stepData.body}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onSkip} style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Skip tour
        </button>
        <button onClick={onNext} style={{
          padding: '7px 16px', background: 'var(--text)', color: 'var(--bg)',
          border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12.5,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {step === total - 1 ? 'Done' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function OnboardingTour({ userName, onClose, onNav, isMobile, startAtOverlay = false }) {
  const [phase, setPhase] = useState(startAtOverlay ? 'overlay' : 'edu') // 'edu' | 'overlay' | 'done'
  const [eduStep, setEduStep] = useState(0)
  const [overlayStep, setOverlayStep] = useState(0)
  const [rect, setRect] = useState(null)

  // Measure target element for overlay steps
  useEffect(() => {
    if (phase !== 'overlay') return
    const step = OVERLAY_STEPS[overlayStep]
    const el = document.querySelector(step.target)
    if (el) {
      setRect(el.getBoundingClientRect())
    } else {
      setRect(null)
    }
  }, [phase, overlayStep])

  // ── EDU phase ────────────────────────────────────────────────────────────
  function eduNext() {
    if (eduStep < EDU_STEPS.length - 1) {
      setEduStep(s => s + 1)
    } else {
      setPhase('overlay')
      setOverlayStep(0)
    }
  }
  function eduBack() { setEduStep(s => Math.max(0, s - 1)) }

  // ── OVERLAY phase ─────────────────────────────────────────────────────────
  function overlayNext() {
    if (overlayStep < OVERLAY_STEPS.length - 1) {
      setOverlayStep(s => s + 1)
    } else {
      onClose()
    }
  }

  // ── EDU modal ─────────────────────────────────────────────────────────────
  if (phase === 'edu') {
    const step = EDU_STEPS[eduStep]
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 16 : 32,
      }}>
        <div style={{
          width: '100%', maxWidth: 560,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh',
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: GRADIENT, width: `${((eduStep + 1) / EDU_STEPS.length) * 100}%`, transition: 'width 0.3s ease', flexShrink: 0 }} />

          <div style={{ padding: isMobile ? '24px 20px' : '32px 36px', overflowY: 'auto' }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
              {EDU_STEPS.map((s, i) => (
                <div key={s.id} style={{ width: i === eduStep ? 20 : 6, height: 6, borderRadius: 3, background: i <= eduStep ? 'var(--text)' : 'var(--border)', transition: 'all 0.25s' }} />
              ))}
            </div>

            {/* Icon */}
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', marginBottom: 16 }}>
              {step.icon}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              {step.title}
            </h2>

            {/* Content */}
            {step.content(userName, onNav)}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <div>
                {eduStep > 0
                  ? <button onClick={eduBack} style={{ fontSize: 13, color: 'var(--text2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Back</button>
                  : <button onClick={onClose} style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
                }
              </div>
              <button onClick={eduNext} style={{
                padding: '10px 22px', background: 'var(--text)', color: 'var(--bg)',
                border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13.5,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {eduStep === EDU_STEPS.length - 1 ? 'Show me the dashboard →' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── OVERLAY phase ─────────────────────────────────────────────────────────
  if (phase === 'overlay') {
    const stepData = OVERLAY_STEPS[overlayStep]
    return (
      <>
        <Highlight rect={rect} />
        <OverlayTooltip
          step={overlayStep}
          total={OVERLAY_STEPS.length}
          stepData={stepData}
          onNext={overlayNext}
          onSkip={onClose}
          rect={rect}
          isMobile={isMobile}
        />
      </>
    )
  }

  return null
}

// ─── Help button (? icon) exported separately ─────────────────────────────────
export function HelpButton({ onClick }) {
  return (
    <button
      data-tour="help-btn"
      onClick={onClick}
      title="Open tour"
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--bg)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: 'var(--text2)', flexShrink: 0,
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </button>
  )
}
