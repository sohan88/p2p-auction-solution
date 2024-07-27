'use strict'

const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

const setupDatabase = async (dbDir) => {
    const hcore = new Hypercore(dbDir, { valueEncoding: 'json' })
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await hbee.ready()
    return hbee
}

const getOrGenerateSeed = async (hbee, key) => {
    let seed = (await hbee.get(key))?.value
    if (!seed) {
        seed = crypto.randomBytes(32)
        await hbee.put(key, seed)
    }
    return seed
}

module.exports = {
    setupDatabase,
    getOrGenerateSeed
}
