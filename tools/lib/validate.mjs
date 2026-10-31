// Kiểm tra JSON Schema tối giản (không phụ thuộc thư viện). Hỗ trợ tập con đủ dùng cho kịch bản:
// type, enum, const, required, properties, additionalProperties, items, minItems, maxItems,
// minimum, maximum, minLength, maxLength, pattern, oneOf, $ref (#/$defs/…).
export function validate(schema, data) {
  const errors = [];
  const root = schema;

  function resolve(s) {
    while (s && s.$ref) {
      const path = s.$ref.replace(/^#\//, "").split("/");
      s = path.reduce((acc, k) => acc[k], root);
    }
    return s;
  }

  function typeOf(v) {
    if (Array.isArray(v)) return "array";
    if (v === null) return "null";
    if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
    return typeof v;
  }

  function check(s, v, at) {
    s = resolve(s);
    const before = errors.length;
    if (s.oneOf) {
      const ok = s.oneOf.filter((sub) => {
        const saved = errors.length;
        check(sub, v, at);
        const pass = errors.length === saved;
        errors.length = saved;
        return pass;
      });
      if (ok.length !== 1) errors.push(`${at}: phải khớp đúng một dạng trong oneOf`);
      return;
    }
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      const t = typeOf(v);
      const ok = types.some((x) => x === t || (x === "number" && t === "integer"));
      if (!ok) {
        errors.push(`${at}: cần kiểu ${types.join("|")}, nhận ${t}`);
        return;
      }
    }
    if (s.const !== undefined && v !== s.const) errors.push(`${at}: phải bằng ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.includes(v))
      errors.push(`${at}: "${v}" không hợp lệ, chọn một trong: ${s.enum.join(", ")}`);
    if (typeof v === "number") {
      if (s.minimum !== undefined && v < s.minimum) errors.push(`${at}: ${v} < tối thiểu ${s.minimum}`);
      if (s.maximum !== undefined && v > s.maximum) errors.push(`${at}: ${v} > tối đa ${s.maximum}`);
    }
    if (typeof v === "string") {
      if (s.minLength !== undefined && v.length < s.minLength) errors.push(`${at}: quá ngắn (< ${s.minLength} ký tự)`);
      if (s.maxLength !== undefined && v.length > s.maxLength)
        errors.push(`${at}: quá dài (${v.length} > ${s.maxLength} ký tự)`);
      if (s.pattern && !new RegExp(s.pattern).test(v)) errors.push(`${at}: không khớp mẫu ${s.pattern}`);
    }
    if (Array.isArray(v)) {
      if (s.minItems !== undefined && v.length < s.minItems) errors.push(`${at}: cần ít nhất ${s.minItems} phần tử`);
      if (s.maxItems !== undefined && v.length > s.maxItems) errors.push(`${at}: tối đa ${s.maxItems} phần tử`);
      if (s.items) v.forEach((x, i) => check(s.items, x, `${at}[${i}]`));
    }
    if (typeOf(v) === "object") {
      (s.required || []).forEach((k) => {
        if (!(k in v)) errors.push(`${at}: thiếu trường bắt buộc "${k}"`);
      });
      const props = s.properties || {};
      Object.entries(v).forEach(([k, x]) => {
        if (props[k]) check(props[k], x, `${at}.${k}`);
        else if (s.additionalProperties === false) errors.push(`${at}: trường lạ "${k}"`);
      });
    }
    return errors.length === before;
  }

  check(schema, data, "$");
  return errors;
}
