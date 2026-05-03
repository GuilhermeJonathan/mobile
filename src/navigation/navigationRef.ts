import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { Platform } from 'react-native';

export const navigationRef = createNavigationContainerRef();

export function navigateTo(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name, params }));
  }
}

export function resetToLogin() {
  if (navigationRef.isReady()) {
    // Na web usa Landing; no mobile usa Login
    const route = Platform.OS === 'web' ? 'Landing' : 'Login';
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: route }] })
    );
  }
}
