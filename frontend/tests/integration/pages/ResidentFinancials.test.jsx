// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ResidentFinancials from "@/pages/ResidentFinancials";

const api = vi.hoisted(() => ({
  completePayment: vi.fn(),
  downloadReceipt: vi.fn(),
  downloadStatement: vi.fn(),
  getResidentFinance: vi.fn(),
  saveBlob: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useLocation: () => ({ state: null }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: () => undefined }));
vi.mock("@/features/finance/api", () => ({
  ...api,
  financeError: (_error, fallback) => fallback,
}));

const summary = {
  outstanding_paise: 10_000,
  outstanding_display: "₹100.00",
  late_fee_display: "₹0.00",
  next_due_date: "2026-08-10",
  invoices: [],
  ledger: [],
  allocations: [],
};

describe("ResidentFinancials", () => {
  beforeEach(() => {
    api.completePayment.mockReset().mockResolvedValue({ data: { receipt_number: "RCP-1" } });
    api.downloadReceipt.mockReset();
    api.downloadStatement.mockReset();
    api.getResidentFinance.mockReset();
    api.saveBlob.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "resident-payment-key" });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps the initial failure recoverable and renders empty allocations after retry", async () => {
    api.getResidentFinance
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ data: summary });

    render(<ResidentFinancials />);

    expect((await screen.findByRole("alert")).textContent).toContain("Unable to load your financial records.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("₹100.00")).toBeTruthy();
    expect(screen.getByText("No allocation data available.")).toBeTruthy();
    expect(api.getResidentFinance).toHaveBeenCalledTimes(2);
  });

  it("pays the earliest-due open invoice regardless of response ordering", async () => {
    const response = {
      data: {
        ...summary,
        invoices: [
          { id: 20, invoice_number: "INV-LATER", due_date: "2026-09-10", status: "issued", amount_display: "₹100.00" },
          { id: 10, invoice_number: "INV-EARLIER", due_date: "2026-07-10", status: "overdue", amount_display: "₹120.00" },
          { id: 5, invoice_number: "INV-PAID", due_date: "2026-06-10", status: "paid", amount_display: "₹90.00" },
        ],
      },
    };
    api.getResidentFinance.mockResolvedValue(response);

    render(<ResidentFinancials />);
    await screen.findByText("₹100.00");
    fireEvent.click(screen.getByRole("button", { name: /Pay Now/i }));

    expect(screen.getByText("Invoice INV-EARLIER")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Confirm Payment/i }));
    await waitFor(() => expect(api.completePayment).toHaveBeenCalledWith(
      { invoice_id: 10, method: "bank", simulate_failure: false },
      "resident-payment-key",
    ));
  });
});
