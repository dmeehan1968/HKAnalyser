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
        .pipe(StreamTest[version].toObjects((err, objects) => {
          if (err) throw err
          expect(objects).toEqual([])
        }))
      })

      describe('2.1 each record on a separate line', () => {

        it('handles a single record', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['123456789\r\n'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789' ],
            ])
            done()
          }))

        })

        it('handles two records', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['123456789\r\nABCDEFGHI\r\n'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789' ],
              [ 'ABCDEFGHI' ],
            ])
            done()
          }))

        })

      })

      describe('2.2 optional final record delimiter', () => {

        it('handles a single record', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['123456789'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789' ],
            ])
            done()
          }))

        })

        it('handles two records', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['123456789\r\nABCDEFGHI'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789' ],
              [ 'ABCDEFGHI' ],
            ])
            done()
          }))

        })

      })

      describe('2.4 comma separated fields', () => {

        it('handles no fields', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['\r\n'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '' ],
            ])
            done()
          }))

        })

        it('handles two fields', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['123456789,ABCDEFGHI'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789', 'ABCDEFGHI' ],
            ])
            done()
          }))

        })

        it('handles three fields', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['123456789,ABCDEFGHI,QWERTYIOP'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789', 'ABCDEFGHI', 'QWERTYIOP' ],
            ])
            done()
          }))

        })

      })

      describe('2.5 double quotes', () => {

        it('handles an empty quoted field', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['""'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '' ],
            ])
            done()
          }))

        })

        it('handles a quoted field', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['"123456789"\r\n'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789' ],
            ])
            done()
          }))

        })

        it('handles a quoted field, no record delimiter', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['"123456789"'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789' ],
            ])
            done()
          }))

        })

        it('handles a quoted field followed by an unquoted field', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['"123456789",ABCDEFGHI\r\n'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '123456789', 'ABCDEFGHI' ],
            ])
            done()
          }))

        })

      })

      describe('2.6 fields with quotes, commas and newlines should be quoted', () => {

        it('handles a comma within a quoted field', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['"1234,5678"'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '1234,5678' ],
            ])
            done()
          }))

        })

        it('handles CRLF within a quoted field', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['"1234\r\n5678"'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '1234\r\n5678' ],
            ])
            done()
          }))

        })

        it('errors on unexpected chars after quoted field', async () => {

          function f() {
            return new Promise((resolve, reject) => {
              const parser = parse()
              .on('error', reject)
              .on('finish', resolve)
              StreamTest[version].fromChunks(['"1234"5678'])
              .pipe(parser)
              .pipe(StreamTest[version].toObjects(() => undefined))
            })
          }

          await expect(f()).rejects.toThrow(/Unexpected character \(0x35\)/i)
        })

      })

      describe('2.7 quotes within quoted fields', () => {

        it('handles an escaped quote within a quoted field', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks(['"1234""5678"'])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '1234"5678' ],
            ])
            done()
          }))

        })

      })

      describe('options', () => {

        it('doesn\t trim by default', (done) => {

          const parser = parse()
          StreamTest[version].fromChunks([' 1234 5678 '])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ ' 1234 5678 ' ],
            ])
            done()
          }))

        })

        it('trims', (done) => {

          const parser = parse({ trim: true })
          StreamTest[version].fromChunks([' 1234 5678 '])
          .pipe(parser)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              [ '1234 5678' ],
            ])
            done()
          }))

        })

      })
    })

  })

})
