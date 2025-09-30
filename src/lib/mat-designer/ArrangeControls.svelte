<script lang="ts">
  export let selectedCount: number;
  export let alignSelected: (edge: 'left' | 'right' | 'top' | 'bottom') => void;
  export let centerSelected: (direction: 'horizontal' | 'vertical') => void;
  export let distribute: (direction: 'horizontal' | 'vertical') => void;
</script>

<h2>Arrange</h2>
<div class="buttons-grid">
  <button type="button" on:click={() => alignSelected('left')} disabled={selectedCount < 2}>
    Align Left
  </button>
  <button type="button" on:click={() => alignSelected('right')} disabled={selectedCount < 2}>
    Align Right
  </button>
  <button type="button" on:click={() => alignSelected('top')} disabled={selectedCount < 2}>
    Align Top
  </button>
  <button type="button" on:click={() => alignSelected('bottom')} disabled={selectedCount < 2}>
    Align Bottom
  </button>
  <button type="button" on:click={() => centerSelected('horizontal')} disabled={!selectedCount}>
    Center Horizontally
  </button>
  <button type="button" on:click={() => centerSelected('vertical')} disabled={!selectedCount}>
    Center Vertically
  </button>
  <button type="button" on:click={() => distribute('horizontal')} disabled={selectedCount < 2}>
    Distribute Across Mat (Horizontal)
  </button>
  <button type="button" on:click={() => distribute('vertical')} disabled={selectedCount < 2}>
    Distribute Across Mat (Vertical)
  </button>
</div>

<style>
  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .buttons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  @media (max-width: 640px) {
    .buttons-grid {
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }
  }
</style>
