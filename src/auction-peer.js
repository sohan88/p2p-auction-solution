'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const readline = require('readline')

const auctions = new Map()
const peers = new Map() // Change to Map to keep track of RPC clients

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

    const hcore = new Hypercore(dbDir, { valueEncoding: 'json' })
    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    await hbee.ready()

    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
        dhtSeed = crypto.randomBytes(32)
        await hbee.put('dht-seed', dhtSeed)
    }

    const dht = new DHT({
        port: 40001 + Math.floor(Math.random() * 1000),
        keyPair: DHT.keyPair(dhtSeed),
        bootstrap: [{ host: '127.0.0.1', port: 30001 }]
    })
    await dht.ready()

    let rpcSeed = (await hbee.get('rpc-seed'))?.value
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32)
        await hbee.put('rpc-seed', rpcSeed)
    }

    const rpc = new RPC({ seed: rpcSeed, dht })
    const rpcServer = rpc.createServer()
    await rpcServer.listen()
    console.log('RPC server started listening on public key:', rpcServer.publicKey.toString('hex'))

    rpcServer.respond('createAuction', async (reqRaw) => {
        try {
            const req = JSON.parse(reqRaw.toString('utf-8'))
            const auctionId = crypto.randomBytes(16).toString('hex')
            auctions.set(auctionId, { item: req.item, price: req.price, bids: [] });
            console.log("Inside createAuction function");
            await notifyAllPeers({ type: 'newAuction', auctionId, item: req.item, price: req.price })
            return Buffer.from(JSON.stringify({ auctionId }), 'utf-8')
        } catch (error) {
            console.error('Error handling createAuction:', error)
            return Buffer.from(JSON.stringify({ error: 'Failed to create auction' }), 'utf-8')
        }
    })

    rpcServer.respond('placeBid', async (reqRaw) => {
        try {
            const req = JSON.parse(reqRaw.toString('utf-8'))
            const auction = auctions.get(req.auctionId)
            if (auction) {
                auction.bids.push({ clientId: req.clientId, bid: req.bid })
                await notifyAllPeers({ type: 'newBid', auctionId: req.auctionId, clientId: req.clientId, bid: req.bid })
                return Buffer.from(JSON.stringify({ success: true }), 'utf-8')
            } else {
                return Buffer.from(JSON.stringify({ success: false, error: 'Auction not found' }), 'utf-8')
            }
        } catch (error) {
            console.error('Error handling placeBid:', error)
            return Buffer.from(JSON.stringify({ success: false, error: 'Failed to place bid' }), 'utf-8')
        }
    })

    rpcServer.respond('closeAuction', async (reqRaw) => {
        try {
            const req = JSON.parse(reqRaw.toString('utf-8'))
            const auction = auctions.get(req.auctionId)
            if (auction) {
                const highestBid = auction.bids.reduce((max, bid) => bid.bid > max.bid ? bid : max, { bid: 0 })

                await notifyAllPeers({ type: 'auctionClosed', auctionId: req.auctionId, winner: highestBid.clientId, amount: highestBid.bid })
                auctions.delete(req.auctionId)
                return Buffer.from(JSON.stringify({ success: true, winner: highestBid.clientId, amount: highestBid.bid }), 'utf-8')
            } else {
                return Buffer.from(JSON.stringify({ success: false, error: 'Auction not found' }), 'utf-8')
            }
        } catch (error) {
            console.error('Error handling closeAuction:', error)
            return Buffer.from(JSON.stringify({ success: false, error: 'Failed to close auction' }), 'utf-8')
        }
    })

    rpcServer.respond('notify', async (reqRaw) => {
        try {

            const message = JSON.parse(reqRaw.toString('utf-8'))
            console.log('Received notification:', message)
        } catch (error) {
            console.error('Error handling notify:', error)
        }
    })

    const notifyAllPeers = async (message) => {
        for (const [peerHex, client] of peers) {
            try {
                console.log("Inside notifyAllPeers function");
                await client.request('notify', Buffer.from(JSON.stringify(message), 'utf-8'))
            } catch (error) {
                console.error('Error notifying peer:', peerHex, error)
            }
        }
    }

    const connectToPeer = async (peerPublicKey) => {
        const peerHex = peerPublicKey.toString('hex')
        if (!peers.has(peerHex)) {
            try {
                const client = await rpc.connect(peerPublicKey)
                peers.set(peerHex, client)
                console.log(`Connected to peer ${peerHex}`)
            } catch (error) {
                console.error(`Failed to connect to peer ${peerHex}:`, error)
            }
        } else {
            console.log(`Already connected to peer ${peerHex}`)
        }
    }

    const createAuction = async (item, price) => {
        try {
            console.log("Inside createAuction function", item, price);
            const response = await rpc.request(Buffer.from(rpcServer.publicKey.toString('hex'), 'hex'), 'createAuction', Buffer.from(JSON.stringify({ item, price }), 'utf-8'))
            const auction = JSON.parse(response.toString('utf-8'))
            return auction
        } catch (error) {
            console.error('Error creating auction:', error)
        }
    }

    const placeBid = async (auctionId, clientId, bid) => {
        try {
            const response = await rpc.request(Buffer.from(rpcServer.publicKey.toString('hex'), 'hex'), 'placeBid', Buffer.from(JSON.stringify({ auctionId, clientId, bid }), 'utf-8'))
            const result = JSON.parse(response.toString('utf-8'))
            return result
        } catch (error) {
            console.error('Error placing bid:', error)
        }
    }

    const closeAuction = async (auctionId) => {
        try {
            const response = await rpc.request(Buffer.from(rpcServer.publicKey.toString('hex'), 'hex'), 'closeAuction', Buffer.from(JSON.stringify({ auctionId }), 'utf-8'))
            const result = JSON.parse(response.toString('utf-8'))
            return result
        } catch (error) {
            console.error('Error closing auction:', error)
        }
    }

    const interactivePrompt = () => {
        rl.question('Enter command: ', async (input) => {
            const [command, ...args] = input.split(' ')
            try {
                switch (command) {
                    case 'connect':
                        await connectToPeer(Buffer.from(args[0], 'hex'))
                        break
                    case 'createAuction':
                        const auction = await createAuction(args[0], parseFloat(args[1]))
                        console.log(`Auction created: ${JSON.stringify(auction)}`)
                        break
                    case 'placeBid':
                        const bid = await placeBid(args[0], rpcServer.publicKey.toString('hex'), parseFloat(args[1]))
                        console.log(`Bid placed: ${JSON.stringify(bid)}`)
                        break
                    case 'closeAuction':
                        const result = await closeAuction(args[0])
                        console.log(`Auction closed: ${JSON.stringify(result)}`)
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
