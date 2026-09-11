export type RootStackParamList = {
  Tabs: undefined;
  Detail: { id: string };
};

export type TabParamList = {
  Library: undefined;
  Capture: { sharedUrl?: string; sharedText?: string } | undefined;
  Profile: undefined;
};
