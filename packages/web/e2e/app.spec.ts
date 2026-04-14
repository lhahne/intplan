import { test, expect } from "@playwright/test";

test.describe("app loads and generates a plan", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders header and sidebar", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("INTPLAN");
    await expect(page.locator(".panel-section-title").first()).toHaveText("Service");
    await expect(page.locator(".panel-section-title").nth(1)).toHaveText("Training");
    await expect(page.locator(".panel-section-title").nth(2)).toHaveText(
      "Current Fitness",
    );
  });

  test("generates plan with default parameters", async ({ page }) => {
    await expect(page.locator(".summary-card")).toHaveCount(4);
    await expect(page.locator(".summary-label").first()).toHaveText("Current CPFI");
    await expect(page.locator(".phase-timeline .phase-segment").first()).toBeVisible();
    await expect(page.locator(".week-card").first()).toBeVisible();
  });

  test("displays component breakdown with progress bars", async ({ page }) => {
    await expect(page.locator(".component-row")).toHaveCount(6);
    await expect(page.locator(".comp-progress")).toHaveCount(6);
  });
});

test.describe("parameter panel interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("changing service level updates the plan", async ({ page }) => {
    const targetCard = page.locator(".summary-card").nth(1);
    const before = await targetCard.locator(".summary-value").textContent();

    const serviceSelect = page.locator(".panel-section").first().locator("select").last();
    await serviceSelect.selectOption("special_forces");

    await expect(targetCard.locator(".summary-sub")).toHaveText("special forces");
    const after = await targetCard.locator(".summary-value").textContent();
    expect(after).not.toBe(before);
  });

  test("selecting equipment chips toggles their state", async ({ page }) => {
    const chip = page.locator(".equipment-chip").first();
    await expect(chip).not.toHaveClass(/selected/);

    await chip.click();
    await expect(chip).toHaveClass(/selected/);

    await chip.click();
    await expect(chip).not.toHaveClass(/selected/);
  });

  test("switching fitness level updates CPFI", async ({ page }) => {
    const cpfiValue = page.locator(".summary-card").first().locator(".summary-value");
    const before = await cpfiValue.textContent();

    await page.locator(".level-card").nth(3).click(); // Athletic
    await expect(page.locator(".level-card").nth(3)).toHaveClass(/selected/);

    const after = await cpfiValue.textContent();
    expect(after).not.toBe(before);
  });

  test("switching to test results mode shows input fields", async ({ page }) => {
    await page.locator(".mode-btn").nth(1).click();
    await expect(page.locator(".tested-section")).toBeVisible();
    await expect(page.locator(".tested-section .override-field")).toHaveCount(6);
  });
});

test.describe("week card interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("first 4 weeks are expanded by default, rest collapsed", async ({ page }) => {
    // Expanded weeks have a .week-days-list child
    for (let i = 0; i < 4; i++) {
      await expect(
        page.locator(".week-card").nth(i).locator(".week-days-list"),
      ).toBeVisible();
    }
    // 5th week should be collapsed
    await expect(
      page.locator(".week-card").nth(4).locator(".week-days-list"),
    ).toHaveCount(0);
  });

  test("clicking a week header toggles expand/collapse", async ({ page }) => {
    const fifthWeek = page.locator(".week-card").nth(4);
    await expect(fifthWeek.locator(".week-days-list")).toHaveCount(0);

    await fifthWeek.locator(".week-header").click();
    await expect(fifthWeek.locator(".week-days-list")).toBeVisible();

    await fifthWeek.locator(".week-header").click();
    await expect(fifthWeek.locator(".week-days-list")).toHaveCount(0);
  });

  test("collapse all / expand all button works", async ({ page }) => {
    const toggleBtn = page.locator(".weeks-toggle-btn");

    // Initially says "Expand all" since not all are expanded
    await expect(toggleBtn).toHaveText("Expand all");

    await toggleBtn.click();
    await expect(toggleBtn).toHaveText("Collapse all");

    // All weeks should now have day lists
    const weekCount = await page.locator(".week-card").count();
    expect(await page.locator(".week-days-list").count()).toBe(weekCount);

    await toggleBtn.click();
    await expect(toggleBtn).toHaveText("Expand all");
    expect(await page.locator(".week-days-list").count()).toBe(0);
  });

  test("phase timeline click scrolls to and expands the target week", async ({
    page,
  }) => {
    // Collapse all first
    await page.locator(".weeks-toggle-btn").click(); // expand all
    await page.locator(".weeks-toggle-btn").click(); // collapse all

    // All weeks should be collapsed
    expect(await page.locator(".week-days-list").count()).toBe(0);

    // Click the second phase segment (Aerobic Base)
    const segments = page.locator(".phase-segment");
    await segments.nth(1).click();

    // Exactly one week should now be expanded (the start week of that phase)
    await expect(page.locator(".week-days-list")).toHaveCount(1);
  });
});
