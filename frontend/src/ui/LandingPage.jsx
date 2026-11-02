import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Layers,
  Bell,
  CalendarDays,
  Check,
  Wallet,
  Command,
  LockKeyhole,
  SlidersHorizontal,
  Leaf,
  Hourglass,
} from "lucide-react";
import { money } from "../api";
import { Reveal } from "./system";
import SpendingChart from "./SpendingChart";
import { AnimatedTabs } from "./premium";
const samplePlans = [
  {
    name: "Streamspace",
    initial: "S",
    category: "Entertainment",
    amount: 649,
    color: "olive",
  },
  {
    name: "Focus Studio",
    initial: "F",
    category: "Productivity",
    amount: 200,
    color: "blue",
  },
  {
    name: "Cloudnest",
    initial: "C",
    category: "Cloud & Storage",
    amount: 149,
    color: "clay",
  },
];
function MagneticLink({ to, children }) {
  const x = useMotionValue(0),
    y = useMotionValue(0),
    sx = useSpring(x, { stiffness: 350, damping: 32 }),
    sy = useSpring(y, { stiffness: 350, damping: 32 }),
    reduced = useReducedMotion();
  return (
    <motion.div
      className="magnetic-wrap"
      style={reduced ? undefined : { x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.07);
        y.set((e.clientY - r.top - r.height / 2) * 0.1);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <Link to={to} className="landing-cta">
        {children}
        <ArrowUpRight size={18} />
      </Link>
    </motion.div>
  );
}
export default function LandingPage({ signedIn = false }) {
  const [tab, setTab] = useState("spending"),
    [selected, setSelected] = useState(null);
  const reduced = useReducedMotion();
  return (
    <div className="landing" data-theme="dark">
      <div className="landing-aurora" aria-hidden="true" />
      <header className="landing-nav">
        <Link className="brand" to="/welcome">
          <span>
            <ShieldCheck size={24} />
          </span>
          TrialGuard<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#features">The difference</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <Link className="landing-signin" to={signedIn ? "/" : "/login"}>
          {signedIn ? "Your workspace" : "Sign in"}
          <ArrowUpRight size={15} />
        </Link>
      </header>
      <main>
        <section className="landing-hero" id="top">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            <span className="landing-kicker">
              <span /> A LITTLE AWARENESS. A LOT MORE CONTROL.
            </span>
            <h1>
              Keep the good stuff.
              <br />
              <em>Lose the surprise charges.</em>
            </h1>
            <p>
              Your subscriptions deserve a second look. Bring every plan,
              <br className="desktop-break" /> free trial, and next renewal into
              one beautifully clear space.
            </p>
            <div className="hero-actions">
              <MagneticLink to={signedIn ? "/" : "/register"}>
                {signedIn ? "Open your workspace" : "Take back control"}
              </MagneticLink>
              <a className="landing-secondary" href="#interactive-demo">
                Explore the preview <ArrowRight size={16} />
              </a>
            </div>
            <span className="hero-assurance">
              <ShieldCheck size={14} />
              No bank connection. No automatic charges. Always your call.
            </span>
          </motion.div>
          <div className="hero-preview" id="interactive-demo">
            <div className="preview-chrome">
              <div>
                <span />
                <span />
                <span />
              </div>
              <span>YOUR FINANCIAL COMMAND CENTER</span>
              <span className="demo-label">INTERACTIVE DEMO</span>
            </div>
            <div className="preview-workspace">
              <aside className="preview-sidebar" aria-hidden="true">
                <ShieldCheck size={24} />
                <div className="preview-nav-icon active">
                  <Layers size={18} />
                </div>
                <CalendarDays size={18} />
                <Bell size={18} />
                <Wallet size={18} />
              </aside>
              <div className="preview-main">
                <div className="preview-heading">
                  <div>
                    <small>A LITTLE CLARITY GOES A LONG WAY</small>
                    <h2>A calmer kind of control.</h2>
                  </div>
                  <span className="preview-avatar">A</span>
                </div>
                <AnimatedTabs
                  panelId="demo-dashboard-panel"
                  value={tab}
                  onChange={setTab}
                  label="Demo dashboard view"
                  items={[
                    { value: "spending", label: "Spending overview" },
                    { value: "trials", label: "Trial radar" },
                  ]}
                />
                {tab === "spending" ? (
                  <motion.div
                    id="demo-dashboard-panel"
                    role="tabpanel"
                    aria-labelledby="demo-dashboard-panel-spending"
                    tabIndex={0}
                    key="spending"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    className="preview-grid"
                  >
                    <div className="preview-stat">
                      <span>Monthly commitment</span>
                      <strong>{money(998)}</strong>
                      <small>3 fictional active plans</small>
                      <div className="sample-allocation" aria-hidden="true">
                        {samplePlans.map((p) => (
                          <i key={p.name} style={{ flex: p.amount }} />
                        ))}
                      </div>
                      <span className="preview-data-note">
                        Fictional category allocation · ₹998 total
                      </span>
                    </div>
                    <div className="preview-chart">
                      <SpendingChart
                        categories={samplePlans.map((p) => ({
                          name: p.category,
                          amount: String(p.amount),
                        }))}
                        total="998.00"
                      />
                    </div>
                    <div className="preview-plans">
                      {samplePlans.map((p) => (
                        <button
                          key={p.name}
                          className={
                            "preview-plan " +
                            (selected === p.name ? "selected" : "")
                          }
                          aria-pressed={selected === p.name}
                          onClick={() =>
                            setSelected(selected === p.name ? null : p.name)
                          }
                        >
                          <span className={"sample-avatar " + p.color}>
                            {p.initial}
                          </span>
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.category}</small>
                          </span>
                          <b>
                            {money(p.amount)}
                            <small>/month equivalent</small>
                          </b>
                          <ArrowUpRight size={15} />
                        </button>
                      ))}
                      <p aria-live="polite">
                        {selected
                          ? `${selected} selected. In your workspace, manage its dates, billing and provider link here.`
                          : "Select a sample plan to explore. All figures in this preview are fictional."}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    id="demo-dashboard-panel"
                    role="tabpanel"
                    aria-labelledby="demo-dashboard-panel-trials"
                    tabIndex={0}
                    key="trials"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    className="preview-trial"
                  >
                    <div>
                      <span className="landing-kicker">
                        A DECISION, NOT A SURPRISE
                      </span>
                      <h3>Motion Club</h3>
                      <p>
                        Fictional trial · ₹899/month if you choose to continue
                      </p>
                      <span className="demo-deadline">
                        <Hourglass size={15} />
                        Trial ends in 3 days
                      </span>
                    </div>
                    <div className="demo-countdown">
                      <strong>03</strong>
                      <span>DAYS TO DECIDE · DEMO</span>
                    </div>
                    <p className="preview-data-note">
                      This preview does not create a reminder or change your
                      account.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
          <div className="landing-proof">
            <span>
              <LockKeyhole size={15} />
              Private by design
            </span>
            <span>
              <SlidersHorizontal size={15} />
              Your records, your decisions
            </span>
            <span>
              <Leaf size={15} />
              Built for mindful spending
            </span>
          </div>
        </section>
        <section className="landing-features" id="features">
          <Reveal className="landing-section-heading">
            <span className="landing-kicker">LESS ADMIN. MORE INTENTION.</span>
            <h2>
              A home for every plan.
              <br />
              <em>A reason for every renewal.</em>
            </h2>
            <p>
              Not another place to spend money.
              <br />A better place to understand where it goes.
            </p>
          </Reveal>
          <div className="landing-bento">
            <Reveal className="bento-card bento-large">
              <span className="bento-icon">
                <ShieldCheck />
              </span>
              <span className="feature-number">01 / TRIAL PROTECTION</span>
              <h3>
                Try it. Love it.
                <br />
                Or leave it on time.
              </h3>
              <p>
                Get in-app nudges 3 days and 1 day before a trial ends. Review,
                decide, and cancel with your provider when it’s time.
              </p>
              <div className="bento-reminder">
                <Bell size={20} />
                <div>
                  <strong>Your trial is nearly over.</strong>
                  <span>3 days to make the call · demo reminder</span>
                </div>
                <span className="reminder-dot" />
              </div>
            </Reveal>
            <Reveal className="bento-card bento-chart">
              <span className="bento-icon">
                <Wallet />
              </span>
              <span className="feature-number">02 / SPENDING CLARITY</span>
              <h3>
                See the whole picture.
                <br />
                Down to the rupee.
              </h3>
              <p>
                Monthly equivalents, category breakdowns, and a budget boundary
                that works for you. Trials stay out of paid totals.
              </p>
              <div className="bento-meter" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <small>Actual totals come from your tracked plans.</small>
            </Reveal>
            <Reveal className="bento-card">
              <span className="bento-icon">
                <Command />
              </span>
              <span className="feature-number">03 / LESS FRICTION</span>
              <h3>One shortcut away.</h3>
              <p>
                Find a plan, jump to a page, or start a new entry with the
                command palette.
              </p>
              <div
                className="keyboard-demo"
                aria-label="Control or Command plus K"
              >
                <kbd>Ctrl / ⌘</kbd>
                <span>+</span>
                <kbd>K</kbd>
              </div>
            </Reveal>
            <Reveal className="bento-card bento-privacy" id="privacy">
              <span className="bento-icon">
                <LockKeyhole />
              </span>
              <span className="feature-number">04 / YOU’RE IN CHARGE</span>
              <h3>
                Connected to your plans.
                <br />
                Not your bank.
              </h3>
              <p>
                Manual entry means no bank access or email scanning. Marking a
                plan cancelled updates your tracker; you cancel with the
                provider.
              </p>
              <span className="privacy-pill">
                <Check size={14} />
                Private workspace · clear boundaries
              </span>
            </Reveal>
          </div>
        </section>
        <Reveal className="landing-how" id="how-it-works">
          <div className="landing-section-heading">
            <span className="landing-kicker">
              A GENTLE NUDGE AT THE RIGHT TIME
            </span>
            <h2>
              A free trial.
              <br />
              <em>Without the loose ends.</em>
            </h2>
            <p>Example reminder timeline · demonstration only.</p>
          </div>
          <ol className="demo-timeline">
            {[
              {
                step: "01",
                label: "When you start",
                title: "Add your trial",
                text: "Record the provider, potential price, and the day your trial ends.",
                Icon: Layers,
              },
              {
                step: "02",
                label: "3 days before",
                title: "A little heads-up",
                text: "An in-app reminder gives you room to review whether the plan earns its place.",
                Icon: Bell,
              },
              {
                step: "03",
                label: "1 day before",
                title: "Time for your call",
                text: "Keep it, or cancel with the provider. Update your tracker after you decide.",
                Icon: ShieldCheck,
              },
            ].map(({ step, label, title, text, Icon }) => (
              <li key={step}>
                <span className="timeline-node">
                  <Icon size={21} />
                </span>
                <span className="timeline-step">
                  {step} / {label}
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <p className="timeline-honesty">
            Reminders require the backend scheduler to be running. TrialGuard
            never assumes a trial converted.
          </p>
        </Reveal>
        <Reveal className="landing-final">
          <ShieldCheck size={38} strokeWidth={1.4} />
          <h2>
            Make room for
            <br />
            <em>what’s worth keeping.</em>
          </h2>
          <p>Your next good money habit starts with one subscription.</p>
          <MagneticLink to={signedIn ? "/" : "/register"}>
            {signedIn ? "Open your workspace" : "Create your workspace"}
          </MagneticLink>
        </Reveal>
      </main>
      <footer className="landing-footer">
        <Link to="/welcome" className="brand">
          <span>
            <ShieldCheck size={21} />
          </span>
          TrialGuard.
        </Link>
        <p>Your subscriptions. Your money. Your call.</p>
        <div>
          <a href="#privacy">Your privacy</a>
          <a href="#top">Back to top</a>
          <Link to={signedIn ? "/" : "/login"}>
            {signedIn ? "Dashboard" : "Sign in"}
          </Link>
        </div>
        <small>Built for a little more peace of mind.</small>
      </footer>
    </div>
  );
}
