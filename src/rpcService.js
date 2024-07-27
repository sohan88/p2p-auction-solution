'use strict'

const RPC = require('@hyperswarm/rpc')
const auctionService = require('./auctionService')
const peerService = require('./peerService')

const setupRPCServer = async (dht, rpcSeed, notifyAllPeers) => {
    const rpc = new RPC({ seed: rpcSeed, dht })
    const rpcServer = rpc.createServer()
    await rpcServer.listen()
    console.log('RPC server started listening on public key:', rpcServer.publicKey.toString('hex'))

    rpcServer.respond('createAuction', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'))
        const auction = await auctionService.createAuction(req)
        await notifyAllPeers({ type: 'newAuction', auctionId: auction.auctionId, item: req.item, price: req.price })
        return Buffer.from(JSON.stringify(auction), 'utf-8')
    })

    rpcServer.respond('placeBid', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'))
        const result = await auctionService.placeBid(req)
        if (result.success) {
            await notifyAllPeers({ type: 'newBid', auctionId: req.auctionId, clientId: req.clientId, bid: req.bid })
        }
        return Buffer.from(JSON.stringify(result), 'utf-8')
    })

    rpcServer.respond('closeAuction', async (reqRaw) => {
        const req = JSON.parse(reqRaw.toString('utf-8'))
        const result = await auctionService.closeAuction(req)
        if (result.success) {
            await notifyAllPeers({ type: 'auctionClosed', auctionId: req.auctionId, winner: result.winner, amount: result.amount })
        }
        return Buffer.from(JSON.stringify(result), 'utf-8')
    })

    rpcServer.respond('notify', async (reqRaw) => {
        const message = JSON.parse(reqRaw.toString('utf-8'))
        console.log('Received notification:', message)
    })

    return { rpc, rpcServer }
}

module.exports = {
    setupRPCServer
}
