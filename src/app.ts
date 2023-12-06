#!/usr/bin/env node

import inquirer from 'inquirer'
import path, { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import type { AdapterOptions } from './adapters/chatgpt.js'
import {
  ChatgptAdapter,
  systemPropmts as ChatgptSystemPrompt,
  OpenAIModels,
} from './adapters/chatgpt.js'
// import { DeeplPlaywrightAdapter } from './adapters/deepl-playwright.js'
import {
  createChatgptAdapter,
  // createDeeplPlaywrightAdapter,
} from './adapters/index.js'
import { Adapter, AdapterSession } from './adapters/types.js'
import { getContentLines, removeTags, replaceTexts } from './utils/contents.js'
import { Epub } from '@epubly/core'

interface InquirerAnswer {
  inputPath: string
  outputPath?: string
  adapter: AdapterInquiry
  openaiKey: string
  openaiModelType: AdapterOptions['modelType']
  openaiPromptType: AdapterOptions['promptType']
  openaiCustomPrompt: AdapterOptions['customPrompt']
}

enum AdapterInquiry {
  chatgpt = 'ChatGPT',
  // deepl = 'DeepL with Playwright',
}

const adapterValues = Object.values(AdapterInquiry)

const dirName = dirname(
  fileURLToPath(
    import.meta.url || require('url').pathToFileURL(__filename).toString()
  )
)
const isPkg = Object.hasOwn(process, 'pkg')

async function action(options: InquirerAnswer) {
  const dir = resolve(
    isPkg ? dirname(process.execPath) : dirName,
    options.inputPath.replace(/['"]+/g, '')
  )
  const epubFilename = path.basename(dir, '.epub')

  const epub = new Epub(dir)
  const fileNames = epub
    .readFileNames()
    .filter((name) => name.includes('text') && name.includes('.html'))

  let adapter: ChatgptAdapter
  // let adapter: DeeplPlaywrightAdapter | ChatgptAdapter

  // if (options.adapter === AdapterInquiry.deepl) {
  //   adapter = await createDeeplPlaywrightAdapter()
  // }

  if (options.adapter === AdapterInquiry.chatgpt) {
    adapter = await createChatgptAdapter({
      modelType: options.openaiModelType,
      apiKey: options.openaiKey,
      promptType: options.openaiPromptType,
      customPrompt: options.openaiCustomPrompt,
    })
  }

  epub.extract()

  await Promise.all(
    fileNames.map(async (filename) => {
      const text = epub.readFileContentByName(filename)

      console.log('Processing:', filename)

      let processed: string | null = null

      // Doesn't make sense.
      // if (adapter instanceof DeeplPlaywrightAdapter) {
      //   processed = await processFile(text, adapter)
      // }

      if (adapter instanceof ChatgptAdapter) {
        processed = await processFile(text, adapter)
      }

      epub.writeFileContentByName(filename, processed || text)

      console.log('Done: ', filename)
    })
  )

  epub.exportFile(
    options.outputPath ||
      dir.replace(epubFilename, `${epubFilename}-translated`)
  )
}

async function processFile<T extends AdapterSession>(
  text: string,
  adapter: Adapter<T>
): Promise<string | null> {
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

const answers = await inquirer.prompt<InquirerAnswer>([
  {
    type: 'input',
    name: 'inputPath',
    message: 'The path of EPUB file:',
  },
  {
    type: 'input',
    name: 'outputPath',
    message:
      'The output path for translated EPUB file. (Default: <INPUT-FILE>-translated.epub)',
  },
  {
    type: 'list',
    name: 'adapter',
    message: 'Translator to use:',
    choices: adapterValues,
  },
  {
    type: 'input',
    name: 'openaiKey',
    message:
      'The API key of OpenAI. If not provided, the env will be used instead:',
    when: ({ adapter }) => adapter === AdapterInquiry.chatgpt,
    default: process.env.OPENAI_API_KEY || '',
  },
  {
    type: 'list',
    name: 'openaiModelType',
    message: 'Text to give to ChatGPT as system prompts:',
    choices: Object.keys(OpenAIModels),
    when: ({ adapter }) => adapter === AdapterInquiry.chatgpt,
  },
  {
    type: 'list',
    name: 'openaiPromptType',
    message: 'Text to give to ChatGPT as system prompts:',
    choices: [
      ...Object.keys(ChatgptSystemPrompt),
      'None',
      new inquirer.Separator(),
      'Custom',
    ],
    when: ({ adapter }) => adapter === AdapterInquiry.chatgpt,
  },
  {
    type: 'input',
    name: 'openaiCustomPrompt',
    message: 'Custom system prompts for ChatGPT:',
    when: ({ openaiCustomPrompt }) => openaiCustomPrompt === 'Custom',
  },
])

await action(answers)
