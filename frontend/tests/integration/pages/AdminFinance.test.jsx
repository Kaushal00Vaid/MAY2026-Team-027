// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminFinance, { defaultForm } from "@/pages/AdminFinance";

const api = vi.hoisted(() => ({
  createExpense: vi.fn(), downloadAnnualAudit: vi.fn(), generateBulkInvoices: vi.fn(), getAdminFinance: vi.fn(),
  getFinanceLedger: vi.fn(), saveBlob: vi.fn(),
}));
let currentUser;
let realtimeRefresh;

vi.mock("@/features/finance/api", () => ({
  ...api,
  financeError: (_error, fallback) => fallback,
}));
vi.mock("@/features/realtime/useRealtimeRefresh", () => ({ useRealtimeRefresh: (_scopes, refresh) => { realtimeRefresh = refresh; } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser }) }));
vi.mock("@/components/layout/DashboardLayout", () => ({ default: ({ children, sidebarItems, userRole }) => <div data-testid="layout" data-user-role={userRole}><nav>{sidebarItems.map((item) => <span key={item.label}>{item.label}</span>)}</nav>{children}</div> }));
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
    currentUser = { roles: ["super_admin"] };
    realtimeRefresh = undefined;
    api.getAdminFinance.mockReset().mockResolvedValue({ data: summary });
    api.getFinanceLedger.mockReset().mockResolvedValue({ data: ledger });
    api.downloadAnnualAudit.mockReset().mockResolvedValue({ data: new Blob(["audit"]) });
    api.generateBulkInvoices.mockReset().mockResolvedValue({ data: { created_count: 3, message: "Created 3 invoice(s) for 2026-09." } });
    api.createExpense.mockReset().mockResolvedValue({ data: { id: 10 } });
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

  it("reuses an idempotency key for the same bulk-invoice retry", async () => {
    api.generateBulkInvoices.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce({ data: { created_count: 3, message: "Created 3 invoice(s)." } });
    render(<AdminFinance />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Bulk Invoices" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate invoices" }));
    await screen.findByText("Invoice generation failed.");
    fireEvent.click(screen.getByRole("button", { name: "Generate invoices" }));
    await screen.findByText("Created 3 invoice(s).");
    expect(api.generateBulkInvoices.mock.calls[0][1]).toBe("coverage-test-key");
    expect(api.generateBulkInvoices.mock.calls[1][1]).toBe("coverage-test-key");
  });

  it("starts a new idempotent request when the invoice payload changes", async () => {
    crypto.randomUUID = vi.fn().mockReturnValueOnce("invoice-key-one").mockReturnValueOnce("invoice-key-two");
    api.generateBulkInvoices.mockRejectedValueOnce(new Error("validation")).mockResolvedValueOnce({ data: { created_count: 3, message: "Created 3 invoice(s)." } });
    render(<AdminFinance />);
    fireEvent.click(await screen.findByRole("button", { name: "Generate Bulk Invoices" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate invoices" }));
    await screen.findByText("Invoice generation failed.");
    fireEvent.change(screen.getByLabelText("Amount (INR)"), { target: { value: "1300" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate invoices" }));
    await screen.findByText("Created 3 invoice(s).");
    expect(api.generateBulkInvoices.mock.calls[0][1]).toBe("invoice-key-one");
    expect(api.generateBulkInvoices.mock.calls[1][1]).toBe("invoice-key-two");
  });

  it("records an expense and refreshes the first ledger page", async () => {
    render(<AdminFinance />);
    fireEvent.click(await screen.findByRole("button", { name: "Record Expense" }));
    fireEvent.change(screen.getByLabelText("Vendor"), { target: { value: "CleanCo" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Cleaning" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Monthly cleaning" } });
    fireEvent.change(screen.getByLabelText("Amount (INR)"), { target: { value: "500.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Record expense" }));

    await waitFor(() => expect(api.createExpense).toHaveBeenCalledWith(expect.objectContaining({
      vendor: "CleanCo", category: "Cleaning", description: "Monthly cleaning", amount_paise: 50025,
    })));
    expect(await screen.findByText("Expense recorded in the Master Ledger.")).toBeTruthy();
    expect(api.getFinanceLedger).toHaveBeenLastCalledWith(1, 10);
  });

  it("ignores older Finance loads that finish after the current page", async () => {
    render(<AdminFinance />);
    await screen.findByText("TX-1");

    let resolveOldSummary; let resolveOldLedger; let resolveNewSummary; let resolveNewLedger;
    api.getAdminFinance
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldSummary = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewSummary = resolve; }));
    api.getFinanceLedger
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOldLedger = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewLedger = resolve; }));

    await act(async () => { realtimeRefresh(); realtimeRefresh(); });
    await waitFor(() => expect(api.getFinanceLedger).toHaveBeenCalledTimes(3));

    await act(async () => {
      resolveNewSummary({ data: { ...summary, total_reserve_display: "₹NEW" } });
      resolveNewLedger({ data: { ...ledger, items: [{ ...ledger.items[0], id: 3, reference: "TX-NEW" }] } });
    });
    expect(await screen.findByText("TX-NEW")).toBeTruthy();

    await act(async () => {
      resolveOldSummary({ data: { ...summary, total_reserve_display: "₹OLD" } });
      resolveOldLedger({ data: { ...ledger, items: [{ ...ledger.items[0], id: 2, reference: "TX-OLD" }] } });
    });
    expect(screen.getByText("TX-NEW")).toBeTruthy();
    expect(screen.queryByText("TX-OLD")).toBeNull();
  });

  it("uses role-aware navigation and shows the allocation empty state", async () => {
    currentUser = { roles: ["committee_member"] };
    api.getAdminFinance.mockResolvedValue({ data: { ...summary, allocations: [] } });
    render(<AdminFinance />);
    expect(await screen.findByText("No fund allocations configured.")).toBeTruthy();
    expect(screen.queryByText("User Roles")).toBeNull();
    expect(screen.getByTestId("layout").getAttribute("data-user-role")).toBe("Committee Member");
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

describe("Finance date defaults", () => {
  it("selects the immediate next month at month end", () => {
    expect(defaultForm(new Date(2026, 0, 31))).toMatchObject({ period: "2026-02", due_date: "2026-02-15" });
    expect(defaultForm(new Date(2026, 11, 31))).toMatchObject({ period: "2027-01", due_date: "2027-01-15" });
  });
});
