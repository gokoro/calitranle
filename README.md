# calitranle

<a href="https://www.npmjs.com/package/calitranle" alt="NPM">
<img src="https://img.shields.io/npm/v/calitranle?style=for-the-badge" />

A tool for translating a [calibre](https://calibre-ebook.com)-created epub file 📖

## Usage

### CLI

1. You need to install Node.js (at least 18) with NPM.

2. Rename the extension of the `.epub` file you want to translate to `.zip` and unzip it. Currently It only supports epub created from Calibre.

> **Note:** You might have to keep the original file.

3. Find the folder where HTML files are stored, and copy the path of the folder. If done, run the following command:

```shell
npx calitranle <your-dir>
```

4. After the process is done, replace the original files with the translated files in `output` folder.

5. Compress the whole folder with `.zip`, open it in Calibre. You'll be able to export the ebook as any type you want.

**Options**

```
Usage: calitranle [options] <path>

Arguments:
  path                 An input folder that will be processed

Options:
  -o, --output [path]  Directory to save outputs
  -h, --help           display help for command
```

## Supported Languages

- ja > ko

## Supported Adapters

- [x] DeepL with Playwright
- [ ] DeepL with deepl-node
- [ ] DeepL with Puppeteer
