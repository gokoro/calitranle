import * as fs from 'fs'
import { translator } from './libs/deepl.js'

const dir =
  '/Users/lincroe/Downloads/りく, 海空/カノジョの妹とキスをした。２ (GA文庫)/カノジョの妹とキスをした。２ (GA文庫) - 海空 りく/_c7niof3_files/text'

const fileNames = fs.readdirSync(dir)

async function processFile(text: string) {
  const originalLines = getContentLines(text)

  if (!originalLines) {
    return null
  }

  const tagsRemovedLines = originalLines.map((str) => removeTags(str))

  const translated = await translateHTML(tagsRemovedLines)
  const translatedLines = translated.map(({ text }) => text)

  tagsRemovedLines.forEach((sourceText, idx) => {
    const targetText = translatedLines[idx]
    text.replace(sourceText, targetText)
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

async function translateHTML<T extends string | string[]>(text: T) {
  return await translator.translateText<T>(text, 'ja', 'ko')
}

let count = 0

fileNames.forEach(async (file) => {
  if (count > 0) {
    return
  }

  const path = `${dir}/${file}`
  // const text = fs.readFileSync(path, 'utf-8')
  const text = fs.readFileSync(`${dir}/part0012.html`, 'utf-8')

  const processed = await processFile(text)
  console.log('processed:', processed)
  fs.writeFileSync(path, processed || text)

  count += 1
})
