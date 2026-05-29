"use server";

import { createClient } from "@supabase/supabase-js";
import { usernameToEmail, normalizeUsername } from "@/lib/auth";
import type { Database } from "@/types/database";

type CreatePlayerResult = {
  ok: boolean;
  message: string;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function createPlayerAction(input: {
  accessToken: string;
  displayName: string;
  username: string;
  password: string;
}): Promise<CreatePlayerResult> {
  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const password = input.password;

  if (!displayName || !username || password.length < 6) {
    return { ok: false, message: "Enter a display name, username, and password with at least 6 characters." };
  }

  try {
    const admin = getAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(input.accessToken);

    if (authError || !authData.user) {
      return { ok: false, message: "Your admin session could not be verified." };
    }

    const { data: callerProfile, error: profileError } = await admin
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || callerProfile?.role !== "admin") {
      return { ok: false, message: "Only admins can create player logins." };
    }

    const email = usernameToEmail(username);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        username,
        role: "player",
      },
    });

    if (createError || !created.user) {
      return { ok: false, message: createError?.message ?? "Could not create player." };
    }

    const { error: upsertError } = await admin.from("profiles").upsert({
      id: created.user.id,
      display_name: displayName,
      username,
      role: "player",
      avatar_url: null,
      total_points: 0,
    });

    if (upsertError) {
      return { ok: false, message: upsertError.message };
    }

    return { ok: true, message: `${displayName} can now log in as ${username}.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not create player." };
  }
}
