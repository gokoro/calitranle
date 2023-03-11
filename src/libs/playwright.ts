import type { Browser, BrowserContext } from 'playwright'
import { chromium, devices } from 'playwright'

export async function getPage() {
  const browser = await chromium.launch({ headless: false, devtools: true })
  const context = await browser.newContext(devices['Desktop Chrome'])
  const page = await context.newPage()

  return { page, browser }
}

export class PlaywrightInstance {
  public browser?: Browser
  public context?: BrowserContext
  public headless: boolean

  constructor({ headless = true }: { headless?: boolean } = {}) {
    this.headless = headless
  }

  async initialize(): Promise<void> {
    if (this.context) return

    const browser = await chromium.launch({
      headless: this.headless,
      devtools: true,
    })
    const context = await browser.newContext(devices['Desktop Chrome'])

    this.browser = browser
    this.context = context
  }

  async createPage() {
    if (!this.context) {
      throw new Error(
        'Context is not assigned to Playwright instance. You need to initialize it first.'
      )
    }

    const page = await this.context.newPage()

    return page
  }
}
