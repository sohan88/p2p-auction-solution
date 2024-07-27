'use strict'

const crypto = require('crypto')

const auctions = new Map()

const createAuction = async (req) => {
    const auctionId = crypto.randomBytes(16).toString('hex')
    auctions.set(auctionId, { item: req.item, price: req.price, bids: [] })
    return { auctionId }
}

const placeBid = async (req) => {
    const auction = auctions.get(req.auctionId)
    if (auction) {
        auction.bids.push({ clientId: req.clientId, bid: req.bid })
        return { success: true }
    }
    return { success: false, error: 'Auction not found' }
}

const closeAuction = async (req) => {
    const auction = auctions.get(req.auctionId)
    if (auction) {
        const highestBid = auction.bids.reduce((max, bid) => bid.bid > max.bid ? bid : max, { bid: 0 })
        auctions.delete(req.auctionId)
        return { success: true, winner: highestBid.clientId, amount: highestBid.bid }
    }
    return { success: false, error: 'Auction not found' }
}

module.exports = {
    createAuction,
    placeBid,
    closeAuction
}
