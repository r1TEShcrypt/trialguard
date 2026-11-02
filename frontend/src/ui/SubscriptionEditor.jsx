import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Layers,
  CalendarDays,
  Link2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { api, money } from "../api";
import EditorSurface from "./EditorSurface";
import DatePickerField from "./DatePickerField";
import { Input } from "@/components/ui/input";
import { FieldSet, FieldLegend, FieldError } from "@/components/ui/field";
import { Deadline, useToday } from "./system";
export default function SubscriptionEditor({
  subscription,
  defaultTrial,
  onClose,
  onSaved,
  useLoad,
  Modal,
  ErrorBox,
}) {
  const today = useToday(),
    s = subscription || {},
    form = useRef(null);
  const initial = useRef({
    service_name: s.service_name || "",
    category_id: String(s.category_id || ""),
    price: s.price || "",
    billing_cycle: s.billing_cycle || "monthly",
    status: s.status || (defaultTrial ? "trial" : "active"),
    start_date: s.start_date || today,
    next_billing_date: s.next_billing_date || "",
    trial_end_date: s.trial_end_date || "",
    provider_url: s.provider_url || "",
    notes: s.notes || "",
    last_used_date: s.last_used_date || "",
  });
  const [values, setValues] = useState(initial.current),
    [error, setError] = useState(null),
    [fields, setFields] = useState({}),
    [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false);
  const { data: categories, error: categoryError } = useLoad("/categories");
  const dirty = JSON.stringify(values) !== JSON.stringify(initial.current);
  useEffect(() => {
    const prevent = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    if (dirty) window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  function close() {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  }
  function change(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setFields((f) => ({ ...f, [name]: "" }));
    setError(null);
  }
  function input(name) {
    return {
      name,
      value: values[name],
      onChange: (e) => change(name, e.target.value),
      "aria-invalid": Boolean(fields[name]),
      "aria-describedby": fields[name] ? name + "-error" : undefined,
    };
  }
  function hint(name) {
    return fields[name] ? (
      <FieldError className="field-error" id={name + "-error"}>
        {fields[name]}
      </FieldError>
    ) : null;
  }
  async function save(e) {
    e.preventDefault();
    const issues = {};
    if (values.next_billing_date < values.start_date)
      issues.next_billing_date = "Choose a date on or after the start date.";
    if (values.trial_end_date && values.trial_end_date < values.start_date)
      issues.trial_end_date = "Choose a date on or after the start date.";
    if (values.status === "trial" && !values.trial_end_date)
      issues.trial_end_date = "Enter the trial deadline.";
    if (values.provider_url && !/^https?:\/\//i.test(values.provider_url))
      issues.provider_url = "Use an HTTP or HTTPS provider URL.";
    if (Object.keys(issues).length) {
      setFields(issues);
      requestAnimationFrame(() =>
        form.current?.querySelector('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/subscriptions" + (s.id ? "/" + s.id : ""), {
        method: s.id ? "PUT" : "POST",
        body: values,
      });
      onSaved();
    } catch (e) {
      setError(e);
      setFields(
        Object.fromEntries((e.fields || []).map((f) => [f.field, f.message])),
      );
      requestAnimationFrame(() =>
        form.current?.querySelector('[aria-invalid="true"]')?.focus(),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <EditorSurface
      title={s.id ? "Edit subscription" : "Make room for a new plan"}
      onClose={close}
    >
      <p className="editor-intro">A few details now. Fewer surprises later.</p>
      {discard ? (
        <div className="discard-panel" role="alert">
          <AlertTriangle size={24} />
          <h3>Keep your changes?</h3>
          <p>
            You have unsaved edits. Continue editing or discard them to close.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDiscard(false)}>
              Continue editing
            </button>
            <button className="destructive" onClick={onClose}>
              Discard changes
            </button>
          </div>
        </div>
      ) : (
        <form ref={form} onSubmit={save} className="subscription-form">
          <FieldSet>
            <FieldLegend>
              <Layers size={16} />
              01 / The essentials
            </FieldLegend>
            <div className="form-grid">
              <label className="full">
                Service name
                <Input
                  {...input("service_name")}
                  required
                  maxLength={100}
                  placeholder="e.g. Your favourite music app"
                />
                {hint("service_name")}
              </label>
              <label>
                Category
                <select
                  {...input("category_id")}
                  aria-label="Category"
                  required
                >
                  <option value="" disabled>
                    Choose category
                  </option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {hint("category_id")}
              </label>
              <label>
                Status
                <select {...input("status")} aria-label="Status">
                  <option value="active">Active paid plan</option>
                  <option value="trial">Free trial</option>
                  <option value="cancelled">Cancelled in tracker</option>
                </select>
              </label>
              <label>
                Price in INR
                <Input
                  {...input("price")}
                  type="number"
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
                {hint("price")}
              </label>
              <label>
                Billing cycle
                <select {...input("billing_cycle")} aria-label="Billing cycle">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend>
              <CalendarDays size={16} />
              02 / Dates that matter
            </FieldLegend>
            <div className="form-grid">
              <label>
                Start date
                <DatePickerField
                  label="start date"
                  {...input("start_date")}
                  type="date"
                  required
                />
                {hint("start_date")}
              </label>
              <label>
                Next billing date
                <DatePickerField
                  label="next billing date"
                  {...input("next_billing_date")}
                  type="date"
                  required
                />
                {hint("next_billing_date")}
              </label>
              <label>
                Trial end date {values.status !== "trial" && "(optional)"}
                <DatePickerField
                  label="trial end date"
                  {...input("trial_end_date")}
                  type="date"
                  required={values.status === "trial"}
                />
                {hint("trial_end_date")}
              </label>
              <label>
                Last used (manual, optional)
                <DatePickerField
                  label="last used date"
                  {...input("last_used_date")}
                  type="date"
                  max={today}
                />
                {hint("last_used_date")}
              </label>
            </div>
            <p className="form-note">
              Dates are calendar days. Last-used dates are entered by you, never
              inferred from app activity.
            </p>
          </FieldSet>
          <FieldSet>
            <FieldLegend>
              <Link2 size={16} />
              03 / Your way out
            </FieldLegend>
            <label>
              Provider account / cancellation URL
              <Input
                {...input("provider_url")}
                type="url"
                maxLength={2048}
                placeholder="https://provider.com/account"
              />
              {hint("provider_url")}
            </label>
            <label>
              Notes (optional)
              <textarea
                {...input("notes")}
                maxLength={5000}
                rows={2}
                placeholder="Where to cancel, what’s included, or why you keep it."
              />
              {hint("notes")}
            </label>
          </FieldSet>
          <div className="live-plan-summary" aria-live="polite">
            <div>
              <small>YOUR PLAN AT A GLANCE</small>
              <strong>{values.service_name || "Your new subscription"}</strong>
              <span>
                {money(values.price)} /{" "}
                {values.billing_cycle === "yearly" ? "year" : "month"}
                {values.status === "trial" ? " after trial" : ""}
              </span>
            </div>
            <Deadline
              date={
                values.status === "trial"
                  ? values.trial_end_date
                  : values.next_billing_date
              }
              status={values.status}
            />
          </div>
          {values.status === "trial" && (
            <p className="form-note">
              Enter the price you would pay after the trial. It stays out of
              paid spending until you explicitly mark the plan active.
            </p>
          )}
          {values.status === "cancelled" && (
            <div className="notice">
              <ShieldCheck size={20} />
              <p>
                This updates your tracker only. Cancel with your provider to
                stop billing.
              </p>
            </div>
          )}
          <ErrorBox error={error || categoryError} />
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="primary"
              disabled={busy || !categories}
            >
              {busy ? "Saving…" : "Save subscription"}
            </motion.button>
          </div>
        </form>
      )}
    </EditorSurface>
  );
}
