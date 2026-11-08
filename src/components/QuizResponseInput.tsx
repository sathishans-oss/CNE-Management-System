import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, XCircle } from 'lucide-react';
import type { QuizQuestion } from '../types';
import { isValidResponse, normalizeResponse, orderedSequence, populatedOptions, responseFormat } from '../utils/quizResponse';

interface QuizResponseInputProps {
  question: QuizQuestion;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  review?: boolean;
  seed?: string;
}

const answerLetters = (answer: string) => String(answer || '').toUpperCase().split(',').map(part => part.trim()).filter(Boolean);
const optionText = (question: QuizQuestion, letter: string) => String(question.options[letter as keyof QuizQuestion['options']] || '').trim();

/**
 * Phase 1 response renderer for both active Quiz questions and completed reviews.
 * Answer keys are only available in Practice-after-submission and completed Scored reviews.
 * All Scored responses are scored on the server; this component never calculates marks.
 */
export const QuizResponseInput: React.FC<QuizResponseInputProps> = ({ question, value, onChange, disabled = false, review = false, seed = 'practice' }) => {
  const format = responseFormat(question);
  const locked = Boolean(disabled || review);
  const draggingFrom = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const chosen = answerLetters(value);
  const correct = review ? answerLetters(question.correctOption || '') : [];
  const order = orderedSequence(question, value, seed);
  const showAnswer = Boolean(review && question.correctOption);

  useEffect(() => { setAnnouncement(''); draggingFrom.current = null; }, [question.questionId]);

  const update = (candidate: string) => {
    if (locked || !onChange) return;
    const normalized = normalizeResponse(question, candidate);
    // A partially selected MULTI_SELECT response is valid as an in-progress choice.
    // ORDERED_RESPONSE must include each configured step once; never expose its key here.
    if (!normalized || isValidResponse(question, normalized)) onChange(normalized);
  };

  const toggle = (letter: string) => {
    const next = chosen.includes(letter) ? chosen.filter(item => item !== letter) : [...chosen, letter];
    update(next.join(','));
  };

  const reorder = (from: number, to: number) => {
    if (locked || !onChange || from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    update(next.join(','));
    setAnnouncement(`Step ${from + 1} moved to position ${to + 1}.`);
  };

  if (review && format === 'ORDERED_RESPONSE') {
    return <div className="space-y-2.5" aria-label="Submitted and correct ordered responses">
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4" aria-label="Your submitted sequence">
          <h5 className="mb-2 text-sm font-bold text-slate-800">Your submitted order</h5>
          {chosen.length === 0 ? <p className="text-sm text-slate-600">Not answered</p> : <ol className="space-y-2">
            {chosen.map((letter, position) => <li key={`${letter}-${position}`} className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-800">{position + 1}</span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap leading-relaxed text-slate-800">{optionText(question, letter)}</span>
              {showAnswer && (letter === correct[position] ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-label="Correct position" /> : <XCircle className="mt-1 h-4 w-4 shrink-0 text-rose-700" aria-label="Incorrect position" />)}
            </li>)}
          </ol>}
        </section>
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:p-4" aria-label="Correct clinical sequence">
          <h5 className="mb-2 text-sm font-bold text-emerald-900">Correct clinical sequence</h5>
          {showAnswer ? <ol className="space-y-2">{correct.map((letter, position) => <li key={`${letter}-${position}`} className="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-900">{position + 1}</span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap leading-relaxed text-slate-800">{optionText(question, letter)}</span>
          </li>)}</ol> : <p className="text-sm text-slate-500">The correct order is available after submission.</p>}
        </section>
      </div>
      <p className="text-xs leading-relaxed text-slate-600">The complete clinical sequence must be correct to earn the mark. Review the explanation below for the rationale behind the order.</p>
    </div>;
  }

  if (format === 'ORDERED_RESPONSE') {
    return <div className="space-y-2" aria-label="Arrange the steps in order">
      <p id="cne-ordered-instructions" className="text-xs font-semibold leading-relaxed text-slate-600">Arrange the steps in the clinically correct sequence. Drag on desktop, use the arrow buttons on mobile, or focus a step and press Up/Down.</p>
      <div role="list" aria-label="Ordered nursing actions" className="space-y-2">
        {order.map((letter, position) => <div key={letter} role="listitem" tabIndex={locked ? -1 : 0}
          aria-label={`Step ${position + 1} of ${order.length}: ${optionText(question, letter)}`}
          aria-describedby="cne-ordered-instructions"
          onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) { event.preventDefault(); reorder(position, position + (event.key === 'ArrowUp' ? -1 : 1)); } }}
          draggable={!locked}
          onDragStart={() => { draggingFrom.current = position; }}
          onDragOver={event => { if (!locked) event.preventDefault(); }}
          onDrop={event => { event.preventDefault(); if (draggingFrom.current !== null) reorder(draggingFrom.current, position); draggingFrom.current = null; }}
          onDragEnd={() => { draggingFrom.current = null; }}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 sm:gap-3 sm:px-3">
          <GripVertical className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-sm font-bold text-teal-800">{position + 1}</span>
          <span className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700 sm:text-base">{optionText(question, letter)}</span>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" aria-label={`Move step ${letter} up`} title="Move step up" disabled={locked || position === 0} onClick={() => reorder(position, position - 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp className="h-5 w-5" aria-hidden="true" /></button>
            <button type="button" aria-label={`Move step ${letter} down`} title="Move step down" disabled={locked || position === order.length - 1} onClick={() => reorder(position, position + 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown className="h-5 w-5" aria-hidden="true" /></button>
          </div>
        </div>)}
      </div>
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</span>
      {!value && <button type="button" disabled={locked} onClick={() => update(order.join(','))} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">Confirm displayed order</button>}
    </div>;
  }

  if (review) {
    return <div className="grid gap-2 lg:grid-cols-2" aria-label="Submitted answer and correct answer">
      {populatedOptions(question).map(letter => {
        const selected = chosen.includes(letter);
        const right = correct.includes(letter);
        // Each option has one accessible feedback state; a correct answer that
        // was missed must not look like a correct option the learner selected.
        const state = right ? (selected ? 'correct-selected' : 'correct-missed') : (selected ? 'incorrect-selected' : 'not-selected');
        const label = state === 'correct-selected' ? 'Correct — You selected this'
          : state === 'correct-missed' ? 'Correct — You missed this'
          : state === 'incorrect-selected' ? 'Incorrect — You selected this' : 'Not selected';
        const styles = state === 'correct-selected' ? 'border-emerald-300 bg-emerald-50'
          : state === 'correct-missed' ? 'border-amber-300 bg-amber-50'
          : state === 'incorrect-selected' ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-slate-50/60';
        const labelStyles = state === 'correct-selected' ? 'text-emerald-800'
          : state === 'correct-missed' ? 'text-amber-900'
          : state === 'incorrect-selected' ? 'text-rose-800' : 'text-slate-500';
        return <div key={letter} className={`flex min-w-0 items-start gap-2.5 rounded-xl border px-3 py-3 text-[15px] leading-relaxed sm:text-base ${styles}`}>
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${state === 'correct-selected' ? 'bg-emerald-200 text-emerald-900' : state === 'correct-missed' ? 'bg-amber-200 text-amber-900' : state === 'incorrect-selected' ? 'bg-rose-200 text-rose-900' : 'bg-white text-slate-600'}`}>{letter}</span>
          <div className="min-w-0 flex-1"><p className="whitespace-pre-wrap leading-relaxed text-slate-800">{optionText(question, letter)}</p>
            <p className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-bold ${labelStyles}`}>
              {state === 'correct-selected' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                : state === 'incorrect-selected' ? <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                : state === 'correct-missed' ? <span aria-hidden="true" className="font-extrabold">!</span> : null}
              {label}
            </p>
          </div>
        </div>;
      })}
    </div>;
  }

  return <fieldset className="space-y-2" aria-label={format === 'MULTI_SELECT' ? 'Select all that apply' : 'Select one answer'}>
    <legend className="sr-only">{format === 'MULTI_SELECT' ? 'Select all that apply' : 'Select the correct answer'}</legend>
    {format === 'MULTI_SELECT' && <p className="text-xs font-bold text-teal-800">Select all that apply. Your complete selection will be graded as one response.</p>}
    {populatedOptions(question).map(letter => {
      const checked = chosen.includes(letter);
      const style = checked ? 'border-teal-600 bg-teal-50' : 'border-slate-200';
      return <label key={letter} className={`flex min-h-12 min-w-0 cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-[15px] leading-relaxed transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700 sm:px-4 sm:text-base ${style}`}>
        {format === 'MULTI_SELECT'
          ? <input type="checkbox" name={`quiz-${question.questionId}-${letter}`} value={letter} checked={checked} disabled={locked} onChange={() => toggle(letter)} className="mt-1" />
          : <input type="radio" name={`quiz-${question.questionId}`} value={letter} checked={checked} disabled={locked} onChange={() => update(letter)} className="mt-1" />}
        <span className="min-w-0 flex-1 whitespace-pre-wrap"><strong>{letter}.</strong> {optionText(question, letter)}</span>
      </label>;
    })}
  </fieldset>;
};

export default QuizResponseInput;
