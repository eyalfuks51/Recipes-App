import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  createWorkspace,
  getWorkspaceMemberCount,
  joinWorkspaceByInvite,
  leaveWorkspace,
} from './workspaceApi.js';

function makeRpcClient(response) {
  const calls = [];
  return {
    calls,
    rpc: mock.fn((name, args) => {
      calls.push({ name, args });
      return Promise.resolve(response);
    }),
  };
}

describe('workspaceApi', () => {
  it('creates a workspace through the create_workspace RPC', async () => {
    const workspace = { id: 'workspace-1', name: 'Family', invite_code: 'ABC123' };
    const client = makeRpcClient({ data: workspace, error: null });

    const result = await createWorkspace(client, 'Family');

    assert.deepEqual(result, workspace);
    assert.deepEqual(client.calls, [
      { name: 'create_workspace', args: { p_name: 'Family' } },
    ]);
  });

  it('joins a workspace through the join_workspace_by_invite RPC with an uppercase code', async () => {
    const workspace = { id: 'workspace-2', name: 'Shared', invite_code: 'XYZ987' };
    const client = makeRpcClient({ data: workspace, error: null });

    const result = await joinWorkspaceByInvite(client, ' xyz987 ');

    assert.deepEqual(result, workspace);
    assert.deepEqual(client.calls, [
      { name: 'join_workspace_by_invite', args: { p_invite_code: 'XYZ987' } },
    ]);
  });

  it('loads workspace member count through RPC', async () => {
    const client = makeRpcClient({ data: 3, error: null });

    const result = await getWorkspaceMemberCount(client, 'workspace-3');

    assert.equal(result, 3);
    assert.deepEqual(client.calls, [
      { name: 'get_workspace_member_count', args: { p_workspace_id: 'workspace-3' } },
    ]);
  });

  it('leaves a workspace through RPC', async () => {
    const client = makeRpcClient({ data: { deleted_workspace: true }, error: null });

    const result = await leaveWorkspace(client, 'workspace-4');

    assert.deepEqual(result, { deleted_workspace: true });
    assert.deepEqual(client.calls, [
      { name: 'leave_workspace', args: { p_workspace_id: 'workspace-4' } },
    ]);
  });

  it('throws the Supabase error message when RPC fails', async () => {
    const client = makeRpcClient({ data: null, error: { message: 'Not allowed' } });

    await assert.rejects(
      () => joinWorkspaceByInvite(client, 'ABC123'),
      /Not allowed/
    );
  });
});
