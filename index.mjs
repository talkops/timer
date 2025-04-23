import { Extension } from 'talkops'
import { JSONFilePreset } from 'lowdb/node'
import prettyMilliseconds from 'pretty-ms'
import yaml from 'js-yaml'

const db = await JSONFilePreset('/data/db.json', { timers: [] })

const extension = new Extension()
  .setName('Timer')
  .setCategory('utility')
  .setIcon('https://talkops.app/images/extensions/timer.png')
  .setFeatures(['Create a timer', 'Check timer states', 'Delete a timer'])

const instructions = []
instructions.push('``` yaml')
instructions.push(`
You can manage multiple timers.
It is possible to add another timer for the same duration.
Give the durations to the nearest second.
`)
instructions.push(
  yaml.dump({
    timers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          number: {
            type: 'integer',
            description: 'The number of the timer.',
          },
          duration: {
            type: 'string',
            description: 'The duration of the timer.',
          },
          timeleft: {
            type: 'string',
            description: 'The time left of the timer.',
          },
        },
      },
    },
  }),
)
instructions.push('```')
extension.setInstructions(instructions.join('\n'))

extension.setFunctionSchemas([
  {
    name: 'create_timer',
    description: 'Create a timer.',
    parameters: {
      type: 'object',
      properties: {
        duration: {
          type: 'integer',
          description: 'The duration of the timer in seconds.',
        },
      },
      required: ['duration'],
    },
  },
  {
    name: 'get_timers',
    description: 'Get timers.',
  },
  {
    name: 'delete_timer',
    description: 'Cancel a timer.',
    parameters: {
      type: 'object',
      properties: {
        number: {
          type: 'integer',
          description: 'The number of the timer.',
        },
      },
      required: ['number'],
    },
  },
])

function getNextTimerNumber() {
  let number = 1
  for (const timer of db.data.timers) {
    if (timer.number < number) continue
    number = timer.number + 1
  }
  return number
}

extension.setFunctions([
  function create_timer(duration) {
    duration = duration * 1000
    const number = getNextTimerNumber()
    const createdAt = new Date().getTime()
    const completeAt = createdAt + duration
    db.update(({ timers }) => timers.push({ number, createdAt, completeAt, duration }))
    return `Timer #${number} has been created.`
  },
  function get_timers() {
    return yaml.dump(
      db.data.timers.map((timer) => {
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
  function delete_timer(number) {
    for (const timer of db.data.timers) {
      if (timer.number !== number) continue
      db.data.timers = db.data.timers.filter((t) => t !== timer)
      db.write()
      return `Timer #${number} has been deleted.`
    }
    return 'Not found.'
  },
])

setInterval(() => {
  const now = new Date().getTime()
  for (const timer of db.data.timers) {
    if (timer.completeAt > now) continue
    db.data.timers = db.data.timers.filter((t) => t !== timer)
    db.write()
    extension.enableAlarm()
    extension.sendMessage(`Timer #${timer.number} is complete.`)
  }
}, 1000)
