// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResidentPass } from "./useResidentPass";

const getResidentId = vi.fn();

vi.mock("@/features/security/api", () => ({
  getResidentId: (...args) => getResidentId(...args),
  securityError: (_error, fallback) => fallback,
}));

describe("useResidentPass", () => {
  beforeEach(() => getResidentId.mockReset());
  afterEach(cleanup);

  it("loads and refreshes the server-issued resident credential", async () => {
    getResidentId
      .mockResolvedValueOnce({ data: { token: "token-one", expires_at: "2026-08-10T18:00:00Z" } })
      .mockResolvedValueOnce({ data: { token: "token-two", expires_at: "2026-08-10T18:00:25Z" } });

    const { result } = renderHook(() => useResidentPass());
    await waitFor(() => expect(result.current.pass?.token).toBe("token-one"));

    await act(() => result.current.refresh());
    expect(result.current.pass?.token).toBe("token-two");
    expect(result.current.error).toBe("");
  });

  it("removes an expired credential when refresh fails", async () => {
    getResidentId
      .mockResolvedValueOnce({ data: { token: "token-one", expires_at: "2026-08-10T18:00:00Z" } })
      .mockRejectedValueOnce(new Error("network unavailable"));

    const { result } = renderHook(() => useResidentPass());
    await waitFor(() => expect(result.current.pass?.token).toBe("token-one"));

    await act(() => result.current.refresh());
    expect(result.current.pass).toBeNull();
    expect(result.current.error).toBe("Unable to load your digital pass.");
  });
});
