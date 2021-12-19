import teamsDB from './teams.js';

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