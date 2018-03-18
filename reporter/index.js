// @flow

import { MongoClient } from 'mongodb'

const pipeline = [
  {
    $project: {
      startHour: { '$hour' : '$start' },
      endHour: { '$hour' : '$end' },
      start: '$start',
      end: '$end',
      heartRate: '$heartRate',
      date: {
        $dateToParts: { date: '$start' },
      },
    },
  },
  {
    $match: {
      startHour: { $gte: 0 },
      endHour: { $lte: 6 },
    },
  },
  {
    $project: {
      start: '$start',
      end: '$end',
      heartRate: '$heartRate',
    },
  },
]

MongoClient.connect('mongodb://localhost:27017')
.then(client => {
  return client.db('HealthKit').collection('Heart').aggregate(pipeline).limit(10).toArray()
    .then(data => console.log(data))
    .finally(() => client.close())
})
.catch(e => console.error(e))
