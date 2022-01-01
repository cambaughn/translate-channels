import teamsDB, { mergeSettings } from './teams.js';

describe.skip('Read and update teams collection in firebase', () => {
  
  test('Can set team in database', async () => {
    await teamsDB.updateTeam({ name: 'Luke Skywalker', slack_id: '123' });
    let user = await teamsDB.getUser('123');
    expect(user.name).toBe('Luke Skywalker');
  });  

  test('Can get team profile from database', async () => {
    let team = await teamsDB.getTeam('123');
    expect(team.name).toBe('Luke Skywalker');
  });

  test('Can delete team profile from database', async () => {
    await teamsDB.deleteUser('123');
    let team = await teamsDB.getTeam('123');
    expect(team.name).toBeUndefined();
  });

})


describe('Teams firebase helper functions', () => {
  test('Can merge channel language settings', () => {
    let existing = {
      '123': {
        name: 'random',
        id: '123',
        languages: [ 'en' ]
      },
      'abc': {
        name: 'general',
        id: 'abc',
        languages: [ 'ja' ]
      }
    }

    let updates = {
      '123': {
        name: 'random',
        id: '123',
        languages: [ 'en', 'ja' ]
      },
      'xyz': {
        name: 'faq',
        id: 'xyz',
        languages: [ 'es', 'ja' ]
      }
    }

    let result = {
      '123': {
        name: 'random',
        id: '123',
        languages: [ 'en', 'ja' ]
      },
      'abc': {
        name: 'general',
        id: 'abc',
        languages: [ 'ja' ]
      },
      'xyz': {
        name: 'faq',
        id: 'xyz',
        languages: [ 'es', 'ja' ]
      }
    }

    expect(mergeSettings(existing, updates)).toEqual(result);

  })
})