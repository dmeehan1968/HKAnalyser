// @flow

import { Transform } from 'stream'

const States = {
  Initial: 'Initial',
  Field: 'Field',
  QuotedField: 'QuotedField',
  AfterQuotedField: 'AfterQuotedField',
  RecordDelimiter: 'RecordDelimiter',
  Complete: 'Complete',
}

type State = $Keys<typeof States>

type Options = {
  trim?: boolean
}

class CSVRecordParser {

  state: State
  currentField: string
  fields: Array<string>
  trim: boolean

  constructor(options?: Options = {}) {
    this.state = States.Initial
    this.trim = options.trim || false
  }

  push(char: number): boolean {

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
            this.state = States.Complete
            return true
          }
        }
        break
      }

      case States.Complete: {
        throw new Error('unexpected push after record complete')
      }
    }

    return false
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

  finalise(): boolean {
    if (this.state !== States.Initial) {
      this.flush()
      this.state = States.Complete
      return true
    }
    return false
  }

  get(): Array<string> {
    switch (this.state) {

      case States.Complete: {
        const fields = this.fields
        this.fields = []
        this.state = States.Initial
        return fields
      }

      default: {
        throw new Error('get() called when incomplete')
      }
    }
  }
}

class CSVParser extends Transform {

  buffer: Buffer
  decoder: CSVRecordParser

  constructor(options?: Options, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      readableObjectMode: true,
    })
    this.buffer = Buffer.alloc(0, '', 'utf8')
    this.decoder = new CSVRecordParser({
      trim: false,
      ...options,
    })
  }

  push(chunk: Buffer | string | any): boolean {
    return super.push(chunk)
  }

  _transform(chunk: Buffer | string, encoding: string, done: () => void) {

    // $FlowFixMe
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)
    // $FlowFixMe
    this.buffer = Buffer.concat([this.buffer, buffer])

    try {
      for (const ch of this.buffer.values()) {
        if (this.decoder.push(ch)) {
          this.push(this.decoder.get())
        }
      }
      done()
    } catch(e) {
      // @$FlowFixMe
      this.destroy(e)
    }


  }

  _flush(done: Function): void {
    if (this.decoder.finalise()) {
      this.push(this.decoder.get())
    }
    done()
  }

}

export default function parse(options?: Options, streamOptions?: duplexStreamOptions): CSVParser {
  return new CSVParser(options, streamOptions)
}
