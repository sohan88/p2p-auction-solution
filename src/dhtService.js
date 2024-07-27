'use strict'

const DHT = require('hyperdht')

const setupDHT = async (dhtSeed) => {
    const dht = new DHT({
        port: 40001 + Math.floor(Math.random() * 1000),
        keyPair: DHT.keyPair(dhtSeed),
        bootstrap: [{ host: '127.0.0.1', port: 30001 }]
    })
    await dht.ready()
    return dht
}

module.exports = {
    setupDHT
}
