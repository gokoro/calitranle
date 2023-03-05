import retry from 'async-retry'
import type { Browser, Page } from 'playwright'
import { getPage } from './playwright.js'

let deeplPage: Page | undefined
let deeplBrowser: Browser | undefined

export async function getDeeplPage() {
  if (deeplPage) {
    return deeplPage
  }

  const { page, browser } = await getPage()

  await page.goto('https://www.deepl.com/')

  page.locator('button[dl-test=translator-source-lang-btn]').click()
  page.locator('button[dl-test=translator-lang-option-ja]').click()

  deeplPage = page
  deeplBrowser = browser

  return page
}

export async function refreshDeeplPage() {
  await deeplPage?.close()
  await deeplBrowser?.close()

  deeplPage = undefined
  deeplBrowser = undefined

  return await getDeeplPage()
}

let i = 0

let isSkipped = false

export async function getTranslated<T extends string | string[]>({
  text,
  page,
}: {
  text: T
  page: Page
}): Promise<T> {
  i += 1
  console.log(i)
  console.log('text:', text)

  if (Array.isArray(text)) {
    const translatedList: string[] = []

    for (const eachText of text) {
      const translated = await retry(
        () => {
          return getTranslated<string>({ text: eachText, page })
        },
        { retries: 3 }
      )

      translatedList.push(translated)

      if (isSkipped) {
        page = await refreshDeeplPage()
        isSkipped = false
      }
    }

    // @ts-expect-error
    return translatedList
  }
  console.log('second', i)

  const resPromise = page.waitForResponse('**/jsonrpc?method=LMT_handle_jobs')

  page
    .locator('.lmt__source_textarea')
    .locator('div[contenteditable=true]')
    .fill(text)

  let deeplData

  try {
    const res = await resPromise
    deeplData = await res.json()
  } catch (error) {
    isSkipped = true
    return text
  }

  const translatedText =
    deeplData.result.translations[0].beams[0].sentences[0].text
  console.log('translatedText:', translatedText)

  return translatedText
}
