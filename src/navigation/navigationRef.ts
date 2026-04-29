import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateTo(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(CommonActions.navigate({ name, params }));
  }
}

export function resetToLogin() {
  if (navigationRef.isReady()) {
    // Sempre vai para Login — o usuário estava autenticado e perdeu a sessão
    navigationRef.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
    );
  }
}
