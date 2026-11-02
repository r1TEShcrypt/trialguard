import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, ArrowUpRight } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { api } from "../api";
import { Deadline } from "./system";
export default function NotificationCenter({ data, reload }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function mark(id) {
    setBusy(true);
    setError("");
    try {
      await api(id ? `/notifications/${id}/read` : "/notifications/read-all", {
        method: "POST",
      });
      reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) reload();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="icon-button notification-link"
          aria-label={`Notifications, ${data?.unread || 0} unread`}
        >
          <Bell size={19} />
          {data?.unread > 0 && <i />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Notification center"
        align="end"
        className="notification-center"
      >
        <div className="notification-center-heading">
          <div>
            <h2>Notifications</h2>
            <p>{data?.unread || 0} unread · Your trial radar</p>
          </div>
          <button
            className="icon-button"
            disabled={busy || !data?.unread}
            aria-label="Mark all notifications as read"
            onClick={() => mark()}
          >
            <Check size={18} />
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="notification-center-list">
          {!data ? (
            <p role="status">Loading notifications…</p>
          ) : data.items.length ? (
            data.items.slice(0, 5).map((n) => (
              <article
                key={n.id}
                className={n.read_at ? "is-read" : "is-unread"}
              >
                <span className="notification-dot" />
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <time>{n.created_at.replace("T", " ").slice(0, 16)} UTC</time>
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
                  <span className="sr-only">
                    {n.read_at ? "Read" : "Unread"}
                  </span>
                  {!n.read_at && (
                    <button
                      disabled={busy}
                      className="text-action"
                      onClick={() => mark(n.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty">
              <Bell size={25} />
              <h3>All quiet for now</h3>
              <p>Your trial reminders will appear here.</p>
            </div>
          )}
        </div>
        <Link
          className="notification-center-footer"
          to="/notifications"
          onClick={() => setOpen(false)}
        >
          View all notifications
          <ArrowUpRight size={16} />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
