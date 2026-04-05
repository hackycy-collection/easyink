<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDesignerStore } from '../composables'
import ToolbarManager from './ToolbarManager.vue'

const store = useDesignerStore()

const showManager = ref(false)

const visibleGroups = computed(() =>
  store.workbench.toolbar.groups
    .filter(g => !g.hidden)
    .sort((a, b) => a.order - b.order),
)

const alignClass = computed(() => `ei-topbar-b--align-${store.workbench.toolbar.align}`)

function handleUndo() {
  store.commands.undo()
}

function handleRedo() {
  store.commands.redo()
}
</script>

<template>
  <div class="ei-topbar-b" :class="alignClass">
    <div class="ei-topbar-b__manager-wrap">
      <button
        class="ei-topbar-b__btn"
        :title="store.t('designer.toolbar.manager')"
        @click="showManager = !showManager"
      >
        {{ store.t('designer.toolbar.manager') }}
      </button>
      <ToolbarManager v-if="showManager" @close="showManager = false" />
    </div>

    <div class="ei-topbar-b__divider" />

    <div class="ei-topbar-b__groups">
      <template v-for="(group, idx) in visibleGroups" :key="group.id">
        <div v-if="idx > 0 && !group.hideDivider" class="ei-topbar-b__divider" />

        <!-- undo-redo -->
        <div v-if="group.id === 'undo-redo'" class="ei-topbar-b__group">
          <button
            class="ei-topbar-b__btn"
            :disabled="!store.commands.canUndo"
            :title="store.t('designer.toolbar.undo')"
            @click="handleUndo"
          >
            {{ store.t('designer.toolbar.undo') }}
          </button>
          <button
            class="ei-topbar-b__btn"
            :disabled="!store.commands.canRedo"
            :title="store.t('designer.toolbar.redo')"
            @click="handleRedo"
          >
            {{ store.t('designer.toolbar.redo') }}
          </button>
        </div>

        <!-- new-clear -->
        <div v-else-if="group.id === 'new-clear'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.newTemplate')">
            {{ store.t('designer.toolbar.newTemplate') }}
          </button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.clear')">
            {{ store.t('designer.toolbar.clear') }}
          </button>
        </div>

        <!-- font -->
        <div v-else-if="group.id === 'font'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.bold')">B</button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.italic')">I</button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.underline')">U</button>
        </div>

        <!-- rotation -->
        <div v-else-if="group.id === 'rotation'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.rotation')">
            {{ store.t('designer.toolbar.rotation') }}
          </button>
        </div>

        <!-- visibility -->
        <div v-else-if="group.id === 'visibility'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.property.hidden')">
            {{ store.t('designer.property.hidden') }}
          </button>
        </div>

        <!-- select -->
        <div v-else-if="group.id === 'select'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.selectAll')">
            {{ store.t('designer.toolbar.selectAll') }}
          </button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.selectSameType')">
            {{ store.t('designer.toolbar.selectSameType') }}
          </button>
        </div>

        <!-- distribute -->
        <div v-else-if="group.id === 'distribute'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.distribute')">
            {{ store.t('designer.toolbar.distribute') }}
          </button>
        </div>

        <!-- align -->
        <div v-else-if="group.id === 'align'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.alignLeft')">L</button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.alignCenter')">C</button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.alignRight')">R</button>
        </div>

        <!-- layer -->
        <div v-else-if="group.id === 'layer'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.layerUp')">
            {{ store.t('designer.toolbar.layerUp') }}
          </button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.layerDown')">
            {{ store.t('designer.toolbar.layerDown') }}
          </button>
        </div>

        <!-- group -->
        <div v-else-if="group.id === 'group'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.group')">
            {{ store.t('designer.toolbar.group') }}
          </button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.ungroup')">
            {{ store.t('designer.toolbar.ungroup') }}
          </button>
        </div>

        <!-- lock -->
        <div v-else-if="group.id === 'lock'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.lock')">
            {{ store.t('designer.toolbar.lock') }}
          </button>
        </div>

        <!-- clipboard -->
        <div v-else-if="group.id === 'clipboard'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.copy')">
            {{ store.t('designer.toolbar.copy') }}
          </button>
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.paste')">
            {{ store.t('designer.toolbar.paste') }}
          </button>
          <button
            class="ei-topbar-b__btn"
            :disabled="store.selection.isEmpty"
            :title="store.t('designer.toolbar.delete')"
            @click="store.selection.ids.forEach(id => store.removeElement(id))"
          >
            {{ store.t('designer.toolbar.delete') }}
          </button>
        </div>

        <!-- snap -->
        <div v-else-if="group.id === 'snap'" class="ei-topbar-b__group">
          <button class="ei-topbar-b__btn" :title="store.t('designer.toolbar.snapToGrid')">
            {{ store.t('designer.toolbar.snapToGrid') }}
          </button>
        </div>
      </template>
    </div>

    <div class="ei-topbar-b__spacer" />

    <div class="ei-topbar-b__zoom">
      <button class="ei-topbar-b__btn" @click="store.workbench.viewport.zoom = Math.max(0.25, store.workbench.viewport.zoom - 0.1)">
        -
      </button>
      <span class="ei-topbar-b__zoom-label">{{ Math.round(store.workbench.viewport.zoom * 100) }}%</span>
      <button class="ei-topbar-b__btn" @click="store.workbench.viewport.zoom = Math.min(4, store.workbench.viewport.zoom + 0.1)">
        +
      </button>
    </div>
  </div>
</template>

<style scoped>
.ei-topbar-b {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid var(--ei-border-color, #e0e0e0);
  background: var(--ei-topbar-bg, #fafafa);
  gap: 4px;
}

.ei-topbar-b__manager-wrap {
  position: relative;
}

.ei-topbar-b__groups {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
}

.ei-topbar-b--align-center .ei-topbar-b__groups {
  justify-content: center;
}

.ei-topbar-b--align-end .ei-topbar-b__groups {
  justify-content: flex-end;
}

.ei-topbar-b__group {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.ei-topbar-b__btn {
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: var(--ei-text, #333);
  white-space: nowrap;
  min-width: 24px;
  text-align: center;
}

.ei-topbar-b__btn:hover:not(:disabled) {
  background: var(--ei-hover-bg, #e8e8e8);
}

.ei-topbar-b__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ei-topbar-b__divider {
  width: 1px;
  height: 20px;
  background: var(--ei-border-color, #e0e0e0);
  flex-shrink: 0;
}

.ei-topbar-b__spacer {
  flex: 1;
}

.ei-topbar-b__zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ei-topbar-b__zoom-label {
  font-size: 12px;
  min-width: 40px;
  text-align: center;
  user-select: none;
}
</style>
