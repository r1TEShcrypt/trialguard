import bcrypt from "bcrypt";
import { query, transaction } from "../db.js";
import { registerSchema, loginSchema } from "../validation.js";
import {
  newSession,
  cookieName,
  cookieOptions,
  hash,
} from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
const dummyHash = await bcrypt.hash("unmatchable-random-placeholder", 12);
export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const id = await transaction(async (c) => {
    const result = await query(
      "INSERT INTO users(name,email,password_hash) VALUES (?,?,?)",
      [data.name, data.email, passwordHash],
      c,
    );
    await query(
      "INSERT INTO budgets(user_id,monthly_amount) VALUES (?,0)",
      [result.insertId],
      c,
    );
    return result.insertId;
  });
  const csrfToken = await newSession(id, res);
  res
    .status(201)
    .json({ user: { id, name: data.name, email: data.email }, csrfToken });
}
export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const [user] = await query("SELECT * FROM users WHERE email=?", [data.email]);
  const valid = await bcrypt.compare(
    data.password,
    user?.password_hash || dummyHash,
  );
  if (!user || !valid)
    throw new HttpError(401, "Email or password is incorrect.");
  const csrfToken = await newSession(user.id, res);
  res.json({ user: publicUser(user), csrfToken });
}
export const me = (req, res) =>
  res.json({ user: publicUser(req.user), csrfToken: req.user.csrf_token });
export async function logout(req, res) {
  await query("DELETE FROM sessions WHERE token_hash=?", [
    hash(req.cookies[cookieName]),
  ]);
  res.clearCookie(cookieName, cookieOptions);
  res.json({ ok: true });
}
