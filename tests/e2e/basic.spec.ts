import { test, expect } from '@playwright/test';

test('loads dashboard and shows header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText('Script Manager');
});


