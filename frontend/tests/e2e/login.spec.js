const { expect, test } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1(?::|\/)).*/, (route) =>
    route.abort(),
  );
});

test("support login page renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  await expect(page.getByPlaceholder("Enter your email")).toBeVisible();
  await expect(page.getByPlaceholder("Enter your password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("support login handles mocked invalid credentials", async ({ page }) => {
  await page.route("http://127.0.0.1:4010/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "INVALID_CREDENTIALS" }),
    }),
  );

  await page.goto("/");
  await page.getByPlaceholder("Enter your email").fill("agent@example.test");
  await page.getByPlaceholder("Enter your password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(
    page.getByText("The email or password is incorrect."),
  ).toBeVisible();
});
