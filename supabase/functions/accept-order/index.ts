import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type AcceptOrderBody = {
  orderId?: string;
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

  let body: AcceptOrderBody;

  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 400);
  }

  if (!body.orderId || !uuidPattern.test(body.orderId)) {
    return json({ success: false, message: "A valid orderId is required" }, 400);
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

  if (profile.role !== "worker" || !profile.is_active) {
    return json({ success: false, message: "Only active workers can accept orders" }, 403);
  }

  // 4. Use service role only after authorization succeeds.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 7. Validate order status transition.
  // This transition is allowed only for an unassigned PLACED order:
  // PLACED -> ASSIGNED.
  const { data: acceptedOrder, error: acceptError } = await adminClient
    .from("orders")
    .update({
      worker_id: user.id,
      status: "ASSIGNED",
    })
    .eq("id", body.orderId)
    .eq("status", "PLACED")
    .is("worker_id", null)
    .select("id, customer_id, worker_id, status")
    .maybeSingle();

  if (acceptError) {
    return json({ success: false, message: acceptError.message }, 500);
  }

  if (!acceptedOrder) {
    return json(
      {
        success: false,
        message: "Order is not available to accept",
      },
      409,
    );
  }

  const { error: historyError } = await adminClient.from("order_status_history").insert({
    order_id: acceptedOrder.id,
    actor_id: user.id,
    old_status: "PLACED",
    new_status: "ASSIGNED",
    note: "Order accepted by worker",
  });

  if (historyError) {
    return json({ success: false, message: historyError.message }, 500);
  }

  // 5 and 6 are intentionally not used here.
  // Price recalculation and stock validation belong in place-order, not accept-order.
  // 8 is intentionally not used here because accepting an order is a worker action,
  // while audit_logs are reserved for admin/system changes in the current spec.
  // 9. The function trusts only the orderId shape from the client; status and worker
  // assignment are decided by this function and the database.
  return json({
    success: true,
    order: acceptedOrder,
  });
});
