<script lang="ts">
  import { onMount } from 'svelte';
  import { AppShell, AppBar } from '@skeletonlabs/skeleton';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import ThemeSwitcher from '$lib/components/ThemeSwitcher.svelte';
  import ModelDropdown from '$lib/components/ModelDropdown.svelte';
  import DocumentManager from '$lib/components/DocumentManager.svelte';
  import MobileLayout from '$lib/components/MobileLayout.svelte';
  import WelcomeGuide from '$lib/components/WelcomeGuide.svelte';
  import { isMobile } from '$lib/utils/mobile';
  import { checkCachedModels } from '$lib/stores/models';
  import { appConfig } from '$lib/config/app.config';

  let showDocumentManager = false;
  let showSidebar = false;
  let isMobileDevice = false;
  let showWelcomeGuide = false;

  onMount(async () => {
    isMobileDevice = isMobile();
    // Check which models are cached on startup with a small delay
    // to ensure WebLLM is ready
    setTimeout(async () => {
      try {
        // First log all available models for debugging
        const { webLLMService } = await import('../lib/utils/webllm');
        await webLLMService.getAvailableModels();
        
        // Then check cached models
        await checkCachedModels();
      } catch (error) {
        console.error('Error during startup model check:', error);
      }
    }, 1000);
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
            on:click={() => (showWelcomeGuide = true)}
            aria-label="Show help"
          >
            <i class="fa fa-question-circle"></i>
          </button>
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
          <h1 class="text-xl font-bold theme-text">{appConfig.title}</h1>
        </svelte:fragment>
        <svelte:fragment slot="trail">
          <button
            class="btn btn-sm variant-ghost-surface theme-glass theme-text hover:bg-white/20"
            on:click={() => (showWelcomeGuide = true)}
            title="Show welcome guide"
          >
            <i class="fa fa-question-circle"></i>
            <span class="hidden sm:inline">Help</span>
          </button>
          <button
            class="btn btn-sm variant-ghost-surface theme-glass theme-text hover:bg-white/20"
            on:click={() => window.open('https://github.com/randomtask2000/WebLLMChat', '_blank')}
          >
            <i class="fa fa-github"></i>
            <span class="hidden sm:inline">GitHub</span>
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

<!-- Welcome Guide -->
<WelcomeGuide bind:isVisible={showWelcomeGuide} />
