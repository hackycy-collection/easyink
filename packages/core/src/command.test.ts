import type { Command } from './command'
import { describe, expect, it } from 'vitest'
import { CommandManager } from './command'

function makeCommand(id: string, log: string[]): Command {
  return {
    id,
    type: 'test',
    description: `cmd-${id}`,
    execute: () => { log.push(`exec:${id}`) },
    undo: () => { log.push(`undo:${id}`) },
  }
}

describe('commandManager', () => {
  it('executes a command', () => {
    const mgr = new CommandManager()
    const log: string[] = []
    mgr.execute(makeCommand('a', log))
    expect(log).toEqual(['exec:a'])
  })

  it('undoes a command', () => {
    const mgr = new CommandManager()
    const log: string[] = []
    mgr.execute(makeCommand('a', log))
    mgr.undo()
    expect(log).toEqual(['exec:a', 'undo:a'])
  })

  it('redoes a command', () => {
    const mgr = new CommandManager()
    const log: string[] = []
    mgr.execute(makeCommand('a', log))
    mgr.undo()
    mgr.redo()
    expect(log).toEqual(['exec:a', 'undo:a', 'exec:a'])
  })

  it('canUndo / canRedo', () => {
    const mgr = new CommandManager()
    expect(mgr.canUndo).toBe(false)
    expect(mgr.canRedo).toBe(false)

    mgr.execute(makeCommand('a', []))
    expect(mgr.canUndo).toBe(true)
    expect(mgr.canRedo).toBe(false)

    mgr.undo()
    expect(mgr.canUndo).toBe(false)
    expect(mgr.canRedo).toBe(true)
  })

  it('clears redo stack after new execute', () => {
    const mgr = new CommandManager()
    mgr.execute(makeCommand('a', []))
    mgr.undo()
    mgr.execute(makeCommand('b', []))
    expect(mgr.canRedo).toBe(false)
  })

  it('merges commands when merge returns non-null', () => {
    const mgr = new CommandManager()
    const log: string[] = []
    const cmd1: Command = {
      id: '1',
      type: 'test',
      description: 'first',
      execute: () => { log.push('exec:1') },
      undo: () => { log.push('undo:1') },
      merge: () => ({
        id: 'merged',
        type: 'test',
        description: 'merged',
        execute: () => { log.push('exec:merged') },
        undo: () => { log.push('undo:merged') },
      }),
    }
    const cmd2 = makeCommand('2', log)

    mgr.execute(cmd1)
    mgr.execute(cmd2)

    mgr.undo()
    expect(log).toContain('undo:merged')
  })

  it('beginTransaction / commitTransaction groups commands', () => {
    const mgr = new CommandManager()
    const log: string[] = []
    mgr.beginTransaction('batch')
    mgr.execute(makeCommand('a', log))
    mgr.execute(makeCommand('b', log))
    mgr.commitTransaction()

    expect(log).toEqual(['exec:a', 'exec:b'])

    mgr.undo()
    expect(log).toEqual(['exec:a', 'exec:b', 'undo:b', 'undo:a'])
  })

  it('rollbackTransaction undoes all commands in reverse', () => {
    const mgr = new CommandManager()
    const log: string[] = []
    mgr.beginTransaction('batch')
    mgr.execute(makeCommand('a', log))
    mgr.execute(makeCommand('b', log))
    mgr.rollbackTransaction()

    expect(log).toEqual(['exec:a', 'exec:b', 'undo:b', 'undo:a'])
    expect(mgr.canUndo).toBe(false)
  })

  it('clear resets all stacks', () => {
    const mgr = new CommandManager()
    mgr.execute(makeCommand('a', []))
    mgr.execute(makeCommand('b', []))
    mgr.undo()
    mgr.clear()
    expect(mgr.canUndo).toBe(false)
    expect(mgr.canRedo).toBe(false)
  })
})
