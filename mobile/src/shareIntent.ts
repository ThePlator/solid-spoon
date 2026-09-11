import Constants from 'expo-constants';

/**
 * expo-share-intent is a NATIVE module — it only exists in a dev build or a
 * standalone APK, not in Expo Go. To let the app still run in Expo Go (for a
 * quick QR demo of auth + feed + capture), we only `require` it when we're NOT
 * in Expo Go. The require lives inside the ternary so its module factory never
 * executes under Expo Go — Metro bundles it, but it's never invoked.
 */
const isExpoGo = Constants.appOwnership === 'expo';

type ShareIntentHook = (opts?: unknown) => {
  hasShareIntent: boolean;
  shareIntent: { webUrl?: string | null; text?: string | null };
  resetShareIntent: () => void;
};

const stub: ShareIntentHook = () => ({
  hasShareIntent: false,
  shareIntent: {},
  resetShareIntent: () => {},
});

export const useShareIntentSafe: ShareIntentHook = isExpoGo
  ? stub
  : // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('expo-share-intent').useShareIntent;

/** True when running inside Expo Go (share-sheet capture unavailable). */
export const shareIntentAvailable = !isExpoGo;
