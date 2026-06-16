import { useState, useEffect } from 'react'

const GRADIENT = 'linear-gradient(90deg, #B16CEA, #FF5E69, #FFA84B)'

// ─── Warning box component ────────────────────────────────────────────────────
function ImportantBox({ children }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1.5px solid #EF4444',
      borderRadius: 10, padding: '12px 14px', marginBottom: 14,
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <div style={{ fontSize: 12.5, color: '#EF4444', lineHeight: 1.55, fontWeight: 600 }}>{children}</div>
    </div>
  )
}

// ─── Screenshot placeholder (shown when no src yet) ──────────────────────────
function Screenshot({ src, alt, caption }) {
  if (!src) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <img
        src={src} alt={alt || caption || 'Screenshot'}
        style={{ width: '100%', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }}
      />
      {caption && (
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 5 }}>{caption}</div>
      )}
    </div>
  )
}

// ─── Shared mini components ───────────────────────────────────────────────────
const P = ({ children }) => <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text2)', margin: '0 0 10px' }}>{children}</p>
const Bold = ({ children }) => <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{children}</strong>

function Row({ col, desc, highlight }) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '8px 10px', borderRadius: 8,
      background: highlight ? 'rgba(177,108,234,0.08)' : 'var(--bg)',
      border: `1px solid ${highlight ? '#B16CEA' : 'var(--border)'}`,
      marginBottom: 6,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: highlight ? '#B16CEA' : 'var(--text)', minWidth: 56, flexShrink: 0, fontFamily: 'monospace', paddingTop: 1 }}>{col}</div>
      <div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.45 }}>{desc}</div>
    </div>
  )
}

function CheckItem({ children, ok = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.45, marginBottom: 7 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={ok ? '#10B981' : '#EF4444'} strokeWidth="3" style={{ flexShrink: 0, marginTop: 1 }}>
        {ok ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
      </svg>
      <span>{children}</span>
    </div>
  )
}

// ─── Educational steps ────────────────────────────────────────────────────────
// screenshots prop is injected at render time so they can be updated later
function buildEduSteps(screenshots) {
  return [
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
          <ImportantBox>Use the template only. The column order must be exact — do not add, move, or rename columns.</ImportantBox>
          <P>Every day you do outreach, add a row for that date. Each row = one day.</P>
          <Screenshot src={screenshots?.outreachSheet} alt="Outreach sheet" caption="Your outreach sheet — one row per day, one tab per month" />
          <Row col="Col A" desc="Date — e.g. 15 Jun 2025" />
          <Row col="Col B" desc="Connections sent that day" />
          <Row col="Col C" desc="People who replied (any reply)" />
          <Row col="Col D" desc="Followup date — when to follow up with this person" />
          <Row col="Col E" desc="Followup done — date you actually sent the followup" />
          <Row col="Col F–J" desc="Notes for each reply — write what they said" highlight />
          <Row col="Col O" desc={<>Positive reply — someone showed interest. Mark it here so the dashboard tracks them as a <Bold>positive followup</Bold>.</>} highlight />
          <Row col="Col AB" desc="Booking date — when they booked a call" highlight />
          <P>Each month has its own tab (Jan, Feb, Mar…). The dashboard reads all tabs automatically.</P>
        </>
      ),
    },
    {
      id: 'outreach-logic',
      title: 'The followup logic',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
      render: () => (
        <>
          <P>The dashboard tracks two types of followups. Here is exactly what goes where:</P>
          <Screenshot src={screenshots?.outreachLogic} alt="Followup logic" caption="How replies and followups flow through the sheet" />

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Regular followups (col D / E)</div>
          <CheckItem>Someone replied → write their response in <Bold>col F–J (Notes)</Bold> and set a followup date in <Bold>col D</Bold></CheckItem>
          <CheckItem>When you send the followup → mark the date in <Bold>col E</Bold></CheckItem>
          <CheckItem ok={false}>They say they are not interested → write it in the Notes column, do not set a new followup date — this removes them from your queue</CheckItem>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', margin: '12px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Positive followups (col O → AB)</div>
          <CheckItem>Someone says yes or asks for more info → mark the date in <Bold>col O</Bold></CheckItem>
          <CheckItem>They stay in your positive followup list until a booking date appears in <Bold>col AB</Bold></CheckItem>
          <CheckItem ok={false}>Do not leave col O empty if they showed interest — the dashboard will not count them</CheckItem>
        </>
      ),
    },
    {
      id: 'log-call',
      title: 'How to log a sales call',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
      render: () => (
        <>
          <ImportantBox>You need the Claude skill installed and the Zapier connector enabled. If you skipped that during setup, go to Settings and download the skill file.</ImportantBox>
          <P>After every sales call, open Claude and type:</P>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: '3px solid #B16CEA', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text)', fontStyle: 'italic', marginBottom: 12 }}>
            "Log my last call"
          </div>
          <Screenshot src={screenshots?.logCall} alt="Claude logging a call" caption="Claude extracts everything from the Fathom recording automatically" />
          <P>Claude reads the Fathom recording and extracts:</P>
          <CheckItem>Prospect name, call date, and duration</CheckItem>
          <CheckItem>Their current situation and what they want to achieve</CheckItem>
          <CheckItem>Every objection raised (mapped to standard categories)</CheckItem>
          <CheckItem>Whether it closed, needs a followup, or went nowhere</CheckItem>
          <CheckItem>Lead quality score from 1 to 5</CheckItem>
          <P>Claude shows you a preview and asks for confirmation before writing anything to the sheet.</P>
        </>
      ),
    },
    {
      id: 'done',
      title: "You are all set",
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
}

// ─── Overlay tour steps ───────────────────────────────────────────────────────
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
    body: 'LinkedIn analytics by month. See your connection rate, reply rate, and booking rate at a glance.',
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
    body: 'Add a new outreach sheet here when a new year starts or you have data in another spreadsheet. You can also download the Claude skill file again from here.',
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

// ─── Highlight box ────────────────────────────────────────────────────────────
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
  if (placement === 'right') return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: 'translateY(-50%)' }
  if (placement === 'bottom') return { top: rect.bottom + GAP, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' }
  if (placement === 'bottom-left') return { top: rect.bottom + GAP, right: window.innerWidth - rect.right, transform: 'none' }
  return { top: rect.bottom + GAP, left: rect.left }
}

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
// screenshots = { outreachSheet, outreachLogic, logCall } — URLs or base64
export default function OnboardingTour({ userName, onClose, onNav, isMobile, screenshots = {} }) {
  const [phase, setPhase] = useState('edu')
  const [eduStep, setEduStep] = useState(0)
  const [overlayStep, setOverlayStep] = useState(0)
  const [rect, setRect] = useState(null)

  const EDU_STEPS = buildEduSteps(screenshots)

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

  // ── EDU modal ────────────────────────────────────────────────────────────
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
          width: '100%', maxWidth: 580,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
        }}>
          <div style={{ height: 3, background: GRADIENT, width: `${((eduStep + 1) / EDU_STEPS.length) * 100}%`, transition: 'width 0.3s ease', flexShrink: 0 }} />

          <div style={{ padding: isMobile ? '22px 18px' : '30px 34px', overflowY: 'auto' }}>
            {/* Step dots */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
              {EDU_STEPS.map((s, i) => (
                <div key={s.id} style={{ width: i === eduStep ? 20 : 6, height: 6, borderRadius: 3, background: i <= eduStep ? 'var(--text)' : 'var(--border)', transition: 'all 0.25s' }} />
              ))}
            </div>

            {/* Icon */}
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', marginBottom: 14 }}>
              {step.icon}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
              {step.title}
            </h2>

            {step.render(userName, onNav)}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
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

  // ── OVERLAY ──────────────────────────────────────────────────────────────
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
