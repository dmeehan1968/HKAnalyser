// @flow

import CSVObjectStream from './CSVObjectStream'
import { Transform } from 'stream'
import StreamTest from 'streamtest'
import changeCase from 'change-case'

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

      describe('header', () => {

        it('names fields according to header', done => {

          StreamTest[version].fromObjects([
            [ 'first', 'second', 'third' ],
            [ '1', '2', '3' ],
          ])
          .pipe(new CSVObjectStream({ header: true }))
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              {
                first: '1',
                second: '2',
                third: '3',
              },
            ])
            done()
          }))

        })

        it('converts headers to field names from options', done => {

          StreamTest[version].fromObjects([
            [ 'First Name', 'Last Name', 'Age' ],
            [ 'John', 'Smith', '21' ],
          ])
          .pipe(new CSVObjectStream({
            header: true,
            headerTransform: (headers: Array<string>): Array<string> => {
              return headers.map(header => changeCase.camelCase(header))
            },
          }))
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              {
                firstName: 'John',
                lastName: 'Smith',
                age: '21',
              },
            ])
            done()
          }))

        })

      })

      describe('converts strings according to options', () => {

        it('converts strings', done => {

          StreamTest[version].fromObjects([
            [ 'John', 'Smith', '21', '2018-01-01' ],
          ])
          .pipe(new CSVObjectStream({
            transform: (object: { [string]: string }): { [string]: mixed } => {
              return {
                ...object,
                field3: Number(object.field3),
                field4: new Date(object.field4),
              }
            },
          }))
          .pipe(StreamTest[version].toObjects((err, objects) => {
            if (err) throw err
            expect(objects).toEqual([
              {
                field1: 'John',
                field2: 'Smith',
                field3: 21,
                field4: new Date('2018-01-01'),
              },
            ])
            done()
          }))

        })

      })

    })

  })

})
