import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Wallet,
  Layers,
  Hourglass,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { money } from "../api";
import {
  Deadline,
  AnimatedMoney,
  Reveal,
  stagger,
  entry,
  useToday,
  daysBetween,
  Skeleton,
} from "./system";
import SpendingChart from "./SpendingChart";
import { SpendingStatCard, BudgetMeter, RenewalTimeline } from "./premium";
export default function DashboardView({
  user,
  useLoad,
  PageHeader,
  ErrorBox,
  Empty,
  ServiceIcon,
  onAdd,
  revision,
}) {
  const {
    data: d,
    error,
    loading,
  } = useLoad("/dashboard?revision=" + revision);
  const { data: insights, error: insightsError } = useLoad(
    "/insights?revision=" + revision,
  );
  const { data: plans, error: plansError } = useLoad(
    "/subscriptions?limit=5&sort=date&revision=" + revision,
  );
  const today = useToday();
  const due = d
    ? [
        ...d.overdue.filter((s) => s.status === "trial"),
        ...d.trialsEnding,
      ].sort((a, b) => a.trial_end_date.localeCompare(b.trial_end_date))
    : [];
  const urgent = due.filter((s) => daysBetween(s.trial_end_date, today) <= 3);
  const ratio =
    d && Number(d.budget) > 0 ? Number(d.monthly) / Number(d.budget) : 0;
  return (
    <>
      <PageHeader
        eyebrow="YOUR FINANCIAL COMMAND CENTER"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="Every subscription accounted for. Every decision, yours."
        action={
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="primary"
            onClick={onAdd}
          >
            <Plus size={18} /> Add subscription
          </motion.button>
        }
      />
      <ErrorBox error={error} />
      {loading && !d ? (
        <Skeleton />
      ) : (
        d && (
          <motion.div
            className="command-dashboard"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            <motion.section
              variants={entry}
              className={
                "protection-banner " + (urgent.length ? "has-urgent" : "")
              }
            >
              <div className="protection-copy">
                <span className="eyebrow">
                  <span className="status-dot" /> TRIAL PROTECTION / LIVE
                  OVERVIEW
                </span>
                <h2>
                  {urgent.length ? (
                    <>
                      A decision is coming.
                      <br />
                      <em>Stay one step ahead.</em>
                    </>
                  ) : d.trialCount ? (
                    <>
                      Room to explore.
                      <br />
                      <em>Reminders to keep you covered.</em>
                    </>
                  ) : (
                    <>
                      Less noise.
                      <br />
                      <em>More control.</em>
                    </>
                  )}
                </h2>
                <p>
                  {urgent.length
                    ? `${urgent.length} trial${urgent.length === 1 ? " needs" : "s need"} attention. Review the deadline before deciding what stays.`
                    : d.trialCount
                      ? `${d.trialCount} trials tracked. Your money stays out of paid totals until you confirm a conversion.`
                      : "Bring your subscriptions into focus. Track what matters and leave unwanted renewals behind."}
                </p>
                <Link to="/trials" className="banner-link">
                  Review trial radar <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="protection-emblem" aria-hidden="true">
                <div className="emblem-ring" />
                <ShieldCheck size={104} strokeWidth={1} />
                <span>YOUR CALL. ALWAYS.</span>
              </div>
              {due[0] && (
                <div className="banner-next">
                  <span>NEXT DECISION</span>
                  <strong>{due[0].service_name}</strong>
                  <Deadline date={due[0].trial_end_date} />
                </div>
              )}
            </motion.section>
            <nav className="section-jumps" aria-label="Dashboard sections">
              <span>IN THIS OVERVIEW</span>
              <a href="#spending">Spending</a>
              <a href="#renewals">Renewals</a>
              <a href="#lineup">Your plans</a>
            </nav>
            <div className="stats-grid">
              {[
                {
                  label: "Monthly spending",
                  value: d.monthly,
                  note: "Active paid plans · yearly plans ÷ 12",
                  Icon: Wallet,
                  featured: true,
                },
                {
                  label: "Annual projection",
                  value: d.annual,
                  note: "At current active plan rates",
                  Icon: TrendingUp,
                },
                {
                  label: "Active subscriptions",
                  count: d.activeCount,
                  note: "Paid plans in your workspace",
                  Icon: Layers,
                },
                {
                  label: "Free trials",
                  count: d.trialCount,
                  note: `${d.trialsEnding.length} ending within 7 days`,
                  Icon: Hourglass,
                },
              ].map(({ label, value, count, note, Icon, featured }) => (
                <SpendingStatCard
                  key={label}
                  label={label}
                  value={value}
                  count={count}
                  note={note}
                  Icon={Icon}
                  featured={featured}
                />
              ))}
            </div>
            {d.overdue.length > 0 && (
              <div className="notice">
                <AlertCircle size={20} />
                <div>
                  <strong>
                    {d.overdue.length} date
                    {d.overdue.length === 1 ? " needs" : "s need"} review
                  </strong>
                  <p>
                    {d.overdue.map((s) => s.service_name).join(", ")}. Confirm
                    the outcome with your provider and update the tracker.
                  </p>
                </div>
                <Link to="/subscriptions">
                  Review <ArrowRight size={16} />
                </Link>
              </div>
            )}
            <div className="command-grid">
              <Reveal id="spending" className="card spending-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">SPENDING INTELLIGENCE</span>
                    <h2>Where your money goes</h2>
                    <p>Monthly equivalent · choose a category to focus</p>
                  </div>
                  <span className="pill">LIVE DATA</span>
                </div>
                {d.categories.length ? (
                  <SpendingChart categories={d.categories} total={d.monthly} />
                ) : (
                  <Empty
                    title="Your spending story starts here"
                    text="Add an active plan to see an honest breakdown of your monthly commitments."
                  />
                )}
              </Reveal>
              <BudgetMeter
                spent={d.monthly}
                budget={d.budget}
                remaining={d.remaining}
                potentialMonthly={d.potentialMonthly}
              />
              <Reveal id="renewals" className="card renewal-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">ON THE HORIZON</span>
                    <h2>Upcoming renewals</h2>
                    <p>The next 30 days, at a glance</p>
                  </div>
                  <Link to="/subscriptions">
                    All plans <ArrowUpRight size={16} />
                  </Link>
                </div>
                {d.upcoming.length ? (
                  <RenewalTimeline
                    plans={d.upcoming.slice(0, 5)}
                    ServiceIcon={ServiceIcon}
                  />
                ) : (
                  <Empty
                    title="A clear calendar"
                    text="No active payments tracked in the next 30 days."
                  />
                )}
              </Reveal>
              <Reveal className="card insight-preview">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">A SECOND LOOK</span>
                    <h2>Worth your attention</h2>
                  </div>
                  <Sparkles size={22} />
                </div>
                {insightsError ? (
                  <ErrorBox error={insightsError} />
                ) : !insights ? (
                  <p role="status">Loading your insights…</p>
                ) : insights?.items.length ? (
                  insights.items.slice(0, 3).map((item, i) => (
                    <Link
                      to="/insights"
                      className="insight-preview-row"
                      key={i}
                    >
                      <span className="insight-index">0{i + 1}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.message}</p>
                      </div>
                      <ArrowUpRight size={17} />
                    </Link>
                  ))
                ) : (
                  <Empty
                    title="No flags right now"
                    text="Keep your manual usage dates current for more useful insights."
                  />
                )}
                <span className="rule-label">
                  RULE-BASED · YOUR DATA, YOUR DECISION
                </span>
              </Reveal>
              <Reveal id="lineup" className="card portfolio-panel">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">THE THINGS YOU KEEP</span>
                    <h2>Your subscription lineup</h2>
                  </div>
                  <Link to="/subscriptions">
                    Manage plans <ArrowUpRight size={16} />
                  </Link>
                </div>
                {plansError ? (
                  <ErrorBox error={plansError} />
                ) : !plans ? (
                  <p role="status">Loading your plans…</p>
                ) : plans?.items.length ? (
                  <div className="portfolio-list">
                    {plans.items.map((s) => (
                      <Link
                        to="/subscriptions"
                        className="portfolio-item"
                        key={s.id}
                      >
                        <ServiceIcon name={s.service_name} />
                        <div>
                          <strong>{s.service_name}</strong>
                          <small>{s.category}</small>
                        </div>
                        <div className="portfolio-price">
                          <strong>{money(s.price)}</strong>
                          <small>
                            /{s.billing_cycle === "yearly" ? "year" : "month"}
                          </small>
                        </div>
                        <Deadline
                          status={s.status}
                          date={
                            s.status === "trial"
                              ? s.trial_end_date
                              : s.next_billing_date
                          }
                        />
                        <ArrowUpRight size={17} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Your first plan belongs here"
                    action={
                      <button className="primary" onClick={onAdd}>
                        <Plus size={16} />
                        Add a plan
                      </button>
                    }
                  />
                )}
              </Reveal>
            </div>
          </motion.div>
        )
      )}
    </>
  );
}
