export function buildLexerFromGrammar(grammar) {
  const terminalPatterns = {
    procedure: /\bprocedure\b/,
    function: /\bfunction\b/,
    forward: /\bforward\b/,
    begin: /\bbegin\b/,
    end: /\bend\b/,
    number: /\b\d+\b/,
    integer: /\binteger\b/,
    real: /\breal\b/,
    char: /\bchar\b/,
    boolean: /\bboolean\b/,
    string: /\bstring\b/,
    ":": /:/,
    ";": /;/,
    "(": /\(/,
    ")": /\)/,
    ",": /,/,
    "[": /\[/,
    "]": /\]/,
    "..": /\.\./,
    of: /\bof\b/,
    letter: /[a-zA-Z]/,
    digit: /\d/
  };

  const terminals = grammar.terminals;

  return function lexer(input) {
    const tokens = [];
    let pos = 0;
    while (pos < input.length) {
      if (/\s/.test(input[pos])) {
        pos++;
        continue;
      }

      let matched = false;
      for (const t of terminals) {
        const regex = terminalPatterns[t];
        if (!regex) continue;
        const m = input.slice(pos).match(regex);
        if (m && m.index === 0) {
          tokens.push({ type: t, value: m[0], pos });
          pos += m[0].length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new Error(`Неизвестный токен на позиции ${pos}: "${input[pos]}"`);
      }
    }
    return tokens;
  };
}
