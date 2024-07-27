'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')

const main = async () => {
    // hyperbee db
    const hcore = new Hypercore('./db/rpc-server')
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await hbee.ready()

    // resolved distributed hash table seed for key pair
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
        // not found, generate and store in db
        dhtSeed = crypto.randomBytes(32)
        await hbee.put('dht-seed', dhtSeed)
    }

    // start distributed hash table, it is used for rpc service discovery
    const dht = new DHT({
        port: 40001,
        keyPair: DHT.keyPair(dhtSeed),
        bootstrap: [{ host: 'localhost', port: 30001 }] // note boostrap points to dht that is started via cli
    })
    await dht.ready()

    // resolve rpc server seed for key pair
    let rpcSeed = (await hbee.get('rpc-seed'))?.value
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32)
        await hbee.put('rpc-seed', rpcSeed)
    }

    // setup rpc server
    const rpc = new RPC({ seed: rpcSeed, dht })
    const rpcServer = rpc.createServer()
    await rpcServer.listen()
    console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))
    // rpc server started listening on public key: 763cdd329d29dc35326865c4fa9bd33a45fdc2d8d2564b11978ca0d022a44a19

    // bind handlers to rpc server
    rpcServer.respond('ping', async (reqRaw) => {
        // reqRaw is Buffer, we need to parse it
        console.log("ping request received")
        const req = JSON.parse(reqRaw.toString('utf-8'))

        const resp = { nonce: req.nonce + 1 }

        // we also need to return buffer response
        const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8')
        return respRaw
    })
}

main().catch(console.error)
