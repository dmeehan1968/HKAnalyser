// @flow

import { Transform } from 'stream'

class CSVParser extends Transform {
  constructor(options?: duplexStreamOptions) {
    super({
      ...options,
      objectMode: true,
    })
  }

  _transform(chunk: Buffer | string | any, encoding: string, done: () => void) {
    // this.push() each result
    done()  // when chunk completely consumed
  }
}

export default function parse(options?: duplexStreamOptions): CSVParser {
  return new CSVParser(options)
}
