<template>
  <div class="Zarium" :class="{ show: store.showZarium }">
    <div class="Topbar" :class="{ 'sidebar-open': sidebarOpen }">
      <Button
        class="TopbarToggle"
        :class="{ open: sidebarOpen }"
        @click="sidebarOpen = !sidebarOpen"
        color="transparent"
      >
        <ArrowLeft />
      </Button>
      <Button color="secondary">
        <People />
      </Button>
      <Button color="secondary" @click="openSettings">
        <SettingsIcon />
      </Button>
      <Button v-if="superadmin" color="primary">
        <AdminIcon />
      </Button>
    </div>
    <div class="ZariumInner">
      <div class="Sidebar" :class="{ open: sidebarOpen }">
        <component :is="store.groups" v-if="store.groups" />
        <component :is="store.accountbar" v-if="store.accountbar" />
      </div>
      <div
        class="MainContent"
        :class="{ 'overlay-active': sidebarOpen }"
        @click="sidebarOpen = false"
      >
        <div v-if="tabs.length > 0" class="MainContentTabs">
          <div
            class="MainContentTab"
            :class="{ active: activeTab === -1 }"
            @click="activeTab = -1"
          >
            Main
          </div>
          <div
            v-for="(tab, index) in tabs"
            :key="tab.id"
            class="MainContentTab"
            :class="{ active: activeTab === index }"
            @click.stop="activeTab = index"
          >
            {{ tab.name }}
            <span class="MainContentTabClose" @click.stop="closeTab(index)">×</span>
          </div>
        </div>
        <div class="MainContentBody">
          <ZariumDefaultMainContent v-if="activeTab === -1" />
          <component :is="tabs[activeTab].content" v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw } from 'vue';
import { useAppStore } from './store';
import Button from './components/Button.vue';
import { AdminIcon, ArrowLeft, People, Settings as SettingsIcon } from './Icons';
import { SettingsModal } from './modals/SettingsModal.vue';
import ZariumDefaultMainContent from "@/ZariumDefaultMainContent.vue";

defineProps<{
  superadmin?: boolean;
}>();

const store = useAppStore();
const sidebarOpen = ref(false);
const activeTab = ref(-1);
const tabs = ref<{ id: string, name: string, content: any }[]>([]);

function openSettings() {
  store.setModal(SettingsModal)
}

function closeTab(index: number) {
  if (index === -1 || index >= tabs.value.length) return;

  const closingActive = activeTab.value === index;
  tabs.value.splice(index, 1);

  if (closingActive) {
    activeTab.value = tabs.value.length > 0 ? Math.max(0, index - 1) : -1;
  } else if (activeTab.value > index) {
    activeTab.value--;
  }
}

function openTab(name: string, content: any) {
  const id = crypto.randomUUID();
  const existingIndex = tabs.value.findIndex(t => t.name === name);
  if (existingIndex !== -1) {
    tabs.value[existingIndex] = { id: tabs.value[existingIndex].id, name, content: markRaw(content) };
    activeTab.value = existingIndex;
  } else {
    tabs.value.push({ id, name, content: markRaw(content) });
    activeTab.value = tabs.value.length - 1;
  }
  return id;
}

defineExpose({
  openTab,
  closeTab
});
</script>

<script lang="ts">
import { defineComponent, h } from 'vue';

export const Accountbar = defineComponent({
  props: ['username', 'displayname', 'id'],
  setup(props) {
    const profile = `/api/get-avatar?id=${props.id}`;
    return () => (
      h('div', { class: 'Accountbar' }, [
        h('div', { class: 'AccountbarAvatar' }, [
          h('img', { src: profile, alt: 'Avatar' })
        ]),
        h('div', { class: 'AccountbarInfo' }, [
          h('div', { class: 'AccountbarName' }, props.displayname),
          h('div', { class: 'AccountbarStatus' }, `@${props.username}`)
        ])
      ])
    );
  }
});

export const Groups = () => h('div', { class: 'Groups' });

</script>
