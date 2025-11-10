// Лексический анализатор для синтаксиса Pascal
export function lexer(input) {
  const tokens = [];
  let i = 0;
  const len = input.length;
  const isLetter = (ch) => /[a-zA-Z_]/.test(ch);
  const isDigit = (ch) => /[0-9]/.test(ch);
  const skipWhitespace = () => {
    while (i < len && /\s/.test(input[i])) i++;
  };
  while (i < len) {
    skipWhitespace();
    if (i >= len) break;
    const ch = input[i];
    if (ch === ":" || ch === ";" || ch === "," || ch === "[" || ch === "]") {
      tokens.push({ type: "punct", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "." && input.slice(i, i + 2) === "..") {
      tokens.push({ type: "dots", value: "..", pos: i });
      i += 2;
      continue;
    }
    if (isDigit(ch)) {
      let start = i;
      while (i < len && isDigit(input[i])) i++;
      tokens.push({ type: "number", value: input.slice(start, i), pos: start });
      continue;
    }
    if (isLetter(ch)) {
      let start = i;
      while (i < len && /[a-zA-Z0-9_]/.test(input[i])) i++;
      const word = input.slice(start, i);
      const lw = word.toLowerCase();
      if (
        [
          "var",
          "array",
          "of",
          "integer",
          "real",
          "char",
          "boolean",
          "string"
        ].includes(lw)
      ) {
        tokens.push({ type: "keyword", value: lw, pos: start });
      } else {
        tokens.push({ type: "ident", value: word, pos: start });
      }
      continue;
    }
    throw new Error("Invalid character at position " + i + ": '" + ch + "'");
  }
  let lineStarts = [0];
  for (let idx = 0; idx < input.length; idx++)
    if (input[idx] === "\n") lineStarts.push(idx + 1);
  tokens.forEach((t) => {
    let line = 0;
    while (line + 1 < lineStarts.length && lineStarts[line + 1] <= t.pos)
      line++;
    t.line = line + 1;
    t.col = t.pos - lineStarts[line] + 1;
  });
  return tokens;
}
