import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { useSettingsStore } from '@/store/settings';

export function useNotification() {
  const { notificationsEnabled } = useSettingsStore();

  const notify = async (title: string, body: string) => {
    if (!notificationsEnabled) return;

    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
      sendNotification({ title, body });
    }
  };

  return { notify };
}
