import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type CompleteProfileBody = {
  fullName?: string;
  phone?: string | null;
  address?: {
    label?: string;
    houseNumber?: string;
    street?: string;
    landmark?: string | null;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: corsHeaders,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ success: false, message: "Function environment is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  const jwt = authHeader?.replace(/^Bearer\s+/i, "");

  if (!jwt) {
    return json({ success: false, message: "Missing bearer token" }, 401);
  }

  let body: CompleteProfileBody;

  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 400);
  }

  const fullName = body.fullName?.trim();
  const address = body.address;

  if (!fullName) {
    return json({ success: false, message: "Full name is required" }, 400);
  }

  if (!address?.houseNumber?.trim() || !address.street?.trim() || !address.city?.trim() || !address.state?.trim() || !address.pincode?.trim()) {
    return json({ success: false, message: "Complete address is required" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt);

  if (userError || !user) {
    return json({ success: false, message: "Invalid or expired session" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const authPhone = user.phone ?? null;
  const profilePhone = body.phone?.trim() || authPhone;

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfileError) {
    return json({ success: false, message: existingProfileError.message }, 400);
  }

  if (existingProfile) {
    return json({ success: false, message: "Profile already exists" }, 409);
  }

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: user.id,
    role: "customer",
    full_name: fullName,
    phone: profilePhone,
    pincode: address.pincode.trim(),
  });

  if (profileError) {
    return json({ success: false, message: profileError.message }, 400);
  }

  const { error: addressError } = await adminClient.from("addresses").insert({
    user_id: user.id,
    label: address.label?.trim() || "Home",
    house_number: address.houseNumber.trim(),
    street: address.street.trim(),
    landmark: address.landmark?.trim() || null,
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim(),
    is_default: true,
  });

  if (addressError) {
    await adminClient.from("profiles").delete().eq("id", user.id);
    return json({ success: false, message: addressError.message }, 400);
  }

  return json({
    success: true,
    profile: {
      id: user.id,
      role: "customer",
      fullName,
      phone: profilePhone,
    },
  });
});
