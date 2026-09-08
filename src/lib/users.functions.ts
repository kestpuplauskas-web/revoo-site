import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppUserRole = "admin" | "developer";

export type ManagedUser = {
  userId: string;
  role: AppUserRole;
  createdAt: string;
  email: string;
  fullName: string;
  lastSignInAt: string | null;
};

const ALLOWED_HOSTS = ["revoo.site", "www.revoo.site", "localhost", "127.0.0.1"];

function safeRedirect(origin: string | undefined): string {
  const fallback = "https://revoo.site/slaptazodis";
  if (!origin) return fallback;
  try {
    const u = new URL(origin);
    const ok =
      (u.protocol === "http:" || u.protocol === "https:") &&
      (ALLOWED_HOSTS.includes(u.hostname) || u.hostname.endsWith(".lovable.app"));
    return ok ? `${u.origin}/slaptazodis` : fallback;
  } catch {
    return fallback;
  }
}

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await (context.supabase.rpc as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("Neturite teisių valdyti naudotojų.");
}

async function isDeveloper(context: { supabase: { rpc: Function }; userId: string }) {
  const { data, error } = await (context.supabase.rpc as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)("has_role", {
    _user_id: context.userId,
    _role: "developer",
  });
  if (error) throw new Error(error.message);
  return data === true;
}

async function assertDeveloper(context: { supabase: { rpc: Function }; userId: string }) {
  if (!(await isDeveloper(context))) {
    throw new Error("Rolės keisti ir naudotojų šalinti gali tik programuotojas.");
  }
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    return { isDeveloper: await isDeveloper(context) };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{ user_id: string; role: string; created_at: string }>;
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const info = new Map(
      (authUsers?.users ?? []).map((u) => [
        u.id,
        {
          email: u.email ?? "",
          fullName: ((u.user_metadata as { full_name?: string } | null)?.full_name ?? "").trim(),
          lastSignInAt: u.last_sign_in_at ?? null,
        },
      ]),
    );

    // Vienam naudotojui rodome aukščiausią rolę.
    const byUser = new Map<string, ManagedUser>();
    for (const r of rows) {
      const role: AppUserRole = r.role === "developer" ? "developer" : "admin";
      const current = byUser.get(r.user_id);
      if (current && current.role === "developer") continue;
      byUser.set(r.user_id, {
        userId: r.user_id,
        role,
        createdAt: r.created_at,
        email: info.get(r.user_id)?.email ?? "",
        fullName: info.get(r.user_id)?.fullName ?? "",
        lastSignInAt: info.get(r.user_id)?.lastSignInAt ?? null,
      });
    }
    return [...byUser.values()];
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email(),
        role: z.enum(["admin", "developer"]),
        fullName: z.string().trim().max(120).optional(),
        origin: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = safeRedirect(data.origin);

    let userId: string | null = null;
    let invited = true;

    const invite = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo,
      ...(data.fullName ? { data: { full_name: data.fullName } } : {}),
    });

    if (invite.error) {
      if (!/registered|exists/i.test(invite.error.message)) {
        throw new Error(invite.error.message);
      }
      // Naudotojas jau egzistuoja — siunčiame slaptažodžio susikūrimo laišką.
      invited = false;
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase())?.id ?? null;
      if (!userId) throw new Error("Nepavyko rasti šio naudotojo.");
      if (data.fullName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { full_name: data.fullName },
        });
      }
      const reset = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo });
      if (reset.error) throw new Error(reset.error.message);
    } else {
      userId = invite.data.user?.id ?? null;
      if (!userId) throw new Error("Nepavyko sukurti naudotojo.");
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role } as never, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, userId, invited };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "developer"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Negalite ištrinti savo paskyros.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
