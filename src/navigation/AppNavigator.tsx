import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/authService';
import { navigationRef } from './navigationRef';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import LancamentosScreen from '../screens/LancamentosScreen';
import CartoesScreen from '../screens/CartoesScreen';
import SaldosScreen from '../screens/SaldosScreen';
import AddLancamentoScreen from '../screens/AddLancamentoScreen';
import EditLancamentoScreen from '../screens/EditLancamentoScreen';
import ReceitasScreen from '../screens/ReceitasScreen';
import RegisterScreen from '../screens/RegisterScreen';
import InvitesScreen from '../screens/InvitesScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import ExtratoContaScreen from '../screens/ExtratoContaScreen';
import ImportarFaturaScreen from '../screens/ImportarFaturaScreen';
import UserDrawer from '../components/UserDrawer';
import { VencimentosProvider, useVencimentos } from '../contexts/VencimentosContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      Register: {
        path: 'register',
        parse: { inviteToken: (invite: string) => invite },
      },
      Main: {
        screens: {
          Dashboard: 'dashboard',
          Lançamentos: 'lancamentos',
          Receitas: 'receitas',
          Cartões: 'cartoes',
          Saldos: 'saldos',
        },
      },
    },
  },
};

function MainTabs() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { badge, refresh } = useVencimentos();

  // Garante que os alertas sejam do usuário atual a cada login
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <UserDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ size }) => {
          const icons: Record<string, string> = {
            Dashboard: '📊',
            Lançamentos: '💰',
            Receitas: '📈',
            Cartões: '💳',
            Saldos: '🏦',
          };
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#ffffff15',
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={{ marginRight: 14, padding: 4 }}
          >
            <View>
              <Text style={{ fontSize: 22 }}>👤</Text>
              {badge > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: '#e53935', borderRadius: 8,
                  minWidth: 16, height: 16,
                  justifyContent: 'center', alignItems: 'center',
                  paddingHorizontal: 3,
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>
                    {badge > 99 ? '99+' : badge}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen
        name="Lançamentos"
        component={LancamentosScreen}
        options={{ tabBarBadge: badge > 0 ? badge : undefined }}
      />
      <Tab.Screen name="Receitas" component={ReceitasScreen} />
      <Tab.Screen name="Cartões" component={CartoesScreen} />
      <Tab.Screen name="Saldos" component={SaldosScreen} />
    </Tab.Navigator>
    </>
  );
}

export default function AppNavigator() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // getToken já valida expiração localmente
    authService.getToken().then(token => {
      setIsLoggedIn(!!token);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <VencimentosProvider>
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={isLoggedIn ? 'Main' : 'Login'}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Invites" component={InvitesScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen
          name="AddLancamento"
          component={AddLancamentoScreen}
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="EditLancamento"
          component={EditLancamentoScreen}
          options={{ headerShown: true, title: 'Editar Lançamento', headerStyle: { backgroundColor: '#1a1a2e' }, headerTintColor: '#fff' }}
        />
        <Stack.Screen
          name="ImportarFatura"
          component={ImportarFaturaScreen}
          options={{
            headerShown: true,
            title: 'Importar Fatura',
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#fff',
          }}
        />
        <Stack.Screen
          name="ExtratoConta"
          component={ExtratoContaScreen}
          options={({ route }: any) => ({
            headerShown: true,
            title: `Extrato · ${route.params?.banco ?? 'Conta'}`,
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#fff',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </VencimentosProvider>
  );
}
