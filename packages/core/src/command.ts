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
 * Read-only snapshot of a history entry for UI consumption.
 */
export interface HistoryEntry {
  id: string
  type: string
  description: string
}

type CommandOperation = 'execute' | 'undo'

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

  /** Current cursor position (number of applied commands). */
  get cursor(): number {
    return this.undoStack.length
  }

  /** Total number of commands across undo + redo stacks. */
  get totalCount(): number {
    return this.undoStack.length + this.redoStack.length
  }

  /** Ordered snapshot of all history entries (oldest first). Redo entries are in reverse stack order. */
  get historyEntries(): HistoryEntry[] {
    const entries: HistoryEntry[] = []
    for (const cmd of this.undoStack) {
      entries.push({ id: cmd.id, type: cmd.type, description: cmd.description })
    }
    for (let i = this.redoStack.length - 1; i >= 0; i--) {
      const cmd = this.redoStack[i]!
      entries.push({ id: cmd.id, type: cmd.type, description: cmd.description })
    }
    return entries
  }

  /** Jump to a specific history position by batching undo/redo calls. */
  goTo(index: number): void {
    if (index < 0 || index > this.totalCount || index === this.undoStack.length)
      return

    let moved = false

    if (index < this.undoStack.length) {
      const steps = this.undoStack.length - index
      for (let i = 0; i < steps; i++) {
        const command = this.undoStack[this.undoStack.length - 1]!
        this.runCommand(command, 'undo', 'execute')
        this.undoStack.pop()
        this.redoStack.push(command)
        moved = true
      }
    }
    else {
      const steps = index - this.undoStack.length
      for (let i = 0; i < steps; i++) {
        const command = this.redoStack[this.redoStack.length - 1]!
        this.runCommand(command, 'execute', 'undo')
        this.redoStack.pop()
        this.undoStack.push(command)
        moved = true
      }
    }

    if (!moved)
      return

    this.notify()
  }

  execute(command: Command): void {
    this.runCommand(command, 'execute', 'undo')

    const previousRedoStack = [...this.redoStack]

    if (this.transactionStack.length > 0) {
      this.transactionStack[this.transactionStack.length - 1]!.push(command)
      return
    }

    try {
      // Try merge with last command
      if (this.undoStack.length > 0) {
        const lastIndex = this.undoStack.length - 1
        const last = this.undoStack[lastIndex]!
        if (last.merge) {
          const merged = last.merge(command)
          if (merged) {
            this.undoStack[lastIndex] = merged
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
    catch (error) {
      const lastCommand = this.undoStack[this.undoStack.length - 1]
      if (lastCommand === command)
        this.undoStack.pop()
      this.redoStack = previousRedoStack
      this.restoreCommandState(command, 'undo', 'execute', error)
    }
  }

  undo(): void {
    const command = this.undoStack[this.undoStack.length - 1]
    if (!command)
      return

    this.runCommand(command, 'undo', 'execute')
    this.undoStack.pop()
    this.redoStack.push(command)
    this.notify()
  }

  redo(): void {
    const command = this.redoStack[this.redoStack.length - 1]
    if (!command)
      return

    this.runCommand(command, 'execute', 'undo')
    this.redoStack.pop()
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

  private runCommand(command: Command, operation: CommandOperation, compensation: CommandOperation): void {
    try {
      command[operation]()
    }
    catch (error) {
      this.restoreCommandState(command, compensation, operation, error)
    }
  }

  private restoreCommandState(
    command: Command,
    operation: CommandOperation,
    failedOperation: CommandOperation,
    cause: unknown,
  ): never {
    try {
      command[operation]()
    }
    catch (restoreError) {
      throw new AggregateError(
        [cause, restoreError],
        `Command ${failedOperation} failed and ${operation} could not restore state for "${command.description}"`,
      )
    }

    throw cause
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

/**
 * CompositeCommand wraps multiple child commands into a single atomic operation.
 * Children are executed in order and undone in reverse order.
 * Used for table batch operations (insert column = modify columns + per-row cells + merge cell colSpan adjustments).
 */
export class CompositeCommand implements Command {
  id: string
  type = 'composite'
  description: string
  private children: Command[]

  constructor(description: string, children: Command[]) {
    this.id = `composite_${Date.now().toString(36)}`
    this.description = description
    this.children = children
  }

  execute(): void {
    for (const child of this.children) {
      child.execute()
    }
  }

  undo(): void {
    for (let i = this.children.length - 1; i >= 0; i--) {
      this.children[i]!.undo()
    }
  }
}
