import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, ShieldCheck, Heart, Briefcase, Wallet, ArrowRight, Brain, PlayCircle, CheckCircle2, Activity } from 'lucide-react';

const f = (d=0) => ({ initial:{opacity:0,y:20}, animate:{opacity:1,y:0}, transition:{duration:0.7,delay:d,ease:[0.16,1,0.3,1]} });

function DigitalCharacter() {
  const S  = '#00d8b6';                           // primary stroke
  const BF = 'rgba(0,216,182,0.07)';              // body fill
  const BFS= 'rgba(0,216,182,0.12)';              // body fill strong

  // Joint positions [x,y]
  const joints = [
    [230,134],[156,168],[304,168],                 // neck, shoulders
    [112,295],[348,295],                           // elbows
    [108,376],[352,376],                           // wrists
    [196,452],[264,452],                           // hips
    [182,548],[278,548],                           // knees
  ];

  return (
    <svg viewBox="0 0 460 700" width="100%" height="100%" style={{maxHeight:640,overflow:'visible'}}>
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00d8b6" stopOpacity="0.14"/>
          <stop offset="60%"  stopColor="#00d8b6" stopOpacity="0.07"/>
          <stop offset="100%" stopColor="#00d8b6" stopOpacity="0.03"/>
        </linearGradient>
        <radialGradient id="headGrad" cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#00d8b6" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#00d8b6" stopOpacity="0.05"/>
        </radialGradient>
        <radialGradient id="eyeGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#00d8b6" stopOpacity="1"/>
        </radialGradient>
        <radialGradient id="platformG" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00d8b6" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#00d8b6" stopOpacity="0"/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="scanBlur">
          <feGaussianBlur stdDeviation="0" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Clip body for scan line */}
        <clipPath id="bodyClip">
          <path d="M100,60 L360,60 L360,660 L100,660 Z"/>
        </clipPath>
      </defs>

      {/* ── PLATFORM ── */}
      <ellipse cx="230" cy="662" rx="125" ry="22" fill="url(#platformG)"/>
      <ellipse cx="230" cy="665" rx="112" ry="17" fill="none" stroke={S} strokeWidth="1"   opacity="0.22"/>
      <ellipse cx="230" cy="668" rx="82"  ry="12" fill="none" stroke={S} strokeWidth="1"   opacity="0.38"/>
      <ellipse cx="230" cy="670" rx="52"  ry="7.5" fill="none" stroke={S} strokeWidth="1"  opacity="0.58"/>
      <ellipse cx="230" cy="671" rx="28"  ry="4"   fill="none" stroke={S} strokeWidth="1.2" opacity="0.80"/>

      {/* ── LEGS ── */}
      {/* Left leg */}
      <path d="M196 452 C193 470 186 510 183 548 C180 575 181 600 184 625 L205 630 L208 625 C210 600 210 575 208 548 C206 510 208 470 210 452 Z"
        fill={BF} stroke={S} strokeWidth="1.3" opacity="0.82"/>
      {/* Left foot */}
      <ellipse cx="196" cy="645" rx="20" ry="8" fill={BF} stroke={S} strokeWidth="1" opacity="0.75"/>
      {/* Right leg */}
      <path d="M250 452 C252 470 254 510 252 548 C250 575 250 600 252 625 L275 630 L276 625 C278 600 279 575 277 548 C274 510 267 470 264 452 Z"
        fill={BF} stroke={S} strokeWidth="1.3" opacity="0.82"/>
      {/* Right foot */}
      <ellipse cx="264" cy="645" rx="20" ry="8" fill={BF} stroke={S} strokeWidth="1" opacity="0.75"/>

      {/* ── TORSO ── */}
      <path d="
        M 174 162
        C 162 170 150 182 144 200
        L 132 310
        C 128 336 130 362 136 378
        L 150 420 C 160 440 178 452 196 452
        L 264 452 C 282 452 300 440 310 420
        L 324 378 C 330 362 332 336 328 310
        L 316 200
        C 310 182 298 170 286 162 Z
      " fill="url(#bodyGrad)" stroke={S} strokeWidth="1.4" opacity="0.88"/>

      {/* Collar seam */}
      <path d="M 174 162 Q 230 175 286 162" fill="none" stroke={S} strokeWidth="0.8" opacity="0.45"/>
      {/* Chest V */}
      <path d="M 202 168 L 230 196 L 258 168" fill="none" stroke={S} strokeWidth="0.9" opacity="0.45"/>
      {/* Waist seam */}
      <path d="M 136 390 Q 230 382 324 390" fill="none" stroke={S} strokeWidth="0.8" opacity="0.32"/>

      {/* HEALTH — heartbeat line across chest */}
      <path d="M 158 278 L 172 278 L 184 256 L 198 300 L 210 266 L 220 282 L 240 282 L 252 262 L 262 290 L 272 278 L 286 278 L 302 278"
        fill="none" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.65">
        <animate attributeName="opacity" values="0.35;0.85;0.35" dur="1.6s" repeatCount="indefinite"/>
      </path>

      {/* FINANCE — mini bar chart lower torso */}
      {[0,1,2,3,4].map(i => {
        const hs = [20,32,24,40,28][i];
        return <rect key={i} x={190+i*16} y={348-hs} width="11" height={hs} rx="2.5"
          fill="#f59e0b" fillOpacity="0.22" stroke="#f59e0b" strokeWidth="0.7" strokeOpacity="0.55"/>;
      })}

      {/* CAREER — circuit traces on shoulders */}
      <path d="M 172 178 L 152 185 L 144 202 L 144 218 L 138 224" fill="none" stroke="#3b82f6" strokeWidth="0.9" strokeLinecap="round" opacity="0.42"/>
      <circle cx="144" cy="218" r="2.5" fill="#3b82f6" opacity="0.6"/>
      <path d="M 288 178 L 308 185 L 316 202 L 316 218 L 322 224" fill="none" stroke="#3b82f6" strokeWidth="0.9" strokeLinecap="round" opacity="0.42"/>
      <circle cx="316" cy="218" r="2.5" fill="#3b82f6" opacity="0.6"/>

      {/* ── ARMS ── */}
      {/* Left arm */}
      <path d="
        M 148 170 C 134 182 120 200 114 222
        L 100 310 C 96 328 100 350 108 368
        L 116 382 C 112 368 110 352 114 334
        L 128 250 C 135 226 148 204 160 185 Z
      " fill={BF} stroke={S} strokeWidth="1.3" opacity="0.80"/>
      {/* Left hand */}
      <ellipse cx="112" cy="376" rx="11" ry="15" fill={BFS} stroke={S} strokeWidth="1.1" opacity="0.78"/>

      {/* Right arm */}
      <path d="
        M 312 170 C 326 182 340 200 346 222
        L 360 310 C 364 328 360 350 352 368
        L 344 382 C 348 368 350 352 346 334
        L 332 250 C 325 226 312 204 300 185 Z
      " fill={BF} stroke={S} strokeWidth="1.3" opacity="0.80"/>
      {/* Right hand */}
      <ellipse cx="348" cy="376" rx="11" ry="15" fill={BFS} stroke={S} strokeWidth="1.1" opacity="0.78"/>

      {/* ── NECK ── */}
      <rect x="218" y="132" width="24" height="30" rx="8"
        fill={BFS} stroke={S} strokeWidth="1.2" opacity="0.82"/>

      {/* ── HEAD ── */}
      {/* Ears */}
      <ellipse cx="187" cy="91" rx="5" ry="9" fill={BF} stroke={S} strokeWidth="1" opacity="0.72"/>
      <ellipse cx="273" cy="91" rx="5" ry="9" fill={BF} stroke={S} strokeWidth="1" opacity="0.72"/>
      {/* Head */}
      <circle cx="230" cy="91" r="43" fill="url(#headGrad)" stroke={S} strokeWidth="1.5" opacity="0.90" filter="url(#glow)"/>
      {/* Face highlight */}
      <ellipse cx="216" cy="78" rx="16" ry="10" fill="white" opacity="0.04"/>
      {/* Eyes */}
      <circle cx="214" cy="86" r="5"   fill="#00d8b6" opacity="0.25" filter="url(#glow)"/>
      <circle cx="214" cy="86" r="3.5" fill="url(#eyeGrad)">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="3.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="213" cy="85" r="1.2" fill="white" opacity="0.7"/>
      <circle cx="246" cy="86" r="5"   fill="#00d8b6" opacity="0.25" filter="url(#glow)"/>
      <circle cx="246" cy="86" r="3.5" fill="url(#eyeGrad)">
        <animate attributeName="opacity" values="0.8;1;0.8" dur="3.2s" repeatCount="indefinite" begin="0.2s"/>
      </circle>
      <circle cx="245" cy="85" r="1.2" fill="white" opacity="0.7"/>

      {/* ── SCAN LINE ── */}
      <g clipPath="url(#bodyClip)">
        <line x1="108" y1="60" x2="352" y2="60" stroke={S} strokeWidth="1" opacity="0.20">
          <animate attributeName="y1" values="60;660;60" dur="5s" repeatCount="indefinite" calcMode="linear"/>
          <animate attributeName="y2" values="60;660;60" dur="5s" repeatCount="indefinite" calcMode="linear"/>
        </line>
        <rect x="108" y="55" width="244" height="22" fill={S} opacity="0.04">
          <animate attributeName="y" values="55;645;55" dur="5s" repeatCount="indefinite" calcMode="linear"/>
        </rect>
      </g>

      {/* ── JOINT DOTS ── */}
      {joints.map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="3.8" fill={S} filter="url(#glow)" opacity="0.80">
          <animate attributeName="opacity" values="0.45;1;0.45" dur={`${2.1+i*0.18}s`} repeatCount="indefinite"/>
        </circle>
      ))}

      {/* ── AMBIENT PARTICLES ── */}
      {[[52,130],[408,160],[36,310],[418,285],[78,490],[382,460],[54,210],[412,395]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.8" fill={S} opacity="0.5">
          <animate attributeName="opacity" values="0.12;0.65;0.12" dur={`${2.6+i*0.55}s`} repeatCount="indefinite"/>
        </circle>
      ))}

      {/* Outer dashed orbit ring */}
      <circle cx="230" cy="340" r="260" fill="none" stroke={S} strokeWidth="0.5" opacity="0.08" strokeDasharray="5 9"/>
    </svg>
  );
}

function Card({ icon: Icon, title, desc, style, delay }) {
  return (
    <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay,duration:0.7}}
      style={{ position:'absolute', background:'rgba(8,14,28,0.85)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:14, padding:'14px 18px', backdropFilter:'blur(12px)', minWidth:210, zIndex:20, ...style }}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        <Icon size={18} strokeWidth={1.5} style={{color:'#00d8b6',flexShrink:0}}/>
        <span style={{color:'#fff',fontSize:15,fontWeight:600}}>{title}</span>
      </div>
      <p style={{color:'#94a3b8',fontSize:12,lineHeight:1.5}}>{desc}</p>
    </motion.div>
  );
}

function DashPreview() {
  const bdr='#1e293b', muted='#64748b', accent='#00d8b6', text='#f1f5f9';
  return (
    <div style={{background:'#0a0f1c',color:text,display:'flex',fontSize:13}}>
      {/* Sidebar */}
      <div style={{width:176,borderRight:`1px solid ${bdr}`,padding:'20px 12px',display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:24,padding:'0 8px'}}>
          <Brain size={18} style={{color:accent}}/><span style={{fontWeight:700}}>BeyondSelf</span>
        </div>
        {[['🏠','Overview',true],['🤍','Health'],['💰','Finance'],['💼','Career'],['🎯','Goals'],['⚡','What-If'],['📈','Insights']].map(([icon,label,active])=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:10,background:active?'rgba(0,216,182,0.1)':'transparent',color:active?accent:muted,fontWeight:active?600:400}}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{flex:1,padding:'24px 28px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
          <div><div style={{fontWeight:700,fontSize:17,marginBottom:4}}>Good morning, Rohan! 👋</div><div style={{color:muted,fontSize:12}}>Here's what's happening with your digital twin today.</div></div>
          <button style={{border:`1px solid ${bdr}`,color:text,background:'none',padding:'6px 14px',borderRadius:20,fontSize:11,cursor:'pointer'}}>+ Add Data</button>
        </div>
        {/* Score cards */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:16}}>
          {[['🤍','Health Score','82','#ef4444'],['💰','Financial Health','76','#eab308'],['💼','Career Progress','89','#3b82f6']].map(([icon,label,val,col])=>(
            <div key={label} style={{background:'#12182b',border:`1px solid ${bdr}`,borderRadius:14,padding:'16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12}}><span>{icon}</span><span style={{fontSize:11,fontWeight:600,color:muted}}>{label}</span></div>
              <div style={{fontSize:32,fontWeight:900,marginBottom:4}}>{val}<span style={{fontSize:11,fontWeight:400,color:muted}}>/100</span></div>
              <div style={{fontSize:10,color:'#10b981'}}>↑ this week</div>
            </div>
          ))}
        </div>
        {/* Bottom grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{background:'#12182b',border:`1px solid ${bdr}`,borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:13}}>Goal Progress</div>
            {[['Lose 10 kg','65%','#ef4444'],['Save ₹5,00,000','42%','#eab308'],['Learn Data Science','78%','#3b82f6']].map(([l,p,col])=>(
              <div key={l} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:muted,marginBottom:4}}><span>{l}</span><span>{p}</span></div>
                <div style={{height:6,background:bdr,borderRadius:3}}><div style={{height:'100%',width:p,background:col,borderRadius:3}}/></div>
              </div>
            ))}
          </div>
          <div style={{background:'#12182b',border:`1px solid ${bdr}`,borderRadius:14,padding:16}}>
            <div style={{fontWeight:700,marginBottom:8,fontSize:13}}>AI Recommendation</div>
            <div style={{color:muted,fontSize:11,lineHeight:1.6,marginBottom:12}}>Reduce dining out by ₹150/day to save ₹4,500/month.</div>
            <button style={{background:'rgba(255,255,255,0.06)',color:text,border:'none',padding:'6px 12px',borderRadius:8,fontSize:11,cursor:'pointer'}}>View Advice →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── What-If Simulation section ───────────────────────────────────────────────
const SIM_PANELS = [
  { n:'001', q:'What if you study 2 more hours daily?', v:'Projected income +32%',    side:'left',  top:'10%', bar:42 },
  { n:'002', q:'Switch career to AI research',          v:'Net impact +0.41 σ',        side:'right', top:'10%', bar:68 },
  { n:'003', q:'Sleep 7.5h consistently',               v:'Stress probability ↓ 46%',  side:'left',  top:'58%', bar:55 },
  { n:'004', q:'Invest 15% monthly',                    v:'10y wealth × 3.2',          side:'right', top:'58%', bar:74 },
];

function WhatIf() {
  const panelBase = {
    position:'absolute', zIndex:10,
    background:'rgba(8,14,28,0.90)',
    border:'1px solid rgba(255,255,255,0.09)',
    borderRadius:14, padding:'16px 20px',
    backdropFilter:'blur(14px)',
    maxWidth:252, minWidth:210,
  };

  return (
    <section style={{ padding:'80px 32px', borderTop:'1px solid rgba(255,255,255,0.05)', position:'relative', overflow:'hidden' }}>
      {/* Radial bg glow */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 50%, rgba(0,216,182,0.04) 0%, transparent 65%)', pointerEvents:'none' }} />

      <div style={{ maxWidth:1200, margin:'0 auto', position:'relative' }}>
        {/* Label */}
        <div style={{ textAlign:'center', marginBottom:4 }}>
          <p style={{ color:'#475569', fontSize:11, fontWeight:700, letterSpacing:'0.25em', textTransform:'uppercase', display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
            <span style={{ display:'inline-block', height:1, width:32, background:'linear-gradient(90deg,rgba(0,216,182,0.5),transparent)' }} />
            What-If Simulation
            <span style={{ display:'inline-block', height:1, width:32, background:'linear-gradient(270deg,rgba(0,216,182,0.5),transparent)' }} />
          </p>
        </div>

        {/* Arena */}
        <div style={{ position:'relative', minHeight:520, display:'flex', alignItems:'center', justifyContent:'center' }}>

          {/* Concentric rings */}
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <svg width="560" height="520" viewBox="0 0 560 520" style={{ overflow:'visible' }}>
              {[55, 105, 155, 205, 255].map((r, i) => (
                <motion.circle key={i} cx="280" cy="260" r={r}
                  fill="none" stroke="rgba(0,216,182,1)" strokeWidth="0.8"
                  animate={{ opacity:[0.06+i*0.018, 0.14+i*0.018, 0.06+i*0.018] }}
                  transition={{ duration:3+i*0.6, repeat:Infinity, ease:'easeInOut', delay:i*0.35 }}
                />
              ))}
            </svg>
          </div>

          {/* Centre text */}
          <div style={{ position:'relative', zIndex:5, textAlign:'center', maxWidth:480, padding:'0 48px' }}>
            <motion.h2
              initial={{ opacity:0, y:22 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
              style={{ fontSize:52, fontWeight:700, lineHeight:1.06, color:'#fff', margin:'0 0 16px' }}>
              Travel <span style={{ color:'#00d8b6' }}>your</span><br/>
              possible timelines.
            </motion.h2>
            <motion.p
              initial={{ opacity:0, y:14 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ delay:0.15 }}
              style={{ color:'#64748b', fontSize:15, lineHeight:1.65, margin:0 }}>
              Choose a habit, a job, a decision. The twin runs ten thousand futures and reports back from each.
            </motion.p>
          </div>

          {/* Floating panels */}
          {SIM_PANELS.map((p, i) => (
            <motion.div key={p.n}
              initial={{ opacity:0, x: p.side==='left' ? -28 : 28 }}
              whileInView={{ opacity:1, x:0 }}
              viewport={{ once:true }}
              transition={{ delay: i * 0.12, duration:0.6, ease:[0.16,1,0.3,1] }}
              style={{ ...panelBase, [p.side]:0, top:p.top }}
            >
              <div style={{ fontSize:9, color:'#475569', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>
                Simulation · {p.n}
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'#f1f5f9', marginBottom:6, lineHeight:1.4 }}>{p.q}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#00d8b6', marginBottom:10 }}>{p.v}</div>
              <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                <div style={{ height:'100%', width:`${p.bar}%`, background:'linear-gradient(90deg,#00d8b6,#8b5cf6)', borderRadius:2 }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Orbit section ────────────────────────────────────────────────────────────
const ORBITS = [
  { Icon: Activity,  label: 'Wellness', gradient: 'linear-gradient(135deg,#10b981,#00d8b6)', r: 100, dur: 10, size: 38 },
  { Icon: Heart,     label: 'Health',   gradient: 'linear-gradient(135deg,#ef4444,#f97316)', r: 142, dur: 16, size: 46 },
  { Icon: Wallet,    label: 'Finance',  gradient: 'linear-gradient(135deg,#f59e0b,#00d8b6)', r: 188, dur: 24, size: 52 },
  { Icon: Briefcase, label: 'Career',   gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', r: 238, dur: 34, size: 58 },
];

function Orbits() {
  const bdr = 'rgba(255,255,255,0.08)';
  const statCard = {
    position: 'absolute', bottom: 0,
    background: 'rgba(11,16,33,0.88)',
    border: `1px solid ${bdr}`,
    borderRadius: 12, padding: '10px 16px',
    backdropFilter: 'blur(10px)',
  };

  return (
    <section style={{ padding: '80px 32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <p style={{ color: '#475569', fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 14 }}>
          Everything Connected
        </p>
        <h2 style={{ fontSize: 42, fontWeight: 700, color: '#fff', margin: 0 }}>
          Your life, <span style={{ color: '#00d8b6' }}>in orbit.</span>
        </h2>
        <p style={{ color: '#64748b', fontSize: 15, marginTop: 14, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
          Every system around your twin moves at its own pace — and they all bend toward the same gravity: you.
        </p>
      </div>

      {/* Arena — flex centres it on all screen sizes */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 540, height: 540 }}>

          {/* Nebula glow */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,216,182,0.09) 0%, rgba(139,92,246,0.05) 45%, transparent 70%)' }} />

          {/* Static orbit ring tracks */}
          {ORBITS.map((o, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              border: '1px solid rgba(0,216,182,0.13)',
              width: o.r * 2, height: o.r * 2,
              left: '50%', top: '50%',
              marginLeft: -o.r, marginTop: -o.r,
            }} />
          ))}

          {/* Spinning containers — centred with margin NOT transform so rotation doesn't break positioning */}
          {ORBITS.map((o) => (
            <motion.div
              key={o.label}
              animate={{ rotate: 360 }}
              transition={{ duration: o.dur, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: o.r * 2, height: o.r * 2,
                left: '50%', top: '50%',
                marginLeft: -o.r, marginTop: -o.r,
              }}
            >
              {/* Planet sits at top-centre; counter-rotates to stay upright */}
              <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%) translateY(-50%)' }}>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: o.dur, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                >
                  <div style={{
                    width: o.size, height: o.size, borderRadius: 12,
                    background: o.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(0,216,182,0.25)',
                  }}>
                    <o.Icon size={Math.round(o.size * 0.38)} style={{ color: '#fff' }} />
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                    {o.label}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ))}

          {/* Centre node */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 92, height: 92, borderRadius: '50%',
              background: '#07090e',
              border: '1px solid rgba(0,216,182,0.45)',
              boxShadow: '0 0 28px rgba(0,216,182,0.18), inset 0 0 14px rgba(0,216,182,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={34} strokeWidth={1.5} style={{ color: '#00d8b6' }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 8, fontWeight: 700, color: '#475569', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              YOUR TWIN
            </div>
          </div>

          {/* Corner stats */}
          <div style={{ ...statCard, left: 0 }}>
            <div style={{ fontSize: 8, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Daily Delta</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#00d8b6' }}>+1.4%</div>
          </div>
          <div style={{ ...statCard, right: 0 }}>
            <div style={{ fontSize: 8, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Alignment</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#00d8b6' }}>92%</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <main style={{background:'#060b14',color:'#f1f5f9',minHeight:'100vh',fontFamily:"'Inter',sans-serif"}}>
      
      {/* NAV */}
      <header style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:'rgba(6,11,20,0.92)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',height:72,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Brain size={26} strokeWidth={1.5} style={{color:'#00d8b6'}}/>
            <span style={{fontSize:19,fontWeight:600,color:'#fff'}}>BeyondSelf</span>
          </div>
          <nav style={{display:'flex',alignItems:'center',gap:36}}>
            {['Features','How It Works','Security','Pricing','About'].map(l=>(
              <a key={l} href="#" style={{color:'#94a3b8',textDecoration:'none',fontSize:14,fontWeight:500}}>{l}</a>
            ))}
          </nav>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Link to="/login" style={{padding:'8px 20px',border:'1px solid #334155',borderRadius:8,color:'#fff',textDecoration:'none',fontSize:14,fontWeight:500}}>Log in</Link>
            <Link to="/signup" style={{padding:'8px 20px',background:'#00d8b6',borderRadius:8,color:'#060b14',textDecoration:'none',fontSize:14,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
              Get Started Free <ArrowRight size={15}/>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{paddingTop:110,paddingBottom:40,minHeight:'92vh',display:'flex',alignItems:'center',overflow:'hidden'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 32px',width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,alignItems:'center'}}>
          {/* Left */}
          <div style={{paddingTop:30}}>
            <motion.div {...f(0.1)} style={{display:'inline-flex',alignItems:'center',padding:'6px 16px',borderRadius:100,border:'1px solid rgba(0,216,182,0.3)',color:'#00d8b6',background:'rgba(0,216,182,0.05)',fontSize:10,fontWeight:700,letterSpacing:'0.15em',marginBottom:32}}>
              AI-POWERED PERSONAL DIGITAL TWIN
            </motion.div>
            <motion.h1 {...f(0.2)} style={{fontSize:70,lineHeight:1.05,fontWeight:700,marginBottom:20,margin:'0 0 20px'}}>
              <span style={{color:'#fff',display:'block'}}>Meet Your</span>
              <span style={{display:'block',background:'linear-gradient(135deg,#00d8b6,#8b5cf6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Future Self.</span>
            </motion.h1>
            <motion.p {...f(0.3)} style={{color:'#94a3b8',fontSize:15,lineHeight:1.65,maxWidth:420,marginBottom:36}}>
              BeyondSelf is your AI-powered digital twin that learns from your habits, goals, and decisions to help you live healthier, wealthier, and more purposefully.
            </motion.p>
            <motion.div {...f(0.4)} style={{display:'flex',alignItems:'center',gap:14,marginBottom:44}}>
              <Link to="/signup" style={{display:'flex',alignItems:'center',gap:8,padding:'13px 24px',background:'#00d8b6',borderRadius:10,color:'#060b14',fontWeight:600,fontSize:15,textDecoration:'none'}}>
                Start Your Journey <ArrowRight size={16}/>
              </Link>
              <button style={{display:'flex',alignItems:'center',gap:8,padding:'13px 24px',border:'1px solid #334155',borderRadius:10,color:'#fff',background:'none',fontWeight:500,fontSize:15,cursor:'pointer'}}>
                See How It Works <PlayCircle size={18} strokeWidth={1.5}/>
              </button>
            </motion.div>
            <motion.div {...f(0.5)} style={{display:'flex',alignItems:'flex-start',gap:36}}>
              {[[Lock,'End-to-end\nencrypted'],[ShieldCheck,'Your data.\nYour control.'],[Eye,'Privacy by\ndesign']].map(([Icon,label],i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8}}>
                  <Icon size={16} strokeWidth={1.5} style={{color:'#64748b',marginTop:2,flexShrink:0}}/>
                  <span style={{color:'#64748b',fontSize:11,lineHeight:1.5,whiteSpace:'pre-line'}}>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Digital Character */}
          <motion.div {...f(0.2)} style={{position:'relative',height:660,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DigitalCharacter/>
            <Card icon={Heart}    title="Health"  desc={"84/100 · Vitals optimal"} style={{top:'10%',left:'-2%'}}  delay={0.5}/>
            <Card icon={Briefcase} title="Career" desc={"89/100 · On track"}       style={{top:'46%',left:'-10%'}} delay={0.7}/>
            <Card icon={Wallet}   title="Finance" desc={"76/100 · Growing"}        style={{top:'34%',right:'-6%'}} delay={0.9}/>
          </motion.div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section style={{padding:'40px 32px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto',textAlign:'center'}}>
          <p style={{color:'#475569',fontSize:11,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',marginBottom:32}}>Trusted By Innovators</p>
          <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:48,opacity:0.55}}>
            {[' Apple Health','fitbit','Google Fit','PLAID','LinkedIn','coursera','GitHub'].map(b=>(
              <span key={b} style={{fontSize:17,fontWeight:700,color:'#fff',letterSpacing:'-0.02em'}}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{padding:'80px 32px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:56}}>
            <p style={{color:'#475569',fontSize:11,fontWeight:700,letterSpacing:'0.25em',textTransform:'uppercase',marginBottom:14}}>All Parts Of You. Working Together.</p>
            <h2 style={{fontSize:42,fontWeight:700,color:'#fff'}}>One Twin. <span style={{color:'#00d8b6'}}>Limitless Possibilities.</span></h2>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:20}}>
            {[['🔗','Unified Insights','Connect health, finance, and career data to see the big picture.'],['✨','AI Recommendations','Get personalized actions that adapt to you.'],['⚡','What-If Simulations','Test scenarios, compare outcomes, make confident decisions.'],['🏆','Stay Motivated','Earn points, unlock badges, and build streaks.']].map(([icon,title,desc])=>(
              <div key={title} style={{background:'#0b1021',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'28px 24px',textAlign:'center'}}>
                <div style={{fontSize:28,marginBottom:16}}>{icon}</div>
                <h3 style={{fontWeight:600,fontSize:16,color:'#fff',marginBottom:10}}>{title}</h3>
                <p style={{color:'#64748b',fontSize:13,lineHeight:1.6}}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Orbits />
      <WhatIf />

      {/* DASHBOARD PREVIEW */}
      <section style={{padding:'60px 32px'}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div style={{background:'#0b1021',border:'1px solid rgba(255,255,255,0.08)',borderRadius:32,padding:'48px',display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:48,alignItems:'center'}}>
            <div>
              <p style={{color:'#00d8b6',fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',marginBottom:16}}>Sneak Peek</p>
              <h2 style={{fontSize:36,fontWeight:700,lineHeight:1.1,marginBottom:16}}>Your Digital Twin,<br/>Working <span style={{color:'#00d8b6'}}>for You</span></h2>
              <p style={{color:'#64748b',fontSize:14,lineHeight:1.7,marginBottom:28}}>Real-time insights, smart recommendations, and progress that moves with you.</p>
              <Link to="/signup" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',background:'#00d8b6',borderRadius:10,color:'#060b14',fontWeight:600,fontSize:14,textDecoration:'none'}}>
                Explore Dashboard <ArrowRight size={16}/>
              </Link>
              <p style={{color:'#475569',fontSize:12,marginTop:14,display:'flex',alignItems:'center',gap:6}}><CheckCircle2 size={14}/>No credit card required</p>
            </div>
            <div style={{borderRadius:16,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}>
              <DashPreview/>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{padding:'80px 32px',textAlign:'center',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <h2 style={{fontSize:46,fontWeight:700,lineHeight:1.1,marginBottom:8}}>You don't need to predict the future.</h2>
          <h2 style={{fontSize:46,fontWeight:700,lineHeight:1.1,color:'#00d8b6',marginBottom:20}}>You just need to prepare for it.</h2>
          <p style={{color:'#64748b',fontSize:16,marginBottom:36}}>Start your journey. Become your best future self.</p>
          <Link to="/signup" style={{display:'inline-flex',alignItems:'center',gap:8,padding:'16px 36px',background:'#00d8b6',borderRadius:12,color:'#060b14',fontWeight:700,fontSize:17,textDecoration:'none'}}>
            Get Started Free <ArrowRight size={20}/>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{padding:'32px',borderTop:'1px solid rgba(255,255,255,0.07)',background:'#060b14'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',color:'#475569',fontSize:13}}>
          <span>© 2026 · BeyondSelf</span>
          <div style={{display:'flex',gap:28}}>
            <Link to="/login" style={{color:'#475569',textDecoration:'none'}}>Sign In</Link>
            <Link to="/signup" style={{color:'#475569',textDecoration:'none'}}>Sign Up</Link>
            <a href="#" style={{color:'#475569',textDecoration:'none'}}>Privacy</a>
          </div>
          <span>Built for the next you</span>
        </div>
      </footer>
    </main>
  );
}
