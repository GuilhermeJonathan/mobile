import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppHeaderTitle } from '../navigation/AppNavigator';
import DogMascot from './DogMascot';
import WhatsAppIcon from './WhatsAppIcon';
import Icon, { IconName } from './Icon';

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_WIDTH        = 160;
const MAX_WIDTH        = 400;
const DEFAULT_WIDTH    = 220;
const COLLAPSED_WIDTH  = 64;

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  routeName: string;
  label: string;
  icon: IconName;
  isRootStack?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { routeName: 'Dashboard',   label: 'Dashboard',   icon: 'dashboard' },
  { routeName: 'Lançamentos', label: 'Lançamentos', icon: 'wallet' },
  { routeName: 'Receitas',    label: 'Receitas',    icon: 'trending-up' },
  { routeName: 'Cartões',     label: 'Cartões',     icon: 'card' },
  { routeName: 'Contas',      label: 'Contas',      icon: 'bank' },
  { routeName: 'Orçamento',   label: 'Orçamento',   icon: 'clipboard' },
];

const EXTRA_ITEMS: NavItem[] = [
  { routeName: 'Dividas',          label: 'Dívidas',        icon: 'calendar', isRootStack: true },
  { routeName: 'Anual',            label: 'Visão Anual',    icon: 'calendar-range', isRootStack: true },
  { routeName: 'Familia',          label: 'Família',        icon: 'users', isRootStack: true },
  { routeName: 'Metas',            label: 'Metas',          icon: 'target', isRootStack: true },
  { routeName: 'Assinaturas',      label: 'Assinaturas',    icon: 'repeat' },
  { routeName: 'Categorias',       label: 'Categorias',     icon: 'tag' },
  { routeName: 'Transferencia',    label: 'Transferência',  icon: 'transfer' },
  { routeName: 'ImportarExtrato',  label: 'Importar OFX',  icon: 'download' },
  { routeName: 'BuscaLancamentos', label: 'Buscar',         icon: 'search', isRootStack: true },
  { routeName: 'WhatsApp',         label: 'WhatsApp',       icon: 'chat', isRootStack: true },
];

// ─── Props ───────────────────────────────────────────────────────────────────

const ADMIN_ITEMS: NavItem[] = [
  { routeName: 'Vendas',               label: 'Vendas',      icon: 'cart' },
  { routeName: 'AdminUsers',           label: 'Usuários',    icon: 'user' },
  { routeName: 'Invites',              label: 'Convites',    icon: 'ticket' },
  { routeName: 'PaymentTransactions',  label: 'Transações',  icon: 'receipt' },
];

export interface DesktopShellProps {
  activeRoute: string;
  onNavigate: (routeName: string, isRootStack?: boolean) => void;
  onOpenDrawer: () => void;
  avatarUrl: string | null;
  badge: number;
  isAdmin?: boolean;
}

// ─── Nav row ─────────────────────────────────────────────────────────────────

function NavRow({
  item, active, collapsed, badge: itemBadge, onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badge: number;
  onNavigate: () => void;
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return (
    <TouchableOpacity
      style={[s.navItem, active && s.navItemActive, collapsed && s.navItemCollapsed]}
      onPress={onNavigate}
      activeOpacity={0.7}
    >
      {item.routeName === 'WhatsApp'
        ? <View style={{ width: 22, alignItems: 'center' }}><WhatsAppIcon size={18} /></View>
        : <View style={{ width: 22, alignItems: 'center' }}><Icon name={item.icon} size={18} color={active ? colors.green : colors.textSecondary} /></View>
      }
      {!collapsed && (
        <Text style={[s.navLabel, active && s.navLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      )}
      {itemBadge > 0 && !collapsed && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{itemBadge > 99 ? '99+' : itemBadge}</Text>
        </View>
      )}
      {/* Collapsed: red dot indicator */}
      {itemBadge > 0 && collapsed && <View style={s.dot} />}
    </TouchableOpacity>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  label, open, collapsed, onToggle,
}: {
  label: string;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  if (collapsed) return <View style={{ height: 8 }} />;
  return (
    <TouchableOpacity style={s.sectionHeader} onPress={onToggle} activeOpacity={0.6}>
      <Text style={s.sectionLabel}>{label}</Text>
      <Text style={s.sectionChevron}>{open ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DesktopShell({
  activeRoute,
  onNavigate,
  onOpenDrawer,
  avatarUrl,
  badge,
  isAdmin = false,
}: DesktopShellProps) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  const [collapsed,    setCollapsed]    = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [menuOpen,     setMenuOpen]     = useState(true);
  const [maisOpen,     setMaisOpen]     = useState(true);
  const [adminOpen,    setAdminOpen]    = useState(true);

  // ── Drag-to-resize (web only) ────────────────────────────────────────────
  const drag = useRef({ active: false, startX: 0, startW: DEFAULT_WIDTH });

  const handleDragStart = useCallback((e: any) => {
    drag.current = { active: true, startX: e.clientX, startW: sidebarWidth };

    const onMove = (ev: MouseEvent) => {
      if (!drag.current.active) return;
      const next = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, drag.current.startW + ev.clientX - drag.current.startX),
      );
      setSidebarWidth(next);
      // Auto-expand if dragged wide enough
      if (collapsed && next > MIN_WIDTH + 20) setCollapsed(false);
    };

    const onUp = () => {
      drag.current.active = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth, collapsed]);

  const actualWidth = collapsed ? COLLAPSED_WIDTH : sidebarWidth;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.sidebar, { width: actualWidth }]}>

      {/* ── Logo + collapse button ── */}
      {collapsed ? (
        // Colapsado: dog menor centralizado + botão de expandir
        <View style={s.logoAreaCollapsed}>
          <DogMascot size={48} color={colors.green} mood="happy" />
          <TouchableOpacity
            style={s.collapseBtn}
            onPress={() => setCollapsed(false)}
            activeOpacity={0.7}
          >
            <Text style={s.collapseBtnText}>›</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Expandido: AppHeaderTitle completo (mesmo componente do header mobile)
        <View style={s.logoArea}>
          <View style={s.logoClip}>
            <AppHeaderTitle />
          </View>
          <TouchableOpacity
            style={s.collapseBtn}
            onPress={() => setCollapsed(true)}
            activeOpacity={0.7}
          >
            <Text style={s.collapseBtnText}>‹</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Nav items ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
            {/* MENU section */}
            <View style={[s.section, collapsed && s.sectionCollapsed]}>
              <SectionHeader
                label="MENU"
                open={menuOpen}
                collapsed={collapsed}
                onToggle={() => setMenuOpen(o => !o)}
              />
              {(menuOpen || collapsed) && MAIN_ITEMS.map(item => (
                <NavRow
                  key={item.routeName}
                  item={item}
                  active={activeRoute === item.routeName}
                  collapsed={collapsed}
                  badge={item.routeName === 'Lançamentos' ? badge : 0}
                  onNavigate={() => onNavigate(item.routeName, item.isRootStack)}
                />
              ))}
            </View>

            <View style={s.divider} />

            {/* MAIS section */}
            <View style={[s.section, collapsed && s.sectionCollapsed]}>
              <SectionHeader
                label="MAIS"
                open={maisOpen}
                collapsed={collapsed}
                onToggle={() => setMaisOpen(o => !o)}
              />
              {(maisOpen || collapsed) && EXTRA_ITEMS.map(item => (
                <NavRow
                  key={item.routeName}
                  item={item}
                  active={activeRoute === item.routeName}
                  collapsed={collapsed}
                  badge={0}
                  onNavigate={() => onNavigate(item.routeName, item.isRootStack)}
                />
              ))}
            </View>
        {isAdmin && (
          <>
            <View style={s.divider} />
            <View style={[s.section, collapsed && s.sectionCollapsed]}>
              <SectionHeader
                label="ADMIN"
                open={adminOpen}
                collapsed={collapsed}
                onToggle={() => setAdminOpen(o => !o)}
              />
              {(adminOpen || collapsed) && (
                <>
                  {isAdmin && ADMIN_ITEMS.map(item => (
                    <NavRow
                      key={item.routeName}
                      item={item}
                      active={activeRoute === item.routeName}
                      collapsed={collapsed}
                      badge={0}
                      onNavigate={() => onNavigate(item.routeName, item.isRootStack)}
                    />
                  ))}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── User area (bottom) ── */}
      <View style={s.userAreaWrapper}>
        <TouchableOpacity
          style={[s.userArea, collapsed && s.userAreaCollapsed]}
          onPress={onOpenDrawer}
          activeOpacity={0.7}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={{ fontSize: 15 }}>👤</Text>
            </View>
          )}
          {!collapsed && (
            <View style={{ flex: 1 }}>
              <Text style={s.userAreaLabel} numberOfLines={1}>Minha Conta</Text>
              <Text style={s.userAreaSub}>{'Perfil & Configurações'}</Text>
            </View>
          )}
          {badge > 0 && !collapsed && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
          {badge > 0 && collapsed && <View style={s.dot} />}
        </TouchableOpacity>
      </View>

      {/* ── Drag handle (web only) ── */}
      <View
        // @ts-ignore — web-only props
        onMouseDown={handleDragStart}
        style={s.dragHandle}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  sidebar: {
    backgroundColor: c.surface,
    borderRightWidth: 1,
    borderRightColor: c.border,
    flexDirection: 'column',
    position: 'relative',
  } as any,

  // ── Logo area ──
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    gap: 4,
  },
  logoAreaCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  logoClip: {
    flex: 1,
    overflow: 'hidden',
  } as any,
  collapseBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: c.surfaceElevated,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  collapseBtnText: {
    color: c.textSecondary,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  sectionCollapsed: {
    paddingHorizontal: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  sectionLabel: {
    color: c.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionChevron: {
    color: c.textTertiary,
    fontSize: 8,
  },

  // ── Nav items ──
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 4,
  },
  navItemActive: {
    backgroundColor: c.green + '1A',
  },
  navLabel: {
    color: c.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: c.green,
    fontWeight: '700',
  },

  // ── Badges ──
  badge: {
    backgroundColor: c.red,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.red,
  } as any,

  divider: {
    height: 1,
    backgroundColor: c.border,
    marginHorizontal: 12,
    marginVertical: 4,
  },

  // ── User area ──
  userAreaWrapper: {
    borderTopWidth: 1,
    borderTopColor: c.border,
    padding: 8,
  },
  userArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: c.surfaceElevated,
  },
  userAreaCollapsed: {
    justifyContent: 'center',
    gap: 0,
    padding: 6,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: c.green,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAreaLabel: {
    color: c.text,
    fontSize: 12,
    fontWeight: '600',
  },
  userAreaSub: {
    color: c.textTertiary,
    fontSize: 10,
  },

  // ── Drag handle ──
  dragHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    cursor: 'ew-resize',
    zIndex: 10,
  } as any,
});
