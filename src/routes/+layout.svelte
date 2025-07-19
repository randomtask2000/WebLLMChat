<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initializeStores } from '@skeletonlabs/skeleton';
  import { loadTheme } from '$lib/stores/theme';
  import { loadChatHistories } from '$lib/stores/chat';
  import { loadDocuments } from '$lib/stores/documents';
  import { appConfig } from '$lib/config/app.config';

  // Initialize Skeleton UI stores (including modalStore)
  initializeStores();

  onMount(() => {
    loadTheme();
    loadChatHistories();
    loadDocuments();
  });
</script>

<svelte:head>
  <title>{appConfig.title}</title>
</svelte:head>

<div class="h-full">
  <slot />
</div>
