import userDB from './users';

describe('Read and update users collection in firebase', () => {
  
  test('Converts snapshots correctly', () => {

    expect(convertFromFirebase(snapshot)).toEqual(results);
  });

})