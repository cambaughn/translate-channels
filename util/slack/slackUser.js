const isAdmin = async (user, workspaceToken, client) => {
  try {
    console.log('user ', user);

    const infoRequest = {
      token: workspaceToken,
      user: user
    };
    
    const result = await client.users.info(infoRequest);
    return result.user?.is_admin;
  } catch(error) {
    console.error('user error ', error)
  }

};

export { isAdmin }