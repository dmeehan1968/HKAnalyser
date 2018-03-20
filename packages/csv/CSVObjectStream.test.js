// @flow

import CSVObjectStream from './CSVObjectStream'
import { Transform } from 'stream'
import StreamTest from 'streamtest'

describe('CSVObjectStream', () => {

  StreamTest.versions.forEach(version => {

    describe(`for ${version} streams`, () => {

      it('is a transform stream', () => {

        expect(new CSVObjectStream instanceof Transform).toBe(true)

      })

      it('handles no input', done => {

        StreamTest[version].fromObjects([])
        .pipe(new CSVObjectStream)
        .pipe(StreamTest[version].toObjects((err, objects) => {
          if (err) throw err
          expect(objects).toEqual([])
          done()
        }))

      })

      describe('no header', () => {

        it('names fields in series', done => {

          StreamTest[version].fromObjects([
            [ '1', '2', '3' ],
            [ '4', '5', '6' ],
          ])
          .pipe(new CSVObjectStream)
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              {
                field1: '1',
                field2: '2',
                field3: '3',
              },
              {
                field1: '4',
                field2: '5',
                field3: '6',
              },
            ])
            done()
          }))

        })
      })

    })

  })

})
