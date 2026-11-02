import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarDays,
  List,
  ArrowUpRight,
  ExternalLink,
  Hourglass,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { api, money } from "../api";
import { TrialCountdownCard, AnimatedTabs } from "./premium";
import {
  SuccessToast,
  Deadline,
  useToday,
  daysBetween,
  Skeleton,
  Reveal,
} from "./system";
export default function TrialRadar({
  revision,
  onEdit,
  Modal,
  ErrorBox,
  Empty,
  ServiceIcon,
  onChanged,
}) {
  const today = useToday(),
    [items, setItems] = useState(null),
    [error, setError] = useState(null),
    [view, setView] = useState("timeline"),
    [cancel, setCancel] = useState(null),
    [busy, setBusy] = useState(false),
    [month, setMonth] = useState(today.slice(0, 7)),
    [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    try {
      let page = 1,
        all = [],
        result;
      do {
        result = await api(
          `/subscriptions?status=trial&sort=date&limit=50&page=${page++}`,
        );
        all.push(...result.items);
      } while (all.length < result.total);
      setItems(
        all.sort((a, b) => a.trial_end_date.localeCompare(b.trial_end_date)),
      );
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load, revision, today]);
  const urgent =
      items?.filter((s) => daysBetween(s.trial_end_date, today) <= 3) || [],
    later =
      items?.filter((s) => daysBetween(s.trial_end_date, today) > 3) || [];
  async function confirmCancel() {
    setBusy(true);
    setError(null);
    try {
      await api("/subscriptions/" + cancel.id, {
        method: "PUT",
        body: { ...cancel, price: String(cancel.price), status: "cancelled" },
      });
      setCancel(null);
      setSuccess(
        "Marked cancelled in your tracker. Provider cancellation remains your responsibility.",
      );
      await load();
      onChanged();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function shiftMonth(delta) {
    const d = new Date(month + "-01T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + delta);
    setMonth(d.toISOString().slice(0, 7));
  }
  const card = (s) => (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="radar-plan"
      key={s.id}
    >
      <div className="radar-plan-head">
        <ServiceIcon name={s.service_name} />
        <div>
          <h3>{s.service_name}</h3>
          <small>{s.category}</small>
        </div>
        <div className="radar-price">
          <strong>{money(s.price)}</strong>
          <small>
            /{s.billing_cycle === "yearly" ? "year" : "month"} after trial
          </small>
        </div>
      </div>
      <Deadline date={s.trial_end_date} />
      <div className="trial-actions">
        {s.provider_url ? (
          <a
            className="secondary"
            href={s.provider_url}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            Open provider
          </a>
        ) : (
          <button className="secondary" onClick={() => onEdit(s)}>
            Add provider URL
          </button>
        )}
        <button className="text-action" onClick={() => setCancel(s)}>
          <CheckCircle2 size={15} />
          Mark cancelled
        </button>
        <button
          className="icon-button"
          aria-label={`Edit ${s.service_name}`}
          onClick={() => onEdit(s)}
        >
          <ArrowUpRight size={17} />
        </button>
        <a
          className="icon-button"
          href={`/api/subscriptions/${s.id}/calendar`}
          aria-label={`Export calendar for ${s.service_name}`}
        >
          <Download size={17} />
        </a>
      </div>
    </motion.article>
  );
  const monthStart = new Date(month + "-01T00:00:00Z"),
    count = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    ).getUTCDate(),
    offset = (monthStart.getUTCDay() + 6) % 7;
  return (
    <div className="trial-radar">
      <ErrorBox error={error} />
      <SuccessToast message={success} onDismiss={() => setSuccess("")} />
      {items === null ? (
        <Skeleton />
      ) : items.length === 0 ? (
        <section className="card">
          <Empty
            title="No trials on your radar"
            text="Enjoy the quiet. Add a trial when you try something new, and its deadline will have a home here."
          />
        </section>
      ) : (
        <>
          <TrialCountdownCard plan={items[0]} onReview={onEdit} />
          <div className="radar-toolbar">
            <div>
              <h2>Your decision calendar</h2>
              <p>{items.length} active trials · No automatic conversions</p>
            </div>
            <AnimatedTabs
              panelId="trial-view-panel"
              value={view}
              onChange={setView}
              label="Trial view"
              items={[
                { value: "timeline", label: "Timeline" },
                { value: "calendar", label: "Calendar" },
              ]}
            />
          </div>
          <div
            id="trial-view-panel"
            role="tabpanel"
            aria-labelledby={`trial-view-panel-${view}`}
            tabIndex={0}
          >
            {view === "timeline" ? (
              <>
                <section className="urgent-section">
                  <h3>
                    <AlertTriangle size={16} />
                    Needs attention <span>{urgent.length}</span>
                  </h3>
                  {urgent.length ? (
                    <div className="radar-grid">
                      <AnimatePresence>{urgent.map(card)}</AnimatePresence>
                    </div>
                  ) : (
                    <p className="quiet-state">
                      No trials due in the next 3 days. You have room to decide.
                    </p>
                  )}
                </section>
                {later.length > 0 && (
                  <section>
                    <h3 className="later-heading">
                      Further ahead <span>{later.length}</span>
                    </h3>
                    <div className="radar-grid">
                      <AnimatePresence>{later.map(card)}</AnimatePresence>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <section className="card calendar-panel">
                <div className="calendar-heading">
                  <button
                    className="icon-button"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                  >
                    <ChevronLeft />
                  </button>
                  <h3>
                    {monthStart.toLocaleString("en", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </h3>
                  <button
                    className="icon-button"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                  >
                    <ChevronRight />
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setMonth(today.slice(0, 7))}
                  >
                    This month
                  </button>
                </div>
                <div className="calendar-scroll">
                  <div className="calendar-grid">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <div className="weekday" key={day}>
                          {day}
                        </div>
                      ),
                    )}
                    {Array.from({ length: offset }, (_, i) => (
                      <div className="calendar-day blank" key={"blank" + i} />
                    ))}
                    {Array.from({ length: count }, (_, i) => {
                      const date = month + "-" + String(i + 1).padStart(2, "0");
                      return (
                        <div
                          className={
                            "calendar-day " + (date === today ? "is-today" : "")
                          }
                          key={date}
                        >
                          <time dateTime={date}>{i + 1}</time>
                          {items
                            .filter((s) => s.trial_end_date === date)
                            .map((s) => (
                              <button
                                className="calendar-event"
                                key={s.id}
                                onClick={() => onEdit(s)}
                              >
                                <strong>{s.service_name}</strong>
                                <Deadline date={s.trial_end_date} compact />
                              </button>
                            ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>
        </>
      )}
      <p className="fineprint radar-disclaimer">
        TrialGuard is your tracker, not your provider. Open the provider account
        to cancel externally, then update the tracker here.
      </p>
      {cancel && (
        <Modal
          title="Mark trial cancelled?"
          onClose={() => !busy && setCancel(null)}
        >
          <p>
            This only changes <strong>{cancel.service_name}</strong> in
            TrialGuard. It does not cancel the subscription with the provider or
            stop billing.
          </p>
          <ErrorBox error={error} />
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setCancel(null)}
            >
              Keep tracking
            </button>
            <button className="primary" disabled={busy} onClick={confirmCancel}>
              {busy ? "Updating…" : "Mark cancelled in tracker"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
