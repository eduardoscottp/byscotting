import { useState } from "react";
import { WHATSAPP, type Copy, type Lang } from "@/copy";

const ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT as string | undefined;

type Status = "idle" | "sending" | "done";

export default function PainForm({ t, lang }: { t: Copy["form"]; lang: Lang }) {
  const [chip, setChip] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chip) return setError(t.chipRequired);
    if (!contact.trim()) return setError(t.contactRequired);
    setError(null);

    const payload = { chip, detail, name, contact, lang, at: new Date().toISOString() };

    // Sin endpoint configurado, el mensaje se abre en WhatsApp para que nada se pierda.
    if (!ENDPOINT) {
      const lines = [`${t.title}`, `→ ${chip}`, detail && `“${detail}”`, name && `— ${name}`]
        .filter(Boolean)
        .join("\n");
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines)}`, "_blank", "noopener");
      setStatus("done");
      return;
    }

    setStatus("sending");
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } finally {
      setStatus("done");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-card bg-white p-8 text-center font-display text-xl font-semibold text-ink md:text-2xl">
        {t.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">{t.title}</legend>
        <div className="flex flex-wrap gap-2.5">
          {t.chips.map((c) => {
            const active = chip === c;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setChip(c);
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
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-blue px-8 py-3.5 font-display text-base font-semibold text-white transition-colors hover:bg-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:opacity-60"
        >
          {status === "sending" ? t.sending : t.submit}
        </button>
        <p className="font-body text-sm text-ink/55">{t.reassurance}</p>
      </div>
    </form>
  );
}
