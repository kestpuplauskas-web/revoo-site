import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type UploadedImage = {
  url: string;
  width: number;
  height: number;
  storagePath: string;
};

async function loadBitmap(
  file: File,
): Promise<{ source: CanvasImageSource; w: number; h: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, w: bitmap.width, h: bitmap.height };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Nepavyko nuskaityti paveikslėlio"));
      el.src = url;
    });
    return { source: img, w: img.naturalWidth, h: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function prepareImage(
  file: File,
  maxWidth: number,
): Promise<{ blob: Blob; ext: string; width: number; height: number }> {
  if (file.type === "image/svg+xml") {
    return { blob: file, ext: "svg", width: 0, height: 0 };
  }
  const { source, w, h } = await loadBitmap(file);
  const scale = w > maxWidth ? maxWidth / w : 1;
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, ext: file.name.split(".").pop() ?? "jpg", width: w, height: h };
  ctx.drawImage(source, 0, 0, width, height);

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82),
  );
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", width, height };

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );
  if (jpeg) return { blob: jpeg, ext: "jpg", width, height };
  return { blob: file, ext: file.name.split(".").pop() ?? "jpg", width: w, height: h };
}

export function ImageUpload({
  label = "Įkelti paveikslėlį",
  onUploaded,
  maxWidth = 1600,
  bucket = "blog-images",
  accept = "image/*",
  expectedRatio,
}: {
  label?: string;
  onUploaded: (image: UploadedImage) => void;
  maxWidth?: number;
  bucket?: string;
  accept?: string;
  expectedRatio?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [ratioWarning, setRatioWarning] = useState<{
    file: File;
    width: number;
    height: number;
    diff: number;
  } | null>(null);

  const uploadFile = async (file: File) => {
    const { blob, ext, width, height } = await prepareImage(file, maxWidth);
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onUploaded({ url: data.publicUrl, width, height, storagePath: path });
  };

  const handle = async (file: File) => {
    setBusy(true);
    try {
      if (expectedRatio) {
        const { w, h } = await loadBitmap(file);
        const actualRatio = w / h;
        const diff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
        if (diff > 0.01) {
          setRatioWarning({ file, width: w, height: h, diff });
          setBusy(false);
          if (inputRef.current) inputRef.current.value = "";
          return;
        }
      }
      await uploadFile(file);
      toast.success("Paveikslėlis įkeltas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko įkelti paveikslėlio");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const forceUpload = async () => {
    if (!ratioWarning) return;
    setBusy(true);
    setRatioWarning(null);
    try {
      await uploadFile(ratioWarning.file);
      toast.success("Paveikslėlis įkeltas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko įkelti paveikslėlio");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />

      {ratioWarning ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/10 p-3">
          <div className="flex items-start gap-2 text-sm text-ink">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
            <div>
              <p className="font-medium">Proporcijos neatitinka</p>
              <p className="mt-0.5 text-ink-soft">
                Įkelta: {ratioWarning.width}×{ratioWarning.height} (santykis{" "}
                {(ratioWarning.width / ratioWarning.height).toFixed(3)}). Tikėtasi:{" "}
                {expectedRatio?.toFixed(3)} (skirtumas {(ratioWarning.diff * 100).toFixed(1)}%).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={forceUpload}
              disabled={busy}
              className="rounded-full bg-teal-700 px-4 py-2 text-sm text-cream hover:bg-teal-800 disabled:opacity-60"
            >
              {busy ? "Keliama…" : "Vis tiek įkelti"}
            </button>
            <button
              type="button"
              onClick={() => setRatioWarning(null)}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink hover:bg-cream"
            >
              Atšaukti
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? "Keliama…" : label}
        </button>
      )}
    </div>
  );
}
