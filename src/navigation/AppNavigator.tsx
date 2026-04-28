import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors } from '../theme/colors';
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
import DividasScreen from '../screens/DividasScreen';
import AnualScreen from '../screens/AnualScreen';
import BuscaLancamentosScreen from '../screens/BuscaLancamentosScreen';
import OrcamentoScreen from '../screens/OrcamentoScreen';
import FamiliaScreen from '../screens/FamiliaScreen';
import MetasScreen from '../screens/MetasScreen';
import UserDrawer from '../components/UserDrawer';
import OnboardingTour from '../components/OnboardingTour';
import { VencimentosProvider, useVencimentos } from '../contexts/VencimentosContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Logo no header ───────────────────────────────────────────────────────────
function AppHeaderTitle() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      {/* Mini mascote: círculo verde com M */}
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: darkColors.green,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: darkColors.green, shadowOpacity: 0.45,
        shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 6,
      }}>
        {/* Olhos */}
        <View style={{ flexDirection: 'row', gap: 7, marginBottom: 3, marginTop: -2 }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#0d1117' }} />
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#0d1117' }} />
        </View>
        {/* Sorriso */}
        <View style={{ height: 6, width: 13, overflow: 'hidden' }}>
          <View style={{
            height: 12, width: 12,
            borderRadius: 6, borderWidth: 1.5,
            borderColor: '#0d1117',
            marginTop: -6, alignSelf: 'center',
          }} />
        </View>
      </View>
      <Text style={{ color: darkColors.text, fontWeight: '800', fontSize: 17 }}>
        Meu Financeiro
      </Text>
    </View>
  );
}

const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'login',
      Register: {
        path: 'register',
        parse: {
          inviteToken: (v: string) => v,  // ?inviteToken=
          invite:      (v: string) => v,  // ?invite= (formato do backend)
        },
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
      <OnboardingTour active />
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
            Orçamento: '📋',
          };
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: darkColors.green,
        tabBarInactiveTintColor: darkColors.textTertiary,
        tabBarStyle: {
          backgroundColor: darkColors.surface,
          borderTopColor: darkColors.border,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: darkColors.surface },
        headerTintColor: darkColors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
            <TouchableOpacity
              onPress={() => navigationRef.current?.navigate('BuscaLancamentos' as never)}
              style={{ padding: 6 }}
            >
              <Text style={{ fontSize: 20 }}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={{ padding: 4 }}
            >
              <View>
                <Text style={{ fontSize: 22 }}>👤</Text>
                {badge > 0 && (
                  <View style={{
                    position: 'absolute', top: -4, right: -4,
                    backgroundColor: darkColors.red, borderRadius: 8,
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
          </View>
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerTitle: () => <AppHeaderTitle /> }}
      />
      <Tab.Screen
        name="Lançamentos"
        component={LancamentosScreen}
        options={{ tabBarBadge: badge > 0 ? badge : undefined }}
      />
      <Tab.Screen name="Receitas" component={ReceitasScreen} />
      <Tab.Screen name="Cartões" component={CartoesScreen} />
      <Tab.Screen name="Saldos" component={SaldosScreen} />
      <Tab.Screen
        name="Orçamento"
        component={OrcamentoScreen}
        options={{ title: 'Orçamento' }}
      />
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
      <View style={{ flex: 1, backgroundColor: darkColors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={darkColors.green} />
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
          name="Metas"
          component={MetasScreen}
          options={{
            headerShown: true,
            title: 'Metas',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="Familia"
          component={FamiliaScreen}
          options={{
            headerShown: true,
            title: 'Família',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="Orcamento"
          component={OrcamentoScreen}
          options={{
            headerShown: true,
            title: 'Orçamento por Categoria',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="BuscaLancamentos"
          component={BuscaLancamentosScreen}
          options={{
            headerShown: true,
            title: 'Buscar Lançamentos',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="Anual"
          component={AnualScreen}
          options={{
            headerShown: true,
            title: 'Visão Anual',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="Dividas"
          component={DividasScreen}
          options={{
            headerShown: true,
            title: 'Dívidas Parceladas',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
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
