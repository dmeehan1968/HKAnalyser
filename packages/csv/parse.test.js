// @flow

import parse from './parse'
import { Transform } from 'stream'
import StreamTest from 'streamtest'

describe('parse', () => {

  StreamTest.versions.forEach(version => {

    describe(`for ${version} streams`, () => {

      it('exists', () => {
        expect(parse).toBeDefined()
      })

      it('returns a transform stream', () => {
        expect(parse() instanceof Transform).toBe(true)
      })

      it('accepts an object argument', () => {
        expect(parse({}) instanceof Transform).toBe(true)
      })

      it('handles no input', () => {
        const parser = parse()
        StreamTest[version].fromChunks([''])
        .pipe(parser)
        .pipe(StreamTest[version].toText((err, text) => {
          if (err) throw err
          expect(text).toEqual('')
        }))
      })

    })

  })

})
