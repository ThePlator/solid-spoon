import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Library: undefined;
  Capture: { sharedUrl?: string; sharedText?: string } | undefined;
  Map: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  // Accept nested tab params so a share intent can route straight to Capture.
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Detail: { id: string };
  NotFound: { title?: string; message?: string } | undefined;
};
