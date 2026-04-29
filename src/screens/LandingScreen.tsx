import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Dimensions, TextInput, ActivityIndicator,
} from 'react-native';
import WhatsAppIcon from '../components/WhatsAppIcon';
import { authService } from '../services/authService';
import DogMascot from '../components/DogMascot';

const W = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

// ── Paletas ──────────────────────────────────────────────────────────────────

const DARK = {
  bg:       '#0d1117', surface:  '#161b22', card:     '#1a1f2a',
  border:   '#30363d', green:    '#22c55e', greenDim: '#22c55e18',
  text:     '#f0f6fc', textSec:  '#8b949e', textTer:  '#484f58',
  red:      '#f85149', redDim:   '#f8514918',
  navBg:    '#0d1117', inputBg:  '#1a1f2a',
};

const LIGHT = {
  bg:       '#f8fafc', surface:  '#ffffff', card:     '#f1f5f9',
  border:   '#e2e8f0', green:    '#16a34a', greenDim: '#16a34a12',
  text:     '#0f172a', textSec:  '#475569', textTer:  '#94a3b8',
  red:      '#dc2626', redDim:   '#dc262612',
  navBg:    '#ffffff', inputBg:  '#f8fafc',
};

// ── Mini mascote para o nav ───────────────────────────────────────────────────


// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ children, style }: any) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 72, paddingHorizontal: 24 }, style]}>
      <View style={{ width: '100%', maxWidth: 1100 }}>{children}</View>
    </View>
  );
}

function mkBadge(C: typeof DARK) {
  return function Badge({ children }: { children: string }) {
    return (
      <View style={{
        backgroundColor: C.greenDim, borderRadius: 999,
        paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: C.green + '40',
        marginBottom: 20, alignSelf: 'center',
      }}>
        <Text style={{ color: C.green, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>{children}</Text>
      </View>
    );
  };
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ text, mine, C }: { text: string; mine?: boolean; C: typeof DARK }) {
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
      <View style={{
        maxWidth: '85%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: mine ? '#1a4731' : C.card,
        ...(mine ? { borderTopRightRadius: 4 } : { borderTopLeftRadius: 4 }),
      }}>
        <Text style={{ color: C.text, fontSize: 13, lineHeight: 18 }}>{text}</Text>
      </View>
    </View>
  );
}

// ── Mockup card wrapper ───────────────────────────────────────────────────────

function MCard({ children, C }: { children: React.ReactNode; C: typeof DARK }) {
  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 16,
      padding: 20, borderWidth: 1, borderColor: C.border,
      width: isWeb ? 300 : Math.min(W - 48, 340), flexShrink: 0,
    }}>
      {children}
    </View>
  );
}

function MHeader({ title, C }: { title: string; C: typeof DARK }) {
  return (
    <View style={{
      paddingBottom: 14, marginBottom: 14,
      borderBottomWidth: 1, borderBottomColor: C.border,
    }}>
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>{title}</Text>
    </View>
  );
}

// ── Mockup: WhatsApp ──────────────────────────────────────────────────────────

function WhatsMockup({ C }: { C: typeof DARK }) {
  return (
    <MCard C={C}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingBottom: 14, marginBottom: 14,
        borderBottomWidth: 1, borderBottomColor: C.border,
      }}>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: '#25D36620', borderWidth: 1, borderColor: '#25D36640',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <WhatsAppIcon size={20} />
        </View>
        <View>
          <Text style={{ color: C.text, fontWeight: '700', fontSize: 13 }}>Meu Financeiro</Text>
          <Text style={{ color: '#25D366', fontSize: 11 }}>online</Text>
        </View>
      </View>
      <ChatBubble text="Almoço 45,50" mine C={C} />
      <ChatBubble text={'💸 *Almoço* registrado!\nR$ 45,50 · Alimentação · hoje'} C={C} />
      <ChatBubble text="Recebi salário 5000" mine C={C} />
      <ChatBubble text={'📈 *Salário* registrado!\nR$ 5.000,00 · Receita · hoje'} C={C} />
      <ChatBubble text="Mercado ontem 230" mine C={C} />
      <ChatBubble text={'💸 *Mercado* registrado!\nR$ 230,00 · Alimentação · ontem'} C={C} />
    </MCard>
  );
}

// ── Mockup: Dashboard ─────────────────────────────────────────────────────────

function DashboardMockup({ C }: { C: typeof DARK }) {
  return (
    <MCard C={C}>
      <MHeader title="📊 Dashboard · Abril" C={C} />
      {[
        { label: 'Receitas',  value: 'R$ 8.200', color: C.green },
        { label: 'Despesas',  value: 'R$ 5.430', color: C.red },
      ].map(({ label, value, color }) => (
        <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: C.textSec, fontSize: 13 }}>{label}</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color }}>{value}</Text>
        </View>
      ))}
      <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginBottom: 10,
        flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>Saldo</Text>
        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>R$ 2.770</Text>
      </View>
      {[
        { label: 'Alimentação', w: '65%', color: C.green },
        { label: 'Transporte',  w: '40%', color: '#60a5fa' },
        { label: 'Lazer',       w: '25%', color: '#a78bfa' },
        { label: 'Saúde',       w: '18%', color: '#fb923c' },
      ].map(({ label, w, color }) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <View style={{ flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: w as any, height: '100%', backgroundColor: color, borderRadius: 3 }} />
          </View>
          <Text style={{ color: C.textTer, fontSize: 11, width: 90 }}>{label}</Text>
        </View>
      ))}
      <View style={{ backgroundColor: C.greenDim, borderRadius: 10, padding: 10, marginTop: 10 }}>
        <Text style={{ color: C.green, fontWeight: '700', fontSize: 12 }}>❤️ Saúde financeira</Text>
        <Text style={{ color: C.textSec, fontSize: 11, marginTop: 4 }}>142 dias de reserva · 66% comprometido</Text>
      </View>
    </MCard>
  );
}

// ── Mockup: Gráficos ──────────────────────────────────────────────────────────

function GraficosMockup({ C }: { C: typeof DARK }) {
  const meses = [
    { mes: 'Jan', rec: 72, desp: 58 }, { mes: 'Fev', rec: 68, desp: 62 },
    { mes: 'Mar', rec: 80, desp: 55 }, { mes: 'Abr', rec: 75, desp: 66 },
    { mes: 'Mai', rec: 90, desp: 60 }, { mes: 'Jun', rec: 85, desp: 70 },
  ];
  const cats = [
    { label: 'Alimentação', pct: 38, color: C.green },
    { label: 'Moradia',     pct: 27, color: '#60a5fa' },
    { label: 'Transporte',  pct: 18, color: '#a78bfa' },
    { label: 'Lazer',       pct: 10, color: '#fb923c' },
    { label: 'Outros',      pct:  7, color: C.textTer },
  ];
  return (
    <MCard C={C}>
      <MHeader title="📈 Visão anual" C={C} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 72, marginBottom: 6 }}>
        {meses.map(({ mes, rec, desp }) => (
          <View key={mes} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 64 }}>
              <View style={{ width: 8, height: rec * 0.64, borderRadius: 3, backgroundColor: C.green, opacity: 0.85 }} />
              <View style={{ width: 8, height: desp * 0.64, borderRadius: 3, backgroundColor: C.red, opacity: 0.75 }} />
            </View>
            <Text style={{ color: C.textTer, fontSize: 9 }}>{mes}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
        {[{ color: C.green, label: 'Receitas' }, { color: C.red, label: 'Despesas' }].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ color: C.textSec, fontSize: 10 }}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: C.border, marginBottom: 14 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 72, height: 72, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{
            position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 9,
            borderTopColor: C.green, borderRightColor: C.green,
            borderBottomColor: '#60a5fa', borderLeftColor: '#a78bfa',
          }} />
          <View style={{
            width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ color: C.text, fontSize: 11, fontWeight: '800' }}>Mai</Text>
          </View>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {cats.map(({ label, pct, color }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
              <Text style={{ color: C.textSec, fontSize: 10, flex: 1 }}>{label}</Text>
              <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{pct}%</Text>
            </View>
          ))}
        </View>
      </View>
    </MCard>
  );
}

// ── Mockup: Lançamentos ───────────────────────────────────────────────────────

function LancamentosMockup({ C }: { C: typeof DARK }) {
  const items = [
    { desc: 'Almoço',  cat: 'Alimentação', val: '-45,50',  color: C.red,   icon: '🍽️' },
    { desc: 'Salário', cat: 'Receita',     val: '+5.000',  color: C.green, icon: '💼' },
    { desc: 'Mercado', cat: 'Alimentação', val: '-230,00', color: C.red,   icon: '🛒' },
    { desc: 'Uber',    cat: 'Transporte',  val: '-18,90',  color: C.red,   icon: '🚗' },
    { desc: 'Netflix', cat: 'Lazer',       val: '-39,90',  color: C.red,   icon: '🎬' },
  ];
  return (
    <MCard C={C}>
      <MHeader title="💰 Lançamentos" C={C} />
      <View style={{ gap: 10 }}>
        {items.map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 14 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{item.desc}</Text>
              <Text style={{ color: C.textSec, fontSize: 10 }}>{item.cat}</Text>
            </View>
            <Text style={{ color: item.color, fontSize: 12, fontWeight: '700' }}>R$ {item.val}</Text>
          </View>
        ))}
      </View>
    </MCard>
  );
}

// ── Mockup: Metas ─────────────────────────────────────────────────────────────

function MetasMockup({ C }: { C: typeof DARK }) {
  const metas = [
    { nome: 'Reserva de emergência', atual: 4200, total: 10000, color: C.green },
    { nome: 'Viagem Europa',         atual: 1800, total: 8000,  color: '#60a5fa' },
    { nome: 'Notebook novo',         atual: 2600, total: 3500,  color: '#a78bfa' },
  ];
  return (
    <MCard C={C}>
      <MHeader title="🎯 Metas" C={C} />
      <View style={{ gap: 14 }}>
        {metas.map(m => {
          const pct = Math.round((m.atual / m.total) * 100);
          return (
            <View key={m.nome}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: C.text, fontSize: 12, fontWeight: '600', flex: 1 }}>{m.nome}</Text>
                <Text style={{ color: m.color, fontSize: 12, fontWeight: '700' }}>{pct}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: m.color, borderRadius: 3 }} />
              </View>
              <Text style={{ color: C.textSec, fontSize: 11, marginTop: 4 }}>
                R$ {m.atual.toLocaleString('pt-BR')} / R$ {m.total.toLocaleString('pt-BR')}
              </Text>
            </View>
          );
        })}
      </View>
    </MCard>
  );
}

// ── Mockup: Orçamento ─────────────────────────────────────────────────────────

function OrcamentoMockup({ C }: { C: typeof DARK }) {
  return (
    <MCard C={C}>
      <MHeader title="📋 Orçamento mensal" C={C} />
      <View style={{ gap: 12 }}>
        {[
          { cat: 'Alimentação', limit: 1200, gasto: 980,  color: C.green },
          { cat: 'Transporte',  limit: 400,  gasto: 420,  color: C.red   },
          { cat: 'Lazer',       limit: 500,  gasto: 230,  color: '#60a5fa'},
          { cat: 'Saúde',       limit: 300,  gasto: 180,  color: '#fb923c'},
        ].map(({ cat, limit, gasto, color }) => {
          const pct = Math.min(Math.round((gasto / limit) * 100), 100);
          const over = gasto > limit;
          return (
            <View key={cat}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: C.text, fontSize: 12 }}>{cat}</Text>
                <Text style={{ color: over ? C.red : C.textSec, fontSize: 11 }}>R$ {gasto} / {limit}</Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: over ? C.red : color, borderRadius: 3 }} />
              </View>
            </View>
          );
        })}
      </View>
    </MCard>
  );
}

// ── Diff card ─────────────────────────────────────────────────────────────────

function DiffCard({ icon, title, desc, items, highlight, C }: {
  icon: React.ReactNode; title: string; desc: string;
  items: string[]; highlight?: boolean; C: typeof DARK;
}) {
  return (
    <View style={{
      flex: isWeb ? 1 : undefined,
      width: isWeb ? undefined : Math.min(W - 48, 380),
      backgroundColor: C.card, borderRadius: 16, padding: 24,
      borderWidth: highlight ? 2 : 1, borderColor: highlight ? C.green : C.border,
    }}>
      {highlight && (
        <View style={{
          backgroundColor: C.green, borderRadius: 999,
          paddingHorizontal: 10, paddingVertical: 4,
          alignSelf: 'flex-start', marginBottom: 14,
        }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✦ Destaque</Text>
        </View>
      )}
      <View style={{ marginBottom: 16 }}>{icon}</View>
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: C.textSec, fontSize: 14, lineHeight: 22 }}>{desc}</Text>
      <View style={{ gap: 8, marginTop: 16 }}>
        {items.map(item => (
          <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Text style={{ color: C.green, fontWeight: '700', fontSize: 14, marginTop: 1 }}>✓</Text>
            <Text style={{ color: C.textSec, fontSize: 13, flex: 1, lineHeight: 20 }}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────────

function Step({ num, title, desc, C }: { num: string; title: string; desc: string; C: typeof DARK }) {
  return (
    <View style={{ flex: isWeb ? 1 : undefined, width: isWeb ? undefined : Math.min(W - 48, 340),
      alignItems: 'center', paddingHorizontal: isWeb ? 24 : 0 }}>
      <View style={{
        width: 56, height: 56, borderRadius: 28, backgroundColor: C.green,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>{num}</Text>
      </View>
      <Text style={{ color: C.text, fontWeight: '800', fontSize: 17, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
      <Text style={{ color: C.textSec, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>{desc}</Text>
    </View>
  );
}

// ── Formulário de cadastro ────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onLogin, C }: {
  onSuccess: () => void; onLogin: () => void; C: typeof DARK;
}) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit() {
    setError('');
    if (!name.trim())         { setError('Informe seu nome.'); return; }
    if (!email.trim())        { setError('Informe seu e-mail.'); return; }
    if (!password)            { setError('Informe uma senha.'); return; }
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await authService.selfRegister(name.trim(), email.trim(), password);
      onSuccess();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.response?.data;
      setError(typeof msg === 'string' ? msg : 'Erro ao criar conta. Tente novamente.');
    } finally { setLoading(false); }
  }

  const inputStyle = {
    backgroundColor: C.inputBg, borderRadius: 10, padding: 14,
    marginBottom: 12, fontSize: 14, borderWidth: 1, borderColor: C.border, color: C.text,
  };

  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 20,
      padding: isWeb ? 36 : 24, borderWidth: 1, borderColor: C.border,
      width: isWeb ? 420 : '100%', marginTop: 8,
    }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 }}>
        Criar conta grátis
      </Text>
      <Text style={{ color: C.textSec, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
        30 dias grátis · Sem cartão de crédito
      </Text>
      <TextInput style={inputStyle} placeholder="Seu nome" placeholderTextColor={C.textTer}
        value={name} onChangeText={setName} autoCapitalize="words" />
      <TextInput style={inputStyle} placeholder="E-mail" placeholderTextColor={C.textTer}
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={inputStyle} placeholder="Senha (mín. 6 caracteres)" placeholderTextColor={C.textTer}
        value={password} onChangeText={setPassword} secureTextEntry />
      <TextInput style={inputStyle} placeholder="Confirmar senha" placeholderTextColor={C.textTer}
        value={confirm} onChangeText={setConfirm} secureTextEntry onSubmitEditing={handleSubmit} />
      {error !== '' && (
        <View style={{ backgroundColor: C.redDim, borderRadius: 8, padding: 10, marginBottom: 12,
          borderWidth: 1, borderColor: C.red + '40' }}>
          <Text style={{ color: C.red, fontSize: 13, textAlign: 'center' }}>{error}</Text>
        </View>
      )}
      <TouchableOpacity
        style={{ backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 16, alignItems: 'center' }}
        onPress={handleSubmit} disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Criar minha conta →</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onLogin} style={{ marginTop: 14, alignItems: 'center' }}>
        <Text style={{ color: C.textSec, fontSize: 13 }}>
          Já tenho conta — <Text style={{ color: C.green }}>Entrar</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LandingScreen({ navigation }: any) {
  const scrollRef  = useRef<ScrollView>(null);
  const [showForm, setShowForm] = useState(false);
  const [isDark,   setIsDark]   = useState(false);   // claro por padrão

  const C = isDark ? DARK : LIGHT;
  const Badge = mkBadge(C);

  React.useEffect(() => {
    authService.getToken().then(token => {
      if (token) navigation.replace('Main');
    });
  }, []);

  const goLogin = () => navigation.navigate('Login');

  function openForm() {
    setShowForm(true);
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), 80);
  }

  // ── helpers de estilo dinâmico ──
  const btnPrimary   = { backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 16, alignItems: 'center' as const };
  const btnSecondary = { backgroundColor: 'transparent' as const, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 28, paddingVertical: 16, alignItems: 'center' as const };
  const btnOutline   = { borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 14, alignItems: 'center' as const };
  const sectionTitle = { fontSize: isWeb ? 38 : 26, fontWeight: '900' as const, color: C.text, textAlign: 'center' as const, marginBottom: 12 };
  const sectionSub   = { fontSize: 16, color: C.textSec, textAlign: 'center' as const, lineHeight: 24 as const, maxWidth: 500 };
  const checkText    = { color: C.textSec, fontSize: 13, flex: 1, lineHeight: 20 as const };

  function STitle({ label, title, sub }: { label: string; title: string; sub?: string }) {
    return (
      <View style={{ alignItems: 'center', marginBottom: 48 }}>
        <Badge>{label}</Badge>
        <Text style={sectionTitle}>{title}</Text>
        {sub && <Text style={sectionSub}>{sub}</Text>}
      </View>
    );
  }

  function PriceCard({ badge, name, price, period, sub, items, cta, highlighted }: any) {
    return (
      <View style={{
        flex: isWeb ? 1 : undefined,
        width: isWeb ? undefined : Math.min(W - 48, 340),
        backgroundColor: highlighted ? C.bg : C.card,
        borderRadius: 16, padding: 28,
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? C.green : C.border,
      }}>
        {badge && (
          <View style={{ backgroundColor: C.green, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
            alignSelf: 'flex-start', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
          </View>
        )}
        <Text style={{ color: C.textSec, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: sub ? 4 : 24 }}>
          <Text style={{ fontSize: 40, fontWeight: '900', color: highlighted ? C.text : C.green }}>{price}</Text>
          <Text style={{ fontSize: 14, color: C.textSec, marginBottom: 6 }}>{period}</Text>
        </View>
        {sub && <Text style={{ color: C.textSec, fontSize: 12, marginBottom: 20 }}>{sub}</Text>}
        <View style={{ gap: 10, marginBottom: 28 }}>
          {items.map((i: string) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: C.green, fontWeight: '700', fontSize: 14, marginTop: 1 }}>✓</Text>
              <Text style={checkText}>{i}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={openForm}
          style={highlighted ? btnPrimary : btnOutline}>
          <Text style={{ color: highlighted ? '#fff' : C.text, fontWeight: highlighted ? '700' : '600', fontSize: highlighted ? 15 : 14 }}>{cta}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── NAV ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 24, paddingVertical: 12,
        backgroundColor: C.navBg, borderBottomWidth: 1, borderBottomColor: C.border, zIndex: 100,
      }}>
        {/* Logo com mascote */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <DogMascot size={56} color={C.green} mood="happy" />
          <Text style={{ color: C.text, fontWeight: '800', fontSize: 16 }}>Meu Financeiro</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Toggle dark/light */}
          <TouchableOpacity
            onPress={() => setIsDark(d => !d)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goLogin} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: C.textSec, fontWeight: '500', fontSize: 14 }}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openForm} style={{
            backgroundColor: C.green, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9,
          }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Começar grátis</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CONTEÚDO ── */}
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} style={{ backgroundColor: C.bg }}>

        {/* HERO */}
        <Section style={{ backgroundColor: C.bg }}>
          <View style={{ alignItems: 'center' }}>
            {/* Dog mascot no hero */}
            <DogMascot size={isWeb ? 120 : 90} color={C.green} mood="happy" showFloating={isWeb} />
            <View style={{ height: 16 }} />
            <Badge>✦ 30 dias grátis · sem cartão</Badge>
            <Text style={{ fontSize: isWeb ? 52 : 32, fontWeight: '900', color: C.text,
              textAlign: 'center', lineHeight: isWeb ? 64 : 42, marginBottom: 20 }}>
              Controle financeiro{'\n'}
              <Text style={{ color: C.green }}>do jeito que você vive</Text>
            </Text>
            <Text style={{ fontSize: isWeb ? 18 : 15, color: C.textSec,
              textAlign: 'center', lineHeight: isWeb ? 28 : 24, maxWidth: 560, marginBottom: 36 }}>
              Registre gastos pelo{' '}
              <Text style={{ color: '#25D366', fontWeight: '700' }}>WhatsApp</Text>
              {', '}categorize com{' '}
              <Text style={{ color: C.text, fontWeight: '700' }}>Inteligência Artificial</Text>
              {' '}e gerencie as finanças em{' '}
              <Text style={{ color: C.text, fontWeight: '700' }}>família</Text>
              {' — '}tudo em um só app.
            </Text>

            {showForm ? (
              <RegisterForm onSuccess={() => navigation.replace('Main')} onLogin={goLogin} C={C} />
            ) : (
              <>
                <View style={{ flexDirection: isWeb ? 'row' : 'column', gap: 12, marginBottom: 16 }}>
                  <TouchableOpacity onPress={openForm} style={btnPrimary}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Começar grátis por 30 dias →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={goLogin} style={btnSecondary}>
                    <Text style={{ color: C.textSec, fontWeight: '600', fontSize: 15 }}>Já tenho conta</Text>
                  </TouchableOpacity>
                </View>
                <Text style={{ color: C.textTer, fontSize: 13, marginBottom: 20 }}>
                  Sem cartão de crédito · Cancele quando quiser
                </Text>
                <View style={{
                  flexDirection: 'row', gap: isWeb ? 24 : 12, flexWrap: 'wrap',
                  justifyContent: 'center', paddingTop: 20,
                  borderTopWidth: 1, borderTopColor: C.border, width: '100%', maxWidth: 480,
                }}>
                  {[
                    { icon: '🔒', text: 'Dados criptografados' },
                    { icon: '🛡️', text: 'Privacidade garantida' },
                    { icon: '🇧🇷', text: 'Servidores no Brasil' },
                  ].map(({ icon, text }) => (
                    <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14 }}>{icon}</Text>
                      <Text style={{ color: C.textTer, fontSize: 12, fontWeight: '500' }}>{text}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Mockups hero */}
          <View style={{ flexDirection: isWeb ? 'row' : 'column', gap: 16, marginTop: 48,
            justifyContent: 'center', alignItems: isWeb ? 'flex-start' : 'center' }}>
            <WhatsMockup C={C} />
            <DashboardMockup C={C} />
            <GraficosMockup C={C} />
          </View>
        </Section>

        {/* PRINTS DAS TELAS */}
        <Section style={{ backgroundColor: C.surface }}>
          <STitle label="App completo" title="Tudo que você precisa"
            sub="Dashboard, lançamentos, metas e muito mais — tudo integrado." />
          <View style={{ flexDirection: isWeb ? 'row' : 'column', flexWrap: isWeb ? 'wrap' : 'nowrap',
            gap: 16, justifyContent: 'center', alignItems: isWeb ? 'flex-start' : 'center' }}>
            <LancamentosMockup C={C} />
            <MetasMockup C={C} />
            <OrcamentoMockup C={C} />
          </View>
        </Section>

        {/* DIFERENCIAIS */}
        <Section style={{ backgroundColor: C.bg }}>
          <STitle label="Por que o Meu Financeiro" title="Feito para a sua realidade"
            sub="Sem planilhas complicadas. Sem apps que você abandona em uma semana." />
          <View style={{ flexDirection: isWeb ? 'row' : 'column', gap: 16, alignItems: isWeb ? 'stretch' : 'center' }}>
            <DiffCard C={C} icon={<WhatsAppIcon size={32} />}
              title="Registre pelo WhatsApp"
              desc="Sem abrir o app. Mande uma mensagem e o lançamento entra automático com categoria e data."
              items={['Texto, áudio ou foto de cupom', 'Confirmação instantânea', 'Funciona 24h por dia']} />
            <DiffCard C={C} icon={<Text style={{ fontSize: 32 }}>🤖</Text>}
              title="Categorização com IA"
              desc="Inteligência artificial que entende o contexto e categoriza nas suas próprias categorias."
              items={['Aprende suas categorias', 'Lê fotos de cupom fiscal', 'Reconhece estabelecimentos']}
              highlight />
            <DiffCard C={C} icon={<Text style={{ fontSize: 32 }}>👨‍👩‍👧</Text>}
              title="Finanças em família"
              desc="Convide cônjuge e filhos. Cada membro registra e você vê tudo consolidado."
              items={['Múltiplos membros', 'Visão consolidada', 'Metas compartilhadas']} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 32, justifyContent: 'center' }}>
            {[
              { icon: '📊', label: 'Dashboard' }, { icon: '🎯', label: 'Metas' },
              { icon: '💳', label: 'Cartão de crédito' }, { icon: '❤️', label: 'Saúde financeira' },
              { icon: '📋', label: 'Orçamento' }, { icon: '📈', label: 'Visão anual' },
              { icon: '🔒', label: 'Dados criptografados' },
            ].map(({ icon, label }) => (
              <View key={label} style={{
                backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
                paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', gap: 6,
              }}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={{ color: C.textSec, fontSize: 12, fontWeight: '600' }}>{label}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* COMO FUNCIONA */}
        <Section style={{ backgroundColor: C.surface }}>
          <STitle label="Como funciona" title="Simples assim" />
          <View style={{ flexDirection: isWeb ? 'row' : 'column', alignItems: isWeb ? 'flex-start' : 'center', gap: isWeb ? 0 : 24 }}>
            <Step num="1" title="Crie sua conta" C={C}
              desc="Cadastro em menos de 1 minuto. Sem cartão de crédito para iniciar o período gratuito." />
            {isWeb && <View style={{ width: 1, height: 80, backgroundColor: C.border, alignSelf: 'center' }} />}
            <Step num="2" title="Vincule seu WhatsApp" C={C}
              desc="Adicione o número do bot e comece a registrar gastos por mensagem, foto ou áudio." />
            {isWeb && <View style={{ width: 1, height: 80, backgroundColor: C.border, alignSelf: 'center' }} />}
            <Step num="3" title="Acompanhe tudo" C={C}
              desc="Dashboard atualizado em tempo real com saldo, categorias, metas e saúde financeira." />
          </View>
        </Section>

        {/* PREÇOS */}
        <Section style={{ backgroundColor: C.bg }}>
          <STitle label="Preços" title="Simples e transparente"
            sub="30 dias grátis para experimentar tudo. Sem cartão de crédito." />
          <View style={{ flexDirection: isWeb ? 'row' : 'column', gap: 16,
            justifyContent: 'center', alignItems: isWeb ? 'stretch' : 'center', width: '100%' }}>
            <PriceCard name="Teste grátis" price="R$ 0" period=" / 30 dias" cta="Começar agora"
              items={['Acesso completo por 30 dias', 'WhatsApp e IA inclusos', 'Sem cartão de crédito', 'Cancele quando quiser']} />
            <PriceCard name="Mensal" price="R$ 4,90" period=" / mês" cta="Começar grátis"
              items={['Após os 30 dias grátis', 'Lançamentos ilimitados', 'Família com até 3 membros', 'Dashboard e metas']} />
            <PriceCard name="Anual" price="R$ 39,90" period=" / ano"
              sub="Equivalente a R$ 3,32/mês" cta="Começar grátis →"
              badge="💰 Economize 32%" highlighted
              items={['Tudo do plano mensal', 'Até 5 membros na família', 'Importação de faturas PDF', 'Suporte prioritário']} />
          </View>
        </Section>

        {/* CTA FINAL */}
        <Section style={{ backgroundColor: C.surface }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: isWeb ? 40 : 28, fontWeight: '900', color: C.text,
              textAlign: 'center', lineHeight: isWeb ? 52 : 38, marginBottom: 16 }}>
              Pronto para ter controle{'\n'}das suas finanças?
            </Text>
            <Text style={{ fontSize: isWeb ? 18 : 15, color: C.textSec,
              textAlign: 'center', lineHeight: isWeb ? 28 : 24, maxWidth: 560, marginBottom: 36 }}>
              Comece hoje, de graça. Sem burocracia, sem cartão de crédito.
            </Text>
            <TouchableOpacity onPress={openForm} style={btnPrimary}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Criar minha conta grátis →</Text>
            </TouchableOpacity>
            <Text style={{ color: C.textTer, fontSize: 13, marginTop: 12 }}>30 dias grátis · Cancele quando quiser</Text>
          </View>
        </Section>

        {/* FOOTER */}
        <View style={{ backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border,
          paddingVertical: 24, paddingHorizontal: 24 }}>
          <View style={{ flexDirection: isWeb ? 'row' : 'column', alignItems: 'center',
            justifyContent: 'space-between', gap: 12, maxWidth: 1100, alignSelf: 'center', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <DogMascot size={56} color={C.green} mood="happy" />
              <Text style={{ color: C.textSec, fontWeight: '600', fontSize: 14 }}>Meu Financeiro</Text>
            </View>
            <Text style={{ color: C.textTer, fontSize: 13 }}>© 2025 Meu Financeiro</Text>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Text style={{ color: C.textSec, fontSize: 13 }}>Privacidade</Text>
              <Text style={{ color: C.textSec, fontSize: 13 }}>Termos</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
