import puppeteer from 'puppeteer'

export async function getPage() {
  const browser = await puppeteer.launch({ headless: false, devtools: true })
  // const browser = await puppeteer.launch({ headless: true })

  const page = await browser.newPage()

  return { page, browser }
}
