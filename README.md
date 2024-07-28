# P2P Auction Application

This is a peer-to-peer auction application built using Hyperswarm RPC, Hypercores, and Hyperbee. The application allows users to create auctions, place bids, and close auctions, all within a decentralized network.

## Features

- **Create Auction**: Start a new auction with an item and a starting price.
- **Place Bid**: Place bids on active auctions.
- **Close Auction**: Close an auction and determine the highest bidder.
- **Peer-to-Peer Networking**: Connect to other peers in the network to share auction updates.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/p2p-auction.git
   cd p2p-auction
   ```
2. Install the dependencies:

   ```bash
   npm install
   ```
   
3. Install the Hyperdht package:

   ```bash
    npm install hyperdht -g
    ```
   
## Usage

Firstly yopu need to start the DHT server to connect to the network. You can start the DHT server by running the below command

``` $ hyperdht --bootstrap --host 127.0.0.1 --port 30001```

   1. Start the application with a specified database directory:

      ```bash
      node main.js /path/to/database
      ```
## Commands
   * Connect to a peer:

     ```bash
     connect <peerPublicKey>
     ```
Example: `connect 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

   * Create an auction:

     ```bash
     createAuction <item> <price>
     ```
Example: `createAuction "Laptop" 500`
   
   * Place a bid:

     ```bash
     placeBid <auctionId> <price>
     ```
Example: `placeBid 1234567890abcdef1234567890abcdef1234567890abcdef 600`
   
* Close an auction:

     ```bash
     closeAuction <auctionId>
     ```

## Project Structure
* main.js: Entry point and command-line interface.
* auctionService.js: Handles auction-related logic.
* peerService.js: Manages peer connections.
* rpcService.js: Sets up and manages the RPC server.
* database.js: Initializes and manages the Hypercore and Hyperbee database.
* dhtService.js: Sets up the DHT.

## Known Issues 
- Close Auction action is not working at accurate. Need some debugging
- Need to add Unit Tests
- DB files are locked on restart. Need to fix this issue


