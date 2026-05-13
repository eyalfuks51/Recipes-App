async function unwrapRpcResult(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}

export function createWorkspace(client, name) {
  return unwrapRpcResult(
    client.rpc('create_workspace', { p_name: name })
  );
}

export function joinWorkspaceByInvite(client, inviteCode) {
  return unwrapRpcResult(
    client.rpc('join_workspace_by_invite', { p_invite_code: inviteCode.trim().toUpperCase() })
  );
}

export function getWorkspaceMemberCount(client, workspaceId) {
  return unwrapRpcResult(
    client.rpc('get_workspace_member_count', { p_workspace_id: workspaceId })
  );
}

export function leaveWorkspace(client, workspaceId) {
  return unwrapRpcResult(
    client.rpc('leave_workspace', { p_workspace_id: workspaceId })
  );
}
