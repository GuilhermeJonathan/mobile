import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  dark?: boolean;
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

export default function DatePickerField({ value, onChange, label, dark = false }: Props) {
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

  // ── Web: campo visual DD/MM/AAAA + picker nativo via ref ────────────────
  if (Platform.OS === 'web') {
    const dateRef = useRef<any>(null);

    const htmlValue = [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');

    function openPicker() {
      if (dateRef.current?.showPicker) {
        dateRef.current.showPicker();
      } else {
        dateRef.current?.click();
      }
    }

    return (
      <View>
        {label && <Text style={labelStyle}>{label}</Text>}
        <TouchableOpacity style={[inputStyle]} onPress={openPicker} activeOpacity={0.7}>
          <Text style={textStyle}>{formatBR(value)}</Text>
          <Text style={styles.icon}>📅</Text>
        </TouchableOpacity>
        {React.createElement('div', { style: { position: 'relative', height: 0, overflow: 'visible' } },
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
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0,
              pointerEvents: 'none',
              width: '100%',
              height: '1px',
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

  // ── Android: picker inline ───────────────────────────────────────────────
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
