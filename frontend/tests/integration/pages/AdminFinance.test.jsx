// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminFinance from "@/pages/AdminFinance";

const api = vi.hoisted(() => ({
  downloadAnnualAudit: vi.fn(), generateBulkInvoices: vi.fn(), getAdminFinance: vi.fn(),
  getFinanceLedger: vi.fn(), saveBlob: vi.fn(),
}));

vi.mock("@/features/finance/api", () => ({
  ...api,
  financeError: (_error, fallback) => fallback,
}));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: () => undefined }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("recharts", () => ({
  Cell: () => null, Pie: ({ children }) => <div>{children}</div>, PieChart: ({ children }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }) => <div>{children}</div>, Tooltip: () => null,
}));

const summary = {
  allocations: [{ name: "Maintenance", value: 50, color: "#123456" }],
  total_reserve_display: "₹5,00,000", outstanding_display: "₹10,000",
  defaulter_count: 2, collected_this_month_display: "₹1,20,000",
};
const ledger = {
  items: [{ id: 1, date: "2026-08-11", reference: "TX-1", description: "Payment", category: "Maintenance", unit: "A-101", direction: "credit", amount_display: "₹1,200" }],
  total: 11, page: 1, page_size: 10,
};

describe("AdminFinance", () => {
  beforeEach(() => {
    api.getAdminFinance.mockReset().mockResolvedValue({ data: summary });
    api.getFinanceLedger.mockReset().mockResolvedValue({ data: ledger });
    api.downloadAnnualAudit.mockReset().mockResolvedValue({ data: new Blob(["audit"]) });
    api.generateBulkInvoices.mockReset().mockResolvedValue({ data: { created_count: 3, message: "Created 3 invoice(s) for 2026-09." } });
    api.saveBlob.mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "coverage-test-key" });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("loads the finance summary and paginates the ledger", async () => {
    render(<AdminFinance />);
    expect(await screen.findByText("₹5,00,000")).toBeTruthy();
    expect(screen.getByText("TX-1")).toBeTruthy();
    expect(api.getFinanceLedger).toHaveBeenCalledWith(1, 10);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(api.getFinanceLedger).toHaveBeenLastCalledWith(2, 10));
  });

  it("downloads the annual audit", async () => {
    render(<AdminFinance />);
    fireEvent.click(await screen.findByRole("button", { name: /Download .* Annual Audit/i }));
    await screen.findByText(/annual audit downloaded/i);
    expect(api.downloadAnnualAudit).toHaveBeenCalledWith(new Date().getFullYear());
    expect(api.saveBlob).toHaveBeenCalledWith({ data: expect.any(Blob) }, `societysync-annual-audit-${new Date().getFullYear()}.pdf`);
  });

  it("submits bulk invoices with paise and an idempotency key", async () => {
    render(<AdminFinance />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Bulk Invoices" }));
    fireEvent.change(screen.getByLabelText("Amount (INR)"), { target: { value: "1500.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate invoices" }));

    await waitFor(() => expect(api.generateBulkInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ amount_paise: 150050, purpose: "Monthly Maintenance" }),
      "coverage-test-key",
    ));
    expect(await screen.findByText("Created 3 invoice(s) for 2026-09.")).toBeTruthy();
  });

  it("explains when no new invoice can be generated", async () => {
    api.generateBulkInvoices.mockResolvedValueOnce({ data: {
      created_count: 0,
      message: "No invoices created because every eligible flat is already invoiced for this period and purpose.",
    } });
    render(<AdminFinance />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Bulk Invoices" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate invoices" }));

    expect(await screen.findByText(/every eligible flat is already invoiced/i)).toBeTruthy();
  });

  it("offers retry when finance loading fails", async () => {
    api.getAdminFinance.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ data: summary });
    render(<AdminFinance />);
    expect((await screen.findByRole("alert")).textContent).toContain("Unable to load financial records.");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("₹5,00,000")).toBeTruthy();
  });
});
