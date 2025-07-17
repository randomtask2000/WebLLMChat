<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initializeStores } from '@skeletonlabs/skeleton';
  import { loadTheme } from '$lib/stores/theme';
  import { loadChatHistories } from '$lib/stores/chat';
  import { loadDocuments } from '$lib/stores/documents';

  // Initialize Skeleton UI stores (including modalStore)
  initializeStores();

  onMount(() => {
    loadTheme();
    loadChatHistories();
    loadDocuments();
  });
</script>

<div class="h-full">
  <slot />
</div>
