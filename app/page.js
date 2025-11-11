"use client";
import { useState } from "react";
import { lexer } from "../lib/lexer";
import { parse } from "../lib/parser";
import grammarJson from "../lib/grammar.json";
import { checkLR1Grammar } from "../lib/lr1checker";
import "../styles.css";

export default function Home() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [grammarStatus, setGrammarStatus] = useState("");
  const [errorLines, setErrorLines] = useState([]);

  const checkCode = () => {
    try {
      const grammarCheck = checkLR1Grammar(grammarJson);
      if (!grammarCheck.isLR1) {
        setGrammarStatus(
          "❌ Грамматика НЕ является LR(1): " + grammarCheck.message
        );
        setResult("");
        setErrorLines([]);
        return;
      } else {
        setGrammarStatus("✅ Грамматика является LR(1).");
      }

      const tokens = lexer(code);
      const parseResult = parse(tokens);

      // Если в результате есть переносы строки, показываем построчно ошибки
      if (typeof parseResult === "string" && parseResult.includes("\\n")) {
        setErrorLines(parseResult.split("\\n"));
        setResult("");
      } else {
        setErrorLines([]);
        setResult(parseResult);
      }
    } catch (e) {
      setGrammarStatus("");
      setErrorLines([e.message]);
      setResult("");
    }
  };

  return (
    <main className="container">
      <section>
        <h1>Синтаксический анализатор</h1>

        <textarea
          placeholder="Вставьте здесь код на Pascal..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <div className="buttons">
          <button onClick={checkCode}>Проверить</button>
          <button
            onClick={() => {
              setCode(sample);
              setResult("");
              setGrammarStatus("");
              setErrorLines([]);
            }}
            className="secondary"
          >
            Вставить пример
          </button>
        </div>

        {grammarStatus && (
          <div
            className={`status ${
              grammarStatus.startsWith("✅") ? "success" : "error"
            }`}
            role="alert"
          >
            {grammarStatus}
          </div>
        )}

        {errorLines.length > 0 && (
          <div className="error-list" aria-live="polite">
            {errorLines.map((line, idx) => (
              <div key={idx} className="error-item">
                <span className="error-icon">❌</span> {line}
              </div>
            ))}
          </div>
        )}

        {result && <pre className="result">{result}</pre>}
      </section>
    </main>
  );
}

const sample = `var a, b, c: integer;
var s: string[20];
var arr: array[1..5] of real;
var t, s: string[300];
var wrongArr: array[10..5] of integer;`;
