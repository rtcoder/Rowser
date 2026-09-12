import { expect, test } from '@playwright/test';

test('opens a local CSV as a searchable and sortable table', async ({ page }) => {
  await page.goto('/viewer.html?mode=local');

  await page.getByLabel('Viewer mode').getByRole('button', { name: 'Table' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,score,note\nAda,10,compiler\nLinus,7,kernel\nGrace,9,cobol\n')
  });

  await expect(page.getByRole('region', { name: 'CSV table' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'name' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ada' })).toBeVisible();
  await expect(page.getByText('1-3 of 3')).toBeVisible();

  await page.getByPlaceholder('Search...').fill('kernel');
  await expect(page.getByRole('cell', { name: 'Linus' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ada' })).toHaveCount(0);
  await expect(page.getByText('1-1 of 1')).toBeVisible();

  await page.getByPlaceholder('Search...').fill('');
  await page.getByRole('button', { name: 'score' }).click();
  await expect(page.getByRole('cell', { name: '7' })).toBeVisible();
});
