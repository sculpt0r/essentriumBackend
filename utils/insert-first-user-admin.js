const store = require('../local_modules/store')
const bcrypt = require('bcrypt')
const yargs = require('yargs')

let createPlayer = function (argv) {
  const email = argv.email
  const priviliges = argv.priviliges
  const name = argv.name
  let hashPass = argv.password
  const saltRounds = 1;

  // bcrypt.compare(myPlaintextPassword, hash, function(err, res) {
  //   // res == true
  // });

  bcrypt.hash(hashPass, saltRounds)
    .then((hash) => preparePlayerData(hash, email, name, priviliges))
}

const preparePlayerData = function (hash, email, name, priviliges) {
  const accountData = {
    email: email,
    password: hash,
    priviliges: priviliges
  }

  console.table(accountData)

  store.connect((db) => { insertFakePlayer(accountData, name, db) })
}

// //https://www.npmjs.com/package/yargs
//FEATURE translate to other langs: https://github.com/projectfluent/fluent.js

const playerData = (id, name) => {
  const obj = {
    name: name,
    hp: 10,
    strength: 1.0,
    toughness: 1.0,
    willpower: 1.0
  }

  if (id != '') { obj._id = id }
  return obj
}
// const travelData = (id) => {
//     const obj = {
//         coords: { x: 0, y: 0, z: 0 },
//         innerCoords: { x: 0, y: 0, z: 0 }
//     }

//     if (id != '') { obj._id = id }
//     return obj
// }
const insertFakePlayer = (accountData, name, db) => {
  db.collection('accounts')
    .insert(accountData,
      (err, response) => {
        if (err) { console.log(err) }
        console.log(response.ops[0])
        db.collection('players').insert(playerData(response.ops[0]._id, name))
        // db.collection('travels').insert(travelData(response.ops[0]._id))
      })
}

yargs.command({
  command: 'create',
  usage: 'Usage: $0 <command> [options]',
  builder: {
    email: {
      describe: 'Account email',
      demandOption: true,
      type: String
    },
    password: {
      describe: 'password',
      demandOption: true,
      type: String
    },
    name: {
      describe: 'Player name',
      demandOption: true,
      type: String
    },
    priviliges: {
      describe: 'privigliges',
      demandOption: true,
      type: Array
    }
  },
  handler: createPlayer
})

yargs.parse()