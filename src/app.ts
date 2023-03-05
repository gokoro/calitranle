import * as fs from 'fs'
import { getDeeplPage, getTranslated } from './libs/deepl-playwright.js'

const dir = './dist'

const fileNames = fs.readdirSync(dir)

async function processFile(text: string) {
  const originalLines = getContentLines(text)

  if (!originalLines) {
    return null
  }

  const tagsRemovedLines = originalLines.map((str) => removeTags(str))

  // const translated = await translateText(tagsRemovedLines.splice(0, 5))
  const translated = await translateText(tagsRemovedLines)

  originalLines.forEach((sourceText, idx) => {
    const targetText = translated[idx]
    text = text.replace(sourceText, `<p class="calibre3">${targetText}</p>`)
  })

  return text
}

function getContentLines(text: string) {
  const matches = text.match(
    /<p class="calibre3">(((?!(br class)|(img class)).)*?)<\/p>/gm
  )
  return matches
}

function removeTags(text: string) {
  const replaced = text.replace(/<[^>]*>/gm, '')
  return replaced
}

async function translateText<T extends string | string[]>(text: T) {
  const page = await getDeeplPage()

  const translated = await getTranslated({ page, text })
  return translated

  // return await translator.translateText<T>(text, 'ja', 'ko')
}

const errorList = []

let count = 0

async function launch() {
  for (const file of fileNames) {
    console.log('count:', count)
    // if (count > 0) {
    //   return
    // }

    const path = `${dir}/${file}`
    const text = fs.readFileSync(path, 'utf-8')
    console.log('path:', path)
    // const text = fs.readFileSync(`${dir}/part0012.html`, 'utf-8')

    try {
      const processed = await processFile(text)
      console.log('processed:', processed)
      fs.writeFileSync(path, processed || text)
    } catch (error) {
      errorList.push({ errorMessage: error, errorFile: path })
    }

    count += 1
  }
}
async function promiseLaunch() {
  await Promise.all(
    fileNames.map(async (file) => {
      console.log('count:', count)
      // if (count > 0) {
      //   return
      // }

      const path = `${dir}/${file}`
      const text = fs.readFileSync(path, 'utf-8')
      console.log('path:', path)
      // const text = fs.readFileSync(`${dir}/part0012.html`, 'utf-8')

      try {
        const processed = await processFile(text)
        console.log('processed:', processed)
        fs.writeFileSync(path, processed || text)
      } catch (error) {
        errorList.push({ errorMessage: error, errorFile: path })
      }

      count += 1
    })
  )
}
promiseLaunch()

// launch()

// testLaunch()

async function testLaunch() {
  const text = fs.readFileSync(`${dir}/part0016.html`, 'utf-8')

  const processed = await processFile(text)

  if (!processed) throw new Error()

  fs.writeFileSync(`${dir}/part0016.html`, processed, { encoding: 'utf-8' })
}
