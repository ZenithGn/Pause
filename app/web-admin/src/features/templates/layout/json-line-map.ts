import { layoutConfigSchema, type ValidatedLayoutConfig } from "../schemas";

export interface JsonValidationLineError {
  line: number | null;
  path: string;
  message: string;
}

export type JsonLayoutValidationResult =
  | { valid: true; data: ValidatedLayoutConfig }
  | { valid: false; errors: JsonValidationLineError[] };

/**
 * Extracts a 1-based line number from JSON.parse SyntaxError messages when available.
 */
export function parseJsonSyntaxErrorLine(rawJson: string, error: unknown): number | null {
  if (!(error instanceof SyntaxError)) return null;
  const msg = error.message;

  const lineMatch = /line\s+(\d+)/i.exec(msg);
  if (lineMatch) {
    return Number.parseInt(lineMatch[1], 10);
  }

  const posMatch = /position\s+(\d+)/i.exec(msg);
  if (posMatch) {
    const pos = Number.parseInt(posMatch[1], 10);
    if (Number.isFinite(pos) && pos >= 0) {
      const slice = rawJson.slice(0, Math.min(pos, rawJson.length));
      return slice.split(/\r?\n/).length;
    }
  }

  return 1;
}

interface JsonCursor {
  pos: number;
  line: number;
}

function skipWhitespace(src: string, cursor: JsonCursor): void {
  while (cursor.pos < src.length) {
    const ch = src[cursor.pos];
    if (ch === "\n") {
      cursor.line += 1;
      cursor.pos += 1;
    } else if (ch === " " || ch === "\t" || ch === "\r") {
      cursor.pos += 1;
    } else {
      break;
    }
  }
}

function readStringLiteral(src: string, cursor: JsonCursor): string {
  // Assumes src[cursor.pos] === '"'
  cursor.pos += 1;
  let out = "";
  while (cursor.pos < src.length) {
    const ch = src[cursor.pos];
    if (ch === "\\") {
      cursor.pos += 1;
      if (cursor.pos < src.length) {
        const esc = src[cursor.pos];
        if (esc === "\n") cursor.line += 1;
        out += esc;
        cursor.pos += 1;
      }
      continue;
    }
    if (ch === '"') {
      cursor.pos += 1;
      return out;
    }
    if (ch === "\n") cursor.line += 1;
    out += ch;
    cursor.pos += 1;
  }
  return out;
}

function indexJsonPathLines(rawJson: string): Map<string, number> {
  const lineMap = new Map<string, number>();
  const cursor: JsonCursor = { pos: 0, line: 1 };

  function walk(path: string): void {
    skipWhitespace(rawJson, cursor);
    if (cursor.pos >= rawJson.length) return;

    lineMap.set(path, cursor.line);
    const ch = rawJson[cursor.pos];

    if (ch === "{") {
      cursor.pos += 1;
      skipWhitespace(rawJson, cursor);
      if (rawJson[cursor.pos] === "}") {
        cursor.pos += 1;
        return;
      }

      while (cursor.pos < rawJson.length) {
        skipWhitespace(rawJson, cursor);
        if (rawJson[cursor.pos] !== '"') break;
        const keyLine = cursor.line;
        const key = readStringLiteral(rawJson, cursor);
        const childPath = path ? `${path}.${key}` : key;
        lineMap.set(childPath, keyLine);

        skipWhitespace(rawJson, cursor);
        if (rawJson[cursor.pos] === ":") {
          cursor.pos += 1;
        }
        walk(childPath);

        skipWhitespace(rawJson, cursor);
        if (rawJson[cursor.pos] === ",") {
          cursor.pos += 1;
          continue;
        }
        if (rawJson[cursor.pos] === "}") {
          cursor.pos += 1;
          break;
        }
        break;
      }
      return;
    }

    if (ch === "[") {
      cursor.pos += 1;
      skipWhitespace(rawJson, cursor);
      if (rawJson[cursor.pos] === "]") {
        cursor.pos += 1;
        return;
      }

      let index = 0;
      while (cursor.pos < rawJson.length) {
        skipWhitespace(rawJson, cursor);
        const itemPath = path ? `${path}.${index}` : `${index}`;
        walk(itemPath);
        index += 1;

        skipWhitespace(rawJson, cursor);
        if (rawJson[cursor.pos] === ",") {
          cursor.pos += 1;
          continue;
        }
        if (rawJson[cursor.pos] === "]") {
          cursor.pos += 1;
          break;
        }
        break;
      }
      return;
    }

    if (ch === '"') {
      readStringLiteral(rawJson, cursor);
      return;
    }

    // Primitive literal (number, true, false, null)
    while (cursor.pos < rawJson.length) {
      const c = rawJson[cursor.pos];
      if (c === "," || c === "}" || c === "]" || c === " " || c === "\t" || c === "\r" || c === "\n") {
        break;
      }
      cursor.pos += 1;
    }
  }

  walk("");
  return lineMap;
}

/**
 * Finds the 1-based line number of a Zod issue path inside formatted JSON text.
 */
export function findJsonPathLine(
  rawJson: string,
  path: readonly (string | number)[],
): number | null {
  if (!rawJson.trim()) return 1;
  const lineMap = indexJsonPathLines(rawJson);

  for (let len = path.length; len >= 0; len -= 1) {
    const key = path.slice(0, len).map(String).join(".");
    const line = lineMap.get(key);
    if (line !== undefined) {
      return line;
    }
  }

  return 1;
}

function formatIssuePath(path: readonly (string | number)[]): string {
  if (path.length === 0) return "layout_config";
  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    return acc ? `${acc}.${segment}` : segment;
  }, "");
}

/**
 * Parses and validates raw JSON for `layout_config`, attaching line numbers to every error.
 */
export function validateLayoutJsonWithLines(
  rawJson: string,
): JsonLayoutValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    const line = parseJsonSyntaxErrorLine(rawJson, err);
    return {
      valid: false,
      errors: [
        {
          line,
          path: "JSON",
          message: `Cú pháp JSON không hợp lệ: ${err instanceof Error ? err.message : "Lỗi phân tích cú pháp."}`,
        },
      ],
    };
  }

  const checked = layoutConfigSchema.safeParse(parsed);
  if (!checked.success) {
    return {
      valid: false,
      errors: checked.error.issues.map((issue) => ({
        line: findJsonPathLine(rawJson, issue.path),
        path: formatIssuePath(issue.path),
        message: issue.message,
      })),
    };
  }

  return {
    valid: true,
    data: checked.data,
  };
}
