import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
  animate,
} from "motion/react";
import {
  Sun,
  Moon,
  Clock3,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { money, displayDate } from "../api";
import { Skeleton as SkeletonBlock } from "@/components/ui/skeleton";

export function SuccessToast({ message, onDismiss }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          key={message}
          className="success"
          role="status"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
        >
          <CheckCircle2 size={18} />
          {message}
          <button
            className="icon-button"
            aria-label="Dismiss confirmation"
            onClick={onDismiss}
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const entry = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: "easeOut" },
};
export const stagger = { animate: { transition: { staggerChildren: 0.045 } } };
const Theme = createContext(null),
  Clock = createContext("");
export function DesignProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    try {
      return localStorage.getItem("trialguard-theme") || "system";
    } catch {
      return "system";
    }
  });
  const [system, setSystem] = useState(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  useEffect(() => {
    const q = matchMedia("(prefers-color-scheme: dark)");
    const fn = () => setSystem(q.matches ? "dark" : "light");
    q.addEventListener("change", fn);
    return () => q.removeEventListener("change", fn);
  }, []);
  const theme = preference === "system" ? system : preference;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  function setTheme(value) {
    setPreference(value);
    try {
      localStorage.setItem("trialguard-theme", value);
    } catch {}
  }
  return (
    <MotionConfig reducedMotion="user">
      <Theme.Provider value={{ theme, setTheme, preference }}>
        {children}
      </Theme.Provider>
    </MotionConfig>
  );
}
export function ThemeToggle() {
  const { theme, setTheme } = useContext(Theme);
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className="icon-button theme-toggle"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </motion.button>
  );
}
export function ThemeChoice() {
  const { preference, setTheme } = useContext(Theme);
  return (
    <label>
      Appearance
      <select
        aria-label="Appearance"
        value={preference}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="system">Use device theme</option>
        <option value="light">Warm ivory</option>
        <option value="dark">After hours</option>
      </select>
    </label>
  );
}
export function calendarToday(timezone = "Asia/Kolkata") {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export const daysBetween = (date, today) =>
  Math.round(
    (Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) /
      86400000,
  );
export function ClockProvider({ timezone, children }) {
  const [date, setDate] = useState(() => calendarToday(timezone));
  useEffect(() => {
    const tick = () => setDate(calendarToday(timezone));
    tick();
    const timer = setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timezone]);
  return <Clock.Provider value={date}>{children}</Clock.Provider>;
}
export const useToday = () => useContext(Clock) || calendarToday();
export function deadlineState(date, status, today) {
  if (status === "cancelled")
    return { tone: "neutral", label: "Cancelled", Icon: CheckCircle2 };
  if (!date)
    return { tone: "neutral", label: "Date not set", Icon: CalendarDays };
  const days = daysBetween(date, today),
    verb = status === "trial" ? "Trial ends" : "Renews";
  return {
    days,
    tone:
      days < 0
        ? "overdue"
        : days <= 1
          ? "immediate"
          : days <= 3
            ? "soon"
            : days <= 7
              ? "week"
              : "neutral",
    label:
      days < 0
        ? "Overdue · review needed"
        : days === 0
          ? `${verb} today`
          : days === 1
            ? `${verb} tomorrow`
            : `${verb} in ${days} days`,
    Icon: days < 0 ? AlertTriangle : Clock3,
  };
}
export function DeadlineChip({ date, status = "trial", compact = false }) {
  const today = useToday(),
    { tone, label, Icon } = deadlineState(date, status, today);
  return (
    <span className={`deadline deadline-${tone} ${compact ? "compact" : ""}`}>
      <span className="deadline-label">
        <Icon size={13} />
        {label}
      </span>
      {date && <time dateTime={date}>{displayDate(date)}</time>}
    </span>
  );
}
export function Reveal({ children, className = "", ...props }) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className={className}
      initial={reduced ? false : { opacity: 0.65, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.24 }}
      {...props}
    >
      {children}
    </motion.section>
  );
}
export function AnimatedMoney({ value }) {
  const node = useRef(null),
    previous = useRef(Number(value)),
    reduced = useReducedMotion();
  useEffect(() => {
    const target = Number(value);
    if (!node.current) return;
    if (reduced || previous.current === target) {
      node.current.textContent = money(target);
      previous.current = target;
      return;
    }
    const control = animate(previous.current, target, {
      duration: 0.28,
      onUpdate: (v) => {
        if (node.current) node.current.textContent = money(v);
      },
    });
    previous.current = target;
    return () => control.stop();
  }, [value, reduced]);
  return (
    <span>
      <span className="sr-only">{money(value)}</span>
      <span ref={node} aria-hidden="true">
        {money(value)}
      </span>
    </span>
  );
}
export function SkeletonLoader() {
  return (
    <div
      className="skeleton-group"
      role="status"
      aria-label="Loading your workspace"
    >
      <span className="sr-only">Loading your workspace…</span>
      {[0, 1, 2, 3].map((i) => (
        <div className="skeleton" key={i}>
          <SkeletonBlock className="skeleton-line" />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

export const Deadline = DeadlineChip;
export const Skeleton = SkeletonLoader;
