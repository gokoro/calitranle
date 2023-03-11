import * as fs from 'fs'
import { createDeeplPlaywrightAdapter as createAdapter } from './adapters/index.js'
import { Adapter, AdapterSession } from './adapters/types.js'
import { getContentLines, removeTags, replaceTexts } from './utils/contents.js'

const dir = '/' // Absolute path

const fileNames = fs.readdirSync(dir)

;(async () => {
  const adapter = await createAdapter()

  await Promise.all(
    fileNames.map(async (file) => {
      const path = `${dir}/${file}`
      const text = fs.readFileSync(path, 'utf-8')

      console.log('Processing:', path)

      const processed = await processFile(text, adapter)
      fs.writeFileSync(path, processed || text)

      console.log('Done: ', path)
    })
  )

  process.exit(0)
})()

async function processFile<T extends AdapterSession>(
  text: string,
  adapter: Adapter<T>
) {
  const contentLines = getContentLines(text)

  if (!contentLines) {
    return null
  }

  const tagsRemovedLines = contentLines.map((str) => removeTags(str))

  const session = await adapter.openSession()
  const translated = await session.translateText(tagsRemovedLines)
  await adapter.closeSession(session)

  return replaceTexts(text, contentLines, translated)
}
