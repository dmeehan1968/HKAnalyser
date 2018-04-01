// @flow

import fs from 'fs'
import csv from 'csvtojson'
import { streamToMongoDB } from 'stream-to-mongo-db'
import yargs from 'yargs'
import { MongoClient } from 'mongodb'

import { CSVRecordStream, CSVObjectStream } from '../packages/csv'

const argv = yargs
  .option('drop', {
    boolean: true,
    describe: 'Drop the destination collection before inserting',
    nargs: 0,
  })
  .option('mongodb', {
    describe: 'URL of the MongoDb server, e.g. mongodb://localhost:27017/Database',
    nargs: 1,
  })
  .option('collection', {
    describe: 'Name of the collection, e.g. Data',
    nargs: 1,
  })
  .option('heart', {
    describe: 'Path to Heart Rate CSV input file',
    nargs: 1,
  })
  .option('steps', {
    describe: 'Path to Steps CSV input file',
    nargs: 1,
  })
  .option('sleep', {
    describe: 'Path to Sleep Analysis CSV input file',
    nargs: 1,
  })
  .option('limit', {
    describe: 'Maximum number of records to import',
    nargs: 1,
  })
  .conflicts('sleep', ['heart', 'steps'])
  .conflicts('steps', ['heart', 'sleep'])
  .conflicts('heart', ['sleep', 'steps'])
  .demandOption([ 'mongodb', 'collection' ])
  .argv

importer(argv).then(() => {
  console.log(' - Done')
})

function importer(argv) {

  return new Promise(async (resolve, reject) => {

    console.log(`Importing '${argv.heart || argv.steps || argv.sleep}'\nto '${argv.mongodb}' '${argv.collection}' ${argv.drop ? '(dropped)' :''}`)
    try {

      if (argv.drop) {
        const conn = await MongoClient.connect(argv.mongodb)
        const dbname = argv.mongodb.split('/').slice(-1).pop()
        try {
          await conn.db(dbname).collection(argv.collection).deleteMany({})
        } catch (e) {
          console.error(e)
          reject(e)
        }
        await conn.close()
      }

      const outputConfig = {
        dbURL: argv.mongodb,
        collection: argv.collection,
        batchSize: 1,
      }

      const mongoStream = streamToMongoDB(outputConfig)
      .on('error', reject)
      .on('finish', resolve)

      if (argv.heart) {

        let count = 0

        fs.createReadStream(argv.heart)
        .pipe(new CSVRecordStream())
        .on('error', reject)
        .pipe(new CSVObjectStream({
          header: true,
          limit: Number(argv.limit) || 0,
          headerTransform: () => {
            return [
              'start',
              'finish',
              'heartRate',
            ]
          },
          transform: object => {
            return {
              ...object,
              start: new Date(object.start),
              finish: new Date(object.finish),
              heartRate: Number(object.heartRate),
            }
          },
        }))
        .on('error', reject)
        .on('data', (object) => ++count % 100 === 0 ? process.stdout.write(`\r${count} ${object.start}`) : null)
        .pipe(mongoStream)

      } else if (argv.steps) {

        let count = 0

        csv({
          headers: [
            'start',
            'end',
            'steps',
          ],
          colParser: {
            start: item => new Date(item),
            end: item => new Date(item),
            steps: item => Number(item),
          },
        }, {
          objectMode: true,
        })
        .on('error', reject)
        .fromFile(argv.steps)
        .on('data', () => ++count % 1000 === 0 ? process.stdout.write(`\r${count}`) : null)
        .pipe(mongoStream)

      } else if (argv.sleep) {

        let count = 0

        // $FlowFixMe: flatMap undefined
        const sleepPeriods = Array.apply(null, Array(10)).flatMap((item, index) => [`sleepPeriods.${index}.start`, `sleepPeriods.${index}.end`])
        csv({
          headers: [
            'start',
            'end',
            'inBed',
            'asleep',
            'timeToSleep',
            'sleepPeriodCount',
            ...sleepPeriods,
          ],
          colParser: {
            start: (item) => new Date(item),
            end: (item) => new Date(item),
            inBed: item => Number(item),
            asleep: item => Number(item),
            timeToSleep: item => Number(item),
            ...sleepPeriods.reduce((memo, period) => {
              return { ...memo, [period]: (item) => new Date(item) }
            }, {}),
          },
        }, {
          objectMode: true,
        })
        .on('error', reject)
        .fromFile(argv.sleep)
        .on('data', () => process.stdout.write(`\r${++count}`))
        .pipe(mongoStream)

      } else {
        reject(new Error('nothing done'))
      }

    } catch(e) {
      console.error(`'${argv.csv}' - ${e}`)
      reject(e)
    }

  })

}
