import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

const MAX_WIDTH = 1600;
const BUCKET = "blog-images";

export type UploadedImage = { url: string; width: number; height: number };

async function loadBitmap(file: File): Promise<{ source: CanvasImageSource; w: number; h: number }> {
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

async function prepare(file: File): Promise<{ blob: Blob; ext: string; width: number; height: number }> {
  if (file.type === "image/svg+xml") {
    return { blob: file, ext: "svg", width: 0, height: 0 };
  }
  const { source, w, h } = await loadBitmap(file);
  const scale = w > MAX_WIDTH ? MAX_WIDTH / w : 1;
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
}: {
  label?: string;
  onUploaded: (image: UploadedImage) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const { blob, ext, width, height } = await prepare(file);
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onUploaded({ url: data.publicUrl, width, height });
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
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
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
    </div>
  );
}
