import userDB from './users';

describe('Read and update users collection in firebase', () => {
  
  test('Can set user in database', async () => {
    await userDB.createUser({ name: 'Luke Skywalker', slack_id: '123' });
    let user = await userDB.getUser('123');
    expect(user.name).toBe('Luke Skywalker');
  });  

  test('Can get user profile from database', async () => {
    let user = await userDB.getUser('123');
    expect(user.name).toBe('Luke Skywalker');
  });

  test('Can get user profile from database', async () => {
    await userDB.deleteUser('123');
    let user = await userDB.getUser('123');
    expect(user.name).toBeUndefined();
  });

})