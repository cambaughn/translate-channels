import { MongoClient } from 'mongodb';
import autoBind from 'auto-bind';
import teamsDB from '../firebaseAPI/teams.js';
import userDB from '../firebaseAPI/users.js';


class dbConnector {
  constructor () {
    this.db = 'heroku_btmzsz9v';
    this.userDataCollection = 'users';
    this.translationEventsCollection = 'translations';
    const dbUri = 'mongodb+srv://heroku_btmzsz9v:5ec25qsiq8sfv7mpu846tga6ru@slack-app.eljbo.mongodb.net/heroku_btmzsz9v?retryWrites=true&w=majority';
    this.client = new MongoClient(dbUri, { useUnifiedTopology: true });
    autoBind(this);
  }

  async buildConnection () {
    console.log('building connection');
    this.connection = await this.client.connect();
  }

  async getLanguageList () {
    const result = await this.client.db(this.db).collection(this.languageDataCollection).findOne({ name: 'language_list' });
    return result;
  }

  async getWorkspaceData (teamId) {
    const result = await this.client.db(this.db).collection(this.userDataCollection).findOne({ slackTeamId: teamId });
    return result;
  }

  async getAllTeams () {
    return this.client.db(this.db).collection(this.userDataCollection).find().toArray();
  }

  async getUserToken (teamId, userId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    if (!workspaceData) { return null; }
    const user = workspaceData.userTokens.find(e => e.slackId === userId);
    const token = user ? user.oauthToken : undefined;
    return token;
  }

  async deleteUserToken (team, user) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: team },
      {
        $pull: { userTokens: { slackId: user } },
        $currentDate: { lastModified: true }
      }
    );
  }

  async saveNewUserToken (result) {
    await this.deleteUserToken(result.team.id, result.authed_user.id);
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: result.team.id },
      {
        $push: { userTokens: { slackId: result.authed_user.id, oauthToken: result.authed_user.access_token } },
        $currentDate: { lastModified: true }
      }
    );
  }

  async saveHomeViewId (teamId, homeId) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: teamId },
      {
        $set: { homeViewId: homeId },
        $currentDate: { lastModified: true }
      }
    );
  }

  async getHomeViewId (teamId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    return workspaceData.homeViewId;
  }

  async createNewWorkspace (result, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(result.team.id) : workspaceData;
    if (workspaceData) { await this.saveNewUserToken(result); return false; }
    const doc = {
      contactEmail: null,
      stripeId: null,
      botId: result.bot_user_id,
      slackTeamId: result.team.id,
      workspaceToken: result.access_token,
      userTokens: [
        {
          slackId: result.authed_user.id,
          oauthToken: result.authed_user.access_token
        }
      ],
      settings: {
        workspace: {
          outputLanguages: []
        },
        channel: [],
        admin: {}
      }
    };
    await this.client.db(this.db).collection(this.userDataCollection).insertOne(doc);
    return true;
  }

  async getEmail (teamId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    return workspaceData.contactEmail;
  }

  async nonAdminAllowSettings (teamId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    if (workspaceData.settings.admin && workspaceData.settings.admin.nonAdminAllowSettings === false) {
      return false;
    } else {
      return true;
    }
  }

  async updateNonAdminSettings (newNonAdminSetting, context) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: context.teamId },

      {
        $set: {
          'settings.admin.nonAdminAllowSettings': newNonAdminSetting === 'true'
        }
      }
    );
  }

  async getSettings (teamId, channelId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    const settings = workspaceData.settings;
    if (!settings) { return null; }
    const channelSettings = settings.channel.find(e => e.id === channelId);
    if (channelSettings) { return channelSettings.outputLanguages; }
    return settings.workspace.outputLanguages;
  }

  async getAllSettings (teamId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    return workspaceData.settings;
  }

  async updateSettings (channels, languages, context) {
    const action = languages.includes('none') ? 'delete' : 'update/create';
    if (channels.length > 0) {
      // channel settings
      if (action === 'delete') { for (const channel of channels) { await this.deleteChannelSettings(channel, context); } }
      if (action === 'update/create') { for (const channel of channels) { await this.changeChannelSettings(channel, languages, context); } }
    } else {
      // workspace settings
      if (action === 'delete') { await this.disableWorkspaceTranslation(context); }
      if (action === 'update/create') {await this.changeWorkspaceSettings(languages, context); }
    }
  }

  async deleteChannelSettings (channel, context) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: context.teamId },
      { $pull: { 'settings.channel': { id: channel.id } } }, false, true
    );
  }

  async addChannelSettings (channel, languages, context) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: context.teamId },
      {
        $push: {
          'settings.channel':
          { id: channel.id, name: channel.name, outputLanguages: languages }
        },
        $currentDate: { lastModified: true }
      }
    );
  }

  async changeChannelSettings (channel, languages, context) {
    await this.deleteChannelSettings(channel, context);
    await this.addChannelSettings(channel, languages, context);
  }

  async disableWorkspaceTranslation (context) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: context.teamId },
      { $set: { 'settings.workspace.outputLanguages': [] } }, false, true
    );
  }

  async changeWorkspaceSettings (languages, context) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { slackTeamId: context.teamId },
      { $set: { 'settings.workspace.outputLanguages': languages } }, false, true
    );
  }

  async updateSubscription (data) {
    await this.client.db(this.db).collection(this.userDataCollection).updateOne(
      { stripeId: data.customer },
      {
        $set: {
          plan: {
            start: new Date(data.current_period_start * 1000),
            renewsOnDayOfMonth: new Date(data.current_period_start * 1000).getDate(),
            active: true,
            price: data.plan.amount / 100,
            charLimit: data.plan.metadata.char_limit,
            oldCharLimit: data.plan.metadata.old_char_limit,
            msgLimit: data.plan.metadata.msg_limit,
            planName: data.plan.metadata.display_name
          }
        },
        $currentDate: { lastModified: true }
      }
    );
  }

  async getSubscription (teamId, workspaceData) {
    workspaceData = typeof workspaceData === 'undefined' ? await this.getWorkspaceData(teamId) : workspaceData;
    const plan = workspaceData.plan;
    const renewalDate = this.currentPeriodEndDate(plan.renewsOnDayOfMonth);
    const startDate = this.currentPeriodStartDate(plan.renewsOnDayOfMonth);
    plan.renewalDate = renewalDate;
    if (plan.planName === 'FREE FOREVER' && !plan.oldCharLimit) {
      plan.oldCharLimit = plan.charLimit;
      plan.charLimit = this.getCharLimitFromJson(plan.planName);
    }
    plan.charLimit = parseInt(plan.charLimit)
    plan.msgLimit = plan.msgLimit ? plan.msgLimit : this.getMsgLimitFromJson(plan.planName);
    const planData = await this.getCharacterCount(teamId, startDate);
    plan.charactersTranslated = planData.charactersTranslated;
    plan.messagesSent = planData.messagesSent;
    return plan;
  }

  currentPeriodEndDate (renewsOnDayOfMonth) {
    const today = new Date();
    const renewalMonth = (today.getDate() >= renewsOnDayOfMonth) ? today.getMonth() + 1 : today.getMonth();
    const daysInMonth = new Date(today.getFullYear(), renewalMonth + 1, 0).getDate();
    const renewalDay = (renewsOnDayOfMonth > daysInMonth) ? daysInMonth : renewsOnDayOfMonth;
    return new Date(today.getFullYear(), renewalMonth, renewalDay);
  }

  currentPeriodStartDate (renewsOnDayOfMonth) {
    const today = new Date();
    const renewalMonth = (today.getDate() >= renewsOnDayOfMonth) ? today.getMonth() + 1 : today.getMonth();
    const daysInStartMonth = new Date(today.getFullYear(), renewalMonth, 0).getDate();
    const startDay = (renewsOnDayOfMonth >= daysInStartMonth) ? daysInStartMonth : renewsOnDayOfMonth;
    return new Date(today.getFullYear(), renewalMonth - 1, startDay);
  }

  async planAllowanceExceeded (teamId, workspaceData) {
    const plan = await this.getSubscription(teamId, workspaceData);
    const status = { exceeded: false, msg: null, reason: null }
    const launchDateString = process.env.MSG_LIMIT_START;
    const launchDate = Date.parse(launchDateString);
    let newLimitsApply = new Date() >= launchDate;
    const charCount = plan.charactersTranslated

    if (plan.planName !== 'FREE FOREVER') {
      newLimitsApply = true
    }

    // new limits
    if (newLimitsApply && charCount > plan.charLimit) {
      status.exceeded = true;
      status.reason = 'character'
    }

    // soft message
    if (!newLimitsApply && charCount > plan.charLimit) {
      status.msg = `\n\n\n:earth_africa: _We have introduced a lower character limit on the free plan. This message would not have translated. This will come into effect on *${launchDateString}*, please upgrade._`
    }

    // old limits
    if (!newLimitsApply && charCount > plan.oldCharLimit) {
      status.exceeded = true;
      status.reason = 'character'
    }

    // msg limits
    if (plan.messagesSent > plan.msgLimit) {
      if (newLimitsApply) {
        status.exceeded = true;
        status.reason = 'message'
      } else {
        status.msg = `\n\n\n:earth_africa: _We have introduced a message limit on the free plan. This message would not have translated. This will come into effect on *${launchDateString}*, please upgrade._`
      }
    }
    return status;
  }

  async getCharacterCount (teamId, startDate) {
    const agg = [
      {
        $match: {
          teamId: teamId,
          timestamp: {
            $gte: startDate.getTime() / 1000
          }
        }
      }, {
        $group: {
          _id: '',
          charactersTranslated: {
            $sum: '$charactersTranslated'
          },
          messagesSent: {
            $sum: 1
          }
        }
      },
      {
        $limit: 1
      }
    ];
    const aggCursor = await this.client.db(this.db).collection(this.translationEventsCollection).aggregate(agg);
    const result = await aggCursor.toArray();
    return result[0] ? result[0] : { charactersTranslated: 0, messagesSent: 0 };
  }

  async saveTranslation (teamId, timestamp, channel, targetLangs, inputLang, charCount) {
    const doc = {
      teamId: teamId,
      timestamp: parseFloat(timestamp),
      channel: channel,
      targetLanguages: targetLangs,
      inputLanguage: inputLang,
      charactersTranslated: charCount,
      date: new Date()
    };
    await this.client.db(this.db).collection(this.translationEventsCollection).insertOne(doc);
  }

  async getUsageData () {
    const filter = {
      'plan.active': true
    };
    const projection = {
      slackTeamId: 1,
      stripeId: 1,
      plan: 1,
      contactEmail: 1
    };

    const resCursor = await this.client.db(this.db).collection(this.userDataCollection).find(filter, { projection: projection });
    const result = await resCursor.toArray();
    const resultsWithUsage = await this.addPlans(result);
    return resultsWithUsage.sort((a, b) => b.plan.charactersTranslated - a.plan.charactersTranslated);
  }

  async addPlans (results) {
    return Promise.all(results.map(item => this.addPlan(item)));
  }

  async addPlan (item) {
    item.plan = await this.getSubscription(item.slackTeamId, item);
    return item;
  }
}


const migrateTeams = async () => {
  // Testing mongodb connection in an attempt to transfer over team information
  const db = new dbConnector();
  await db.buildConnection();
  
  let teams = await db.getAllTeams();
  let teamsWithUsers = teams.filter(team => team.userTokens?.length > 0);
  let totalUserCount = teamsWithUsers.map(team => {
    return team.userTokens.length;
  }).reduce((a,b) => {
    return a + b;
  }, 0);

  let allUsers = []
  
  teamsWithUsers.forEach(team => {
    team.userTokens.forEach(user => {
      let formattedUser = {
        access_token: user.oauthToken,
        team_id: team.slackTeamId,
        id: user.slackId
      }
      allUsers.push(formattedUser);
    })
  })

  console.log('got users ', allUsers.length, allUsers[0]);
  await userDB.migrateUsers(allUsers);
  console.log('uploaded all users!');
  
  // console.log(`total user count: ${totalUserCount} | teams with users: ${teamsWithUsers.length} | avg user count: ${Math.round(totalUserCount / teamsWithUsers.length)}`);
  let formattedTeams = teams.map(teamsDB.formatTeam);
  let teamsWithTokens = formattedTeams.filter(team => !!team.team_access_token && !!team.bot_user_id);
  // console.log(`There are ${teams.length} total teams, and ${teamsWithTokens.length} teams with tokens`);
  // console.log('team with token: ', teamsWithTokens[0]);
  // await teamsDB.migrateTeams(teamsWithTokens);
  // console.log('uploaded teams ---------');
}

const cleanupTeams = async () => {
  await teamsDB.cleanup();
  console.log('---updated all teams---');
}
// cleanupTeams()
teamsDB.getTeam('T028B56DLBY');


export default dbConnector;