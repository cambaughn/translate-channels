const isAdmin = async (user, workspaceToken, client) => {
  const infoRequest = {
    token: workspaceToken,
    user: user
  };
  
  const result = await client.users.info(infoRequest);
  return result.user.is_admin;
};

const getUserInfo = async (user, workspaceToken, client) => {
  const infoRequest = {
    token: workspaceToken,
    user: user
  };
  
  const result = await client.users.info(infoRequest);
  return result.user;
};

export { isAdmin, getUserInfo }