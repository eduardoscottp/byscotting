import { useState } from 'react';
import knowledge from '@/data/cleaning-chatbot.json';

export type CleaningHandoff = { serviceMix: 'commercial' | 'mixed'; channel: 'email' | 'callback'; summary: string };
type Props = { onReply: (question: string, answer: string) => void; onHandoff?: (answers?: CleaningHandoff) => void; onClose: () => void };
const questions = [
  { key: 'service', question: 'What kind of cleaning business do you run?', choices: ['Commercial cleaning', 'Commercial and residential', 'Residential only / other'] },
  { key: 'area', question: 'Does your business serve Miami-Dade?', choices: ['Yes, Miami-Dade', 'Outside Miami-Dade'] },
  { key: 'need', question: 'What would you most like to improve?', choices: ['More commercial inquiries', 'Following up on inquiries and quotes', 'Both'] },
  { key: 'capacity', question: 'Can your team take on more commercial work?', choices: ['Yes, we have capacity', 'Not yet / I am not sure'] },
  { key: 'channel', question: 'How would you like Eduardo to respond?', choices: ['Email me', 'Call me'] },
] as const;

export default function CleaningGuide({ onReply, onHandoff, onClose }: Props) {
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [outsideFit, setOutsideFit] = useState(false);
  const button = 'rounded-xl border border-ink/20 px-3 py-2 text-left text-sm focus:outline-2 focus:outline-blue';
  function ask(id: string) {
    const faq = knowledge.faqs.find(item => item.id === id);
    if (faq) onReply(faq.question, faq.answer);
  }
  function choose(answer: string) {
    const question = questions[step];
    const next = { ...answers, [question.key]: answer };
    setAnswers(next);
    if ((question.key === 'service' && answer === question.choices[2]) || (question.key === 'area' && answer === 'Outside Miami-Dade')) {
      setOutsideFit(true); setStep(-1);
      onReply(answer, 'This specific growth plan focuses on established commercial cleaning businesses in Miami-Dade. You can speak with Eduardo about another project using the contact link below.');
      return;
    }
    setStep(step + 1);
    onReply(answer, step + 1 < questions.length ? questions[step + 1].question : 'Ready. Continue to the form to add your full name and your email or phone number. Nothing has been saved yet.');
  }
  function handoff() {
    onHandoff?.({ serviceMix: answers.service === 'Commercial and residential' ? 'mixed' : 'commercial', channel: answers.channel === 'Call me' ? 'callback' : 'email', summary: 'Chat qualification (self-reported; not verified):\n' + questions.map(q => `${q.question} ${answers[q.key]}`).join('\n') });
    onClose();
  }
  return <div className="mt-3 space-y-3">
    {step === -1 ? <>
      <div className="flex flex-wrap gap-2">{['ai','price','leads'].map(id => <button key={id} type="button" className={button} onClick={() => ask(id)}>{id === 'ai' ? 'How AI Agents help' : id === 'price' ? 'Pricing & scope' : 'Getting more leads'}</button>)}</div>
      <label className="block text-xs">More questions<select aria-label="Choose a chatbot question" value="" onChange={e => ask(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/20 bg-white px-2 py-2 text-sm"><option value="">Choose a question</option>{[...new Set(knowledge.faqs.map(f=>f.category))].map(category => <optgroup key={category} label={category}>{knowledge.faqs.filter(f=>f.category===category).map(f=><option key={f.id} value={f.id}>{f.question}</option>)}</optgroup>)}</select></label>
      <button type="button" className="w-full rounded-xl bg-blue px-3 py-3 text-sm text-white" onClick={() => { setAnswers({}); setOutsideFit(false); setStep(0); onReply('Help me find my next step', questions[0].question); }}>Find my next step</button>
      {outsideFit && <p className="text-xs text-ink/70">For other projects, use Talk to Eduardo below.</p>}
    </> : step < questions.length ? <>
      <p className="text-xs text-ink/60">Question {step + 1} of {questions.length}</p><p className="text-sm font-semibold">{questions[step].question}</p>
      <div className="flex flex-wrap gap-2">{questions[step].choices.map(choice => <button key={choice} type="button" className={button} onClick={() => choose(choice)}>{choice}</button>)}</div>
      <button type="button" className="text-xs underline" onClick={() => setStep(-1)}>Back to questions</button>
    </> : <>
      <p className="text-sm">Include these five choices with your request? Your full chat will stay here.</p>
      <a href="#growth-plan" className="block rounded-xl bg-blue px-3 py-3 text-center text-sm text-white" onClick={handoff}>Use my answers in the form</a>
      <a href="#growth-plan" className="block text-center text-xs underline" onClick={() => { onHandoff?.(); onClose(); }}>Open the form without my answers</a>
      <button type="button" className="text-xs underline" onClick={() => { setStep(0); setAnswers({}); }}>Start over</button>
    </>}
  </div>;
}
