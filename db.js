import { JSONFilePreset } from 'lowdb/node'

const db = await JSONFilePreset('/data/db.json', { timers: [] })

export function addTimer(timer) {
  db.update(({ timers }) => timers.push(timer))
}

export function removeTimer(timer) {
  db.data.timers = db.data.timers.filter((t) => t !== timer)
  db.write()
}

export function getTimers() {
  return db.data.timers
}
