import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
    test('Landing page loads successfully', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        // Debugging
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', exception => console.log(`BROWSER ERROR: "${exception}"`));

        // Check for main heading or key element
        await expect(page).toHaveTitle(/Tunnel/, { timeout: 30000 });
        // Adjust selector based on actual landing page content
        const heading = page.getByRole('heading', { level: 1 }).first();
        await expect(heading).toBeVisible();
    });

    test('Login page is accessible', async ({ page }) => {
        await page.goto('/login', { waitUntil: 'domcontentloaded' });

        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
});
