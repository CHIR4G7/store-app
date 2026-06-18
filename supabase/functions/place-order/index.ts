import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type PlaceOrderBody = {
  addressId?: string | null;
  fulfillmentType?: "delivery" | "pickup";
  notes?: string;
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

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  let body: PlaceOrderBody;

  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 400);
  }

  const fulfillmentType = body.fulfillmentType;
  const addressId = body.addressId ?? null;
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;

  if (fulfillmentType !== "delivery" && fulfillmentType !== "pickup") {
    return json({ success: false, message: "fulfillmentType must be delivery or pickup" }, 400);
  }

  if (fulfillmentType === "delivery" && (!addressId || !uuidPattern.test(addressId))) {
    return json({ success: false, message: "A valid addressId is required for delivery" }, 400);
  }

  if (addressId && !uuidPattern.test(addressId)) {
    return json({ success: false, message: "addressId must be a valid UUID" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

  // 1. Read and verify the caller JWT.
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt);

  if (userError || !user) {
    return json({ success: false, message: "Invalid or expired session" }, 401);
  }

  // 2. Resolve the caller from profiles.
  // 3. Validate the caller role in the database.
  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return json({ success: false, message: "Profile not found" }, 403);
  }

  if (profile.role !== "customer" || !profile.is_active) {
    return json({ success: false, message: "Only active customers can place orders" }, 403);
  }

  // 4. Use service role only after authorization succeeds.
  // 5, 6, 7 and 9 happen inside public.place_order:
  // - prices are recalculated from products
  // - stock is validated and reduced
  // - the initial status is controlled by the database
  // - client-supplied totals, status, and customer ids are ignored
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminClient.rpc("place_order", {
    p_customer_id: user.id,
    p_address_id: addressId,
    p_fulfillment_type: fulfillmentType,
    p_notes: notes,
  });

  if (error) {
    return json({ success: false, message: error.message }, 400);
  }

  return json(data);
});
