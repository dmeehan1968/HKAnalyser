// @flow

const States = {
  Initial: 'Initial',
  Field: 'Field',
  QuotedField: 'QuotedField',
  AfterQuotedField: 'AfterQuotedField',
  RecordDelimiter: 'RecordDelimiter',
}

type State = $Keys<typeof States>

export type CSVRecordParserOptions = {
  trim?: boolean
}

export default class CSVRecordParser {

  state: State
  currentField: string
  fields: Array<string>
  trim: boolean

  constructor(options?: CSVRecordParserOptions = {}) {
    this.state = States.Initial
    this.trim = options.trim || false
  }

  push(char: number): ?Array<string> {

    switch (this.state) {

      case States.Initial: {
        this.currentField = ''
        this.fields = []
        this.state = States.Field
        return this.push(char)
      }

      case States.Field: {
        switch (char) {
          case 0x2c: {  // comma
            this.flush()
            break
          }
          case 0x0d: {  // CR
            this.flush()
            this.state = States.RecordDelimiter
            break
          }
          case 0x0a: {  // LF
            this.flush()
            this.state = States.RecordDelimiter
            return this.push(char)
          }
          case 0x22: {  // Quote
            if (this.currentField.length < 1) {
              this.state = States.QuotedField
              break
            }
          }
          // eslint-disable-next-line: no-fallthrough
          default: {
            this.currentField = this.currentField.concat(String.fromCharCode(char))
            break
          }
        }
      }
      break

      case States.QuotedField: {
        switch (char) {
          case 0x22: {
            this.state = States.AfterQuotedField
            break
          }

          default: {
            this.currentField = this.currentField.concat(String.fromCharCode(char))
          }
        }
        break
      }

      case States.AfterQuotedField: {
        switch (char) {

          case 0x22: {  // quote
            this.currentField = this.currentField.concat(String.fromCharCode(char))
            this.state = States.QuotedField
            break
          }

          case 0x2c: {  // comma
            this.flush()
            this.state = States.Field
            break
          }

          case 0x0d: {  // CR
            this.flush()
            this.state = States.RecordDelimiter
            break
          }

          default: {
            throw new Error(`Unexpected character (0x${char.toString(16)}) after quote`)
          }
        }
        break
      }

      case States.RecordDelimiter: {
        switch (char) {
          case 0x0a: {
            return this.finalise()
          }
        }
        break
      }

    }

    return undefined
  }

  flush() {
    switch (this.state) {
      case States.Field:
      case States.AfterQuotedField: {
        this.fields.push(this.trim ? this.currentField.trim() : this.currentField)
        this.currentField = ''
      }
    }
  }

  reset(): void {
    this.state = States.Initial
    this.fields = []
    this.currentField = ''
  }

  finalise(): ?Array<string> {
    this.flush()
    if (this.state !== States.Initial) {
      const fields = this.fields
      this.reset()
      return fields
    }
    return undefined
  }

}
