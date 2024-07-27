'use strict'

const peers = new Map()

const connectToPeer = async (rpc, peerPublicKey) => {
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

const notifyAllPeers = async (message) => {
    for (const [peerHex, client] of peers) {
        try {
            await client.request('notify', Buffer.from(JSON.stringify(message), 'utf-8'))
        } catch (error) {
            console.error('Error notifying peer:', peerHex, error)
        }
    }
}

module.exports = {
    connectToPeer,
    notifyAllPeers
}
