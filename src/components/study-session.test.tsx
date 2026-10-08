// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Entry } from "@/lib/vocab/queue";

const recordReview = vi.fn();
vi.mock("@/app/actions/vocab", () => ({ recordReview: (...args: unknown[]) => recordReview(...args) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { StudySession } from "./study-session";

const entry = (id: string, english: string, german: string, options: string[] | null = null): Entry => ({
  key: `${id}:0`, id, english, prompt: english, answer: german, example: null, dir: "en-de", attempt: 0, options,
});
const props = { backHref: "/back", againHref: "/again" };

beforeEach(() => recordReview.mockResolvedValue({ ok: true }));
afterEach(() => {
  cleanup();
  recordReview.mockReset();
});

describe("flashcards", () => {
  it("flips the card, rates it and saves the rating", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="cards" entries={[entry("a", "to run", "rennen; laufen")]} {...props} />);

    expect(screen.getByTestId("prompt")).toHaveTextContent("to run");
    expect(screen.queryByTestId("answer")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Antwort zeigen" }));
    expect(screen.getByTestId("answer")).toHaveTextContent("rennen; laufen");

    await user.click(screen.getByRole("button", { name: "Gut" }));
    expect(recordReview).toHaveBeenCalledWith({ cardId: "a", rating: 2, mode: "cards" });
    expect(screen.getByTestId("summary")).toHaveTextContent("1 von 1");
  });

  it("supports the keyboard: space flips, 1 = again, then the card returns once", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="cards" entries={[entry("a", "house", "Haus")]} {...props} />);
    await user.keyboard(" ");
    expect(screen.getByTestId("answer")).toBeVisible();
    await user.keyboard("1");
    expect(recordReview).toHaveBeenLastCalledWith({ cardId: "a", rating: 0, mode: "cards" });
    expect(screen.getByText(/Wiederholung/)).toBeVisible();
    await user.keyboard(" ");
    await user.keyboard("2");
    expect(screen.getByTestId("summary")).toHaveTextContent("0 von 1");
    expect(within(screen.getByTestId("summary")).getByText("house")).toBeVisible();
  });
});

describe("write mode", () => {
  it("accepts any meaning case-insensitively and shows 'Richtig'", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="write" entries={[entry("a", "to run", "rennen; laufen")]} {...props} />);
    await user.type(screen.getByLabelText(/Antwort: Bedeutung/), "Laufen");
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(screen.getByTestId("feedback")).toHaveTextContent("Richtig!");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(recordReview).toHaveBeenCalledWith({ cardId: "a", rating: 2, mode: "write" });
  });

  it("flags a typo as correct-but-hard and reveals the right spelling", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="write" entries={[entry("a", "achieve", "erreichen")]} {...props} />);
    await user.type(screen.getByLabelText(/Antwort: Bedeutung/), "erreichn");
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(screen.getByTestId("feedback")).toHaveTextContent("Fast richtig");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(recordReview).toHaveBeenCalledWith({ cardId: "a", rating: 1, mode: "write" });
  });

  it("shows the correct answer after a wrong one and repeats the word", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="write" entries={[entry("a", "house", "Haus")]} {...props} />);
    await user.type(screen.getByLabelText(/Antwort: Bedeutung/), "Maus");
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(screen.getByTestId("feedback")).toHaveTextContent("Leider falsch");
    expect(screen.getByTestId("feedback")).toHaveTextContent("Haus");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(recordReview).toHaveBeenCalledWith({ cardId: "a", rating: 0, mode: "write" });
    expect(screen.getByText(/Wiederholung/)).toBeVisible();
    expect(screen.getByLabelText(/Antwort: Bedeutung/)).toHaveValue(""); // input is cleared
  });
});

describe("choice mode and summary", () => {
  const options = ["Haus", "Maus", "Baum", "Hund"];

  it("marks the right option, locks the choice and continues", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="choice" entries={[entry("a", "house", "Haus", options)]} {...props} />);
    await user.click(screen.getByRole("button", { name: "Maus" }));
    expect(screen.getByRole("button", { name: "Haus" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(recordReview).toHaveBeenCalledWith({ cardId: "a", rating: 0, mode: "choice" });
  });

  it("lets the user practise only the missed words again", async () => {
    const user = userEvent.setup();
    render(<StudySession mode="choice" entries={[entry("a", "house", "Haus", options), entry("b", "tree", "Baum", options)]} {...props} />);
    await user.click(screen.getByRole("button", { name: "Maus" })); // wrong
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("button", { name: "Baum" })); // right
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("button", { name: "Haus" })); // retry of "house", right
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByTestId("summary")).toHaveTextContent("1 von 2");
    await user.click(screen.getByRole("button", { name: "Falsche nochmals üben" }));
    expect(screen.getByTestId("prompt")).toHaveTextContent("house");
    expect(screen.getByText("1 / 1")).toBeVisible();
  });

  it("keeps working and warns when saving fails", async () => {
    recordReview.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<StudySession mode="cards" entries={[entry("a", "house", "Haus")]} {...props} />);
    await user.click(screen.getByRole("button", { name: "Antwort zeigen" }));
    await user.click(screen.getByRole("button", { name: "Gut" }));
    expect(screen.getByTestId("summary")).toBeVisible();
    expect(await screen.findByText(/nicht gespeichert/)).toBeVisible();
  });
});
