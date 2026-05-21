import { useEffect, useRef, useState } from "react";
import { parseExpenseText } from "../services/aiService";
import type { ParsedExpense } from "../types/expense";

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: {
    readonly transcript: string;
  };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface NaturalLanguageExpenseProps {
  onParsed: (expense: ParsedExpense) => void;
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function NaturalLanguageExpense({ onParsed }: NaturalLanguageExpenseProps) {
  const [text, setText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const SpeechRecognition = getSpeechRecognitionConstructor();
  const isSpeechSupported = Boolean(SpeechRecognition);

  useEffect(() => {
    if (!error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function handleToggleListening() {
    setError("");

    if (isListening) {
      stopListening();
      return;
    }

    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length }, (_, index) =>
        event.results[index][0]?.transcript.trim()
      )
        .filter(Boolean)
        .join(" ");

      if (transcript) {
        setText(transcript);
      }
    };
    recognition.onerror = () => {
      setError("Could not capture voice input. Please type it instead.");
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    try {
      recognitionRef.current = recognition;
      setText("");
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("Could not start voice input. Please type it instead.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!text.trim()) {
      setError("Enter an expense or income first.");
      return;
    }

    setIsParsing(true);

    try {
      const parsedExpense = await parseExpenseText(text);
      onParsed(parsedExpense);
      setText("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to parse expense"
      );
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Quick Add</h2>
        <p>Type an expense or income, then review and save it below.</p>
      </div>

      <form className="natural-form" onSubmit={handleSubmit}>
        <div className="quick-add-input-wrap">
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type an expense or income in your own words"
          />
          {text && (
            <button
              className="clear-input-button"
              type="button"
              onClick={() => setText("")}
              aria-label="Clear Quick Add input"
              title="Clear input"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          className={`voice-button${isListening ? " is-listening" : ""}`}
          type="button"
          onClick={handleToggleListening}
          disabled={isParsing || !isSpeechSupported}
          aria-label={isListening ? "Stop voice input" : "Use voice input"}
          title={isListening ? "Stop voice input" : "Use voice input"}
        >
          {isListening && <span className="listening-dot" />}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
            <path d="M17.5 11a5.5 5.5 0 0 1-11 0" />
            <path d="M12 16.5V20" />
            <path d="M8.5 20h7" />
          </svg>
        </button>
        <button type="submit" disabled={isParsing}>
          {isParsing ? "Reading..." : "Continue"}
        </button>
      </form>

      {!isSpeechSupported && (
        <p className="muted voice-fallback">
          Voice input is not supported in this browser.
        </p>
      )}
      {error && <p className="form-error natural-error">{error}</p>}
    </section>
  );
}

export default NaturalLanguageExpense;
