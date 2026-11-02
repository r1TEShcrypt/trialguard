import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Search,
  ChevronDown,
  LogOut,
  Settings,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./system";
import { Hint } from "./premium";
import NotificationCenter from "./NotificationCenter";
import CommandPalette from "./CommandPalette";
export default function Topbar({ user, data, reload, logout, onAdd, onEdit }) {
  const { pathname } = useLocation(),
    navigate = useNavigate(),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const label =
    {
      "/": "Overview",
      "/subscriptions": "Subscriptions",
      "/trials": "Free trials",
      "/insights": "Smart insights",
      "/notifications": "Notifications",
      "/settings": "Settings",
    }[pathname] || "Workspace";
  useEffect(() => {
    const fn = () => setScrolled(scrollY > 12);
    fn();
    addEventListener("scroll", fn, { passive: true });
    const close = (e) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    addEventListener("keydown", close);
    return () => {
      removeEventListener("scroll", fn);
      removeEventListener("keydown", close);
    };
  }, []);
  return (
    <header className={`topbar command-topbar ${scrolled ? "scrolled" : ""}`}>
      <div className="breadcrumbs">
        <span>Workspace</span>
        <ChevronRight size={13} />
        <strong>{label}</strong>
      </div>
      <form
        className={`global-search ${searchOpen ? "search-open" : ""}`}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          navigate("/subscriptions?search=" + encodeURIComponent(search));
          setSearchOpen(false);
        }}
      >
        <Search size={16} />
        <input
          aria-label="Search all plans"
          placeholder="Find a subscription"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="icon-button" aria-label="Run subscription search">
          <ChevronRight size={16} />
        </button>
      </form>
      <button
        className="icon-button mobile-search-toggle"
        aria-label="Open plan search"
        aria-expanded={searchOpen}
        onClick={() => setSearchOpen((v) => !v)}
      >
        <Search size={18} />
      </button>
      <CommandPalette onAdd={onAdd} onEdit={onEdit} />
      <Hint label="Change appearance">
        <span>
          <ThemeToggle />
        </span>
      </Hint>
      <NotificationCenter data={data} reload={reload} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="account-trigger" aria-label="Account menu">
            <span className="avatar small">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <ChevronDown size={13} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="account-dropdown">
          <DropdownMenuLabel>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/settings">
              <Settings size={15} />
              Preferences
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/welcome">
              <ArrowUpRight size={15} />
              About TrialGuard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={logout}>
            <LogOut size={15} />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
