export interface MpgsCheckoutSession {
  id: string;
  updateStatus: string;
  version: string;
}

export interface CreateSessionRequest {
  invoiceId: string;
  amount: number;
  currency?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
}

export interface CreateSessionResponse {
  session: MpgsCheckoutSession;
  orderId: string;
  successIndicator: string;
  merchantId: string;
}

export type MpgsResult = "SUCCESS" | "FAILURE" | "PENDING" | "UNKNOWN";

export interface MpgsOrderStatus {
  orderId: string;
  result: MpgsResult;
  status: string;
  amount: number;
  currency: string;
  capturedAmount?: number;
  transactions?: unknown[];
  lastTransaction?: unknown;
  raw?: unknown;
}
