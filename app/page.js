"use client";
import { useState } from "react";
import defaultGrammar from "../lib/grammar.json";
import { buildLexerFromGrammar } from "../lib/lexer";
import { parseWithSemantics } from "../lib/parser";
import { checkLR1Grammar } from "../lib/lr1checker";
import "../styles.css";

export default function Home() {
  const [grammarText, setGrammarText] = useState(
    JSON.stringify(defaultGrammar, null, 2)
  );
  const [savedGrammar, setSavedGrammar] = useState(grammarText);
  const [codeText, setCodeText] = useState("");
  const [status, setStatus] = useState("");
  const [grammarStatus, setGrammarStatus] = useState("");
  const [errors, setErrors] = useState([]);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });

  const onCursorChange = (e) => {
    const pos = e.target.selectionStart;
    const lines = e.target.value.substr(0, pos).split("\n");
    setCursorInfo({
      line: lines.length,
      col: lines[lines.length - 1].length + 1
    });
  };

  const onCheck = () => {
    setStatus("");
    setErrors([]);

    // Сначала проверяем грамматику
    let grammar;
    try {
      grammar = JSON.parse(grammarText);
    } catch (e) {
      setGrammarStatus("❌ Ошибка парсинга grammar.json: " + e.message);
      return;
    }

    // Проверяем, является ли грамматика LR(1)
    const lr1Check = checkLR1Grammar(grammar);
    setGrammarStatus(
      lr1Check.isLR1
        ? "✅ Грамматика LR(1)"
        : `❌ Грамматика не LR(1): ${lr1Check.message}`
    );

    if (!lr1Check.isLR1) {
      return;
    }

    // Если грамматика была изменена, требуем сохранения
    if (grammarText !== savedGrammar) {
      setStatus("❌ Сначала сохраните грамматику");
      return;
    }
    setGrammarStatus(
      lr1Check.isLR1
        ? "✅ Грамматика LR(1)"
        : `❌ Грамматика не LR(1): ${lr1Check.message}`
    );

    // Лексический анализ
    let lexer, tokens;
    try {
      lexer = buildLexerFromGrammar(grammar);
      tokens = lexer(codeText);
    } catch (e) {
      setStatus(
        `❌ Лексическая ошибка: ${e.message} (строка ${e.line}, позиция ${e.col})`
      );
      return;
    }

    // Синтаксический и семантический анализ
    const result = parseWithSemantics(tokens, grammar);
    if (result.ok) {
      setStatus("✅ Описание корректное");
    } else {
      // Сортируем ошибки по положению в тексте
      const sortedErrors = result.errors.sort(
        (a, b) => a.line - b.line || a.col - b.col
      );
      const firstErr = sortedErrors[0];

      setErrors(sortedErrors);
      console.log(firstErr);
      setStatus(
        `❌ ${
          firstErr.type === "semantic" ? "Семантическая ошибка:" : firstErr.type
        } ${firstErr.message} (строка ${firstErr.line}, позиция ${
          firstErr.col
        })`
      );
    }
  };

  const onSaveGrammar = () => {
    setSavedGrammar(grammarText);
    setStatus("✅ Грамматика сохранена");
  };

  const onResetGrammar = () => {
    setGrammarText(JSON.stringify(defaultGrammar, null, 2));
    setSavedGrammar(JSON.stringify(defaultGrammar, null, 2));
    setStatus("✅ Грамматика сброшена к исходной");
  };

  function handleDownloadGrammar() {
    if (!grammarText || grammarText.trim().length === 0) {
      alert("Грамматика пуста, сначала отредактируйте или вставьте JSON.");
      return;
    }

    const blob = new Blob([grammarText], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "grammar.json"; // имя файла
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="container">
      <h1>Синтаксический анализ процедур/функций Pascal</h1>

      <div className="editor-row">
        <div className="editor-column">
          <h2>Исходный код</h2>
          <textarea
            style={{ resize: "both", overflow: "auto" }}
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
            onClick={onCursorChange}
            onKeyUp={onCursorChange}
            placeholder="Пример:&#10;procedure Test(a: integer);&#10;begin&#10;  procedure Nested(b: real);&#10;  begin&#10;  end;&#10;end;"
          />
          <div>
            <small>
              Позиция курсора: строка {cursorInfo.line}, позиция{" "}
              {cursorInfo.col}
            </small>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={onCheck}>Проверить</button>
          </div>
        </div>

        <div className="editor-column">
          <h2>Грамматика (grammar.json)</h2>
          <textarea
            value={grammarText}
            onChange={(e) => setGrammarText(e.target.value)}
            style={{
              fontFamily: "monospace",
              height: 400,
              resize: "both",
              overflow: "auto"
            }}
          />
          <div style={{ marginTop: 8 }}>
            <button onClick={onSaveGrammar}>Сохранить грамматику</button>
            <button onClick={onResetGrammar} style={{ marginLeft: 4 }}>
              Сбросить до grammar.json
            </button>
            <button
              onClick={handleDownloadGrammar}
              style={{ marginLeft: 4 }}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Скачать результат
            </button>
          </div>
        </div>
      </div>
      {grammarStatus && (
        <div
          className={`status ${
            grammarStatus.startsWith("✅") ? "success" : "error"
          }`}
          style={{ marginTop: 8 }}
        >
          <div>{grammarStatus}</div>
        </div>
      )}
      {status && (
        <div
          className={`status ${status.startsWith("✅") ? "success" : "error"}`}
          style={{ marginTop: 8 }}
        >
          {console.log(errors)}
          {status}
        </div>
      )}
    </main>
  );
}
