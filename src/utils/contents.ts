export function getContentLines(text: string) {
  const matches = text.match(
    /<p class="calibre3">(((?!(br class)|(img class)|(a href)).)*?)<\/p>/gm
  )
  return matches
}

export function removeTags(text: string) {
  const replaced = text.replace(/<[^>]*>/gm, '')
  return replaced
}

export function replaceTexts(
  textToBeReplaced: string,
  sources: string[],
  targets: string[]
) {
  let result = textToBeReplaced

  sources.forEach((sourceText, idx) => {
    const targetText = targets[idx]
    result = result.replace(sourceText, `<p class="calibre3">${targetText}</p>`)
  })

  return result
}
