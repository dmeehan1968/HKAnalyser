// @flow

import { Transform } from 'stream'

export default class CSVObjectStream extends Transform {

  constructor(streamOptions?: duplexStreamOptions) {
    super({
      ...streamOptions,
      objectMode: true,
    })

  }

  _transform(chunk: Buffer | string | any, encoding: string, done: () => void) {

    if (Array.isArray(chunk)) {
      
      this.push(chunk.reduce((memo, value, index) => {
        return { ...memo, [`field${index+1}`]: value }
      }, {}))

    } else {
      throw new Error(`Unexpected chunk type, expected array, got ${typeof chunk}`)
    }
    done()
  }

}
