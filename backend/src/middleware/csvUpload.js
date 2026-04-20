import multer from "multer";

const MAX_CSV_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain"
]);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CSV_FILE_SIZE_BYTES,
    files: 1
  },
  fileFilter: (_req, file, callback) => {
    const looksLikeCsvName = String(file.originalname || "").toLowerCase().endsWith(".csv");
    const hasAllowedMime = ALLOWED_MIME_TYPES.has(String(file.mimetype || "").toLowerCase());

    if (!looksLikeCsvName && !hasAllowedMime) {
      callback(createHttpError(400, "Only CSV uploads are allowed."));
      return;
    }

    callback(null, true);
  }
});

function handleCsvUploadError(error, _req, _res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      next(createHttpError(413, `CSV file is too large. Max size is ${MAX_CSV_FILE_SIZE_BYTES} bytes.`));
      return;
    }

    next(createHttpError(400, error.message));
    return;
  }

  next(error);
}

export { csvUpload, handleCsvUploadError, MAX_CSV_FILE_SIZE_BYTES };
