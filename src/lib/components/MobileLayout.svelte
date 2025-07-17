<script lang="ts">
  import { onMount } from 'svelte';
  import { isMobile, getMobileUIConfig } from '$lib/utils/mobile';
  import { writable } from 'svelte/store';

  export let showSidebar = false;

  const mobileConfig = getMobileUIConfig();
  const isMobileDevice = writable(false);

  onMount(() => {
    isMobileDevice.set(isMobile());
  });

  function toggleSidebar() {
    showSidebar = !showSidebar;
  }

  function closeSidebar() {
    if ($isMobileDevice) {
      showSidebar = false;
    }
  }
</script>

<div class="mobile-layout h-screen flex flex-col">
  <!-- Mobile Header -->
  {#if $isMobileDevice}
    <div
      class="mobile-header bg-surface-100-800-token border-b border-surface-300-600-token p-4 flex items-center justify-between"
    >
      <button
        class="btn btn-sm variant-ghost-surface"
        on:click={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <i class="fa fa-bars"></i>
      </button>
      <h1 class="text-lg font-bold">WebLLM Chat</h1>
      <div class="w-8"></div>
      <!-- Spacer for centering -->
    </div>
  {/if}

  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar Overlay for Mobile -->
    {#if $isMobileDevice && showSidebar}
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-40"
        on:click={closeSidebar}
        role="button"
        tabindex="0"
        on:keydown={(e) => e.key === 'Escape' && closeSidebar()}
      ></div>
    {/if}

    <!-- Sidebar -->
    <div
      class="sidebar transition-transform duration-300 ease-in-out z-50 {$isMobileDevice
        ? `fixed left-0 top-0 h-full w-80 transform ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`
        : 'relative w-80'}"
    >
      <slot name="sidebar" />
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <slot name="main" />
    </div>
  </div>
</div>

<style>
  .mobile-layout {
    /* Ensure proper mobile viewport handling */
    width: 100vw;
    height: 100vh;
    height: 100dvh; /* Use dynamic viewport height on mobile */
    overflow: hidden;
  }

  .mobile-header {
    /* Safe area handling for notched devices */
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  .sidebar {
    /* Safe area handling for sidebar */
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
  }

  @media (max-width: 768px) {
    .mobile-layout {
      /* Prevent zoom on input focus */
      font-size: 16px;
    }
  }
</style>
