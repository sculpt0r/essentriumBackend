const store = require('../local_modules/store')
const playerUtil = require('./player')
const guild = store.db.collection('guilds')
const chatMgr = require('../io-chat')
//
// INNER FUNCTIONS
//
const findMemberWithId = function (members, searchedId) {
  return members.find(member => JSON.stringify(member._id) === JSON.stringify(searchedId))
}
const pullPlayerOutOfGuild = function (playerId, guildId) {
  guild.findOne({ _id: guildId }, (err, foundGuild) => {
    if (foundGuild) {
      const playerObjectId = store.ObjectId(playerId)
      //ASSUME [DB] -> fields that are ObjectId has name: '_id'
      if (foundGuild.members.count > 1) {
        //remove from members
        guild.updateOne({ _id: foundGuild._id }, {
          $pull: {
            members: { _id: playerObjectId }
          }
        })
        //ASSUME [GAMEPLAY] wont loose guild if founder leave
        const { role } = findMemberWithId(foundGuild.members, playerId)
        if (role === gameplay.ADMIN) {

          //give admin to any random SUBADMIN
          guild.updateOne({
            "members.role": gameplay.SUB_ADMIN
          },
            {
              $set: { "members.$.role": gameplay.ADMIN }
            }, (err, result) => {

              console.log("try to set admin to random person", result)
            })
        }
      } else {
        //remove whole guild! this is the only member
        guild.remove({ _id: foundGuild._id }, (err, removeResults) => {
          console.log("remove guild!", err, removeResults)
          chatMgr.RemoveNamespaceSocket(foundGuild.name)
        })
      }
    }
    else {
      console.log('playe has no guild so far!');
    }
  })
}
const findMyGuild = function (id, resultCallback) {
  const playerId = store.ObjectId(id)
  guild.findOne(
    {
      members:
      {
        $elemMatch: { _id: playerId }
      }
    },
    resultCallback
  )
}
const gameplay = {
  setRole: function (req, res, next) {
    const memberId = req.body.memberId
    const newRole = req.body.newRole
    //verify if req user is admin
    //verify if new role is admin/subadmin/member
    //set memberIu new role
    findMyGuild(req.body._id, (err, result) => {
      console.log(result);

      const selfMember = findMemberWithId(result.members, req.body._id)
      if (selfMember.role === gameplay.ADMIN && (
        newRole === gameplay.ADMIN || newRole === gameplay.SUB_ADMIN || newRole === gameplay.MEMBER
      )) {
        guild.updateOne({
          members: { $elemMatch: { _id: store.ObjectId(memberId) } }
        }, {
            $set: { 'members.$.role': newRole }
          }, (err, findedUser) => {
            if (err) { res.json(err) }
            else {
              res.json(findedUser)
            }
          })
      }
    })
  },
  requestDecision: function (req, res, next) {
    console.log('my decision: ' + req.params.decision)
    console.log('id: ' + req.params.id)
    //find request!
    const requestIdObject = store.ObjectId(req.params.id)

    if (req.params.decision === 'accept') {
      guild.findOne({ _id: requestIdObject }, (err, request) => {

        //find player current guild
        guild.findOne({
          members:
          {
            $elemMatch: { _id: store.ObjectId(request.playerId) }
          }
        }, (err, result) => {
          if (result) {
            pullPlayerOutOfGuild(request.playerId, result._id)
          }
          guild.updateOne({ _id: request.guildId }, {
            $push: {
              "members": { _id: request.playerId, role: gameplay.MEMBER }
            }
          }, (err, results) => {
            console.log('modified' + results.modifiedCount, 'matched: ' + matchedCount)
          })
        })
      })
    }
    else if (req.params.decision === 'deny') {
      //for now - do nth, just remove request from db in both cases

    }

    guild.remove({ _id: store.ObjectId(req.params.id) }, (err, result) => {
      if (err) { res.json(err) }
      else {
        res.json(result)
      }
    })
  },
  ask: function (req, res, next) {
    //ASSUME [GAMEPLAY] cannot try join to same guild!

    console.log('*** ask id ***')
    console.log('guild id: ' + req.params.id)
    //new entry with ask (can ask any nums of guild same time!)
    const entry = {
      guildId: store.ObjectId(req.params.id),
      playerId: store.ObjectId(req.body._id)
    }
    guild.find(entry).count((err, total) => {
      if (total < 1) {
        guild.insertOne(entry, (err, results) => {
          if (err) { res.json(err) }
          else {
            res.json(results)
          }
        });
      } else {
        res.json({ msg: 'Already sign up!' })
      }
    })
    console.log('*** ask id END ***')
  },
  deleteGuild: function (req, res, next) {
    console.log("*** DELETE ***")
    console.log('guild id: ' + req.params.id)
    console.log('player id ' + store.ObjectId(req.body._id))

    //only delete this guild, where player has admin priviliges!
    guild.findOne({
      _id: store.ObjectId(req.params.id)
    }, (err, findResult) => {
      chatMgr.RemoveNamespaceSocket(findResult.name)
    })
    guild.remove({
      _id: store.ObjectId(req.params.id),
      members: { _id: store.ObjectId(req.body._id), role: 'admin' }
    },
      (err, result) => {
        if (err) { res.json(err) }
        else {
          res.json(result)
        }
      })
    console.log("*** DELETE END ***")
  },
  createGuild: function (req, res, next) {
    console.log('CREATE NEW GUILD')
    const playerId = req.body._id
    const guildName = req.body.name

    guild
      .find({ name: guildName })
      .count((err, total) => {
        if (total < 1) {
          findMyGuild(playerId, (err, myGuild) => {
            //player already has a guild!
            if (myGuild) {
              pullPlayerOutOfGuild(playerId, myGuild._id)
            }
            guild.insertOne(
              {
                name: guildName,
                members: [{
                  _id: playerId,
                  role: 'admin'
                }]
              },
              (err, result) => {
                if (err) { res.json(err) }
                else {
                  chatMgr.AddNamespaceSocket(guildName)
                  res.json(result)
                }
              })
          })
        } else {
          res.json({ msg: 'guild with that name already exists!' })
        }
      })
  },
  myGuild: function (req, res, next) {
    console.log("*** MY ***");
    //search only for playerguild
    findMyGuild(req.body._id,
      (err, result) => {
        if (err) { res.json(err) }
        if (result) {

          const selfMember = findMemberWithId(result.members, req.body._id)
          if (selfMember.role === 'admin' || selfMember.role === 'subadmin') {
            guild.find({
              guildId: result._id
            }).toArray((errRequests, requests) => {
              if (err || errRequests) {
                res.json({ err, errRequests })
              } else {
                console.log(requests.data);
                //TODO WTF wait COunter ? make it async await!
                let waitCounter = 0
                result.members.forEach(member => {
                  waitCounter += 1
                  playerUtil.idToName(member._id, (err, data) => {
                    waitCounter -= 1
                    member.name = data.name
                    console.log(data.name);
                    if (waitCounter == 0) {
                      res.json({ guild: result, requests: requests })
                    }
                  })
                })
              }
            })
          }
          else {
            //JUST send my guild data
            if (err) {
              res.json(err)
            } else {
              let waitCounter = 0
              //FEATURE [far] porwania innych graczy ale tlyko z guildi żeby miał ich kto odbijać! Musi być fun dla obu stron! zostawianie śladów, info że się przemieszczsacie dla porwanego
              result.members.forEach(member => {
                waitCounter += 1
                playerUtil.idToName(member._id, (err, data) => {
                  waitCounter -= 1
                  member.name = data.name
                  console.log(data.name);
                  if (waitCounter == 0) {
                    res.json({ guild: result })
                  }
                })
              })
            }
          }
        }
        else {
          //there is no guild
          res.json({})
        }
      })
  },
  allGuilds: function (req, res, next) {
    console.log("*** ALL ***");

    guild.find({ name: { $exists: true } }).toArray((err, result) => {
      if (err) {
        res.json(err)
      } else {
        console.log(result)
        res.json(result)
        // res.json(result.data)
      }
    })
  },

  ADMIN: 'admin',
  SUB_ADMIN: 'subadmin',
  MEMBER: 'member'

}
module.exports = gameplay