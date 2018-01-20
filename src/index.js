require('dotenv').config()

import Twitter from 'twitter'

const fs = require('fs')

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
})

const TROLL_TRIGER = new RegExp('(?:wow) (?:cocky) (.*)', )
const MOCK_NOOBS = new RegExp('(?:@) (.*)', )

let victimList = {}

const filterTrigger = (text, pattern) => {
  let search = pattern.exec(text)
  return search[1].toLowerCase()
}

const pushToMemory = (trigger, name) => {
  return  (victimList[trigger] == null) ? victimList[trigger] = [name] :
          (victimList[trigger].indexOf(name) < 0) ? victimList[trigger].push(name) :
          false
}

const writeFile = dataFile => {
  fs.writeFile("./dataStore.json", JSON.stringify(dataFile, null, 4), (err) => {
    if (err) console.error(err)
  })
}

const replyTo = (id, author, target) => {
  client.post('statuses/update', {
    status: `Hey @${target} - @${author} is on the money!!`, 
    in_reply_to_status_id: id
  }, (error, tweet, response) => {
    if(error) throw error
  })
}

async function mergeData() {
  let dataFile = require('../dataStore.json')
  let memKeys = Object.keys(victimList)
  for (let i = 0; i < memKeys.length; i++) {
    (Object.keys(dataFile).indexOf(memKeys[i]) < 0) 
      ? dataFile[memKeys[i]] = victimList[memKeys[i]]
      : dataFile[memKeys[i]] = [ ...new Set([ ...dataFile[memKeys[i]], ...victimList[memKeys[i]]]) ]
  }
  writeFile(dataFile)
}

async function saveVictim(tweet) {
  let trigger = await filterTrigger(tweet.text, TROLL_TRIGER)
  let victimSaved = await pushToMemory(trigger, tweet.in_reply_to_screen_name)
  if (victimSaved) mergeData()
}

async function commenceMockery(tweet) {
  let trigger = await filterTrigger(tweet.text, MOCK_NOOBS)
  let dataFile = require('../dataStore.json')
  if (Object.keys(dataFile).indexOf(trigger) >= 0) {
    for (let i = 0; i < dataFile[trigger].length; i++) {
      replyTo(tweet.id_str, tweet.in_reply_to_screen_name, dataFile[trigger][i])
    }
  }
}

client.stream('statuses/filter', {follow: process.env.TWITTER_ID}, (stream) => {
  stream.on('data', (tweet) => {
    if (TROLL_TRIGER.test(tweet.text)) saveVictim(tweet)
    if (MOCK_NOOBS.test(tweet.text)) commenceMockery(tweet)
  })
  stream.on('error', (error) => {
    console.log(error)
  })
})