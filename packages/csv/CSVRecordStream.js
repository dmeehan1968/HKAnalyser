// @flow

import { Transform } from 'stream'
import CSVRecordParser, { type CSVRecordParserOptions } from './CSVRecordParser'

type CSVRecordStreamOptions = CSVRecordParserOptions & {
  limit?: number,
  respectBackPressure?: boolean,
}

export default class CSVRecordStream extends Transform {

  decoder: CSVRecordParser
  limit: number
  respectBackPressure: boolean
  recordCount: number
  currentTransform: ?{
    buffer: Buffer,
    callback: Function
  }

  constructor(options?: CSVRecordStreamOptions, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      readableObjectMode: true,
    })
    this.currentTransform = null
    this.recordCount = 0

    this.limit = options && options.limit ? options.limit : 0
    this.respectBackPressure =
      options && typeof options.respectBackPressure !== 'undefined'
      ? options.respectBackPressure
      : true

    this.decoder = new CSVRecordParser(options)
  }

  push(chunk: Buffer | string | any): boolean {
    this.recordCount++
    return super.push(chunk)
  }

  canPush(): boolean {
    return this.limit === 0 || this.recordCount < this.limit
  }

  process(respectBackPressure: boolean): void {
    if (this.currentTransform != null) {
      const buffer = this.currentTransform.buffer
      const callback = this.currentTransform.callback

      try {
        for (const [ index, ch ] of buffer.entries()) {
          let row
          if ((row = this.decoder.push(ch))) {
            if (this.canPush()) {
              if (!this.push(row) && respectBackPressure) {
                this.currentTransform = {
                  buffer: buffer.slice(index+1),
                  callback,
                }
                return
              }
            } else {
              this.push(null)
              break
            }
          }
        }
        callback()
      } catch(e) {
        this.decoder.reset()
        callback(e)
      }
    }

  }

  _read(size: number): void {
    if (this.currentTransform) {
      setImmediate(() => this.process(this.respectBackPressure))
    } else {
      // $FlowFixMe
      super._read(size)
    }
  }

  _transform(chunk: mixed, encoding: string, callback: (err: ?Error) => void) {

    this.currentTransform = {
      // $FlowFixMe
      buffer: Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
      callback: (e) => {
        this.currentTransform = null
        callback(e)
      },
    }

    this.process(this.respectBackPressure)

  }

  _flush(done: Function): void {
    this.process(false)
    let row = this.decoder.finalise()

    if (row && this.canPush()) {
      this.push(row)
    }
    done()
  }

}
