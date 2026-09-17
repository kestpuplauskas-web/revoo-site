import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Loader2, Maximize2, Star, Trash2, Upload, Video } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ImageUpload, type UploadedImage } from "@/components/admin/ImageUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  adminListSlots,
  activateAsset,
  registerAsset,
  reorderSlot,
  deactivateSlot,
  deleteAsset,
  type AdminSlotView,
  type AdminSlotAsset,
} from "@/lib/homepage-media.functions";
import { SLOT_MAP, DEFAULT_SLOTS, type SlotKey } from "@/content/media-slots";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: HomepageMediaAdmin,
});

function HomepageMediaAdmin() {
  const fetchSlots = useServerFn(adminListSlots);
  const queryClient = useQueryClient();
  const slots = useQuery({ queryKey: ["admin-homepage-slots"], queryFn: () => fetchSlots() });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-homepage-slots"] });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <h1 className="font-display text-2xl text-ink">Pagrindinio puslapio vaizdai</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Valdykite visas pagrindinio puslapio nuotraukas ir vaizdo įrašus. Nauji failai tampa
        kandidatais — svetainėje pasirodo tik jums aktyvavus.
      </p>

      {slots.isLoading ? (
        <p className="mt-8 text-sm text-ink-soft">Kraunama…</p>
      ) : slots.data ? (
        <div className="mt-8 space-y-6">
          {slots.data.slots.map((slot) => (
            <SlotCard key={slot.key} slot={slot} refresh={refresh} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-ink-soft">Nepavyko įkelti duomenų</p>
      )}
    </main>
  );
}

function SlotCard({ slot, refresh }: { slot: AdminSlotView; refresh: () => void }) {
  const def = SLOT_MAP[slot.key as SlotKey];
  const slotKey = slot.key as SlotKey;
  const expectedRatio = def.ratioW / def.ratioH;
  const needsPoster = def.kind === "video" && Boolean(DEFAULT_SLOTS[slotKey].posterUrl);
  const fallback = DEFAULT_SLOTS[slotKey];

  const activate = useServerFn(activateAsset);
  const deactivate = useServerFn(deactivateSlot);
  const remove = useServerFn(deleteAsset);
  const [busy, setBusy] = useState(false);

  const sorted = [...slot.assets].sort((a, b) => a.position - b.position);
  const active = sorted.find((a) => a.position === 0) ?? null;
  const rest = sorted.filter((a) => a.position !== 0);

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch {
      toast.error(fail);
    } finally {
      setBusy(false);
    }
  };

  const defaultTile = (
    <GalleryTile
      key="default"
      label="Numatytasis failas"
      src={fallback.url}
      poster={fallback.posterUrl ?? null}
      isVideo={def.kind === "video"}
      ratio={expectedRatio}
      meta={`${fallback.width}×${fallback.height}px`}
      isActive={!active}
      busy={busy}
      slotLabel={def.label}
      {...(active
        ? {
            onActivate: () =>
              run(() => deactivate({ data: { slot_key: slotKey } }), "Grąžintas numatytasis", "Nepavyko grąžinti"),
          }
        : {})}
    />
  );

  const assetTiles = (active ? [active, ...rest] : rest).map((asset) => (
    <GalleryTile
      key={asset.id}
      label={asset.position === 0 ? "Įkeltas failas" : "Kandidatas"}
      src={asset.url}
      poster={asset.poster_url}
      isVideo={def.kind === "video"}
      ratio={expectedRatio}
      meta={`${asset.width}×${asset.height}px · ${new Date(asset.uploaded_at).toLocaleDateString("lt-LT")}`}
      isActive={asset.position === 0}
      busy={busy}
      slotLabel={def.label}
      {...(asset.position === 0
        ? {}
        : {
            onActivate: () =>
              run(
                () => activate({ data: { slot_key: slotKey, asset_id: asset.id } }),
                "Aktyvuota",
                "Nepavyko aktyvuoti",
              ),
          })}
      onDelete={() => {
        if (!confirm("Tikrai ištrinti šią nuotrauką?")) return;
        void run(() => remove({ data: { id: asset.id } }), "Ištrinta", "Nepavyko ištrinti");
      }}
    />
  ));

  const tiles = active ? [...assetTiles, defaultTile] : [defaultTile, ...assetTiles];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">{slot.label}</h2>
          <p className="mt-1 text-xs text-ink-soft">
            {def.kind === "video" ? "Vaizdo įrašas" : "Paveikslėlis"} · {def.usedIn}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Proporcija {def.ratioW}×{def.ratioH} (santykis {expectedRatio.toFixed(3)}), maks. plotis {def.maxWidth}px
          </p>
        </div>
        <div className="shrink-0">
          <UploadArea slotKey={slotKey} def={def} needsPoster={needsPoster} refresh={refresh} />
        </div>
      </div>

      <p className="mt-5 text-xs font-medium text-ink-soft">
        Galerija ({tiles.length}) — pirmoji nuotrauka rodoma svetainėje
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{tiles}</div>
    </div>
  );
}

function GalleryTile({
  label,
  src,
  poster,
  isVideo,
  ratio,
  meta,
  isActive,
  busy,
  slotLabel,
  onActivate,
  onDelete,
}: {
  label: string;
  src: string;
  poster?: string | null | undefined;
  isVideo: boolean;
  ratio: number;
  meta: string;
  isActive: boolean;
  busy: boolean;
  slotLabel: string;
  onActivate?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border p-2 ${
        isActive ? "border-teal-700/40 bg-teal-700/5" : "border-ink/10 bg-cream/30"
      }`}
    >
      <div className="relative">
        <MediaLightbox
          src={src}
          poster={poster}
          isVideo={isVideo}
          label={`Peržiūrėti ${slotLabel}`}
          thumbnailClassName="h-auto w-full"
          ratio={ratio}
        />
        {isActive ? (
          <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-medium text-cream">
            <Star className="h-3 w-3" aria-hidden="true" /> Aktyvi
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] font-medium text-ink">{label}</p>
      <p className="text-[11px] text-ink-soft">{meta}</p>
      <div className="mt-2 flex items-center gap-1">
        {onActivate ? (
          <button
            type="button"
            onClick={onActivate}
            disabled={busy}
            className="rounded-full bg-teal-700 px-3 py-1 text-[11px] text-cream hover:bg-teal-800 disabled:opacity-60"
          >
            Rodyti svetainėje
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="rounded-full border border-ink/15 p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            aria-label="Ištrinti"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MediaLightbox({
  src,
  poster,
  isVideo,
  label,
  thumbnailClassName,
}: {
  src: string;
  poster?: string | null | undefined;
  isVideo: boolean;
  label: string;
  thumbnailClassName: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={`group relative shrink-0 overflow-hidden rounded border border-ink/10 bg-cream/50 p-0 ${thumbnailClassName}`}
          aria-label={label}
          title={label}
        >
          {isVideo ? (
            <video
              src={src}
              poster={poster ?? undefined}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <img src={src} alt="" className="h-full w-full object-cover" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-cream opacity-0 transition group-hover:bg-ink/45 group-hover:opacity-100 group-focus-visible:bg-ink/45 group-focus-visible:opacity-100">
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[92vw] max-w-6xl border-0 bg-background p-3 sm:p-5">
        <DialogTitle className="pr-8 font-display text-lg text-ink">{label.replace("Peržiūrėti ", "")}</DialogTitle>
        <DialogDescription className="sr-only">Padidinta nuotraukos arba vaizdo įrašo peržiūra</DialogDescription>
        <div className="flex max-h-[78vh] min-h-48 items-center justify-center overflow-hidden rounded bg-cream/40">
          {isVideo ? (
            <video
              src={src}
              poster={poster ?? undefined}
              className="max-h-[78vh] max-w-full object-contain"
              controls
              autoPlay
              muted
              playsInline
            />
          ) : (
            <img src={src} alt="" className="max-h-[78vh] max-w-full object-contain" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadArea({
  slotKey,
  def,
  needsPoster,
  refresh,
}: {
  slotKey: SlotKey;
  def: typeof SLOT_MAP[SlotKey];
  needsPoster: boolean;
  refresh: () => void;
}) {
  const register = useServerFn(registerAsset);
  const [busy, setBusy] = useState(false);

  // For video slots with poster, we collect both before registering
  const [posterData, setPosterData] = useState<UploadedImage | null>(null);
  const [videoData, setVideoData] = useState<{
    url: string;
    storagePath: string;
    width: number;
    height: number;
  } | null>(null);

  const handleImageUploaded = async (img: UploadedImage) => {
    setBusy(true);
    try {
      await register({
        data: {
          slot_key: slotKey,
          url: img.url,
          storage_path: img.storagePath,
          width: img.width,
          height: img.height,
          mime: "image/webp",
        },
      });
      toast.success("Kandidatas pridėtas");
      refresh();
    } catch {
      toast.error("Nepavyko registruoti");
    } finally {
      setBusy(false);
    }
  };

  const handleVideoUploaded = async (data: {
    url: string;
    storagePath: string;
    width: number;
    height: number;
  }) => {
    if (needsPoster && !posterData) {
      setVideoData(data);
      toast.info("Dabar įkelkite posterio paveikslėlį");
      return;
    }
    setBusy(true);
    try {
      await register({
        data: {
          slot_key: slotKey,
          url: data.url,
          storage_path: data.storagePath,
          width: data.width,
          height: data.height,
          mime: "video/mp4",
          ...(posterData
            ? {
                poster: {
                  url: posterData.url,
                  storage_path: posterData.storagePath,
                  width: posterData.width,
                  height: posterData.height,
                },
              }
            : {}),
        },
      });
      toast.success("Kandidatas pridėtas");
      setPosterData(null);
      setVideoData(null);
      refresh();
    } catch {
      toast.error("Nepavyko registruoti");
    } finally {
      setBusy(false);
    }
  };

  // If video was uploaded and we're waiting for poster, show poster upload
  if (videoData && needsPoster && !posterData) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-ink-soft">Vaizdo įrašas paruoštas. Įkelkite posterį:</p>
        <ImageUpload
          label="Įkelti posterį"
          bucket="site-media"
          maxWidth={def.maxWidth}
          expectedRatio={def.ratioW / def.ratioH}
          onUploaded={(img) => {
            setPosterData(img);
            // Auto-register once poster is ready
            handleVideoUploaded(videoData);
          }}
        />
        <button
          type="button"
          onClick={() => setVideoData(null)}
          className="text-xs text-ink-soft underline"
        >
          Atšaukti
        </button>
      </div>
    );
  }

  if (def.kind === "image") {
    return (
      <ImageUpload
        label="Įkelti kandidatą"
        bucket="site-media"
        maxWidth={def.maxWidth}
        expectedRatio={def.ratioW / def.ratioH}
        onUploaded={handleImageUploaded}
      />
    );
  }

  // Video slot
  return <VideoFileUpload bucket="site-media" onUploaded={handleVideoUploaded} disabled={busy} />;
}

function VideoFileUpload({
  bucket,
  onUploaded,
  disabled,
}: {
  bucket: string;
  onUploaded: (data: { url: string; storagePath: string; width: number; height: number }) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      // Get dimensions
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => {
          reject(new Error("Nepavyko nuskaityti vaizdo įrašo"));
          URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(file);
      });

      const ext = file.name.split(".").pop() ?? "mp4";
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded({ url: data.publicUrl, storagePath: path, width: dims.width, height: dims.height });
      toast.success("Vaizdo įrašas įkeltas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko įkelti vaizdo įrašo");
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
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Video className="h-4 w-4" aria-hidden="true" />
        )}
        {busy ? "Keliama…" : "Įkelti vaizdo įrašą"}
      </button>
    </div>
  );
}
