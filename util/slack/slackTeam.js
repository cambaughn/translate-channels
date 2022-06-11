const getTeamInfo = async (team_id, workspaceToken, client) => {
  const infoRequest = {
    token: workspaceToken,
    team: team_id
  };
  
  const result = await client.team.info(infoRequest);
  return result?.team;
};

export { getTeamInfo }