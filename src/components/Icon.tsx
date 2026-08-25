import React from 'react';
import Svg, { G, Path, Circle, Line, Rect, Polyline } from 'react-native-svg';

/**
 * Ícones de linha do FinDog — SVG recolorível (herdam a cor via prop `color`),
 * substituindo o uso de emoji na navegação. Traço uniforme, grade 24×24.
 */
export type IconName =
  | 'dashboard' | 'wallet' | 'trending-up' | 'card' | 'bank' | 'clipboard'
  | 'calendar' | 'calendar-range' | 'users' | 'user' | 'target' | 'repeat'
  | 'tag' | 'transfer' | 'download' | 'search' | 'cart' | 'ticket'
  | 'receipt' | 'bell' | 'chat' | 'plus';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function Icon({ name, size = 22, color = '#111827', strokeWidth = 2 }: Props) {
  const dot = { fill: color, stroke: 'none' };

  const shapes: Record<IconName, React.ReactNode> = {
    dashboard: (<>
      <Rect x={3} y={3} width={7} height={7} rx={1.5} />
      <Rect x={14} y={3} width={7} height={7} rx={1.5} />
      <Rect x={14} y={14} width={7} height={7} rx={1.5} />
      <Rect x={3} y={14} width={7} height={7} rx={1.5} />
    </>),
    wallet: (<>
      <Path d="M3 7V6a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2" />
      <Path d="M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Circle cx={16.5} cy={13} r={1.2} {...dot} />
    </>),
    'trending-up': (<>
      <Polyline points="3 17 9 11 13 15 21 7" />
      <Polyline points="15 7 21 7 21 13" />
    </>),
    card: (<>
      <Rect x={2} y={5} width={20} height={14} rx={2.5} />
      <Line x1={2} y1={10} x2={22} y2={10} />
      <Line x1={6} y1={15} x2={10} y2={15} />
    </>),
    bank: (<>
      <Path d="M3 10l9-6 9 6" />
      <Line x1={5} y1={10} x2={5} y2={18} />
      <Line x1={10} y1={10} x2={10} y2={18} />
      <Line x1={14} y1={10} x2={14} y2={18} />
      <Line x1={19} y1={10} x2={19} y2={18} />
      <Line x1={3} y1={20.5} x2={21} y2={20.5} />
    </>),
    clipboard: (<>
      <Path d="M9 4H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
      <Rect x={9} y={3} width={6} height={4} rx={1} />
      <Line x1={8} y1={12} x2={16} y2={12} />
      <Line x1={8} y1={16} x2={13} y2={16} />
    </>),
    calendar: (<>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Line x1={3} y1={9.5} x2={21} y2={9.5} />
      <Line x1={8} y1={3} x2={8} y2={6} />
      <Line x1={16} y1={3} x2={16} y2={6} />
    </>),
    'calendar-range': (<>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Line x1={3} y1={9.5} x2={21} y2={9.5} />
      <Line x1={8} y1={3} x2={8} y2={6} />
      <Line x1={16} y1={3} x2={16} y2={6} />
      <Circle cx={8} cy={14} r={1} {...dot} />
      <Circle cx={12} cy={14} r={1} {...dot} />
      <Circle cx={16} cy={14} r={1} {...dot} />
      <Circle cx={8} cy={17.5} r={1} {...dot} />
      <Circle cx={12} cy={17.5} r={1} {...dot} />
    </>),
    users: (<>
      <Circle cx={9} cy={8} r={3.2} />
      <Path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <Path d="M16 5.3a3.2 3.2 0 0 1 0 5.4" />
      <Path d="M18.5 20a5.5 5.5 0 0 0-3-4.9" />
    </>),
    user: (<>
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>),
    target: (<>
      <Circle cx={12} cy={12} r={8.5} />
      <Circle cx={12} cy={12} r={4.5} />
      <Circle cx={12} cy={12} r={1.3} {...dot} />
    </>),
    repeat: (<>
      <Polyline points="17 2 21 6 17 10" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Polyline points="7 22 3 18 7 14" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>),
    tag: (<>
      <Path d="M11 3H5a2 2 0 0 0-2 2v6l9 9a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8z" />
      <Circle cx={7.5} cy={7.5} r={1.3} {...dot} />
    </>),
    transfer: (<>
      <Polyline points="7 5 3 9 7 13" />
      <Line x1={3} y1={9} x2={17} y2={9} />
      <Polyline points="17 11 21 15 17 19" />
      <Line x1={21} y1={15} x2={7} y2={15} />
    </>),
    download: (<>
      <Path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <Polyline points="8 11 12 15 16 11" />
      <Line x1={12} y1={3} x2={12} y2={15} />
    </>),
    search: (<>
      <Circle cx={11} cy={11} r={7} />
      <Line x1={16.5} y1={16.5} x2={21} y2={21} />
    </>),
    cart: (<>
      <Circle cx={9} cy={20} r={1.5} {...dot} />
      <Circle cx={18} cy={20} r={1.5} {...dot} />
      <Path d="M2.5 3H5l2.2 12.1a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L21.5 7H6" />
    </>),
    ticket: (<>
      <Path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2.5a2 2 0 0 0 0 5V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.5a2 2 0 0 0 0-5z" />
      <Line x1={13} y1={7} x2={13} y2={17} strokeDasharray="1 3" />
    </>),
    receipt: (<>
      <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <Line x1={9} y1={8} x2={15} y2={8} />
      <Line x1={9} y1={12} x2={15} y2={12} />
    </>),
    bell: (<>
      <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.5 21a2 2 0 0 1-3 0" />
    </>),
    chat: (<>
      <Path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12z" />
    </>),
    plus: (<>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </>),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {shapes[name]}
      </G>
    </Svg>
  );
}
