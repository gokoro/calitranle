import { Command } from 'commander'
import * as fs from 'fs'
import { mkdirp } from 'mkdirp'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { createDeeplPlaywrightAdapter as createAdapter } from './adapters/index.js'
import { Adapter, AdapterSession } from './adapters/types.js'
import { getContentLines, removeTags, replaceTexts } from './utils/contents.js'

const dirName = dirname(
  fileURLToPath(
    import.meta.url || require('url').pathToFileURL(__filename).toString()
  )
)
const isPkg = Object.hasOwn(process, 'pkg')

const program = new Command()

program
  .argument('<path>', 'An input folder that will be processed')
  .option('-o, --output [path]', 'Directory to save outputs')
  .action(action)

program.parse()

async function action(path: string, options: { output: string }) {
  const dir = resolve(isPkg ? dirname(process.execPath) : dirName, path)
  const outputDir = `${dir}/outputs`

  await mkdirp(outputDir)

  const fileNames = fs.readdirSync(dir)

  const adapter = await createAdapter()

  await Promise.all(
    fileNames.map(async (file) => {
      const path = `${dir}/${file}`
      const outputPath = `${options.output || outputDir}/${file}`

      if (fs.lstatSync(path).isDirectory()) {
        return
      }

      const text = fs.readFileSync(path, 'utf-8')

      console.log('Processing:', path)

      const processed = await processFile(text, adapter)
      fs.writeFileSync(outputPath, processed || text)

      console.log('Done: ', path)
    })
  )
}

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
