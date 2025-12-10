"use client";
import { useState } from "react";
import defaultGrammar from "../lib/grammar.json";
import { buildLexerFromGrammar } from "../lib/lexer";
import { checkLR1Grammar } from "../lib/lr1checker";
import { parseWithSemantics } from "../lib/parser";
import "../styles.css";

export default function Home() {
  const [grammarText, setGrammarText] = useState(
    JSON.stringify(defaultGrammar, null, 2)
  );
  const [codeText, setCodeText] = useState(`// Пример (input.txt)
procedure Proc1(a: integer; b: real);
begin
end;
`);
  const [status, setStatus] = useState("");
  const [lrInfo, setLrInfo] = useState("");
  const [errors, setErrors] = useState([]);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });

  // Вычисление физической строки и позиции
  const getLineColFromPos = (text, pos) => {
    const lines = text.split("\n");
    let accumulated = 0;
    for (let i = 0; i < lines.length; i++) {
      if (pos <= accumulated + lines[i].length) {
        return { line: i + 1, col: pos - accumulated + 1 };
      }
      accumulated += lines[i].length + 1;
    }
    return { line: lines.length, col: lines[lines.length - 1].length + 1 };
  };

  const onCheck = () => {
    setStatus("");
    setErrors([]);
    setLrInfo("");

    let grammar;
    try {
      grammar = JSON.parse(grammarText);
    } catch (e) {
      setStatus("❌ Ошибка парсинга grammar.json: " + e.message);
      return;
    }

    // Проверка LR(1)
    try {
      const lr = checkLR1Grammar(grammar);
      setLrInfo(lr.message || "");
      if (!lr.isLR1) {
        setStatus("❌ Грамматика НЕ является LR(1): " + lr.message);
        return;
      } else {
        setStatus("✅ Грамматика является LR(1). Дальше: лексер и разбор.");
      }
    } catch (e) {
      setStatus("❌ Ошибка при проверке LR(1): " + (e.message || String(e)));
      return;
    }

    // Построение лексера
    let lexer;
    try {
      lexer = buildLexerFromGrammar(grammar);
    } catch (e) {
      setStatus("❌ Ошибка при сборке лексера: " + (e.message || String(e)));
      return;
    }

    // Токенизация
    let tokens;
    const collectedErrors = [];
    try {
      tokens = lexer(codeText);
    } catch (e) {
      const posInfo = getLineColFromPos(codeText, e.pos || 0);
      collectedErrors.push({
        type: "lexical",
        message: e.message || "Лексическая ошибка",
        ...posInfo
      });
    }

    // Парсинг + семантика
    try {
      const result = parseWithSemantics(tokens || [], grammar);
      if (!result.ok) {
        const posInfo = getLineColFromPos(codeText, result.pos || 0);
        collectedErrors.push({
          type: result.type,
          message:
            result.type === "syntax"
              ? `❌ Синтаксическая ошибка`
              : `❌ Конфликт имён: '${result.name}'`,
          ...posInfo
        });
      }
    } catch (e) {
      collectedErrors.push({
        type: "parser",
        message: "❌ Внутренняя ошибка парсера: " + (e.message || String(e)),
        ...getLineColFromPos(codeText, 0)
      });
    }

    // Сортировка по позиции (строка, кол)
    collectedErrors.sort((a, b) =>
      a.line === b.line ? a.col - b.col : a.line - b.line
    );

    setErrors(collectedErrors.slice(0, 1)); // выводим только первую ошибку
  };

  const onInsertSampleInput = () => {
    setCodeText(`procedure Proc1(a: integer; b: real);
begin
  procedure Inner(p: integer);
  begin
  end;
end;

function Func1(x: integer; y: integer): real;
begin
end;

// Синтаксическая ошибка (пропущен ;)
var wrongVar integer;

// Конфликт аргументов
procedure Proc2(a: integer; a: real);
begin
end;

// Конфликт процедур на одном уровне
procedure Proc1;
begin
end;
`);
  };

  const onResetGrammar = () => {
    setGrammarText(JSON.stringify(defaultGrammar, null, 2));
  };

  const handleCursorPos = (e) => {
    const textarea = e.target;
    const pos = textarea.selectionStart;
    setCursorInfo(getLineColFromPos(textarea.value, pos));
  };

  return (
    <main className="container">
      <h1>Синтаксический анализ процедур/функций Pascal</h1>

      <div className="editor-row">
        <div className="editor-column">
          <h2>Исходный код (input.txt)</h2>
          <textarea
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
            onClick={handleCursorPos}
            onKeyUp={handleCursorPos}
            placeholder="Вставьте код Pascal для проверки..."
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={onInsertSampleInput}>
              Вставить пример input.txt
            </button>
            <div style={{ marginTop: 4, fontSize: "0.9em" }}>
              Позиция курсора: строка {cursorInfo.line}, позиция{" "}
              {cursorInfo.col}
            </div>
          </div>
        </div>

        <div className="editor-column">
          <h2>Грамматика (grammar.json)</h2>
          <textarea
            value={grammarText}
            onChange={(e) => setGrammarText(e.target.value)}
            style={{ fontFamily: "monospace", height: 420 }}
            aria-label="grammar JSON"
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={onResetGrammar} className="secondary">
              Сбросить grammar.json к образцу
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onCheck}>Проверить</button>
      </div>

      {lrInfo && (
        <div style={{ marginTop: 12 }}>
          <strong>LR-грамматика:</strong> {lrInfo}
        </div>
      )}

      {status && (
        <div
          className={`status ${status.startsWith("✅") ? "success" : "error"}`}
          role="status"
          aria-live="polite"
          style={{ marginTop: 4 }}
        >
          {status}
        </div>
      )}

      {errors.length > 0 && (
        <div className="error-list" aria-live="polite" style={{ marginTop: 8 }}>
          {errors.map((e, i) => (
            <div
              key={i}
              className="error-item"
              title={`Строка ${e.line}, позиция ${e.col}`}
            >
              {e.message} (строка {e.line}, позиция {e.col})
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
