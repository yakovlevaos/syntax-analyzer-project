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
  const [errorLine, setErrorLine] = useState("");

  const checkCode = () => {
    try {
      // Проверка LR(1) грамматики
      const grammarCheck = checkLR1Grammar(grammarJson);
      if (!grammarCheck.isLR1) {
        setGrammarStatus(
          "❌ Грамматика НЕ является LR(1): " + grammarCheck.message
        );
        setResult("");
        setErrorLine("");
        return;
      } else {
        setGrammarStatus("✅ Грамматика является LR(1).");
      }

      // Лексический и синтаксический разбор
      const tokens = lexer(code);
      const parseResult = parse(tokens);

      if (
        parseResult.startsWith("Ошибка") ||
        parseResult.startsWith("Конфликт")
      ) {
        setErrorLine(parseResult);
        setResult("");
      } else {
        setErrorLine("");
        setResult(parseResult);
      }
    } catch (e) {
      setGrammarStatus("");
      setErrorLine(e.message);
      setResult("");
    }
  };

  return (
    <main className="container">
      <section>
        <h1>Синтаксический анализатор Pascal</h1>

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
              setErrorLine("");
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

        {errorLine && (
          <div className="error-list" aria-live="polite">
            <div className="error-item">
              <span className="error-icon">❌</span> {errorLine}
            </div>
          </div>
        )}

        {result && <pre className="result">{result}</pre>}
      </section>
    </main>
  );
}

const sample = `
var a, b: integer;
var s: string[20];
var arr: array[1..5] of real;

procedure Proc1(a: integer; b: real);
begin
end;

function Func1(x: integer; y: integer): real;
begin
end;

var wrongVar integer;

procedure Proc2(a: integer; a: real);
begin
end;

procedure Proc1;
begin
end;`;
