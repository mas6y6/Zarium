<template>
  <div class="App container-fluid">
    <div class="background-component" :style="backgroundStyle"></div>
    
    <div class="ModalContainer" :class="{ show: store.modalVisible }">
      <component :is="store.modal" v-if="store.modal" />
    </div>

    <div class="NotificationContainer">
      <div
        v-for="n in store.notifications"
        :key="n.id"
        class="Notification"
        :class="[n.type || 'info', { closing: n.closing }]"
        :style="{ borderLeftColor: n.borderColor }"
        @click="handleNotificationClick(n)"
      >
        <div v-if="n.title" class="NotificationTitle">{{ n.title }}</div>
        <div v-if="n.content" class="NotificationContent">{{ n.content }}</div>
      </div>
    </div>

    <ZariumComponent :superadmin="store.superadmin" ref="zariumRef" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useAppStore } from './store';
import './sass/main.scss';
import { MainApplication } from './MainApplication';
import ZariumComponent from './Zarium.vue';

const store = useAppStore();
const zariumRef = ref<InstanceType<typeof ZariumComponent> | null>(null);

const backgroundStyle = computed(() => ({
  backgroundColor: store.background.color ?? 'var(--default-app-background)',
  backgroundImage: store.background.image ? `url(${store.background.image})` : undefined,
  backdropFilter: store.background.blur ? 'blur(8px)' : undefined,
  position: 'fixed' as const,
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: -1,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}));

function handleNotificationClick(n: any) {
  if (n.onClick) n.onClick();
  store.closeNotification(n.id);
}

onMounted(() => {
  const theme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);

  MainApplication().catch((e) => {
    console.error(e);
    // TODO: Show error modal
  });
});

defineExpose({
  zariumRef
});
</script>
