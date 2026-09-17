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
  expectedRatio?: number,
): Promise<{ blob: Blob; ext: string; width: number; height: number; cropped: boolean }> {
  if (file.type === "image/svg+xml") {
    return { blob: file, ext: "svg", width: 0, height: 0, cropped: false };
  }
  const { source, w, h } = await loadBitmap(file);
  const scale = w > maxWidth ? maxWidth / w : 1;
  let width = Math.round(w * scale);
  let height = Math.round(h * scale);

  // Fit (never crop, never stretch): the whole picture is placed inside a canvas
  // with the slot ratio; any leftover space stays transparent.
  let padded = false;
  let dx = 0;
  let dy = 0;
  let dw = width;
  let dh = height;

  if (expectedRatio) {
    const sourceRatio = width / height;
    if (Math.abs(sourceRatio - expectedRatio) / expectedRatio > 0.01) {
      padded = true;
      if (sourceRatio > expectedRatio) {
        // Wider than the slot — keep width, add space above and below
        height = Math.round(width / expectedRatio);
      } else {
        // Taller than the slot — keep height, add space left and right
        width = Math.min(maxWidth, Math.round(height * expectedRatio));
        height = Math.round(width / expectedRatio);
      }
      const fit = Math.min(width / dw, height / dh);
      dw = Math.round(dw * fit);
      dh = Math.round(dh * fit);
      dx = Math.round((width - dw) / 2);
      dy = Math.round((height - dh) / 2);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, ext: file.name.split(".").pop() ?? "jpg", width, height, cropped: padded };
  ctx.drawImage(source, 0, 0, w, h, dx, dy, dw, dh);
  const cropped = padded;

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.82),
  );
  if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", width, height, cropped };

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
  );
  if (jpeg) return { blob: jpeg, ext: "jpg", width, height, cropped };
  return { blob: file, ext: file.name.split(".").pop() ?? "jpg", width, height, cropped };
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
    const { blob, ext, width, height, cropped } = await prepareImage(file, maxWidth, expectedRatio);
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onUploaded({ url: data.publicUrl, width, height, storagePath: path });
    return cropped;
  };

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const cropped = await uploadFile(file);
      toast.success(
        cropped
          ? "Paveikslėlis įkeltas — visas vaizdas išsaugotas, pritaikytas prie vietos proporcijų"
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
