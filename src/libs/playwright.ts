import { chromium, devices } from 'playwright'

export async function getPage() {
  // const browser = await chromium.launch({ headless: false, devtools: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext(devices['Desktop Chrome'])
  const page = await context.newPage()

  return { page, browser }
}
