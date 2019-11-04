const expect = require('chai').expect;
const store = require('../local_modules/store')


describe('guilds', () => {

  before(async () => {
    await store.connect()
  });

  after(async () => {
    await store.db.close()
  });

  it('checks all guilds response structure', async () => {
    const guild = require('../LogicControllers/guild')
    const allGuilds = await guild.allGuilds()

    expect(allGuilds.err).to.be.null

    expect(allGuilds.results).to.not.be.undefined
    expect(allGuilds.results).to.be.a("Array")
  })

  it('checks not existed my guild', async () => {
    const guild = require('../LogicControllers/guild')
    const myGuild = await guild.myGuild(
      store.CreateNeObjectId()
    );

    expect(myGuild.err).to.have.property('msg')
    expect(myGuild.err.msg).to.be.a('string')
    expect(myGuild.err.msg).to.not.be.empty

    expect(myGuild.results).to.be.undefined
  })
})
