/**
 * Command interface for undo/redo operations.
 * Every mutation that enters the history stack must implement this.
 */
export interface Command {
  id: string
  type: string
  description: string
  execute: () => void
  undo: () => void
  merge?: (next: Command) => Command | null
}

/**
 * CommandManager manages the undo/redo stack and transactions.
 */
export class CommandManager {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private transactionStack: Command[][] = []
  private transactionDescriptions: string[] = []
  private _listeners: Array<() => void> = []

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoDescription(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.description
  }

  get redoDescription(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.description
  }

  execute(command: Command): void {
    command.execute()

    if (this.transactionStack.length > 0) {
      this.transactionStack[this.transactionStack.length - 1]!.push(command)
      return
    }

    // Try merge with last command
    if (this.undoStack.length > 0) {
      const last = this.undoStack[this.undoStack.length - 1]!
      if (last.merge) {
        const merged = last.merge(command)
        if (merged) {
          this.undoStack[this.undoStack.length - 1] = merged
          this.redoStack = []
          this.notify()
          return
        }
      }
    }

    this.undoStack.push(command)
    this.redoStack = []
    this.notify()
  }

  undo(): void {
    const command = this.undoStack.pop()
    if (!command)
      return
    command.undo()
    this.redoStack.push(command)
    this.notify()
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command)
      return
    command.execute()
    this.undoStack.push(command)
    this.notify()
  }

  beginTransaction(description: string): void {
    this.transactionStack.push([])
    this.transactionDescriptions.push(description)
  }

  commitTransaction(): void {
    const commands = this.transactionStack.pop()
    const description = this.transactionDescriptions.pop()
    if (!commands || commands.length === 0)
      return

    const batchCommand = createBatchCommand(
      description || 'Batch operation',
      commands,
    )

    this.undoStack.push(batchCommand)
    this.redoStack = []
    this.notify()
  }

  rollbackTransaction(): void {
    const commands = this.transactionStack.pop()
    this.transactionDescriptions.pop()
    if (!commands)
      return

    // Undo in reverse order
    for (let i = commands.length - 1; i >= 0; i--) {
      commands[i]!.undo()
    }
    this.notify()
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.transactionStack = []
    this.transactionDescriptions = []
    this.notify()
  }

  onChange(listener: () => void): () => void {
    this._listeners.push(listener)
    return () => {
      const idx = this._listeners.indexOf(listener)
      if (idx >= 0)
        this._listeners.splice(idx, 1)
    }
  }

  private notify(): void {
    for (const listener of this._listeners) {
      listener()
    }
  }
}

/**
 * Create a batch command that groups multiple commands into one undo/redo step.
 */
export function createBatchCommand(description: string, commands: Command[]): Command {
  return {
    id: `batch_${Date.now().toString(36)}`,
    type: 'batch',
    description,
    execute() {
      for (const cmd of commands) {
        cmd.execute()
      }
    },
    undo() {
      for (let i = commands.length - 1; i >= 0; i--) {
        commands[i]!.undo()
      }
    },
  }
}
