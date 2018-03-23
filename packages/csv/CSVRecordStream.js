// @flow

import { Transform } from 'stream'
import CSVRecordParser, { type CSVRecordParserOptions } from './CSVRecordParser'

type CSVRecordStreamOptions = CSVRecordParserOptions & {
  limit?: number
}

export default class CSVRecordStream extends Transform {

  buffer: Buffer
  decoder: CSVRecordParser
  limit: number
  recordCount: number

  constructor(options?: CSVRecordStreamOptions, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      readableObjectMode: true,
    })
    this.buffer = Buffer.alloc(0, '', 'utf8')
    this.limit = 0
    if (options) {
      if (options.limit) {
        this.limit = options.limit
      }
    }
    this.recordCount = 0
    this.decoder = new CSVRecordParser(options)
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
          const row = this.decoder.get()
          if (this.limit === 0 || this.recordCount++ <= this.limit) {
              this.push(row)
          } else {
            this.end()
            break
          }
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
