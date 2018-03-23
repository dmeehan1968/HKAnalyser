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

      describe('events', () => {

        it('emits data event for each record', done => {

          const onData = jest.fn()
          const input = [
            [ 'John', 'Smith', '21' ],
            [ 'Mary', 'Smith', '18' ],
            [ 'Granny', 'Smith', '72' ],
          ]
          const output = input.map(arr => {
            return arr.reduce((memo, item, index) => {
              return { ...memo, [`field${index+1}`]: item }
            }, {})
          })
          StreamTest[version].fromObjects(input)
          .pipe(new CSVObjectStream)
          .on('data', onData)
          .pipe(StreamTest[version].toObjects((err) => {
            if (err) throw err
            expect(onData).toHaveBeenCalledTimes(3)
            onData.mock.calls.forEach((call, index) => {
              expect(call).toHaveLength(1)
              expect(call[0]).toEqual(output[index])
            })
            done()
          }))

        })

        describe('finish', () => {

          // Ensure finish/data mocks are called on next clock tick or their
          // timestamps will remain the same and order cannot be determined
          // https://github.com/jest-community/jest-extended#tohavebeencalledbefore
          const timeout = msecs => () => new Promise(resolve => setTimeout(resolve, msecs))
          const onFinish = jest.fn(timeout(1))
          const onData = jest.fn(timeout(1))

          beforeEach(() => {

            // StreamTest@v1.2.3 mutates the input array, so make sure its a
            // fresh one.
            // Fix: https://github.com/nfroidure/streamtest/commit/a714ef161eb467aa659a61e48e01bccda2eb65b8
            const input = [
              [ 'John', 'Smith', '21' ],
              [ 'Mary', 'Smith', '18' ],
              [ 'Granny', 'Smith', '72' ],
            ]

            return new Promise((resolve, reject) => {

              StreamTest[version].fromObjects(input)
              .pipe(new CSVObjectStream)
              .on('data', onData)
              .on('finish', onFinish)
              .pipe(StreamTest[version].toObjects((err, objects) => {
                if (err) return reject(err)
                resolve(objects)
              }))

            })

          })

          afterEach(() => {
            onData.mockReset()
            onFinish.mockReset()
          })

          it('is emitted once', () => {

            expect(onFinish).toHaveBeenCalledTimes(1)

          })

          it('is emitted without an argument', () => {

            expect(onFinish.mock.calls[0]).toHaveLength(0)

          })

          it('is emitted after data events', () => {

            // $FlowFixMe: toHaveBeenCalledBefore not defined
            expect(onData).toHaveBeenCalledBefore(onFinish)

          })

        })

      })
    })

  })

})
