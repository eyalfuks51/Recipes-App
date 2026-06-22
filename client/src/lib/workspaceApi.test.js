import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createWorkspace,
  getWorkspaceMemberCount,
  joinWorkspaceByInvite,
  leaveWorkspace,
} from './workspaceApi.js';
import {
  buildInviteUrl,
  buildWhatsAppInviteUrl,
} from './recipeLibraryMenu.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  it('builds invite and WhatsApp share links for recipe libraries', () => {
    const inviteUrl = buildInviteUrl('https://app.example.com', 'abc123');
    const whatsAppUrl = buildWhatsAppInviteUrl('https://app.example.com', 'abc123');

    assert.equal(inviteUrl, 'https://app.example.com/invite?code=ABC123');
    assert.match(decodeURIComponent(whatsAppUrl), /הצטרפו לספריית המתכונים שלי ב-Re-smash/);
    assert.match(decodeURIComponent(whatsAppUrl), /https:\/\/app\.example\.com\/invite\?code=ABC123/);
  });

  it('keeps the recipe library menu comfortable on mobile viewports', () => {
    const menuCss = readFileSync(resolve(__dirname, '../components/RecipeLibraryMenu.scss'), 'utf8');
    const menuComponent = readFileSync(resolve(__dirname, '../components/RecipeLibraryMenu.jsx'), 'utf8');
    const shellCss = readFileSync(resolve(__dirname, '../styles/main.scss'), 'utf8');

    assert.match(menuComponent, /import \{ createPortal \} from 'react-dom';/);
    assert.match(menuComponent, /createPortal\(menuLayer, document\.body\)/);
    assert.match(menuCss, /max-height:\s*calc\(100dvh - 12px\)/);
    assert.match(menuCss, /overscroll-behavior:\s*contain/);
    assert.match(menuCss, /min-height:\s*52px/);
    assert.match(menuCss, /\.library-modal__actions[\s\S]*flex-direction:\s*column-reverse/);
    assert.match(shellCss, /grid-template-areas:\s*'brand signout'[\s\S]*'library library'/);
  });

  it('renders recipe thumbnails directly in the recipe gallery cards', () => {
    const galleryComponent = readFileSync(resolve(__dirname, '../components/RecipeGallery.jsx'), 'utf8');
    const galleryCss = readFileSync(resolve(__dirname, '../components/RecipeGallery.scss'), 'utf8');

    assert.match(galleryComponent, /recipe\.thumbnail_url/);
    assert.match(galleryComponent, /className="card-media"/);
    assert.match(galleryComponent, /className="card-thumbnail"/);
    assert.match(galleryCss, /\.recipe-card--with-media/);
    assert.match(galleryCss, /\.card-media[\s\S]*aspect-ratio:\s*16 \/ 10/);
    assert.match(galleryCss, /\.card-thumbnail[\s\S]*object-fit:\s*cover/);
  });
});
