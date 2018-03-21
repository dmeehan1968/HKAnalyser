// @flow

import { Transform } from 'stream'

type CSVObjectStreamOptions = {
  header?: boolean,
  headerTransform?: (Array<string>) => Array<string>,
  transform?: (Object) => Object,
}

export default class CSVObjectStream extends Transform {

  header: boolean
  headers: ?Array<string>
  headerTransform: ?(Array<string>) => Array<string>
  transform: ?(Object) => Object

  constructor(options?: CSVObjectStreamOptions = {}, streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      objectMode: true,
    })
    this.header = options.header || false
    this.headerTransform = options.headerTransform || undefined
    this.transform = options.transform || undefined
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

        this.push(this.transform && this.transform(object) || object)
      }
    } else {
      throw new Error(`Unexpected chunk type, expected array, got ${typeof chunk}`)
    }
    done()
  }

}
