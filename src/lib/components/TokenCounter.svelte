<script lang="ts">
  import { currentMessages } from '$lib/stores/chat';
  import { currentModel, MODELS } from '$lib/stores/models';
  import { estimateTokenCount } from '$lib/utils/tokenCount';

  // Calculate total tokens used in current conversation
  $: totalTokens = $currentMessages.reduce((total, message) => {
    return total + (message.tokenCount || estimateTokenCount(message.content));
  }, 0);

  // Get context window size for current model
  $: contextWindow = (() => {
    const model = MODELS.find(m => m.model_id === $currentModel);
    return model?.context_length || 131072; // Default to 128k if not found
  })();

  // Calculate remaining tokens
  $: remainingTokens = Math.max(0, contextWindow - totalTokens);

  // Format numbers for display
  function formatNumber(num: number): string {
    if (num < 1000) {
      return num.toString();
    } else if (num < 1000000) {
      return `${(num / 1000).toFixed(1)}k`;
    } else {
      return `${(num / 1000000).toFixed(1)}M`;
    }
  }

  // Get appropriate color based on usage percentage
  function getUsageColor(used: number, total: number): string {
    const percentage = (used / total) * 100;
    if (percentage < 50) return 'text-success-600 dark:text-success-400';
    if (percentage < 80) return 'text-warning-600 dark:text-warning-400';
    return 'text-error-600 dark:text-error-400';
  }
</script>

<!-- Token counters positioned in bottom-right corner -->
<div class="fixed bottom-4 right-20 z-30 flex flex-col gap-2">
  <!-- Total Context Used -->
  <div class="bg-surface-100-800-token backdrop-blur-sm border border-surface-300-600-token rounded-full px-3 py-1.5 shadow-md">
    <div class="flex items-center gap-2 text-xs font-medium">
      <div class="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></div>
      <span class="text-surface-700-200-token whitespace-nowrap">
        {formatNumber(totalTokens)} tokens
      </span>
    </div>
  </div>

  <!-- Remaining Tokens -->
  <div class="bg-surface-100-800-token backdrop-blur-sm border border-surface-300-600-token rounded-full px-3 py-1.5 shadow-md">
    <div class="flex items-center gap-2 text-xs font-medium">
      <div class="w-2 h-2 rounded-full {getUsageColor(totalTokens, contextWindow)} flex-shrink-0"></div>
      <span class="text-surface-700-200-token whitespace-nowrap">
        {formatNumber(remainingTokens)} left
      </span>
    </div>
  </div>
</div>