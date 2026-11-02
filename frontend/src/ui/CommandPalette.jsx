import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command as CommandIcon,
  Plus,
  LayoutDashboard,
  Layers,
  Hourglass,
  Sparkles,
  Bell,
  Settings,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { api, money } from "../api";
const routes = [
  ["/", "Overview", LayoutDashboard],
  ["/subscriptions", "Subscriptions", Layers],
  ["/trials", "Free trials", Hourglass],
  ["/insights", "Smart insights", Sparkles],
  ["/notifications", "Notifications", Bell],
  ["/settings", "Settings", Settings],
];
export default function CommandPalette({ onAdd, onEdit }) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    navigate = useNavigate(),
    launcher = useRef(null),
    pending = useRef(null);
  useEffect(() => {
    const key = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !e.target.closest(
          'input,textarea,select,[contenteditable="true"],[role="textbox"]',
        )
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    setError("");
    api("/subscriptions?limit=8&search=" + encodeURIComponent(search))
      .then((d) => {
        if (live) setItems(d.items);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [search, open]);
  function run(fn) {
    pending.current = fn;
    setOpen(false);
    setSearch("");
  }
  return (
    <>
      <button
        ref={launcher}
        className="command-launch"
        aria-label="Open command palette"
        aria-keyshortcuts="Control+k Meta+k"
        onClick={() => setOpen(true)}
      >
        <CommandIcon size={16} />
        <span>Quick actions</span>
        <kbd>⌘ / Ctrl K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            launcher.current?.focus();
            const action = pending.current;
            pending.current = null;
            if (action) queueMicrotask(action);
          }}
          className="command-dialog"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <DialogDescription className="sr-only">
            Find subscriptions, navigate your workspace, or add a plan.
          </DialogDescription>
          <Command
            label="Search commands and subscriptions"
            shouldFilter={false}
          >
            <CommandInput
              maxLength={100}
              aria-label="Search commands and subscriptions"
              placeholder="Find a plan or a place to go…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandGroup heading="Actions">
                <CommandItem value="add-new-plan" onSelect={() => run(onAdd)}>
                  <Plus size={17} />
                  Add a subscription
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navigate">
                {routes
                  .filter(([, label]) =>
                    label.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map(([path, label, Icon]) => (
                    <CommandItem
                      value={"nav" + path}
                      key={path}
                      onSelect={() => run(() => navigate(path))}
                    >
                      <Icon size={17} />
                      {label}
                    </CommandItem>
                  ))}
              </CommandGroup>
              <div aria-hidden="true" className="command-divider" />
              <CommandGroup heading="Your subscriptions">
                {loading ? (
                  <p role="status" className="command-status">
                    Searching your workspace…
                  </p>
                ) : error ? (
                  <p role="alert" className="command-status">
                    {error}
                  </p>
                ) : items.length ? (
                  items.map((s) => (
                    <CommandItem
                      value={"subscription" + s.id}
                      key={s.id}
                      onSelect={() => run(() => onEdit(s))}
                    >
                      <Layers size={17} />
                      <span>
                        {s.service_name}
                        <small>{s.category}</small>
                      </span>
                      <span className="command-price">{money(s.price)}</span>
                    </CommandItem>
                  ))
                ) : (
                  <p className="command-status">No matching subscriptions.</p>
                )}
              </CommandGroup>
            </CommandList>
            <div className="command-footer">
              <span>↑ ↓ to move · Enter to open</span>
              <span>Esc to close</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

