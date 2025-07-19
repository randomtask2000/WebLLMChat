import { test, expect } from '@playwright/test';

test.describe('Chat Flow Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // Verifies welcome message appears on page load
  test('should display welcome message initially', async ({ page }) => {
    await expect(page.locator('text=Welcome to WebLLM Chat')).toBeVisible();
  });

  // Checks model status indicator is visible
  test('should show model loading status', async ({ page }) => {
    const modelStatus = page.locator('[data-testid="model-status"]');
    await expect(modelStatus).toBeVisible();
  });

  // Ensures chat input and send button are present
  test('should have accessible form elements', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type your message"]');
    const sendButton = page.locator('button:has-text("Send")');

    await expect(messageInput).toBeVisible();
    await expect(sendButton).toBeVisible();
  });

  // Tests model manager modal open/close functionality
  test('should open and close model manager', async ({ page }) => {
    await page.click('button:has-text("Models")');
    await expect(page.locator('text=Model Manager')).toBeVisible();

    await page.click('button:has-text("Close")');
    await expect(page.locator('text=Model Manager')).not.toBeVisible();
  });

  // Tests document manager modal open/close functionality
  test('should open and close document manager', async ({ page }) => {
    await page.click('button:has-text("Documents")');
    await expect(page.locator('text=Document Manager')).toBeVisible();

    await page.click('button:has-text("Close")');
    await expect(page.locator('text=Document Manager')).not.toBeVisible();
  });

  // Verifies theme switching updates body attribute
  test('should change themes', async ({ page }) => {
    await page.click('button:has-text("Theme")');
    await page.click('text=Wintry');

    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-theme', 'wintry');
  });
});
