import convertFromFirebase from './converter';

describe('Convert docs and snapshots from firebase', () => {
  test('Converts single doc correctly', () => {
    let userDoc = {
      id: 123,
      data: () => {
        return {
          username: 'Luke Skywalker',
          email: 'luke@tatooine.com'
        }
      }
    }
    let result = {
      id: 123,
      username: 'Luke Skywalker',
      email: 'luke@tatooine.com'
    }
    expect(convertFromFirebase(userDoc)).toEqual(result);
  });  
  
  test('Converts snapshots correctly', () => {
    let snapshot = {
      docs: [{ id: 1, data: () => ({ username: 'obiwankenobi', email: 'obiwan@jedi.com' }) }, { id: 2, data: () => ({ username: 'Luke Skywalker', email: 'luke@tatooine.com' }) } ]
    }
    let results = [{ id: 1, username: 'obiwankenobi', email: 'obiwan@jedi.com' }, { id: 2, username: 'Luke Skywalker', email: 'luke@tatooine.com' } ]
    expect(convertFromFirebase(snapshot)).toEqual(results);
  });


})