import { Alarm, Extension, Notification } from 'talkops'
import prettyMilliseconds from 'pretty-ms'
import yaml from 'js-yaml'

const extension = new Extension()
  .setName('Timer')
  .setCategory('utility')
  .setIcon('https://cdn0.iconfinder.com/data/icons/corona-virus-6/48/15-512.png')
  .setFeatures(['Create a timer', 'Check timer states', 'Delete a timer'])

const baseInstructions = `
You can manage multiple timers.
It is possible to add another timer for the same duration.
`

import timersModel from './schemas/models/timers.json' with { type: 'json' }

const instructions = [baseInstructions]
instructions.push('``` yaml')
instructions.push(yaml.dump({ timersModel }))
instructions.push('```')
extension.setInstructions(instructions.join('\n'))

import create_timer from './schemas/functions/create_timer.json' with { type: 'json' }
import get_timers from './schemas/functions/get_timers.json' with { type: 'json' }
import delete_timer from './schemas/functions/delete_timer.json' with { type: 'json' }

extension.setFunctionSchemas([create_timer, get_timers, delete_timer])

import { addTimer, removeTimer, getTimers } from './db.js'

function getClientTimers(clientId) {
  return getTimers().filter((timer) => timer.clientId === clientId)
}

function getNextClientTimerNumber(clientId) {
  let number = 1
  for (const timer of getClientTimers(clientId)) {
    if (timer.number < number) continue
    number = timer.number + 1
  }
  return number
}

extension.setFunctions([
  function create_timer(duration, clientId) {
    duration = duration * 1000
    const number = getNextClientTimerNumber(clientId)
    const createdAt = new Date().getTime()
    const completeAt = createdAt + duration
    addTimer({ number, createdAt, completeAt, duration, clientId })
    return `The timer ${number} has been created.`
  },
  function get_timers(clientId) {
    return yaml.dump(
      getClientTimers(clientId).map((timer) => {
        return {
          number: timer.number,
          duration: prettyMilliseconds(timer.duration, {
            verbose: true,
          }),
          timeleft: prettyMilliseconds(timer.completeAt - new Date().getTime(), {
            verbose: true,
            separateMilliseconds: true,
          }),
        }
      }),
    )
  },
  function delete_timer(number, clientId) {
    for (const timer of getClientTimers(clientId)) {
      if (timer.number !== number) continue
      removeTimer(timer)
      return `The timer ${number} has been deleted.`
    }
    return 'Not found.'
  },
])

setInterval(() => {
  const now = new Date().getTime()
  for (const timer of getTimers()) {
    if (timer.completeAt > now) continue
    removeTimer(timer)
    service.send([
      new Alarm().setFrom(extension.name).addTo(timer.clientId),
      new Notification()
        .setFrom(extension.name)
        .addTo(timer.clientId)
        .setText(`The timer ${timer.number} is complete.`),
    ])
  }
}, 1000)
