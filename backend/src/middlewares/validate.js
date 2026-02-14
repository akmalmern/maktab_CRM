const { ApiError } = require("../utils/apiError");

function buildFieldErrors(parsedError) {
  const fields = {};
  for (const issue of parsedError.issues) {
    const path = issue.path.join(".") || "root";
    if (!fields[path]) fields[path] = [];
    fields[path].push(issue.message);
  }
  return fields;
}

function parseSegment(schema, data, segmentName) {
  if (!schema) return { ok: true, data };

  const parsed = schema.safeParse(data);
  if (parsed.success) return { ok: true, data: parsed.data };

  return {
    ok: false,
    error: new ApiError(400, "VALIDATION_ERROR", "Ma'lumotlar noto'g'ri", {
      segment: segmentName,
      fields: buildFieldErrors(parsed.error),
    }),
  };
}

function validate({ body, params, query } = {}) {
  return (req, _res, next) => {
    const bodyRes = parseSegment(body, req.body, "body");
    if (!bodyRes.ok) return next(bodyRes.error);
    req.body = bodyRes.data;

    const paramsRes = parseSegment(params, req.params, "params");
    if (!paramsRes.ok) return next(paramsRes.error);
    req.params = paramsRes.data;

    const queryRes = parseSegment(query, req.query, "query");
    if (!queryRes.ok) return next(queryRes.error);
    req.query = queryRes.data;

    return next();
  };
}

function validateBody(schema) {
  return validate({ body: schema });
}

module.exports = { validate, validateBody };
