import Decimal from "decimal.js";
import { dayDiff } from "./dates.js";
export const monthly = (s) =>
  new Decimal(s.price).div(s.billing_cycle === "yearly" ? 12 : 1);
export function summarize(rows, budget, date) {
  const paid = rows.filter((s) => s.status === "active"),
    trials = rows.filter((s) => s.status === "trial");
  const total = paid.reduce((sum, s) => sum.plus(monthly(s)), new Decimal(0));
  const added = trials.reduce((sum, s) => sum.plus(monthly(s)), new Decimal(0));
  const category = {};
  paid.forEach((s) => {
    category[s.category] = (category[s.category] || new Decimal(0)).plus(
      monthly(s),
    );
  });
  return {
    today: date,
    monthly: total.toFixed(2),
    annual: total.times(12).toFixed(2),
    activeCount: paid.length,
    trialCount: trials.length,
    budget: new Decimal(budget).toFixed(2),
    remaining: new Decimal(budget).minus(total).toFixed(2),
    potentialMonthly: added.toFixed(2),
    categories: Object.entries(category).map(([name, value]) => ({
      name,
      amount: value.toFixed(2),
    })),
    trialsEnding: trials
      .filter(
        (s) =>
          dayDiff(s.trial_end_date, date) >= 0 &&
          dayDiff(s.trial_end_date, date) <= 7,
      )
      .sort((a, b) => a.trial_end_date.localeCompare(b.trial_end_date)),
    upcoming: paid
      .filter(
        (s) =>
          dayDiff(s.next_billing_date, date) >= 0 &&
          dayDiff(s.next_billing_date, date) <= 30,
      )
      .sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date)),
    overdue: rows.filter(
      (s) =>
        s.status !== "cancelled" &&
        (s.status === "trial" ? s.trial_end_date : s.next_billing_date) < date,
    ),
  };
}
export function insights(rows, budget, date) {
  const items = [];
  const active = rows.filter((s) => s.status === "active");
  active.forEach((s) => {
    if (s.last_used_date && dayDiff(date, s.last_used_date) >= 30)
      items.push({
        type: "unused",
        title: `Revisit ${s.service_name}`,
        message: `Last used ${s.last_used_date}, based on your manual entry. Potential monthly savings: ₹${monthly(s).toFixed(2)}.`,
        ids: [s.id],
      });
  });
  const groups = {};
  active.forEach((s) => (groups[s.category] ??= []).push(s));
  Object.entries(groups).forEach(([cat, plans]) => {
    if (plans.length > 1)
      items.push({
        type: "overlap",
        title: `Check your ${cat.toLowerCase()} plans`,
        message: `${plans.map((s) => s.service_name).join(", ")} may overlap. Compare what you actually use.`,
        ids: plans.map((s) => s.id),
      });
  });
  const summary = summarize(rows, budget, date);
  if (new Decimal(budget).gt(0) && new Decimal(summary.remaining).lt(0))
    items.push({
      type: "budget",
      title: "Your budget needs attention",
      message: `Active plans exceed your monthly budget by ₹${new Decimal(summary.remaining).abs().toFixed(2)}.`,
      ids: [],
    });
  summary.trialsEnding.forEach((s) =>
    items.push({
      type: "trial",
      title: `${s.service_name} ends soon`,
      message: `Review this trial before ${s.trial_end_date}. Only you can confirm conversion or cancellation.`,
      ids: [s.id],
    }),
  );
  return items;
}
