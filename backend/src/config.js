import dotenv from "dotenv";
dotenv.config({ path: process.env.ENV_FILE || ".env", quiet: true });
export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  origin: process.env.APP_ORIGIN || "http://127.0.0.1:5173",
  timezone: process.env.APP_TIMEZONE || "Asia/Kolkata",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "trialguard",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "trialguard",
    dateStrings: true,
    timezone: "Z",
    connectionLimit: 10,
    decimalNumbers: false,
    multipleStatements: false,
  },
  smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM),
  ai: Boolean(process.env.OPENAI_API_KEY),
};
if (config.env === "production" && !config.origin.startsWith("https://"))
  throw new Error("Production APP_ORIGIN must use HTTPS");
new Intl.DateTimeFormat("en", { timeZone: config.timezone });
