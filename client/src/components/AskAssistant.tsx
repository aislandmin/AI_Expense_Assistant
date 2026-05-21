import { useState, useRef, useEffect } from "react";
import { askFinancialQuestion } from "../services/aiService";
import type { AskResponse } from "../types/expense";

interface SpeechRecognitionResult {
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

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
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

function getSpeechRecognitionConstructor() {
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function AskAssistant() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const SpeechRecognition = getSpeechRecognitionConstructor();
  const isSpeechSupported = Boolean(SpeechRecognition);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(""), 3500);
    return () => window.clearTimeout(id);
  }, [error]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!question.trim()) {
      setError("Ask a spending question first.");
      return;
    }

    setIsAsking(true);

    try {
      const answer = await askFinancialQuestion(question.trim());
      setResponse(answer);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to answer question"
      );
    } finally {
      setIsAsking(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop?.();
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
        setQuestion(transcript);
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
      setQuestion("");
      setIsListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError("Could not start voice input. Please type it instead.");
    }
  }

  return (
    <section className="panel ask-panel">
      <div className="panel-header">
        <h2>Ask your money</h2>
        <p>Ask about totals, comparisons, top categories, and income.</p>
      </div>

      <form className="ask-form" onSubmit={handleSubmit}>
        <div className="quick-add-input-wrap">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your spending..."
          />
        </div>

        <button
          className={`voice-button${isListening ? " is-listening" : ""}`}
          type="button"
          onClick={handleToggleListening}
          disabled={isAsking || !isSpeechSupported}
          aria-label={isListening ? "Stop voice input" : "Use voice input"}
          title={isListening ? "Stop voice input" : "Use voice input"}
        >
          {isListening && <span className="listening-dot" />}
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
            <path d="M17.5 11a5.5 5.5 0 0 1-11 0" />
            <path d="M12 16.5V20" />
            <path d="M8.5 20h7" />
          </svg>
        </button>

        <button type="submit" disabled={isAsking}>
          {isAsking ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error && <p className="form-error ask-error">{error}</p>}

      {response && (
        <article className="ask-answer">
          <p>{response.answer}</p>
          <span>{response.intent.replace(/_/g, " ")}</span>
        </article>
      )}
    </section>
  );
}

export default AskAssistant;
