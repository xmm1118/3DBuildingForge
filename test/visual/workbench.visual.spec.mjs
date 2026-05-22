import { expect, test } from '@playwright/test'

async function prepareWorkbench(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  })
  await page.waitForSelector('.studio-window')
  await page.locator('.status-toast').evaluate((node) => {
    node.style.display = 'none'
  }).catch(() => {})
  await page.waitForTimeout(450)
}

async function expectSeparated(page, leftSelector, centerSelector, rightSelector) {
  const left = await page.locator(leftSelector).boundingBox()
  const center = await page.locator(centerSelector).boundingBox()
  const right = await page.locator(rightSelector).boundingBox()

  expect(left).toBeTruthy()
  expect(center).toBeTruthy()
  expect(right).toBeTruthy()
  expect(left.x + left.width).toBeLessThanOrEqual(center.x)
  expect(center.x + center.width).toBeLessThanOrEqual(right.x)
}

async function expectClippedScreenshot(page, selector, name, options = {}) {
  const box = await page.locator(selector).boundingBox()
  expect(box).toBeTruthy()

  const image = await page.screenshot({
    animations: 'disabled',
    clip: {
      x: Math.floor(box.x),
      y: Math.floor(box.y),
      width: Math.ceil(box.width),
      height: Math.ceil(box.height),
    },
    mask: options.mask || [],
  })

  expect(image).toMatchSnapshot(name, {
    maxDiffPixelRatio: 0.025,
    threshold: 0.18,
  })
}

test('workbench layout keeps library, stage, and source rail separated', async ({ page }) => {
  await page.goto('/')
  await prepareWorkbench(page)

  await expectSeparated(page, '.selection-shelf', '.stage-zone', '.command-zone')
  await expectClippedScreenshot(page, '.studio-window', 'workbench-layout.png', {
    mask: [page.locator('.cell-viewer canvas')],
  })
})

test('model library drawer renders productized asset cards', async ({ page }) => {
  await page.goto('/')
  await prepareWorkbench(page)

  await page.getByRole('button', { name: 'Library' }).click()
  await expect(page.locator('.drawer-library')).toBeVisible()
  await expect(page.locator('.asset-library-card').first()).toBeVisible()
  await expect(page.locator('.drawer-library')).toContainText('Generated & Imported Assets')
  await expect(page.locator('.drawer-library')).not.toContainText('Organelle')

  await expectClippedScreenshot(page, '.drawer-library', 'asset-library-drawer.png', {
    mask: [page.locator('.asset-preview-frame img')],
  })
})

test('demo mode uses a clean presentation surface', async ({ page }) => {
  await page.goto('/')
  await prepareWorkbench(page)

  await page.getByRole('button', { name: 'Demo' }).click()
  await expect(page.locator('.workbench-v2.demo-mode')).toBeVisible()
  await expect(page.locator('.demo-exit-button')).toBeVisible()
  await expect(page.locator('.selection-shelf')).toBeHidden()
  await expect(page.locator('.command-zone')).toBeHidden()
  await page.addStyleTag({
    content: '.workbench-v2.demo-mode .cell-viewer canvas { opacity: 0 !important; }',
  })

  await expectClippedScreenshot(page, '.studio-window', 'demo-mode.png')
})

test('view mode controls change the live viewer state', async ({ page }) => {
  await page.goto('/')
  await prepareWorkbench(page)

  const solidButton = page.getByRole('button', { name: 'Solid view' })
  const xrayButton = page.getByRole('button', { name: 'X-Ray layer view' })
  const inspectButton = page.getByRole('button', { name: 'Inspect focus view' })

  await expect(solidButton).toBeVisible()
  await expect(xrayButton).toBeVisible()
  await expect(inspectButton).toBeVisible()

  await solidButton.click()
  await expect(page.locator('.cell-viewer.solid')).toBeVisible()
  await expect(page.locator('.stage-status')).toContainText('Solid')

  await xrayButton.click()
  await expect(page.locator('.cell-viewer.layers')).toBeVisible()
  await expect(page.locator('.stage-status')).toContainText('X-Ray')

  await inspectButton.click()
  await expect(page.locator('.cell-viewer.focus')).toBeVisible()
  await expect(page.locator('.stage-status')).toContainText('Inspect')
})

test('inspector explains the selected object instead of generic biology parts', async ({ page }) => {
  await page.goto('/')
  await prepareWorkbench(page)

  await page.getByRole('button', { name: 'Info' }).click()
  await expect(page.locator('.inspector-zone.open')).toBeVisible()
  await expect(page.locator('.inspector-zone.open')).toContainText('Asset Details')
  await expect(page.locator('.inspector-zone.open')).toContainText('Object Description')
  await expect(page.locator('.inspector-zone.open')).toContainText('Category')
  await expect(page.locator('.inspector-zone.open')).not.toContainText('Organelle')
  await expect(page.locator('.inspector-zone.open')).not.toContainText('Plasma Membrane')

  await expectClippedScreenshot(page, '.inspector-zone.open', 'asset-inspector.png')
})
