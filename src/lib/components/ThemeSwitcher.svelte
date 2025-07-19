<script lang="ts">
  import { currentTheme, setTheme, isDarkMode, setDarkMode } from '$lib/stores/theme';
  import type { Theme } from '$lib/types';

  let isDropdownOpen = false;
  let buttonRef: HTMLButtonElement;
  let dropdownPosition = { top: 0, left: 0 };

  const themes: { name: Theme; label: string; description: string; preview: string }[] = [
    {
      name: 'skeleton',
      label: 'Skeleton',
      description: 'Clean and minimal gradient theme',
      preview: 'bg-gradient-to-r from-emerald-500 to-indigo-600'
    },
    {
      name: 'wintry',
      label: 'Wintry',
      description: 'Cool blue winter gradient',
      preview: 'bg-gradient-to-r from-blue-500 to-sky-500'
    },
    {
      name: 'modern',
      label: 'Modern',
      description: 'Sleek pink to cyan gradient',
      preview: 'bg-gradient-to-r from-pink-500 to-cyan-500'
    },
    {
      name: 'crimson',
      label: 'Crimson',
      description: 'Bold red to blue gradient',
      preview: 'bg-gradient-to-r from-rose-600 to-blue-600'
    },
    {
      name: 'rocket',
      label: 'Rocket',
      description: 'Dark cyan to purple gradient',
      preview: 'bg-gradient-to-r from-cyan-500 to-purple-500'
    },
    {
      name: 'sahara',
      label: 'Sahara',
      description: 'Warm orange to teal gradient',
      preview: 'bg-gradient-to-r from-orange-400 to-teal-400'
    },
    {
      name: 'hamlindigo',
      label: 'Hamlindigo',
      description: 'Professional blue to amber gradient',
      preview: 'bg-gradient-to-r from-blue-400 to-amber-600'
    },
    {
      name: 'gold-nouveau',
      label: 'Gold Nouveau',
      description: 'Elegant purple to blue gradient',
      preview: 'bg-gradient-to-r from-purple-600 to-blue-600'
    }
  ];

  function handleThemeChange(theme: Theme) {
    setTheme(theme);
    isDropdownOpen = false;
  }

  function handleDarkModeToggle() {
    setDarkMode(!$isDarkMode);
  }

  function toggleDropdown() {
    console.log('Theme dropdown clicked, current state:', isDropdownOpen);
    isDropdownOpen = !isDropdownOpen;
    console.log('New theme dropdown state:', isDropdownOpen);
    
    if (isDropdownOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      dropdownPosition = {
        top: rect.bottom + 8,
        left: rect.right - 320 // 20rem = 320px
      };
    }
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

<div
  class="relative theme-dropdown"
  class:border-2={isDropdownOpen}
  class:border-blue-500={isDropdownOpen}
>
  <button
    bind:this={buttonRef}
    class="btn btn-sm variant-ghost-surface flex items-center space-x-2"
    on:click={() => {
      console.log('Theme button click event fired');
      toggleDropdown();
    }}
    aria-expanded={isDropdownOpen}
  >
    <i class="fa fa-palette"></i>
    <span class="hidden sm:inline">Theme {isDropdownOpen ? '🔽' : '▶️'}</span>
    {#if $isDarkMode}
      <i class="fa fa-moon text-xs text-yellow-400"></i>
    {:else}
      <i class="fa fa-sun text-xs text-yellow-500"></i>
    {/if}
    <i
      class="fa fa-chevron-down text-xs {isDropdownOpen
        ? 'rotate-180'
        : ''} transition-transform duration-200"
    ></i>
  </button>

  {#if isDropdownOpen}
    <div
      class="fixed w-80 bg-surface-100-800-token border border-surface-300-600-token rounded-lg shadow-xl max-h-96 overflow-y-auto"
      style="z-index: 999999 !important; top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
    >
      <div class="p-4 border-b border-surface-300-600-token">
        <h3 class="font-semibold text-lg text-surface-700-200-token">Choose Theme</h3>
        <p class="text-sm text-surface-700-200-token opacity-80">
          Select a theme to customize the appearance
        </p>
      </div>

      <div class="p-2">
        {#each themes as theme (theme.name)}
          <button
            class="w-full p-3 text-left hover:bg-surface-200-700-token rounded-lg transition-colors group text-surface-700-200-token"
            class:bg-primary-500={$currentTheme === theme.name}
            on:click={() => handleThemeChange(theme.name)}
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-3">
                <div class="w-6 h-6 rounded border-2 {theme.preview}"></div>
                <div>
                  <span class="font-medium text-sm">{theme.label}</span>
                  {#if $currentTheme === theme.name}
                    <i class="fa fa-check ml-2 text-green-400"></i>
                  {/if}
                </div>
              </div>
            </div>

            <p class="text-xs text-surface-700-200-token opacity-70 group-hover:opacity-90 ml-9">
              {theme.description}
            </p>
          </button>
        {/each}
      </div>

      <!-- Dark Mode Toggle -->
      <div class="p-4 border-t border-surface-300-600-token">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div
              class="w-6 h-6 rounded border-2 flex items-center justify-center bg-white/10 border-surface-300-600-token"
            >
              <i
                class="fa {$isDarkMode
                  ? 'fa-moon text-yellow-400'
                  : 'fa-sun text-yellow-500'} text-xs"
              ></i>
            </div>
            <div>
              <span class="font-medium text-sm text-surface-700-200-token">Dark Mode</span>
              <p class="text-xs text-surface-700-200-token opacity-70">
                Toggle between light and dark themes
              </p>
            </div>
          </div>
          <button
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 {$isDarkMode
              ? 'bg-white/30'
              : 'bg-white/20'}"
            on:click={handleDarkModeToggle}
            role="switch"
            aria-checked={$isDarkMode}
          >
            <span class="sr-only">Toggle dark mode</span>
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {$isDarkMode
                ? 'translate-x-6'
                : 'translate-x-1'}"
            ></span>
          </button>
        </div>
      </div>

      <div class="p-4 border-t border-surface-300-600-token bg-surface-200-700-token">
        <p class="text-xs text-surface-700-200-token opacity-70">
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
