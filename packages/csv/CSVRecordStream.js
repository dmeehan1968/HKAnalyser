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
    this.buffer = Buffer.from('')
    this.limit = options && options.limit ? options.limit : 0
    this.recordCount = 0
    this.decoder = new CSVRecordParser(options)
  }

  push(chunk: Buffer | string | any): boolean {
    this.recordCount++
    return super.push(chunk)
  }

  canPush(): boolean {
    return this.limit === 0 || this.recordCount < this.limit
  }

  process(): void {

    try {
      for (const ch of this.buffer.values()) {
        let row
        if ((row = this.decoder.push(ch))) {
          if (this.canPush()) {
            this.push(row)
          } else {
            this.push(null)
            break
          }
        }
      }
    } catch(e) {
      this.decoder.reset()
      // @$FlowFixMe
      this.destroy(e)
    }

  }

  _transform(chunk: Buffer | string, encoding: string, callback: () => void) {

    // $FlowFixMe
    this.buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding)

    this.process()

    callback()
  }

  _flush(done: Function): void {
    let row = this.decoder.finalise()

    if (row && this.canPush()) {
      this.push(row)
    }
    done()
  }

}
