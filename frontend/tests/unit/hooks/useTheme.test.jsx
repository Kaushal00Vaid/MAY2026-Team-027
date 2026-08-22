// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { initializeTheme, useTheme } from "@/hooks/useTheme";

describe("useTheme", () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem("ss-theme");
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
  });

  it("applies and persists the selected color theme", () => {
    localStorage.setItem("ss-theme", "light");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    act(() => result.current.toggle());

    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem("ss-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    act(() => result.current.toggle());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("restores the saved theme before the application renders", () => {
    localStorage.setItem("ss-theme", "dark");

    expect(initializeTheme()).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
