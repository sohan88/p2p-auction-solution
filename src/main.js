'use strict'

const readline = require('readline')
const { setupDatabase, getOrGenerateSeed } = require('./database')
const { setupDHT } = require('./dhtService')
const { setupRPCServer } = require('./rpcService')
const peerService = require('./peerService')
const auctionService = require('./auctionService')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const main = async () => {
    const dbDir = process.argv[2]
    if (!dbDir) {
        console.error('Please provide a database directory as an argument.')
        process.exit(1)
    }

    const hbee = await setupDatabase(dbDir)
    const dhtSeed = await getOrGenerateSeed(hbee, 'dht-seed')
    const rpcSeed = await getOrGenerateSeed(hbee, 'rpc-seed')

    const dht = await setupDHT(dhtSeed)
    const { rpc, rpcServer } = await setupRPCServer(dht, rpcSeed, peerService.notifyAllPeers)

    const interactivePrompt = () => {
        rl.question('Enter command: ', async (input) => {
            const [command, ...args] = input.split(' ')
            try {
                switch (command) {
                    case 'connect':
                        await peerService.connectToPeer(rpc, Buffer.from(args[0], 'hex'))
                        break
                    case 'createAuction':
                        const auction = await rpc.request(Buffer.from(rpcServer.publicKey.toString('hex'), 'hex'), 'createAuction', Buffer.from(JSON.stringify({ item: args[0], price: parseFloat(args[1]) }), 'utf-8'))
                        console.log(`Auction created: ${JSON.stringify(JSON.parse(auction.toString('utf-8')))}`)
                        break
                    case 'placeBid':
                        const bid = await rpc.request(Buffer.from(rpcServer.publicKey.toString('hex'), 'hex'), 'placeBid', Buffer.from(JSON.stringify({ auctionId: args[0], clientId: rpcServer.publicKey.toString('hex'), bid: parseFloat(args[1]) }), 'utf-8'))
                        console.log(`Bid placed: ${JSON.stringify(JSON.parse(bid.toString('utf-8')))}`)
                        break
                    case 'closeAuction':
                        const result = await rpc.request(Buffer.from(rpcServer.publicKey.toString('hex'), 'hex'), 'closeAuction', Buffer.from(JSON.stringify({ auctionId: args[0] }), 'utf-8'))
                        console.log(`Auction closed: ${JSON.stringify(JSON.parse(result.toString('utf-8')))}`)
                        break
                    default:
                        console.log('Unknown command')
                }
            } catch (error) {
                console.error('Error:', error)
            }
            interactivePrompt()
        })
    }

    interactivePrompt()
}

main().catch(console.error)
