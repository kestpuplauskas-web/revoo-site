import { useEffect, useRef } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser, Italic, Link2, List, ListOrdered, Underline,
} from "lucide-react";
import { plainToHtml, sanitizeEmailHtml, toEmailHtml } from "@/lib/email-html";

type Props = { value: string; onChange: (html: string) => void; minHeight?: string; ariaLabel?: string };

const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Paryškinti" },
  { cmd: "italic", icon: Italic, label: "Kursyvas" },
  { cmd: "underline", icon: Underline, label: "Pabraukti" },
  { cmd: "insertUnorderedList", icon: List, label: "Taškinis sąrašas" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numeruotas sąrašas" },
  { cmd: "justifyLeft", icon: AlignLeft, label: "Lygiuoti kairėje" },
  { cmd: "justifyCenter", icon: AlignCenter, label: "Centruoti" },
  { cmd: "justifyRight", icon: AlignRight, label: "Lygiuoti dešinėje" },
  { cmd: "justifyFull", icon: AlignJustify, label: "Abipusis lygiavimas" },
] as const;

export function RichEmailEditor({ value, onChange, minHeight = "min-h-56", ariaLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<string>("");

  useEffect(() => {
    const el = ref.current;
    if (!el || value === last.current) return;
    const html = value ? toEmailHtml(value) : "";
    el.innerHTML = html;
    last.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const text = el.innerText.trim();
    const html = text ? sanitizeEmailHtml(el.innerHTML) : "";
    last.current = html;
    onChange(html);
  };

  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const clean = html ? sanitizeEmailHtml(html) : plainToHtml(e.clipboardData.getData("text/plain"));
    document.execCommand("insertHTML", false, clean);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Nuorodos adresas (https://…)");
    if (url && /^(https?:|mailto:)/i.test(url.trim())) run("createLink", url.trim());
  };

  return (
    <div className="rounded-2xl border border-ink/15 bg-background focus-within:ring-2 focus-within:ring-ring">
      <div role="toolbar" aria-label="Teksto formatavimas" className="flex flex-wrap gap-0.5 border-b border-ink/10 p-1">
        {TOOLS.map(({ cmd, icon: Icon, label }) => (
          <button
            key={cmd}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(cmd)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-cream hover:text-ink"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
        <button type="button" title="Nuoroda" aria-label="Nuoroda" onMouseDown={(e) => e.preventDefault()} onClick={addLink}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-cream hover:text-ink">
          <Link2 className="h-4 w-4" />
        </button>
        <button type="button" title="Išvalyti formatavimą" aria-label="Išvalyti formatavimą" onMouseDown={(e) => e.preventDefault()} onClick={() => run("removeFormat")}
          className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-cream hover:text-ink">
          <Eraser className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        className={`${minHeight} max-h-[60vh] overflow-y-auto px-4 py-3 text-[15px] leading-relaxed text-ink outline-none [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6`}
        style={{ fontFamily: "Arial, sans-serif" }}
      />
    </div>
  );
}
