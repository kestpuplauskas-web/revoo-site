import { Fragment, type ReactNode } from "react";

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Renders `[anchor](/path/)` markdown links inside plain article text. Only internal paths and https URLs. */
export function InlineLinks({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  LINK.lastIndex = 0;
  while ((m = LINK.exec(text))) {
    const [full, label, url] = m;
    const safe = url.startsWith("/") || url.startsWith("https://");
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      safe ? (
        <a
          key={m.index}
          href={url}
          className="font-medium text-teal-500 underline decoration-teal-500/40 underline-offset-4 hover:text-teal-700"
        >
          {label}
        </a>
      ) : (
        label
      ),
    );
    last = m.index + full.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
