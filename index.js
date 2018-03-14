// @flow

import fs from 'fs'
import csv from 'csvtojson'

const type = process.argv[2]
const input = process.argv[3]
const output = process.argv[4]

let outputStream

try {
  outputStream = fs.createWriteStream(output)
} catch (e) {
  console.error(`Output: '${output}' - ${e.message}`)
  process.exit()
}

try {

  switch (type) {
    case 'heart': {
      csv({
        toArrayString: true,
        headers: [
          'start',
          'end',
          'heartRate',
        ],
        colParser: {
          start: item => new Date(item),
          end: item => new Date(item),
        },
      })
      .fromFile(input)
      .pipe(outputStream)
      break
    }
    case 'steps': {
      csv({
        toArrayString: true,
        headers: [
          'start',
          'end',
          'steps',
        ],
        colParser: {
          start: item => new Date(item),
          end: item => new Date(item),
        },
      })
      .fromFile(input)
      .pipe(outputStream)
      break
    }
    case 'sleep': {
      // $FlowFixMe: flatMap undefined
      const sleepPeriods = Array.apply(null, Array(10)).flatMap((item, index) => [`sleepPeriods.${index}.start`, `sleepPeriods.${index}.end`])
      csv({
        toArrayString: true,
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
          ...sleepPeriods.reduce((memo, period) => {
            return { ...memo, [period]: (item) => new Date(item) }
          }, {}),
        },
      })
      .fromFile(input)
      .pipe(outputStream)
      break
    }
    default: {
      throw new Error(`'${type}' should be one of heart, steps, sleep`)
    }
  }

} catch(e) {
  console.error(`'${input}' - ${e.message}`)
}
