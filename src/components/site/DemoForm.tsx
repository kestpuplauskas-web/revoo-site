import { Check } from "lucide-react";
import { useState } from "react";

import { t, type Lang } from "@/lib/i18n";

export function DemoForm({ lang }: { lang: Lang }) {
  const c = t(lang);
  const f = c.demo.form;
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-[0_20px_60px_-45px_rgba(8,32,30,0.6)]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-700">
          <Check aria-hidden="true" className="h-7 w-7 text-cream" />
        </span>
        <h3 className="mt-6 font-display text-4xl">{c.demo.success.title}</h3>
        <p className="mt-3 text-ink-soft">{c.demo.success.body}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
      className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-45px_rgba(8,32,30,0.6)] sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="demo-name" label={f.name} hint={f.required}>
          <input id="demo-name" name="name" required autoComplete="name" className={inputClass} />
        </Field>
        <Field id="demo-email" label={f.email} hint={f.required}>
          <input
            id="demo-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </Field>
        <Field id="demo-property" label={f.property} hint={f.required}>
          <input id="demo-property" name="property" required className={inputClass} />
        </Field>
        <Field id="demo-country" label={f.country}>
          <select id="demo-country" name="country" defaultValue="" className={inputClass}>
            <option value="" disabled>
              {f.select}
            </option>
            {f.countries.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field id="demo-type" label={f.type}>
          <select id="demo-type" name="type" defaultValue="" className={inputClass}>
            <option value="" disabled>
              {f.select}
            </option>
            {f.types.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field id="demo-units" label={f.units}>
          <select id="demo-units" name="units" defaultValue="" className={inputClass}>
            <option value="" disabled>
              {f.select}
            </option>
            {f.unitOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field id="demo-current" label={f.current}>
            <select id="demo-current" name="current" defaultValue="" className={inputClass}>
              <option value="" disabled>
                {f.select}
              </option>
              {f.currentOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field id="demo-notes" label={f.notes} hint={f.optional}>
            <textarea id="demo-notes" name="notes" rows={4} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        className="mt-7 w-full rounded-full bg-teal-700 px-6 py-3.5 font-medium text-cream transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-900"
      >
        {f.submit}
      </button>
      <p className="mt-3 text-center text-[0.8rem] text-ink-soft">{f.fineprint}</p>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-cream/40 px-4 py-3 text-[0.95rem] text-ink outline-none transition-colors focus:border-teal-500";

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block text-ink-soft">
        {label}
        {hint ? <span className="ml-1 lowercase tracking-normal opacity-70">({hint})</span> : null}
      </label>
      {children}
    </div>
  );
}
