// @flow

import { Transform } from 'stream'
import CSVRecordParser, { type CSVRecordParserOptions } from './CSVRecordParser'

export default class CSVRecordStream extends Transform {

  buffer: Buffer
  decoder: CSVRecordParser

  constructor(options?: CSVRecordParserOptions, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      readableObjectMode: true,
    })
    this.buffer = Buffer.alloc(0, '', 'utf8')
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
