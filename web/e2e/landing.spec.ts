/**
 * Smoke tests for the signed-out surface. The full authed flow
 * (generate plan → tick a day → reload → still ticked) is tracked in
 * issue #12 — it needs a test-only auth bypass to run in CI.
 */
import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the hero copy and Strava CTA when signed out", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByText(/Marathon training plans, shaped around your race/i),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /connect with strava/i }),
    ).toBeVisible();
  });

  test("shows the meta tiles (structure, growth, taper)", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/Structure/i)).toBeVisible();
    await expect(page.getByText(/Pyramidal blocks/i)).toBeVisible();
    await expect(page.getByText(/17 days/i)).toBeVisible();
  });
});
