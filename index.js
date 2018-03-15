// @flow

import csv from 'csvtojson'
import { streamToMongoDB } from 'stream-to-mongo-db'
import yargs from 'yargs'
import { MongoClient } from 'mongodb'

const argv = yargs
  .option('drop', {
    boolean: true,
    describe: 'Drop the destination collection before inserting',
  })
  .option('mongodb', {
    describe: 'URL of the MongoDb server, e.g. mongodb://localhost:27017/Database',
  })
  .option('collection', {
    describe: 'Name of the collection, e.g. Data',
  })
  .option('csv', {
    describe: 'Path to CSV file to read as input',
  })
  .option('heart', {
    boolean: true,
    describe: 'Import Heart Rate data from CSV',
  })
  .option('steps', {
    boolean: true,
    describe: 'Import Step Data from CSV',
  })
  .option('sleep', {
    boolean: true,
    describe: 'Import Sleep Data from CSV',
  })
  .demandOption([ 'mongodb', 'csv', 'collection' ])
  .argv

convert(argv)

async function convert(argv) {

  console.log(`Importing '${argv.csv}'\nto '${argv.mongodb}' '${argv.collection}' ${argv.drop ? '(dropped)' :''}`)
  try {

    if (argv.drop) {
      const conn = await MongoClient.connect(argv.mongodb)
      const dbname = argv.mongodb.split('/').slice(-1).pop()
      try {
        await conn.db(dbname).collection(argv.collection).deleteMany({})
      } catch (e) {
        console.error(e)
        process.exit()
      }
      await conn.close()
    }

    const outputConfig = {
      dbURL: argv.mongodb,
      collection: argv.collection,
      batchSize: 1,
    }

    const mongoStream = streamToMongoDB(outputConfig)

    if (argv.heart) {

      let count = 0

      csv({
        headers: [
          'start',
          'end',
          'heartRate',
        ],
        colParser: {
          start: item => new Date(item),
          end: item => new Date(item),
          heartRate: item => Number(item),
        },
      }, {
        objectMode: true,
      })
      .fromFile(argv.csv)
      // .on('data', data => console.log(data))
      .on('data', () => ++count % 1000 === 0 ? process.stdout.write(`\r${count}`) : null)
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
      .fromFile(argv.csv)
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
      .fromFile(argv.csv)
      .on('data', () => process.stdout.write(`\r${++count}`))
      .pipe(mongoStream)

    }

  } catch(e) {
    console.error(`'${argv.csv}' - ${e}`)
  }

}
