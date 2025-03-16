import { spawn } from 'node:child_process'
import path from 'node:path'
// import { glob } from 'node:fs/promises'
import { glob } from 'glob'
import { defineExtension, extensionContext } from 'reactive-vscode'
import { Uri, commands, window, workspace } from 'vscode'
import { recordToAsyncIterable } from './utils'

const { activate, deactivate } = defineExtension(() => {
  const disposable = commands.registerCommand('quick.open.in.default.program', async (dir) => {
    let selectDirPath = dir instanceof Uri ? dir.fsPath : ''

    if (selectDirPath === '') {
      const currentFilePath = window.activeTextEditor?.document.uri.fsPath ?? ''
      if (currentFilePath === '') {
        window.showErrorMessage('No selection directory or active file.')
        return
      }

      selectDirPath = path.dirname(currentFilePath)
    }

    const programs = new Set(['Visual Studio Code'])

    const programActions: Record<string, string> = workspace.getConfiguration('quick-action').get('programActions') ?? {}

    for await (const [key, value] of recordToAsyncIterable(programActions)) {
      // if ((await Array.fromAsync(glob(key.split(';'), { cwd: selectDirPath }))).length > 0) {
      //   programName = value
      //   break
      // }
      if ((await glob(key.split(';'), { cwd: selectDirPath, includeChildMatches: false })).length > 0) {
        programs.add(value)
      }
    }

    if (programs.size === 1) {
      spawn('bash', ['-c', `open -a "${programs.values().next().value}" "${selectDirPath}"`])
    }
    else {
      const options = []
      for (const item of programs.values()) {
        options.push(item)
      }

      const selectedOption = await window.showQuickPick(options, { placeHolder: 'Please select a program.' })

      if (selectedOption) {
        spawn('bash', ['-c', `open -a "${selectedOption}" "${selectDirPath}"`])
      }
    }
  })

  extensionContext.value?.subscriptions.push(disposable)
})

export { activate, deactivate }
