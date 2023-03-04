import * as deepl from 'deepl-node'

if (!process.env.DEEPL_API_KEY) {
  throw new Error('DeepL api key is missing.')
}

const authKey = process.env.DEEPL_API_KEY

export const translator = new deepl.Translator(authKey)
