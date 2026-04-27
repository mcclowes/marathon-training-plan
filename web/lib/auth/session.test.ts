import { describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

import { requireUserId } from "./session";

describe("requireUserId", () => {
  it("returns the athleteId when a session is present", async () => {
    mockAuth.mockResolvedValueOnce({ user: { athleteId: "123" } });
    await expect(requireUserId()).resolves.toBe("123");
  });

  it("throws when no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    await expect(requireUserId()).rejects.toThrow(/Unauthorized/);
  });

  it("throws when session exists but no athleteId", async () => {
    mockAuth.mockResolvedValueOnce({ user: { name: "x" } });
    await expect(requireUserId()).rejects.toThrow(/Unauthorized/);
  });
});
