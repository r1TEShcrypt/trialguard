import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
  useRef,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import {
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Hourglass,
  Sparkles,
  Bell,
  Settings,
  ArrowUpRight,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
  LogOut,
  ArrowRight,
  CalendarDays,
  Check,
  AlertCircle,
  Wallet,
  TrendingUp,
  Download,
  ExternalLink,
  Pencil,
  Trash2,
  Leaf,
} from "lucide-react";
import { api, money, displayDate } from "./api";
import { motion, AnimatePresence } from "motion/react";
import {
  SuccessToast,
  DesignProvider,
  ClockProvider,
  Deadline,
  ThemeChoice,
  Skeleton,
  useToday,
} from "./ui/system";
import Topbar from "./ui/Topbar";
import DashboardView from "./ui/DashboardView";
import TrialRadar from "./ui/TrialRadar";
import SubscriptionEditor from "./ui/SubscriptionEditor";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { AnimatedTabs, SubscriptionCard, InsightCard } from "./ui/premium";
import LandingPage from "./ui/LandingPage";
import "./styles.css";
import "./shadcn.css";
import "./ui/design.css";
import "./ui/premium.css";
const Auth = createContext(null);
const nav = [
  ["/", "Overview", LayoutDashboard],
  ["/subscriptions", "Subscriptions", Layers],
  ["/trials", "Free trials", Hourglass],
  ["/insights", "Smart insights", Sparkles],
  ["/notifications", "Notifications", Bell],
  ["/settings", "Settings", Settings],
];
function ErrorBox({ error }) {
  return error ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      <div>
        {error.message || error}
        {error.fields?.map((f) => (
          <div key={f.field}>
            {f.field.replaceAll("_", " ")}: {f.message}
          </div>
        ))}
      </div>
    </div>
  ) : null;
}
function Loading() {
  return <Skeleton />;
}
function Empty({
  title = "Nothing here yet",
  text = "Add your first subscription to start getting a clearer picture.",
  action,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Leaf size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function Badge({ status }) {
  return (
    <span className={"badge " + status}>
      <span />{" "}
      {status === "trial"
        ? "Free trial"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
function useLoad(path) {
  const today = useToday();
  const [data, setData] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    api(path)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path, version, today]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    window.addEventListener("plans-changed", reload);
    return () => window.removeEventListener("plans-changed", reload);
  }, [reload]);
  return { data, error, loading, reload };
}
function App() {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(null);
  const refresh = useCallback(() => {
    setReady(false);
    setError(null);
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e.status !== 401) setError(e);
      })
      .finally(() => setReady(true));
  }, []);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  if (!ready) return <Loading />;
  if (error)
    return (
      <div className="connection">
        <ShieldCheck size={42} />
        <h1>Let’s get connected</h1>
        <ErrorBox error={error} />
        <p>
          TrialGuard needs its MySQL database and API to load your workspace.
        </p>
        <button className="primary" onClick={refresh}>
          Try again
        </button>
      </div>
    );
  return (
    <Auth.Provider value={{ user, setUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<LandingPage signedIn={!!user} />} />
          <Route
            path="*"
            element={
              user ? (
                <Shell />
              ) : (
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/register" element={<AuthPage />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </Auth.Provider>
  );
}
function AuthPage() {
  const location = useLocation(),
    navigate = useNavigate();
  const { setUser } = useContext(Auth);
  const [register, setRegister] = useState(location.pathname === "/register"),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const data = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body,
      });
      setUser(data.user);
      navigate("/");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow light">LESS SURPRISES. MORE CONTROL.</span>
          <h1>
            Your money.
            <br />
            Your subscriptions.
            <br />
            <em>Your call.</em>
          </h1>
          <p>
            A little clarity goes a long way. Keep your plans, free trials, and
            next renewals in one thoughtful space.
          </p>
          <div className="auth-art">
            <ShieldCheck size={80} />
            <span>Make room for what matters.</span>
          </div>
        </div>
        <small>Manual tracking. Clear reminders. No hidden connections.</small>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="eyebrow">WELCOME TO TRIALGUARD</span>
          <h2>
            {register ? "Start with a clean slate." : "Good to have you back."}
          </h2>
          <p>
            {register
              ? "Create your account and take the guesswork out of renewals."
              : "Sign in to see what’s coming up."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  required
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 12 : 1}
                required
                placeholder={
                  register ? "At least 12 characters" : "Enter your password"
                }
              />
            </label>
            <ErrorBox error={error} />
            <button className="primary wide" disabled={busy}>
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New here?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError(null);
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <div className="privacy-note">
            <ShieldCheck size={18} /> Your workspace is private. No bank or
            Gmail access required.
          </div>
        </div>
      </section>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span>
        <ShieldCheck size={24} />
      </span>
      TrialGuard<span className="brand-dot">.</span>
    </div>
  );
}
function Shell() {
  const navigate = useNavigate();
  const [quickEdit, setQuickEdit] = useState(null);
  const sidebarRef = useRef(null);
  const [narrow, setNarrow] = useState(
    () => matchMedia("(max-width: 680px)").matches,
  );
  const location = useLocation();
  const { data: preferences } = useLoad("/settings");
  const { user, setUser } = useContext(Auth);
  const [open, setOpen] = useState(false),
    [logoutError, setLogoutError] = useState(null);
  const { data: notifications, reload } = useLoad("/notifications");
  useEffect(() => {
    const query = matchMedia("(max-width: 680px)");
    const fn = () => setNarrow(query.matches);
    query.addEventListener("change", fn);
    return () => query.removeEventListener("change", fn);
  }, []);
  useEffect(() => {
    if (!open || !narrow) return;
    const previous = document.activeElement,
      oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector("button")?.focus();
    const key = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const focusable = [
          ...sidebarRef.current.querySelectorAll("a,button"),
        ].filter((el) => el.offsetParent !== null && !el.disabled);
        const first = focusable[0],
          last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [open, narrow]);
  useEffect(() => {
    const timer = setInterval(reload, 60000);
    window.addEventListener("focus", reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [reload]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      navigate("/login");
      setUser(null);
    } catch (e) {
      setLogoutError(e);
    }
  }
  return (
    <ClockProvider timezone={preferences?.timezone || "Asia/Kolkata"}>
      <div className="shell">
        <button
          className="mobile-menu icon-button"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
        {open && (
          <button
            className="nav-overlay"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          aria-label="Primary navigation"
          inert={narrow && !open}
          className={open ? "sidebar open" : "sidebar"}
        >
          <Brand />
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
          <div className="nav-label">YOUR WORKSPACE</div>
          <nav>
            {nav.map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                onClick={() => setOpen(false)}
              >
                {location.pathname === path && (
                  <motion.span
                    className="active-indicator"
                    layoutId="sidebar-active"
                    transition={{ duration: 0.22 }}
                  />
                )}
                <Icon size={19} />
                <span className="nav-text">{label}</span>
                {path === "/notifications" && notifications?.unread > 0 && (
                  <span className="nav-count">{notifications.unread}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Leaf size={20} />
            </span>
            <h4>
              Small checks.
              <br />
              Smarter spending.
            </h4>
            <p>Review your plans regularly. Keep only what brings you value.</p>
            <Link to="/insights" onClick={() => setOpen(false)}>
              Find your next insight <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>Personal workspace</small>
            </div>
            <button
              onClick={logout}
              className="icon-button"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
          <ErrorBox error={logoutError} />
        </aside>
        <main className="main" inert={narrow && open}>
          <Topbar
            user={user}
            data={notifications}
            reload={reload}
            onAdd={() => setQuickEdit({})}
            onEdit={setQuickEdit}
            logout={logout}
          />
          <motion.div
            className="page"
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/trials" element={<Subscriptions trials />} />
              <Route path="/insights" element={<Insights />} />
              <Route
                path="/notifications"
                element={<Notifications onRead={reload} />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
          <footer>
            <Link to="/welcome">
              Discover TrialGuard <ArrowUpRight size={12} />
            </Link>
            <span>TrialGuard · Your subscriptions, in control</span>
          </footer>
          {quickEdit && (
            <SubscriptionModal
              subscription={quickEdit.id ? quickEdit : null}
              onClose={() => setQuickEdit(null)}
              onSaved={() => {
                setQuickEdit(null);
                window.dispatchEvent(new Event("plans-changed"));
              }}
            />
          )}
        </main>
      </div>
    </ClockProvider>
  );
}
function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow || "YOUR WORKSPACE"}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
function Dashboard() {
  const { user } = useContext(Auth);
  const [adding, setAdding] = useState(false),
    [revision, setRevision] = useState(0);
  return (
    <>
      <DashboardView
        revision={revision}
        user={user}
        useLoad={useLoad}
        PageHeader={PageHeader}
        ErrorBox={ErrorBox}
        Empty={Empty}
        ServiceIcon={ServiceIcon}
        onAdd={() => setAdding(true)}
      />
      {adding && (
        <SubscriptionModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setRevision((v) => v + 1);
          }}
        />
      )}
    </>
  );
}
function ServiceIcon({ name }) {
  return (
    <span className={"service-icon color-" + (name.charCodeAt(0) % 5)}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
function Subscriptions({ trials = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const location = useLocation();
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState(
      new URLSearchParams(location.search).get("search") || "",
    ),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all"),
    [sort, setSort] = useState("date"),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState(null),
    [deleting, setDeleting] = useState(null),
    [mutationError, setMutationError] = useState(null),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  const { data: categories } = useLoad("/categories");
  const effectiveStatus = trials ? "trial" : status;
  useEffect(() => {
    setSearch(new URLSearchParams(location.search).get("search") || "");
    setPage(1);
  }, [location.search]);
  const { data, error, loading, reload } = useLoad(
    "/subscriptions?" +
      new URLSearchParams({
        search,
        status: effectiveStatus,
        category,
        sort,
        page,
        limit: 10,
      }),
  );
  useEffect(() => {
    setPage(1);
  }, [trials]);
  async function remove() {
    setBusy(true);
    setMutationError(null);
    try {
      await api("/subscriptions/" + deleting.id, { method: "DELETE" });
      setDeleting(null);
      setSuccess("Subscription removed from your tracker.");
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (e) {
      setMutationError(e);
    } finally {
      setBusy(false);
    }
  }
  const filter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };
  return (
    <>
      <PageHeader
        eyebrow={trials ? "BEFORE THE FIRST CHARGE" : "EVERY PLAN, ONE PLACE"}
        title={trials ? "Your free-trial radar." : "Your subscriptions."}
        description={
          trials
            ? "Try something new. Make the decision to stay on your terms."
            : "Keep track of the things you love — and rethink the rest."
        }
        action={
          <button className="primary" onClick={() => setEdit({})}>
            <Plus size={18} /> {trials ? "Add free trial" : "Add subscription"}
          </button>
        }
      />
      {trials && (
        <div className="notice">
          <Hourglass size={22} />
          <p>
            In-app reminders arrive 3 days and 1 day before a trial ends.
            Expired trials stay here until you confirm their outcome.
          </p>
        </div>
      )}
      <SuccessToast message={success} onDismiss={() => setSuccess("")} />
      {trials ? (
        <TrialRadar
          revision={revision}
          onEdit={setEdit}
          onChanged={() => {
            reload();
            setRevision((v) => v + 1);
          }}
          Modal={Modal}
          ErrorBox={ErrorBox}
          Empty={Empty}
          ServiceIcon={ServiceIcon}
        />
      ) : (
        <section className="card subscriptions-card" aria-busy={loading}>
          <AnimatedTabs
            panelId="subscription-results"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            label="Subscription status"
            items={[
              { value: "all", label: "All plans" },
              { value: "active", label: "Active" },
              { value: "trial", label: "Trial" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <div
            id="subscription-results"
            role="tabpanel"
            aria-labelledby={`subscription-results-${status}`}
            tabIndex={0}
          >
            <div className="filters">
              <label className="search-field">
                <Search size={18} />
                <input
                  aria-label="Search subscriptions"
                  placeholder="Search your subscriptions…"
                  value={search}
                  onChange={filter(setSearch)}
                />
              </label>
              {!trials && (
                <select
                  aria-label="Filter status"
                  value={status}
                  onChange={filter(setStatus)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="trial">Free trial</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}
              <select
                aria-label="Filter category"
                value={category}
                onChange={filter(setCategory)}
              >
                <option value="all">All categories</option>
                {categories?.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Sort subscriptions"
                value={sort}
                onChange={filter(setSort)}
              >
                <option value="date">Nearest deadline</option>
                <option value="name">Service name</option>
                <option value="price">Monthly cost: high first</option>
                <option value="newest">Recently added</option>
              </select>
            </div>
            <ErrorBox error={error} />
            {loading && !data ? (
              <Loading />
            ) : data?.items.length ? (
              <>
                <div className="subscription-mobile-cards">
                  {data.items.map((plan) => (
                    <SubscriptionCard
                      key={plan.id}
                      plan={plan}
                      selected={selectedId === plan.id}
                      onSelect={(s) =>
                        setSelectedId(selectedId === s.id ? null : s.id)
                      }
                      onEdit={setEdit}
                      onDelete={(s) => {
                        setMutationError(null);
                        setDeleting(s);
                      }}
                      ServiceIcon={ServiceIcon}
                    />
                  ))}
                </div>
                <div className="table-scroll subscription-desktop-table">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          {trials ? "Trial ends" : "Next payment"}
                        </TableHead>
                        <TableHead>
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((s) => (
                        <motion.tr
                          layout="position"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.18 }}
                          key={s.id}
                        >
                          <TableCell>
                            <div className="service-cell">
                              <ServiceIcon name={s.service_name} />
                              <div>
                                <strong>{s.service_name}</strong>
                                <small>{s.category}</small>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <strong>{money(s.price)}</strong>
                            <small>
                              per{" "}
                              {s.billing_cycle === "yearly" ? "year" : "month"}
                            </small>
                          </TableCell>
                          <TableCell>
                            <Badge status={s.status} />
                          </TableCell>
                          <TableCell>
                            <Deadline
                              date={
                                s.status === "trial"
                                  ? s.trial_end_date
                                  : s.next_billing_date
                              }
                              status={s.status}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="row-actions">
                              <a
                                className="icon-button"
                                href={
                                  "/api/subscriptions/" + s.id + "/calendar"
                                }
                                aria-label={`Export calendar for ${s.service_name}`}
                                title="Export calendar"
                              >
                                <Download size={17} />
                              </a>
                              {s.provider_url && (
                                <a
                                  className="icon-button"
                                  href={s.provider_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open provider for ${s.service_name}`}
                                  title="Open provider"
                                >
                                  <ExternalLink size={17} />
                                </a>
                              )}
                              <button
                                className="icon-button"
                                aria-label={`Edit ${s.service_name}`}
                                onClick={() => setEdit(s)}
                              >
                                <Pencil size={17} />
                              </button>
                              <button
                                className="icon-button danger"
                                aria-label={`Delete ${s.service_name}`}
                                onClick={() => {
                                  setMutationError(null);
                                  setDeleting(s);
                                }}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="pagination">
                  <span>
                    {data.total} plan{data.total === 1 ? "" : "s"} · Page {page}{" "}
                    of {Math.max(1, Math.ceil(data.total / 10))}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label="Previous page"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Next page"
                      disabled={page * 10 >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Empty
                title={
                  search ||
                  category !== "all" ||
                  effectiveStatus === "cancelled"
                    ? "No matching plans"
                    : "A little clarity starts here"
                }
                text="Add a plan, or adjust your filters to find what you’re looking for."
                action={
                  <button className="primary" onClick={() => setEdit({})}>
                    <Plus size={17} /> Add a plan
                  </button>
                }
              />
            )}
          </div>
        </section>
      )}
      <p className="fineprint bottom-note">
        <ShieldCheck size={16} /> Marking a plan cancelled only updates
        TrialGuard. You must cancel directly with your provider.
      </p>
      {edit && (
        <SubscriptionModal
          subscription={edit.id ? edit : null}
          defaultTrial={trials}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            setSuccess("Your tracker is up to date.");
            setRevision((v) => v + 1);
            reload();
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Remove this subscription?"
          onClose={() => !busy && setDeleting(null)}
        >
          <p>
            Remove <strong>{deleting.service_name}</strong> and its reminder
            delivery records from your tracker? This cannot be undone. This does
            not cancel your plan with the provider.
          </p>
          <ErrorBox error={mutationError} />
          <div className="modal-actions">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Keep it
            </button>
            <button className="destructive" disabled={busy} onClick={remove}>
              {busy ? "Removing…" : "Remove subscription"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Modal({ title, children, onClose }) {
  const origin = useRef(document.activeElement);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="confirmation-dialog"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          origin.current?.focus();
        }}
      >
        <div className="modal-heading">
          <DialogTitle>{title}</DialogTitle>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <DialogDescription className="sr-only">
          Review this action before continuing.
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
function SubscriptionModal(props) {
  return (
    <SubscriptionEditor
      {...props}
      useLoad={useLoad}
      Modal={Modal}
      ErrorBox={ErrorBox}
    />
  );
}
function Insights() {
  const { data, error, loading } = useLoad("/insights");
  const [selected, setSelected] = useState([]),
    [savings, setSavings] = useState(null),
    [ai, setAi] = useState(""),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(null);
  useEffect(() => {
    let live = true;
    api("/insights/savings", { method: "POST", body: { ids: selected } })
      .then((d) => {
        if (live) setSavings(d);
      })
      .catch((e) => {
        if (live) setActionError(e);
      });
    return () => {
      live = false;
    };
  }, [selected]);
  async function askAI() {
    setBusy(true);
    setActionError(null);
    try {
      setAi((await api("/insights/ai", { method: "POST" })).text);
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="THOUGHTFUL CHECKS, BETTER CHOICES"
        title="A fresh perspective."
        description="Useful patterns from your plans. You decide what’s worth keeping."
      />
      <div className="notice">
        <Sparkles size={20} />
        <p>
          <strong>Rule-based insights.</strong> These checks use your records
          and manually entered usage dates. They do not scan your email or track
          app activity.
        </p>
      </div>
      <ErrorBox error={error || actionError} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <>
            <div className="insight-list">
              {data.items.length ? (
                data.items.map((item, i) => (
                  <InsightCard key={i} finding={item} />
                ))
              ) : (
                <section className="card">
                  <Empty
                    title="No flags right now"
                    text="Keep last-used dates up to date to make these insights more useful."
                  />
                </section>
              )}
            </div>
            <div className="dashboard-grid insight-bottom">
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>What could you save?</h2>
                    <p>
                      Select active plans to explore a smaller monthly bill.
                    </p>
                  </div>
                  <Wallet size={22} />
                </div>
                {data.plans.length ? (
                  data.plans.map((p) => (
                    <label className="savings-plan" key={p.id}>
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() =>
                          setSelected((v) =>
                            v.includes(p.id)
                              ? v.filter((id) => id !== p.id)
                              : [...v, p.id],
                          )
                        }
                      />
                      <span>{p.service_name}</span>
                      <strong>{money(p.monthly)}/mo</strong>
                    </label>
                  ))
                ) : (
                  <p>No active paid plans to compare yet.</p>
                )}
                <div className="savings-total">
                  <small>Potential savings</small>
                  <strong>
                    {money(savings?.monthly)}
                    <span> / month</span>
                  </strong>
                  <p>{money(savings?.annual)} per year</p>
                </div>
                <p className="fineprint">
                  This is a calculation only. Selecting a plan does not cancel
                  it.
                </p>
              </section>
              <section className="card ai-card">
                <Sparkles size={26} />
                <h2>A second look, with AI</h2>
                <p>
                  {data.aiAvailable
                    ? "Generate a summary using your plan names, prices, categories and manual usage dates. These details are sent to the configured AI provider when you click below."
                    : "AI assistant unavailable. Add a backend API key to enable summaries. Your rule-based insights already work without it."}
                </p>
                <button
                  className="primary"
                  disabled={!data.aiAvailable || busy}
                  onClick={askAI}
                >
                  {busy ? "Preparing summary…" : "Summarize my spending"}
                </button>
                {ai && <div className="ai-result">{ai}</div>}
              </section>
            </div>
          </>
        )
      )}
    </>
  );
}
function Notifications({ onRead }) {
  const { data, error, loading, reload } = useLoad("/notifications");
  const [actionError, setActionError] = useState(null),
    [busy, setBusy] = useState(false);
  async function mark(path) {
    setBusy(true);
    try {
      await api(path, { method: "POST" });
      reload();
      onRead();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="A TIMELY LITTLE NUDGE"
        title="You’re in the loop."
        description={`${data?.unread || 0} unread reminders · Your most recent 200 notifications`}
        action={
          <button
            className="secondary"
            disabled={busy || !data?.unread}
            onClick={() => mark("/notifications/read-all")}
          >
            <Check size={17} /> Mark all as read
          </button>
        }
      />
      <ErrorBox error={error || actionError} />
      <section className="card">
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          data.items.map((n) => (
            <motion.article
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              key={n.id}
              className={"notification " + (!n.read_at ? "unread" : "")}
            >
              <span className="notification-icon">
                <Bell size={21} />
              </span>
              <div className="grow">
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                {n.subscription_status && (
                  <Deadline
                    status={n.subscription_status}
                    date={
                      n.subscription_status === "trial"
                        ? n.trial_end_date
                        : n.next_billing_date
                    }
                  />
                )}
                <small>
                  {n.created_at.slice(0, 10)} · {n.read_at ? "Read" : "Unread"}
                </small>
              </div>
              {!n.read_at && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => mark("/notifications/" + n.id + "/read")}
                >
                  Mark read
                </button>
              )}
            </motion.article>
          ))
        ) : (
          <Empty
            title="All quiet for now"
            text="Trial reminders will appear here 3 days and 1 day before a deadline when the scheduled job runs."
          />
        )}
      </section>
    </>
  );
}
function SettingsPage() {
  const { user } = useContext(Auth);
  const { data, error, loading, reload } = useLoad("/settings");
  const [success, setSuccess] = useState(false),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(null);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setSaveError(null);
    try {
      await api("/settings/budget", {
        method: "PUT",
        body: { amount: new FormData(e.currentTarget).get("amount") },
      });
      setSuccess(true);
      reload();
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Your preferences."
        description="Simple settings for a little more control."
      />
      <ErrorBox error={error || saveError} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <div className="settings-grid">
            <section className="card">
              <h2>Monthly budget</h2>
              <p>Set a comfortable limit for active paid subscriptions.</p>
              <form onSubmit={save}>
                <label>
                  Budget in INR
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    max="9999999999.99"
                    required
                    defaultValue={data.monthlyBudget}
                  />
                </label>
                <button className="primary" disabled={saving}>
                  {saving ? "Saving…" : "Save budget"}
                </button>
                {success && (
                  <p role="status" className="positive">
                    Budget saved.
                  </p>
                )}
              </form>
            </section>
            <section className="card">
              <h2>Your account</h2>
              <ThemeChoice />
              <dl>
                <dt>Name</dt>
                <dd>{user.name}</dd>
                <dt>Email</dt>
                <dd>{user.email}</dd>
                <dt>Reminder timezone</dt>
                <dd>{data.timezone}</dd>
              </dl>
              <p className="fineprint">
                Billing dates are stored as calendar dates without timezone
                conversion.
              </p>
            </section>
            <section className="card full">
              <h2>Connections & reminders</h2>
              <div className="connection-row">
                <div>
                  <strong>In-app trial reminders</strong>
                  <p>
                    3 days and 1 day before a trial ends, delivered by the
                    scheduled backend job.
                  </p>
                </div>
                <span className="badge active">Enabled</span>
              </div>
              <div className="connection-row">
                <div>
                  <strong>Email reminders</strong>
                  <p>
                    {data.emailAvailable
                      ? "SMTP is configured on the server. Delivery depends on your mail provider."
                      : "Email delivery unavailable. Configure SMTP environment variables on the backend. In-app reminders still work."}
                  </p>
                </div>
                <span className="badge">
                  {data.emailAvailable ? "Configured" : "Not configured"}
                </span>
              </div>
              <div className="connection-row">
                <div>
                  <strong>AI spending summaries</strong>
                  <p>
                    {data.aiAvailable
                      ? "Backend API key configured. Summaries run only when requested."
                      : "Optional. Configure OPENAI_API_KEY on the server to enable summaries."}
                  </p>
                </div>
                <span className="badge">
                  {data.aiAvailable ? "Configured" : "Unavailable"}
                </span>
              </div>
              <div className="connection-row">
                <div>
                  <strong>Email scanning & bank access</strong>
                  <p>
                    Not connected. All subscription details and usage dates are
                    entered manually.
                  </p>
                </div>
                <span className="badge">Manual entry</span>
              </div>
            </section>
          </div>
        )
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={250}>
      <DesignProvider>
        <App />
      </DesignProvider>
    </TooltipProvider>
  </React.StrictMode>,
);
