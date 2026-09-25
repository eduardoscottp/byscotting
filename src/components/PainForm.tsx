import { useState } from "react";
import { WHATSAPP, type Copy, type Lang } from "@/copy";
import { getAttribution, trackMetric } from "@/lib/attribution";

const ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT as string | undefined;

type Status = "idle" | "sending" | "done" | "whatsapp";

export default function PainForm({ t, lang }: { t: Copy["form"]; lang: Lang }) {
  const [chips, setChips] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [submissionId] = useState(crypto.randomUUID());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (chips.length === 0) return setError(t.chipRequired);
    if (!contact.trim()) return setError(t.contactRequired);
    setError(null);

    const payload = { chips, detail, name, contact, lang, submission_id: submissionId, attribution: getAttribution(), at: new Date().toISOString() };

    // Sin endpoint configurado, el mensaje se abre en WhatsApp para que nada se pierda.
    if (!ENDPOINT) {
      const intro = lang === "en" ? "Hi Eduardo, I’d like help with:" : "Hola Eduardo, me gustaría recibir ayuda con:";
      const lines = [intro, ...chips.map((c) => `→ ${c}`), detail && `“${detail}”`, name && `— ${name}`, contact]
        .filter(Boolean)
        .join("\n");
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines)}`;
      setWhatsappDraft(url);
      window.open(url, "_blank", "noopener,noreferrer");
      setStatus("whatsapp");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Submission failed");
      setStatus("done");
      trackMetric('generate_lead', lang, 'form');
    } catch {
      setError(t.failure);
      setStatus("idle");
    }
  }

  if (status === "whatsapp") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-card bg-white p-8 text-center" role="status">
        <p className="font-display text-xl font-semibold text-ink md:text-2xl">{t.whatsappReady}</p>
        <a href={whatsappDraft} target="_blank" rel="noopener noreferrer" className="rounded-full bg-blue px-6 py-3 font-display font-semibold text-white">
          {t.whatsappRetry}
        </a>
      </div>
    );
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-card bg-white p-8 text-center font-display text-xl font-semibold text-ink md:text-2xl">
        {t.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">{t.title}</legend>
        <p className="font-body text-sm text-ink/50">{t.chipsHint}</p>
        <div className="flex flex-wrap gap-2.5">
          {t.chips.map((c) => {
            const active = chips.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setChips((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
                  setError(null);
                }}
                className={`rounded-full border px-4 py-2.5 font-body text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                  active
                    ? "border-blue bg-blue text-white"
                    : "border-ink/15 bg-white text-ink/75 hover:border-blue hover:text-blue"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="font-body text-sm text-ink/60">
          {t.detailLabel} <span className="text-ink/35">({t.detailOptional})</span>
        </span>
        <input
          type="text"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="rounded-xl border border-ink/15 bg-white px-4 py-3 font-body text-base text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-blue"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-body text-sm text-ink/60">{t.nameLabel}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="rounded-xl border border-ink/15 bg-white px-4 py-3 font-body text-base text-ink outline-none transition-colors focus:border-blue"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-body text-sm text-ink/60">{t.contactLabel}</span>
          <input
            type="text"
            value={contact}
            onChange={(e) => {
              setContact(e.target.value);
              setError(null);
            }}
            className="rounded-xl border border-ink/15 bg-white px-4 py-3 font-body text-base text-ink outline-none transition-colors focus:border-blue"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="font-body text-sm text-blue">
          {error}
          {error === t.failure && (
            <> <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="underline">{t.whatsappRetry}</a></>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-blue px-8 py-3.5 font-display text-base font-semibold text-white transition-colors hover:bg-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-60"
        >
          {status === "sending" ? t.sending : ENDPOINT ? t.submit : t.whatsappContinue}
        </button>
      </div>
    </form>
  );
}
