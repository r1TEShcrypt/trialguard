import crypto from "node:crypto";
import { query } from "../db.js";
import { config } from "../config.js";
import { HttpError } from "./errors.js";
export const cookieName =
  config.env === "production" ? "__Host-trialguard" : "trialguard";
export const cookieOptions = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: "lax",
  path: "/",
};
export const hash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");
export async function newSession(userId, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const csrf = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))",
    [hash(token), userId, csrf],
  );
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: 7 * 86400000 });
  return csrf;
}
export async function authenticate(req, res, next) {
  const token = req.cookies[cookieName];
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Please sign in to continue.");
  const rows = await query(
    "SELECT u.id,u.name,u.email,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()",
    [hash(token)],
  );
  if (!rows.length)
    throw new HttpError(401, "Your session has expired. Please sign in.");
  req.user = rows[0];
  next();
}
export function originGuard(req, res, next) {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.get("Origin") !== config.origin
  )
    throw new HttpError(403, "Request origin is not allowed.");
  next();
}
export function csrfGuard(req, res, next) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const token = req.get("X-CSRF-Token") || "";
    if (
      !/^[a-f0-9]{64}$/.test(token) ||
      !crypto.timingSafeEqual(
        Buffer.from(token),
        Buffer.from(req.user.csrf_token),
      )
    )
      throw new HttpError(
        403,
        "Security token expired. Reload the page and try again.",
      );
  }
  next();
}
