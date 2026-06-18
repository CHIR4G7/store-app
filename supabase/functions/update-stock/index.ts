import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type UpdateStockBody = {
  productId?: string;
  newStock?: number;
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

  let body: UpdateStockBody;

  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 400);
  }

  if (!body.productId || !uuidPattern.test(body.productId)) {
    return json({ success: false, message: "A valid productId is required" }, 400);
  }

  if (
    typeof body.newStock !== "number" ||
    !Number.isInteger(body.newStock) ||
    body.newStock < 0
  ) {
    return json({ success: false, message: "newStock must be a whole number zero or greater" }, 400);
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

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return json({ success: false, message: "Profile not found" }, 403);
  }

  if (profile.role !== "admin" || !profile.is_active) {
    return json({ success: false, message: "Only active admins can update product stock" }, 403);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await adminClient.rpc("update_product_stock", {
    p_actor_id: user.id,
    p_product_id: body.productId,
    p_new_stock: body.newStock,
  });

  if (error) {
    return json({ success: false, message: error.message }, 400);
  }

  return json(data);
});
