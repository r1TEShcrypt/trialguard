import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function errorHandler(error, req, res, next) {
  if (error instanceof ZodError)
    return res.status(400).json({
      error: {
        message: "Please correct the highlighted values.",
        fields: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
    });
  if (error.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: { message: "That record already exists." } });
  if (error.code === "ER_NO_REFERENCED_ROW_2")
    return res
      .status(400)
      .json({ error: { message: "Choose an existing category." } });
  if (
    [
      "ECONNREFUSED",
      "ER_ACCESS_DENIED_ERROR",
      "ER_BAD_DB_ERROR",
      "ETIMEDOUT",
      "ER_NO_SUCH_TABLE",
    ].includes(error.code)
  )
    return res.status(503).json({
      error: {
        message:
          "Database unavailable. Check MySQL configuration and run the migrations.",
      },
    });
  if (!error.status) console.error(error.code || error.name, error.message);
  res.status(error.status || 500).json({
    error: {
      message: error.status
        ? error.message
        : "Something went wrong. Please try again.",
    },
  });
}
