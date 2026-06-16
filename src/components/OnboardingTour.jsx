import { useState, useEffect } from 'react'
import { IMG_VARIABLES, IMG_NOTES } from '../tourImages'

const GRADIENT = 'linear-gradient(90deg, #B16CEA, #FF5E69, #FFA84B)'

// ─── Shared components ────────────────────────────────────────────────────────
function ImportantBox({ children }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1.5px solid #EF4444',
      borderRadius: 10, padding: '13px 15px', marginBottom: 18,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style={{ fontSize: 14, color: '#EF4444', lineHeight: 1.6, fontWeight: 600 }}>{children}</div>
    </div>
  )
}

function Screenshot({ src, alt, caption }) {
  if (!src) return null
  return (
    <div style={{ marginBottom: 18 }}>
      <img src={src} alt={alt || caption || 'Screenshot'} style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }} />
      {caption && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 6 }}>{caption}</div>}
    </div>
  )
}

const P = ({ children }) => (
  <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text2)', margin: '0 0 14px' }}>{children}</p>
)

const Bold = ({ children }) => (
  <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</strong>
)

function Row({ col, desc, highlight }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '9px 12px', borderRadius: 8, marginBottom: 7,
      background: highlight ? 'rgba(177,108,234,0.08)' : 'var(--bg)',
      border: `1px solid ${highlight ? '#B16CEA' : 'var(--border)'}`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: highlight ? '#B16CEA' : 'var(--text)', minWidth: 58, flexShrink: 0, fontFamily: 'monospace', paddingTop: 2 }}>{col}</div>
      <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

function CheckItem({ children, ok = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 14, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 10 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ok ? '#10B981' : '#EF4444'} strokeWidth="3" style={{ flexShrink: 0, marginTop: 2 }}>
        {ok
          ? <polyline points="20 6 9 17 4 12"/>
          : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
      </svg>
      <span>{children}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>
      {children}
    </div>
  )
}

// ─── Edu steps ────────────────────────────────────────────────────────────────
const EDU_STEPS = [
  {
    id: 'welcome',
    title: 'Quick tour — 5 minutes',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    render: (name) => (
      <>
        <P>Hey{name ? ` ${name}` : ''}, let's walk through how everything works. This takes about 5 minutes and will save you a lot of confusion later.</P>
        <ImportantBox>
          You <Bold>must</Bold> use the provided templates for the Outreach sheet, Sales Calls sheet, and the Claude skill. Your own sheet will not work — the dashboard reads specific columns and tab names. If the structure is different, data will be missing or broken.
        </ImportantBox>
        <P>You can replay this tour anytime using the <Bold>?</Bold> button in the top right corner.</P>
      </>
    ),
  },
  {
    id: 'outreach-sheet',
    title: 'How to fill in the outreach sheet',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    render: () => (
      <>
        <P>Every day you do outreach, add a row for that date. One row per day, one tab per month (Jan, Feb, Mar…).</P>
        <Row col="Col B" desc="Name of the person you connected with" />
        <Row col="Col C" desc="Link to their LinkedIn profile" />
        <Row col="Col D" desc="Date you sent the connection request" />
        <Row col="Col E" desc="Which account or variable this belongs to" />
        <Row col="Col F–J" desc={<>Notes columns — write what they said. If someone replies, <Bold>log their response here</Bold>.</>} highlight />
        <Row col="Col O" desc={<>Positive reply — mark the date here when someone shows genuine interest. This starts their positive followup tracking.</>} highlight />
        <Row col="Col AB" desc={<>Booking date — when they book a call. This removes them from the positive followup queue.</>} highlight />
        <P>The dashboard reads all tabs automatically — you never need to export or copy anything.</P>
      </>
    ),
  },
  {
    id: 'variables',
    title: 'Variables — tracking by account',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
    render: () => (
      <>
        <P>Variables let you track your outreach in more detail — by LinkedIn account, by message type, or by anything else you want to split by.</P>
        <Screenshot src={IMG_VARIABLES} caption="Variables table at the top of each monthly tab" />
        <P>Name your variables in the top table (rows 4–8). Then when you log a connection in row 11 onwards, pick the matching variable in column E. The summary at the top updates automatically.</P>
        <P>You can add more variable rows if you need them — the app handles it. Shoutout Ghassan Jenedy for this feature.</P>
      </>
    ),
  },
  {
    id: 'followup-logic',
    title: 'The followup logic',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    render: () => (
      <>
        <P>The Daily Tasks tab tracks whether you are staying on top of your followups. Here is exactly what goes where:</P>
        <Screenshot src={IMG_NOTES} caption="Notes column — log every reply so the app knows not to chase them again" />
        <SectionLabel>Regular followups</SectionLabel>
        <CheckItem>Someone replies → write their response in the <Bold>Notes column (F–J)</Bold> and set a followup date in <Bold>col D</Bold></CheckItem>
        <CheckItem>You send the followup → mark the date in <Bold>col E</Bold></CheckItem>
        <CheckItem ok={false}>They say they are not interested → write it in Notes but do <Bold>not</Bold> set a new followup date. This removes them from your queue automatically.</CheckItem>

        <SectionLabel>Positive followups</SectionLabel>
        <CheckItem>Someone shows real interest → mark the date in <Bold>col O</Bold></CheckItem>
        <CheckItem>They stay in your positive followup list until you log a booking in <Bold>col AB</Bold></CheckItem>
        <CheckItem ok={false}>Do not leave col O empty if they were interested — the dashboard will not count them and you will lose track of them.</CheckItem>
      </>
    ),
  },
  {
    id: 'log-call',
    title: 'How to log a sales call',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
    render: () => (
      <>
        <ImportantBox>You need the Claude skill installed and Zapier connected. If you skipped that during setup, go to Settings and download the skill file.</ImportantBox>
        <P>After every sales call, open Claude and type:</P>
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderLeft: '3px solid #B16CEA', borderRadius: 8,
          padding: '12px 16px', fontSize: 16, fontWeight: 600,
          color: 'var(--text)', fontStyle: 'italic', marginBottom: 16,
        }}>
          "Log my last call"
        </div>
        <P>Claude reads the Fathom recording and extracts everything — prospect name, current situation, goals, objections, whether it closed, and a lead quality score. It shows you a preview and asks for confirmation before writing anything to the sheet.</P>

        <SectionLabel>What gets logged automatically</SectionLabel>
        <CheckItem>Prospect name, call date, and duration</CheckItem>
        <CheckItem>Current situation and goals</CheckItem>
        <CheckItem>Objections (mapped to standard categories)</CheckItem>
        <CheckItem>Closed / follow-up / no-show status</CheckItem>
        <CheckItem>Lead quality score from 1 to 5</CheckItem>
      </>
    ),
  },
  {
    id: 'done',
    title: 'You are all set',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
    render: (name) => (
      <>
        <P>{"That's it"}{name ? `, ${name}` : ''}. The tour continues with a quick overlay showing you where everything lives in the dashboard.</P>
        <CheckItem>Fill in the outreach sheet every day</CheckItem>
        <CheckItem>After each sales call: "Log my last call" in Claude</CheckItem>
        <CheckItem>Check the dashboard weekly to spot trends and fix weak points</CheckItem>
        <CheckItem>Use the <Bold>?</Bold> button if you need this tour again</CheckItem>
      </>
    ),
  },
]

// ─── Overlay steps ────────────────────────────────────────────────────────────
const OVERLAY_STEPS = [
  {
    target: '[data-tour="sidebar-dashboard"]',
    title: 'Dashboard',
    body: 'Full-funnel overview: connections → replies → bookings → closed. Monthly performance chart and pipeline status.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-outreach"]',
    title: 'Outreach',
    body: 'LinkedIn analytics by month. Connection rate, reply rate, and booking rate all in one view.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-sales"]',
    title: 'Sales Calls',
    body: 'Every logged call appears here. Objections breakdown, lead quality scores, and upcoming booked calls.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-tasks"]',
    title: 'Daily Tasks',
    body: 'Your streak calendar. See which days you hit your outreach and followup targets.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-settings"]',
    title: 'Settings',
    body: 'Add a new outreach sheet here when a new year starts or you have data in a second spreadsheet. Download the Claude skill file again from here too.',
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

// ─── Highlight ────────────────────────────────────────────────────────────────
function Highlight({ rect }) {
  if (!rect) return null
  const PAD = 6
  return (
    <div style={{
      position: 'fixed',
      top: rect.top - PAD, left: rect.left - PAD,
      width: rect.width + PAD * 2, height: rect.height + PAD * 2,
      borderRadius: 10, border: '2px solid #B16CEA',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
      zIndex: 1200, pointerEvents: 'none',
      transition: 'all 0.25s ease',
    }} />
  )
}

// ─── Overlay tooltip ──────────────────────────────────────────────────────────
function getTooltipPos(rect, placement, isMobile) {
  if (isMobile) return { bottom: 24, left: 16, right: 16, top: 'auto', transform: 'none', position: 'fixed' }
  if (!rect) return { top: 100, left: '50%', transform: 'translateX(-50%)' }
  const GAP = 14
  if (placement === 'right')       return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: 'translateY(-50%)' }
  if (placement === 'bottom')      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  if (placement === 'bottom-left') return { top: rect.bottom + GAP, right: window.innerWidth - rect.right, transform: 'none' }
  return { top: rect.bottom + GAP, left: rect.left }
}

function OverlayTooltip({ step, total, stepData, onNext, onSkip, rect, isMobile }) {
  const pos = getTooltipPos(rect, stepData.placement, isMobile)
  return (
    <div style={{
      position: 'fixed', zIndex: 1201,
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '18px 20px', width: isMobile ? undefined : 270,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      ...pos,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {step + 1} / {total}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 7 }}>{stepData.title}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>{stepData.body}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onSkip} style={{ fontSize: 13, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Skip tour
        </button>
        <button onClick={onNext} style={{
          padding: '8px 18px', background: 'var(--text)', color: 'var(--bg)',
          border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {step === total - 1 ? 'Done' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingTour({ userName, onClose, onNav, isMobile }) {
  const [phase, setPhase] = useState('edu')
  const [eduStep, setEduStep] = useState(0)
  const [overlayStep, setOverlayStep] = useState(0)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (phase !== 'overlay') return
    const el = document.querySelector(OVERLAY_STEPS[overlayStep].target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [phase, overlayStep])

  function eduNext() {
    if (eduStep < EDU_STEPS.length - 1) setEduStep(s => s + 1)
    else { setPhase('overlay'); setOverlayStep(0) }
  }
  function eduBack() { setEduStep(s => Math.max(0, s - 1)) }

  function overlayNext() {
    if (overlayStep < OVERLAY_STEPS.length - 1) setOverlayStep(s => s + 1)
    else onClose()
  }

  // EDU modal
  if (phase === 'edu') {
    const step = EDU_STEPS[eduStep]
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? 12 : 32,
      }}>
        <div style={{
          width: '100%', maxWidth: 600,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: GRADIENT, width: `${((eduStep + 1) / EDU_STEPS.length) * 100}%`, transition: 'width 0.3s ease', flexShrink: 0 }} />

          <div style={{ padding: isMobile ? '22px 20px' : '32px 36px', overflowY: 'auto' }}>
            {/* Dots */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
              {EDU_STEPS.map((s, i) => (
                <div key={s.id} style={{ width: i === eduStep ? 20 : 6, height: 6, borderRadius: 3, background: i <= eduStep ? 'var(--text)' : 'var(--border)', transition: 'all 0.25s' }} />
              ))}
            </div>

            {/* Icon */}
            <div style={{ width: 50, height: 50, borderRadius: 13, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', marginBottom: 16 }}>
              {step.icon}
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              {step.title}
            </h2>

            {step.render(userName, onNav)}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
              <div>
                {eduStep > 0
                  ? <button onClick={eduBack} style={{ fontSize: 14, color: 'var(--text2)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Back</button>
                  : <button onClick={onClose} style={{ fontSize: 14, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
                }
              </div>
              <button onClick={eduNext} style={{
                padding: '11px 24px', background: 'var(--text)', color: 'var(--bg)',
                border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 15,
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

  // Overlay
  return (
    <>
      <Highlight rect={rect} />
      <OverlayTooltip
        step={overlayStep}
        total={OVERLAY_STEPS.length}
        stepData={OVERLAY_STEPS[overlayStep]}
        onNext={overlayNext}
        onSkip={onClose}
        rect={rect}
        isMobile={isMobile}
      />
    </>
  )
}

// ─── Help button ──────────────────────────────────────────────────────────────
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
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </button>
  )
}
