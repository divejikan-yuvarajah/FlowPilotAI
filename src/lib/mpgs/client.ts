import { env } from "@/lib/env";
import type {
  CreateSessionRequest,
  CreateSessionResponse,
  MpgsCheckoutSession,
  MpgsOrderStatus,
} from "./types";

function basicAuth(): string {
  const credentials = `merchant.${env.MPGS_MERCHANT_ID}:${env.MPGS_API_PASSWORD}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

function apiUrl(path: string): string {
  return `${env.MPGS_BASE_URL}/api/rest/version/${env.MPGS_API_VERSION}/merchant/${env.MPGS_MERCHANT_ID}${path}`;
}

async function mpgsCall<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = apiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    throw new Error(
      `MPGS network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const errObj = body.error as Record<string, string> | undefined;
    const errMsg =
      errObj?.cause ?? errObj?.explanation ?? `HTTP ${res.status}`;
    throw new Error(`MPGS error: ${errMsg}`);
  }
  return body as T;
}

/**
 * Create a Hosted Checkout session for an invoice payment.
 * orderId is unique per attempt (invoice prefix + timestamp) so retries get fresh sessions.
 */
export async function createCheckoutSession(
  req: CreateSessionRequest,
): Promise<CreateSessionResponse> {
  const orderId = `${req.invoiceId.slice(0, 8)}-${Date.now()}`;
  const returnUrl = `${env.MPGS_RETURN_URL_BASE}/pay/${req.invoiceId}/success?orderId=${orderId}`;
  const cancelUrl = `${env.MPGS_RETURN_URL_BASE}/pay/${req.invoiceId}/failure?orderId=${orderId}`;

  const payload: Record<string, unknown> = {
    apiOperation: "CREATE_CHECKOUT_SESSION",
    interaction: {
      operation: "PURCHASE",
      returnUrl,
      cancelUrl,
      merchant: {
        name: "FlowPilot AI",
        url: env.MPGS_RETURN_URL_BASE,
      },
      displayControl: {
        billingAddress: "HIDE",
        customerEmail: req.customerEmail ? "OPTIONAL" : "HIDE",
      },
    },
    order: {
      id: orderId,
      amount: req.amount.toFixed(2),
      currency: req.currency ?? env.MPGS_CURRENCY,
      description: req.description ?? `Invoice ${req.invoiceId}`,
    },
  };

  if (req.customerEmail || req.customerName) {
    const nameParts = (req.customerName ?? "").split(" ");
    payload.customer = {
      ...(req.customerEmail ? { email: req.customerEmail } : {}),
      ...(req.customerName
        ? {
            firstName: nameParts[0] ?? "",
            lastName: (nameParts.slice(1).join(" ") || nameParts[0]) ?? "",
          }
        : {}),
    };
  }

  const data = await mpgsCall<Record<string, unknown>>("/session", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (data.result !== "SUCCESS") {
    throw new Error(`MPGS session creation failed: ${JSON.stringify(data)}`);
  }

  return {
    session: data.session as MpgsCheckoutSession,
    orderId,
    successIndicator: data.successIndicator as string,
    merchantId: data.merchant as string,
  };
}

/**
 * Retrieve the status of an order after the customer has been redirected back.
 */
export async function getOrderStatus(orderId: string): Promise<MpgsOrderStatus> {
  const data = await mpgsCall<Record<string, unknown>>(
    `/order/${encodeURIComponent(orderId)}`,
  );

  const txns = data.transaction as unknown[] | undefined;

  return {
    orderId: (data.id as string | undefined) ?? orderId,
    result: (data.result as MpgsOrderStatus["result"] | undefined) ?? "UNKNOWN",
    status:
      (data.status as string | undefined) ??
      (
        ((txns?.at(-1) as Record<string, unknown> | undefined)
          ?.response as Record<string, string> | undefined)?.gatewayCode
      ) ??
      "UNKNOWN",
    amount: parseFloat((data.amount as string | undefined) ?? "0"),
    currency: (data.currency as string | undefined) ?? env.MPGS_CURRENCY,
    capturedAmount: parseFloat(
      (data.totalCapturedAmount as string | undefined) ?? "0",
    ),
    transactions: txns,
    lastTransaction: txns?.at(-1),
    raw: data,
  };
}

/** URL for Mastercard's checkout.js frontend library. */
export function checkoutScriptUrl(): string {
  return `${env.MPGS_BASE_URL}/static/checkout/checkout.min.js`;
}
