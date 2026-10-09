// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { THEME_KEY } from "@/lib/theme";
import { ThemeToggle } from "./theme-toggle";

function mockSystem(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mockSystem(false);
});
afterEach(cleanup);

describe("ThemeToggle (segmented)", () => {
  it("shows the system option as active by default and forces dark on click", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Dunkel" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "System" })).toHaveAttribute("aria-pressed", "false");
  });

  it("goes back to the system with one click", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_KEY, "light");
    render(<ThemeToggle />);
    expect(await screen.findByRole("button", { name: "Hell" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "System" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();
  });
});

describe("ThemeToggle (icon)", () => {
  it("offers dark when the page is light and flips back", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle variant="icon" />);
    await user.click(screen.getByRole("button", { name: "Dunkelmodus einschalten" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.click(screen.getByRole("button", { name: "Hellmodus einschalten" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("starts from the system theme: a dark system offers light first", async () => {
    mockSystem(true);
    const user = userEvent.setup();
    render(<ThemeToggle variant="icon" />);
    expect(await screen.findByRole("button", { name: "Hellmodus einschalten" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hellmodus einschalten" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
