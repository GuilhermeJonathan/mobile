declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: string;
    details: Record<string, unknown> | null;
  }

  type NetInfoChangeHandler = (state: NetInfoState) => void;
  type NetInfoUnsubscribe = () => void;

  interface NetInfoStatic {
    addEventListener(listener: NetInfoChangeHandler): NetInfoUnsubscribe;
    fetch(): Promise<NetInfoState>;
  }

  const NetInfo: NetInfoStatic;
  export default NetInfo;
}
