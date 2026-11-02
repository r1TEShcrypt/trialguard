import React, { useId } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  Wallet,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  ExternalLink,
  Hourglass,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  AnimatedMoney,
  Deadline,
  Reveal,
  entry,
  useToday,
  daysBetween,
  deadlineState,
} from "./system";
import { money, displayDate } from "../api";
export { DeadlineChip, SkeletonLoader } from "./system";

export function AnimatedTabs({ value, onChange, items, label, panelId }) {
  const id = useId();
  return (
    <Tabs value={value} onValueChange={onChange} className="animated-tabs">
      <TabsList className="premium-tabs" aria-label={label}>
        {items.map((item) => (
          <TabsTrigger
            value={item.value}
            key={item.value}
            id={panelId ? `${panelId}-${item.value}` : undefined}
            aria-controls={panelId}
            className="premium-tab"
          >
            {value === item.value && (
              <motion.span
                className="tab-slider"
                layoutId={"tab-" + id}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <span>{item.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
export function Hint({ label, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
export function SpendingStatCard({
  label,
  value,
  count,
  note,
  Icon = Wallet,
  featured = false,
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      variants={entry}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.18 }}
      className={"stat " + (featured ? "featured" : "")}
    >
      <div>
        {label}
        <span className="stat-icon">
          <Icon size={18} />
        </span>
      </div>
      <strong>
        {value !== undefined ? <AnimatedMoney value={value} /> : count}
      </strong>
      <small>{note}</small>
    </motion.article>
  );
}
export function BudgetMeter({ spent, budget, remaining, potentialMonthly }) {
  const reduce = useReducedMotion(),
    ratio = Number(budget) > 0 ? Number(spent) / Number(budget) : 0,
    state = ratio > 1 ? "exceeded" : ratio >= 0.8 ? "approaching" : "healthy";
  return (
    <Reveal className={`card budget-card budget-${state}`}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR SPENDING BOUNDARY</span>
          <h2>Monthly budget</h2>
        </div>
        <Wallet size={22} />
      </div>
      <div className="budget-amount">
        <AnimatedMoney value={spent} />
        <span> / {money(budget)}</span>
      </div>
      <div className="budget-caption">
        <span>
          {Number(budget)
            ? `${Math.round(ratio * 100)}% used`
            : "No target yet"}
        </span>
        <span>
          {ratio > 1
            ? "Over budget"
            : ratio === 1
              ? "At your limit"
              : ratio >= 0.8
                ? "Approaching limit"
                : "Room to breathe"}
        </span>
      </div>
      <div
        className="progress"
        role="meter"
        aria-label="Monthly budget used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(ratio * 100))}
        aria-valuetext={`${money(spent)} spent of ${money(budget)}`}
      >
        <motion.span
          initial={false}
          animate={{ scaleX: Math.max(0, Math.min(1, ratio)) }}
          style={{ width: "100%", transformOrigin: "left" }}
          transition={{ duration: reduce ? 0 : 0.25 }}
        />
      </div>
      <p className={Number(remaining) < 0 ? "negative" : "positive"}>
        {Number(budget) === 0
          ? "Set a target to find your balance."
          : Number(remaining) < 0
            ? `${money(-Number(remaining))} over budget`
            : `${money(remaining)} left in your monthly budget`}
      </p>
      <div className="budget-divider" />
      <p>
        Current trials could add <strong>{money(potentialMonthly)}/mo</strong>{" "}
        if you choose to keep them.
      </p>
      <Link className="text-action" to="/settings">
        Adjust budget <ArrowUpRight size={16} />
      </Link>
    </Reveal>
  );
}
export function RenewalTimeline({ plans, ServiceIcon }) {
  const today = useToday(),
    groups = plans.reduce((groups, p) => {
      (groups[p.next_billing_date] ??= []).push(p);
      return groups;
    }, {});
  return (
    <ol className="renewal-timeline grouped-timeline">
      {Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, items]) => (
          <li
            key={date}
            className={
              "renewal-date-group marker-" +
              deadlineState(date, "active", today).tone
            }
          >
            <div className="date-marker">
              <strong>{date.slice(8)}</strong>
              <span>
                {new Date(date + "T00:00:00Z").toLocaleString("en", {
                  month: "short",
                  timeZone: "UTC",
                })}
              </span>
            </div>
            <div className="renewal-group-plans">
              {items.map((s) => (
                <div className="renewal-entry" key={s.id}>
                  <ServiceIcon name={s.service_name} />
                  <div className="grow">
                    <strong>{s.service_name}</strong>
                    <Deadline date={date} status="active" compact />
                  </div>
                  <strong>{money(s.price)}</strong>
                </div>
              ))}
            </div>
          </li>
        ))}
    </ol>
  );
}
export function TrialCountdownCard({ plan, onReview }) {
  const today = useToday(),
    days = daysBetween(plan.trial_end_date, today),
    total =
      plan.start_date && plan.trial_end_date
        ? daysBetween(plan.trial_end_date, plan.start_date)
        : 0,
    elapsed =
      total > 0
        ? Math.min(1, Math.max(0, daysBetween(today, plan.start_date) / total))
        : null;
  return (
    <Reveal
      className={
        "nearest-trial trial-countdown-card nearest-" +
        deadlineState(plan.trial_end_date, "trial", today).tone
      }
    >
      <div className="countdown-main">
        <span className="eyebrow">
          <Hourglass size={14} />
          NEAREST TRIAL DEADLINE
        </span>
        <h2>{plan.service_name}</h2>
        <p>
          {money(plan.price)} per{" "}
          {plan.billing_cycle === "yearly" ? "year" : "month"} if you choose to
          continue.
        </p>
        <Deadline date={plan.trial_end_date} />
        {elapsed !== null && (
          <div className="trial-elapsed">
            <div
              className="progress"
              role="progressbar"
              aria-label="Trial time elapsed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(elapsed * 100)}
            >
              <span style={{ width: elapsed * 100 + "%" }} />
            </div>
            <small>
              {displayDate(plan.start_date)} →{" "}
              {displayDate(plan.trial_end_date)}
            </small>
          </div>
        )}
        <div className="countdown-actions">
          <button className="primary" onClick={() => onReview(plan)}>
            Review trial <ArrowUpRight size={15} />
          </button>
          {plan.provider_url && (
            <a
              className="secondary"
              href={plan.provider_url}
              target="_blank"
              rel="noreferrer"
            >
              Open provider <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>
      <div className="countdown-display">
        <strong>{Math.abs(days)}</strong>
        <span>
          {days < 0
            ? "DAYS OVERDUE"
            : days === 0
              ? "DUE TODAY"
              : "DAYS TO DECIDE"}
        </span>
      </div>
    </Reveal>
  );
}
export function SubscriptionCard({
  plan,
  selected,
  onSelect,
  onEdit,
  onDelete,
  ServiceIcon,
}) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      layout="position"
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      className={`subscription-card ${selected ? "selected" : ""}`}
    >
      <div className="subscription-card-top">
        <button
          className="select-plan"
          aria-label={`Select ${plan.service_name}`}
          aria-pressed={selected}
          onClick={() => onSelect(plan)}
        >
          <ServiceIcon name={plan.service_name} />
          <span>
            <strong>{plan.service_name}</strong>
            <small>{plan.category}</small>
          </span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="icon-button"
              aria-label={`Manage ${plan.service_name}`}
            >
              <MoreHorizontal size={19} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(plan)}>
              <Pencil size={15} />
              Edit subscription
            </DropdownMenuItem>
            {plan.provider_url && (
              <DropdownMenuItem asChild>
                <a href={plan.provider_url} target="_blank" rel="noreferrer">
                  <ExternalLink size={15} />
                  Open provider
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <a href={`/api/subscriptions/${plan.id}/calendar`}>
                <Download size={15} />
                Export calendar
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => onDelete(plan)}
            >
              <Trash2 size={15} />
              Delete from tracker
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="subscription-card-price">
        <strong>{money(plan.price)}</strong>
        <span>/{plan.billing_cycle === "yearly" ? "year" : "month"}</span>
        <span className={"badge " + plan.status}>
          {plan.status === "trial"
            ? "Free trial"
            : plan.status === "active"
              ? "Active"
              : "Cancelled"}
        </span>
      </div>
      <Deadline
        status={plan.status}
        date={
          plan.status === "trial" ? plan.trial_end_date : plan.next_billing_date
        }
      />
      <button className="card-edit-link" onClick={() => onEdit(plan)}>
        Review details <ArrowUpRight size={15} />
      </button>
    </motion.article>
  );
}
export function InsightCard({ finding }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      className="card insight-card"
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <span className="insight-icon">
        <Sparkles size={22} />
      </span>
      <div>
        <span className="eyebrow">RULE-BASED · {finding.type}</span>
        <h2>{finding.title}</h2>
        <p>{finding.message}</p>
        <Link
          to={
            finding.type === "budget"
              ? "/settings"
              : finding.type === "trial"
                ? "/trials"
                : "/subscriptions"
          }
        >
          Review {finding.type === "budget" ? "budget" : "plans"}{" "}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </motion.article>
  );
}
