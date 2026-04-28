import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  dark?: boolean;
  /** Quando true no Android, abre spinner sheet em vez do diálogo nativo (necessário quando dentro de um Modal) */
  insideModal?: boolean;
}

function formatBR(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function applyMask(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDate(ddmmyyyy: string): Date | null {
  const parts = ddmmyyyy.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return null;
  return date;
}

export default function DatePickerField({ value, onChange, label, dark = false, insideModal = false }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [textValue, setTextValue] = useState(formatBR(value));

  useEffect(() => {
    setTextValue(formatBR(value));
  }, [value]);

  function handleTextChange(raw: string) {
    const masked = applyMask(raw);
    setTextValue(masked);
    if (masked.length === 10) {
      const parsed = parseDate(masked);
      if (parsed) onChange(parsed);
    }
  }

  const inputStyle = [styles.input, dark && styles.inputDark];
  const labelStyle = [styles.label, dark && styles.labelDark];
  const textStyle  = [styles.inputText, dark && styles.inputTextDark];

  // ── Web: text input com máscara DD/MM/AAAA + botão 📅 que abre o calendário ──
  if (Platform.OS === 'web') {
    const dateRef = useRef<any>(null);

    const htmlValue = [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');

    function openPicker() {
      try { dateRef.current?.showPicker(); } catch { dateRef.current?.click(); }
    }

    const bg     = dark ? 'rgba(255,255,255,0.07)' : '#fff';
    const border = dark ? 'rgba(255,255,255,0.18)'  : '#ddd';
    const color  = dark ? '#fff'                    : '#1a1a2e';

    return (
      <View>
        {label && <Text style={labelStyle}>{label}</Text>}
        {React.createElement('div', { style: { position: 'relative', display: 'flex' } },
          // Text input com máscara — permite editar qualquer dígito livremente
          React.createElement('input', {
            type: 'text',
            value: textValue,
            placeholder: 'DD/MM/AAAA',
            maxLength: 10,
            onChange: (e: any) => handleTextChange(e.target.value),
            style: {
              flex: 1, padding: '14px', paddingRight: '48px',
              backgroundColor: bg, color,
              border: `1px solid ${border}`, borderRadius: '8px',
              fontSize: '15px', boxSizing: 'border-box', outline: 'none',
            },
          }),
          // Botão 📅
          React.createElement('button', {
            type: 'button',
            onClick: openPicker,
            style: {
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '44px', background: 'transparent', border: 'none',
              cursor: 'pointer', fontSize: '16px',
            },
          }, '📅'),
          // Input date oculto posicionado ao final do campo → calendário abre abaixo
          React.createElement('input', {
            ref: dateRef,
            type: 'date',
            value: htmlValue,
            onChange: (e: any) => {
              const [y, m, d] = e.target.value.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              if (!isNaN(date.getTime())) onChange(date);
            },
            style: {
              position: 'absolute', bottom: 0, right: 0,
              width: '1px', height: '1px',
              opacity: 0, pointerEvents: 'none',
              border: 'none', padding: 0,
            },
          })
        )}
      </View>
    );
  }

  // ── iOS: modal com picker ────────────────────────────────────────────────
  if (Platform.OS === 'ios') {
    return (
      <View>
        {label && <Text style={labelStyle}>{label}</Text>}
        <TouchableOpacity style={inputStyle} onPress={() => setShowPicker(true)}>
          <Text style={textStyle}>{formatBR(value)}</Text>
          <Text style={styles.icon}>📅</Text>
        </TouchableOpacity>

        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosToolbar}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosDone}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                locale="pt-BR"
                onChange={(_, date) => { if (date) onChange(date); }}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Android dentro de Modal: mesmo sheet do iOS (display="default" fica bloqueado por Modal pai) ──
  if (Platform.OS === 'android' && insideModal) {
    return (
      <View>
        {label && <Text style={labelStyle}>{label}</Text>}
        <TouchableOpacity style={inputStyle} onPress={() => setShowPicker(true)}>
          <Text style={textStyle}>{formatBR(value)}</Text>
          <Text style={styles.icon}>📅</Text>
        </TouchableOpacity>

        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={[styles.iosSheet, { backgroundColor: '#1e1e2e' }]}>
              <View style={styles.iosToolbar}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosDone}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                onChange={(_, date) => { if (date) onChange(date); }}
                textColor="#ffffff"
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ── Android: picker inline nativo (fora de Modal) ────────────────────────
  return (
    <View>
      {label && <Text style={labelStyle}>{label}</Text>}
      <TouchableOpacity style={inputStyle} onPress={() => setShowPicker(true)}>
        <Text style={textStyle}>{formatBR(value)}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) onChange(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 16 },
  labelDark: { color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: '#ddd',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  inputDark: {
    backgroundColor: '#ffffff12', borderColor: '#ffffff20',
  },
  inputText: { fontSize: 15, color: '#1a1a2e' },
  inputTextDark: { color: '#fff' },
  icon: { fontSize: 16 },
  iosOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  iosToolbar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  iosDone: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
});
