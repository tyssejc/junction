import { expect, test } from "@playwright/test";

const COOKIE_NAME = "jct-consent";

/** Clear the consent cookie so the banner reappears. */
async function clearConsentCookie(page: any) {
  await page.context().clearCookies();
}

/** Get the consent cookie value, if set. */
async function getConsentCookie(page: any): Promise<Record<string, boolean> | null> {
  const cookies = await page.context().cookies();
  const found = cookies.find((c: any) => c.name === COOKIE_NAME);
  if (!found) return null;
  try {
    return JSON.parse(decodeURIComponent(found.value));
  } catch {
    return null;
  }
}

test.describe("Demo consent banner", () => {
  test.beforeEach(async ({ page }) => {
    await clearConsentCookie(page);
  });

  test("1 — Banner appears on first visit", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();
    // Should contain the space-themed copy
    await expect(banner).toContainText("Houston, we have cookies");
  });

  test("2 — Accept All dismisses banner and events flow", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("consent-banner");
    await expect(banner).toBeVisible();

    // Accept all
    await page.getByTestId("consent-accept-all").click();

    // Banner should be gone
    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    // Cookie should be set with all true
    const cookie = await getConsentCookie(page);
    expect(cookie).toEqual({ analytics: true, marketing: true, personalization: true });

    // Navigate to store — events should fire (demo-sink captures them)
    await page.goto("/store");
    await page.waitForTimeout(500);

    // Settings button should be visible after dismissal
    await expect(page.getByTestId("consent-settings-button")).toBeVisible();
  });

  test("3 — Reject All dismisses banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("consent-banner")).toBeVisible();

    await page.getByTestId("consent-reject-all").click();

    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    const cookie = await getConsentCookie(page);
    expect(cookie).toEqual({ analytics: false, marketing: false, personalization: false });
  });

  test("4 — Manage Preferences shows granular toggles", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("consent-banner")).toBeVisible();

    // Open preferences panel
    await page.getByTestId("consent-manage-preferences").click();

    // Toggles should be visible
    await expect(page.getByTestId("consent-toggle-analytics")).toBeVisible();
    await expect(page.getByTestId("consent-toggle-marketing")).toBeVisible();
    await expect(page.getByTestId("consent-toggle-personalization")).toBeVisible();

    // Enable only analytics
    await page.getByTestId("consent-toggle-analytics").check();

    // Save custom preferences
    await page.getByTestId("consent-save-preferences").click();

    // Banner dismissed
    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    // Verify cookie
    const cookie = await getConsentCookie(page);
    expect(cookie?.analytics).toBe(true);
    expect(cookie?.marketing).toBe(false);
    expect(cookie?.personalization).toBe(false);
  });

  test("5 — Cookie persistence across page loads", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("consent-accept-all").click();
    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Banner should NOT reappear
    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    // Settings button should still be available
    await expect(page.getByTestId("consent-settings-button")).toBeVisible();
  });

  test("6 — Re-manage preferences via settings button", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("consent-accept-all").click();
    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    // Click the settings button to reopen
    await page.getByTestId("consent-settings-button").click();

    // Banner should reappear in manage mode
    await expect(page.getByTestId("consent-banner")).toBeVisible();

    // Should be able to reject all from manage mode
    await page.getByTestId("consent-reject-all").click();

    const cookie = await getConsentCookie(page);
    expect(cookie).toEqual({ analytics: false, marketing: false, personalization: false });
  });

  test("7 — Reset on consent page clears cookie and banner reappears", async ({ page }) => {
    // First accept all
    await page.goto("/");
    await page.getByTestId("consent-accept-all").click();
    await expect(page.getByTestId("consent-banner")).not.toBeVisible();

    // Go to consent demo page
    await page.goto("/demos/consent");
    await page.waitForLoadState("domcontentloaded");

    // Click reset banner button
    await page.getByTestId("reset-banner").click();

    // Banner should reappear
    await expect(page.getByTestId("consent-banner")).toBeVisible();

    // Cookie should be cleared
    const cookie = await getConsentCookie(page);
    expect(cookie).toBeNull();
  });
});
