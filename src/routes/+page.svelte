<script lang="ts">
  import { AppShell, AppBar } from '@skeletonlabs/skeleton';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
  import ModelDropdown from '$lib/components/ModelDropdown.svelte';
  import DocumentManager from '$lib/components/DocumentManager.svelte';
  
  let showDocumentManager = false;
</script>

<AppShell>
  <svelte:fragment slot="header">
    <AppBar>
      <svelte:fragment slot="lead">
        <h1 class="text-xl font-bold">Claude WebLLM Chat</h1>
      </svelte:fragment>
      <svelte:fragment slot="trail">
        <button 
          class="btn btn-sm variant-ghost-surface"
          on:click={() => showDocumentManager = !showDocumentManager}
        >
          <i class="fa fa-file-text"></i>
          <span class="hidden sm:inline">Documents</span>
        </button>
        <ModelDropdown />
        <ThemeSwitcher />
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  
  <svelte:fragment slot="sidebarLeft">
    <Sidebar />
  </svelte:fragment>
  
  <ChatInterface />
</AppShell>

{#if showDocumentManager}
  <DocumentManager bind:show={showDocumentManager} />
{/if}