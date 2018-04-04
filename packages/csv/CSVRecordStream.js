// @flow

import { Transform } from 'stream'
import CSVRecordParser, { type CSVRecordParserOptions } from './CSVRecordParser'

type CSVRecordStreamOptions = CSVRecordParserOptions & {
  limit?: number
}

export default class CSVRecordStream extends Transform {

  buffer: Buffer
  callback: ?Function
  decoder: CSVRecordParser
  limit: number
  recordCount: number
  transformLock: boolean

  constructor(options?: CSVRecordStreamOptions, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      readableObjectMode: true,
    })
    this.buffer = Buffer.from('')
    this.callback = null
    this.transformLock = false
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

  process = (respectBackPressure: boolean): void => {
    console.log('process')
    try {
      for (const [ index, ch ] of this.buffer.entries()) {
        let row
        if ((row = this.decoder.push(ch))) {
          if (this.canPush()) {
            if (!this.push(row) && respectBackPressure) {
              this.buffer = this.buffer.slice(index+1)
              console.log('pressure', this.recordCount, this.buffer.length, index)
              this.transformLock = false
              return
            }
          } else {
            console.log('limit exceeded')
            this.buffer = this.buffer.slice(0, 0)
            this.push(null)
            break
          }
        }
      }
      if (this.callback) {
        this.callback()
        this.callback = null
      }
      this.buffer = this.buffer.slice(0, 0)
    } catch(e) {
      this.buffer = this.buffer.slice(0, 0)
      this.decoder.reset()
      // @$FlowFixMe
      this.destroy(e)
    }

    this.transformLock = false

  }

  _read(size: number) {
    if (this.buffer.length && !this.transformLock) {
      console.log('read', size)
      this.transformLock = true
      setTimeout(this.process, 1, true)
    } else {
      super._read(size)
    }
  }

  _transform(chunk: Buffer | string, encoding: string, callback: () => void) {

    console.log('transform')
    this.buffer = Buffer.concat([
      this.buffer,
      // $FlowFixMe
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
    ], this.buffer.length + chunk.length)

    this.callback = callback
    this.transformLock = true
    this.process(true)
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
