<script lang="ts">
  import { currentTheme, setTheme } from '$lib/stores/theme';
  import type { Theme } from '$lib/types';

  let isDropdownOpen = false;

  const themes: { name: Theme; label: string; description: string; preview: string }[] = [
    { name: 'skeleton', label: 'Skeleton', description: 'Clean and minimal default theme', preview: 'bg-slate-100 border-slate-300' },
    { name: 'wintry', label: 'Wintry', description: 'Cool blue winter theme', preview: 'bg-blue-100 border-blue-300' },
    { name: 'modern', label: 'Modern', description: 'Sleek contemporary design', preview: 'bg-gray-100 border-gray-300' },
    { name: 'crimson', label: 'Crimson', description: 'Bold red accented theme', preview: 'bg-red-100 border-red-300' },
    { name: 'rocket', label: 'Rocket', description: 'Dark space-inspired theme', preview: 'bg-purple-900 border-purple-600' },
    { name: 'sahara', label: 'Sahara', description: 'Warm desert sand colors', preview: 'bg-orange-100 border-orange-300' },
    { name: 'hamlindigo', label: 'Hamlindigo', description: 'Professional indigo theme', preview: 'bg-indigo-100 border-indigo-300' },
    { name: 'gold-nouveau', label: 'Gold Nouveau', description: 'Elegant art nouveau style', preview: 'bg-yellow-100 border-yellow-300' }
  ];

  function handleThemeChange(theme: Theme) {
    setTheme(theme);
    isDropdownOpen = false;
  }

  function toggleDropdown() {
    console.log('Theme dropdown clicked, current state:', isDropdownOpen);
    isDropdownOpen = !isDropdownOpen;
    console.log('New theme dropdown state:', isDropdownOpen);
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (!event.target) return;
    const target = event.target as Element;
    if (!target.closest('.theme-dropdown')) {
      isDropdownOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative theme-dropdown" class:border-2={isDropdownOpen} class:border-blue-500={isDropdownOpen}>
  <button 
    class="btn btn-sm variant-ghost-surface flex items-center space-x-2"
    on:click={() => {
      console.log('Theme button click event fired');
      toggleDropdown();
    }}
    aria-expanded={isDropdownOpen}
  >
    <i class="fa fa-palette"></i>
    <span class="hidden sm:inline">Theme {isDropdownOpen ? '🔽' : '▶️'}</span>
    <i class="fa fa-chevron-down text-xs {isDropdownOpen ? 'rotate-180' : ''} transition-transform duration-200"></i>
  </button>

  {#if isDropdownOpen}
    <div class="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[9999] max-h-96 overflow-y-auto">
      <div class="p-4 border-b border-gray-200 dark:border-gray-600">
        <h3 class="font-semibold text-lg text-gray-900 dark:text-white">Choose Theme</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">Select a theme to customize the appearance</p>
      </div>
      
      <div class="p-2">
        {#each themes as theme (theme.name)}
          <button
            class="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group text-gray-900 dark:text-white"
            class:bg-primary-500={$currentTheme === theme.name}
            class:text-white={$currentTheme === theme.name}
            on:click={() => handleThemeChange(theme.name)}
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-3">
                <div class="w-6 h-6 rounded border-2 {theme.preview}"></div>
                <div>
                  <span class="font-medium text-sm">{theme.label}</span>
                  {#if $currentTheme === theme.name}
                    <i class="fa fa-check ml-2 text-success-500"></i>
                  {/if}
                </div>
              </div>
            </div>
            
            <p class="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 ml-9">
              {theme.description}
            </p>
          </button>
        {/each}
      </div>
      
      <div class="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <p class="text-xs text-gray-600 dark:text-gray-300">
          🎨 Themes change colors, fonts, and overall appearance instantly
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>