const express = require("express")
const router = express.Router()
const Blockchain = require('../blockchain/Blockchain')
const Wallet = require('../wallet/Wallet')
const Pubsub = require('../pubsub/Pubsub')
const TransactionPool = require('../transaction/TransactionPool')
const TransactionMiner = require('../transaction/TransactionMiner')

const REDIS_URL = process.env.REDIS_URL

const blockchain = new Blockchain();
const wallet = new Wallet(); 
const transactionPool = new TransactionPool();
const pubsub = new Pubsub({blockchain,transactionPool,REDIS_URL});
const transactionMiner = new TransactionMiner({blockchain,transactionPool,wallet,pubsub})

function block_instance(){ 
     return blockchain
}

function transactionPool_instance(){ 
     return transactionPool
}

function wallet_instance(){ 
     return wallet
}

function transactionMiner_instance(){ 
     return transactionMiner
}

router.get('/blocks',(_req,res)=>{
     res.json(blockchain.chain);
});

router.post('/mine-block',(req,res)=>{
     const {data} = req.body
     blockchain.addBlock({data})
     pubsub.broadcast();
     res.redirect('/blocks')
})

router.post('/make-transaction',(req,res)=>{
     const {amount,receiver} = req.body
     if(amount < 0){
          return res.status(400).json({
               error:'Negative amount'
          })
     }
     let transaction = transactionPool.existTransact({address:wallet.publicKey});
     try{
          if(transaction){
               transaction.updateTransaction({
                    sWallet:wallet,
                    amount,
                    receiver
               })
          }
          else{
               transaction = wallet.createTransaction({
                    amount,
                    receiver,
                    chain:blockchain.chain
               })
          }
     }
     catch(error){
          return res.status(400).json({
               error: error.message
          })
     }
     transactionPool.setTransaction(transaction)
     pubsub.broadcastTransaction(transaction);
     res.json({
          transaction
     });
})

router.get('/transact-pool-map',(_req,res)=>{
     res.json(transactionPool.transactionMap)
})

router.get('/mine-transaction',(_req,res)=>{
     transactionMiner.mineTransactions();
     res.redirect('/blocks')
})

router.get('/wallet-info',(req,res)=>{
     res.json({
          address : wallet.publicKey,
          balance : Wallet.calculateBalance({
               chain:blockchain.chain,
               address:wallet.publicKey
          })
     })
})

module.exports = router
module.exports.block_instance = block_instance;
module.exports.transactionPool_instance = transactionPool_instance;
module.exports.wallet_instance = wallet_instance;
module.exports.transactionMiner_instance = transactionMiner_instance;