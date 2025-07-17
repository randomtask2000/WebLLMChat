<script lang="ts">
  import { onMount } from 'svelte';
  import { AppShell, AppBar } from '@skeletonlabs/skeleton';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
  import ModelDropdown from '$lib/components/ModelDropdown.svelte';
  import DocumentManager from '$lib/components/DocumentManager.svelte';
  import MobileLayout from '$lib/components/MobileLayout.svelte';
  import { isMobile } from '$lib/utils/mobile';

  let showDocumentManager = false;
  let showSidebar = false;
  let isMobileDevice = false;

  onMount(() => {
    isMobileDevice = isMobile();
  });
</script>

{#if isMobileDevice}
  <MobileLayout bind:showSidebar>
    <svelte:fragment slot="sidebar">
      <Sidebar />
    </svelte:fragment>

    <svelte:fragment slot="main">
      <div class="flex flex-col h-full">
        <!-- Mobile toolbar -->
        <div
          class="p-2 bg-surface-100-800-token border-b border-surface-300-600-token flex items-center justify-between"
        >
          <button
            class="btn btn-sm variant-ghost-surface"
            on:click={() => (showDocumentManager = !showDocumentManager)}
            aria-label="Toggle document manager"
          >
            <i class="fa fa-file-text"></i>
          </button>
          <ModelDropdown />
          <ThemeSwitcher />
        </div>

        <div class="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </svelte:fragment>
  </MobileLayout>
{:else}
  <AppShell>
    <svelte:fragment slot="header">
      <AppBar class="app-bar-glass">
        <svelte:fragment slot="lead">
          <h1 class="text-xl font-bold theme-text">WebLLM Chat</h1>
        </svelte:fragment>
        <svelte:fragment slot="trail">
          <button
            class="btn btn-sm variant-ghost-surface theme-glass theme-text hover:bg-white/20"
            on:click={() => (showDocumentManager = !showDocumentManager)}
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
      <div class="sidebar-glass h-full">
        <Sidebar />
      </div>
    </svelte:fragment>

    <ChatInterface />
  </AppShell>
{/if}

{#if showDocumentManager}
  <DocumentManager bind:show={showDocumentManager} />
{/if}
