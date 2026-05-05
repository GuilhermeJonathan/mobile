import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, TouchableOpacity, Image, Platform, Dimensions, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors } from '../theme/colors';
import { authService } from '../services/authService';
import { navigationRef } from './navigationRef';
import DogMascot from '../components/DogMascot';
import DesktopShell from '../components/DesktopShell';
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
import WhatsAppVincularScreen from '../screens/WhatsAppVincularScreen';
import LandingScreen from '../screens/LandingScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import NotFoundScreen from '../screens/NotFoundScreen';
import PlanosScreen from '../screens/PlanosScreen';
import PaymentTransactionsScreen from '../screens/PaymentTransactionsScreen';
import TransferenciaScreen from '../screens/TransferenciaScreen';
import ImportarExtratoScreen from '../screens/ImportarExtratoScreen';
import AssinaturasScreen from '../screens/AssinaturasScreen';
import CategoriasScreen from '../screens/CategoriasScreen';
import ImoveisScreen from '../screens/ImoveisScreen';
import ImovelDetailScreen from '../screens/ImovelDetailScreen';
import PagamentoSucessoScreen from '../screens/PagamentoSucessoScreen';
import UserDrawer from '../components/UserDrawer';
import OnboardingTour from '../components/OnboardingTour';
import TrialExpiredModal from '../components/TrialExpiredModal';
import TrialBanner from '../components/TrialBanner';
import TermsModal from '../components/TermsModal';
import { VencimentosProvider, useVencimentos } from '../contexts/VencimentosContext';
import { OfflineBanner } from '../components/OfflineBanner';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Mobile web = browser em tela estreita; esconde abas extras e move pro drawer
const isMobileWeb = Platform.OS === 'web' && Dimensions.get('window').width < 768;

// Breakpoint para layout desktop com sidebar lateral
const DESKTOP_BREAKPOINT = 1024;

// ─── Logo cachorro no header ─────────────────────────────────────────────────
export function AppHeaderTitle() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <DogMascot size={56} color={darkColors.green} mood="happy" />
      <View style={{ flexDirection: 'column' }}>
        <Text style={{ color: darkColors.textSecondary, fontWeight: '700', fontSize: 13, lineHeight: 15 }}>
          Meu
        </Text>
        <Text style={{ color: darkColors.text, fontWeight: '900', fontSize: 20, lineHeight: 22 }}>
          FinDog
        </Text>
      </View>
    </View>
  );
}

const LINKING_CONFIG = {
  initialRouteName: 'Landing',
  screens: {
    Landing: { path: '' },
    Login: 'login',
    Register: {
      path: 'register',
      parse: {
        inviteToken: (v: string) => v,
        invite:      (v: string) => v,
      },
    },
    ForgotPassword: 'forgot-password',
    ResetPassword: {
      path: 'reset-password',
      parse: {
        token: (v: string) => v,
        email: (v: string) => decodeURIComponent(v),
      },
    },
    Main: {
      screens: {
        Dashboard: 'dashboard',
        Lançamentos: 'lancamentos',
        Receitas: 'receitas',
        Cartões: 'cartoes',
        Contas: 'contas',
      },
    },
    Planos: 'planos',
    // Catch-all: qualquer rota não reconhecida → 404
    NotFound: '*',
  },
};

function MainTabs() {
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [avatarUrl, setAvatarUrl]         = useState<string | null>(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [podeVerImoveis, setPodeVerImoveis] = useState(false);
  const [trialModal, setTrialModal]       = useState(false);
  const [trialDays, setTrialDays]         = useState<number | null>(null);
  const [trialExpired, setTrialExpired]   = useState(false);
  const [trialBannerDays, setTrialBannerDays] = useState<number | null>(null);
  const [termsModal, setTermsModal]       = useState(false);
  // Tracks the active route name for sidebar highlighting
  const [activeRoute, setActiveRoute]     = useState('Dashboard');

  async function handleAcceptTerms() {
    await authService.acceptTerms().catch(() => {});
    setTermsModal(false);
  }
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { badge, refresh } = useVencimentos();

  // Desktop web: sidebar layout; everything else: bottom tabs
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  // ── Auth guard: sem token válido → Login ────────────────────────────────
  useEffect(() => {
    authService.getToken().then(token => {
      if (!token) {
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' as never }],
        });
      }
    });
  }, []);

  // Garante que os alertas sejam do usuário atual a cada login
  useEffect(() => { refresh(); }, []);

  // Verifica status do plano ao entrar no app
  useEffect(() => {
    authService.getPlanInfo().then(plan => {
      if (!plan) return;
      if (plan.isTrialExpired) {
        setTrialExpired(true);
        setTrialModal(true);
      } else if (plan.isTrialActive && plan.trialDaysRemaining !== null) {
        // Banner visível durante TODO o trial
        setTrialBannerDays(plan.trialDaysRemaining);
        // Modal popup só nos últimos 3 dias
        if (plan.trialDaysRemaining <= 3) {
          setTrialDays(plan.trialDaysRemaining);
          setTrialModal(true);
        }
      }
    });
  }, []);

  // Verifica aceite de termos ao entrar no app
  useEffect(() => {
    authService.checkTermsAccepted().then(accepted => {
      if (!accepted) setTermsModal(true);
    });
  }, []);

  // Carrega avatar e permissão admin ao montar / quando drawer fecha
  useEffect(() => {
    authService.getUserInfo().then(u => setAvatarUrl(u?.avatarUrl ?? null));
    authService.isAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    authService.podeVerImoveis().then(setPodeVerImoveis).catch(() => setPodeVerImoveis(false));
  }, [drawerOpen]);

  // ── Sidebar navigation handler ──────────────────────────────────────────
  // No desktop a maioria dos itens abre dentro do Tab (área de conteúdo à direita).
  // Itens com isRootStack=true ficam no Stack raiz e precisam ser navegados diretamente.
  function handleDesktopNavigate(routeName: string, isRootStack?: boolean) {
    setActiveRoute(routeName);
    if (isRootStack) {
      navigationRef.current?.navigate(routeName as never);
    } else {
      navigationRef.current?.navigate('Main' as never, { screen: routeName } as never);
    }
  }

  // ── Shared tab navigator ─────────────────────────────────────────────────
  const tabNavigator = (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ size }) => {
          const icons: Record<string, string> = {
            Dashboard: '📊',
            Lançamentos: '💰',
            Receitas: '📈',
            Cartões: '💳',
            Contas: '🏦',
            Orçamento: '📋',
          };
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: darkColors.green,
        tabBarInactiveTintColor: darkColors.textTertiary,
        // Hide bottom bar on desktop — sidebar takes over navigation
        tabBarStyle: isDesktop ? { display: 'none' } : {
          backgroundColor: darkColors.surface,
          borderTopColor: darkColors.border,
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11 },
        headerStyle: { backgroundColor: darkColors.surface },
        headerTintColor: darkColors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: isDesktop
          ? () => (
            // Desktop: search only (user is in sidebar)
            <TouchableOpacity
              onPress={() => navigationRef.current?.navigate('BuscaLancamentos' as never)}
              style={{ padding: 6, marginRight: 8 }}
            >
              <Text style={{ fontSize: 20 }}>🔍</Text>
            </TouchableOpacity>
          )
          : () => (
            // Mobile: search + avatar with badge
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 }}>
              <TouchableOpacity
                onPress={() => navigationRef.current?.navigate('BuscaLancamentos' as never)}
                style={{ padding: 6 }}
              >
                <Text style={{ fontSize: 20 }}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDrawerOpen(true)} style={{ padding: 4 }}>
                <View>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        borderWidth: 1.5, borderColor: darkColors.green,
                      }}
                    />
                  ) : (
                    <Text style={{ fontSize: 22 }}>👤</Text>
                  )}
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
        options={isDesktop
          ? { title: 'Dashboard' }
          : { headerTitle: () => <AppHeaderTitle />, headerStyle: { backgroundColor: darkColors.surface } }}
      />
      <Tab.Screen
        name="Lançamentos"
        component={LancamentosScreen}
        options={{ tabBarBadge: badge > 0 && !isDesktop ? badge : undefined }}
      />
      <Tab.Screen name="Receitas" component={ReceitasScreen} />
      <Tab.Screen name="Cartões" component={CartoesScreen} />
      <Tab.Screen
        name="Contas"
        component={SaldosScreen}
        options={isMobileWeb
          ? { tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, title: 'Contas' }
          : { title: 'Contas' }}
      />
      <Tab.Screen
        name="Orçamento"
        component={OrcamentoScreen}
        options={isMobileWeb
          ? { tabBarButton: () => null, tabBarItemStyle: { display: 'none' }, title: 'Orçamento' }
          : { title: 'Orçamento' }}
      />

      {/* ── Telas extras: ocultas no mobile, abertas pela sidebar no desktop ── */}
      <Tab.Screen
        name="Dividas"
        component={DividasScreen}
        options={{ title: 'Dívidas Parceladas', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Anual"
        component={AnualScreen}
        options={{ title: 'Visão Anual', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Familia"
        component={FamiliaScreen}
        options={{ title: 'Família', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Metas"
        component={MetasScreen}
        options={{ title: 'Metas', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="BuscaLancamentos"
        component={BuscaLancamentosScreen}
        options={{ title: 'Buscar Lançamentos', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="WhatsApp"
        component={WhatsAppVincularScreen}
        options={{ headerShown: false, tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      {/* ── Ferramentas: hidden tab, open in content area on desktop ── */}
      <Tab.Screen
        name="Assinaturas"
        component={AssinaturasScreen}
        options={{ title: 'Assinaturas', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Categorias"
        component={CategoriasScreen}
        options={{ title: 'Categorias', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Transferencia"
        component={TransferenciaScreen}
        options={{ title: 'Transferência', headerShown: false, tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="ImportarExtrato"
        component={ImportarExtratoScreen}
        options={{ title: 'Importar Extrato', headerShown: false, tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      {/* ── Admin screens — hidden tab, open in content area on desktop ── */}
      <Tab.Screen
        name="Imoveis"
        component={ImoveisScreen}
        options={{ title: 'Imóveis', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: 'Usuários', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="Invites"
        component={InvitesScreen}
        options={{ title: 'Convites', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
      <Tab.Screen
        name="PaymentTransactions"
        component={PaymentTransactionsScreen}
        options={{ title: 'Transações', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
      />
    </Tab.Navigator>
  );

  // ── Desktop layout: sidebar + content ───────────────────────────────────
  if (isDesktop) {
    return (
      <>
        <TrialExpiredModal
          visible={trialModal}
          isExpired={trialExpired}
          trialDaysRemaining={trialDays}
        />
        <TermsModal visible={termsModal} onAccept={handleAcceptTerms} />
        <OnboardingTour active sidebarWidth={240} />
        <UserDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <View style={{ flex: 1, flexDirection: 'row', backgroundColor: darkColors.background }}>
          <DesktopShell
            activeRoute={activeRoute}
            onNavigate={handleDesktopNavigate}
            onOpenDrawer={() => setDrawerOpen(true)}
            avatarUrl={avatarUrl}
            badge={badge}
            isAdmin={isAdmin}
            podeVerImoveis={podeVerImoveis}
          />
          <View style={{ flex: 1 }}>
            {!trialExpired && trialBannerDays !== null && (
              <TrialBanner
                daysRemaining={trialBannerDays}
                onPress={() => navigationRef.current?.navigate('Planos' as never)}
              />
            )}
            {tabNavigator}
          </View>
        </View>
      </>
    );
  }

  // ── Mobile layout: bottom tabs ───────────────────────────────────────────
  return (
    <>
      <TrialExpiredModal
        visible={trialModal}
        isExpired={trialExpired}
        trialDaysRemaining={trialDays}
      />
      <TermsModal visible={termsModal} onAccept={handleAcceptTerms} />
      <OnboardingTour active onOpenDrawer={() => setDrawerOpen(true)} onCloseDrawer={() => setDrawerOpen(false)} />
      <UserDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <View style={{ flex: 1 }}>
        {!trialExpired && trialBannerDays !== null && (
          <TrialBanner
            daysRemaining={trialBannerDays}
            onPress={() => setTrialModal(true)}
          />
        )}
        {tabNavigator}
      </View>
    </>
  );
}

export default function AppNavigator() {
  const [checking, setChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      let token = await authService.getToken();
      if (!token) {
        // access token expirado ou ausente — tenta renovar com refresh token
        token = await authService.refreshAccessToken();
      }
      setIsLoggedIn(!!token);
      setChecking(false);
    }
    checkAuth();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: darkColors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={darkColors.green} />
      </View>
    );
  }

  const initialRoute = isLoggedIn ? 'Main' : Platform.OS === 'web' ? 'Landing' : 'Login';

  const origin = Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin : '';

  // Links públicos que requerem deep-link mesmo sem login
  const isInviteLink = Platform.OS === 'web' && typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/register') ||
    window.location.search.includes('invite') ||
    window.location.search.includes('inviteToken')
  );
  const isResetLink = Platform.OS === 'web' && typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/reset-password');

  // Usuário logado → linking completo (deep-links funcionam)
  // Usuário não-logado + convite → linking apenas para Register
  // Usuário não-logado sem convite → SEM linking (initialRouteName = Landing, sem interferência da URL)
  const linking = (isLoggedIn || isInviteLink || isResetLink) ? {
    prefixes: origin ? [origin, 'https://app.findog.com.br', 'https://findog.com.br'] : [],
    getInitialURL: async () => typeof window !== 'undefined' ? window.location.href : null,
    config: LINKING_CONFIG,
  } : undefined;

  function handleNavReady() {
    if (Platform.OS !== 'web') return;

    if (!isLoggedIn) {
      // Não logado: garante que rotas protegidas não fiquem acessíveis
      const current = navigationRef.current?.getCurrentRoute()?.name;
      const isPublic = ['Landing', 'Login', 'Register', 'ForgotPassword', 'ResetPassword', 'NotFound'].includes(current ?? '');
      if (current && !isPublic) {
        navigationRef.current?.reset({ index: 0, routes: [{ name: 'Landing' as never }] });
      }
      return;
    }

    // Pagamento MP: redireciona para tela de sucesso se vier com collection_status=approved
    const mpParams = new URLSearchParams(window.location.search);
    const mpStatus = mpParams.get('collection_status') ?? mpParams.get('status');
    if (mpStatus === 'approved') {
      // Limpa os params da URL sem reload
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => {
        navigationRef.current?.navigate('PagamentoSucesso' as never);
      }, 50);
      return;
    }

    // Logado: garante que a URL /lancamentos, /receitas etc. abra a aba correta.
    // Corrige race condition onde o Tab inicia em Dashboard e ignora a URL.
    if (typeof window === 'undefined') return;
    const path = window.location.pathname.replace(/\/$/, '');
    const pathToTab: Record<string, string> = {
      '/lancamentos': 'Lançamentos',
      '/receitas':    'Receitas',
      '/cartoes':     'Cartões',
      '/contas':      'Contas',
      '/dashboard':   'Dashboard',
    };
    const targetTab = pathToTab[path];
    if (targetTab) {
      // Timeout mínimo para o Tab navigator terminar de montar
      setTimeout(() => {
        navigationRef.current?.navigate('Main' as never, { screen: targetTab } as never);
      }, 50);
    }
  }

  return (
    <VencimentosProvider>
    <View style={{ flex: 1 }}>
    <OfflineBanner />
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={handleNavReady}
      documentTitle={{ formatter: () => 'Meu FinDog · seu assistente financeiro' }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        {/* ── Rotas PÚBLICAS — sem autenticação ── */}
        <Stack.Screen name="Landing"        component={LandingScreen} />
        <Stack.Screen name="Login"          component={LoginScreen} />
        <Stack.Screen name="Register"       component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
        <Stack.Screen name="NotFound"       component={NotFoundScreen} />

        {/* ── Rotas PROTEGIDAS — exigem login ── */}
        <Stack.Screen name="Main"       component={MainTabs} />
        <Stack.Screen name="Invites"    component={InvitesScreen} />
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
          name="WhatsApp"
          component={WhatsAppVincularScreen}
          options={{
            headerShown: false,
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
        <Stack.Screen
          name="Planos"
          component={PlanosScreen}
          options={{
            headerShown: true,
            title: 'Planos',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="PaymentTransactions"
          component={PaymentTransactionsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="PagamentoSucesso"
          component={PagamentoSucessoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Transferencia"
          component={TransferenciaScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ImportarExtrato"
          component={ImportarExtratoScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Assinaturas"
          component={AssinaturasScreen}
          options={{
            headerShown: true,
            title: 'Assinaturas',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="Categorias"
          component={CategoriasScreen}
          options={{
            headerShown: true,
            title: 'Categorias',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          }}
        />
        <Stack.Screen
          name="ImovelDetail"
          component={ImovelDetailScreen}
          options={({ route }: any) => ({
            headerShown: true,
            title: 'Detalhe do Imóvel',
            headerStyle: { backgroundColor: darkColors.surface },
            headerTintColor: darkColors.text,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </View>
    </VencimentosProvider>
  );
}
