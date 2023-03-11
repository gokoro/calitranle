import retry from 'async-retry'
import type { Page } from 'playwright'
import { PlaywrightInstance } from '../libs/playwright.js'
import type { Adapter, AdapterSession } from './types.js'

export async function createAdapter() {
  // const instance = new PlaywrightInstance({ headless: false })
  const instance = new PlaywrightInstance()
  await instance.initialize()

  const adapter = new DeeplPlaywrightAdapter(instance)

  return adapter
}

export class DeeplPlaywrightAdapter
  implements Adapter<DeeplPlaywrightAdapterSession>
{
  constructor(private playwrightInstance: PlaywrightInstance) {}

  async openSession(): Promise<DeeplPlaywrightAdapterSession> {
    const page = await this.playwrightInstance.createPage()

    await page.goto('https://www.deepl.com/')

    await page.locator('button[dl-test=translator-source-lang-btn]').click()
    await page.locator('button[dl-test=translator-lang-option-ja]').click()

    await page.locator('button[dl-test=translator-target-lang-btn]').click()
    await page.locator('button[dl-test=translator-lang-option-ko]').click()

    return new DeeplPlaywrightAdapterSession(page)
  }

  async closeSession(session: DeeplPlaywrightAdapterSession): Promise<void> {
    await session.page.close()

    if (this.playwrightInstance.context?.pages().length === 0) {
      await this.playwrightInstance.browser?.close()
    }
  }
}

class DeeplPlaywrightAdapterSession implements AdapterSession {
  constructor(public page: Page) {}

  async translateText(texts: string[]) {
    const translatedList: string[] = []

    for (const eachText of texts) {
      const translated = await retry(
        async () => {
          const translated = await getTranslated({
            page: this.page,
            text: eachText,
          })

          if (!translated) {
            throw translated
          }

          if (translatedList[translatedList.length - 1] === translated) {
            throw translated
          }

          return translated
        },
        {
          retries: 10,
          minTimeout: 500,
          onRetry() {
            console.log('Retry getting translated: ', eachText)
          },
        }
      )

      translatedList.push(translated)
    }

    return translatedList
  }
}

async function getTranslated({
  text,
  page,
}: {
  text: string
  page: Page
}): Promise<string> {
  const resPromise = page.waitForResponse('**/jsonrpc?method=LMT_handle_jobs')

  page
    .locator('.lmt__source_textarea')
    .locator('div[contenteditable=true]')
    .fill(text)

  try {
    await resPromise
  } catch (error) {}

  await page.waitForTimeout(1000)

  const translatedElement = await page
    .locator('.lmt__target_textarea')
    .locator('div[contenteditable=true]')

  let translatedText = await translatedElement.textContent()

  console.log(`Translated line: '${text}' => '${translatedText}'`)

  return translatedText || text
}
