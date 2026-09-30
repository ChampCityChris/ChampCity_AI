import { useState } from "react";
import type { CodexPendingMcpElicitationModel, CodexPendingUserInputModel } from "../../shared/workspaceContracts";

export function CodexBoundedUserInputPanel({ pending, label, disabled = false, onSubmit }: {
  pending: CodexPendingUserInputModel;
  label: string;
  disabled?: boolean;
  onSubmit: (requestId: string, answers: Record<string, string[]>) => void;
}): JSX.Element {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const canSubmit = !disabled && pending.questions.length > 0 && pending.questions.every(question => Boolean(answers[question.id]?.trim()));
  return <section aria-label={`${label} input request`}><h4>{label} needs input</h4>
    {pending.questions.map(question => <label key={question.id}>{question.header}: {question.question}
      {question.options.length ? <select disabled={disabled} value={answers[question.id] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))}>
        <option value="">Choose an answer</option>{question.options.map(option => <option key={option.label} value={option.label}>{option.label} — {option.description}</option>)}
      </select> : <input disabled={disabled} aria-label={question.header} value={answers[question.id] ?? ""} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} />}</label>)}
    <button disabled={!canSubmit} onClick={() => onSubmit(pending.requestId, Object.fromEntries(pending.questions.map(question => [question.id, [answers[question.id].trim()]])))}>Send exact {label} answers</button>
  </section>;
}

export function CodexBoundedMcpElicitationPanel({ pending, disabled = false, onSubmit }: {
  pending: CodexPendingMcpElicitationModel;
  disabled?: boolean;
  onSubmit: (requestId: string, action: "accept" | "decline" | "cancel", content: unknown | null) => void;
}): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({});
  const canAccept = !disabled && pending.responseSupported && pending.fields.every(field => !field.required || Boolean(values[field.id]?.trim()));
  const content = Object.fromEntries(pending.fields.filter(field => values[field.id] !== undefined && values[field.id] !== "").map(field => {
    const option = field.options.find(candidate => candidate.value === values[field.id]);
    return [field.id, option?.value ?? values[field.id]];
  }));
  return <section aria-label="Implementer MCP elicitation"><h4>MCP input · {pending.serverName}</h4><p>{pending.message}</p><p>{pending.requestedSchemaSummary}</p>
    {!pending.responseSupported && <p role="status">{pending.unsupportedReason ?? "This elicitation response is unsupported."}</p>}
    {pending.responseSupported && pending.fields.map(field => <label key={field.id}>{field.title}{field.required ? " (required)" : ""}{field.description ? `: ${field.description}` : ""}
      {field.options.length ? <select disabled={disabled} aria-label={field.title} value={values[field.id] ?? ""} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))}>
        <option value="">Choose an answer</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select> : <input disabled={disabled} aria-label={field.title} value={values[field.id] ?? ""} onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))} />}</label>)}
    {pending.responseSupported && <button disabled={!canAccept} onClick={() => onSubmit(pending.requestId, "accept", content)}>Send elicitation response</button>}
    {pending.responseSupported && <><button disabled={disabled} onClick={() => onSubmit(pending.requestId, "decline", null)}>Decline elicitation</button><button disabled={disabled} onClick={() => onSubmit(pending.requestId, "cancel", null)}>Cancel elicitation</button></>}
  </section>;
}
