import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { darkColors } from '../theme/colors';
import { AppHeaderTitle } from '../navigation/AppNavigator';
import DogMascot from './DogMascot';
import WhatsAppIcon from './WhatsAppIcon';

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_WIDTH        = 160;
const MAX_WIDTH        = 400;
const DEFAULT_WIDTH    = 220;
const COLLAPSED_WIDTH  = 64;

// ─── Nav items ───────────────────────────────────────────────────────────────

interface NavItem {
  routeName: string;
  label: string;
  icon: string;
  isRootStack?: boolean;
}

const MAIN_ITEMS: NavItem[] = [
  { routeName: 'Dashboard',   label: 'Dashboard',   icon: '📊' },
  { routeName: 'Lançamentos', label: 'Lançamentos', icon: '💰' },
  { routeName: 'Receitas',    label: 'Receitas',    icon: '📈' },
  { routeName: 'Cartões',     label: 'Cartões',     icon: '💳' },
  { routeName: 'Contas',      label: 'Contas',      icon: '🏦' },
  { routeName: 'Orçamento',   label: 'Orçamento',   icon: '📋' },
];

const EXTRA_ITEMS: NavItem[] = [
  { routeName: 'Dividas',          label: 'Dívidas',        icon: '📅', isRootStack: true },
  { routeName: 'Anual',            label: 'Visão Anual',    icon: '📆', isRootStack: true },
  { routeName: 'Familia',          label: 'Família',        icon: '👨‍👩‍👧', isRootStack: true },
  { routeName: 'Metas',            label: 'Metas',          icon: '🎯', isRootStack: true },
  { routeName: 'Assinaturas',      label: 'Assinaturas',    icon: '📦' },
  { routeName: 'Categorias',       label: 'Categorias',     icon: '🏷️' },
  { routeName: 'Transferencia',    label: 'Transferência',  icon: '↔️' },
  { routeName: 'ImportarExtrato',  label: 'Importar OFX',  icon: '📥' },
  { routeName: 'BuscaLancamentos', label: 'Buscar',         icon: '🔍', isRootStack: true },
  { routeName: 'WhatsApp',         label: 'WhatsApp',       icon: '💬', isRootStack: true },
];

// ─── Props ───────────────────────────────────────────────────────────────────

const ADMIN_ITEMS: NavItem[] = [
  { routeName: 'AdminUsers',           label: 'Usuários',    icon: '👥' },
  { routeName: 'Invites',              label: 'Convites',    icon: '🎟️' },
  { routeName: 'PaymentTransactions',  label: 'Transações',  icon: '💳' },
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
  return (
    <TouchableOpacity
      style={[s.navItem, active && s.navItemActive, collapsed && s.navItemCollapsed]}
      onPress={onNavigate}
      activeOpacity={0.7}
    >
      {item.routeName === 'WhatsApp'
        ? <View style={{ width: 22, alignItems: 'center' }}><WhatsAppIcon size={18} /></View>
        : <Text style={[s.navIcon, active && s.navIconActive]}>{item.icon}</Text>
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
          <DogMascot size={48} color={darkColors.green} mood="happy" />
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
        {/* ADMIN section — visible only for admins */}
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
              {(adminOpen || collapsed) && ADMIN_ITEMS.map(item => (
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

const s = StyleSheet.create({
  sidebar: {
    backgroundColor: darkColors.surface,
    borderRightWidth: 1,
    borderRightColor: darkColors.border,
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
    borderBottomColor: darkColors.border,
    gap: 4,
  },
  logoAreaCollapsed: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: darkColors.border,
  },
  logoClip: {
    flex: 1,
    overflow: 'hidden',
  } as any,
  collapseBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: darkColors.surfaceElevated,
    borderWidth: 1,
    borderColor: darkColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  collapseBtnText: {
    color: darkColors.textSecondary,
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
    color: darkColors.textTertiary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionChevron: {
    color: darkColors.textTertiary,
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
    backgroundColor: darkColors.green + '1A',
  },
  navIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  navIconActive: {
    // emoji color can't be changed, but layout stays consistent
  },
  navLabel: {
    color: darkColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: darkColors.green,
    fontWeight: '700',
  },

  // ── Badges ──
  badge: {
    backgroundColor: darkColors.red,
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
    backgroundColor: darkColors.red,
  } as any,

  divider: {
    height: 1,
    backgroundColor: darkColors.border,
    marginHorizontal: 12,
    marginVertical: 4,
  },

  // ── User area ──
  userAreaWrapper: {
    borderTopWidth: 1,
    borderTopColor: darkColors.border,
    padding: 8,
  },
  userArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: darkColors.surfaceElevated,
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
    borderColor: darkColors.green,
    flexShrink: 0,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: darkColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userAreaLabel: {
    color: darkColors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  userAreaSub: {
    color: darkColors.textTertiary,
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
