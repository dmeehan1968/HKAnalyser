// @flow

import { Transform } from 'stream'

type CSVObjectStreamOptions = {
  header?: boolean,
  limit?: number,
  headerTransform?: (Array<string>) => Array<string>,
  transform?: ({ [string]: string }) => { [string]: mixed },
}

export default class CSVObjectStream extends Transform {

  header: boolean
  headers: ?Array<string>
  limit: number
  recordCount: number
  headerTransform: ?(Array<string>) => Array<string>
  transform: ?({ [string]: string }) => { [string]: mixed }

  constructor(options?: CSVObjectStreamOptions = {}, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      objectMode: true,
    })
    this.header = options.header || false
    this.limit = options.limit || 0
    this.recordCount = 0
    this.headerTransform = options.headerTransform || undefined
    this.transform = options.transform || undefined
  }

  push(chunk: Buffer | string | any): boolean {
    this.recordCount++
    return super.push(chunk)
  }

  _transform(chunk: Buffer | string | any, encoding: string, done: () => void) {

    if (Array.isArray(chunk)) {

      if (this.header && !this.headers) {
        this.headers = this.headerTransform && this.headerTransform(chunk) || chunk
      } else {
        const object = chunk.reduce((memo, value, index) => {
          const defaultPropName = `field${index+1}`
          const propName = this.headers && this.headers[index] || defaultPropName
          return { ...memo, [propName]: value}
        }, {})

        if (this.limit === 0 || this.recordCount < this.limit) {
          this.push(this.transform && this.transform(object) || object)
        } else {
          this.push(null)
        }
      }
    } else {
      throw new Error(`Unexpected chunk type, expected array, got ${typeof chunk}`)
    }
    done()
  }

}
