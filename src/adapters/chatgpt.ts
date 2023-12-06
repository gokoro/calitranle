import type { Got } from 'got'
import type { Completion as CompletionResponse } from 'openai-api'
import type { Adapter, AdapterSession } from './types.js'

import got from 'got'
import PQueue from 'p-queue'
import { text } from 'stream/consumers'
import retry from 'async-retry'

const queue = new PQueue({ concurrency: 1, interval: (60 / 3400) * 1000 })

function addToQueue<T>(promise: () => Promise<T>) {
  const wrappedPromise = () =>
    retry(() => promise(), {
      minTimeout: Infinity,
      onRetry(e) {
        console.log(e)
      },
    })
  return queue.add(wrappedPromise)
}

export interface AdapterOptions {
  apiKey: string
  modelType: keyof typeof OpenAIModels
  promptType: keyof typeof systemPropmts | 'None' | 'Custom'
  customPrompt?: string
}

export const OpenAIModels = {
  'gpt-4': {
    context: 8000,
  },
  'gpt-4-32k': { context: 32000 },
  'gpt-3.5-turbo': { context: 4000 },
  'gpt-3.5-turbo-16k': { context: 16000 },
}

export const systemPropmts = {
  'Light Novel': `
    당신은 "일본어"로 된 라이트 노벨을 "한국어"로 번역하기 위한 도우미입니다. 다음은 일본어를 한국어로 번역할 때 주의할 점입니다. 이제부터 이 주의점을 참고해서 일본어로 된 라이트 노벨을 번역하세요.
    1. 일본어의 호칭어와 한국어의 호칭어는 서로 다릅니다. 예를 들어, 일본어에서는 '선생님'을 'sensei'라고 부르지만, 한국어에서는 '선생님', '교사' 등으로 번역합니다.
    2. 라이트 노벨은 주로 일본어의 대중문화와 관련된 용어가 사용됩니다. 예를 들어, 일본의 도시 이름, 애니메이션, 만화, 게임 등에 관련된 용어들이 많이 사용됩니다. 번역 시 해당 용어들을 적절하게 한국어로 번역해야 합니다.
    3. 일본어는 한자어를 많이 사용합니다. 따라서, 한자어를 잘 이해하고 있어야 올바른 번역이 가능합니다.
    4. 라이트 노벨은 대화 중심의 작품이 많기 때문에, 대사의 뉘앙스와 감정 전달이 중요합니다. 번역 시 원문의 뉘앙스와 감정을 최대한 잘 전달할 수 있도록 노력해야 합니다.
    5. 일본어의 특성상 문장 끝에 "입니다", "합니다", "입니다만", "합니다만"과 같은 말을 많이 사용합니다. 이러한 표현들은 한국어로 번역할 때 필요한 경우도 있지만, 너무 과도하게 사용하면 번역이 어색해질 수 있으니 적절하게 조절해야 합니다.
    6. 라이트 노벨에 등장하는 이름은 일본어 발음을 그대로 번역하는 것이 좋습니다. 예를 들어, '時雨'는 '시우'가 아닌, '시구레'로 번역해야 합니다.
    7. 라이트 노벨에서는 특정 상표 명이나 제품 명을 우회적으로 표현하는 경우가 많습니다. 예를 들어, '密林'은 '밀림'의 뜻을 가지지만, 실제로는 온라인 쇼핑몰 '아마존'을 뜻합니다. 독자의 이해를 돕기 위해, 문맥에 유의해 이런 부분을 번역해야 합니다.
    8. 라이트 노벨에서는 겹낫표로 표시되지 않은 모든 문장은 1인칭 독백 시점을 사용하여 번역합니다. 예를 들어, "私はご飯を食べる"라는 문장은 "나는 밥을 먹습니다." 대신에 '나는 밥을 먹는다.'로 번역해야 합니다.
    9. 일본어를 한국어로 번역하면 문장 상 어색한 부분이 있을 수 있습니다. 이때, 적절히 문맥을 파악하여 번역된 문장을 자연스럽게 수정해야 합니다.

    다음은 당신에게 주어질 입력 값의 형식입니다.
    1. 번역할 모든 텍스트는 JSON 형식의 배열으로 주어집니다. 
    2. 입력 값은 다음의 JSON Schema를 따릅니다:
    {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
    
    
    다음은 당신이 출력해야 할 응답 값의 형식입니다.
    1. 당신은 반드시 번역된 문장을 "반드시 JSON 형식의 배열"로 출력해야 합니다. 반드시 출력 값은 RFC 7159의 JSON 표준 형식을 따라야 하며, 다른 어떠한 문자도 포함해서는 안 됩니다. 
    2. 배열 내의 각 항목은 원본 입력 배열의 해당 항목을 번역한 내용이어야 합니다.
    3. 출력 값은 다음의 JSON Schema를 따릅니다:
    {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
`,
}

function getPreconfiguredPrompt(
  type: AdapterOptions['promptType'],
  custom: AdapterOptions['customPrompt']
): string {
  switch (type) {
    case 'Custom': {
      return custom ?? ''
    }

    case 'None': {
      return ''
    }

    default:
      return systemPropmts[type]
  }
}

const getContextSize = (model: keyof typeof OpenAIModels) =>
  OpenAIModels[model].context

export async function createAdapter(options: AdapterOptions) {
  const adapter = new ChatgptAdapter(options)

  return adapter
}

export class ChatgptAdapter implements Adapter<ChatgptAdapterSession> {
  constructor(private options: AdapterOptions) {}

  async openSession(): Promise<ChatgptAdapterSession> {
    return new ChatgptAdapterSession(this.options)
  }

  async closeSession(): Promise<void> {}
}

function inferTokenSize(text: string) {
  const totalCharLength = text.length
  const spaceChar = text.match(/\s/g) ?? []
  const spaceCharCount = spaceChar.length
  const charCountWithoutSpace = totalCharLength - spaceCharCount

  // Infer the token size for avoiding overflows for openai models.
  // For Korean and Japanese, I think, one character takes 3 tokens.
  // Space characters generally take one token.
  // This should be done with Tokenizer in the future.
  const tokenSize = charCountWithoutSpace * 2.5 + spaceCharCount * 1

  return tokenSize
}

function splitSentencesList(
  list: string[],
  allowedContext: number,
  tokenSize?: number
) {
  const inferredTokenSize = list.reduce(
    (prev, curr) => prev + inferTokenSize(curr),
    0
  )
  if (!tokenSize) {
    tokenSize = inferredTokenSize
  } else {
    tokenSize += inferredTokenSize
  }

  const times = tokenSize / allowedContext
  const roundedTimes = Math.ceil(times)
  const diff = roundedTimes - times

  const parts = diff >= 0.6 ? roundedTimes : roundedTimes + 1

  const result = []
  const partLength = Math.ceil(list.length / parts)

  for (let i = 0; i < list.length; i += partLength) {
    let part = list.slice(i, i + partLength)
    result.push(part)
  }

  return result
}

class ChatgptAdapterSession implements AdapterSession {
  public client: Got

  constructor(private options: AdapterOptions) {
    this.client = got.extend({
      prefixUrl: 'https://api.openai.com',
      headers: { Authorization: `Bearer ${options.apiKey}` },
    })
  }

  async translateText(texts: string[]) {
    const { promptType, customPrompt, modelType } = this.options
    const contextSize = getContextSize(modelType)

    const preconfiguredPrompt = getPreconfiguredPrompt(promptType, customPrompt)
    const sentences = splitSentencesList(
      texts,
      contextSize,
      inferTokenSize(preconfiguredPrompt)
    )

    const client = this.client
    let translated: string[] = []

    for (const texts of sentences) {
      const fetch = async () => {
        const res = await client
          .post('v1/chat/completions', {
            json: {
              model: modelType,
              messages: [
                {
                  role: 'system',
                  content: preconfiguredPrompt,
                },
                {
                  role: 'user',
                  content: JSON.stringify(texts),
                },
              ],
              temperature: 0.2,
            },
          })
          .json<CompletionResponse['data']>()

        if (!res) {
          throw text
        }
        // @ts-ignore
        const contents = res.choices[0].message.content
        const responded = JSON.parse(contents) as string[]

        return responded
      }
      const responded = await addToQueue(fetch)

      if (!responded) {
        throw responded
      }

      translated = translated.concat(responded)
    }

    return translated
  }
}
