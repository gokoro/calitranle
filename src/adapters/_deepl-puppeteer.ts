import retry from 'async-retry'
import type { Browser, Page } from 'puppeteer'
import { getPage } from '../libs/_puppeteer.js'

let deeplPage: Page | undefined
let deeplBrowser: Browser | undefined

export async function getDeeplPage() {
  if (deeplPage) {
    return deeplPage
  }

  const { page, browser } = await getPage()

  await page.goto('https://www.deepl.com/')

  await page
    .waitForSelector('button[dl-test=translator-source-lang-btn]')
    .then((el) => el?.click())
  await page
    .waitForSelector('button[dl-test=translator-lang-option-ja]')
    .then((el) => el?.click())

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

  await page.focus('.lmt__source_textarea div[contenteditable=true]')
  await page.keyboard.type(text)

  let deeplData

  try {
    const resPromise = page.waitForResponse('**/jsonrpc?method=LMT_handle_jobs')
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
