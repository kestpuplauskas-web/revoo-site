import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
  _expectedRatio?: number,
): Promise<{ blob: Blob; ext: string; width: number; height: number; adjusted: boolean }> {
  if (file.type === "image/svg+xml") {
    return { blob: file, ext: "svg", width: 0, height: 0, adjusted: false };
  }
  const { source, w, h } = await loadBitmap(file);
  const scale = w > maxWidth ? maxWidth / w : 1;
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, ext: file.name.split(".").pop() ?? "jpg", width, height, adjusted: false };
  ctx.drawImage(source, 0, 0, w, h, 0, 0, width, height);
  const adjusted = scale < 1;

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82),
  );
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", width, height, adjusted };

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );
  if (jpeg) return { blob: jpeg, ext: "jpg", width, height, adjusted };
  return { blob: file, ext: file.name.split(".").pop() ?? "jpg", width, height, adjusted };
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

  const uploadFile = async (file: File) => {
    const { blob, ext, width, height, adjusted } = await prepareImage(file, maxWidth, expectedRatio);
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onUploaded({ url: data.publicUrl, width, height, storagePath: path });
    return adjusted;
  };

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const adjusted = await uploadFile(file);
      toast.success(
        adjusted
          ? "Paveikslėlis įkeltas — visas vaizdas išsaugotas ir sumažintas"
          : "Paveikslėlis įkeltas",
      );
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
