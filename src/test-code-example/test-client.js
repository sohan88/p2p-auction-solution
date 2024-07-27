
const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

const main = async () => {
    try {
        // Initialize Hypercore, Hyperbee, and DHT
        const hcore = new Hypercore('./db/rpc-client')
        const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
        await hbee.ready()

        let dhtSeed = (await hbee.get('dht-seed'))?.value
        if (!dhtSeed) {
            dhtSeed = crypto.randomBytes(32)
            await hbee.put('dht-seed', dhtSeed)
        }

        const dht = new DHT({
            port: 50001,
            keyPair: DHT.keyPair(dhtSeed),
            bootstrap: [{ host: 'localhost', port: 30001 }]
        })
        await dht.ready()

        const serverPubKey = Buffer.from('1329126a5d83c3b856f717a8294cca4ffacbcc3ab2132ae9f98274703230ca3b', 'hex')
        const rpc = new RPC({ dht })

        const payload = { nonce: 126 }
        const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8')

        try {
            const respRaw = await rpc.request(serverPubKey, 'ping', payloadRaw)
            const resp = JSON.parse(respRaw.toString('utf-8'))
            console.log(resp) // { nonce: 127 }
        } catch (requestError) {
            console.error('Request failed:', requestError)
        }

      //  await rpc.destroy()
      //  await dht.destroy()
    } catch (error) {
        console.error('Error:', error)
    }
}

main().catch(console.error)
